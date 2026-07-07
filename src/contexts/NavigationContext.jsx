/**
 * NavigationContext.jsx — Fase 5: Navegação e UX
 *
 * Gerencia:
 *  - Árvore de páginas da biblioteca (hierarquia aninhada)
 *  - Página ativa e trail de breadcrumb
 *  - Favoritos (persistidos no Drive via _meta.json)
 *  - Sidebar aberta/fechada
 *  - Histórico de versões local (por página)
 *
 * Compatível com GitHub Pages (sem backend).
 */

import {
  createContext, useContext, useState, useEffect,
  useCallback, useRef,
} from 'react'

// ─── Context ──────────────────────────────────────────────────────

const NavigationContext = createContext(null)

export function useNavigation() {
  const ctx = useContext(NavigationContext)
  if (!ctx) throw new Error('useNavigation must be inside NavigationProvider')
  return ctx
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Dado um array flat de páginas com { id, parentId, ... },
 * constrói a árvore aninhada { ...page, children: [...] }.
 */
export function buildTree(pages) {
  const map = {}
  pages.forEach(p => { map[p.id] = { ...p, children: [] } })
  const roots = []
  pages.forEach(p => {
    if (p.parentId && map[p.parentId]) {
      map[p.parentId].children.push(map[p.id])
    } else {
      roots.push(map[p.id])
    }
  })
  // Ordenar por order dentro de cada nível
  function sort(nodes) {
    nodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    nodes.forEach(n => sort(n.children))
  }
  sort(roots)
  return roots
}

/**
 * Retorna o trail de breadcrumb para uma página:
 * [raiz, ..., pai, página]
 */
export function buildBreadcrumb(pageId, pages) {
  const map = Object.fromEntries(pages.map(p => [p.id, p]))
  const trail = []
  let current = map[pageId]
  while (current) {
    trail.unshift(current)
    current = current.parentId ? map[current.parentId] : null
  }
  return trail
}

// ─── Provider ─────────────────────────────────────────────────────

export function NavigationProvider({
  libraryId,
  accessToken,
  pages,          // array flat de { id, title, icon, parentId, order, type, ... }
  databases,      // array de { schema: { id, title, icon } }
  onPagesChange,  // (newPages) => void — para persistir reordenação
  children,
}) {
  const [sidebarOpen, setSidebarOpen]     = useState(true)
  const [activePageId, setActivePageId]   = useState(null)
  const [favorites, setFavorites]         = useState([])   // array de ids
  const [expandedIds, setExpandedIds]     = useState({})   // { [id]: boolean }
  const [sidebarSearch, setSidebarSearch] = useState('')

  // Versões locais: { [pageId]: [{ timestamp, blocks, label }] }
  const [versions, setVersions] = useState({})

  const saveFavDebounce = useRef(null)

  // ─── Favoritos: persistir em localStorage (sem backend) ─────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`fav:${libraryId}`)
      if (saved) setFavorites(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [libraryId])

  function persistFavorites(newFavs) {
    try {
      localStorage.setItem(`fav:${libraryId}`, JSON.stringify(newFavs))
    } catch { /* ignore */ }
  }

  // ─── Favoritos: expandidos: persistir em localStorage ───────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`expanded:${libraryId}`)
      if (saved) setExpandedIds(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [libraryId])

  function persistExpanded(newExpanded) {
    try {
      localStorage.setItem(`expanded:${libraryId}`, JSON.stringify(newExpanded))
    } catch { /* ignore */ }
  }

  // ─── Árvore de navegação ─────────────────────────────────────────

  const pageTree = buildTree(pages)

  // ─── Breadcrumb ──────────────────────────────────────────────────

  const breadcrumb = activePageId
    ? buildBreadcrumb(activePageId, pages)
    : []

  // ─── Navegação ───────────────────────────────────────────────────

  function navigateTo(pageId) {
    setActivePageId(pageId)
    // Auto-expandir pais
    const trail = buildBreadcrumb(pageId, pages)
    const newExpanded = { ...expandedIds }
    trail.slice(0, -1).forEach(p => { newExpanded[p.id] = true })
    setExpandedIds(newExpanded)
    persistExpanded(newExpanded)
  }

  // ─── Sidebar ─────────────────────────────────────────────────────

  function toggleSidebar() { setSidebarOpen(o => !o) }

  function toggleExpanded(id) {
    setExpandedIds(prev => {
      const next = { ...prev, [id]: !prev[id] }
      persistExpanded(next)
      return next
    })
  }

  // ─── Favoritos ───────────────────────────────────────────────────

  function toggleFavorite(pageId) {
    setFavorites(prev => {
      const next = prev.includes(pageId)
        ? prev.filter(id => id !== pageId)
        : [...prev, pageId]
      persistFavorites(next)
      return next
    })
  }

  function isFavorite(pageId) {
    return favorites.includes(pageId)
  }

  // ─── Reordenar páginas (drag & drop na sidebar) ──────────────────

  function reorderPages(newPagesFlat) {
    onPagesChange?.(newPagesFlat)
  }

  function movePage(pageId, newParentId, newIndex) {
    const others = pages.filter(p => p.parentId === newParentId && p.id !== pageId)
    others.splice(newIndex, 0, { id: pageId })
    const updatedPages = pages.map(p => {
      if (p.id === pageId) return { ...p, parentId: newParentId ?? null }
      return p
    })
    // Reatribuir order dentro do novo pai
    let order = 0
    const final = updatedPages.map(p => {
      if (p.parentId === newParentId) {
        const idx = others.findIndex(o => o.id === p.id)
        return { ...p, order: idx >= 0 ? idx : order++ }
      }
      return p
    })
    onPagesChange?.(final)
  }

  // ─── Filtro de sidebar ───────────────────────────────────────────

  const sidebarFiltered = sidebarSearch.trim().length > 0
    ? pages.filter(p =>
        (p.title ?? 'Sem título').toLowerCase()
          .includes(sidebarSearch.toLowerCase())
      )
    : null   // null = mostrar árvore normal

  // ─── Histórico de versões (local) ────────────────────────────────

  /**
   * Salva uma snapshot dos blocos de uma página.
   * Mantém as últimas 30 versões por página.
   */
  function saveVersion(pageId, blocks, label = '') {
    setVersions(prev => {
      const history = prev[pageId] ?? []
      const snapshot = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        label: label || new Date().toLocaleString('pt-BR'),
        blocks: JSON.parse(JSON.stringify(blocks)),  // deep copy
      }
      const updated = [snapshot, ...history].slice(0, 30)
      return { ...prev, [pageId]: updated }
    })
  }

  /**
   * Retorna versões de uma página, mais recente primeiro.
   */
  function getVersions(pageId) {
    return versions[pageId] ?? []
  }

  /**
   * Retorna os blocos de uma versão específica.
   */
  function getVersion(pageId, versionId) {
    return (versions[pageId] ?? []).find(v => v.id === versionId) ?? null
  }

  // ─── Context value ────────────────────────────────────────────────

  const value = {
    // Estado
    sidebarOpen,
    activePageId,
    breadcrumb,
    pageTree,
    pages,
    databases,
    expandedIds,
    favorites,
    sidebarSearch,
    sidebarFiltered,

    // Ações — layout
    toggleSidebar,
    setSidebarOpen,

    // Ações — navegação
    navigateTo,
    setActivePageId,

    // Ações — sidebar
    toggleExpanded,
    setSidebarSearch,

    // Ações — favoritos
    toggleFavorite,
    isFavorite,

    // Ações — reordenação
    reorderPages,
    movePage,

    // Ações — histórico
    saveVersion,
    getVersions,
    getVersion,
  }

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  )
}
