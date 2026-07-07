/**
 * AdvancedPropertyEditors.jsx — Fase 4
 *
 * Componentes de UI para editar células e configurar propriedades avançadas:
 *  - RelationCell    → mostra/seleciona itens de outro database
 *  - RollupCell      → exibe valor calculado (somente leitura)
 *  - FormulaCell     → exibe valor calculado (somente leitura)
 *  - UniqueIdCell    → exibe ID auto-incrementado (somente leitura)
 *
 *  - RelationPropConfig  → modal de configuração da propriedade Relation
 *  - RollupPropConfig    → modal de configuração do Rollup
 *  - FormulaPropConfig   → modal de configuração da Fórmula
 *  - UniqueIdPropConfig  → modal de configuração do Unique ID
 */

import { useState, useMemo } from 'react'
import { Link2, X, ChevronDown, HelpCircle } from 'lucide-react'
import { PROPERTY_TYPES, ROLLUP_FUNCTIONS } from '../../lib/constants.js'
import { getItemTitle } from '../../lib/database.js'

// ═══════════════════════════════════════════════════════════════════
// CÉLULAS (uso na tabela / gallery / list)
// ═══════════════════════════════════════════════════════════════════

// ─── RelationCell ─────────────────────────────────────────────────

/**
 * Exibe e edita relações com outro database.
 *
 * value: [{ id: string, title: string }] ou null
 * relatedItems: array de itens do database alvo (pre-carregados pelo DatabaseContext)
 * relatedSchema: schema do database alvo
 */
export function RelationCell({ value, prop, relatedItems = [], relatedSchema, onChange, readOnly }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const linked = Array.isArray(value) ? value : []

  const available = useMemo(() => {
    return (relatedItems ?? []).filter(item => {
      const title = getItemTitle(item, relatedSchema?.properties ?? [])
      return title.toLowerCase().includes(search.toLowerCase())
    })
  }, [relatedItems, relatedSchema, search])

  function toggleItem(item) {
    const title = getItemTitle(item, relatedSchema?.properties ?? [])
    const exists = linked.find(r => r.id === item.id)
    if (exists) {
      onChange(linked.filter(r => r.id !== item.id))
    } else {
      onChange([...linked, { id: item.id, title }])
    }
  }

  if (readOnly) {
    return (
      <div className="flex flex-wrap gap-1">
        {linked.map(r => (
          <span key={r.id} className="text-xs px-1.5 py-0.5 rounded flex items-center gap-1"
                style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.3)' }}>
            <Link2 size={10} /> {r.title ?? r.id}
          </span>
        ))}
        {linked.length === 0 && <span style={{ color: '#5C3D1E', fontSize: 12 }}>—</span>}
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Chips dos itens linkados */}
      <div className="flex flex-wrap gap-1 min-h-[24px] cursor-pointer" onClick={() => setOpen(o => !o)}>
        {linked.map(r => (
          <span key={r.id}
                className="text-xs px-1.5 py-0.5 rounded flex items-center gap-1"
                style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.3)' }}>
            <Link2 size={10} />
            {r.title ?? r.id}
            <button onClick={e => { e.stopPropagation(); toggleItem({ id: r.id }) }}
                    className="hover:opacity-70">
              <X size={9} />
            </button>
          </span>
        ))}
        {linked.length === 0 && (
          <span style={{ color: '#5C3D1E', fontSize: 12 }}>Clique para adicionar</span>
        )}
      </div>

      {/* Dropdown de seleção */}
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 rounded-lg border shadow-xl overflow-hidden"
             style={{ background: '#2A1F14', borderColor: '#5C3D1E', minWidth: 220, maxWidth: 300 }}>
          <div className="p-2 border-b" style={{ borderColor: '#5C3D1E' }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar…"
              className="w-full text-xs bg-transparent outline-none"
              style={{ color: '#F5EDD6' }}
            />
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
            {available.length === 0 && (
              <div className="px-3 py-4 text-center text-xs" style={{ color: '#5C3D1E' }}>
                Nenhum item encontrado
              </div>
            )}
            {available.map(item => {
              const title   = getItemTitle(item, relatedSchema?.properties ?? [])
              const selected = linked.some(r => r.id === item.id)
              return (
                <button key={item.id}
                        onClick={() => toggleItem(item)}
                        className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-white/5"
                        style={{ color: '#F5EDD6' }}>
                  <span className="w-3 h-3 rounded-sm border flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: selected ? '#C9A84C' : '#5C3D1E', background: selected ? '#C9A84C' : 'transparent' }}>
                    {selected && <span style={{ color: '#1C1610', fontSize: 8 }}>✓</span>}
                  </span>
                  {title}
                </button>
              )
            })}
          </div>
          <div className="p-2 border-t" style={{ borderColor: '#5C3D1E' }}>
            <button onClick={() => { setOpen(false); setSearch('') }}
                    className="w-full text-xs text-center py-1 rounded hover:bg-white/5"
                    style={{ color: '#6B4C3B' }}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── RollupCell ───────────────────────────────────────────────────

export function RollupCell({ value }) {
  if (value == null || value === '') return <span style={{ color: '#5C3D1E', fontSize: 12 }}>—</span>
  return <span className="text-sm font-mono" style={{ color: '#C9A84C' }}>{String(value)}</span>
}

// ─── FormulaCell ──────────────────────────────────────────────────

export function FormulaCell({ value }) {
  if (value == null || value === '') return <span style={{ color: '#5C3D1E', fontSize: 12 }}>—</span>

  const display = typeof value === 'boolean'
    ? (value ? '✓' : '✗')
    : value instanceof Date
      ? value.toLocaleDateString('pt-BR')
      : String(value)

  return (
    <span className="text-sm font-mono" style={{ color: '#9cdcb0' }}>
      {display}
    </span>
  )
}

// ─── UniqueIdCell ─────────────────────────────────────────────────

export function UniqueIdCell({ value }) {
  if (!value) return <span style={{ color: '#5C3D1E', fontSize: 12 }}>—</span>
  return (
    <span className="text-xs font-mono px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(92,61,30,0.4)', color: '#C9A84C' }}>
      {value}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════
// CONFIGURAÇÕES DE PROPRIEDADE (dentro do modal de edição de schema)
// ═══════════════════════════════════════════════════════════════════

// ─── RelationPropConfig ───────────────────────────────────────────

/**
 * Configura qual database é o alvo da relação.
 *
 * availableDatabases: [{ schema, folderId, schemaFileId }]
 */
export function RelationPropConfig({ prop, availableDatabases = [], onChange }) {
  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex flex-col gap-1">
        <label className="text-xs" style={{ color: '#6B4C3B' }}>Database relacionado</label>
        <select
          value={prop.targetDatabaseId ?? ''}
          onChange={e => {
            const db = availableDatabases.find(d => d.schema.id === e.target.value)
            onChange({
              targetDatabaseId:    db?.schema.id ?? null,
              targetDatabaseTitle: db?.schema.title ?? '',
            })
          }}
          className="text-sm bg-transparent border rounded px-3 py-1.5 outline-none"
          style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }}>
          <option value="">— selecione —</option>
          {availableDatabases.map(db => (
            <option key={db.schema.id} value={db.schema.id}>
              {db.schema.icon} {db.schema.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="bidirectional"
          checked={Boolean(prop.bidirectional)}
          onChange={e => onChange({ bidirectional: e.target.checked })}
          className="w-4 h-4 cursor-pointer"
        />
        <label htmlFor="bidirectional" className="text-xs cursor-pointer" style={{ color: '#F5EDD6' }}>
          Relação bidirecional
        </label>
      </div>

      {prop.bidirectional && (
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: '#6B4C3B' }}>
            Nome da propriedade inversa (no database alvo)
          </label>
          <input
            value={prop.backPropertyName ?? ''}
            onChange={e => onChange({ backPropertyName: e.target.value })}
            placeholder={`Relacionado a ${prop.name || 'este database'}`}
            className="text-sm bg-transparent border rounded px-3 py-1.5 outline-none"
            style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }}
          />
        </div>
      )}

      <ConfigNote>
        Cada item poderá ser vinculado a um ou mais itens do database selecionado.
      </ConfigNote>
    </div>
  )
}

