/**
 * ConditionalColorEditor.jsx — Fase 4
 *
 * Painel para configurar regras de coloração condicional de uma view.
 * Cada regra define: propriedade + operador + valor → cor de fundo da linha/card.
 *
 * Integração: renderizado dentro do DatabaseToolbar → modal de configuração de view.
 *
 * Props:
 *   rules     — array de regras do view.conditionalColors
 *   schema    — schema do database
 *   onChange  — (newRules) => void
 */

import { useState } from 'react'
import { Plus, Trash2, ChevronDown } from 'lucide-react'
import {
  PROPERTY_TYPES,
  CONDITIONAL_ROW_COLORS,
  TAG_COLORS,
} from '../../lib/constants.js'

// ─── Operadores por tipo de propriedade ──────────────────────────

const OPERATORS_BY_TYPE = {
  [PROPERTY_TYPES.TITLE]:    [
    { v: 'contains', l: 'contém' }, { v: 'not_contains', l: 'não contém' },
    { v: 'is', l: 'é' }, { v: 'is_empty', l: 'está vazio' }, { v: 'is_not_empty', l: 'não está vazio' },
  ],
  [PROPERTY_TYPES.TEXT]:     [
    { v: 'contains', l: 'contém' }, { v: 'not_contains', l: 'não contém' },
    { v: 'is', l: 'é' }, { v: 'is_empty', l: 'está vazio' }, { v: 'is_not_empty', l: 'não está vazio' },
  ],
  [PROPERTY_TYPES.NUMBER]:   [
    { v: 'eq', l: '=' }, { v: 'neq', l: '≠' },
    { v: 'gt', l: '>' }, { v: 'lt', l: '<' }, { v: 'gte', l: '≥' }, { v: 'lte', l: '≤' },
    { v: 'is_empty', l: 'está vazio' }, { v: 'is_not_empty', l: 'não está vazio' },
  ],
  [PROPERTY_TYPES.SELECT]:   [
    { v: 'is', l: 'é' }, { v: 'is_not', l: 'não é' },
    { v: 'is_empty', l: 'está vazio' }, { v: 'is_not_empty', l: 'não está vazio' },
  ],
  [PROPERTY_TYPES.STATUS]:   [
    { v: 'is', l: 'é' }, { v: 'is_not', l: 'não é' },
    { v: 'is_empty', l: 'está vazio' }, { v: 'is_not_empty', l: 'não está vazio' },
  ],
  [PROPERTY_TYPES.CHECKBOX]: [
    { v: 'is_checked', l: 'está marcado' }, { v: 'is_not_checked', l: 'não está marcado' },
  ],
  [PROPERTY_TYPES.DATE]:     [
    { v: 'is_empty', l: 'está vazio' }, { v: 'is_not_empty', l: 'não está vazio' },
    { v: 'is_today', l: 'é hoje' }, { v: 'is_past', l: 'está no passado' }, { v: 'is_future', l: 'está no futuro' },
    { v: 'before', l: 'é antes de' }, { v: 'after', l: 'é depois de' },
  ],
  [PROPERTY_TYPES.FORMULA]:  [
    { v: 'is', l: 'é' }, { v: 'contains', l: 'contém' },
    { v: 'is_empty', l: 'está vazio' }, { v: 'is_not_empty', l: 'não está vazio' },
  ],
}

const VALUE_LESS_OPERATORS = new Set([
  'is_empty', 'is_not_empty', 'is_checked', 'is_not_checked',
  'is_today', 'is_past', 'is_future',
])

// ─── Componente principal ─────────────────────────────────────────

