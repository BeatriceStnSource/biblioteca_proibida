/**
 * SlashMenu.jsx
 *
 * Menu que aparece ao digitar "/" num bloco de texto.
 * Lista todos os tipos de bloco disponíveis, com busca e navegação por teclado.
 */

import React, { useState, useEffect, useRef } from 'react'
import { BLOCK_TYPES } from '../../lib/constants.js'

// ─── Catálogo de itens ────────────────────────────────────────────

const MENU_ITEMS = [
  // Texto
  { type: BLOCK_TYPES.TEXT,      label: 'Parágrafo',        description: 'Texto simples',                   icon: '¶',  group: 'Texto' },
  { type: BLOCK_TYPES.H1,        label: 'Título 1',          description: 'Título grande',                   icon: 'H1', group: 'Texto' },
  { type: BLOCK_TYPES.H2,        label: 'Título 2',          description: 'Título médio',                    icon: 'H2', group: 'Texto' },
  { type: BLOCK_TYPES.H3,        label: 'Título 3',          description: 'Título pequeno',                  icon: 'H3', group: 'Texto' },
  { type: BLOCK_TYPES.QUOTE,     label: 'Citação',           description: 'Citação ou epígrafe',             icon: '❝',  group: 'Texto' },
  { type: BLOCK_TYPES.CALLOUT,   label: 'Destaque',          description: 'Bloco com ícone em evidência',    icon: '💡', group: 'Texto' },
  { type: BLOCK_TYPES.TOGGLE,    label: 'Toggle',            description: 'Bloco expansível',                icon: '▶',  group: 'Texto' },

  // Listas
  { type: BLOCK_TYPES.BULLET,    label: 'Lista com marcadores', description: 'Lista não-ordenada',           icon: '•',  group: 'Listas' },
  { type: BLOCK_TYPES.NUMBERED,  label: 'Lista numerada',    description: 'Lista ordenada',                  icon: '1.', group: 'Listas' },
  { type: BLOCK_TYPES.TODO,      label: 'Tarefa',            description: 'Caixa de verificação',            icon: '☐',  group: 'Listas' },

  // Mídia
  { type: BLOCK_TYPES.IMAGE,     label: 'Imagem',            description: 'Upload ou URL de imagem',         icon: '🖼', group: 'Mídia' },
  { type: BLOCK_TYPES.VIDEO,     label: 'Vídeo',             description: 'YouTube, Vimeo ou link direto',   icon: '▶️', group: 'Mídia' },
  { type: BLOCK_TYPES.AUDIO,     label: 'Áudio',             description: 'Arquivo de áudio',                icon: '🎵', group: 'Mídia' },
  { type: BLOCK_TYPES.FILE,      label: 'Arquivo',           description: 'Upload ou link de arquivo',       icon: '📎', group: 'Mídia' },
  { type: BLOCK_TYPES.BOOKMARK,  label: 'Bookmark',          description: 'Preview de link externo',         icon: '🔖', group: 'Mídia' },
  { type: BLOCK_TYPES.EMBED,     label: 'Embed',             description: 'Incorporar qualquer URL',         icon: '🔌', group: 'Mídia' },

  // Avançado
  { type: BLOCK_TYPES.CODE,      label: 'Código',            description: 'Bloco de código com highlight',   icon: '</>', group: 'Avançado' },
  { type: BLOCK_TYPES.EQUATION,  label: 'Equação',           description: 'Matemática com LaTeX/KaTeX',      icon: 'Σ',  group: 'Avançado' },
  { type: BLOCK_TYPES.DIVIDER,   label: 'Divisor',           description: 'Linha separadora',                icon: '—',  group: 'Avançado' },
]

// ─── Componente ───────────────────────────────────────────────────

export function SlashMenu({ position, onSelect, onClose, initialQuery = '' }) {
  const [query, setQuery]   = useState(initialQuery)
  const [active, setActive] = useState(0)
  const listRef             = useRef(null)

  const filtered = query
    ? MENU_ITEMS.filter(i =>
        i.label.toLowerCase().includes(query.toLowerCase()) ||
        i.description.toLowerCase().includes(query.toLowerCase()) ||
        i.group.toLowerCase().includes(query.toLowerCase())
      )
    : MENU_ITEMS

  // Reseta índice quando filtro muda
  useEffect(() => { setActive(0) }, [query])

  // Scroll do item ativo para view
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive(i => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[active]) onSelect(filtered[active].type)
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [filtered, active, onSelect, onClose])

  if (!filtered.length) return null

  // Agrupa itens
  const groups = []
  const seen = new Set()
  for (const item of filtered) {
    if (!seen.has(item.group)) {
      seen.add(item.group)
      groups.push({ name: item.group, items: filtered.filter(i => i.group === item.group) })
    }
  }

  return (
    <div
      className="absolute z-50 bg-superficie border border-borda rounded shadow-livro w-64 max-h-72 overflow-y-auto animate-fade-in"
      style={{ top: position.top, left: position.left }}
    >
      <div ref={listRef} className="py-1">
        {groups.map(group => (
          <div key={group.name}>
            <p className="text-[10px] font-sans font-semibold uppercase tracking-wider text-texto-suave px-3 pt-2 pb-1">
              {group.name}
            </p>
            {group.items.map(item => {
              const idx = filtered.indexOf(item)
              return (
                <button
                  key={item.type}
                  data-active={idx === active}
                  onClick={() => onSelect(item.type)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-1.5 text-left transition-colors
                    ${idx === active ? 'bg-ouro/20' : 'hover:bg-white/5'}
                  `}
                >
                  <span className="w-8 h-8 flex items-center justify-center rounded bg-fundo/40 text-card text-sm font-mono shrink-0">
                    {item.icon}
                  </span>
                  <div>
                    <p className="text-sm font-sans text-card font-medium">{item.label}</p>
                    <p className="text-[11px] font-sans text-texto-suave">{item.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
