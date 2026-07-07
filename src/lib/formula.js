/**
 * formula.js — Motor de avaliação de fórmulas do database
 *
 * Implementa o subconjunto de funções definido em FORMULA_FUNCTIONS.
 * Avalia uma string de fórmula em contexto de item + schema.
 *
 * Uso:
 *   evaluateFormula(formulaStr, item, schema, allItems)
 *   → valor calculado (number | string | boolean | null)
 *
 * Exemplos de fórmulas:
 *   prop("Capítulos lidos") / prop("Total") * 100
 *   if(prop("Lido?"), "✓ Concluído", "Em andamento")
 *   dateBetween(now(), prop("Criado em"), "days")
 *   "Livro #" + format(prop("ID único"))
 */

import { PROPERTY_TYPES } from './constants.js'

// ─── Helpers internos ─────────────────────────────────────────────

function toNumber(v) {
  if (v == null || v === '') return 0
  if (typeof v === 'boolean') return v ? 1 : 0
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

function toStr(v) {
  if (v == null) return ''
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v)
}

function toDate(v) {
  if (!v) return null
  if (v instanceof Date) return v
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

function dateDiff(a, b, unit) {
  const da = toDate(a)
  const db = toDate(b)
  if (!da || !db) return 0
  const ms = da - db
  switch (unit) {
    case 'milliseconds': return ms
    case 'seconds': return Math.floor(ms / 1000)
    case 'minutes': return Math.floor(ms / 60000)
    case 'hours':   return Math.floor(ms / 3600000)
    case 'days':    return Math.floor(ms / 86400000)
    case 'weeks':   return Math.floor(ms / 604800000)
    case 'months': {
      const dy = da.getFullYear() - db.getFullYear()
      return dy * 12 + (da.getMonth() - db.getMonth())
    }
    case 'years':   return da.getFullYear() - db.getFullYear()
    default:        return Math.floor(ms / 86400000)
  }
}

// ─── Ambiente de execução seguro ──────────────────────────────────

function buildEnv(item, schema, allItems = []) {
  /**
   * prop("Nome da propriedade") — acessa valor da propriedade pelo nome
   */
  function prop(name) {
    const propDef = schema.properties.find(p => p.name === name)
    if (!propDef) return null
    const cell = item.properties?.[propDef.id]
    if (!cell) return null

    // Para relações retorna array de IDs; rollup é calculado separadamente
    return cell.value ?? null
  }

  /**
   * Retorna o Date/hora atual
   */
  function now() { return new Date() }
  function today() {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }

  /**
   * dateBetween(dateA, dateB, unit) → número de unidades entre as datas
   */
  function dateBetween(a, b, unit = 'days') {
    return dateDiff(a, b, unit)
  }

  function dateAdd(date, amount, unit = 'days') {
    const d = toDate(date)
    if (!d) return null
    const result = new Date(d)
    switch (unit) {
      case 'days':    result.setDate(result.getDate() + amount); break
      case 'weeks':   result.setDate(result.getDate() + amount * 7); break
      case 'months':  result.setMonth(result.getMonth() + amount); break
      case 'years':   result.setFullYear(result.getFullYear() + amount); break
      default:        result.setTime(result.getTime() + amount)
    }
    return result
  }

  function dateSubtract(date, amount, unit = 'days') {
    return dateAdd(date, -amount, unit)
  }

  function formatDate(date, fmt = 'DD/MM/YYYY') {
    const d = toDate(date)
    if (!d) return ''
    return fmt
      .replace('YYYY', d.getFullYear())
      .replace('MM', String(d.getMonth() + 1).padStart(2, '0'))
      .replace('DD', String(d.getDate()).padStart(2, '0'))
      .replace('HH', String(d.getHours()).padStart(2, '0'))
      .replace('mm', String(d.getMinutes()).padStart(2, '0'))
  }

  function day(date)   { return toDate(date)?.getDate() ?? 0 }
  function month(date) { return (toDate(date)?.getMonth() ?? -1) + 1 }
  function year(date)  { return toDate(date)?.getFullYear() ?? 0 }
  function hour(date)  { return toDate(date)?.getHours() ?? 0 }
  function minute(date){ return toDate(date)?.getMinutes() ?? 0 }

  // Matemáticas
  function abs(n)        { return Math.abs(toNumber(n)) }
  function ceil(n)       { return Math.ceil(toNumber(n)) }
  function floor(n)      { return Math.floor(toNumber(n)) }
  function round(n, d=0) { return Number(toNumber(n).toFixed(d)) }
  function sqrt(n)       { return Math.sqrt(toNumber(n)) }
  function pow(a, b)     { return Math.pow(toNumber(a), toNumber(b)) }
  function log(n)        { return Math.log(toNumber(n)) }
  function mod(a, b)     { return toNumber(a) % toNumber(b) }
  function min(...args)  { return Math.min(...args.flat().map(toNumber)) }
  function max(...args)  { return Math.max(...args.flat().map(toNumber)) }

  // String
  function concat(...args)    { return args.map(toStr).join('') }
  function length(s)          { return toStr(s).length }
  function contains(s, sub)   { return toStr(s).includes(toStr(sub)) }
  function replace(s, f, r)   { return toStr(s).replaceAll(toStr(f), toStr(r)) }
  function upper(s)           { return toStr(s).toUpperCase() }
  function lower(s)           { return toStr(s).toLowerCase() }
  function slice(s, a, b)     { return toStr(s).slice(a, b) }
  function trim(s)            { return toStr(s).trim() }
  function format(v)          { return toStr(v) }

  // Lógica
  function ifFn(cond, t, f)  { return cond ? t : f }
  function and(...args)       { return args.every(Boolean) }
  function or(...args)        { return args.some(Boolean) }
  function not(v)             { return !v }
  function empty(v)           {
    if (v == null) return true
    if (typeof v === 'string') return v === ''
    if (Array.isArray(v)) return v.length === 0
    return false
  }

  return {
    prop, now, today,
    dateBetween, dateAdd, dateSubtract, formatDate,
    day, month, year, hour, minute,
    abs, ceil, floor, round, sqrt, pow, log, mod, min, max,
    concat, length, contains, replace, upper, lower, slice, trim, format,
    if: ifFn, and, or, not, empty,
  }
}

// ─── Avaliador principal ──────────────────────────────────────────

/**
 * Avalia uma expressão de fórmula de forma segura.
 *
 * @param {string} formulaStr — expressão textual da fórmula
 * @param {Object} item        — item do database
 * @param {Object} schema      — schema do database (properties, etc.)
 * @param {Object[]} allItems  — todos os itens (para rollup futuro)
 * @returns {*} resultado calculado, ou null em caso de erro
 */
export function evaluateFormula(formulaStr, item, schema, allItems = []) {
  if (!formulaStr || typeof formulaStr !== 'string') return null

  try {
    const env = buildEnv(item, schema, allItems)

    // Monta a função com as variáveis do ambiente acessíveis por nome
    const keys = Object.keys(env)
    const values = keys.map(k => env[k])

    // eslint-disable-next-line no-new-func
    const fn = new Function(...keys, `"use strict"; return (${formulaStr})`)
    const result = fn(...values)

    // Normaliza o resultado
    if (result instanceof Date) return result.toISOString()
    if (result === Infinity || result === -Infinity || Number.isNaN(result)) return null
    return result
  } catch (err) {
    // Erro de parse ou runtime — retorna null silenciosamente
    console.warn('[Formula] Erro ao avaliar:', formulaStr, err.message)
    return null
  }
}

// ─── Avaliação de rollup ──────────────────────────────────────────

/**
 * Calcula um rollup: agrega valores de itens relacionados.
 *
 * @param {Object}   rollupProp   — definição da propriedade rollup
 * @param {Object}   item         — item atual
 * @param {Object}   schema       — schema do database atual
 * @param {Object[]} relatedItems — itens do database relacionado
 * @param {Object}   relatedSchema — schema do database relacionado
 */
export function evaluateRollup(rollupProp, item, schema, relatedItems, relatedSchema) {
  const { relationPropId, targetPropertyId, function: fn } = rollupProp

  // IDs dos itens relacionados via relation
  const relationCell = item.properties?.[relationPropId]
  const relatedIds = Array.isArray(relationCell?.value) ? relationCell.value : []

  // Filtra os itens relacionados que batem com os IDs
  const linked = relatedItems.filter(ri => relatedIds.includes(ri.id))

  // Extrai o valor da propriedade alvo em cada item relacionado
  const targetProp = relatedSchema?.properties?.find(p => p.id === targetPropertyId)
  const values = linked.map(ri => ri.properties?.[targetPropertyId]?.value ?? null)

  switch (fn) {
    case 'count':   return linked.length
    case 'sum':     return values.reduce((s, v) => s + toNumber(v), 0)
    case 'average': return linked.length
      ? values.reduce((s, v) => s + toNumber(v), 0) / linked.length
      : 0
    case 'min':     return values.length ? Math.min(...values.map(toNumber)) : null
    case 'max':     return values.length ? Math.max(...values.map(toNumber)) : null
    case 'list':    return values.filter(v => v != null).map(toStr).join(', ')
    case 'unique':  return [...new Set(values.filter(v => v != null).map(toStr))].length
    case 'checked': return linked.length
      ? Math.round((values.filter(Boolean).length / linked.length) * 100) + '%'
      : '0%'
    default: return null
  }
}

// ─── Avaliação de coloração condicional ──────────────────────────

/**
 * Dado um item e as regras de coloração de uma view,
 * retorna o primeiro match { id, label, bg, border } ou null.
 *
 * Estrutura de uma regra:
 * {
 *   id: uuid,
 *   propertyId: uuid,
 *   operator: string,
 *   value: any,
 *   colorId: string,   // id de CONDITIONAL_ROW_COLORS
 *   useFormula: bool,
 *   formula: string,
 * }
 */
import { CONDITIONAL_ROW_COLORS } from './constants.js'

export function evaluateConditionalColor(item, rules, schema, allItems = []) {
  if (!rules || rules.length === 0) return null

  for (const rule of rules) {
    if (rule.useFormula && rule.formula) {
      try {
        const result = evaluateFormula(rule.formula, item, schema, allItems)
        if (result) {
          return CONDITIONAL_ROW_COLORS.find(c => c.id === rule.colorId) ?? null
        }
      } catch { /* ignore */ }
      continue
    }

    const prop = schema.properties.find(p => p.id === rule.propertyId)
    if (!prop) continue

    const cell = item.properties?.[rule.propertyId]
    const value = cell?.value ?? null

    const match = testConditionalRule(value, rule, prop)
    if (match) {
      return CONDITIONAL_ROW_COLORS.find(c => c.id === rule.colorId) ?? null
    }
  }

  return null
}

function testConditionalRule(value, rule, prop) {
  const { operator, value: ruleValue } = rule

  switch (prop.type) {
    case PROPERTY_TYPES.CHECKBOX:
      if (operator === 'is_checked')     return Boolean(value)
      if (operator === 'is_not_checked') return !value
      return false

    case PROPERTY_TYPES.NUMBER: {
      const n = Number(value ?? 0)
      const v = Number(ruleValue ?? 0)
      if (operator === 'eq')  return n === v
      if (operator === 'neq') return n !== v
      if (operator === 'gt')  return n > v
      if (operator === 'lt')  return n < v
      if (operator === 'gte') return n >= v
      if (operator === 'lte') return n <= v
      if (operator === 'is_empty')     return value == null || value === ''
      if (operator === 'is_not_empty') return value != null && value !== ''
      return false
    }

    case PROPERTY_TYPES.SELECT:
    case PROPERTY_TYPES.STATUS:
      if (operator === 'is')           return value === ruleValue
      if (operator === 'is_not')       return value !== ruleValue
      if (operator === 'is_empty')     return !value
      if (operator === 'is_not_empty') return !!value
      return false

    case PROPERTY_TYPES.DATE: {
      if (operator === 'is_empty')     return !value
      if (operator === 'is_not_empty') return !!value
      if (!value) return false
      const d = new Date(value)
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      if (operator === 'is_today')  return d.toDateString() === today.toDateString()
      if (operator === 'is_past')   return d < today
      if (operator === 'is_future') return d > today
      if (operator === 'before')    return d < new Date(ruleValue)
      if (operator === 'after')     return d > new Date(ruleValue)
      return false
    }

    case PROPERTY_TYPES.TITLE:
    case PROPERTY_TYPES.TEXT: {
      const s = String(value ?? '').toLowerCase()
      const v = String(ruleValue ?? '').toLowerCase()
      if (operator === 'contains')     return s.includes(v)
      if (operator === 'not_contains') return !s.includes(v)
      if (operator === 'is')           return s === v
      if (operator === 'is_empty')     return s === ''
      if (operator === 'is_not_empty') return s !== ''
      return false
    }

    default:
      return false
  }
}
