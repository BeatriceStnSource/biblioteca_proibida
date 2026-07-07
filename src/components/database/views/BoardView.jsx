/**
 * BoardView.jsx — Fase 3/4
 *
 * View Kanban do database: agrupa itens em colunas por propriedade
 * select ou status. Suporta arrastar itens entre colunas via drag & drop
 * com @dnd-kit.
 *
 * Props (sharedProps do DatabaseView):
 *   items         — array de itens do database
 *   schema        — schema do database (_schema.json)
 *   view          — view ativa { groupBy, ... }
 *   onItemClick   — (item) => void
 *   onAddItem     — (defaults?) => void
 *   onUpdateItem  — (itemId, patch) => void
 *   getItemColor  — (item) => { bg, border } | null
 *   getComputedValue — (item, propId) => any
 */

import { useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, MoreHorizontal, GripVertical } from 'lucide-react'

// ─── Cores ────────────────────────────────────────────────────────

const T = {
  fundo:      '#1C1610',
  superficie: '#2A1F14',
  card:       '#F5EDD6',
  textoSuave: '#6B4C3B',
  destaque:   '#8B4513',
  ouro:       '#C9A84C',
  borda:      '#5C3D1E',
}

const TAG_COLORS = {
  default: { bg: 'rgba(92,61,30,0.35)',    text: '#F5EDD6' },
  cinza:   { bg: 'rgba(120,120,120,0.35)', text: '#d0d0d0' },
  marrom:  { bg: 'rgba(139,69,19,0.4)',    text: '#F5EDD6' },
  laranja: { bg: 'rgba(217,115,13,0.35)',  text: '#f5c87e' },
  amarelo: { bg: 'rgba(200,175,0,0.35)',   text: '#f0d060' },
  verde:   { bg: 'rgba(68,131,97,0.35)',   text: '#9cdcb0' },
  azul:    { bg: 'rgba(51,126,169,0.35)',  text: '#87c8ef' },
  roxo:    { bg: 'rgba(144,101,176,0.35)', text: '#d0aff0' },
  rosa:    { bg: 'rgba(193,76,138,0.35)',  text: '#f0a0d0' },
  vermelho:{ bg: 'rgba(212,76,71,0.35)',   text: '#f09090' },
}

function tagStyle(color) {
  return TAG_COLORS[color] ?? TAG_COLORS.default
}

// ─── Helpers ──────────────────────────────────────────────────────

/** Retorna a propriedade pela qual o board deve agrupar */
function getGroupProp(schema, view) {
  if (!schema?.properties) return null
  const groupById = view?.groupBy
  if (groupById) {
    return schema.properties.find(p => p.id === groupById) ?? null
  }
  // Fallback: primeiro select ou status disponível
  return schema.properties.find(p =>
    p.type === 'select' || p.type === 'status' || p.type === 'multiselect'
  ) ?? null
}

/** Retorna as opções de agrupamento (colunas do board) */
function getGroupOptions(prop) {
  if (!prop) return [{ id: null, name: 'Sem grupo', color: 'default' }]

  const options = prop.options ?? []

  if (prop.type === 'status') {
    // Status tem grupos: Não iniciado / Em progresso / Concluído
    return [
      { id: null, name: 'Sem status', color: 'default' },
      ...options,
    ]
  }

  return [
    { id: null, name: 'Sem ' + prop.name, color: 'default' },
    ...options,
  ]
}

/** Retorna o valor do grupo de um item para a prop de agrupamento */
function getItemGroupId(item, prop) {
  if (!prop) return null
  const cell = item.properties?.[prop.id]
  if (!cell) return null
  if (prop.type === 'multiselect') {
    // Para multiselect, usa o primeiro valor
    return Array.isArray(cell.value) ? (cell.value[0] ?? null) : null
  }
  return cell.value ?? null
}

/** Retorna o título do item (propriedade title) */
function getItemTitle(item, schema) {
  const titleProp = schema?.properties?.find(p => p.type === 'title')
  if (!titleProp) return 'Sem título'
  return item.properties?.[titleProp.id]?.value || 'Sem título'
}

