/**
 * DatabaseToolbar.jsx — Atualizado na Fase 4
 *
 * Barra de abas de views + botões de ação do database.
 *
 * Novidades Fase 4:
 *  - Tabs para Calendar e Timeline
 *  - Prop extraActions: slot JSX para botões adicionais (coloração, templates)
 *  - Modal de edição de schema de propriedades (relation, rollup, formula, unique_id)
 *  - Configuração de view (filtros, ordenação, agrupamento)
 *
 * Props:
 *   schema           — schema do database
 *   activeView       — view ativa
 *   views            — array de views
 *   onViewSelect     — (viewId) => void
 *   onAddView        — (name, type) => void
 *   onUpdateView     — (viewId, patch) => void
 *   onDeleteView     — (viewId) => void
 *   onAddProperty    — (name, type, extras) => void
 *   onUpdateProperty — (propId, patch) => void
 *   onDeleteProperty — (propId) => void
 *   onAddItem        — () => void
 *   extraActions     — JSX | null  (slot para botões da Fase 4)
 */

import { useState, useRef } from 'react'
import {
  Plus, Settings2, ChevronDown, Trash2, GripVertical,
  Table2, LayoutGrid, List, Columns, Calendar, AlignLeft,
  Filter, ArrowUpDown, Group, Eye, EyeOff, X, Check,
} from 'lucide-react'
import { VIEW_TYPES, PROPERTY_TYPES } from '../../lib/constants.js'
import {
  RelationPropConfig, RollupPropConfig, FormulaPropConfig, UniqueIdPropConfig,
} from './AdvancedPropertyEditors.jsx'

// ─── Ícones e rótulos por tipo de view ───────────────────────────

const VIEW_META = {
  [VIEW_TYPES.TABLE]:    { icon: <Table2 size={13} />,    label: 'Tabela' },
  [VIEW_TYPES.GALLERY]:  { icon: <LayoutGrid size={13} />, label: 'Galeria' },
  [VIEW_TYPES.LIST]:     { icon: <List size={13} />,       label: 'Lista' },
  [VIEW_TYPES.BOARD]:    { icon: <Columns size={13} />,    label: 'Quadro' },
  [VIEW_TYPES.CALENDAR]: { icon: <Calendar size={13} />,   label: 'Calendário' },
  [VIEW_TYPES.TIMELINE]: { icon: <AlignLeft size={13} />,  label: 'Timeline' },
}

// ─── Ícones por tipo de propriedade ──────────────────────────────

const PROP_TYPE_LABELS = {
  [PROPERTY_TYPES.TITLE]:        { icon: '🔤', label: 'Título' },
  [PROPERTY_TYPES.TEXT]:         { icon: '📝', label: 'Texto' },
  [PROPERTY_TYPES.NUMBER]:       { icon: '#',  label: 'Número' },
  [PROPERTY_TYPES.SELECT]:       { icon: '🔘', label: 'Seleção' },
  [PROPERTY_TYPES.MULTISELECT]:  { icon: '🏷️', label: 'Multi-seleção' },
  [PROPERTY_TYPES.STATUS]:       { icon: '📊', label: 'Status' },
  [PROPERTY_TYPES.CHECKBOX]:     { icon: '☑️', label: 'Checkbox' },
  [PROPERTY_TYPES.DATE]:         { icon: '📅', label: 'Data' },
  [PROPERTY_TYPES.URL]:          { icon: '🔗', label: 'URL' },
  [PROPERTY_TYPES.EMAIL]:        { icon: '✉️', label: 'Email' },
  [PROPERTY_TYPES.PHONE]:        { icon: '📞', label: 'Telefone' },
  [PROPERTY_TYPES.RELATION]:     { icon: '↗️', label: 'Relação' },
  [PROPERTY_TYPES.ROLLUP]:       { icon: '∑',  label: 'Rollup' },
  [PROPERTY_TYPES.FORMULA]:      { icon: 'ƒ',  label: 'Fórmula' },
  [PROPERTY_TYPES.UNIQUE_ID]:    { icon: '🆔', label: 'ID único' },
  [PROPERTY_TYPES.FILE]:         { icon: '📎', label: 'Arquivo' },
  [PROPERTY_TYPES.IMAGE]:        { icon: '🖼️', label: 'Imagem' },
  [PROPERTY_TYPES.PLACE]:        { icon: '📍', label: 'Local' },
  [PROPERTY_TYPES.PERSON]:       { icon: '👤', label: 'Pessoa' },
  [PROPERTY_TYPES.CREATED_TIME]: { icon: '⏱️', label: 'Data de criação' },
  [PROPERTY_TYPES.EDITED_TIME]:  { icon: '⏱️', label: 'Data de edição' },
  [PROPERTY_TYPES.CREATED_BY]:   { icon: '👤', label: 'Criado por' },
  [PROPERTY_TYPES.EDITED_BY]:    { icon: '👤', label: 'Editado por' },
}

