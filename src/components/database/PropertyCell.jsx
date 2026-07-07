/**
 * PropertyCell.jsx — Atualizado na Fase 4
 *
 * Renderiza (e permite editar) o valor de uma propriedade de database.
 *
 * Novidades em relação à Fase 3:
 *  - Tipos: relation, rollup, formula, unique_id, file, image, place, person,
 *           created_by, edited_by
 *  - Passa relatedData para RelationCell
 *  - Valores computados (formula/rollup) via computedValue prop
 *
 * Props:
 *   prop          — definição da propriedade (type, options, etc.)
 *   value         — valor atual da célula
 *   computedValue — valor calculado (para formula / rollup)
 *   relatedData   — { [dbId]: { schema, items } }
 *   onChange      — (newValue) => void
 *   readOnly      — bool
 *   compact       — bool (menos espaço, sem borda)
 */

import { useState, useRef } from 'react'
import {
  Check, ExternalLink, Mail, Phone, Upload, MapPin, User,
} from 'lucide-react'
import { PROPERTY_TYPES, TAG_COLORS } from '../../lib/constants.js'
import {
  RelationCell, RollupCell, FormulaCell, UniqueIdCell,
} from './AdvancedPropertyEditors.jsx'

// ─── PropertyCell ─────────────────────────────────────────────────

export default function PropertyCell({
  prop,
  value,
  computedValue,
  relatedData = {},
  onChange,
  readOnly = false,
  compact = false,
}) {
  // Tipos somente leitura — computados ou automáticos
  const isReadOnly = readOnly
    || [
      PROPERTY_TYPES.FORMULA, PROPERTY_TYPES.ROLLUP,
      PROPERTY_TYPES.CREATED_TIME, PROPERTY_TYPES.EDITED_TIME,
      PROPERTY_TYPES.CREATED_BY, PROPERTY_TYPES.EDITED_BY,
      PROPERTY_TYPES.UNIQUE_ID,
    ].includes(prop.type)

  // Busca dados do database relacionado para RelationCell
  const relInfo = prop.type === PROPERTY_TYPES.RELATION && prop.targetDatabaseId
    ? relatedData[prop.targetDatabaseId] ?? {}
    : {}

  return (
    <div className={compact ? '' : 'w-full'}>
      <CellByType
        prop={prop}
        value={value}
        computedValue={computedValue}
        relatedItems={relInfo.items}
        relatedSchema={relInfo.schema}
        onChange={isReadOnly ? undefined : onChange}
        readOnly={isReadOnly}
        compact={compact}
      />
    </div>
  )
}

// ─── Dispatch por tipo ────────────────────────────────────────────

