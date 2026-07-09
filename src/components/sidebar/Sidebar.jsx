/**
 * Sidebar.jsx — Fase 5 + fix navegação de databases
 */

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Database, Star, StarOff, ChevronRight, ChevronDown,
  Search, X, PanelLeftClose, PanelLeftOpen, Plus, GripVertical,
} from 'lucide-react'
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

// ─── SortableSidebarItem ──────────────────────────────────────────

function SortableSidebarItem({ page, depth = 0, libId }) {
  const navigate = useNavigate()
  const {
    activePageId, navigateTo, toggleExpanded, expandedIds,
    toggleFavorite, isFavorite, pages,
  } = useNavigation()

  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: page.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const isActive    = activePageId === page.id
  const isExpanded  = expandedIds[page.id]
  const hasChildren = page.children?.length > 0 || pages.some(p => p.parentId === page.id)
  const icon        = page.icon || (page.type === 'database' ? '🗂️' : '📄')

  function handleClick() {
    if (page.type === 'database') {
      navigate(`/biblioteca/${libId}/database/${page.folderId ?? page.id}`)
    } else {
      navigate(`/biblioteca/${libId}/pagina/${page.id}`)
      navigateTo(page.id)
    }
    if (hasChildren) toggleExpanded(page.id)
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className="group flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer select-none"
        style={{
          paddingLeft: `${8 + depth * 16}px`,
          background: isActive ? `${T.ouro}22` : 'transparent',
          borderLeft: isActive ? `2px solid ${T.ouro}` : '2px solid transparent',
        }}
        onClick={handleClick}
      >
        <span
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-40 cursor-grab active:cursor-grabbing shrink-0"
          style={{ color: T.textoSuave }}
          onClick={e => e.stopPropagation()}
        >
          <GripVertical size={12} />
        </span>

        <span
          className="shrink-0"
          style={{ width: 14, color: T.textoSuave }}
          onClick={e => { e.stopPropagation(); toggleExpanded(page.id) }}
        >
          {hasChildren
            ? (isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)
            : null}
        </span>

        <span className="shrink-0 text-sm leading-none">{icon}</span>

        <span
          className="flex-1 truncate text-sm font-serif"
          style={{ color: isActive ? T.ouro : T.card }}
        >
          {page.title || 'Sem título'}
        </span>

        <button
          className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded hover:bg-white/10 transition-all"
          style={{ color: isFavorite(page.id) ? T.ouro : T.textoSuave }}
          onClick={e => { e.stopPropagation(); toggleFavorite(page.id) }}
          title={isFavorite(page.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          {isFavorite(page.id) ? <Star size={11} fill="currentColor" /> : <StarOff size={11} />}
        </button>
      </div>

      {isExpanded && page.children?.length > 0 && (
        <SidebarLevel pages={page.children} depth={depth + 1} libId={libId} />
      )}
    </div>
  )
}

// ─── SidebarLevel ─────────────────────────────────────────────────

function SidebarLevel({ pages, depth = 0, libId }) {
  const { reorderPages, pages: allPages } = useNavigation()

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },
  }))

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids    = pages.map(p => p.id)
    const oldIdx = ids.indexOf(active.id)
    const newIdx = ids.indexOf(over.id)
    if (oldIdx === -1 || newIdx === -1) return
    const reordered = arrayMove(ids, oldIdx, newIdx)
    const updatedAll = allPages.map(p => {
      const idx = reordered.indexOf(p.id)
      if (idx !== -1) return { ...p, order: idx }
      return p
    })
    reorderPages(updatedAll)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={pages.map(p => p.id)} strategy={verticalListSortingStrategy}>
        {pages.map(page => (
          <SortableSidebarItem key={page.id} page={page} depth={depth} libId={libId} />
        ))}
      </SortableContext>
    </DndContext>
  )
}

// ─── FavoritesSection ─────────────────────────────────────────────

function FavoritesSection({ libId }) {
  const navigate = useNavigate()
  const { favorites, pages, navigateTo, activePageId } = useNavigation()

  const favPages = favorites.map(id => pages.find(p => p.id === id)).filter(Boolean)
  if (favPages.length === 0) return null

  return (
    <div className="mb-3">
      <p className="px-3 py-1 text-xs font-semibold tracking-widest uppercase" style={{ color: T.textoSuave }}>
        Favoritos
      </p>
      {favPages.map(page => {
        const isActive = activePageId === page.id
        return (
          <button
            key={page.id}
            onClick={() => {
              navigate(`/biblioteca/${libId}/pagina/${page.id}`)
              navigateTo(page.id)
            }}
            className="w-full flex items-center gap-2 px-3 py-1 rounded-md text-left"
            style={{ color: isActive ? T.ouro : T.card, background: isActive ? `${T.ouro}22` : 'transparent' }}
          >
            <Star size={10} fill="currentColor" style={{ color: T.ouro }} />
            <span className="truncate text-sm font-serif">
              {page.icon} {page.title || 'Sem título'}
            </span>
          </button>
        )
      })}
      <div className="my-2 mx-3" style={{ borderTop: `1px solid ${T.borda}` }} />
    </div>
  )
}