// Tipos disponíveis para criar (excluindo os automáticos)
const CREATABLE_TYPES = [
  PROPERTY_TYPES.TEXT,  PROPERTY_TYPES.NUMBER,  PROPERTY_TYPES.SELECT,
  PROPERTY_TYPES.MULTISELECT, PROPERTY_TYPES.STATUS, PROPERTY_TYPES.CHECKBOX,
  PROPERTY_TYPES.DATE,  PROPERTY_TYPES.URL,  PROPERTY_TYPES.EMAIL,
  PROPERTY_TYPES.PHONE, PROPERTY_TYPES.RELATION, PROPERTY_TYPES.ROLLUP,
  PROPERTY_TYPES.FORMULA, PROPERTY_TYPES.UNIQUE_ID, PROPERTY_TYPES.FILE,
  PROPERTY_TYPES.IMAGE, PROPERTY_TYPES.PLACE,
]

// ─── DatabaseToolbar ──────────────────────────────────────────────

export default function DatabaseToolbar({
  schema,
  activeView,
  views,
  onViewSelect,
  onAddView,
  onUpdateView,
  onDeleteView,
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
  onAddItem,
  extraActions,
  availableDatabases = [],   // para RelationPropConfig
}) {
  const [showAddView,   setShowAddView]   = useState(false)
  const [showSchema,    setShowSchema]    = useState(false)   // modal de propriedades
  const [showViewCfg,   setShowViewCfg]  = useState(false)   // filtros/sort/group
  const [editingPropId, setEditingPropId] = useState(null)
  const [newViewType,   setNewViewType]  = useState(VIEW_TYPES.TABLE)
  const [newViewName,   setNewViewName]  = useState('')

  function handleAddView() {
    if (!newViewName.trim()) return
    onAddView(newViewName.trim(), newViewType)
    setNewViewName('')
    setShowAddView(false)
  }

  const sortedViews = [...views].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  return (
    <>
      {/* ── Linha principal ───────────────────────────────────── */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b overflow-x-auto flex-shrink-0"
           style={{ borderColor: '#5C3D1E', background: '#2A1F14' }}>

        {/* Tabs de view */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {sortedViews.map(view => {
            const meta = VIEW_META[view.type] ?? { icon: <Table2 size={13} />, label: view.name }
            const isActive = view.id === activeView?.id
            return (
              <button
                key={view.id}
                onClick={() => onViewSelect(view.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-all"
                style={{
                  background: isActive ? 'rgba(201,168,76,0.15)' : 'transparent',
                  color: isActive ? '#C9A84C' : '#6B4C3B',
                  borderBottom: isActive ? '2px solid #C9A84C' : '2px solid transparent',
                }}>
                {meta.icon}
                {view.name}
              </button>
            )
          })}
        </div>

        {/* Botão adicionar view */}
        <div className="relative">
          <button
            onClick={() => setShowAddView(o => !o)}
            className="flex items-center gap-1 px-2 py-1.5 rounded text-xs hover:bg-white/10 transition-colors"
            style={{ color: '#5C3D1E' }}>
            <Plus size={13} /> View
          </button>

          {showAddView && (
            <div className="absolute left-0 top-8 z-50 rounded-lg border shadow-xl p-3 flex flex-col gap-2"
                 style={{ background: '#2A1F14', borderColor: '#5C3D1E', minWidth: 220 }}>
              <span className="text-xs font-semibold" style={{ color: '#6B4C3B' }}>Tipo de view</span>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(VIEW_META).map(([type, meta]) => (
                  <button key={type}
                          onClick={() => setNewViewType(type)}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors"
                          style={{
                            background: newViewType === type ? 'rgba(201,168,76,0.2)' : 'transparent',
                            color: newViewType === type ? '#C9A84C' : '#6B4C3B',
                            border: newViewType === type ? '1px solid rgba(201,168,76,0.4)' : '1px solid transparent',
                          }}>
                    {meta.icon} {meta.label}
                  </button>
                ))}
              </div>
              <input
                value={newViewName}
                onChange={e => setNewViewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddView() }}
                placeholder={`Nome (ex: ${VIEW_META[newViewType]?.label ?? 'Nova view'})`}
                autoFocus
                className="text-xs bg-transparent border rounded px-2 py-1.5 outline-none"
                style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }}
              />
              <div className="flex gap-1">
                <button onClick={handleAddView}
                        className="flex-1 py-1.5 rounded text-xs font-serif transition-colors"
                        style={{ background: '#8B4513', color: '#F5EDD6' }}>
                  Criar
                </button>
                <button onClick={() => setShowAddView(false)}
                        className="px-3 py-1.5 rounded text-xs hover:bg-white/10 transition-colors"
                        style={{ color: '#6B4C3B' }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Separador */}
        <div className="flex-1" />

        {/* Extra actions (slot Fase 4: coloração, templates) */}
        {extraActions}

        {/* Filtros / ordenação / agrupamento */}
        <button
          onClick={() => setShowViewCfg(o => !o)}
          className="flex items-center gap-1 px-2 py-1.5 rounded text-xs hover:bg-white/10 transition-colors"
          style={{ color: showViewCfg ? '#C9A84C' : '#6B4C3B' }}>
          <Filter size={13} /> Filtrar
        </button>

        {/* Mostrar/ocultar propriedades */}
        <button
          onClick={() => setShowSchema(o => !o)}
          className="flex items-center gap-1 px-2 py-1.5 rounded text-xs hover:bg-white/10 transition-colors"
          style={{ color: showSchema ? '#C9A84C' : '#6B4C3B' }}>
          <Settings2 size={13} /> Schema
        </button>

        {/* Novo item */}
        <button
          onClick={onAddItem}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-serif transition-colors ml-1"
          style={{ background: '#8B4513', color: '#F5EDD6' }}>
          <Plus size={13} /> Novo item
        </button>
      </div>

      {/* ── Painel de filtros / sort / agrupamento ────────────── */}
      {showViewCfg && activeView && (
        <ViewConfigPanel
          view={activeView}
          schema={schema}
          onUpdateView={patch => onUpdateView(activeView.id, patch)}
          onClose={() => setShowViewCfg(false)}
        />
      )}

      {/* ── Painel de schema (propriedades) ──────────────────── */}
      {showSchema && (
        <SchemaPanel
          schema={schema}
          editingPropId={editingPropId}
          setEditingPropId={setEditingPropId}
          onAddProperty={onAddProperty}
          onUpdateProperty={onUpdateProperty}
          onDeleteProperty={onDeleteProperty}
          activeView={activeView}
          onUpdateView={patch => onUpdateView(activeView?.id, patch)}
          onClose={() => { setShowSchema(false); setEditingPropId(null) }}
          availableDatabases={availableDatabases}
        />
      )}
    </>
  )
}

// ─── ViewConfigPanel — filtros, ordenação, agrupamento ────────────

function ViewConfigPanel({ view, schema, onUpdateView, onClose }) {
  const [tab, setTab] = useState('filters')   // 'filters' | 'sorts' | 'group'

  const filterableProps = schema.properties.filter(p =>
    ![PROPERTY_TYPES.ROLLUP, PROPERTY_TYPES.FORMULA].includes(p.type)
  )
  const sortableProps  = schema.properties
  const groupableProps = schema.properties.filter(p =>
    [
      PROPERTY_TYPES.SELECT, PROPERTY_TYPES.MULTISELECT, PROPERTY_TYPES.STATUS,
      PROPERTY_TYPES.CHECKBOX, PROPERTY_TYPES.DATE, PROPERTY_TYPES.PERSON,
    ].includes(p.type)
  )

  // ─── Filtros ────────────────────────────────────────────────

  function addFilter() {
    const first = filterableProps[0]
    if (!first) return
    onUpdateView({
      filters: [...(view.filters ?? []), {
        id: crypto.randomUUID(),
        propertyId: first.id,
        operator: 'contains',
        value: '',
        conjunction: 'and',
      }],
    })
  }

  function updateFilter(id, patch) {
    onUpdateView({ filters: view.filters.map(f => f.id === id ? { ...f, ...patch } : f) })
  }

  function removeFilter(id) {
    onUpdateView({ filters: view.filters.filter(f => f.id !== id) })
  }

  // ─── Ordenação ──────────────────────────────────────────────

  function addSort() {
    const first = sortableProps[0]
    if (!first) return
    onUpdateView({
      sorts: [...(view.sorts ?? []), {
        id: crypto.randomUUID(),
        propertyId: first.id,
        direction: 'asc',
      }],
    })
  }

  function updateSort(id, patch) {
    onUpdateView({ sorts: view.sorts.map(s => s.id === id ? { ...s, ...patch } : s) })
  }

  function removeSort(id) {
    onUpdateView({ sorts: view.sorts.filter(s => s.id !== id) })
  }

  return (
    <div className="border-b px-4 py-3 flex flex-col gap-3"
         style={{ borderColor: '#5C3D1E', background: '#1C1610' }}>

      {/* Tabs internas */}
      <div className="flex items-center gap-1">
        {[
          { key: 'filters', icon: <Filter size={12} />, label: 'Filtros' },
          { key: 'sorts',   icon: <ArrowUpDown size={12} />, label: 'Ordenação' },
          { key: 'group',   icon: <Group size={12} />, label: 'Agrupar' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                  style={{
                    background: tab === t.key ? 'rgba(201,168,76,0.15)' : 'transparent',
                    color: tab === t.key ? '#C9A84C' : '#6B4C3B',
                  }}>
            {t.icon} {t.label}
            {t.key === 'filters' && (view.filters?.length ?? 0) > 0 &&
              <span className="ml-1 px-1 rounded text-xs" style={{ background: '#8B4513', color: '#F5EDD6' }}>
                {view.filters.length}
              </span>
            }
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={onClose} className="p-1 rounded hover:bg-white/10" style={{ color: '#6B4C3B' }}>
          <X size={14} />
        </button>
      </div>

      {/* Filtros */}
      {tab === 'filters' && (
        <div className="flex flex-col gap-2">
          {(view.filters ?? []).map((f, i) => (
            <div key={f.id} className="flex items-center gap-2">
              {i > 0 && (
                <select value={f.conjunction ?? 'and'}
                        onChange={e => updateFilter(f.id, { conjunction: e.target.value })}
                        className="text-xs bg-transparent border rounded px-1 py-0.5 outline-none"
                        style={{ borderColor: '#5C3D1E', color: '#C9A84C', width: 48 }}>
                  <option value="and">E</option>
                  <option value="or">OU</option>
                </select>
              )}
              <select value={f.propertyId}
                      onChange={e => updateFilter(f.id, { propertyId: e.target.value })}
                      className="text-xs bg-transparent border rounded px-2 py-1 outline-none"
                      style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }}>
                {filterableProps.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input value={f.value ?? ''} onChange={e => updateFilter(f.id, { value: e.target.value })}
                     placeholder="valor"
                     className="text-xs bg-transparent border rounded px-2 py-1 outline-none flex-1"
                     style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }} />
              <button onClick={() => removeFilter(f.id)} className="p-1 rounded hover:bg-white/10" style={{ color: '#6B4C3B' }}>
                <X size={12} />
              </button>
            </div>
          ))}
          <button onClick={addFilter}
                  className="flex items-center gap-1 text-xs hover:bg-white/10 px-2 py-1 rounded transition-colors self-start"
                  style={{ color: '#C9A84C' }}>
            <Plus size={12} /> Adicionar filtro
          </button>
        </div>
      )}

      {/* Ordenação */}
      {tab === 'sorts' && (
        <div className="flex flex-col gap-2">
          {(view.sorts ?? []).map(s => (
            <div key={s.id} className="flex items-center gap-2">
              <select value={s.propertyId}
                      onChange={e => updateSort(s.id, { propertyId: e.target.value })}
                      className="text-xs bg-transparent border rounded px-2 py-1 outline-none"
                      style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }}>
                {sortableProps.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={s.direction}
                      onChange={e => updateSort(s.id, { direction: e.target.value })}
                      className="text-xs bg-transparent border rounded px-2 py-1 outline-none"
                      style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }}>
                <option value="asc">A → Z</option>
                <option value="desc">Z → A</option>
              </select>
              <button onClick={() => removeSort(s.id)} className="p-1 rounded hover:bg-white/10" style={{ color: '#6B4C3B' }}>
                <X size={12} />
              </button>
            </div>
          ))}
          <button onClick={addSort}
                  className="flex items-center gap-1 text-xs hover:bg-white/10 px-2 py-1 rounded transition-colors self-start"
                  style={{ color: '#C9A84C' }}>
            <Plus size={12} /> Adicionar ordenação
          </button>
        </div>
      )}

      {/* Agrupamento */}
      {tab === 'group' && (
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#6B4C3B' }}>Agrupar por:</span>
          <select
            value={view.groupBy ?? ''}
            onChange={e => onUpdateView({ groupBy: e.target.value || null })}
            className="text-xs bg-transparent border rounded px-2 py-1 outline-none"
            style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }}>
            <option value="">— Nenhum —</option>
            {groupableProps.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}
    </div>
  )
}

