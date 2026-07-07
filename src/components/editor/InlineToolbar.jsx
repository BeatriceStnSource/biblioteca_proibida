/**
 * InlineToolbar.jsx
 *
 * Toolbar flutuante que aparece ao selecionar texto num bloco.
 * Aplica/remove marks via execCommand no contentEditable.
 *
 * Marks disponíveis:
 *   B I U S code   link   cor-de-texto   cor-de-fundo
 */

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { TEXT_COLORS, BG_COLORS } from './RichText.jsx'

const COLOR_NAMES = Object.keys(TEXT_COLORS).filter(n => n !== 'default')

// ─── Botão individual ─────────────────────────────────────────────

function ToolBtn({ onClick, active, title, children }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className={`
        w-7 h-7 flex items-center justify-center rounded text-xs font-medium
        transition-colors duration-100
        ${active
          ? 'bg-ouro text-texto'
          : 'text-card hover:bg-white/15'}
      `}
    >
      {children}
    </button>
  )
}

// ─── Picker de cores ──────────────────────────────────────────────

function ColorPicker({ onSelectText, onSelectBg, onClose }) {
  return (
    <div
      className="absolute top-full left-0 mt-1 bg-superficie border border-borda rounded shadow-livro p-2 z-50 w-48"
      onMouseDown={e => e.preventDefault()}
    >
      <p className="text-xs text-texto-suave font-sans mb-1 px-1">Cor do texto</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {COLOR_NAMES.map(name => (
          <button
            key={name}
            title={name}
            onMouseDown={(e) => { e.preventDefault(); onSelectText(name) }}
            className="w-5 h-5 rounded border border-white/20 hover:scale-110 transition-transform"
            style={{ backgroundColor: TEXT_COLORS[name] }}
          />
        ))}
        <button
          onMouseDown={(e) => { e.preventDefault(); onSelectText('default') }}
          title="Remover cor"
          className="w-5 h-5 rounded border border-white/20 text-[9px] text-texto-suave hover:bg-white/10 flex items-center justify-center"
        >✕</button>
      </div>
      <p className="text-xs text-texto-suave font-sans mb-1 px-1">Fundo</p>
      <div className="flex flex-wrap gap-1">
        {COLOR_NAMES.map(name => (
          <button
            key={name}
            title={name}
            onMouseDown={(e) => { e.preventDefault(); onSelectBg(name) }}
            className="w-5 h-5 rounded border border-white/20 hover:scale-110 transition-transform"
            style={{ backgroundColor: BG_COLORS[name] }}
          />
        ))}
        <button
          onMouseDown={(e) => { e.preventDefault(); onSelectBg('default') }}
          title="Remover fundo"
          className="w-5 h-5 rounded border border-white/20 text-[9px] text-texto-suave hover:bg-white/10 flex items-center justify-center"
        >✕</button>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────

export function InlineToolbar({ editorRef, onClose }) {
  const [pos, setPos]               = useState(null)
  const [showColors, setShowColors] = useState(false)
  const [linkMode, setLinkMode]     = useState(false)
  const [linkUrl, setLinkUrl]       = useState('')
  const toolbarRef                  = useRef(null)

  // Posiciona toolbar acima da seleção
  useEffect(() => {
    function update() {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setPos(null)
        return
      }

      // Verifica se a seleção está dentro do editor
      const range = sel.getRangeAt(0)
      if (editorRef.current && !editorRef.current.contains(range.commonAncestorContainer)) {
        setPos(null)
        return
      }

      const rect = range.getBoundingClientRect()
      const editor = editorRef.current?.getBoundingClientRect() || { left: 0, top: 0 }

      setPos({
        left: rect.left - editor.left + rect.width / 2,
        top:  rect.top  - editor.top  - 8, // 8px acima
      })
    }

    document.addEventListener('selectionchange', update)
    return () => document.removeEventListener('selectionchange', update)
  }, [editorRef])

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClick(e) {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target)) {
        setShowColors(false)
        setLinkMode(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ── Aplicar formato ────────────────────────────────────────────
  function applyFormat(command, value = null) {
    document.execCommand(command, false, value)
  }

  function applyColor(colorName) {
    const hex = TEXT_COLORS[colorName]
    if (colorName === 'default') {
      document.execCommand('removeFormat', false, null)
    } else {
      document.execCommand('foreColor', false, hex)
    }
    setShowColors(false)
  }

  function applyBg(colorName) {
    const hex = BG_COLORS[colorName]
    if (colorName === 'default') {
      document.execCommand('hiliteColor', false, 'transparent')
    } else {
      document.execCommand('hiliteColor', false, hex)
    }
    setShowColors(false)
  }

  function applyLink() {
    if (linkUrl.trim()) {
      document.execCommand('createLink', false, linkUrl.trim())
    }
    setLinkMode(false)
    setLinkUrl('')
  }

  if (!pos) return null

  return (
    <div
      ref={toolbarRef}
      className="absolute z-40 pointer-events-auto"
      style={{
        left:      pos.left,
        top:       pos.top,
        transform: 'translate(-50%, -100%)',
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="flex items-center gap-0.5 bg-superficie border border-borda rounded shadow-livro px-1 py-0.5">

        <ToolBtn onClick={() => applyFormat('bold')}          title="Negrito (Ctrl+B)">
          <strong>B</strong>
        </ToolBtn>
        <ToolBtn onClick={() => applyFormat('italic')}        title="Itálico (Ctrl+I)">
          <em>I</em>
        </ToolBtn>
        <ToolBtn onClick={() => applyFormat('underline')}     title="Sublinhado (Ctrl+U)">
          <u>U</u>
        </ToolBtn>
        <ToolBtn onClick={() => applyFormat('strikeThrough')} title="Tachado">
          <s>S</s>
        </ToolBtn>
        <ToolBtn onClick={() => applyFormat('insertHTML', `<code class="rich-code">${window.getSelection().toString()}</code>`)} title="Código inline">
          {'</>'}
        </ToolBtn>

        {/* Separador */}
        <div className="w-px h-4 bg-borda mx-0.5" />

        {/* Link */}
        <ToolBtn onClick={() => { setLinkMode(v => !v); setShowColors(false) }} title="Link">
          🔗
        </ToolBtn>

        {/* Cores */}
        <ToolBtn onClick={() => { setShowColors(v => !v); setLinkMode(false) }} title="Cor">
          <span className="text-ouro font-bold">A</span>
        </ToolBtn>

        {showColors && (
          <ColorPicker
            onSelectText={applyColor}
            onSelectBg={applyBg}
            onClose={() => setShowColors(false)}
          />
        )}
      </div>

      {/* Input de link */}
      {linkMode && (
        <div className="absolute top-full left-0 mt-1 flex gap-1 bg-superficie border border-borda rounded shadow-livro p-2 z-50"
             style={{ transform: 'translateX(-25%)' }}>
          <input
            autoFocus
            type="url"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') applyLink() }}
            placeholder="https://…"
            className="input-biblioteca text-xs w-48 py-1"
          />
          <button
            onMouseDown={(e) => { e.preventDefault(); applyLink() }}
            className="btn-primario text-xs py-1 px-2"
          >
            OK
          </button>
        </div>
      )}
    </div>
  )
}
