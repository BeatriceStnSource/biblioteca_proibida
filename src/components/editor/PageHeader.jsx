/**
 * PageHeader.jsx
 *
 * Cabeçalho da página: emoji (picker), capa (imagem) e título.
 * O emoji é sempre visível, não apenas em modo edição (fix da Fase 1).
 */

import React, { useState, useRef } from 'react'

// ─── Emojis sugeridos para ícone de página ─────────────────────────
const EMOJI_SUGERIDOS = [
  '📖','📝','📚','📄','✍️','🖊️','🗒️','📋','🗂️','📁',
  '🎭','🗺️','🔮','🌟','⚡','🎯','🏆','🌿','🎨','🔬',
  '💡','🔑','🏛️','⚗️','🦋','🌙','🌊','🔥','❄️','🎵',
]

function EmojiPicker({ current, onSelect, onClose }) {
  const [query, setQuery] = useState('')

  return (
    <div className="absolute z-50 top-full left-0 mt-2 bg-superficie border border-borda rounded shadow-livro p-3 w-64 animate-fade-in">
      <input
        autoFocus
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Filtrar emoji…"
        className="input-biblioteca w-full text-sm mb-2"
      />
      <div className="grid grid-cols-8 gap-1">
        {EMOJI_SUGERIDOS
          .filter(e => !query || e.includes(query))
          .map(emoji => (
            <button
              key={emoji}
              onClick={() => { onSelect(emoji); onClose() }}
              className="w-7 h-7 flex items-center justify-center text-lg rounded hover:bg-white/10 transition-colors"
              title={emoji}
            >
              {emoji}
            </button>
          ))
        }
      </div>
      <button
        onClick={() => { onSelect(null); onClose() }}
        className="mt-2 w-full text-xs font-sans text-texto-suave hover:text-card transition-colors text-center py-1"
      >
        Remover ícone
      </button>
    </div>
  )
}

export function PageHeader({ icon, cover, title, onIconChange, onCoverChange, onTitleChange }) {
  const [showPicker, setShowPicker]       = useState(false)
  const [showCoverInput, setShowCoverInput] = useState(false)
  const [coverInput, setCoverInput]         = useState(cover ?? '')
  const titleRef                            = useRef(null)

  function handleTitleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Mover foco para o primeiro bloco do editor
      document.querySelector('[data-block-editor]')?.focus()
    }
  }

  return (
    <div className="mb-6">
      {/* Imagem de capa */}
      {cover ? (
        <div className="relative w-full h-36 mb-4 -mx-8 group" style={{ width: 'calc(100% + 4rem)' }}>
          <img
            src={cover}
            alt="Capa"
            className="w-full h-full object-cover"
          />
          {/* Overlay ao hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-end p-3 opacity-0 group-hover:opacity-100">
            <button
              onClick={() => { onCoverChange(null); setShowCoverInput(false) }}
              className="btn-ghost text-xs bg-black/50"
            >
              Remover capa
            </button>
            <button
              onClick={() => setShowCoverInput(true)}
              className="btn-ghost text-xs bg-black/50 ml-1"
            >
              Trocar capa
            </button>
          </div>
        </div>
      ) : null}

      {/* Input de URL de capa */}
      {showCoverInput && (
        <div className="flex gap-2 mb-3">
          <input
            autoFocus
            type="url"
            value={coverInput}
            onChange={e => setCoverInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { onCoverChange(coverInput); setShowCoverInput(false) }
              if (e.key === 'Escape') setShowCoverInput(false)
            }}
            placeholder="URL da imagem de capa…"
            className="input-biblioteca flex-1 text-sm"
          />
          <button
            onClick={() => { onCoverChange(coverInput); setShowCoverInput(false) }}
            className="btn-primario text-sm"
          >
            OK
          </button>
          <button onClick={() => setShowCoverInput(false)} className="btn-ghost text-sm">
            Cancelar
          </button>
        </div>
      )}

      {/* Área do ícone + título */}
      <div className="flex items-start gap-3">
        {/* Emoji — SEMPRE visível */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowPicker(v => !v)}
            className={`
              text-4xl leading-none select-none
              hover:opacity-80 transition-opacity
              ${!icon ? 'opacity-30' : ''}
            `}
            title="Alterar ícone da página"
          >
            {icon ?? '📄'}
          </button>

          {showPicker && (
            <EmojiPicker
              current={icon}
              onSelect={onIconChange}
              onClose={() => setShowPicker(false)}
            />
          )}
        </div>

        {/* Título */}
        <div className="flex-1 min-w-0">
          <div
            ref={titleRef}
            contentEditable
            suppressContentEditableWarning
            onInput={e => onTitleChange(e.currentTarget.textContent)}
            onKeyDown={handleTitleKeyDown}
            data-placeholder="Sem título"
            className="
              text-3xl font-serif font-bold text-texto
              outline-none break-words
              empty:before:content-[attr(data-placeholder)]
              empty:before:text-texto-suave/30
              empty:before:pointer-events-none
            "
            dangerouslySetInnerHTML={{ __html: title || '' }}
          />
        </div>
      </div>

      {/* Botões de ação da página — visíveis ao hover */}
      <div className="flex gap-2 mt-2 opacity-0 hover:opacity-100 transition-opacity focus-within:opacity-100">
        {!icon && (
          <button
            onClick={() => setShowPicker(true)}
            className="text-xs font-sans text-texto-suave hover:text-texto transition-colors"
          >
            + Adicionar ícone
          </button>
        )}
        {!cover && (
          <button
            onClick={() => setShowCoverInput(true)}
            className="text-xs font-sans text-texto-suave hover:text-texto transition-colors"
          >
            + Adicionar capa
          </button>
        )}
      </div>
    </div>
  )
}
