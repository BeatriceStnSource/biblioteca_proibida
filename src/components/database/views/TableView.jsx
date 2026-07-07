/**
 * TableView.jsx — View de tabela do database
 *
 * Funcionalidades:
 * - Células editáveis inline
 * - Mostrar/ocultar colunas
 * - Redimensionamento de colunas (arrastar borda)
 * - Linha de nova entrada no rodapé
 * - Cálculos de rodapé (contagem, soma, média, min, max)
 * - Agrupamento por propriedade
 */

import React, { useState, useRef, useCallback } from 'react'
import { useDatabaseContext as useDatabase } from '../../../contexts/DatabaseContext.jsx'
import { PROPERTY_TYPES } from '../../../lib/constants.js'
import { calcFooter } from '../../../lib/database.js'
import PropertyCell from '../PropertyCell.jsx'

const DEFAULT_COL_WIDTH = 180
const TITLE_COL_WIDTH = 240

// ─── Redimensionador de coluna ────────────────────────────────────

function ColResizer({ propId, widths, setWidths }) {
  const startX = useRef(0)
  const startW = useRef(0)

  function onMouseDown(e) {
    e.preventDefault()
    startX.current = e.clientX
    startW.current = widths[propId] ?? DEFAULT_COL_WIDTH

    function onMove(e) {
      const delta = e.clientX - startX.current
      setWidths(w => ({ ...w, [propId]: Math.max(80, startW.current + delta) }))
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div
      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-ouro/50 z-10"
      onMouseDown={onMouseDown}
    />
  )
}

// ─── Cabeçalho de coluna ──────────────────────────────────────────

const PROP_TYPE_ICON = {
  title: '📝', text: '📄', url: '🔗', email: '✉️', phone: '📞',
  number: '#', select: '◉', multiselect: '◈', status: '◐',
  checkbox: '✓', date: '📅', created_time: '🕐', edited_time: '🕑',
}

function ColHeader({ prop, widths, setWidths, onDeleteProp }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const icon = PROP_TYPE_ICON[prop.type] ?? '—'

  return (
    <th
      ref={ref}
      className="relative border-r border-borda/30 px-3 py-2 text-left group select-none"
      style={{ width: widths[prop.id] ?? (prop.type === PROPERTY_TYPES.TITLE ? TITLE_COL_WIDTH : DEFAULT_COL_WIDTH), minWidth: 80 }}
    >
      <button
        className="flex items-center gap-1.5 text-xs font-sans text-texto-suave hover:text-card transition-colors w-full"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-[11px]">{icon}</span>
        <span className="truncate">{prop.name}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 min-w-[160px] bg-superficie border border-borda rounded-lg shadow-xl py-1">
          {prop.type !== PROPERTY_TYPES.TITLE && (
            <button
              className="w-full text-left px-3 py-2 text-xs text-vermelho-erro hover:bg-fundo/50 font-sans"
              onClick={() => { onDeleteProp(prop.id); setOpen(false) }}
            >
              🗑 Remover propriedade
            </button>
          )}
        </div>
      )}

      <ColResizer propId={prop.id} widths={widths} setWidths={setWidths} />
    </th>
  )
}

// ─── Célula de rodapé (cálculos) ─────────────────────────────────

const CALC_OPTIONS = [
  { value: '', label: 'Calcular...' },
  { value: 'count_all', label: 'Total de linhas' },
  { value: 'count', label: 'Preenchidas' },
  { value: 'count_empty', label: 'Vazias' },
  { value: 'count_unique', label: 'Únicas' },
]
const NUMERIC_CALC = [
  { value: 'sum', label: 'Soma' },
  { value: 'avg', label: 'Média' },
  { value: 'min', label: 'Mínimo' },
  { value: 'max', label: 'Máximo' },
]
const CHECKBOX_CALC = [
  { value: 'percent_checked', label: '% Marcados' },
]

