/**
 * DatabaseContext.jsx — Atualizado na Fase 4
 *
 * FIX: openDatabase agora aceita tanto schema.id quanto folderId.
 * FIX: Provider auto-abre o database quando databaseId prop é fornecido.
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
  const [databases, setDatabases]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  // Database aberto no momento
  const [activeDbId, setActiveDbId]   = useState(null)
  const [items, setItems]             = useState([])
  const [itemsLoading, setItemsLoading] = useState(false)

  // View ativa
  const [activeViewId, setActiveViewId] = useState(null)

  // Dados de databases relacionados
  const [relatedData, setRelatedData] = useState({})

  const saveSchemaDebounce = useRef(null)

  // ─── Carregar lista de databases ──────────────────────────────

  useEffect(() => {
    if (!libraryId || !accessToken) return
    setLoading(true)
    listDatabases(libraryId, accessToken)
      .then(dbs => { setDatabases(dbs); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [libraryId, accessToken])

  // ─── Auto-abrir database quando prop databaseId é fornecida ──
  // FIX: dispara openDatabase assim que databases carrega e databaseId está definido

  useEffect(() => {
    if (!databaseId || databases.length === 0) return

    // Aceita tanto folderId quanto schema.id
    const db = databases.find(
      d => d.folderId === databaseId || d.schema.id === databaseId
    )
    if (!db) return

    const idToOpen = db.schema.id
    if (idToOpen !== activeDbId) {
      openDatabase(idToOpen)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [databaseId, databases])

  // ─── Abrir database ───────────────────────────────────────────

  const openDatabase = useCallback(async (dbId) => {
    // FIX: aceita tanto schema.id quanto folderId
    const db = databases.find(
      d => d.schema.id === dbId || d.folderId === dbId
    )
    if (!db) return

    setActiveDbId(db.schema.id)
    setItemsLoading(true)

    // View padrão
    const firstView = db.schema.views?.[0]
    if (firstView) setActiveViewId(firstView.id)

    try {
      const rawItems = await listDatabaseItems(db.folderId, accessToken)
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

    const needed = new Set()
    relationProps.forEach(p => { if (p.targetDatabaseId) needed.add(p.targetDatabaseId) })
    rollupProps.forEach(p => {
      const rel = schema.properties.find(rp => rp.id === p.relationPropId)
      if (rel?.targetDatabaseId) needed.add(rel.targetDatabaseId)
    })

    for (const dbId of needed) {
      if (relatedData[dbId]) continue
      const db = databases.find(d => d.schema.id === dbId)
      if (!db) continue
      try {
        const relItems = await listDatabaseItems(db.folderId, accessToken)
        setRelatedData(prev => ({ ...prev, [dbId]: { schema: db.schema, items: relItems } }))
      } catch { /* ignora silenciosamente */ }
    }
  }

  // ─── Computed items ───────────────────────────────────────────

  function getComputedItems(rawItems, schema) {
    if (!schema) return rawItems
    return rawItems.map(item =>
      computeDerivedValues(item, schema, rawItems, relatedData)
    )
  }

  // ─── Database ativo e view ativa ─────────────────────────────

  const activeDatabase = databases.find(d => d.schema.id === activeDbId) ?? null
  const activeSchema   = activeDatabase?.schema ?? null
  const activeView     = activeSchema?.views?.find(v => v.id === activeViewId) ?? null

  const computedItems  = activeSchema
    ? getComputedItems(items, activeSchema)
    : items

  const filteredItems = activeView
    ? applySorts(
        applyFilters(computedItems, activeView.filters, activeSchema?.properties ?? []),
        activeView.sorts,
        activeSchema?.properties ?? [],
      )
    : computedItems

  const groupedItems = activeView
    ? applyGrouping(filteredItems, activeView.groupBy, activeSchema?.properties ?? [])
    : [{ key: '__all__', label: 'Todos', color: null, items: filteredItems }]

  // ─── CRUD de databases ────────────────────────────────────────

  async function addDatabase(options = {}) {
    const newDb = await createDatabase(libraryId, accessToken, options)
    setDatabases(prev => [...prev, newDb])
    return newDb
  }

  // ─── CRUD de schema ───────────────────────────────────────────

  function scheduleSchemaUpdate(newSchema) {
    if (!activeDatabase) return
    setDatabases(prev =>
      prev.map(d => d.schema.id === activeDbId
        ? { ...d, schema: newSchema }
        : d
      )
    )
    clearTimeout(saveSchemaDebounce.current)
    saveSchemaDebounce.current = setTimeout(async () => {
      try {
        await updateDatabaseSchema(activeDatabase.schemaFileId, newSchema, accessToken)
      } catch (err) {
        console.error('[DatabaseContext] Erro ao salvar schema:', err)
      }
    }, 1500)
  }

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

  function updateConditionalColors(rules) {
    if (!activeView) return
    updateView(activeViewId, { conditionalColors: rules })
  }

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

    let mergedProps = { ...initialProps }
    if (templateId) {
      const tpl = (activeSchema.templates ?? []).find(t => t.id === templateId)
      if (tpl) {
        mergedProps = { ...tpl.defaultProperties, ...initialProps }
      }
    }

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

  // ─── Helpers ─────────────────────────────────────────────────

  function getItemColor(item) {
    if (!activeView?.conditionalColors?.length || !activeSchema) return null
    return evaluateConditionalColor(item, activeView.conditionalColors, activeSchema, computedItems)
  }

  function getComputedValue(item, propId) {
    return item._computed?.[propId] ?? null
  }

  // ─── Context value ────────────────────────────────────────────

  const value = {
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

    openDatabase,
    addDatabase,

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

    addItem,
    updateItem,
    deleteItem,
    updateItemDate,

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
