/**
 * TemplateManager.jsx — Fase 4
 *
 * UI para criar, editar, excluir e aplicar templates de database.
 * Um template define:
 *   - Valores padrão de propriedades
 *   - Blocos de conteúdo pré-preenchidos
 *
 * Props:
 *   templates  — array de { id, name, icon, defaultProperties, blocks }
 *   schema     — schema do database
 *   onChange   — (newTemplates) => void — salva na schema.templates
 *   onApply    — (template) => void — cria novo item com os valores do template
 */

import { useState } from 'react'
import { Plus, Trash2, Edit3, Copy, BookTemplate, X, Check } from 'lucide-react'
import { PROPERTY_TYPES } from '../../lib/constants.js'

const TEMPLATE_ICONS = ['📝','📖','🎭','🗺️','📅','🔖','⭐','🧪','🏷️','📌','🎯','🖊️']

// ─── Componente principal ─────────────────────────────────────────

export default function TemplateManager({ templates = [], schema, onChange, onApply }) {
  const [editing, setEditing] = useState(null)   // template sendo editado
  const [creating, setCreating] = useState(false)

  function addTemplate() {
    setCreating(true)
    setEditing({
      id: crypto.randomUUID(),
      name: 'Novo template',
      icon: '📝',
      defaultProperties: {},
      blocks: [],
    })
  }

  function saveTemplate(tpl) {
    const exists = templates.find(t => t.id === tpl.id)
    if (exists) {
      onChange(templates.map(t => t.id === tpl.id ? tpl : t))
    } else {
      onChange([...templates, tpl])
    }
    setEditing(null)
    setCreating(false)
  }

  function deleteTemplate(id) {
    onChange(templates.filter(t => t.id !== id))
  }

  function duplicateTemplate(tpl) {
    const copy = { ...tpl, id: crypto.randomUUID(), name: `${tpl.name} (cópia)` }
    onChange([...templates, copy])
  }

  if (editing) {
    return (
      <TemplateEditor
        template={editing}
        schema={schema}
        onSave={saveTemplate}
        onCancel={() => { setEditing(null); setCreating(false) }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide" style={{ color: '#6B4C3B' }}>
          TEMPLATES
        </span>
        <button
          onClick={addTemplate}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: '#C9A84C' }}>
          <Plus size={12} />
          Novo template
        </button>
      </div>

      {templates.length === 0 && (
        <div className="text-center py-8 flex flex-col items-center gap-2"
             style={{ color: '#5C3D1E' }}>
          <span className="text-2xl">📝</span>
          <p className="text-xs">Nenhum template ainda.</p>
          <p className="text-xs">Templates criam itens com valores pré-preenchidos.</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {templates.map(tpl => (
          <TemplateCard
            key={tpl.id}
            template={tpl}
            schema={schema}
            onEdit={() => setEditing(tpl)}
            onDelete={() => deleteTemplate(tpl.id)}
            onDuplicate={() => duplicateTemplate(tpl)}
            onApply={() => onApply?.(tpl)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── TemplateCard ─────────────────────────────────────────────────

function TemplateCard({ template, schema, onEdit, onDelete, onDuplicate, onApply }) {
  const propsCount = Object.keys(template.defaultProperties ?? {}).length
  const blocksCount = (template.blocks ?? []).length

  return (
    <div className="rounded-lg border p-3 flex items-start gap-3"
         style={{ borderColor: '#5C3D1E', background: 'rgba(92,61,30,0.15)' }}>
      <span className="text-xl flex-shrink-0">{template.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-serif text-sm" style={{ color: '#F5EDD6' }}>{template.name}</div>
        <div className="text-xs mt-0.5" style={{ color: '#6B4C3B' }}>
          {propsCount > 0 && `${propsCount} valor${propsCount > 1 ? 'es' : ''} padrão`}
          {propsCount > 0 && blocksCount > 0 && ' · '}
          {blocksCount > 0 && `${blocksCount} bloco${blocksCount > 1 ? 's' : ''}`}
          {propsCount === 0 && blocksCount === 0 && 'Template vazio'}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={onApply}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors hover:bg-white/10"
                style={{ borderColor: '#C9A84C', color: '#C9A84C' }}>
          Usar
        </button>
        <button onClick={onEdit} className="p-1 rounded hover:bg-white/10" style={{ color: '#6B4C3B' }}>
          <Edit3 size={13} />
        </button>
        <button onClick={onDuplicate} className="p-1 rounded hover:bg-white/10" style={{ color: '#6B4C3B' }}>
          <Copy size={13} />
        </button>
        <button onClick={onDelete} className="p-1 rounded hover:bg-white/10" style={{ color: '#6B4C3B' }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── TemplateEditor ───────────────────────────────────────────────

function TemplateEditor({ template, schema, onSave, onCancel }) {
  const [draft, setDraft] = useState({ ...template })

  function setProp(key, value) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  function setDefaultProp(propId, value) {
    setDraft(d => ({
      ...d,
      defaultProperties: {
        ...d.defaultProperties,
        [propId]: value,
      },
    }))
  }

  function clearDefaultProp(propId) {
    setDraft(d => {
      const { [propId]: _, ...rest } = d.defaultProperties ?? {}
      return { ...d, defaultProperties: rest }
    })
  }

  // Só mostrar propriedades editáveis (excluir auto-calculadas)
  const editableProps = schema.properties.filter(p =>
    ![
      PROPERTY_TYPES.CREATED_TIME, PROPERTY_TYPES.EDITED_TIME,
      PROPERTY_TYPES.CREATED_BY,   PROPERTY_TYPES.EDITED_BY,
      PROPERTY_TYPES.UNIQUE_ID,    PROPERTY_TYPES.FORMULA,
      PROPERTY_TYPES.ROLLUP,
    ].includes(p.type)
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={onCancel} className="p-1 rounded hover:bg-white/10" style={{ color: '#6B4C3B' }}>
          <X size={16} />
        </button>
        <span className="font-serif text-sm" style={{ color: '#F5EDD6' }}>
          {template.id === draft.id && !template.name.startsWith('Novo') ? 'Editar template' : 'Novo template'}
        </span>
      </div>

      {/* Nome e ícone */}
      <div className="flex gap-2">
        {/* Ícone picker simples */}
        <div className="relative">
          <select
            value={draft.icon}
            onChange={e => setProp('icon', e.target.value)}
            className="appearance-none text-xl bg-transparent border rounded px-2 py-1 outline-none cursor-pointer"
            style={{ borderColor: '#5C3D1E', color: '#F5EDD6', width: 56 }}>
            {TEMPLATE_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
          </select>
        </div>

        <input
          value={draft.name}
          onChange={e => setProp('name', e.target.value)}
          placeholder="Nome do template"
          className="flex-1 text-sm font-serif bg-transparent border rounded px-3 py-1.5 outline-none"
          style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }}
        />
      </div>

      {/* Valores padrão das propriedades */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold" style={{ color: '#6B4C3B' }}>
          VALORES PADRÃO
        </span>
        {editableProps.map(prop => {
          const currentDefault = draft.defaultProperties?.[prop.id]
          return (
            <TemplatePropertyRow
              key={prop.id}
              prop={prop}
              value={currentDefault?.value ?? null}
              active={!!currentDefault}
              onActivate={() => setDefaultProp(prop.id, { type: prop.type, value: getDefaultValue(prop) })}
              onChange={v => setDefaultProp(prop.id, { type: prop.type, value: v })}
              onClear={() => clearDefaultProp(prop.id)}
            />
          )
        })}
        {editableProps.length === 0 && (
          <p className="text-xs" style={{ color: '#5C3D1E' }}>Nenhuma propriedade editável.</p>
        )}
      </div>

      {/* Botão salvar */}
      <button
        onClick={() => onSave(draft)}
        className="flex items-center justify-center gap-2 py-2 rounded font-serif text-sm transition-colors"
        style={{ background: '#8B4513', color: '#F5EDD6' }}>
        <Check size={14} />
        Salvar template
      </button>
    </div>
  )
}

// ─── TemplatePropertyRow ──────────────────────────────────────────

function TemplatePropertyRow({ prop, value, active, onActivate, onChange, onClear }) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b" style={{ borderColor: 'rgba(92,61,30,0.3)' }}>
      <span className="text-sm w-28 truncate flex-shrink-0" style={{ color: '#F5EDD6' }}>{prop.name}</span>

      {!active ? (
        <button onClick={onActivate}
                className="text-xs px-2 py-0.5 rounded border transition-colors hover:bg-white/10"
                style={{ borderColor: '#5C3D1E', color: '#6B4C3B' }}>
          + Definir padrão
        </button>
      ) : (
        <>
          <div className="flex-1">
            <TemplateValueInput prop={prop} value={value} onChange={onChange} />
          </div>
          <button onClick={onClear} className="p-1 rounded hover:bg-white/10 flex-shrink-0" style={{ color: '#6B4C3B' }}>
            <X size={12} />
          </button>
        </>
      )}
    </div>
  )
}

// ─── TemplateValueInput ───────────────────────────────────────────

function TemplateValueInput({ prop, value, onChange }) {
  switch (prop.type) {
    case PROPERTY_TYPES.TITLE:
    case PROPERTY_TYPES.TEXT:
    case PROPERTY_TYPES.URL:
    case PROPERTY_TYPES.EMAIL:
    case PROPERTY_TYPES.PHONE:
      return (
        <input type="text" value={value ?? ''} onChange={e => onChange(e.target.value)}
               placeholder="Valor padrão"
               className="w-full text-xs bg-transparent border rounded px-2 py-1 outline-none"
               style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }} />
      )

    case PROPERTY_TYPES.NUMBER:
      return (
        <input type="number" value={value ?? ''} onChange={e => onChange(Number(e.target.value))}
               placeholder="0"
               className="w-full text-xs bg-transparent border rounded px-2 py-1 outline-none"
               style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }} />
      )

    case PROPERTY_TYPES.CHECKBOX:
      return (
        <input type="checkbox" checked={Boolean(value)}
               onChange={e => onChange(e.target.checked)}
               className="w-4 h-4 cursor-pointer" />
      )

    case PROPERTY_TYPES.DATE:
      return (
        <input type="date" value={value ?? ''}
               onChange={e => onChange(e.target.value)}
               className="text-xs bg-transparent border rounded px-2 py-1 outline-none"
               style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }} />
      )

    case PROPERTY_TYPES.SELECT:
    case PROPERTY_TYPES.STATUS:
      return (
        <select value={value ?? ''} onChange={e => onChange(e.target.value)}
                className="text-xs bg-transparent border rounded px-2 py-1 outline-none"
                style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }}>
          <option value="">— nenhum —</option>
          {(prop.options ?? []).map(opt => (
            <option key={opt.id} value={opt.id}>{opt.name}</option>
          ))}
        </select>
      )

    case PROPERTY_TYPES.MULTISELECT:
      return (
        <div className="flex flex-wrap gap-1">
          {(prop.options ?? []).map(opt => {
            const selected = Array.isArray(value) && value.includes(opt.id)
            return (
              <button key={opt.id}
                      onClick={() => {
                        const cur = Array.isArray(value) ? value : []
                        onChange(selected ? cur.filter(id => id !== opt.id) : [...cur, opt.id])
                      }}
                      className="text-xs px-2 py-0.5 rounded border transition-colors"
                      style={{
                        borderColor: selected ? '#C9A84C' : '#5C3D1E',
                        background: selected ? 'rgba(201,168,76,0.2)' : 'transparent',
                        color: '#F5EDD6',
                      }}>
                {opt.name}
              </button>
            )
          })}
        </div>
      )

    default:
      return <span className="text-xs" style={{ color: '#5C3D1E' }}>Tipo não editável aqui</span>
  }
}

// ─── Helper ───────────────────────────────────────────────────────

function getDefaultValue(prop) {
  switch (prop.type) {
    case PROPERTY_TYPES.CHECKBOX: return false
    case PROPERTY_TYPES.NUMBER:   return 0
    case PROPERTY_TYPES.MULTISELECT: return []
    default: return ''
  }
}