function FooterCell({ prop, items }) {
  const [calc, setCalc] = useState('')

  const isNumeric = prop.type === PROPERTY_TYPES.NUMBER
  const isCheckbox = prop.type === PROPERTY_TYPES.CHECKBOX

  const opts = [
    ...CALC_OPTIONS,
    ...(isNumeric ? NUMERIC_CALC : []),
    ...(isCheckbox ? CHECKBOX_CALC : []),
  ]

  const result = calc ? calcFooter(items, prop.id, calc, prop) : null

  return (
    <td className="border-r border-borda/20 px-2 py-1">
      <select
        value={calc}
        onChange={e => setCalc(e.target.value)}
        className="w-full bg-transparent text-xs font-sans text-texto-suave cursor-pointer outline-none"
      >
        {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {result !== null && (
        <div className="text-xs font-sans text-ouro font-medium mt-0.5">{result}</div>
      )}
    </td>
  )
}

// ─── Linha de item ────────────────────────────────────────────────

function ItemRow({ item, visibleProps, onUpdateProp, onDelete }) {
  const [hovered, setHovered] = useState(false)

  return (
    <tr
      className="border-b border-borda/20 hover:bg-superficie/20 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {visibleProps.map((prop, i) => (
        <td key={prop.id} className="border-r border-borda/20 px-1 py-1 relative">
          {i === 0 && hovered && (
            <button
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 text-texto-suave/50 hover:text-vermelho-erro text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onDelete(item._fileId)}
              title="Remover item"
            >
              ✕
            </button>
          )}
          <PropertyCell
            item={item}
            prop={prop}
            onSave={(propId, propType, val) => onUpdateProp(item._fileId, propId, propType, val)}
          />
        </td>
      ))}
      <td className="w-8" />
    </tr>
  )
}

// ─── AddPropertyMenu ─────────────────────────────────────────────

const ADDABLE_TYPES = [
  { type: 'text', label: 'Texto', icon: '📄' },
  { type: 'number', label: 'Número', icon: '#' },
  { type: 'select', label: 'Seleção', icon: '◉' },
  { type: 'multiselect', label: 'Multi-seleção', icon: '◈' },
  { type: 'status', label: 'Status', icon: '◐' },
  { type: 'checkbox', label: 'Checkbox', icon: '✓' },
  { type: 'date', label: 'Data', icon: '📅' },
  { type: 'url', label: 'URL', icon: '🔗' },
  { type: 'email', label: 'Email', icon: '✉️' },
  { type: 'phone', label: 'Telefone', icon: '📞' },
  { type: 'created_time', label: 'Criado em', icon: '🕐' },
  { type: 'edited_time', label: 'Editado em', icon: '🕑' },
]

