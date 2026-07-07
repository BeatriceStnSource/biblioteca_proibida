/**
 * RichText.jsx
 *
 * Renderiza um array de `segments` com marks aplicados como spans/links.
 * Também expõe <RichTextEditor> — um contentEditable que serializa para segments.
 *
 * Marks suportados:
 *   string simples: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code'
 *   objeto:         { type: 'color', value: string }
 *                   { type: 'bg', value: string }
 *                   { type: 'link', value: string }
 */

import React, { useRef, useEffect, useCallback } from 'react'
import { TAG_COLORS } from '../../lib/constants.js'

// ─── Paleta de cores de texto/fundo (mesmo do Notion) ─────────────
export const TEXT_COLORS = {
  default:  'inherit',
  cinza:    '#979A9B',
  marrom:   '#9F6B53',
  laranja:  '#D9730D',
  amarelo:  '#CB912F',
  verde:    '#448361',
  azul:     '#337EA9',
  roxo:     '#9065B0',
  rosa:     '#C14C8A',
  vermelho: '#D44C47',
}

export const BG_COLORS = {
  default:  'transparent',
  cinza:    '#E3E2E0',
  marrom:   '#EEE0DA',
  laranja:  '#FAD9BC',
  amarelo:  '#FBF3DB',
  verde:    '#DBEDDB',
  azul:     '#D3E5EF',
  roxo:     '#E8DEEE',
  rosa:     '#F5E0EB',
  vermelho: '#FFE2DD',
}

// ─── Serialização: DOM → segments ─────────────────────────────────

/**
 * Lê o conteúdo de um contentEditable e retorna array de segments.
 * Esta é a função crítica que conecta o DOM ao nosso schema.
 */
export function domToSegments(el) {
  const segments = []

  function walk(node, inheritedMarks = []) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent
      if (text) {
        segments.push({ text, marks: [...inheritedMarks] })
      }
      return
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return

    const tag = node.tagName.toLowerCase()
    const marks = [...inheritedMarks]

    if (tag === 'strong' || tag === 'b') marks.push('bold')
    if (tag === 'em' || tag === 'i')     marks.push('italic')
    if (tag === 'u')                      marks.push('underline')
    if (tag === 's' || tag === 'del')     marks.push('strikethrough')
    if (tag === 'code')                   marks.push('code')
    if (tag === 'br') {
      segments.push({ text: '\n', marks: [...inheritedMarks] })
      return
    }
    if (tag === 'a') {
      const href = node.getAttribute('href') || ''
      marks.push({ type: 'link', value: href })
    }
    if (tag === 'span') {
      const color = node.style.color
      const bg    = node.style.backgroundColor
      if (color) marks.push({ type: 'color', value: rgbToName(color) || color })
      if (bg)    marks.push({ type: 'bg',    value: rgbToName(bg) || bg })
    }

    for (const child of node.childNodes) {
      walk(child, marks)
    }
  }

  walk(el)

  // Limpa segmentos vazios
  return segments.filter(s => s.text !== '')
}

function rgbToName(rgb) {
  // Tenta mapear rgb() de volta para nome (melhor esforço)
  const hex = rgbToHex(rgb)
  for (const [name, color] of Object.entries(TEXT_COLORS)) {
    if (color.toLowerCase() === hex?.toLowerCase()) return name
  }
  for (const [name, color] of Object.entries(BG_COLORS)) {
    if (color.toLowerCase() === hex?.toLowerCase()) return name
  }
  return null
}

function rgbToHex(rgb) {
  const m = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (!m) return rgb
  return '#' + [m[1], m[2], m[3]].map(n => (+n).toString(16).padStart(2, '0')).join('')
}

// ─── Serialização: segments → HTML ────────────────────────────────

/**
 * Converte segments para HTML que o contentEditable vai renderizar.
 */