export default function ConditionalColorEditor({ rules = [], schema, onChange }) {

  function addRule() {
    const firstProp = schema.properties.find(p => p.type !== PROPERTY_TYPES.TITLE && OPERATORS_BY_TYPE[p.type])
                    ?? schema.properties[0]
    const operators = firstProp ? (OPERATORS_BY_TYPE[firstProp.type] ?? []) : []

    onChange([
      ...rules,
      {
        id:         crypto.randomUUID(),
        propertyId: firstProp?.id ?? null,
        operator:   operators[0]?.v ?? 'is',
        value:      '',
        colorId:    CONDITIONAL_ROW_COLORS[0].id,
        useFormula: false,
        formula:    '',
      },
    ])
  }

  function updateRule(id, patch) {
    onChange(rules.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  function removeRule(id) {
    onChange(rules.filter(r => r.id !== id))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide" style={{ color: '#6B4C3B' }}>
          COLORAÇÃO CONDICIONAL
        </span>
        <button
          onClick={addRule}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors hover:bg-white/10"
          style={{ color: '#C9A84C' }}>
          <Plus size={12} />
          Adicionar regra
        </button>
      </div>

      {rules.length === 0 && (
        <p className="text-xs text-center py-4" style={{ color: '#5C3D1E' }}>
          Nenhuma regra. Clique em "Adicionar regra" para colorir linhas automaticamente.
        </p>
      )}

      {rules.map(rule => (
        <RuleRow
          key={rule.id}
          rule={rule}
          schema={schema}
          onUpdate={patch => updateRule(rule.id, patch)}
          onRemove={() => removeRule(rule.id)}
        />
      ))}
    </div>
  )
}

// ─── RuleRow ──────────────────────────────────────────────────────

function RuleRow({ rule, schema, onUpdate, onRemove }) {
  const prop     = schema.properties.find(p => p.id === rule.propertyId)
  const operators = prop ? (OPERATORS_BY_TYPE[prop.type] ?? []) : []
  const needsValue = !VALUE_LESS_OPERATORS.has(rule.operator)

  // Quando a propriedade muda, resetar operador e valor
  function handlePropChange(propId) {
    const newProp = schema.properties.find(p => p.id === propId)
    const ops = newProp ? (OPERATORS_BY_TYPE[newProp.type] ?? []) : []
    onUpdate({ propertyId: propId, operator: ops[0]?.v ?? 'is', value: '' })
  }

  const colorDef = CONDITIONAL_ROW_COLORS.find(c => c.id === rule.colorId) ?? CONDITIONAL_ROW_COLORS[0]

  return (
    <div className="rounded-lg border p-3 flex flex-col gap-2"
         style={{ borderColor: '#5C3D1E', background: 'rgba(92,61,30,0.15)' }}>

      {/* Linha 1: modo fórmula ou condição */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onUpdate({ useFormula: !rule.useFormula })}
          className="text-xs px-2 py-0.5 rounded border transition-colors"
          style={{
            borderColor: '#5C3D1E',
            background: rule.useFormula ? '#8B4513' : 'transparent',
            color: rule.useFormula ? '#F5EDD6' : '#6B4C3B',
          }}>
          Fórmula
        </button>
        <div className="flex-1" />
        {/* Seletor de cor */}
        <ColorPicker colorId={rule.colorId} onChange={c => onUpdate({ colorId: c })} />
        <button onClick={onRemove} className="p-1 rounded hover:bg-white/10 transition-colors" style={{ color: '#6B4C3B' }}>
          <Trash2 size={13} />
        </button>
      </div>

      {/* Linha 2: condição */}
      {rule.useFormula ? (
        <input
          value={rule.formula}
          onChange={e => onUpdate({ formula: e.target.value })}
          placeholder='ex: prop("Lido?") == true'
          className="w-full text-xs rounded px-2 py-1.5 font-mono bg-transparent border outline-none"
          style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }}
        />
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          {/* Propriedade */}
          <select
            value={rule.propertyId ?? ''}
            onChange={e => handlePropChange(e.target.value)}
            className="text-xs bg-transparent border rounded px-2 py-1 outline-none"
            style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }}>
            {schema.properties
              .filter(p => OPERATORS_BY_TYPE[p.type])
              .map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {/* Operador */}
          <select
            value={rule.operator}
            onChange={e => onUpdate({ operator: e.target.value, value: '' })}
            className="text-xs bg-transparent border rounded px-2 py-1 outline-none"
            style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }}>
            {operators.map(op => <option key={op.v} value={op.v}>{op.l}</option>)}
          </select>

          {/* Valor */}
          {needsValue && (
            <ValueInput prop={prop} value={rule.value} onChange={v => onUpdate({ value: v })} />
          )}
        </div>
      )}

      {/* Preview da cor */}
      <div className="text-xs px-2 py-1 rounded"
           style={{ background: colorDef.bg, border: `1px solid ${colorDef.border}`, color: '#F5EDD6' }}>
        Prévia da cor — {colorDef.label}
      </div>
    </div>
  )
}

// ─── ValueInput ───────────────────────────────────────────────────

function ValueInput({ prop, value, onChange }) {
  if (!prop) return null

  if (prop.type === PROPERTY_TYPES.SELECT || prop.type === PROPERTY_TYPES.STATUS) {
    return (
      <select value={value ?? ''} onChange={e => onChange(e.target.value)}
              className="text-xs bg-transparent border rounded px-2 py-1 outline-none"
              style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }}>
        <option value="">— selecione —</option>
        {(prop.options ?? []).map(opt => (
          <option key={opt.id} value={opt.id}>{opt.name}</option>
        ))}
      </select>
    )
  }

  if (prop.type === PROPERTY_TYPES.DATE) {
    return (
      <input type="date" value={value ?? ''} onChange={e => onChange(e.target.value)}
             className="text-xs bg-transparent border rounded px-2 py-1 outline-none"
             style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }} />
    )
  }

  if (prop.type === PROPERTY_TYPES.NUMBER) {
    return (
      <input type="number" value={value ?? ''} onChange={e => onChange(e.target.value)}
             placeholder="0"
             className="text-xs bg-transparent border rounded px-2 py-1 outline-none w-24"
             style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }} />
    )
  }

  return (
    <input type="text" value={value ?? ''} onChange={e => onChange(e.target.value)}
           placeholder="valor"
           className="text-xs bg-transparent border rounded px-2 py-1 outline-none"
           style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }} />
  )
}

// ─── ColorPicker ─────────────────────────────────────────────────

function ColorPicker({ colorId, onChange }) {
  const [open, setOpen] = useState(false)
  const current = CONDITIONAL_ROW_COLORS.find(c => c.id === colorId) ?? CONDITIONAL_ROW_COLORS[0]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2 py-1 rounded border text-xs transition-colors"
        style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }}>
        <span className="w-3 h-3 rounded-sm inline-block flex-shrink-0"
              style={{ background: current.bg, border: `1px solid ${current.border}` }} />
        {current.label}
        <ChevronDown size={10} />
      </button>

      {open && (
        <div className="absolute right-0 top-7 z-50 rounded-lg border shadow-xl p-2 grid grid-cols-3 gap-1"
             style={{ background: '#2A1F14', borderColor: '#5C3D1E', minWidth: 160 }}>
          {CONDITIONAL_ROW_COLORS.map(c => (
            <button
              key={c.id}
              onClick={() => { onChange(c.id); setOpen(false) }}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors hover:bg-white/10"
              style={{ color: '#F5EDD6' }}>
              <span className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ background: c.bg, border: `1px solid ${c.border}` }} />
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
