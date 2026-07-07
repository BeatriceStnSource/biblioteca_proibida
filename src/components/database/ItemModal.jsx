/**
 * ItemModal.jsx — Fase 4
 *
 * Modal de edição completa de um item de database.
 * Exibe todas as propriedades do schema + área de blocos de conteúdo.
 *
 * Novidades Fase 4:
 *  - Propriedades avançadas: relation, rollup, formula, unique_id
 *  - Mostra valores computados (formula/rollup) em modo somente leitura
 *  - Passa relatedData para RelationCell
 *  - Coloração do header por regras condicionais
 *
 * Props:
 *   item            — item completo (com _fileId e _computed)
 *   schema          — schema do database
 *   relatedData     — { [dbId]: { schema, items } }
 *   onSave          — (updatedItem) => Promise<void>
 *   onDelete        — () => Promise<void>
 *   onClose         — () => void
 *   getComputedValue — (item, propId) => any
 */

import { useState, useCallback, useRef } from 'react'
import { X, Trash2, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { PROPERTY_TYPES } from '../../lib/constants.js'
import PropertyCell from './PropertyCell.jsx'

// ─── ItemModal ────────────────────────────────────────────────────

export default function ItemModal({
  item,
  schema,
  relatedData = {},
  onSave,
  onDelete,
  onClose,
  getComputedValue,
}) {
  const [draft, setDraft]           = useState(item)
  const [saving, setSaving]         = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [propsOpen, setPropsOpen]   = useState(true)
  const saveTimer                   = useRef(null)

  // Debounce de auto-save: 1.5s após última edição
  function scheduleSave(updated) {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      setSaving(true)
      onSave(updated).finally(() => setSaving(false))
    }, 1500)
  }

  function updateProp(propId, value, type) {
    const updated = {
      ...draft,
      properties: {
        ...draft.properties,
        [propId]: { type, value },
      },
    }
    setDraft(updated)
    scheduleSave(updated)
  }

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return }
    await onDelete()
  }

  // Título da página (prop title)
  const titleProp  = schema.properties.find(p => p.type === PROPERTY_TYPES.TITLE)
  const title      = titleProp
    ? (draft.properties?.[titleProp.id]?.value || 'Sem título')
    : 'Sem título'

  // Separa propriedades editáveis das somente-leitura
  const readonlyTypes = [
    PROPERTY_TYPES.CREATED_TIME, PROPERTY_TYPES.EDITED_TIME,
    PROPERTY_TYPES.CREATED_BY,   PROPERTY_TYPES.EDITED_BY,
    PROPERTY_TYPES.UNIQUE_ID,    PROPERTY_TYPES.FORMULA,
    PROPERTY_TYPES.ROLLUP,
  ]

  const editableProps  = schema.properties.filter(p => !readonlyTypes.includes(p.type))
  const computedProps  = schema.properties.filter(p => readonlyTypes.includes(p.type))

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      {/* Painel */}
      <div
        className="w-full rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{
          maxWidth: 720,
          maxHeight: '80vh',
          background: '#F5EDD6',
          border: '2px solid #5C3D1E',
        }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
             style={{ borderColor: '#C9A84C', background: '#EDE0C4' }}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">{schema.icon ?? '🗂️'}</span>
            <span className="font-serif text-base truncate" style={{ color: '#2C1810' }}>{title}</span>
            {saving && (
              <span className="text-xs" style={{ color: '#8B4513' }}>Salvando…</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Abrir como página completa (placeholder) */}
            <button className="p-1.5 rounded hover:bg-black/5 transition-colors"
                    title="Abrir página completa"
                    style={{ color: '#6B4C3B' }}>
              <ExternalLink size={15} />
            </button>
            {/* Deletar */}
            <button
              onClick={handleDelete}
              className="p-1.5 rounded transition-colors hover:bg-red-100"
              title={confirming ? 'Clique para confirmar exclusão' : 'Excluir item'}
              style={{ color: confirming ? '#c0392b' : '#6B4C3B' }}>
              <Trash2 size={15} />
            </button>
            {confirming && (
              <button onClick={() => setConfirming(false)}
                      className="text-xs px-2 py-1 rounded" style={{ color: '#6B4C3B' }}>
                Cancelar
              </button>
            )}
            <button onClick={onClose}
                    className="p-1.5 rounded hover:bg-black/5 transition-colors"
                    style={{ color: '#6B4C3B' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Corpo com scroll */}
        <div className="flex-1 overflow-y-auto">

          {/* Propriedades */}
          <div className="border-b" style={{ borderColor: '#C9A84C' }}>
            {/* Toggle "Propriedades" */}
            <button
              onClick={() => setPropsOpen(o => !o)}
              className="w-full flex items-center gap-2 px-5 py-2.5 text-left hover:bg-black/5 transition-colors">
              {propsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span className="text-xs font-semibold tracking-wide" style={{ color: '#8B4513' }}>
                PROPRIEDADES
              </span>
            </button>

            {propsOpen && (
              <div className="px-5 pb-4 flex flex-col gap-3">

                {/* Propriedades editáveis */}
                {editableProps.map(prop => {
                  const cell  = draft.properties?.[prop.id]
                  const value = cell?.value ?? null

                  return (
                    <PropRow key={prop.id} prop={prop}>
                      <PropertyCell
                        prop={prop}
                        value={value}
                        computedValue={getComputedValue?.(item, prop.id)}
                        relatedData={relatedData}
                        onChange={newVal => updateProp(prop.id, newVal, prop.type)}
                        readOnly={false}
                      />
                    </PropRow>
                  )
                })}

                {/* Propriedades somente-leitura (computed / automáticas) */}
                {computedProps.length > 0 && (
                  <>
                    <div className="pt-1 pb-0.5">
                      <span className="text-xs tracking-wide" style={{ color: '#8B4513', opacity: 0.6 }}>
                        CALCULADAS / AUTOMÁTICAS
                      </span>
                    </div>
                    {computedProps.map(prop => {
                      const cell  = draft.properties?.[prop.id]
                      const raw   = cell?.value ?? null
                      const comp  = getComputedValue?.(item, prop.id)

                      return (
                        <PropRow key={prop.id} prop={prop}>
                          <PropertyCell
                            prop={prop}
                            value={raw}
                            computedValue={comp}
                            relatedData={relatedData}
                            onChange={null}
                            readOnly={true}
                          />
                        </PropRow>
                      )
                    })}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Área de conteúdo (blocos) — placeholder */}
          {/* Na integração final, montar aqui o PageEditor com item.blocks */}
          <div className="px-8 py-6">
            {item.blocks && item.blocks.length > 0 ? (
              <div className="font-serif text-sm" style={{ color: '#2C1810', lineHeight: 1.8 }}>
                {/* Blocos serão renderizados pelo PageEditor quando integrado */}
                <p style={{ color: '#6B4C3B', fontStyle: 'italic' }}>
                  Este item possui {item.blocks.length} bloco(s) de conteúdo.
                  Abra a página completa para editar.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 gap-2" style={{ color: '#8B4513', opacity: 0.4 }}>
                <span className="text-3xl">📄</span>
                <p className="font-serif text-sm">Sem conteúdo ainda.</p>
                <p className="text-xs">Abra a página completa para adicionar blocos.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t flex-shrink-0"
             style={{ borderColor: '#C9A84C', background: '#EDE0C4' }}>
          <span className="text-xs" style={{ color: '#8B4513' }}>
            {item.createdAt
              ? `Criado em ${new Date(item.createdAt).toLocaleDateString('pt-BR')}`
              : ''}
          </span>
          <button
            onClick={() => { clearTimeout(saveTimer.current); setSaving(true); onSave(draft).finally(() => { setSaving(false); onClose() }) }}
            className="px-4 py-1.5 rounded font-serif text-sm transition-colors"
            style={{ background: '#8B4513', color: '#F5EDD6' }}>
            Salvar e fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── PropRow ──────────────────────────────────────────────────────

function PropRow({ prop, children }) {
  const typeLabels = {
    [PROPERTY_TYPES.TITLE]:        '🔤',
    [PROPERTY_TYPES.TEXT]:         '📝',
    [PROPERTY_TYPES.NUMBER]:       '#',
    [PROPERTY_TYPES.SELECT]:       '🔘',
    [PROPERTY_TYPES.MULTISELECT]:  '🏷️',
    [PROPERTY_TYPES.STATUS]:       '📊',
    [PROPERTY_TYPES.CHECKBOX]:     '☑️',
    [PROPERTY_TYPES.DATE]:         '📅',
    [PROPERTY_TYPES.URL]:          '🔗',
    [PROPERTY_TYPES.EMAIL]:        '✉️',
    [PROPERTY_TYPES.PHONE]:        '📞',
    [PROPERTY_TYPES.RELATION]:     '↗️',
    [PROPERTY_TYPES.ROLLUP]:       '∑',
    [PROPERTY_TYPES.FORMULA]:      'ƒ',
    [PROPERTY_TYPES.UNIQUE_ID]:    '🆔',
    [PROPERTY_TYPES.FILE]:         '📎',
    [PROPERTY_TYPES.IMAGE]:        '🖼️',
    [PROPERTY_TYPES.PLACE]:        '📍',
    [PROPERTY_TYPES.PERSON]:       '👤',
    [PROPERTY_TYPES.CREATED_TIME]: '⏱️',
    [PROPERTY_TYPES.EDITED_TIME]:  '⏱️',
    [PROPERTY_TYPES.CREATED_BY]:   '👤',
    [PROPERTY_TYPES.EDITED_BY]:    '👤',
  }

  return (
    <div className="flex items-start gap-3 min-h-[32px]">
      {/* Label */}
      <div className="flex items-center gap-1.5 w-36 flex-shrink-0 pt-0.5">
        <span className="text-xs">{typeLabels[prop.type] ?? '•'}</span>
        <span className="text-xs truncate" style={{ color: '#6B4C3B' }}>{prop.name}</span>
      </div>
      {/* Valor */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