// ─── SchemaPanel — lista e edita propriedades ─────────────────────

function SchemaPanel({
  schema, editingPropId, setEditingPropId,
  onAddProperty, onUpdateProperty, onDeleteProperty,
  activeView, onUpdateView,
  onClose, availableDatabases,
}) {
  const [showAddProp, setShowAddProp] = useState(false)
  const [newPropName, setNewPropName] = useState('')
  const [newPropType, setNewPropType] = useState(PROPERTY_TYPES.TEXT)

  function handleAdd() {
    if (!newPropName.trim()) return
    onAddProperty(newPropName.trim(), newPropType)
    setNewPropName('')
    setShowAddProp(false)
  }

  const editingProp = schema.properties.find(p => p.id === editingPropId)

  return (
    <div className="border-b px-4 py-3 flex flex-col gap-3"
         style={{ borderColor: '#5C3D1E', background: '#1C1610' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: '#6B4C3B' }}>PROPRIEDADES DO SCHEMA</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/10" style={{ color: '#6B4C3B' }}>
          <X size={14} />
        </button>
      </div>

      {/* Lista de propriedades */}
      <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
        {schema.properties.map(prop => {
          const meta    = PROP_TYPE_LABELS[prop.type] ?? { icon: '•', label: prop.type }
          const isTitle = prop.type === PROPERTY_TYPES.TITLE
          const hidden  = activeView?.hiddenProperties?.includes(prop.id)
          const isEditing = editingPropId === prop.id

          return (
            <div key={prop.id}>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 transition-colors">
                <span className="text-xs w-5 text-center flex-shrink-0">{meta.icon}</span>
                <span className="text-xs flex-1 truncate" style={{ color: '#F5EDD6' }}>{prop.name}</span>
                <span className="text-xs" style={{ color: '#5C3D1E' }}>{meta.label}</span>

                {/* Ocultar/mostrar na view */}
                {activeView && !isTitle && (
                  <button
                    onClick={() => {
                      const current = activeView.hiddenProperties ?? []
                      onUpdateView({
                        hiddenProperties: hidden
                          ? current.filter(id => id !== prop.id)
                          : [...current, prop.id],
                      })
                    }}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    style={{ color: hidden ? '#5C3D1E' : '#6B4C3B' }}
                    title={hidden ? 'Mostrar propriedade' : 'Ocultar propriedade'}>
                    {hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                )}

                {/* Editar */}
                {!isTitle && (
                  <button
                    onClick={() => setEditingPropId(isEditing ? null : prop.id)}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    style={{ color: isEditing ? '#C9A84C' : '#6B4C3B' }}>
                    <Settings2 size={12} />
                  </button>
                )}

                {/* Deletar */}
                {!isTitle && (
                  <button onClick={() => onDeleteProperty(prop.id)}
                          className="p-1 rounded hover:bg-white/10 transition-colors"
                          style={{ color: '#6B4C3B' }}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              {/* Painel de edição da prop (expandido inline) */}
              {isEditing && editingProp && (
                <PropEditPanel
                  prop={editingProp}
                  schema={schema}
                  availableDatabases={availableDatabases}
                  onChange={patch => onUpdateProperty(editingProp.id, patch)}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Adicionar propriedade */}
      {showAddProp ? (
        <div className="flex flex-col gap-2 border rounded p-2" style={{ borderColor: '#5C3D1E' }}>
          <input
            autoFocus value={newPropName} onChange={e => setNewPropName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            placeholder="Nome da propriedade"
            className="text-xs bg-transparent outline-none"
            style={{ color: '#F5EDD6' }}
          />
          <div className="grid grid-cols-3 gap-1 max-h-40 overflow-y-auto">
            {CREATABLE_TYPES.map(type => {
              const m = PROP_TYPE_LABELS[type] ?? { icon: '•', label: type }
              return (
                <button key={type} onClick={() => setNewPropType(type)}
                        className="flex items-center gap-1 px-1.5 py-1 rounded text-xs transition-colors"
                        style={{
                          background: newPropType === type ? 'rgba(201,168,76,0.2)' : 'transparent',
                          color: newPropType === type ? '#C9A84C' : '#6B4C3B',
                          border: newPropType === type ? '1px solid rgba(201,168,76,0.4)' : '1px solid transparent',
                        }}>
                  {m.icon} {m.label}
                </button>
              )
            })}
          </div>
          <div className="flex gap-1">
            <button onClick={handleAdd}
                    className="flex-1 py-1 rounded text-xs font-serif"
                    style={{ background: '#8B4513', color: '#F5EDD6' }}>
              Adicionar
            </button>
            <button onClick={() => setShowAddProp(false)}
                    className="px-3 py-1 rounded text-xs hover:bg-white/10"
                    style={{ color: '#6B4C3B' }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAddProp(true)}
                className="flex items-center gap-1 text-xs px-2 py-1.5 rounded hover:bg-white/10 transition-colors self-start"
                style={{ color: '#C9A84C' }}>
          <Plus size={12} /> Adicionar propriedade
        </button>
      )}
    </div>
  )
}

// ─── PropEditPanel — configurações avançadas de propriedade ───────

function PropEditPanel({ prop, schema, availableDatabases, onChange }) {
  const [name, setName] = useState(prop.name)

  return (
    <div className="ml-4 mb-2 rounded-lg border p-3 flex flex-col gap-2"
         style={{ borderColor: '#5C3D1E', background: 'rgba(92,61,30,0.1)' }}>
      {/* Renomear */}
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={() => { if (name.trim() && name !== prop.name) onChange({ name: name.trim() }) }}
          onKeyDown={e => { if (e.key === 'Enter') onChange({ name: name.trim() }) }}
          className="flex-1 text-xs bg-transparent border-b outline-none"
          style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }}
        />
      </div>

      {/* Configurações específicas por tipo (Fase 4) */}
      {prop.type === PROPERTY_TYPES.RELATION && (
        <RelationPropConfig
          prop={prop} availableDatabases={availableDatabases}
          onChange={onChange}
        />
      )}
      {prop.type === PROPERTY_TYPES.ROLLUP && (
        <RollupPropConfig
          prop={prop} schema={schema}
          availableDatabases={availableDatabases}
          onChange={onChange}
        />
      )}
      {prop.type === PROPERTY_TYPES.FORMULA && (
        <FormulaPropConfig prop={prop} schema={schema} onChange={onChange} />
      )}
      {prop.type === PROPERTY_TYPES.UNIQUE_ID && (
        <UniqueIdPropConfig prop={prop} onChange={onChange} />
      )}

      {/* Opções de select / multiselect */}
      {[PROPERTY_TYPES.SELECT, PROPERTY_TYPES.MULTISELECT, PROPERTY_TYPES.STATUS].includes(prop.type) && (
        <SelectOptionsEditor prop={prop} onChange={onChange} />
      )}

      {/* Formato de número */}
      {prop.type === PROPERTY_TYPES.NUMBER && (
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#6B4C3B' }}>Formato:</span>
          <select value={prop.format ?? 'number'}
                  onChange={e => onChange({ format: e.target.value })}
                  className="text-xs bg-transparent border rounded px-2 py-0.5 outline-none"
                  style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }}>
            <option value="number">Padrão</option>
            <option value="currency">Moeda (R$)</option>
            <option value="percent">Porcentagem (%)</option>
            <option value="scientific">Notação científica</option>
          </select>
        </div>
      )}
    </div>
  )
}

// ─── SelectOptionsEditor ──────────────────────────────────────────

function SelectOptionsEditor({ prop, onChange }) {
  const [newOpt, setNewOpt] = useState('')

  const COLORS = ['azul','verde','vermelho','laranja','amarelo','roxo','rosa','marrom','cinza']

  function addOption() {
    if (!newOpt.trim()) return
    const opt = { id: crypto.randomUUID(), name: newOpt.trim(), color: 'azul' }
    onChange({ options: [...(prop.options ?? []), opt] })
    setNewOpt('')
  }

  function removeOption(id) {
    onChange({ options: prop.options.filter(o => o.id !== id) })
  }

  function updateOption(id, patch) {
    onChange({ options: prop.options.map(o => o.id === id ? { ...o, ...patch } : o) })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs" style={{ color: '#6B4C3B' }}>Opções:</span>
      {(prop.options ?? []).map(opt => (
        <div key={opt.id} className="flex items-center gap-1.5">
          <select value={opt.color}
                  onChange={e => updateOption(opt.id, { color: e.target.value })}
                  className="text-xs bg-transparent border rounded px-1 py-0.5 outline-none w-20"
                  style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }}>
            {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={opt.name}
                 onChange={e => updateOption(opt.id, { name: e.target.value })}
                 className="flex-1 text-xs bg-transparent border-b outline-none"
                 style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }} />
          <button onClick={() => removeOption(opt.id)} style={{ color: '#6B4C3B' }}>
            <X size={11} />
          </button>
        </div>
      ))}
      <div className="flex gap-1 mt-1">
        <input value={newOpt} onChange={e => setNewOpt(e.target.value)}
               onKeyDown={e => { if (e.key === 'Enter') addOption() }}
               placeholder="Nova opção…"
               className="flex-1 text-xs bg-transparent border-b outline-none"
               style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }} />
        <button onClick={addOption} style={{ color: '#C9A84C' }}><Plus size={12} /></button>
      </div>
    </div>
  )
}
