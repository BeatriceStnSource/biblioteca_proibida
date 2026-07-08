/**
 * DatabaseContext.jsx — Atualizado na Fase 4
 *
 * FIX v2: guards contra undefined em computedItems/filteredItems/groupedItems
 * FIX: openDatabase aceita folderId ou schema.id
 * FIX: auto-abre database quando databaseId prop é fornecida
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

const DatabaseContext = createContext(null)

export function useDatabaseContext() {
  const ctx = useContext(DatabaseContext)
  if (!ctx) throw new Error('useDatabaseContext must be used inside DatabaseProvider')
  return ctx
}

export function DatabaseProvider({ libraryId, databaseId, accessToken, children }) {
  const [databases, setDatabases]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [activeDbId, setActiveDbId]     = useState(null)
  const [items, setItems]               = useState([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [activeViewId, setActiveViewId] = useState(null)
  const [relatedData, setRelatedData]   = useState({})

  const saveSchemaDebounce = useRef(null)
  // Evita double-open em StrictMode / re-renders
  const openingRef = useRef(null)

  // ─── Carregar lista de databases ──────────────────────────────

  useEffect(() => {
    if (!libraryId || !accessToken) return
    setLoading(true)
    listDatabases(libraryId, accessToken)
      .then(dbs => {
        setDatabases(dbs)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [libraryId, accessToken])

  // ─── Auto-abrir database quando databaseId prop é fornecida ──

  useEffect(() => {
    if (!databaseId || databases.length === 0) return

    // Aceita folderId ou schema.id
    const db = databases.find(
      d => d.folderId === databaseId || d.schema?.id === databaseId
    )
    if (!db || !db.schema?.id) return

    const targetId = db.schema.id
    // Só abre se for diferente do atual e não estiver já abrindo
    if (targetId === activeDbId || openingRef.current === targetId) return

    openDatabase(targetId)
  // openDatabase é estável via useCallback — ok incluir
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [databaseId, databases])

  // ─── Abrir database ───────────────────────────────────────────

  const openDatabase = useCallback(async (dbId) => {
    const db = databases.find(
      d => d.schema?.id === dbId || d.folderId === dbId
    )
    if (!db || !db.schema) return

    openingRef.current = db.schema.id
    setActiveDbId(db.schema.id)
    setItems([])           // limpa itens anteriores
    setItemsLoading(true)

    const firstView = db.schema.views?.[0]
    if (firstView) setActiveViewId(firstView.id)

    try {
      const rawItems = await listDatabaseItems(db.folderId, accessToken)
      // Garante que todos os itens são objetos válidos
      const validItems = (rawItems ?? []).filter(i => i && typeof i === 'object')
      await loadRelatedDatabases(db.schema, validItems)
      setItems(validItems)
    } catch (err) {
      console.error('[DatabaseContext] Erro ao carregar itens:', err)
      setError(err.message)
    } finally {
      setItemsLoading(false)
      openingRef.current = null
    }
  }, [databases, accessToken])

  // ─── Carregar databases relacionados ─────────────────────────

  async function loadRelatedDatabases(schema, currentItems) {
    const relationProps = (schema?.properties ?? []).filter(p => p.type === PROPERTY_TYPES.RELATION)
    const rollupProps   = (schema?.properties ?? []).filter(p => p.type === PROPERTY_TYPES.ROLLUP)

    const needed = new Set()
    relationProps.forEach(p => { if (p.targetDatabaseId) needed.add(p.targetDatabaseId) })
    rollupProps.forEach(p => {
      const rel = schema.properties.find(rp => rp.id === p.relationPropId)
      if (rel?.targetDatabaseId) needed.add(rel.targetDatabaseId)
    })

    for (const dbId of needed) {
      if (relatedData[dbId]) continue
      const db = databases.find(d => d.schema?.id === dbId)
      if (!db) continue
      try {
        const relItems = await listDatabaseItems(db.folderId, accessToken)
        setRelatedData(prev => ({ ...prev, [dbId]: { schema: db.schema, items: relItems ?? [] } }))
      } catch { /* silencioso */ }
    }
  }

  // ─── Computed items com guards ────────────────────────────────

  function getComputedItems(rawItems, schema) {
    if (!schema || !Array.isArray(rawItems)) return []
    return rawItems
      .filter(item => item && typeof item === 'object' && item.properties !== undefined)
      .map(item => {
        try {
          return computeDerivedValues(item, schema, rawItems, relatedData)
        } catch {
          return item
        }
      })
  }

  // ─── Derivações com guards ────────────────────────────────────

  const activeDatabase = databases.find(d => d.schema?.id === activeDbId) ?? null
  const activeSchema   = activeDatabase?.schema ?? null
  const activeView     = activeSchema?.views?.find(v => v.id === activeViewId) ?? null

  const computedItems = getComputedItems(items, activeSchema)

  const filteredItems = (() => {
    if (!activeView || !activeSchema) return computedItems
    try {
      return applySorts(
        applyFilters(computedItems, activeView.filters ?? [], activeSchema.properties ?? []),
        activeView.sorts ?? [],
        activeSchema.properties ?? [],
      )
    } catch {
      return computedItems
    }
  })()

  const groupedItems = (() => {
    if (!activeView || !activeSchema) {
      return [{ key: '__all__', label: 'Todos', color: null, items: filteredItems }]
    }
    try {
      return applyGrouping(filteredItems, activeView.groupBy, activeSchema.properties ?? [])
    } catch {
      return [{ key: '__all__', label: 'Todos', color: null, items: filteredItems }]
    }
  })()

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
      prev.map(d => d.schema?.id === activeDbId ? { ...d, schema: newSchema } : d)
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
    scheduleSchemaUpdate({ ...activeSchema, properties: [...activeSchema.properties, newProp] })
    return newProp
  }

  function updateProperty(propId, patch) {
    if (!activeSchema) return
    scheduleSchemaUpdate({
      ...activeSchema,
      properties: activeSchema.properties.map(p => p.id === propId ? { ...p, ...patch } : p),
    })
  }

  function deleteProperty(propId) {
    if (!activeSchema) return
    scheduleSchemaUpdate({
      ...activeSchema,
      properties: activeSchema.properties.filter(p => p.id !== propId).map((p, i) => ({ ...p, order: i })),
    })
  }

  function reorderProperties(orderedIds) {
    if (!activeSchema) return
    const map = Object.fromEntries(activeSchema.properties.map(p => [p.id, p]))
    scheduleSchemaUpdate({
      ...activeSchema,
      properties: orderedIds.map((id, i) => ({ ...map[id], order: i })),
    })
  }

  function addView(name, type) {
    if (!activeSchema) return
    const newView = createView(name, type)
    newView.order = activeSchema.views.length
    scheduleSchemaUpdate({ ...activeSchema, views: [...activeSchema.views, newView] })
    setActiveViewId(newView.id)
    return newView
  }

  function updateView(viewId, patch) {
    if (!activeSchema) return
    scheduleSchemaUpdate({
      ...activeSchema,
      views: activeSchema.views.map(v => v.id === viewId ? { ...v, ...patch } : v),
    })
  }

  function deleteView(viewId) {
    if (!activeSchema) return
    const remaining = activeSchema.views.filter(v => v.id !== viewId)
    scheduleSchemaUpdate({ ...activeSchema, views: remaining })
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
      if (tpl) mergedProps = { ...tpl.defaultProperties, ...initialProps }
    }

    const titleProp = activeSchema.properties.find(p => p.type === PROPERTY_TYPES.TITLE)
    if (titleProp && !mergedProps[titleProp.id]) {
      mergedProps[titleProp.id] = { type: PROPERTY_TYPES.TITLE, value: '' }
    }

    const { item: newItem, schema: updatedSchema } =
      await createDatabaseItem_drive(activeDatabase.folderId, activeSchema, mergedProps, accessToken)

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
    await updateItem({
      ...item,
      properties: {
        ...item.properties,
        [datePropId]: { type: PROPERTY_TYPES.DATE, value: newDateStr },
      },
    })
  }

  // ─── Helpers ─────────────────────────────────────────────────

  function getItemColor(item) {
    if (!activeView?.conditionalColors?.length || !activeSchema || !item) return null
    try {
      return evaluateConditionalColor(item, activeView.conditionalColors, activeSchema, computedItems)
    } catch {
      return null
    }
  }

  function getComputedValue(item, propId) {
    return item?._computed?.[propId] ?? null
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
