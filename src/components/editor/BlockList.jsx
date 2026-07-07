/**
 * BlockList.jsx
 *
 * Gerencia a lista de blocos de uma página:
 * - Drag & drop via @dnd-kit/sortable
 * - Inserção, deleção, reordenação, indentação
 * - Numeração automática de blocos numerados
 * - Foco automático no bloco recém-criado
 */

import React, { useState, useCallback, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'

import { Block } from './Block.jsx'
import { createBlock, insertAfter, removeBlock, updateBlock, normalizeBlocks } from '../../lib/blocks.js'
import { BLOCK_TYPES } from '../../lib/constants.js'

// ─── Qual tipo de bloco continuar ao pressionar Enter ─────────────
function nextBlockType(currentType) {
  switch (currentType) {
    case BLOCK_TYPES.BULLET:   return BLOCK_TYPES.BULLET
    case BLOCK_TYPES.NUMBERED: return BLOCK_TYPES.NUMBERED
    case BLOCK_TYPES.TODO:     return BLOCK_TYPES.TODO
    default:                   return BLOCK_TYPES.TEXT
  }
}

export function BlockList({ blocks = [], onChange }) {
  const [focusId, setFocusId]   = useState(null)
  const normalized               = normalizeBlocks(blocks)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // ── Drag & Drop ────────────────────────────────────────────────
  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = normalized.findIndex(b => b.id === active.id)
    const newIndex = normalized.findIndex(b => b.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(normalized, oldIndex, newIndex)
    onChange(reordered)
  }

  // ── CRUD de blocos ─────────────────────────────────────────────
  const handleUpdate = useCallback((id, patch) => {
    onChange(updateBlock(normalized, id, patch))
  }, [normalized, onChange])

  const handleInsertAfter = useCallback((afterId, currentType) => {
    const newBlock = createBlock(nextBlockType(currentType))
    const updated  = insertAfter(normalized, afterId, newBlock)
    onChange(updated)
    setFocusId(newBlock.id)
  }, [normalized, onChange])

  const handleDelete = useCallback((id) => {
    if (normalized.length <= 1) {
      // Não apaga o último bloco — limpa o conteúdo
      onChange(updateBlock(normalized, id, { segments: [] }))
      return
    }

    // Foca no bloco anterior
    const idx = normalized.findIndex(b => b.id === id)
    const prev = normalized[idx - 1] ?? normalized[idx + 1]
    if (prev) setFocusId(prev.id)

    onChange(removeBlock(normalized, id))
  }, [normalized, onChange])

  const handleIndent = useCallback((id) => {
    const block = normalized.find(b => b.id === id)
    if (!block) return
    const newLevel = Math.min((block.props?.level ?? 0) + 1, 6)
    onChange(updateBlock(normalized, id, { props: { ...block.props, level: newLevel } }))
  }, [normalized, onChange])

  const handleDedent = useCallback((id) => {
    const block = normalized.find(b => b.id === id)
    if (!block) return
    const newLevel = Math.max((block.props?.level ?? 0) - 1, 0)
    onChange(updateBlock(normalized, id, { props: { ...block.props, level: newLevel } }))
  }, [normalized, onChange])

  // ── Numeração automática de lista numerada ─────────────────────
  const numberedCounters = {}

  function getNumberedIndex(block, idx) {
    if (block.type !== BLOCK_TYPES.NUMBERED) return undefined
    const level = block.props?.level ?? 0
    const key   = `lvl_${level}`

    // Reseta contadores de nível mais profundo
    for (const k of Object.keys(numberedCounters)) {
      const kLevel = parseInt(k.split('_')[1])
      if (kLevel > level) delete numberedCounters[k]
    }

    numberedCounters[key] = (numberedCounters[key] ?? 0) + 1
    return numberedCounters[key]
  }

  // ── Render ─────────────────────────────────────────────────────
  if (!normalized.length) {
    return (
      <div
        className="text-editor-body font-serif text-texto-suave/50 cursor-text py-1"
        onClick={() => {
          const b = createBlock(BLOCK_TYPES.TEXT)
          onChange([b])
          setFocusId(b.id)
        }}
      >
        Clique para começar a escrever…
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={normalized.map(b => b.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-0.5">
          {normalized.map((block, idx) => (
            <Block
              key={block.id}
              block={block}
              index={idx}
              numberedIndex={getNumberedIndex(block, idx)}
              isFirst={idx === 0}
              isLast={idx === normalized.length - 1}
              autoFocus={block.id === focusId}
              onUpdate={handleUpdate}
              onInsertAfter={handleInsertAfter}
              onDelete={handleDelete}
              onIndent={handleIndent}
              onDedent={handleDedent}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