export function segmentsToHtml(segments = []) {
  if (!segments.length) return ''

  return segments.map(({ text, marks }) => {
    let html = escapeHtml(text).replace(/\n/g, '<br>')

    // Aplicar marks de dentro para fora
    const sortedMarks = [...marks].reverse()
    for (const mark of sortedMarks) {
      if (mark === 'bold')          html = `<strong>${html}</strong>`
      else if (mark === 'italic')   html = `<em>${html}</em>`
      else if (mark === 'underline')html = `<u>${html}</u>`
      else if (mark === 'strikethrough') html = `<s>${html}</s>`
      else if (mark === 'code')     html = `<code class="rich-code">${html}</code>`
      else if (typeof mark === 'object') {
        if (mark.type === 'link') {
          html = `<a href="${escapeAttr(mark.value)}" class="rich-link" target="_blank" rel="noopener">${html}</a>`
        } else if (mark.type === 'color') {
          const color = TEXT_COLORS[mark.value] || mark.value
          html = `<span style="color:${color}">${html}</span>`
        } else if (mark.type === 'bg') {
          const bg = BG_COLORS[mark.value] || mark.value
          html = `<span style="background-color:${bg};border-radius:2px;padding:0 2px">${html}</span>`
        }
      }
    }
    return html
  }).join('')
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;')
}

// ─── Componente de renderização estática ──────────────────────────

/**
 * Renderiza segments em modo leitura (não-editável).
 */
export function RichText({ segments = [], className = '' }) {
  if (!segments.length) return null
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: segmentsToHtml(segments) }}
    />
  )
}

// ─── Componente de edição ─────────────────────────────────────────

/**
 * Editor de texto rico baseado em contentEditable.
 * Salva segments no onChange.
 *
 * Props:
 *   segments        — valor controlado
 *   onChange(segs)  — chamado ao editar
 *   placeholder     — texto de placeholder
 *   className       — classes extras
 *   onKeyDown       — handler de teclado do bloco pai
 *   autoFocus       — focar ao montar
 *   singleLine      — impede Enter (para títulos, etc.)
 */
export function RichTextEditor({
  segments = [],
  onChange,
  placeholder = 'Escreva algo…',
  className = '',
  onKeyDown,
  autoFocus = false,
  singleLine = false,
}) {
  const ref = useRef(null)
  const composingRef = useRef(false) // IME composition
  const isInternalUpdate = useRef(false)

  // Sincroniza DOM quando segments mudam externamente
  useEffect(() => {
    const el = ref.current
    if (!el || isInternalUpdate.current) return

    const newHtml = segmentsToHtml(segments)
    if (el.innerHTML !== newHtml) {
      // Salva e restaura posição do cursor
      const sel = window.getSelection()
      const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null

      el.innerHTML = newHtml

      if (range && el.contains(document.activeElement)) {
        try { sel.removeAllRanges(); sel.addRange(range) } catch {}
      }
    }
  }, [segments])

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus()
      // Posiciona cursor no final
      const range = document.createRange()
      range.selectNodeContents(ref.current)
      range.collapse(false)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }, [autoFocus])

  const handleInput = useCallback(() => {
    if (composingRef.current) return
    if (!ref.current || !onChange) return

    isInternalUpdate.current = true
    const newSegments = domToSegments(ref.current)
    onChange(newSegments)
    // Reset depois do próximo render
    requestAnimationFrame(() => { isInternalUpdate.current = false })
  }, [onChange])

  const handleKeyDown = useCallback((e) => {
    if (singleLine && e.key === 'Enter') {
      e.preventDefault()
      return
    }
    onKeyDown?.(e)
  }, [onKeyDown, singleLine])

  const handlePaste = useCallback((e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }, [])

  const isEmpty = !segments.length || segments.every(s => !s.text)

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onCompositionStart={() => { composingRef.current = true }}
      onCompositionEnd={() => {
        composingRef.current = false
        handleInput()
      }}
      data-placeholder={isEmpty ? placeholder : undefined}
      className={`
        outline-none break-words
        empty:before:content-[attr(data-placeholder)]
        empty:before:text-texto-suave/50
        empty:before:pointer-events-none
        ${className}
      `}
      style={{ minHeight: '1.5em' }}
      dangerouslySetInnerHTML={undefined}
    />
  )
}

