/**
 * Block.jsx
 *
 * Componente central: recebe um bloco e renderiza o componente correto.
 * Também gerencia o handle de drag (dnd-kit), menu de contexto e
 * ações de teclado globais (Enter, Backspace, Tab).
 */

import React, { useCallback, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { BLOCK_TYPES } from '../../lib/constants.js'

import { TextBlock }                            from './blocks/TextBlock.jsx'
import { BulletBlock, NumberedBlock, TodoBlock } from './blocks/ListBlocks.jsx'
import {
  CalloutBlock, CodeBlock, DividerBlock,
  ImageBlock, VideoBlock, AudioBlock, FileBlock,
  BookmarkBlock, EmbedBlock,
} from './blocks/MediaBlocks.jsx'
import { ToggleBlock, EquationBlock } from './blocks/AdvancedBlocks.jsx'

const TEXT_BLOCK_TYPES = new Set([
  BLOCK_TYPES.TEXT, BLOCK_TYPES.H1, BLOCK_TYPES.H2, BLOCK_TYPES.H3,
  BLOCK_TYPES.QUOTE, BLOCK_TYPES.CALLOUT, BLOCK_TYPES.BULLET,
  BLOCK_TYPES.NUMBERED, BLOCK_TYPES.TODO,
])

export function Block({
  block,
  index,
  numberedIndex,
  isFirst,
  isLast,
  autoFocus,
  onUpdate,
  onInsertAfter,
  onDelete,
  onIndent,
  onDedent,
  onMoveUp,
  onMoveDown,
  children, // para toggle
}) {
  const containerRef = useRef(null)

  // ── dnd-kit ────────────────────────────────────────────────────
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  // ── Handler de teclado ─────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    const isEmpty = !block.segments?.length || block.segments.every(s => !s.text)

    if (e.key === 'Enter' && !e.shiftKey) {
      if (block.type === BLOCK_TYPES.CODE) return // Code usa Enter normalmente
      e.preventDefault()
      onInsertAfter(block.id, block.type)
    }

    if (e.key === 'Backspace' && isEmpty) {
      e.preventDefault()
      onDelete(block.id)
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        onDedent?.(block.id)
      } else {
        onIndent?.(block.id)
      }
    }
  }, [block, onInsertAfter, onDelete, onIndent, onDedent])

  // ── Patch parcial de bloco ─────────────────────────────────────
  const handleChange = useCallback((patch) => {
    onUpdate(block.id, patch)
  }, [block.id, onUpdate])

  // ── Renderiza o componente certo ───────────────────────────────
  function renderInner() {
    switch (block.type) {
      case BLOCK_TYPES.TEXT:
      case BLOCK_TYPES.H1:
      case BLOCK_TYPES.H2:
      case BLOCK_TYPES.H3:
      case BLOCK_TYPES.QUOTE:
        return <TextBlock block={block} onChange={handleChange} onKeyDown={handleKeyDown} autoFocus={autoFocus} />

      case BLOCK_TYPES.BULLET:
        return <BulletBlock block={block} onChange={handleChange} onKeyDown={handleKeyDown} autoFocus={autoFocus} />

      case BLOCK_TYPES.NUMBERED:
        return <NumberedBlock block={block} index={numberedIndex} onChange={handleChange} onKeyDown={handleKeyDown} autoFocus={autoFocus} />

      case BLOCK_TYPES.TODO:
        return <TodoBlock block={block} onChange={handleChange} onKeyDown={handleKeyDown} autoFocus={autoFocus} />

      case BLOCK_TYPES.CALLOUT:
        return <CalloutBlock block={block} onChange={handleChange} onKeyDown={handleKeyDown} autoFocus={autoFocus} />

      case BLOCK_TYPES.CODE:
        return <CodeBlock block={block} onChange={handleChange} onKeyDown={handleKeyDown} autoFocus={autoFocus} />

      case BLOCK_TYPES.DIVIDER:
        return <DividerBlock />

      case BLOCK_TYPES.IMAGE:
        return <ImageBlock block={block} onChange={handleChange} />

      case BLOCK_TYPES.VIDEO:
        return <VideoBlock block={block} onChange={handleChange} />

      case BLOCK_TYPES.AUDIO:
        return <AudioBlock block={block} onChange={handleChange} />

      case BLOCK_TYPES.FILE:
        return <FileBlock block={block} onChange={handleChange} />

      case BLOCK_TYPES.BOOKMARK:
        return <BookmarkBlock block={block} onChange={handleChange} />

      case BLOCK_TYPES.EMBED:
        return <EmbedBlock block={block} onChange={handleChange} />

      case BLOCK_TYPES.TOGGLE:
        return (
          <ToggleBlock block={block} onChange={handleChange} onKeyDown={handleKeyDown} autoFocus={autoFocus}>
            {children}
          </ToggleBlock>
        )

      case BLOCK_TYPES.EQUATION:
        return <EquationBlock block={block} onChange={handleChange} autoFocus={autoFocus} />

      default:
        return (
          <div className="text-sm font-sans text-texto-suave italic">
            Bloco desconhecido: {block.type}
          </div>
        )
    }
  }

  return (
    <div
      ref={(node) => { setNodeRef(node); containerRef.current = node }}
      style={style}
      className="group relative py-0.5"
    >
      {/* Handle de drag — aparece no hover da margem esquerda */}
      <div
        {...attributes}
        {...listeners}
        className="
          absolute -left-7 top-1/2 -translate-y-1/2
          w-5 h-5 flex items-center justify-center
          opacity-0 group-hover:opacity-100
          cursor-grab active:cursor-grabbing
          text-texto-suave/40 hover:text-texto-suave
          transition-opacity duration-150
          select-none rounded
          hover:bg-white/5
        "
        title="Arrastar para reordenar"
      >
        ⠿
      </div>

      {/* Botão + — inserir bloco abaixo */}
      <button
        onClick={() => onInsertAfter(block.id, BLOCK_TYPES.TEXT)}
        className="
          absolute -left-7 bottom-0
          w-5 h-5 flex items-center justify-center
          opacity-0 group-hover:opacity-100
          text-texto-suave/40 hover:text-ouro
          transition-opacity duration-150
          rounded text-sm leading-none
        "
        title="Adicionar bloco"
      >
        +
      </button>

      {/* Conteúdo do bloco */}
      <div className="min-w-0">
        {renderInner()}
      </div>
    </div>
  )
}
