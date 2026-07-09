/**
 * DatabaseContext.jsx — Atualizado na Fase 4
 *
 * Novidades em relação à Fase 3:
 *  - carrega relatedData (databases relacionados via Relation)
 *  - computeDerivedValues para fórmulas e rollups
 *  - suporte a templates na schema
 *  - applyTemplate ao criar item
 *  - coloração condicional via evaluateConditionalColor
 *  - updateItemDate (utilitário para CalendarView drag)
 */

import {
  createContext, useContext, useState, useEffect, useCallback, useRef
} from 'react'
import {
  listDatabases,
  createDatabase,
  updateDatabaseSchema,
  listDatabaseItems,
  createDatabaseItem_drive,
  updateDatabaseItem,
  deleteDatabaseItem,
  createProperty,
  createView,
  createTemplate,
  applyFilters,
  applySorts,
  applyGrouping,
  computeDerivedValues,
  getItemTitle,
} from '../lib/database.js'
import { PROPERTY_TYPES, VIEW_TYPES } from '../lib/constants.js'
import { evaluateConditionalColor } from '../lib/formula.js'

// ─── Context ──────────────────────────────────────────────────────

const DatabaseContext = createContext(null)

export function useDatabaseContext() {
  const ctx = useContext(DatabaseContext)
  if (!ctx) throw new Error('useDatabaseContext must be used inside DatabaseProvider')
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────

export function DatabaseProvider({ libraryId, databaseId, accessToken, children }) {
  // Lista de databases desta biblioteca
  const [databases, setDatabases]     = useState([])   // [{ folderId, schemaFileId, schema }]
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  // Database aberto no momento
  const [activeDbId, setActiveDbId]   = useState(null)
  const [items, setItems]             = useState([])    // itens com _fileId
  const [itemsLoading, setItemsLoading] = useState(false)

  // View ativa
  const [activeViewId, setActiveViewId] = useState(null)

  // Dados de databases relacionados (para Relation / Rollup)
  // { [databaseId]: { schema, items } }
  const [relatedData, setRelatedData] = useState({})

  // Ref para debounce de salvamento de schema
  const saveSchemaDebounce = useRef(null)

  // ─── Helpers de Drive ─────────────────────────────────────────

  function buildHeaders() {
    return {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }
  }

  // ─── Carregar lista de databases ──────────────────────────────

  useEffect(() => {
    if (!libraryId || !accessToken) return
    setLoading(true)
    listDatabases(libraryId, accessToken)
      .then(dbs => { setDatabases(dbs); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [libraryId, accessToken])

  // ─── Auto-abrir database quando databaseId prop é fornecida ──

  useEffect(() => {
    if (!databaseId || databases.length === 0) return
    const db = databases.find(
      d => d.folderId === databaseId || d.schema?.id === databaseId
    )
    if (!db) return
    const targetId = db.schema?.id ?? db.folderId
    if (targetId) openDatabase(targetId)
  }, [databaseId, databases])

  // ─── Abrir database ───────────────────────────────────────────

  const openDatabase = useCallback(async (dbId) => {
    const db = databases.find(d => d.schema.id === dbId)
    if (!db) return

    setActiveDbId(dbId)
    setItemsLoading(true)

    // View padrão
    const firstView = db.schema.views?.[0]
    if (firstView) setActiveViewId(firstView.id)

    try {
      const rawItems = await listDatabaseItems(db.folderId, accessToken)

      // Carregar databases relacionados (de uma vez, sem duplicar)
      await loadRelatedDatabases(db.schema, rawItems)

      setItems(rawItems)
    } catch (err) {
      setError(err.message)
    } finally {
      setItemsLoading(false)
    }
  }, [databases, accessToken])

  // ─── Carregar databases relacionados ─────────────────────────

  async function loadRelatedDatabases(schema, currentItems) {
    const relationProps = (schema.properties ?? []).filter(p => p.type === PROPERTY_TYPES.RELATION)
    const rollupProps   = (schema.properties ?? []).filter(p => p.type === PROPERTY_TYPES.ROLLUP)

    // IDs únicos dos databases que precisam ser carregados
    const needed = new Set()
    relationProps.forEach(p => { if (p.targetDatabaseId) needed.add(p.targetDatabaseId) })
    rollupProps.forEach(p => {
      const rel = schema.properties.find(rp => rp.id === p.relationPropId)
      if (rel?.targetDatabaseId) needed.add(rel.targetDatabaseId)
    })

    for (const dbId of needed) {
      if (relatedData[dbId]) continue   // já carregado
      const db = databases.find(d => d.schema.id === dbId)
      if (!db) continue
      try {
        const relItems = await listDatabaseItems(db.folderId, accessToken)
        setRelatedData(prev => ({ ...prev, [dbId]: { schema: db.schema, items: relItems } }))
      } catch { /* ignora silenciosamente */ }
    }
  }

  // ─── Computed items (fórmulas + rollups) ──────────────────────

  function getComputedItems(rawItems, schema) {
    if (!schema || !Array.isArray(rawItems)) return rawItems ?? []
    return rawItems
      .filter(item => item != null && typeof item === 'object')
      .map(item => {
        try {
          return computeDerivedValues(item, schema, rawItems, relatedData)
        } catch {
          return { ...item, _computed: {} }
        }
      })
  }

  // ─── Database ativo e view ativa ─────────────────────────────

  const activeDatabase = databases.find(d => d.schema.id === activeDbId) ?? null
  const activeSchema   = activeDatabase?.schema ?? null
  const activeView     = activeSchema?.views?.find(v => v.id === activeViewId) ?? null

  // Items com valores computados
  const computedItems  = activeSchema
    ? getComputedItems(items, activeSchema)
    : items

  // Aplicar filtros + ordenação da view ativa
  const filteredItems = activeView
    ? applySorts(
        applyFilters(computedItems, activeView.filters, activeSchema?.properties ?? []),
        activeView.sorts,
        activeSchema?.properties ?? [],
      )
    : computedItems

  // Agrupamento
  const groupedItems = activeView
    ? applyGrouping(filteredItems, activeView.groupBy, activeSchema?.properties ?? [])
    : [{ key: '__all__', label: 'Todos', color: null, items: filteredItems }]

  // ─── CRUD de databases ────────────────────────────────────────

  async function addDatabase(options = {}) {
    const newDb = await createDatabase(libraryId, accessToken, options)
    setDatabases(prev => [...prev, newDb])
    return newDb
  }

  // ─── CRUD de schema (propriedades, views) ─────────────────────

  function scheduleSchemaUpdate(newSchema) {
    if (!activeDatabase) return
    // Atualiza state imediatamente para UI responsiva
    setDatabases(prev =>
      prev.map(d => d.schema.id === activeDbId
        ? { ...d, schema: newSchema }
        : d
      )
    )
    // Debounce para salvar no Drive (1.5s)
    clearTimeout(saveSchemaDebounce.current)
    saveSchemaDebounce.current = setTimeout(async () => {
      try {
        await updateDatabaseSchema(activeDatabase.schemaFileId, newSchema, accessToken)
      } catch (err) {
        console.error('[DatabaseContext] Erro ao salvar schema:', err)
      }
    }, 1500)
  }

  // Propriedades

  function addProperty(name, type, extras = {}) {
    if (!activeSchema) return
    const newProp = createProperty(name, type, extras)
    newProp.order = activeSchema.properties.length
    const newSchema = {
      ...activeSchema,
      properties: [...activeSchema.properties, newProp],
    }
    scheduleSchemaUpdate(newSchema)
    return newProp
  }

  function updateProperty(propId, patch) {
    if (!activeSchema) return
    const newSchema = {
      ...activeSchema,
      properties: activeSchema.properties.map(p =>
        p.id === propId ? { ...p, ...patch } : p
      ),
    }
    scheduleSchemaUpdate(newSchema)
  }

  function deleteProperty(propId) {
    if (!activeSchema) return
    const newSchema = {
      ...activeSchema,
      properties: activeSchema.properties
        .filter(p => p.id !== propId)
        .map((p, i) => ({ ...p, order: i })),
    }
    scheduleSchemaUpdate(newSchema)
  }

  function reorderProperties(orderedIds) {
    if (!activeSchema) return
    const map = Object.fromEntries(activeSchema.properties.map(p => [p.id, p]))
    const newSchema = {
      ...activeSchema,
      properties: orderedIds.map((id, i) => ({ ...map[id], order: i })),
    }
    scheduleSchemaUpdate(newSchema)
  }

  // Views

  function addView(name, type) {
    if (!activeSchema) return
    const newView = createView(name, type)
    newView.order = activeSchema.views.length
    const newSchema = {
      ...activeSchema,
      views: [...activeSchema.views, newView],
    }
    scheduleSchemaUpdate(newSchema)
    setActiveViewId(newView.id)
    return newView
  }

  function updateView(viewId, patch) {
    if (!activeSchema) return
    const newSchema = {
      ...activeSchema,
      views: activeSchema.views.map(v =>
        v.id === viewId ? { ...v, ...patch } : v
      ),
    }
    scheduleSchemaUpdate(newSchema)
  }

  function deleteView(viewId) {
    if (!activeSchema) return
    const remaining = activeSchema.views.filter(v => v.id !== viewId)
    const newSchema  = { ...activeSchema, views: remaining }
    scheduleSchemaUpdate(newSchema)
    if (activeViewId === viewId) setActiveViewId(remaining[0]?.id ?? null)
  }

  // Coloração condicional da view ativa

  function updateConditionalColors(rules) {
    if (!activeView) return
    updateView(activeViewId, { conditionalColors: rules })
  }

  // Templates (Fase 4)

  function addTemplate(name, defaultProperties = {}, blocks = []) {
    if (!activeSchema) return
    const tpl = createTemplate(name, defaultProperties, blocks)
    scheduleSchemaUpdate({ ...activeSchema, templates: [...(activeSchema.templates ?? []), tpl] })
    return tpl
  }

  function updateTemplates(newTemplates) {
    if (!activeSchema) return
    scheduleSchemaUpdate({ ...activeSchema, templates: newTemplates })
  }

  // ─── CRUD de itens ────────────────────────────────────────────

  async function addItem(initialProps = {}, templateId = null) {
    if (!activeDatabase || !activeSchema) return

    // Mesclar props do template se fornecido
    let mergedProps = { ...initialProps }
    if (templateId) {
      const tpl = (activeSchema.templates ?? []).find(t => t.id === templateId)
      if (tpl) {
        mergedProps = { ...tpl.defaultProperties, ...initialProps }
      }
    }

    // Inicializar a prop título se não vier preenchida
    const titleProp = activeSchema.properties.find(p => p.type === PROPERTY_TYPES.TITLE)
    if (titleProp && !mergedProps[titleProp.id]) {
      mergedProps[titleProp.id] = { type: PROPERTY_TYPES.TITLE, value: '' }
    }

    const { item: newItem, schema: updatedSchema } =
      await createDatabaseItem_drive(
        activeDatabase.folderId,
        activeSchema,
        mergedProps,
        accessToken,
      )

    setItems(prev => [...prev, newItem])

    // Atualiza schema se o contador de unique_id mudou
    if (updatedSchema._nextUniqueId !== activeSchema._nextUniqueId) {
      scheduleSchemaUpdate(updatedSchema)
    }

    return newItem
  }

  async function updateItem(item) {
    try {
      const updated = await updateDatabaseItem(item._fileId, item, accessToken)
      setItems(prev => prev.map(i => i.id === item.id ? { ...updated, _fileId: item._fileId } : i))
      return updated
    } catch (err) {
      console.error('[DatabaseContext] Erro ao salvar item:', err)
      throw err
    }
  }

  async function deleteItem(itemId) {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    await deleteDatabaseItem(item._fileId, accessToken)
    setItems(prev => prev.filter(i => i.id !== itemId))
  }

  // Utilitário para CalendarView — atualiza a data de um item rapidamente
  async function updateItemDate(item, datePropId, newDateStr) {
    const updated = {
      ...item,
      properties: {
        ...item.properties,
        [datePropId]: { type: PROPERTY_TYPES.DATE, value: newDateStr },
      },
    }
    await updateItem(updated)
  }

  // ─── Coloração condicional por item ──────────────────────────

  function getItemColor(item) {
    if (!activeView?.conditionalColors?.length || !activeSchema) return null
    return evaluateConditionalColor(item, activeView.conditionalColors, activeSchema, computedItems)
  }

  // ─── Valor de células computadas ─────────────────────────────

  function getComputedValue(item, propId) {
    return item._computed?.[propId] ?? null
  }

  // ─── Context value ────────────────────────────────────────────

  const value = {
    // Estado
    databases,
    loading,
    error,
    activeDatabase,
    activeSchema,
    activeView,
    activeViewId,
    setActiveViewId,
    items,
    computedItems,
    filteredItems,
    groupedItems,
    itemsLoading,
    relatedData,

    // Ações — databases
    openDatabase,
    addDatabase,

    // Ações — schema
    addProperty,
    updateProperty,
    deleteProperty,
    reorderProperties,
    addView,
    updateView,
    deleteView,
    updateConditionalColors,
    updateTemplates,
    addTemplate,

    // Ações — itens
    addItem,
    updateItem,
    deleteItem,
    updateItemDate,

    // Helpers
    getItemTitle: (item) => getItemTitle(item, activeSchema?.properties ?? []),
    getItemColor,
    getComputedValue,
  }

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  )
}