function CellByType({ prop, value, computedValue, relatedItems, relatedSchema, onChange, readOnly, compact }) {
  switch (prop.type) {

    // ── Texto ─────────────────────────────────────────────────

    case PROPERTY_TYPES.TITLE:
    case PROPERTY_TYPES.TEXT:
      return (
        <TextCell
          value={value ?? ''}
          onChange={onChange}
          readOnly={readOnly}
          compact={compact}
          isTitle={prop.type === PROPERTY_TYPES.TITLE}
        />
      )

    case PROPERTY_TYPES.URL:
      return <UrlCell value={value ?? ''} onChange={onChange} readOnly={readOnly} />

    case PROPERTY_TYPES.EMAIL:
      return (
        <IconTextCell
          value={value ?? ''} onChange={onChange} readOnly={readOnly}
          icon={<Mail size={11} />} type="email" placeholder="nome@email.com"
        />
      )

    case PROPERTY_TYPES.PHONE:
      return (
        <IconTextCell
          value={value ?? ''} onChange={onChange} readOnly={readOnly}
          icon={<Phone size={11} />} type="tel" placeholder="+55 11 99999-0000"
        />
      )

    // ── Número ────────────────────────────────────────────────

    case PROPERTY_TYPES.NUMBER:
      return <NumberCell value={value} prop={prop} onChange={onChange} readOnly={readOnly} />

    // ── Seleção ───────────────────────────────────────────────

    case PROPERTY_TYPES.SELECT:
    case PROPERTY_TYPES.STATUS:
      return (
        <SelectCell
          value={value} options={prop.options ?? []}
          onChange={onChange} readOnly={readOnly}
        />
      )

    case PROPERTY_TYPES.MULTISELECT:
      return (
        <MultiSelectCell
          value={value} options={prop.options ?? []}
          onChange={onChange} readOnly={readOnly}
        />
      )

    case PROPERTY_TYPES.CHECKBOX:
      return <CheckboxCell value={value} onChange={onChange} readOnly={readOnly} />

    // ── Data ──────────────────────────────────────────────────

    case PROPERTY_TYPES.DATE:
      return <DateCell value={value} onChange={onChange} readOnly={readOnly} />

    case PROPERTY_TYPES.CREATED_TIME:
    case PROPERTY_TYPES.EDITED_TIME:
      return <ReadonlyDateCell value={value} />

    // ── Pessoa ────────────────────────────────────────────────

    case PROPERTY_TYPES.PERSON:
    case PROPERTY_TYPES.CREATED_BY:
    case PROPERTY_TYPES.EDITED_BY:
      return <PersonCell value={value} readOnly={readOnly} />

    // ── Arquivo / imagem ──────────────────────────────────────

    case PROPERTY_TYPES.FILE:
    case PROPERTY_TYPES.IMAGE:
      return (
        <FileCell
          value={value} prop={prop}
          onChange={onChange} readOnly={readOnly}
        />
      )

    // ── Local ─────────────────────────────────────────────────

    case PROPERTY_TYPES.PLACE:
      return (
        <IconTextCell
          value={value ?? ''} onChange={onChange} readOnly={readOnly}
          icon={<MapPin size={11} />} type="text" placeholder="Endereço ou coordenadas"
        />
      )

    // ── Relação (Fase 4) ──────────────────────────────────────

    case PROPERTY_TYPES.RELATION:
      return (
        <RelationCell
          value={value} prop={prop}
          relatedItems={relatedItems}
          relatedSchema={relatedSchema}
          onChange={onChange}
          readOnly={readOnly}
        />
      )

    // ── Rollup (Fase 4) — somente leitura ─────────────────────

    case PROPERTY_TYPES.ROLLUP:
      return <RollupCell value={computedValue} />

    // ── Fórmula (Fase 4) — somente leitura ───────────────────

    case PROPERTY_TYPES.FORMULA:
      return <FormulaCell value={computedValue} />

    // ── ID único (Fase 4) — somente leitura ──────────────────

    case PROPERTY_TYPES.UNIQUE_ID:
      return <UniqueIdCell value={value} />

    default:
      return <span className="text-xs" style={{ color: '#5C3D1E' }}>{String(value ?? '')}</span>
  }
}

// ═══════════════════════════════════════════════════════════════════
// Células individuais
// ═══════════════════════════════════════════════════════════════════

// ─── TextCell ─────────────────────────────────────────────────────

function TextCell({ value, onChange, readOnly, compact, isTitle }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(value)
  const inputRef              = useRef(null)

  if (readOnly || !editing) {
    return (
      <div
        onClick={() => { if (!readOnly) { setDraft(value); setEditing(true) } }}
        className={`min-h-[24px] ${!readOnly ? 'cursor-text hover:bg-white/5' : ''} rounded px-1 py-0.5 transition-colors`}
        style={{ color: '#F5EDD6', fontSize: isTitle ? 14 : 13 }}>
        {value || (readOnly ? '' : <span style={{ color: '#5C3D1E' }}>—</span>)}
      </div>
    )
  }

  return (
    <input
      ref={inputRef}
      autoFocus
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { onChange?.(draft); setEditing(false) }}
      onKeyDown={e => {
        if (e.key === 'Enter') { onChange?.(draft); setEditing(false) }
        if (e.key === 'Escape') { setEditing(false) }
      }}
      className="w-full bg-transparent outline-none px-1 py-0.5 rounded"
      style={{
        color: '#F5EDD6', fontSize: isTitle ? 14 : 13,
        border: '1px solid #5C3D1E',
      }}
    />
  )
}

// ─── NumberCell ───────────────────────────────────────────────────