// ─── RollupPropConfig ─────────────────────────────────────────────

export function RollupPropConfig({ prop, schema, availableDatabases = [], onChange }) {
  // Propriedades Relation disponíveis neste database
  const relationProps = schema.properties.filter(p => p.type === PROPERTY_TYPES.RELATION)

  // Schema do database alvo selecionado via Relation
  const selectedRelProp  = schema.properties.find(p => p.id === prop.relationPropId)
  const targetDbId       = selectedRelProp?.targetDatabaseId
  const targetDb         = availableDatabases.find(d => d.schema.id === targetDbId)
  const targetProperties = targetDb?.schema?.properties ?? []

  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex flex-col gap-1">
        <label className="text-xs" style={{ color: '#6B4C3B' }}>Propriedade de Relação</label>
        <select
          value={prop.relationPropId ?? ''}
          onChange={e => onChange({ relationPropId: e.target.value, targetPropertyId: null })}
          className="text-sm bg-transparent border rounded px-3 py-1.5 outline-none"
          style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }}>
          <option value="">— selecione —</option>
          {relationProps.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {prop.relationPropId && (
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: '#6B4C3B' }}>
            Propriedade a agregar ({targetDb?.schema?.title ?? 'database alvo'})
          </label>
          <select
            value={prop.targetPropertyId ?? ''}
            onChange={e => onChange({ targetPropertyId: e.target.value })}
            className="text-sm bg-transparent border rounded px-3 py-1.5 outline-none"
            style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }}>
            <option value="">— selecione —</option>
            {targetProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs" style={{ color: '#6B4C3B' }}>Função de agregação</label>
        <select
          value={prop.function ?? 'count'}
          onChange={e => onChange({ function: e.target.value })}
          className="text-sm bg-transparent border rounded px-3 py-1.5 outline-none"
          style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }}>
          {ROLLUP_FUNCTIONS.map(fn => (
            <option key={fn.value} value={fn.value}>{fn.label}</option>
          ))}
        </select>
      </div>

      <ConfigNote>
        Rollup agrega os valores de uma propriedade dos itens relacionados.
        Ex: soma de páginas de todos os livros relacionados.
      </ConfigNote>
    </div>
  )
}

