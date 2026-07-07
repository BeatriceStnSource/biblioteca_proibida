/**
 * MentionPicker.jsx — Fase 5
 *
 * Seletor de @menção de páginas que aparece no editor.
 * Acionado digitando "@" em qualquer bloco de texto.
 *
 * Props:
 *   query       — texto digitado após o @
 *   anchorRect  — DOMRect do cursor (para posicionamento)
 *   onSelect    — (page: { id, title, icon }) => void
 *   onClose     — () => void
 *
 * Integração no editor de blocos:
 *   Detectar @ no input → abrir MentionPicker
 *   Ao selecionar → inserir bloco/mark do tipo "mencao"
 *   Esc ou blur → fechar
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigation } from '../../contexts/NavigationContext.jsx'
import { FileText, Database, AtSign } from 'lucide-react'

const T = {
  fundo:      '#1C1610',
  superficie: '#2A1F14',
  card:       '#F5EDD6',
  textoSuave: '#6B4C3B',
  ouro:       '#C9A84C',
  borda:      '#5C3D1E',
}

export default function MentionPicker({ query = '', anchorRect, onSelect, onClose }) {
  const { pages, databases } = useNavigation()
  const [activeIdx, setActiveIdx] = useState(0)
  const listRef = useRef(null)

  // Filtrar páginas + databases
  const candidates = [
    ...pages.map(p => ({ id: p.id, title: p.title || 'Sem título', icon: p.icon || '📖', type: 'page' })),
    ...(databases ?? []).map(db => ({
      id: db.schema.id, title: db.schema.title, icon: db.schema.icon || '🗂️', type: 'database',
    })),
  ].filter(c =>
    !query.trim() || c.title.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 12)

  // Navegação por teclado
  useEffect(() => {
    function handler(e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, candidates.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && candidates[activeIdx]) { e.preventDefault(); onSelect(candidates[activeIdx]) }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [candidates, activeIdx, onSelect, onClose])

  // Scroll automático
  useEffect(() => {
    listRef.current?.children[activeIdx]?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  // Posicionamento relativo ao cursor
  const style = {}
  if (anchorRect) {
    style.position = 'fixed'
    style.left = anchorRect.left
    style.top  = anchorRect.bottom + 4
    // Não ultrapassar a direita
    style.maxWidth = Math.min(280, window.innerWidth - anchorRect.left - 16)
  }

  return (
    <div
      className="z-50 rounded-lg shadow-2xl overflow-hidden"
      style={{
        ...style,
        background: T.superficie,
        border: `1px solid ${T.borda}`,
        width: 260,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: `1px solid ${T.borda}` }}
      >
        <AtSign size={12} style={{ color: T.ouro }} />
        <span className="text-xs font-serif" style={{ color: T.textoSuave }}>
          {query ? `"${query}"` : 'Mencionar página…'}
        </span>
      </div>

      {/* Lista */}
      <div className="max-h-52 overflow-y-auto" ref={listRef} style={{ scrollbarWidth: 'thin' }}>
        {candidates.length === 0 ? (
          <p className="px-3 py-4 text-sm font-serif text-center" style={{ color: T.textoSuave }}>
            Nenhuma página encontrada
          </p>
        ) : (
          candidates.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
              style={{
                background: idx === activeIdx ? `${T.ouro}18` : 'transparent',
                color: T.card,
              }}
            >
              <span className="shrink-0 text-base leading-none">{c.icon}</span>
              <span className="flex-1 truncate text-sm font-serif">{c.title}</span>
              <span className="shrink-0" style={{ color: T.textoSuave }}>
                {c.type === 'database' ? <Database size={11} /> : <FileText size={11} />}
              </span>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div
        className="px-3 py-1.5 text-xs"
        style={{ borderTop: `1px solid ${T.borda}`, color: T.textoSuave }}
      >
        ↑↓ navegar · ↵ inserir · Esc cancelar
      </div>
    </div>
  )
}

// ─── Hook para usar no editor ────────────────────────────────────

/**
 * Detecta quando o usuário digita "@" e gerencia o estado do MentionPicker.
 *
 * Exemplo de uso no componente de bloco de texto:
 *
 *   const { mentionState, handleMentionInput, handleMentionSelect, closeMention } = useMention()
 *
 *   // No onChange do input:
 *   handleMentionInput(e.target.value, e.target)
 *
 *   // Renderizar o picker quando ativo:
 *   {mentionState.open && (
 *     <MentionPicker
 *       query={mentionState.query}
 *       anchorRect={mentionState.anchorRect}
 *       onSelect={page => {
 *         handleMentionSelect(page, inputRef.current, setValue)
 *       }}
 *       onClose={closeMention}
 *     />
 *   )}
 */
export function useMention() {
  const [mentionState, setMentionState] = useState({
    open: false,
    query: '',
    anchorRect: null,
    atPos: -1,
  })

  function handleMentionInput(value, inputEl) {
    const pos = inputEl?.selectionStart ?? value.length
    // Procurar @ mais recente antes do cursor
    const before = value.slice(0, pos)
    const atIdx  = before.lastIndexOf('@')

    if (atIdx === -1) {
      if (mentionState.open) closeMention()
      return
    }

    const query = before.slice(atIdx + 1)
    // Fechar se tem espaço no query (usuário continuou digitando algo diferente)
    if (query.includes(' ') && query.trim().length === 0) {
      closeMention(); return
    }

    const rect = inputEl?.getBoundingClientRect() ?? null
    setMentionState({ open: true, query, anchorRect: rect, atPos: atIdx })
  }

  function handleMentionSelect(page, inputEl, setValue) {
    if (inputEl && mentionState.atPos >= 0) {
      const currentVal = inputEl.value
      const before = currentVal.slice(0, mentionState.atPos)
      const after  = currentVal.slice(inputEl.selectionStart)
      const mention = `@${page.title}`
      const newVal  = before + mention + after
      setValue(newVal)
    }
    closeMention()
    return page   // devolver a página selecionada para o chamador criar o bloco/mark
  }

  function closeMention() {
    setMentionState({ open: false, query: '', anchorRect: null, atPos: -1 })
  }

  return { mentionState, handleMentionInput, handleMentionSelect, closeMention }
}
