/**
 * CalendarView.jsx — Fase 4
 *
 * Visualização de database em calendário mensal ou semanal.
 * Requer ao menos uma propriedade `date` no schema.
 *
 * Features:
 *  - Navegar meses/semanas com setas
 *  - Itens renderizados no dia correto
 *  - Clicar num dia vazio cria novo item com aquela data
 *  - Clicar num item abre edição
 *  - Arrastar item para outro dia atualiza a data (via onUpdateItem)
 *  - Coloração condicional por item
 */

import { useState, useMemo, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react'
import { PROPERTY_TYPES } from '../../../lib/constants.js'
import { evaluateConditionalColor } from '../../../lib/formula.js'
import { getItemTitle } from '../../../lib/database.js'

// ─── Helpers de calendário ────────────────────────────────────────

function startOfWeek(date) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  )
}

function formatISO(date) {
  return date.toISOString().slice(0, 10)
}

function getDaysInMonth(year, month) {
  // Retorna array com todos os dias da grade (pode incluir dias de meses adjacentes)
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const start    = startOfWeek(firstDay)
  const end      = addDays(startOfWeek(lastDay), 6)

  const days = []
  let cur = new Date(start)
  while (cur <= end) {
    days.push(new Date(cur))
    cur = addDays(cur, 1)
  }
  return days
}

function getWeekDays(anchorDate) {
  const start = startOfWeek(anchorDate)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

// ─── Componente principal ─────────────────────────────────────────

export default function CalendarView({
  items,
  schema,
  view,
  onItemClick,
  onAddItem,
  onUpdateItem,
}) {
  const [mode, setMode] = useState('month')       // 'month' | 'week'
  const [anchor, setAnchor] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [draggingId, setDraggingId] = useState(null)
  const [dragOverDay, setDragOverDay] = useState(null)

  // ─── Propriedade de data do schema ───────────────────────────

  const dateProp = useMemo(() =>
    schema.properties.find(p => p.type === PROPERTY_TYPES.DATE),
  [schema.properties])

  // Caso não haja propriedade date
  if (!dateProp) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4"
           style={{ color: '#6B4C3B' }}>
        <Calendar size={40} style={{ opacity: 0.4 }} />
        <p className="font-serif text-lg">
          Este database não tem uma propriedade do tipo <strong>Data</strong>.
        </p>
        <p className="text-sm opacity-60">
          Adicione uma propriedade Data para usar a view de Calendário.
        </p>
      </div>
    )
  }

  // ─── Grade de dias ────────────────────────────────────────────

  const days = useMemo(() => {
    if (mode === 'month') {
      return getDaysInMonth(anchor.getFullYear(), anchor.getMonth())
    }
    return getWeekDays(anchor)
  }, [mode, anchor])

  // ─── Mapa: "YYYY-MM-DD" → itens ──────────────────────────────

  const itemsByDay = useMemo(() => {
    const map = {}
    items.forEach(item => {
      const raw = item.properties?.[dateProp.id]?.value
      if (!raw) return
      const key = String(raw).slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(item)
    })
    return map
  }, [items, dateProp])

  // ─── Navegação ────────────────────────────────────────────────

  function navigate(dir) {
    setAnchor(prev => {
      if (mode === 'month') {
        return new Date(prev.getFullYear(), prev.getMonth() + dir, 1)
      } else {
        return addDays(prev, dir * 7)
      }
    })
  }

  function goToday() {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    setAnchor(d)
  }

  // ─── Drag & drop ─────────────────────────────────────────────

  function handleDragStart(e, item) {
    setDraggingId(item.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, day) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDay(formatISO(day))
  }

  function handleDrop(e, day) {
    e.preventDefault()
    if (!draggingId) return
    const item = items.find(i => i.id === draggingId)
    if (!item) return

    const newDateStr = formatISO(day)
    const current   = item.properties?.[dateProp.id]?.value
    if (current?.slice(0, 10) === newDateStr) return

    onUpdateItem?.({
      ...item,
      properties: {
        ...item.properties,
        [dateProp.id]: { type: PROPERTY_TYPES.DATE, value: newDateStr },
      },
    })

    setDraggingId(null)
    setDragOverDay(null)
  }

  function handleDragEnd() {
    setDraggingId(null)
    setDragOverDay(null)
  }

  // ─── Título da navegação ──────────────────────────────────────

  const navTitle = mode === 'month'
    ? `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`
    : (() => {
        const start = startOfWeek(anchor)
        const end   = addDays(start, 6)
        if (start.getMonth() === end.getMonth()) {
          return `${start.getDate()}–${end.getDate()} de ${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`
        }
        return `${start.getDate()} ${MONTH_NAMES[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`
      })()

  // ─── Render ───────────────────────────────────────────────────

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const currentMonthIdx = anchor.getMonth()

  return (
    <div className="flex flex-col h-full" style={{ background: '#1C1610' }}>

      {/* Toolbar do calendário */}
      <div className="flex items-center gap-3 px-4 py-3 border-b"
           style={{ borderColor: '#5C3D1E' }}>

        {/* Navegação */}
        <button onClick={() => navigate(-1)}
                className="p-1.5 rounded hover:bg-white/10 transition-colors"
                style={{ color: '#C9A84C' }}>
          <ChevronLeft size={16} />
        </button>

        <button onClick={goToday}
                className="px-3 py-1 rounded text-sm font-serif transition-colors hover:bg-white/10"
                style={{ color: '#F5EDD6', border: '1px solid #5C3D1E' }}>
          Hoje
        </button>

        <button onClick={() => navigate(1)}
                className="p-1.5 rounded hover:bg-white/10 transition-colors"
                style={{ color: '#C9A84C' }}>
          <ChevronRight size={16} />
        </button>

        <span className="font-serif text-base font-semibold" style={{ color: '#F5EDD6' }}>
          {navTitle}
        </span>

        {/* Espaçador */}
        <div className="flex-1" />

        {/* Modo */}
        <div className="flex rounded overflow-hidden border" style={{ borderColor: '#5C3D1E' }}>
          {['month', 'week'].map(m => (
            <button key={m}
                    onClick={() => setMode(m)}
                    className="px-3 py-1 text-sm transition-colors"
                    style={{
                      background: mode === m ? '#8B4513' : 'transparent',
                      color: mode === m ? '#F5EDD6' : '#6B4C3B',
                    }}>
              {m === 'month' ? 'Mês' : 'Semana'}
            </button>
          ))}
        </div>
      </div>

      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-7 border-b" style={{ borderColor: '#5C3D1E' }}>
        {WEEKDAY_LABELS.map(label => (
          <div key={label}
               className="py-2 text-center text-xs font-semibold tracking-wide"
               style={{ color: '#6B4C3B' }}>
            {label}
          </div>
        ))}
      </div>

      {/* Grade */}
      <div className={`flex-1 overflow-y-auto grid grid-cols-7 ${mode === 'week' ? '' : 'auto-rows-fr'}`}
           style={{ minHeight: 0 }}>
        {days.map((day, idx) => {
          const key        = formatISO(day)
          const dayItems   = itemsByDay[key] ?? []
          const isToday    = isSameDay(day, today)
          const isCurrentM = day.getMonth() === currentMonthIdx
          const isDragOver = dragOverDay === key

          return (
            <DayCell
              key={key}
              day={day}
              dayItems={dayItems}
              schema={schema}
              view={view}
              isToday={isToday}
              isCurrentMonth={isCurrentM}
              isDragOver={isDragOver}
              draggingId={draggingId}
              mode={mode}
              onAddItem={onAddItem}
              onItemClick={onItemClick}
              onDragStart={handleDragStart}
              onDragOver={e => handleDragOver(e, day)}
              onDrop={e => handleDrop(e, day)}
              onDragEnd={handleDragEnd}
            />
          )
        })}
      </div>
    </div>
  )
}