// ─── FormulaPropConfig ────────────────────────────────────────────

export function FormulaPropConfig({ prop, schema, onChange }) {
  const [preview, setPreview] = useState(null)
  const [error, setError]     = useState(null)

  function testFormula() {
    // Testa a fórmula com um item vazio como referência
    try {
      const { evaluateFormula } = require('../../lib/formula.js')
      const mockItem = { id: 'test', properties: {} }
      const result   = evaluateFormula(prop.formula, mockItem, schema, [])
      setPreview(String(result ?? 'null'))
      setError(null)
    } catch (e) {
      setError(e.message)
      setPreview(null)
    }
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-xs" style={{ color: '#6B4C3B' }}>Expressão</label>
          <button onClick={testFormula}
                  className="text-xs px-2 py-0.5 rounded border hover:bg-white/10 transition-colors"
                  style={{ borderColor: '#5C3D1E', color: '#6B4C3B' }}>
            Testar
          </button>
        </div>
        <textarea
          value={prop.formula ?? ''}
          onChange={e => onChange({ formula: e.target.value })}
          placeholder={'if(prop("Lido?"), "✓ Concluído", "Em andamento")'}
          rows={3}
          className="w-full text-sm font-mono bg-transparent border rounded px-3 py-2 outline-none resize-none"
          style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }}
        />
      </div>

      {preview != null && (
        <div className="text-xs px-2 py-1.5 rounded"
             style={{ background: 'rgba(68,131,97,0.15)', border: '1px solid rgba(68,131,97,0.3)', color: '#9cdcb0' }}>
          Resultado (item vazio): <strong>{preview}</strong>
        </div>
      )}

      {error && (
        <div className="text-xs px-2 py-1.5 rounded"
             style={{ background: 'rgba(212,76,71,0.15)', border: '1px solid rgba(212,76,71,0.3)', color: '#f09090' }}>
          {error}
        </div>
      )}

      {/* Referência de propriedades */}
      <div className="flex flex-col gap-1">
        <span className="text-xs" style={{ color: '#6B4C3B' }}>Propriedades disponíveis:</span>
        <div className="flex flex-wrap gap-1">
          {schema.properties
            .filter(p => ![PROPERTY_TYPES.FORMULA, PROPERTY_TYPES.ROLLUP].includes(p.type))
            .map(p => (
              <button
                key={p.id}
                onClick={() => onChange({ formula: (prop.formula ?? '') + `prop("${p.name}")` })}
                className="text-xs px-1.5 py-0.5 rounded font-mono hover:bg-white/10 transition-colors"
                style={{ background: 'rgba(92,61,30,0.3)', color: '#C9A84C' }}>
                {p.name}
              </button>
            ))}
        </div>
      </div>

      <ConfigNote>
        Exemplos:<br/>
        <code className="text-xs">prop("Lido?") ? "✓" : "Pendente"</code><br/>
        <code className="text-xs">dateBetween(now(), prop("Data"), "days") + " dias"</code>
      </ConfigNote>
    </div>
  )
}

// ─── UniqueIdPropConfig ───────────────────────────────────────────

export function UniqueIdPropConfig({ prop, onChange }) {
  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex flex-col gap-1">
        <label className="text-xs" style={{ color: '#6B4C3B' }}>Prefixo (opcional)</label>
        <input
          value={prop.prefix ?? ''}
          onChange={e => onChange({ prefix: e.target.value.toUpperCase() })}
          placeholder="ex: LIVRO, CAP, TASK"
          maxLength={10}
          className="text-sm bg-transparent border rounded px-3 py-1.5 outline-none"
          style={{ borderColor: '#5C3D1E', color: '#F5EDD6' }}
        />
        {prop.prefix && (
          <span className="text-xs font-mono" style={{ color: '#6B4C3B' }}>
            Exemplo: {prop.prefix}-001, {prop.prefix}-002…
          </span>
        )}
        {!prop.prefix && (
          <span className="text-xs font-mono" style={{ color: '#6B4C3B' }}>
            Sem prefixo: 001, 002, 003…
          </span>
        )}
      </div>

      <ConfigNote>
        O ID único é atribuído automaticamente ao criar cada item e não pode ser editado.
        O contador começa em 001 e nunca é reutilizado.
      </ConfigNote>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────

function ConfigNote({ children }) {
  return (
    <div className="flex items-start gap-2 text-xs px-3 py-2 rounded"
         style={{ background: 'rgba(92,61,30,0.15)', color: '#6B4C3B' }}>
      <HelpCircle size={12} className="flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}