/** Retorna propriedades visíveis no card (exceto title e a prop de grupo) */
function getCardProps(schema, view, groupPropId) {
  const hidden = new Set(view?.hiddenProperties ?? [])
  return (schema?.properties ?? []).filter(p =>
    p.type !== 'title' &&
    p.id !== groupPropId &&
    !hidden.has(p.id) &&
    ['select', 'multiselect', 'status', 'checkbox', 'date', 'number', 'text', 'url'].includes(p.type)
  ).slice(0, 3) // máx 3 props no card
}

// ─── ItemCard — card arrastável ───────────────────────────────────

function ItemCard({ item, schema, view, groupPropId, onItemClick, getItemColor, isDragging }) {
  const title    = getItemTitle(item, schema)
  const cardProps = getCardProps(schema, view, groupPropId)
  const color    = getItemColor?.(item)

  return (
    <div
      onClick={() => onItemClick?.(item)}
      className="rounded-lg p-3 cursor-pointer transition-colors group"
      style={{
        background: color?.bg ?? `${T.superficie}ee`,
        border: `1px solid ${color?.border ?? T.borda}`,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      {/* Título */}
      <p className="text-sm font-serif font-medium leading-snug mb-2" style={{ color: T.card }}>
        {title}
      </p>

      {/* Props adicionais */}
      {cardProps.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {cardProps.map(prop => {
            const cell = item.properties?.[prop.id]
            if (!cell?.value && cell?.value !== false && cell?.value !== 0) return null

            if (prop.type === 'select' || prop.type === 'status') {
              const opt = prop.options?.find(o => o.id === cell.value)
              if (!opt) return null
              const s = tagStyle(opt.color)
              return (
                <span
                  key={prop.id}
                  className="text-xs px-1.5 py-0.5 rounded-md font-serif"
                  style={{ background: s.bg, color: s.text }}
                >
                  {opt.name}
                </span>
              )
            }

            if (prop.type === 'multiselect') {
              const vals = Array.isArray(cell.value) ? cell.value : []
              return vals.slice(0, 2).map(optId => {
                const opt = prop.options?.find(o => o.id === optId)
                if (!opt) return null
                const s = tagStyle(opt.color)
                return (
                  <span
                    key={optId}
                    className="text-xs px-1.5 py-0.5 rounded-md font-serif"
                    style={{ background: s.bg, color: s.text }}
                  >
                    {opt.name}
                  </span>
                )
              })
            }

            if (prop.type === 'checkbox') {
              return (
                <span key={prop.id} className="text-xs" style={{ color: T.textoSuave }}>
                  {cell.value ? '✓ ' : '○ '}{prop.name}
                </span>
              )
            }

            if (prop.type === 'date' && cell.value) {
              return (
                <span key={prop.id} className="text-xs" style={{ color: T.textoSuave }}>
                  📅 {new Date(cell.value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </span>
              )
            }

            if (prop.type === 'number' && cell.value !== null && cell.value !== undefined) {
              return (
                <span key={prop.id} className="text-xs" style={{ color: T.textoSuave }}>
                  {prop.name}: {cell.value}
                </span>
              )
            }

            return null
          })}
        </div>
      )}
    </div>
  )
}

// ─── SortableCard ─────────────────────────────────────────────────

function SortableCard({ item, ...rest }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group/card">
      {/* Handle de drag */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/card:opacity-100 cursor-grab active:cursor-grabbing p-1 rounded transition-opacity z-10"
        style={{ color: T.textoSuave }}
        onClick={e => e.stopPropagation()}
      >
        <GripVertical size={12} />
      </div>
      <ItemCard item={item} isDragging={isDragging} {...rest} />
    </div>
  )
}

// ─── BoardColumn ──────────────────────────────────────────────────

function BoardColumn({ option, items, schema, view, groupPropId, onItemClick, onAddItem, getItemColor }) {
  const style = tagStyle(option.color)
  const itemIds = items.map(i => i.id)

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden shrink-0"
      style={{
        width: 260,
        background: `${T.superficie}88`,
        border: `1px solid ${T.borda}`,
      }}
    >
      {/* Cabeçalho da coluna */}
      <div
        className="flex items-center justify-between px-3 py-2.5 shrink-0"
        style={{ borderBottom: `1px solid ${T.borda}` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-2 py-0.5 rounded-md font-serif font-medium"
            style={{ background: style.bg, color: style.text }}
          >
            {option.name}
          </span>
          <span className="text-xs" style={{ color: T.textoSuave }}>
            {items.length}
          </span>
        </div>
      </div>

      {/* Itens */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2" style={{ minHeight: 120 }}>
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {items.map(item => (
            <SortableCard
              key={item.id}
              item={item}
              schema={schema}
              view={view}
              groupPropId={groupPropId}
              onItemClick={onItemClick}
              getItemColor={getItemColor}
            />
          ))}
        </SortableContext>

        {items.length === 0 && (
          <p className="text-xs text-center py-4 font-serif" style={{ color: `${T.textoSuave}66` }}>
            Nenhum item
          </p>
        )}
      </div>

      {/* Botão de adicionar */}
      <button
        onClick={() => {
          // Pré-preenche o valor do grupo no novo item
          const defaults = option.id
            ? { [groupPropId]: { type: schema?.properties?.find(p => p.id === groupPropId)?.type, value: option.id } }
            : {}
          onAddItem?.(defaults)
        }}
        className="flex items-center gap-1.5 w-full px-3 py-2.5 text-xs font-serif hover:bg-white/5 transition-colors shrink-0"
        style={{ color: T.textoSuave, borderTop: `1px solid ${T.borda}` }}
      >
        <Plus size={12} />
        Novo item
      </button>
    </div>
  )
}

// ─── BoardView ────────────────────────────────────────────────────

export default function BoardView({
  items = [],
  schema,
  view,
  onItemClick,
  onAddItem,
  onUpdateItem,
  getItemColor,
  getComputedValue,
}) {
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // ── Prop de agrupamento ───────────────────────────────────────

  const groupProp    = useMemo(() => getGroupProp(schema, view), [schema, view])
  const groupOptions = useMemo(() => getGroupOptions(groupProp), [groupProp])

  // ── Agrupar itens por coluna ──────────────────────────────────

  const columns = useMemo(() => {
    return groupOptions.map(opt => ({
      option: opt,
      items: items.filter(item => {
        const gid = getItemGroupId(item, groupProp)
        return opt.id === null ? gid === null : gid === opt.id
      }),
    }))
  }, [items, groupProp, groupOptions])

  // ── Drag & drop entre colunas ─────────────────────────────────

  function handleDragStart({ active }) {
    setActiveId(active.id)
  }

  function handleDragEnd({ active, over }) {
    setActiveId(null)
    if (!over || active.id === over.id) return

    // Encontra a coluna destino
    const destColumn = columns.find(col =>
      col.items.some(i => i.id === over.id) ||
      col.option.id === over.id   // drop direto na coluna
    )
    if (!destColumn || !groupProp) return

    const newValue = destColumn.option.id  // null = "sem grupo"

    // Atualiza o item com o novo valor da prop de grupo
    const patch = {
      properties: {
        ...items.find(i => i.id === active.id)?.properties,
        [groupProp.id]: {
          type:  groupProp.type,
          value: newValue,
        },
      },
    }
    onUpdateItem?.(active.id, patch)
  }

  const activeItem = activeId ? items.find(i => i.id === activeId) : null

  // ── Sem prop de agrupamento ───────────────────────────────────

  if (!groupProp) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm font-serif" style={{ color: T.textoSuave }}>
          Adicione uma propriedade do tipo <strong style={{ color: T.ouro }}>Seleção</strong> ou <strong style={{ color: T.ouro }}>Status</strong> para usar o Board.
        </p>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 p-4 overflow-x-auto h-full items-start">
        {columns.map(({ option, items: colItems }) => (
          <BoardColumn
            key={option.id ?? '__none__'}
            option={option}
            items={colItems}
            schema={schema}
            view={view}
            groupPropId={groupProp.id}
            onItemClick={onItemClick}
            onAddItem={onAddItem}
            getItemColor={getItemColor}
          />
        ))}
      </div>

      {/* Overlay do item sendo arrastado */}
      <DragOverlay>
        {activeItem && (
          <div className="rotate-2 opacity-90 shadow-2xl">
            <ItemCard
              item={activeItem}
              schema={schema}
              view={view}
              groupPropId={groupProp.id}
              onItemClick={() => {}}
              getItemColor={getItemColor}
              isDragging={false}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
