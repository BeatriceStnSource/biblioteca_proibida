/**
 * AdvancedBlocks.jsx — Toggle, Equação KaTeX
 */
import React, { useState, useEffect, useRef } from 'react'
import { RichTextEditor } from '../RichText.jsx'

// ─── Toggle ───────────────────────────────────────────────────────

/**
 * Bloco expansível com filhos (children) renderizados abaixo.
 * Os filhos são gerenciados pelo BlockList pai via onChildrenChange.
 */
export function ToggleBlock({ block, onChange, onKeyDown, autoFocus, children }) {
  const [open, setOpen] = useState(block.props?.open ?? false)

  function toggleOpen() {
    const newOpen = !open
    setOpen(newOpen)
    onChange({ props: { ...block.props, open: newOpen } })
  }

  return (
    <div>
      <div className="flex items-start gap-1">
        <button
          onClick={toggleOpen}
          className="mt-1 w-5 h-5 flex items-center justify-center text-texto-suave hover:text-card transition-colors shrink-0"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 150ms' }}
        >
          ▶
        </button>
        <RichTextEditor
          segments={block.segments ?? []}
          onChange={segs => onChange({ segments: segs })}
          onKeyDown={onKeyDown}
          placeholder="Toggle (clique ▶ para expandir)"
          className="flex-1 text-editor-body font-serif font-medium text-texto"
          autoFocus={autoFocus}
        />
      </div>
      {open && children && (
        <div className="ml-6 mt-1 border-l border-borda/40 pl-3">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Equação KaTeX ────────────────────────────────────────────────

let katexLoaded = false
let katexPromise = null

function loadKatex() {
  if (katexLoaded) return Promise.resolve()
  if (katexPromise) return katexPromise

  katexPromise = new Promise((resolve) => {
    // CSS
    const link = document.createElement('link')
    link.rel  = 'stylesheet'
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css'
    document.head.appendChild(link)

    // JS
    const script = document.createElement('script')
    script.src   = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js'
    script.onload  = () => { katexLoaded = true; resolve() }
    script.onerror = () => resolve() // falha silenciosa
    document.head.appendChild(script)
  })
  return katexPromise
}

function renderKatex(latex) {
  if (!katexLoaded || !window.katex) return null
  try {
    return window.katex.renderToString(latex, {
      throwOnError: false,
      displayMode:  true,
    })
  } catch {
    return null
  }
}

export function EquationBlock({ block, onChange, autoFocus }) {
  const latex       = (block.segments ?? []).map(s => s.text).join('') || block.props?.latex || ''
  const [editing, setEditing]   = useState(!latex || autoFocus)
  const [preview, setPreview]   = useState(null)
  const [loaded,  setLoaded]    = useState(katexLoaded)
  const textareaRef             = useRef(null)

  useEffect(() => {
    loadKatex().then(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (loaded && latex) {
      setPreview(renderKatex(latex))
    }
  }, [loaded, latex])

  if (editing) {
    return (
      <div className="bg-superficie/40 border border-borda rounded p-3">
        <p className="text-xs font-sans text-texto-suave mb-1">LaTeX / KaTeX</p>
        <textarea
          ref={textareaRef}
          defaultValue={latex}
          onBlur={e => {
            const val = e.target.value.trim()
            onChange({ segments: val ? [{ text: val, marks: [] }] : [] })
            if (val) setEditing(false)
          }}
          onKeyDown={e => {
            if (e.key === 'Escape' || (e.key === 'Enter' && e.shiftKey)) {
              const val = e.currentTarget.value.trim()
              onChange({ segments: val ? [{ text: val, marks: [] }] : [] })
              if (val) setEditing(false)
            }
          }}
          placeholder="\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}"
          className="w-full bg-fundo text-card font-mono text-sm p-2 rounded outline-none resize-none min-h-[60px]"
          autoFocus={autoFocus}
          spellCheck={false}
        />
        <p className="text-[10px] font-sans text-texto-suave mt-1">Shift+Enter ou Esc para renderizar</p>
      </div>
    )
  }

  return (
    <div
      className="text-center py-3 cursor-pointer hover:bg-superficie/20 rounded transition-colors"
      onClick={() => setEditing(true)}
      title="Clique para editar"
    >
      {preview ? (
        <div dangerouslySetInnerHTML={{ __html: preview }} />
      ) : (
        <code className="font-mono text-sm text-texto-suave">{latex || 'Clique para adicionar equação'}</code>
      )}
    </div>
  )
}