// ─── SearchResults ────────────────────────────────────────────────

function SearchResults({ libId }) {
  const navigate = useNavigate()
  const { sidebarFiltered, navigateTo, activePageId } = useNavigation()
  if (!sidebarFiltered) return null

  if (sidebarFiltered.length === 0) {
    return (
      <p className="px-3 py-2 text-sm font-serif" style={{ color: T.textoSuave }}>
        Nenhuma página encontrada.
      </p>
    )
  }

  return (
    <div>
      {sidebarFiltered.map(page => {
        const isActive = activePageId === page.id
        return (
          <button
            key={page.id}
            onClick={() => {
              navigate(`/biblioteca/${libId}/pagina/${page.id}`)
              navigateTo(page.id)
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-left hover:bg-white/5"
            style={{ color: isActive ? T.ouro : T.card }}
          >
            <span className="shrink-0 text-sm">{page.icon || '📄'}</span>
            <span className="truncate text-sm font-serif">{page.title || 'Sem título'}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Sidebar (componente raiz) ────────────────────────────────────

export default function Sidebar({ onNewPage, onNewDatabase, libraryId }) {
  const navigate = useNavigate()
  const libId = libraryId
  const {
    sidebarOpen, toggleSidebar,
    pageTree, databases,
    sidebarSearch, setSidebarSearch,
    sidebarFiltered,
    navigateTo, activePageId,
  } = useNavigation()

  if (!sidebarOpen) {
    return (
      <div
        className="flex flex-col items-center pt-4 gap-3"
        style={{ width: 40, background: T.superficie, borderRight: `1px solid ${T.borda}`, minHeight: '100vh' }}
      >
        <button
          onClick={toggleSidebar}
          title="Abrir índice"
          className="p-2 rounded hover:bg-white/10 transition-colors"
          style={{ color: T.textoSuave }}
        >
          <PanelLeftOpen size={16} />
        </button>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col"
      style={{
        width: 240, minWidth: 240, maxWidth: 240,
        background: T.superficie,
        borderRight: `1px solid ${T.borda}`,
        minHeight: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-3"
        style={{ borderBottom: `1px solid ${T.borda}` }}
      >
        <span className="font-serif font-semibold text-sm" style={{ color: T.ouro }}>
          📚 Índice Geral
        </span>
        <button
          onClick={toggleSidebar}
          title="Fechar índice"
          className="p-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: T.textoSuave }}
        >
          <PanelLeftClose size={15} />
        </button>
      </div>

      {/* Busca */}
      <div className="px-2 py-2" style={{ borderBottom: `1px solid ${T.borda}` }}>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md" style={{ background: `${T.fundo}88` }}>
          <Search size={12} style={{ color: T.textoSuave }} />
          <input
            type="text"
            value={sidebarSearch}
            onChange={e => setSidebarSearch(e.target.value)}
            placeholder="Buscar páginas..."
            className="flex-1 bg-transparent text-sm outline-none font-serif"
            style={{ color: T.card }}
          />
          {sidebarSearch && (
            <button onClick={() => setSidebarSearch('')} style={{ color: T.textoSuave }}>
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: 'thin' }}>
        {sidebarFiltered !== null ? (
          <SearchResults libId={libId} />
        ) : (
          <>
            <FavoritesSection libId={libId} />

            {pageTree.length > 0 && (
              <div className="mb-2">
                <p className="px-3 py-1 text-xs font-semibold tracking-widest uppercase" style={{ color: T.textoSuave }}>
                  Páginas
                </p>
                <SidebarLevel pages={pageTree} depth={0} libId={libId} />
              </div>
            )}

            {databases?.length > 0 && (
              <div className="mb-2">
                <div className="my-2 mx-3" style={{ borderTop: `1px solid ${T.borda}` }} />
                <p className="px-3 py-1 text-xs font-semibold tracking-widest uppercase" style={{ color: T.textoSuave }}>
                  Estantes
                </p>
                {databases.map(db => {
                  const isActive = activePageId === db.folderId
                  return (
                    <button
                      key={db.folderId}
                      onClick={() => navigate(`/biblioteca/${libId}/database/${db.folderId}`)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-left hover:bg-white/5 transition-colors"
                      style={{
                        color: isActive ? T.ouro : T.card,
                        background: isActive ? `${T.ouro}22` : 'transparent',
                      }}
                    >
                      <span className="shrink-0 text-sm">{db.schema?.icon || '🗂️'}</span>
                      <span className="truncate text-sm font-serif">{db.schema?.title || 'Estante'}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1 px-2 py-2" style={{ borderTop: `1px solid ${T.borda}` }}>
        <button
          onClick={onNewPage}
          className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-white/10 transition-colors text-left"
          style={{ color: T.textoSuave }}
          title="Nova página"
        >
          <Plus size={13} />
          <span className="text-xs font-serif">Nova página</span>
        </button>
        <button
          onClick={onNewDatabase}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-white/10 transition-colors"
          style={{ color: T.textoSuave }}
          title="Nova estante"
        >
          <Database size={13} />
        </button>
      </div>
    </div>
  )
}
