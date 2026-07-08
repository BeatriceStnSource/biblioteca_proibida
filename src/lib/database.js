/**
 * database.js — Operações de Database no Google Drive
 *
 * Atualizado na Fase 4:
 *  - Suporte a unique_id (auto-incremento)
 *  - Suporte a relation / rollup / formula no schema
 *  - Templates de database
 *  - Coloração condicional por view
 *
 * Estrutura no Drive:
 *   [uuid-biblioteca]/
 *     databases/
 *       [uuid-db]/
 *         _schema.json   ← propriedades, views, config, templates
 *         [uuid-item].json  ← cada item da coleção
 */

import {
  listFiles, readFile, createFile, updateFile, deleteFile, createFolder,
} from './drive.js'
import {
  DRIVE_FILE_NAMES, DRIVE_FOLDER_NAMES,
  PROPERTY_TYPES, VIEW_TYPES, TAG_COLORS,
} from './constants.js'
import { evaluateFormula, evaluateRollup } from './formula.js'

// ─── Schema factories ─────────────────────────────────────────────

export function createDatabaseSchema({ title = 'Novo Database', icon = '🗂️' } = {}) {
  const titlePropId = crypto.randomUUID()
  const defaultViewId = crypto.randomUUID()

  return {
    id: crypto.randomUUID(),
    title,
    icon,
    cover: null,
    description: '',
    properties: [
      {
        id: titlePropId,
        name: 'Nome',
        type: PROPERTY_TYPES.TITLE,
        order: 0,
      },
    ],
    views: [
      {
        id: defaultViewId,
        name: 'Tabela',
        type: VIEW_TYPES.TABLE,
        filters: [],
        sorts: [],
        groupBy: null,
        hiddenProperties: [],
        conditionalColors: [],
        order: 0,
      },
    ],
    templates: [],
    _nextUniqueId: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function createDatabaseItem(databaseId, properties = {}) {
  return {
    id: crypto.randomUUID(),
    databaseId,
    properties,
    blocks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function createProperty(name, type, extras = {}) {
  const base = {
    id: crypto.randomUUID(),
    name,
    type,
    order: 999,
  }

  if (type === PROPERTY_TYPES.SELECT || type === PROPERTY_TYPES.MULTISELECT) {
    base.options = extras.options ?? []
  }
  if (type === PROPERTY_TYPES.STATUS) {
    base.groups = extras.groups ?? [
      { id: crypto.randomUUID(), name: 'Não iniciado', color: 'cinza',  category: 'not_started' },
      { id: crypto.randomUUID(), name: 'Em progresso', color: 'azul',   category: 'in_progress' },
      { id: crypto.randomUUID(), name: 'Concluído',    color: 'verde',  category: 'done' },
    ]
    base.options = base.groups.map(g => ({ id: g.id, name: g.name, color: g.color }))
  }
  if (type === PROPERTY_TYPES.NUMBER) {
    base.format = extras.format ?? 'number'
  }
  if (type === PROPERTY_TYPES.UNIQUE_ID) {
    base.prefix = extras.prefix ?? ''
  }
  if (type === PROPERTY_TYPES.RELATION) {
    base.targetDatabaseId    = extras.targetDatabaseId ?? null
    base.targetDatabaseTitle = extras.targetDatabaseTitle ?? ''
    base.bidirectional       = extras.bidirectional ?? false
    base.backPropertyName    = extras.backPropertyName ?? ''
  }
  if (type === PROPERTY_TYPES.ROLLUP) {
    base.relationPropId   = extras.relationPropId  ?? null
    base.targetPropertyId = extras.targetPropertyId ?? null
    base.function         = extras.function ?? 'count'
  }
  if (type === PROPERTY_TYPES.FORMULA) {
    base.formula = extras.formula ?? ''
  }

  return base
}

export function createSelectOption(name, color = 'azul') {
  return { id: crypto.randomUUID(), name, color }
}

export function createView(name, type) {
  return {
    id: crypto.randomUUID(),
    name,
    type,
    filters: [],
    sorts: [],
    groupBy: null,
    hiddenProperties: [],
    conditionalColors: [],
    order: 999,
  }
}

export function createTemplate(name, defaultProperties = {}, blocks = []) {
  return {
    id: crypto.randomUUID(),
    name,
    icon: '📝',
    defaultProperties,
    blocks,
    createdAt: new Date().toISOString(),
  }
}

async function ensureDatabasesFolder(libraryId) {
  const files = await listFiles(libraryId)
  let dbsFolder = files.find(f => f.name === DRIVE_FOLDER_NAMES.DATABASES)
  if (!dbsFolder) {
    dbsFolder = await createFolder(libraryId, DRIVE_FOLDER_NAMES.DATABASES)
  }
  return dbsFolder.id
}

export async function listDatabases(libraryId) {
  const dbsFolderId = await ensureDatabasesFolder(libraryId)
  const dbFolders = await listFiles(dbsFolderId)

  const databases = await Promise.all(
    dbFolders
      .filter(f => f.mimeType === 'application/vnd.google-apps.folder')
      .map(async folder => {
        try {
          const folderFiles = await listFiles(folder.id)
          const schemaFile = folderFiles.find(f => f.name === DRIVE_FILE_NAMES.SCHEMA)
          if (!schemaFile) return null
          const schema = await readFile(schemaFile.id)
          return { folderId: folder.id, schemaFileId: schemaFile.id, schema }
        } catch {
          return null
        }
      })
  )

  return databases.filter(Boolean)
}

export async function createDatabase(libraryId, options = {}) {
  const dbsFolderId = await ensureDatabasesFolder(libraryId)
  const schema = createDatabaseSchema(options)
  const dbFolder = await createFolder(dbsFolderId, schema.id)
  const schemaFile = await createFile(dbFolder.id, DRIVE_FILE_NAMES.SCHEMA, schema)
  return { folderId: dbFolder.id, schemaFileId: schemaFile.id, schema }
}

export async function updateDatabaseSchema(schemaFileId, schema) {
  const updated = { ...schema, updatedAt: new Date().toISOString() }
  await updateFile(schemaFileId, updated)
  return updated
}

export async function listDatabaseItems(dbFolderId) {
  const files = await listFiles(dbFolderId, 'application/json')
  const itemFiles = files.filter(f => f.name !== DRIVE_FILE_NAMES.SCHEMA)

  const items = await Promise.all(
    itemFiles.map(async f => {
      try {
        const data = await readFile(f.id)
        return { ...data, _fileId: f.id }
      } catch {
        return null
      }
    })
  )

  return items.filter(Boolean)
}

export async function createDatabaseItem_drive(dbFolderId, schema, initialProps = {}) {
  let updatedSchema = schema
  const finalProps = { ...initialProps }

  const uniqueProp = schema.properties.find(p => p.type === PROPERTY_TYPES.UNIQUE_ID)
  if (uniqueProp && !finalProps[uniqueProp.id]) {
    const counter = schema._nextUniqueId ?? 1
    const prefix  = uniqueProp.prefix ? `${uniqueProp.prefix}-` : ''
    finalProps[uniqueProp.id] = {
      type:  PROPERTY_TYPES.UNIQUE_ID,
      value: `${prefix}${String(counter).padStart(3, '0')}`,
    }
    updatedSchema = { ...schema, _nextUniqueId: counter + 1 }
  }

  const item = createDatabaseItem(schema.id, finalProps)
  const file = await createFile(dbFolderId, `${item.id}.json`, item)
  return { item: { ...item, _fileId: file.id }, schema: updatedSchema }
}

export async function updateDatabaseItem(fileId, item) {
  const updated = { ...item, updatedAt: new Date().toISOString() }
  await updateFile(fileId, updated)
  return updated
}

export async function deleteDatabaseItem(fileId) {
  await deleteFile(fileId)
}

export function computeDerivedValues(item, schema, allItems = [], relatedData = {}) {
  // Guard: item inválido ou sem properties
  if (!item || typeof item !== 'object' || !item.properties) {
    return { ...(item ?? {}), _computed: {} }
  }

  const computed = {}

  for (const prop of schema.properties) {
    if (prop.type === PROPERTY_TYPES.FORMULA) {
      computed[prop.id] = evaluateFormula(prop.formula, item, schema, allItems)
    }

    if (prop.type === PROPERTY_TYPES.ROLLUP && prop.relationPropId) {
      const relDbId = schema.properties.find(p => p.id === prop.relationPropId)?.targetDatabaseId
      if (relDbId && relatedData[relDbId]) {
        const { items: relItems, schema: relSchema } = relatedData[relDbId]
        computed[prop.id] = evaluateRollup(prop, item, schema, relItems, relSchema)
      }
    }
  }

  return { ...item, _computed: computed }
}

export function applyFilters(items, filters, properties) {
  if (!filters || filters.length === 0) return items

  return items.filter(item => {
    const results = filters.map(filter => testFilter(item, filter, properties))
    return results.reduce((acc, val, i) => {
      if (i === 0) return val
      const conj = filters[i].conjunction ?? 'and'
      return conj === 'or' ? acc || val : acc && val
    }, true)
  })
}

function testFilter(item, filter, properties) {
  const prop = properties.find(p => p.id === filter.propertyId)
  if (!prop) return true

  let value
  if (prop.type === PROPERTY_TYPES.FORMULA || prop.type === PROPERTY_TYPES.ROLLUP) {
    value = item._computed?.[prop.id] ?? null
  } else {
    value = item.properties?.[filter.propertyId]?.value ?? null
  }

  switch (prop.type) {
    case PROPERTY_TYPES.TITLE:
    case PROPERTY_TYPES.TEXT:
    case PROPERTY_TYPES.URL:
    case PROPERTY_TYPES.EMAIL:
    case PROPERTY_TYPES.PHONE:
    case PROPERTY_TYPES.UNIQUE_ID:
    case PROPERTY_TYPES.FORMULA:
      return testText(String(value ?? ''), filter)
    case PROPERTY_TYPES.NUMBER:
    case PROPERTY_TYPES.ROLLUP:
      return testNumber(value, filter)
    case PROPERTY_TYPES.SELECT:
    case PROPERTY_TYPES.STATUS:
      return testSelect(value, filter)
    case PROPERTY_TYPES.MULTISELECT:
      return testMultiselect(value, filter)
    case PROPERTY_TYPES.CHECKBOX:
      return testCheckbox(value, filter)
    case PROPERTY_TYPES.DATE:
    case PROPERTY_TYPES.CREATED_TIME:
    case PROPERTY_TYPES.EDITED_TIME:
      return testDate(value, filter)
    default:
      return true
  }
}

function testText(text, { operator, value }) {
  const t = String(text).toLowerCase()
  const v = String(value ?? '').toLowerCase()
  switch (operator) {
    case 'is':           return t === v
    case 'is_not':       return t !== v
    case 'contains':     return t.includes(v)
    case 'not_contains': return !t.includes(v)
    case 'starts_with':  return t.startsWith(v)
    case 'ends_with':    return t.endsWith(v)
    case 'is_empty':     return t === ''
    case 'is_not_empty': return t !== ''
    default:             return true
  }
}

function testNumber(num, { operator, value }) {
  if (operator === 'is_empty') return num == null || num === ''
  if (operator === 'is_not_empty') return num != null && num !== ''
  const n = Number(num)
  const v = Number(value)
  switch (operator) {
    case 'eq':  return n === v
    case 'neq': return n !== v
    case 'gt':  return n > v
    case 'lt':  return n < v
    case 'gte': return n >= v
    case 'lte': return n <= v
    default:    return true
  }
}

function testSelect(optionId, { operator, value }) {
  if (operator === 'is_empty') return !optionId
  if (operator === 'is_not_empty') return !!optionId
  if (operator === 'is')     return optionId === value
  if (operator === 'is_not') return optionId !== value
  return true
}

function testMultiselect(optionIds, { operator, value }) {
  const ids = Array.isArray(optionIds) ? optionIds : []
  if (operator === 'is_empty') return ids.length === 0
  if (operator === 'is_not_empty') return ids.length > 0
  if (operator === 'contains') return ids.includes(value)
  if (operator === 'not_contains') return !ids.includes(value)
  return true
}

function testCheckbox(checked, { operator }) {
  if (operator === 'is_checked') return Boolean(checked)
  if (operator === 'is_not_checked') return !checked
  return true
}

function testDate(dateStr, { operator, value }) {
  if (operator === 'is_empty') return !dateStr
  if (operator === 'is_not_empty') return !!dateStr
  if (!dateStr) return false

  const d = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (operator) {
    case 'is': return d.toDateString() === new Date(value).toDateString()
    case 'before': return d < new Date(value)
    case 'after':  return d > new Date(value)
    case 'is_today': return d.toDateString() === today.toDateString()
    case 'is_this_week': {
      const ws = new Date(today); ws.setDate(today.getDate() - today.getDay())
      const we = new Date(ws);    we.setDate(ws.getDate() + 6)
      return d >= ws && d <= we
    }
    case 'is_this_month':
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    default: return true
  }
}

export function applySorts(items, sorts, properties) {
  if (!sorts || sorts.length === 0) return items

  return [...items].sort((a, b) => {
    for (const sort of sorts) {
      const prop = properties.find(p => p.id === sort.propertyId)
      if (!prop) continue

      const isComputed = [PROPERTY_TYPES.FORMULA, PROPERTY_TYPES.ROLLUP].includes(prop.type)
      const aVal = isComputed
        ? a._computed?.[sort.propertyId] ?? null
        : a.properties?.[sort.propertyId]?.value ?? null
      const bVal = isComputed
        ? b._computed?.[sort.propertyId] ?? null
        : b.properties?.[sort.propertyId]?.value ?? null

      let cmp = 0

      if (prop.type === PROPERTY_TYPES.NUMBER || prop.type === PROPERTY_TYPES.ROLLUP) {
        cmp = (Number(aVal) || 0) - (Number(bVal) || 0)
      } else if (prop.type === PROPERTY_TYPES.CHECKBOX) {
        cmp = (Boolean(aVal) ? 1 : 0) - (Boolean(bVal) ? 1 : 0)
      } else if ([PROPERTY_TYPES.DATE, PROPERTY_TYPES.CREATED_TIME, PROPERTY_TYPES.EDITED_TIME].includes(prop.type)) {
        cmp = (aVal ? new Date(aVal).getTime() : 0) - (bVal ? new Date(bVal).getTime() : 0)
      } else {
        cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''), 'pt-BR')
      }

      if (cmp !== 0) return sort.direction === 'desc' ? -cmp : cmp
    }
    return 0
  })
}

export function applyGrouping(items, groupByPropId, properties) {
  if (!groupByPropId) return [{ key: '__all__', label: 'Todos', color: null, items }]

  const prop = properties.find(p => p.id === groupByPropId)
  if (!prop) return [{ key: '__all__', label: 'Todos', color: null, items }]

  const groups = new Map()

  items.forEach(item => {
    const cell = item.properties?.[groupByPropId]
    const value = cell?.value

    if (prop.type === PROPERTY_TYPES.SELECT || prop.type === PROPERTY_TYPES.STATUS) {
      const option = prop.options?.find(o => o.id === value)
      const key   = option?.id ?? '__empty__'
      const label = option?.name ?? 'Sem valor'
      const color = option?.color ?? 'default'
      if (!groups.has(key)) groups.set(key, { key, label, color, items: [] })
      groups.get(key).items.push(item)
    } else if (prop.type === PROPERTY_TYPES.MULTISELECT) {
      const ids = Array.isArray(value) ? value : []
      if (ids.length === 0) {
        if (!groups.has('__empty__')) groups.set('__empty__', { key: '__empty__', label: 'Sem valor', color: 'default', items: [] })
        groups.get('__empty__').items.push(item)
      } else {
        ids.forEach(id => {
          const option = prop.options?.find(o => o.id === id)
          const key   = option?.id ?? '__empty__'
          const label = option?.name ?? 'Sem valor'
          const color = option?.color ?? 'default'
          if (!groups.has(key)) groups.set(key, { key, label, color, items: [] })
          groups.get(key).items.push(item)
        })
      }
    } else if (prop.type === PROPERTY_TYPES.CHECKBOX) {
      const key   = value ? 'checked' : 'unchecked'
      const label = value ? 'Marcado' : 'Não marcado'
      if (!groups.has(key)) groups.set(key, { key, label, color: null, items: [] })
      groups.get(key).items.push(item)
    } else if (prop.type === PROPERTY_TYPES.DATE) {
      const key   = value ? value.slice(0, 7) : '__empty__'
      const label = value
        ? new Date(value + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        : 'Sem data'
      if (!groups.has(key)) groups.set(key, { key, label, color: null, items: [] })
      groups.get(key).items.push(item)
    } else {
      const key   = String(value ?? '__empty__')
      const label = key === '__empty__' ? 'Sem valor' : key
      if (!groups.has(key)) groups.set(key, { key, label, color: null, items: [] })
      groups.get(key).items.push(item)
    }
  })

  if (groups.size === 0) groups.set('__empty__', { key: '__empty__', label: 'Sem valor', color: 'default', items: [] })

  return Array.from(groups.values())
}

export function calcFooter(items, propertyId, calcType) {
  const values = items
    .map(item => item.properties?.[propertyId]?.value)
    .filter(v => v != null && v !== '')

  switch (calcType) {
    case 'count_all':    return items.length
    case 'count':        return values.length
    case 'count_empty':  return items.length - values.length
    case 'count_unique': return new Set(values.map(String)).size
    case 'sum':          return values.reduce((s, v) => s + Number(v || 0), 0)
    case 'avg':          return values.length ? (values.reduce((s, v) => s + Number(v || 0), 0) / values.length).toFixed(2) : 0
    case 'min':          return values.length ? Math.min(...values.map(Number)) : null
    case 'max':          return values.length ? Math.max(...values.map(Number)) : null
    case 'percent_checked':
      return items.length ? Math.round((values.filter(Boolean).length / items.length) * 100) + '%' : '0%'
    default: return null
  }
}

export function getItemTitle(item, properties) {
  const titleProp = properties.find(p => p.type === PROPERTY_TYPES.TITLE)
  if (!titleProp) return 'Sem título'
  return item.properties?.[titleProp.id]?.value || 'Sem título'
}

export function formatPropertyValue(value, prop) {
  if (value == null || value === '') return ''

  switch (prop.type) {
    case PROPERTY_TYPES.CHECKBOX:
      return value ? '✓' : ''
    case PROPERTY_TYPES.DATE:
    case PROPERTY_TYPES.CREATED_TIME:
    case PROPERTY_TYPES.EDITED_TIME:
      try {
        return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
      } catch { return value }
    case PROPERTY_TYPES.NUMBER: {
      const n = Number(value)
      if (isNaN(n)) return String(value)
      switch (prop.format) {
        case 'currency': return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        case 'percent':  return n.toLocaleString('pt-BR') + '%'
        case 'scientific': return n.toExponential(2)
        default:         return n.toLocaleString('pt-BR')
      }
    }
    case PROPERTY_TYPES.SELECT:
    case PROPERTY_TYPES.STATUS: {
      const option = prop.options?.find(o => o.id === value)
      return option?.name ?? String(value)
    }
    case PROPERTY_TYPES.MULTISELECT: {
      const ids = Array.isArray(value) ? value : []
      return ids.map(id => prop.options?.find(o => o.id === id)?.name ?? id).join(', ')
    }
    case PROPERTY_TYPES.UNIQUE_ID:
      return String(value)
    case PROPERTY_TYPES.RELATION: {
      const items = Array.isArray(value) ? value : []
      return items.map(r => r.title ?? r.id).join(', ')
    }
    case PROPERTY_TYPES.FORMULA:
    case PROPERTY_TYPES.ROLLUP:
      if (typeof value === 'boolean') return value ? '✓' : ''
      if (value instanceof Date)      return value.toLocaleDateString('pt-BR')
      return String(value)
    default:
      return String(value)
  }
}
