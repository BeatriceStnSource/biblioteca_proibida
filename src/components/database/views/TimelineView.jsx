/**
 * TimelineView.jsx — Fase 4
 *
 * Visualização em linha do tempo (Gantt-like) para databases com datas.
 * Requer ao menos uma propriedade `date` no schema.
 *
 * Features:
 *  - Zoom: dia, semana, mês, trimestre, ano
 *  - Barras horizontais de duração (início → fim)
 *  - Scroll horizontal para navegar no tempo
 *  - Clicar numa barra abre o item
 *  - Coloração condicional
 *  - Agrupar por select/status
 */

import { useState, useMemo, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, AlignLeft } from 'lucide-react'
import { PROPERTY_TYPES } from '../../../lib/constants.js'
import { evaluateConditionalColor } from '../../../lib/formula.js'
import { getItemTitle, applyGrouping } from '../../../lib/database.js'

// ─── Zoom config ──────────────────────────────────────────────────

const ZOOM_LEVELS = [
  { key: 'day',     label: 'Dia',        colWidth: 40,  cols: 60,  headerFmt: 'd',    subFmt: 'weekday' },
  { key: 'week',    label: 'Semana',     colWidth: 28,  cols: 52,  headerFmt: 'week', subFmt: 'day' },
  { key: 'month',   label: 'Mês',        colWidth: 40,  cols: 24,  headerFmt: 'month', subFmt: null },
  { key: 'quarter', label: 'Trimestre',  colWidth: 80,  cols: 12,  headerFmt: 'quarter', subFmt: 'month' },
  { key: 'year',    label: 'Ano',        colWidth: 80,  cols: 5,   headerFmt: 'year', subFmt: 'quarter' },
]

function addDays(date, n)    { const d = new Date(date); d.setDate(d.getDate() + n); return d }
function addMonths(date, n)  { const d = new Date(date); d.setMonth(d.getMonth() + n); return d }
function addYears(date, n)   { const d = new Date(date); d.setFullYear(d.getFullYear() + n); return d }
function startOfWeek(date)   { const d = new Date(date); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d }
function startOfMonth(date)  { return new Date(date.getFullYear(), date.getMonth(), 1) }
function startOfYear(date)   { return new Date(date.getFullYear(), 0, 1) }
function diffDays(a, b)      { return Math.round((new Date(a) - new Date(b)) / 86400000) }

const MONTH_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const WEEKDAY_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

// ─── Gera colunas de acordo com o zoom ───────────────────────────

function generateColumns(zoom, anchorDate) {
  const { key, cols } = zoom
  const columns = []
  let cur = new Date(anchorDate)

  // Normaliza o ponto de partida
  if (key === 'day')     cur = addDays(cur, -Math.floor(cols / 2))
  if (key === 'week')    cur = startOfWeek(addDays(cur, -Math.floor(cols / 2) * 7))
  if (key === 'month')   cur = startOfMonth(addMonths(cur, -Math.floor(cols / 2)))
  if (key === 'quarter') cur = new Date(cur.getFullYear(), Math.floor(cur.getMonth() / 3) * 3 - Math.floor(cols / 2) * 3, 1)
  if (key === 'year')    cur = startOfYear(addYears(cur, -Math.floor(cols / 2)))

  for (let i = 0; i < cols; i++) {
    let label = ''
    let start = new Date(cur)
    let end

    if (key === 'day') {
      label = cur.getDate() === 1
        ? `${MONTH_SHORT[cur.getMonth()]} ${cur.getDate()}`
        : String(cur.getDate())
      end = addDays(cur, 1)
      cur = end
    } else if (key === 'week') {
      const ws = new Date(cur)
      end = addDays(cur, 7)
      label = `${ws.getDate()}/${MONTH_SHORT[ws.getMonth()]}`
      cur = end
    } else if (key === 'month') {
      label = MONTH_SHORT[cur.getMonth()]
      end = addMonths(cur, 1)
      cur = end
    } else if (key === 'quarter') {
      const q = Math.floor(cur.getMonth() / 3) + 1
      label = `Q${q} ${cur.getFullYear()}`
      end = addMonths(cur, 3)
      cur = end
    } else if (key === 'year') {
      label = String(cur.getFullYear())
      end = addYears(cur, 1)
      cur = end
    }

    columns.push({ label, start, end })
  }

  return columns
}