function AddPropertyMenu({ onAdd }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [step, setStep] = useState('type') // 'type' | 'name'
  const [chosenType, setChosenType] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    function close(e) { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); reset() } }
    if (open) document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  function reset() { setStep('type'); setName(''); setChosenType(null) }

  function handlePickType(type) {
    setChosenType(type)
    setName('')
    setStep('name')
  }

  async function handleConfirm() {
    if (!name.trim()) return
    await onAdd(name.trim(), chosenType)
    setOpen(false)
    reset()
  }

  return (
    <th ref={ref} className="relative px-2 py-2 border-r border-borda/20">
      <button
        className="text-xs font-sans text-texto-suave hover:text-card transition-colors"
        onClick={() => setOpen(o => !o)}
        title="Adicionar propriedade"
      >
        + Campo
      </button>

      {open && step === 'type' && (
        <div className="absolute top-full left-0 z-50 mt-1 w-48 bg-superficie border border-borda rounded-lg shadow-xl py-1 max-h-72 overflow-y-auto">
          <p className="px-3 py-1.5 text-[11px] font-sans text-texto-suave uppercase tracking-wide">Tipo de campo</p>
          {ADDABLE_TYPES.map(t => (
            <button
              key={t.type}
              className="w-full text-left px-3 py-1.5 text-xs font-sans text-card hover:bg-fundo/50 flex items-center gap-2"
              onClick={() => handlePickType(t.type)}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      )}

      {open && step === 'name' && (
        <div className="absolute top-full left-0 z-50 mt-1 w-48 bg-superficie border border-borda rounded-lg shadow-xl p-3">
          <p className="text-[11px] font-sans text-texto-suave mb-2">Nome do campo</p>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') { setOpen(false); reset() } }}
            className="w-full bg-fundo border border-borda rounded px-2 py-1 text-sm font-sans text-card outline-none focus:border-ouro"
            placeholder="Nome do campo..."
          />
          <div className="flex gap-2 mt-2">
            <button onClick={handleConfirm} className="flex-1 btn-primario text-xs py-1">Criar</button>
            <button onClick={() => setStep('type')} className="flex-1 btn-secundario text-xs py-1">Voltar</button>
          </div>
        </div>
      )}
    </th>
  )
}

// ─── TableView principal ──────────────────────────────────────────

export default function TableView() {
  const {
    schema, processedItems, groups, activeView,
    updateItemProperty, removeItem, addItem, addProperty, deleteProperty,
  } = useDatabase()

  const [colWidths, setColWidths] = useState({})

  const visibleProps = schema.properties.filter(
    p => !(activeView?.hiddenProperties ?? []).includes(p.id)
  )

  const isGrouped = !!activeView?.groupBy

  async function handleNewItem(initialProps = {}) {
    await addItem(initialProps)
  }

  function renderRows(items) {
    return items.map(item => (
      <ItemRow
        key={item.id}
        item={item}
        visibleProps={visibleProps}
        onUpdateProp={updateItemProperty}
        onDelete={removeItem}
      />
    ))
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-sans text-sm table-fixed">
        <thead>
          <tr className="border-b border-borda/40 bg-superficie/50">
            {visibleProps.map(prop => (
              <ColHeader
                key={prop.id}
                prop={prop}
                widths={colWidths}
                setWidths={setColWidths}
                onDeleteProp={deleteProperty}
              />
            ))}
            <AddPropertyMenu onAdd={addProperty} />
          </tr>
        </thead>

        <tbody>
          {isGrouped ? (
            groups.map(group => (
              <React.Fragment key={group.key}>
                {/* Cabeçalho do grupo */}
                <tr className="bg-fundo/60">
                  <td colSpan={visibleProps.length + 1} className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {group.color && (
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: (TAG_COLORS[group.color] ?? TAG_COLORS.default).bg }}
                        />
                      )}
                      <span className="font-serif text-card text-sm font-medium">{group.label}</span>
                      <span className="text-xs font-sans text-texto-suave">({group.items.length})</span>
                    </div>
                  </td>
                </tr>
                {renderRows(group.items)}
                {/* Nova entrada no grupo */}
                <tr className="border-b border-borda/10">
                  <td colSpan={visibleProps.length + 1} className="px-3 py-1.5">
                    <button
                      className="text-xs font-sans text-texto-suave hover:text-card transition-colors"
                      onClick={() => {
                        const groupProp = schema.properties.find(p => p.id === activeView.groupBy)
                        const initialProps = {}
                        if (groupProp && group.key !== '__empty__') {
                          initialProps[groupProp.id] = { type: groupProp.type, value: group.key }
                        }
                        handleNewItem(initialProps)
                      }}
                    >
                      + Nova entrada
                    </button>
                  </td>
                </tr>
              </React.Fragment>
            ))
          ) : (
            <>
              {renderRows(processedItems)}
            </>
          )}

          {/* Linha de nova entrada (modo sem agrupamento) */}
          {!isGrouped && (
            <tr className="border-b border-borda/10">
              <td colSpan={visibleProps.length + 1} className="px-3 py-2">
                <button
                  className="text-xs font-sans text-texto-suave hover:text-card transition-colors"
                  onClick={() => handleNewItem()}
                >
                  + Nova entrada
                </button>
              </td>
            </tr>
          )}
        </tbody>

        {/* Rodapé com cálculos */}
        {!isGrouped && (
          <tfoot>
            <tr className="border-t border-borda/30 bg-superficie/30">
              {visibleProps.map(prop => (
                <FooterCell key={prop.id} prop={prop} items={processedItems} />
              ))}
              <td />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