function NumberCell({ value, prop, onChange, readOnly }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(value ?? '')

  function formatDisplay(v) {
    if (v == null || v === '') return ''
    const n = Number(v)
    if (isNaN(n)) return String(v)
    switch (prop.format) {
      case 'currency': return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      case 'percent':  return n.toLocaleString('pt-BR') + '%'
      case 'scientific': return n.toExponential(2)
      default: return n.toLocaleString('pt-BR')
    }
  }

  if (readOnly || !editing) {
    return (
      <div
        onClick={() => { if (!readOnly) { setDraft(value ?? ''); setEditing(true) } }}
        className={`min-h-[24px] px-1 py-0.5 rounded text-right text-sm ${!readOnly ? 'cursor-text hover:bg-white/5' : ''} transition-colors`}
        style={{ color: '#F5EDD6', fontVariantNumeric: 'tabular-nums' }}>
        {formatDisplay(value) || <span style={{ color: '#5C3D1E' }}>—</span>}
      </div>
    )
  }

  return (
    <input
      type="number" autoFocus value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { onChange?.(draft === '' ? null : Number(draft)); setEditing(false) }}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === 'Escape') { onChange?.(Number(draft)); setEditing(false) }
      }}
      className="w-full bg-transparent outline-none px-1 py-0.5 rounded text-right text-sm"
      style={{ color: '#F5EDD6', border: '1px solid #5C3D1E' }}
    />
  )
}

// ─── SelectCell ───────────────────────────────────────────────────

