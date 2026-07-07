/**
 * GlobalSearch.jsx — Fase 5
 *
 * Busca global acionada por Ctrl+K / Cmd+K.
 *
 * Features:
 *  - Busca em tempo real enquanto digita
 *  - Filtrar por tipo (página, database, item)
 *  - Histórico de buscas recentes (localStorage)
 *  - Destaque do termo encontrado
 *  - Navegação por teclado (↑↓ Enter Esc)
 *
 * Compatível com GitHub Pages (sem backend).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Clock, FileText, Database, Hash, X, ChevronRight } from 'lucide-react'
import { useNavigation } from '../../contexts/NavigationContext.jsx'

const T = {
  fundo:      '#1C1610',
  superficie: '#2A1F14',
  card:       '#F5EDD6',
  textoSuave: '#6B4C3B',
  destaque:   '#8B4513',
  ouro:       '#C9A84C',
  borda:      '#5C3D1E',
}

const RECENT_KEY = 'search:recent'
const MAX_RECENT  = 8

// ─── Destaque de termo ────────────────────────────────────────────

function Highlight({ text = '', query = '' }) {
  if (!query.trim()) return <span>{text}</span>
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} style={{ background: `${T.ouro}44`, color: T.ouro, borderRadius: 2 }}>{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </span>
  )
}

// ─── Tipos de resultado ───────────────────────────────────────────

const TYPE_META = {
  page:     { icon: <FileText size={14} />, label: 'Página' },
  database: { icon: <Database size={14} />, label: 'Estante' },
  item:     { icon: <Hash size={14} />,     label: 'Item' },
}

// ─── Hook de atalho de teclado ────────────────────────────────────

export function useGlobalSearchShortcut(onOpen) {
  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        onOpen()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onOpen])
}

// ─── GlobalSearch ─────────────────────────────────────────────────

export default function GlobalSearch({ open, onClose, items = [] }) {
  const { pages, databases, navigateTo } = useNavigation()

  const [query, setQuery]       = useState('')
  const [filter, setFilter]     = useState('all')  // 'all' | 'page' | 'database' | 'item'
  const [recent, setRecent]     = useState([])
  const [activeIdx, setActiveIdx] = useState(0)

  const inputRef    = useRef(null)
  const listRef     = useRef(null)

  // ─── Carregar recentes ─────────────────────────────────────────

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_KEY)
      if (saved) setRecent(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  // ─── Focar ao abrir ───────────────────────────────────────────

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setActiveIdx(0)
    }
  }, [open])

  // ─── Construir resultados ─────────────────────────────────────

  const results = useCallback(() => {
    if (!query.trim()) return []

    const q = query.toLowerCase()
    const out = []

    // Páginas
    if (filter === 'all' || filter === 'page') {
      pages.forEach(p => {
        const title = (p.title ?? '').toLowerCase()
        if (title.includes(q)) {
          out.push({ id: p.id, type: 'page', title: p.title || 'Sem título', icon: p.icon || '📖' })
        }
      })
    }

    // Databases
    if (filter === 'all' || filter === 'database') {
      databases?.forEach(db => {
        const title = (db.schema.title ?? '').toLowerCase()
        if (title.includes(q)) {
          out.push({ id: db.schema.id, type: 'database', title: db.schema.title, icon: db.schema.icon || '🗂️' })
        }
      })
    }

    // Itens de database (passados como prop)
    if (filter === 'all' || filter === 'item') {
      items.forEach(it => {
        const title = (it._title ?? '').toLowerCase()
        if (title.includes(q)) {
          out.push({ id: it.id, type: 'item', title: it._title, icon: '📄', dbTitle: it._dbTitle })
        }
      })
    }

    return out.slice(0, 30)
  }, [query, filter, pages, databases, items])

  const searchResults = results()

  // ─── Navegar por teclado ──────────────────────────────────────

  function handleKeyDown(e) {
    if (e.key === 'Escape') { onClose(); return }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, searchResults.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter' && searchResults[activeIdx]) {
      selectResult(searchResults[activeIdx])
    }
  }

  // Scroll automático para o item ativo
  useEffect(() => {
    const el = listRef.current?.children[activeIdx]
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  // ─── Selecionar resultado ─────────────────────────────────────

  function selectResult(result) {
    // Salvar no histórico
    const entry = { id: result.id, type: result.type, title: result.title, icon: result.icon }
    setRecent(prev => {
      const filtered = prev.filter(r => r.id !== result.id)
      const next = [entry, ...filtered].slice(0, MAX_RECENT)
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })

    navigateTo(result.id)
    onClose()
  }

  function clearRecent() {
    setRecent([])
    try { localStorage.removeItem(RECENT_KEY) } catch { /* ignore */ }
  }

  if (!open) return null

  // ─── Render ───────────────────────────────────────────────────

  const showRecent  = !query.trim() && recent.length > 0
  const showResults = query.trim().length > 0

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="relative w-full max-w-xl rounded-xl shadow-2xl overflow-hidden"
          style={{ background: T.superficie, border: `1px solid ${T.borda}` }}
          onClick={e => e.stopPropagation()}
        >
          {/* Input de busca */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: `1px solid ${T.borda}` }}
          >
            <Search size={18} style={{ color: T.textoSuave, shrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setActiveIdx(0) }}
              onKeyDown={handleKeyDown}
              placeholder="Buscar páginas, estantes, itens…"
              className="flex-1 bg-transparent text-base outline-none font-serif"
              style={{ color: T.card }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ color: T.textoSuave }}>
                <X size={14} />
              </button>
            )}
            <kbd
              className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded text-xs"
              style={{ background: `${T.fundo}88`, color: T.textoSuave, border: `1px solid ${T.borda}` }}
            >
              Esc
            </kbd>
          </div>

          {/* Filtros de tipo */}
          {showResults && (
            <div
              className="flex items-center gap-1 px-3 py-1.5"
              style={{ borderBottom: `1px solid ${T.borda}` }}
            >
              {[['all', 'Tudo'], ['page', 'Páginas'], ['database', 'Estantes'], ['item', 'Itens']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setFilter(val)}
                  className="px-2.5 py-0.5 rounded-full text-xs font-serif transition-colors"
                  style={{
                    background: filter === val ? T.ouro : 'transparent',
                    color: filter === val ? T.texto : T.textoSuave,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Lista de resultados */}
          <div className="max-h-80 overflow-y-auto" ref={listRef} style={{ scrollbarWidth: 'thin' }}>
            {/* Histórico recente */}
            {showRecent && (
              <>
                <div
                  className="flex items-center justify-between px-4 py-1.5"
                >
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: T.textoSuave }}>
                    Recentes
                  </span>
                  <button onClick={clearRecent} className="text-xs hover:opacity-70" style={{ color: T.textoSuave }}>
                    Limpar
                  </button>
                </div>
                {recent.map((r, idx) => (
                  <ResultRow
                    key={r.id}
                    result={r}
                    query=""
                    isActive={false}
                    onSelect={() => selectResult(r)}
                    isRecent
                  />
                ))}
              </>
            )}

            {/* Resultados de busca */}
            {showResults && searchResults.length === 0 && (
              <p className="px-4 py-6 text-sm font-serif text-center" style={{ color: T.textoSuave }}>
                Nenhum resultado para "<strong style={{ color: T.card }}>{query}</strong>"
              </p>
            )}
            {showResults && searchResults.map((r, idx) => (
              <ResultRow
                key={r.id}
                result={r}
                query={query}
                isActive={idx === activeIdx}
                onSelect={() => selectResult(r)}
              />
            ))}

            {/* Placeholder vazio */}
            {!showRecent && !showResults && (
              <p className="px-4 py-6 text-sm font-serif text-center" style={{ color: T.textoSuave }}>
                Digite para buscar em toda a biblioteca…
              </p>
            )}
          </div>

          {/* Footer com dicas */}
          <div
            className="flex items-center gap-4 px-4 py-2 text-xs"
            style={{ borderTop: `1px solid ${T.borda}`, color: T.textoSuave }}
          >
            <span>↑↓ navegar</span>
            <span>↵ abrir</span>
            <span>Esc fechar</span>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── ResultRow ────────────────────────────────────────────────────

function ResultRow({ result, query, isActive, onSelect, isRecent = false }) {
  const meta = TYPE_META[result.type] ?? TYPE_META.page

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
      style={{
        background: isActive ? `${T.ouro}18` : 'transparent',
        color: T.card,
      }}
    >
      {/* Ícone de tipo */}
      <span style={{ color: T.textoSuave, shrink: 0 }}>
        {isRecent ? <Clock size={14} /> : meta.icon}
      </span>

      {/* Ícone + título */}
      <span className="flex-1 min-w-0">
        <span className="mr-1.5">{result.icon}</span>
        <span className="text-sm font-serif">
          <Highlight text={result.title} query={query} />
        </span>
        {result.dbTitle && (
          <span className="ml-2 text-xs" style={{ color: T.textoSuave }}>
            em {result.dbTitle}
          </span>
        )}
      </span>

      {/* Badge de tipo */}
      <span
        className="shrink-0 text-xs px-1.5 py-0.5 rounded-full"
        style={{ background: `${T.borda}66`, color: T.textoSuave }}
      >
        {meta.label}
      </span>

      <ChevronRight size={12} style={{ color: T.textoSuave, shrink: 0 }} />
    </button>
  )
}

// Exportar também o T para uso externo
export { T }