// ─── DayCell ──────────────────────────────────────────────────────

function DayCell({
  day, dayItems, schema, view, isToday, isCurrentMonth, isDragOver,
  draggingId, mode,
  onAddItem, onItemClick, onDragStart, onDragOver, onDrop, onDragEnd,
}) {
  const [hovered, setHovered] = useState(false)

  const cellBg = isDragOver ? 'rgba(139,69,19,0.25)' : 'transparent'

  return (
    <div
      className="border-r border-b relative"
      style={{
        borderColor: '#5C3D1E',
        background: cellBg,
        minHeight: mode === 'week' ? 160 : 100,
        transition: 'background 0.1s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Número do dia */}
      <div className="flex items-center justify-between px-2 pt-1.5 pb-1">
        <span
          className="text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full"
          style={{
            background: isToday ? '#C9A84C' : 'transparent',
            color: isToday ? '#1C1610' : isCurrentMonth ? '#F5EDD6' : '#5C3D1E',
          }}>
          {day.getDate()}
        </span>

        {/* Botão de adicionar no hover */}
        {hovered && (
          <button
            onClick={() => onAddItem?.({ datePropId: schema.properties.find(p => p.type === PROPERTY_TYPES.DATE)?.id, dateValue: formatISO(day) })}
            className="p-0.5 rounded hover:bg-white/10 transition-colors"
            style={{ color: '#C9A84C' }}>
            <Plus size={12} />
          </button>
        )}
      </div>

      {/* Itens do dia */}
      <div className="flex flex-col gap-0.5 px-1 pb-1">
        {dayItems.slice(0, mode === 'week' ? 20 : 3).map(item => (
          <CalendarItem
            key={item.id}
            item={item}
            schema={schema}
            view={view}
            isDragging={draggingId === item.id}
            onItemClick={onItemClick}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
        {mode === 'month' && dayItems.length > 3 && (
          <span className="text-xs px-1" style={{ color: '#6B4C3B' }}>
            +{dayItems.length - 3} mais
          </span>
        )}
      </div>
    </div>
  )
}

// ─── CalendarItem ─────────────────────────────────────────────────

function CalendarItem({ item, schema, view, isDragging, onItemClick, onDragStart, onDragEnd }) {
  const title = getItemTitle(item, schema.properties)

  // Coloração condicional
  const colorMatch = useMemo(() =>
    evaluateConditionalColor(item, view?.conditionalColors, schema),
  [item, view, schema])

  const titleProp = schema.properties.find(p => p.type === PROPERTY_TYPES.TITLE)
  const selectProps = schema.properties
    .filter(p => p.type === PROPERTY_TYPES.SELECT || p.type === PROPERTY_TYPES.STATUS)
    .slice(0, 1)

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, item)}
      onDragEnd={onDragEnd}
      onClick={() => onItemClick?.(item)}
      className="rounded px-1.5 py-0.5 text-xs font-serif truncate cursor-pointer select-none transition-all"
      style={{
        background: colorMatch ? colorMatch.bg : 'rgba(139,69,19,0.35)',
        color: '#F5EDD6',
        border: `1px solid ${colorMatch ? colorMatch.border : 'rgba(139,69,19,0.5)'}`,
        opacity: isDragging ? 0.4 : 1,
        maxWidth: '100%',
      }}>
      {title || 'Sem título'}
    </div>
  )
}