function SelectCell({ value, options, onChange, readOnly }) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.id === value)
  const colors   = selected ? (TAG_COLORS[selected.color] ?? TAG_COLORS.default) : null

  if (readOnly) {
    return selected
      ? <Tag name={selected.name} color={selected.color} />
      : <span style={{ color: '#5C3D1E', fontSize: 12 }}>—</span>
  }

  return (
    <div className="relative">
      <div onClick={() => setOpen(o => !o)}
           className="flex items-center gap-1 cursor-pointer min-h-[24px] px-1 py-0.5 rounded hover:bg-white/5 transition-colors">
        {selected
          ? <Tag name={selected.name} color={selected.color} />
          : <span style={{ color: '#5C3D1E', fontSize: 12 }}>—</span>}
      </div>
      {open && (
        <OptionDropdown
          options={options}
          selected={[value].filter(Boolean)}
          multi={false}
          onToggle={id => { onChange(id === value ? null : id); setOpen(false) }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}

// ─── MultiSelectCell ──────────────────────────────────────────────

function MultiSelectCell({ value, options, onChange, readOnly }) {
  const [open, setOpen] = useState(false)
  const selected = Array.isArray(value) ? value : []

  if (readOnly) {
    return (
      <div className="flex flex-wrap gap-1">
        {selected.map(id => {
          const opt = options.find(o => o.id === id)
          return opt ? <Tag key={id} name={opt.name} color={opt.color} /> : null
        })}
        {selected.length === 0 && <span style={{ color: '#5C3D1E', fontSize: 12 }}>—</span>}
      </div>
    )
  }

  function toggle(id) {
    const next = selected.includes(id)
      ? selected.filter(i => i !== id)
      : [...selected, id]
    onChange(next)
  }

  return (
    <div className="relative">
      <div onClick={() => setOpen(o => !o)}
           className="flex flex-wrap gap-1 cursor-pointer min-h-[24px] px-1 py-0.5 rounded hover:bg-white/5 transition-colors">
        {selected.map(id => {
          const opt = options.find(o => o.id === id)
          return opt ? <Tag key={id} name={opt.name} color={opt.color} /> : null
        })}
        {selected.length === 0 && <span style={{ color: '#5C3D1E', fontSize: 12 }}>—</span>}
      </div>
      {open && (
        <OptionDropdown
          options={options} selected={selected} multi={true}
          onToggle={toggle} onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}

// ─── CheckboxCell ─────────────────────────────────────────────────

function CheckboxCell({ value, onChange, readOnly }) {
  return (
    <div className="flex justify-center items-center">
      <button
        disabled={readOnly}
        onClick={() => onChange?.(!value)}
        className="w-4 h-4 rounded border flex items-center justify-center transition-all"
        style={{
          borderColor: value ? '#C9A84C' : '#5C3D1E',
          background: value ? '#C9A84C' : 'transparent',
          cursor: readOnly ? 'default' : 'pointer',
        }}>
        {value && <Check size={10} style={{ color: '#1C1610' }} />}
      </button>
    </div>
  )
}

// ─── DateCell ─────────────────────────────────────────────────────

function DateCell({ value, onChange, readOnly }) {
  const [editing, setEditing] = useState(false)

  const display = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : null

  if (readOnly || !editing) {
    return (
      <div
        onClick={() => !readOnly && setEditing(true)}
        className={`min-h-[24px] px-1 py-0.5 rounded text-sm ${!readOnly ? 'cursor-pointer hover:bg-white/5' : ''} transition-colors`}
        style={{ color: '#F5EDD6' }}>
        {display ?? <span style={{ color: '#5C3D1E' }}>—</span>}
      </div>
    )
  }

  return (
    <input
      type="date" autoFocus value={value ?? ''}
      onChange={e => onChange?.(e.target.value)}
      onBlur={() => setEditing(false)}
      className="bg-transparent outline-none px-1 py-0.5 rounded text-sm"
      style={{ color: '#F5EDD6', border: '1px solid #5C3D1E' }}
    />
  )
}

// ─── ReadonlyDateCell ─────────────────────────────────────────────

function ReadonlyDateCell({ value }) {
  if (!value) return <span style={{ color: '#5C3D1E', fontSize: 12 }}>—</span>
  return (
    <span className="text-xs" style={{ color: '#6B4C3B' }}>
      {new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
    </span>
  )
}

// ─── UrlCell ─────────────────────────────────────────────────────

function UrlCell({ value, onChange, readOnly }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(value)

  if (readOnly || !editing) {
    return (
      <div className="flex items-center gap-1">
        {value
          ? <a href={value} target="_blank" rel="noopener noreferrer"
               onClick={e => e.stopPropagation()}
               className="text-xs truncate underline flex items-center gap-1 hover:opacity-80"
               style={{ color: '#87c8ef' }}>
              <ExternalLink size={10} /> {value}
            </a>
          : <span onClick={() => !readOnly && setEditing(true)}
                  className={`text-xs cursor-text min-h-[24px] block`}
                  style={{ color: '#5C3D1E' }}>—</span>
        }
        {!readOnly && value && (
          <button onClick={() => { setDraft(value); setEditing(true) }}
                  className="text-xs opacity-0 hover:opacity-100 underline"
                  style={{ color: '#6B4C3B' }}>editar</button>
        )}
      </div>
    )
  }

  return (
    <input autoFocus type="url" value={draft}
           onChange={e => setDraft(e.target.value)}
           onBlur={() => { onChange?.(draft); setEditing(false) }}
           onKeyDown={e => { if (e.key === 'Enter') { onChange?.(draft); setEditing(false) } }}
           placeholder="https://"
           className="w-full bg-transparent outline-none px-1 py-0.5 rounded text-xs"
           style={{ color: '#F5EDD6', border: '1px solid #5C3D1E' }}
    />
  )
}

// ─── IconTextCell (email, phone, place) ───────────────────────────

function IconTextCell({ value, onChange, readOnly, icon, type, placeholder }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(value)

  return editing && !readOnly ? (
    <input
      autoFocus type={type} value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { onChange?.(draft); setEditing(false) }}
      onKeyDown={e => { if (e.key === 'Enter') { onChange?.(draft); setEditing(false) } }}
      placeholder={placeholder}
      className="w-full bg-transparent outline-none px-1 py-0.5 rounded text-xs"
      style={{ color: '#F5EDD6', border: '1px solid #5C3D1E' }}
    />
  ) : (
    <div onClick={() => !readOnly && setEditing(true)}
         className={`flex items-center gap-1 text-xs min-h-[24px] px-1 py-0.5 rounded ${!readOnly ? 'cursor-text hover:bg-white/5' : ''}`}
         style={{ color: value ? '#F5EDD6' : '#5C3D1E' }}>
      <span style={{ color: '#6B4C3B' }}>{icon}</span>
      {value || '—'}
    </div>
  )
}

// ─── PersonCell ───────────────────────────────────────────────────

function PersonCell({ value, readOnly }) {
  if (!value) return <span style={{ color: '#5C3D1E', fontSize: 12 }}>—</span>
  return (
    <div className="flex items-center gap-1.5 text-xs" style={{ color: '#F5EDD6' }}>
      <User size={12} style={{ color: '#6B4C3B' }} />
      {typeof value === 'object' ? (value.name ?? value.email ?? 'Usuário') : String(value)}
    </div>
  )
}

// ─── FileCell ─────────────────────────────────────────────────────

function FileCell({ value, prop, onChange, readOnly }) {
  const inputRef = useRef(null)
  const isImage  = prop.type === PROPERTY_TYPES.IMAGE

  if (value) {
    const url   = typeof value === 'string' ? value : value.url
    const name  = typeof value === 'object' ? value.name : url?.split('/').pop()

    return (
      <div className="flex items-center gap-1.5">
        {isImage && url && (
          <img src={url} alt={name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
        )}
        <span className="text-xs truncate" style={{ color: '#F5EDD6' }}>{name ?? 'Arquivo'}</span>
        {!readOnly && (
          <button onClick={() => onChange?.(null)}
                  className="text-xs opacity-60 hover:opacity-100" style={{ color: '#6B4C3B' }}>✕</button>
        )}
      </div>
    )
  }

  if (readOnly) return <span style={{ color: '#5C3D1E', fontSize: 12 }}>—</span>

  return (
    <>
      <button onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded border hover:bg-white/10 transition-colors"
              style={{ borderColor: '#5C3D1E', color: '#6B4C3B' }}>
        <Upload size={11} />
        {isImage ? 'Escolher imagem' : 'Escolher arquivo'}
      </button>
      <input ref={inputRef} type="file"
             accept={isImage ? 'image/*' : undefined}
             className="hidden"
             onChange={e => {
               const file = e.target.files?.[0]
               if (!file) return
               // O upload real via Drive API é feito pelo DatabaseContext
               // Aqui apenas notificamos com o File object
               onChange?.(file)
             }}
      />
    </>
  )
}

// ─── Helpers visuais ─────────────────────────────────────────────

function Tag({ name, color }) {
  const colors = TAG_COLORS[color] ?? TAG_COLORS.default
  return (
    <span className="text-xs px-1.5 py-0.5 rounded-sm"
          style={{ background: colors.bg, color: colors.text }}>
      {name}
    </span>
  )
}

function OptionDropdown({ options, selected, multi, onToggle, onClose }) {
  return (
    <div className="absolute left-0 top-full mt-1 z-50 rounded-lg border shadow-xl overflow-hidden"
         style={{ background: '#2A1F14', borderColor: '#5C3D1E', minWidth: 180 }}>
      <div className="py-1 overflow-y-auto" style={{ maxHeight: 200 }}>
        {options.length === 0 && (
          <div className="px-3 py-3 text-xs text-center" style={{ color: '#5C3D1E' }}>
            Nenhuma opção
          </div>
        )}
        {options.map(opt => {
          const isSelected = selected.includes(opt.id)
          const colors = TAG_COLORS[opt.color] ?? TAG_COLORS.default
          return (
            <button key={opt.id}
                    onClick={() => onToggle(opt.id)}
                    className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-white/5 transition-colors">
              <span className="w-3 h-3 rounded-sm border flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: isSelected ? '#C9A84C' : '#5C3D1E', background: isSelected ? '#C9A84C' : 'transparent' }}>
                {isSelected && <Check size={8} style={{ color: '#1C1610' }} />}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded-sm"
                    style={{ background: colors.bg, color: colors.text }}>
                {opt.name}
              </span>
            </button>
          )
        })}
      </div>
      <div className="border-t px-2 py-1.5" style={{ borderColor: '#5C3D1E' }}>
        <button onClick={onClose} className="w-full text-xs text-center py-0.5 rounded hover:bg-white/5"
                style={{ color: '#6B4C3B' }}>Fechar</button>
      </div>
    </div>
  )
}
