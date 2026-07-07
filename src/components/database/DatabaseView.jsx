/**
 * DatabaseView.jsx — Atualizado na Fase 4
 *
 * Orquestra todas as views de um database.
 * Novidades em relação à Fase 3:
 *  - Views: CalendarView e TimelineView
 *  - Coloração condicional (passada para TableView, GalleryView, ListView)
 *  - Modal de templates (criar item a partir de template)
 *  - Modal de configuração de coloração condicional
 *  - Passagem de relatedData para RelationCell
 *
 * Props:
 *   libraryId    — ID da pasta da biblioteca no Drive
 *   accessToken  — token OAuth ativo
 */

import { useState, useCallback } from 'react'
import { useDatabaseContext } from '../../contexts/DatabaseContext.jsx'
import { VIEW_TYPES } from '../../lib/constants.js'

// Views
import TableView     from './views/TableView.jsx'
import GalleryView   from './views/GalleryView.jsx'
import ListView      from './views/ListView.jsx'
import BoardView     from './views/BoardView.jsx'
import CalendarView  from './views/CalendarView.jsx'   // Fase 4
import TimelineView  from './views/TimelineView.jsx'   // Fase 4

// Fase 4
import DatabaseToolbar          from './DatabaseToolbar.jsx'
import ConditionalColorEditor   from './ConditionalColorEditor.jsx'
import TemplateManager          from './TemplateManager.jsx'
import ItemModal                from './ItemModal.jsx'

import {
  Layers, ChevronRight, BookOpen, Loader2,
  Paintbrush, BookTemplate,
} from 'lucide-react'

// ─── DatabaseView ─────────────────────────────────────────────────

export default function DatabaseView() {
  const {
    activeSchema, activeView, activeViewId, setActiveViewId,
    filteredItems, groupedItems, relatedData,
    addItem, updateItem, deleteItem, updateItemDate,
    addView, updateView, deleteView,
    addProperty, updateProperty, deleteProperty,
    updateConditionalColors,
    updateTemplates, addTemplate,
    getItemTitle, getItemColor, getComputedValue,
    itemsLoading, activeDatabase,
  } = useDatabaseContext()

  const [editingItem, setEditingItem]   = useState(null)   // item aberto no modal
  const [showColors, setShowColors]     = useState(false)  // modal de coloração
  const [showTemplates, setShowTemplates] = useState(false) // modal de templates

  // ─── Criar novo item ─────────────────────────────────────────

  async function handleAddItem(extraProps = {}) {
    const newItem = await addItem(extraProps)
    setEditingItem(newItem)
  }

  async function handleAddItemFromTemplate(tpl) {
    const newItem = await addItem(tpl.defaultProperties ?? {})
    setEditingItem(newItem)
    setShowTemplates(false)
  }

  // CalendarView drag de data
  async function handleUpdateItemDate({ item, datePropId, dateValue }) {
    // Chamado quando prop especial { datePropId, dateValue } vem do onAddItem do calendário
    if (!item && datePropId) {
      // É um "clique em dia vazio" → criar item com data
      await handleAddItem({ [datePropId]: { type: 'date', value: dateValue } })
    }
  }

  // ─── Render guardas ───────────────────────────────────────────

  if (!activeSchema) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3"
           style={{ color: '#6B4C3B' }}>
        <BookOpen size={40} style={{ opacity: 0.3 }} />
        <p className="font-serif">Selecione ou crie um database na barra lateral.</p>
      </div>
    )
  }

  if (itemsLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3" style={{ color: '#6B4C3B' }}>
        <Loader2 size={24} className="animate-spin" />
        <span className="font-serif">Carregando itens…</span>
      </div>
    )
  }

  // ─── Render view ─────────────────────────────────────────────

  const viewType  = activeView?.type ?? VIEW_TYPES.TABLE

  const sharedProps = {
    items:      filteredItems,
    schema:     activeSchema,
    view:       activeView,
    relatedData,
    onItemClick: setEditingItem,
    onAddItem:  handleAddItem,
    onUpdateItem: updateItem,
    getItemColor,
    getComputedValue,
  }

  const viewComponents = {
    [VIEW_TYPES.TABLE]:    <TableView    {...sharedProps} />,
    [VIEW_TYPES.GALLERY]:  <GalleryView  {...sharedProps} />,
    [VIEW_TYPES.LIST]:     <ListView     {...sharedProps} />,
    [VIEW_TYPES.BOARD]:    <BoardView    {...sharedProps} />,
    [VIEW_TYPES.CALENDAR]: (
      <CalendarView
        {...sharedProps}
        onAddItem={payload => {
          if (payload?.datePropId) {
            handleAddItem({ [payload.datePropId]: { type: 'date', value: payload.dateValue } })
          } else {
            handleAddItem()
          }
        }}
        onUpdateItem={updateItem}
      />
    ),
    [VIEW_TYPES.TIMELINE]: <TimelineView {...sharedProps} />,
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#1C1610' }}>

      {/* Toolbar com tabs de view e actions */}
      <DatabaseToolbar
        schema={activeSchema}
        activeView={activeView}
        views={activeSchema.views ?? []}
        onViewSelect={setActiveViewId}
        onAddView={addView}
        onUpdateView={(id, patch) => updateView(id, patch)}
        onDeleteView={deleteView}
        onAddProperty={addProperty}
        onUpdateProperty={updateProperty}
        onDeleteProperty={deleteProperty}
        onAddItem={handleAddItem}
        extraActions={
          <div className="flex items-center gap-1">
            {/* Coloração condicional */}
            <button
              onClick={() => setShowColors(c => !c)}
              title="Coloração condicional"
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: showColors ? '#C9A84C' : '#6B4C3B' }}>
              <Paintbrush size={15} />
            </button>
            {/* Templates */}
            <button
              onClick={() => setShowTemplates(t => !t)}
              title="Templates"
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: showTemplates ? '#C9A84C' : '#6B4C3B' }}>
              <Layers size={15} />
            </button>
          </div>
        }
      />

      {/* Painéis laterais (Fase 4) */}
      {(showColors || showTemplates) && (
        <div className="flex border-b" style={{ borderColor: '#5C3D1E' }}>
          <div className="flex-1 p-4 border-r" style={{ borderColor: '#5C3D1E', maxWidth: 380 }}>
            {showColors && (
              <ConditionalColorEditor
                rules={activeView?.conditionalColors ?? []}
                schema={activeSchema}
                onChange={updateConditionalColors}
              />
            )}
            {showTemplates && (
              <TemplateManager
                templates={activeSchema.templates ?? []}
                schema={activeSchema}
                onChange={updateTemplates}
                onApply={handleAddItemFromTemplate}
              />
            )}
          </div>
        </div>
      )}

      {/* View principal */}
      <div className="flex-1 overflow-hidden">
        {viewComponents[viewType] ?? viewComponents[VIEW_TYPES.TABLE]}
      </div>

      {/* Modal de edição de item */}
      {editingItem && (
        <ItemModal
          item={editingItem}
          schema={activeSchema}
          relatedData={relatedData}
          onSave={async updatedItem => {
            await updateItem(updatedItem)
            setEditingItem(null)
          }}
          onDelete={async () => {
            await deleteItem(editingItem.id)
            setEditingItem(null)
          }}
          onClose={() => setEditingItem(null)}
          getComputedValue={getComputedValue}
        />
      )}
    </div>
  )
}