// ─── Calcula posição e largura de uma barra de item ───────────────

function calcBarGeometry(item, datePropId, endDatePropId, columns, colWidth) {
  if (!datePropId) return null

  const startStr = item.properties?.[datePropId]?.value
  if (!startStr) return null

  const startDate = new Date(startStr)
  const endStr    = endDatePropId ? item.properties?.[endDatePropId]?.value : null
  const endDate   = endStr ? new Date(endStr) : addDays(startDate, 1)

  const gridStart = columns[0].start
  const gridEnd   = columns[columns.length - 1].end
  const totalDays = diffDays(gridEnd, gridStart)
  const totalPx   = totalDays <= 0 ? 1 : columns.length * colWidth

  const leftDays  = diffDays(startDate, gridStart)
  const widthDays = Math.max(diffDays(endDate, startDate), 1)

  const left  = (leftDays  / totalDays) * totalPx
  const width = (widthDays / totalDays) * totalPx

  // Fora da grade → não renderizar
  if (left + width < 0 || left > totalPx) return null

  return { left: Math.max(left, 0), width: Math.max(width, colWidth / 2) }
}

// ─── Componente principal ─────────────────────────────────────────

export default function TimelineView({
  items,
  schema,
  view,
  onItemClick,
}) {
  const [zoomKey, setZoomKey]   = useState('month')
  const [anchor, setAnchor]     = useState(() => new Date())
  const [sidebarW]              = useState(220)
  const gridRef                 = useRef(null)

  const zoom    = ZOOM_LEVELS.find(z => z.key === zoomKey) ?? ZOOM_LEVELS[2]
  const columns = useMemo(() => generateColumns(zoom, anchor), [zoom, anchor])

  // Propriedades de data disponíveis
  const dateProps = schema.properties.filter(p => p.type === PROPERTY_TYPES.DATE)
  const [startPropId, setStartPropId] = useState(() => dateProps[0]?.id ?? null)
  const [endPropId, setEndPropId]     = useState(() => dateProps[1]?.id ?? null)

  if (dateProps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4"
           style={{ color: '#6B4C3B' }}>
        <AlignLeft size={40} style={{ opacity: 0.4 }} />
        <p className="font-serif text-lg">
          Nenhuma propriedade <strong>Data</strong> encontrada.
        </p>
        <p className="text-sm opacity-60">Adicione ao menos uma propriedade Data para usar a Timeline.</p>
      </div>
    )
  }

  // Agrupamento
  const groupPropId = view?.groupBy ?? null
  const groups = useMemo(
    () => applyGrouping(items, groupPropId, schema.properties),
    [items, groupPropId, schema.properties]
  )

  function navigate(dir) {
    setAnchor(prev => {
      if (zoomKey === 'day')     return addDays(prev, dir * 14)
      if (zoomKey === 'week')    return addDays(prev, dir * 7 * 6)
      if (zoomKey === 'month')   return addMonths(prev, dir * 6)
      if (zoomKey === 'quarter') return addMonths(prev, dir * 12)
      return addYears(prev, dir * 3)
    })
  }

  const totalGridW = columns.length * zoom.colWidth

  return (
    <div className="flex flex-col h-full" style={{ background: '#1C1610' }}>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b flex-shrink-0"
           style={{ borderColor: '#5C3D1E' }}>
        <button onClick={() => navigate(-1)} className="p-1 rounded hover:bg-white/10" style={{ color: '#C9A84C' }}>
          <ChevronLeft size={16} />
        </button>
        <button onClick={() => setAnchor(new Date())}
                className="px-2 py-0.5 rounded text-xs font-serif border hover:bg-white/10"
                style={{ color: '#F5EDD6', borderColor: '#5C3D1E' }}>
          Hoje
        </button>
        <button onClick={() => navigate(1)} className="p-1 rounded hover:bg-white/10" style={{ color: '#C9A84C' }}>
          <ChevronRight size={16} />
        </button>

        <div className="flex-1" />

        {/* Seleção de datas de início/fim */}
        {dateProps.length >= 2 && (
          <div className="flex items-center gap-2 text-xs" style={{ color: '#6B4C3B' }}>
            <span>Início:</span>
            <select value={startPropId ?? ''} onChange={e => setStartPropId(e.target.value)}
                    className="bg-transparent border rounded px-1 py-0.5"
                    style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }}>
              {dateProps.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <span>Fim:</span>
            <select value={endPropId ?? ''} onChange={e => setEndPropId(e.target.value || null)}
                    className="bg-transparent border rounded px-1 py-0.5"
                    style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }}>
              <option value="">—</option>
              {dateProps.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        {/* Zoom */}
        <div className="flex rounded overflow-hidden border" style={{ borderColor: '#5C3D1E' }}>
          {ZOOM_LEVELS.map(z => (
            <button key={z.key}
                    onClick={() => setZoomKey(z.key)}
                    className="px-2 py-1 text-xs transition-colors"
                    style={{
                      background: zoomKey === z.key ? '#8B4513' : 'transparent',
                      color: zoomKey === z.key ? '#F5EDD6' : '#6B4C3B',
                    }}>
              {z.label}
            </button>
          ))}
        </div>
      </div>

      {/* Layout: sidebar fixa + grade com scroll horizontal */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar — nomes dos itens */}
        <div className="flex flex-col flex-shrink-0 border-r"
             style={{ width: sidebarW, borderColor: '#5C3D1E', background: '#2A1F14' }}>
          {/* Cabeçalho sidebar */}
          <div className="h-10 border-b flex items-center px-3"
               style={{ borderColor: '#5C3D1E' }}>
            <span className="text-xs font-semibold" style={{ color: '#6B4C3B' }}>ITEM</span>
          </div>

          {/* Grupos e itens */}
          <div className="flex-1 overflow-y-auto">
            {groups.map(group => (
              <div key={group.key}>
                {groups.length > 1 && (
                  <div className="px-3 py-1.5 text-xs font-semibold border-b"
                       style={{ borderColor: '#5C3D1E', color: '#C9A84C', background: 'rgba(201,168,76,0.08)' }}>
                    {group.label} ({group.items.length})
                  </div>
                )}
                {group.items.map(item => (
                  <div key={item.id}
                       onClick={() => onItemClick?.(item)}
                       className="flex items-center px-3 py-1.5 border-b cursor-pointer hover:bg-white/5 transition-colors"
                       style={{ borderColor: '#5C3D1E', height: 36 }}>
                    <span className="text-sm font-serif truncate" style={{ color: '#F5EDD6' }}>
                      {getItemTitle(item, schema.properties)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Grade da timeline */}
        <div className="flex-1 overflow-auto" ref={gridRef}>
          <div style={{ minWidth: totalGridW }}>

            {/* Cabeçalho de colunas */}
            <div className="flex border-b sticky top-0 z-10" style={{ borderColor: '#5C3D1E', background: '#2A1F14', height: 40 }}>
              {columns.map((col, i) => {
                const isToday = new Date() >= col.start && new Date() < col.end
                return (
                  <div key={i}
                       className="border-r flex-shrink-0 flex items-end justify-start px-1 pb-1 text-xs"
                       style={{
                         width: zoom.colWidth,
                         borderColor: '#5C3D1E',
                         color: isToday ? '#C9A84C' : '#6B4C3B',
                         fontWeight: isToday ? 700 : 400,
                       }}>
                    {col.label}
                  </div>
                )
              })}
            </div>

            {/* Linhas por grupo/item */}
            {groups.map(group => (
              <div key={group.key}>
                {groups.length > 1 && (
                  <div className="relative border-b" style={{ borderColor: '#5C3D1E', height: 32, background: 'rgba(201,168,76,0.05)' }}>
                    <ColumnLines columns={columns} colWidth={zoom.colWidth} />
                  </div>
                )}
                {group.items.map(item => {
                  const geo = calcBarGeometry(item, startPropId, endPropId, columns, zoom.colWidth)
                  const colorMatch = evaluateConditionalColor(item, view?.conditionalColors, schema)
                  return (
                    <TimelineRow
                      key={item.id}
                      item={item}
                      schema={schema}
                      geo={geo}
                      colWidth={zoom.colWidth}
                      totalCols={columns.length}
                      colorMatch={colorMatch}
                      onItemClick={onItemClick}
                    />
                  )
                })}
              </div>
            ))}
          </div>

          {/* Indicador de hoje */}
          <TodayLine columns={columns} colWidth={zoom.colWidth} gridRef={gridRef} />
        </div>
      </div>
    </div>
  )
}

// ─── ColumnLines (grid vertical) ─────────────────────────────────

function ColumnLines({ columns, colWidth }) {
  return (
    <div className="absolute inset-0 flex pointer-events-none">
      {columns.map((col, i) => {
        const isToday = new Date() >= col.start && new Date() < col.end
        return (
          <div key={i}
               className="border-r flex-shrink-0"
               style={{
                 width: colWidth,
                 borderColor: isToday ? 'rgba(201,168,76,0.4)' : '#3a2a1a',
                 background: isToday ? 'rgba(201,168,76,0.04)' : 'transparent',
               }} />
        )
      })}
    </div>
  )
}

// ─── TimelineRow ──────────────────────────────────────────────────

function TimelineRow({ item, schema, geo, colWidth, totalCols, colorMatch, onItemClick }) {
  const title = getItemTitle(item, schema.properties)
  const totalW = totalCols * colWidth

  return (
    <div className="relative border-b" style={{ borderColor: '#5C3D1E', height: 36 }}>
      {/* Linhas de coluna */}
      <ColumnLines columns={Array.from({ length: totalCols })} colWidth={colWidth} />

      {/* Barra do item */}
      {geo && (
        <div
          onClick={() => onItemClick?.(item)}
          className="absolute top-1/2 -translate-y-1/2 rounded flex items-center px-2 cursor-pointer select-none overflow-hidden transition-all hover:brightness-110"
          style={{
            left: geo.left + 2,
            width: Math.max(geo.width - 4, 8),
            height: 24,
            background: colorMatch ? colorMatch.bg : 'rgba(139,69,19,0.6)',
            border: `1px solid ${colorMatch ? colorMatch.border : 'rgba(201,168,76,0.4)'}`,
          }}>
          <span className="text-xs font-serif truncate" style={{ color: '#F5EDD6' }}>
            {title}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── TodayLine ───────────────────────────────────────────────────

function TodayLine({ columns, colWidth }) {
  const now = new Date()
  const gridStart = columns[0]?.start
  const gridEnd   = columns[columns.length - 1]?.end
  if (!gridStart || !gridEnd) return null
  if (now < gridStart || now > gridEnd) return null

  const totalDays = Math.round((gridEnd - gridStart) / 86400000)
  const passedDays = Math.round((now - gridStart) / 86400000)
  const totalPx   = columns.length * colWidth
  const left      = (passedDays / totalDays) * totalPx

  return (
    <div className="absolute top-10 bottom-0 pointer-events-none"
         style={{ left, width: 2, background: 'rgba(201,168,76,0.8)', zIndex: 20 }} />
  )
}
