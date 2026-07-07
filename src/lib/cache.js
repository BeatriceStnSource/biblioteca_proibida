/**
 * cache.js — Cache local usando IndexedDB via idb-keyval
 *
 * Persiste entre sessões. Reduz chamadas ao Drive e melhora a percepção
 * de velocidade ao abrir páginas visitadas recentemente.
 */

import { get, set, del, keys } from 'idb-keyval'

const PREFIX_PAGE     = 'page:'
const PREFIX_SCHEMA   = 'schema:'
const PREFIX_LIBRARY  = 'lib:'

// ─── Páginas ──────────────────────────────────────────────────────
export async function cachePage(fileId, data) {
  await set(`${PREFIX_PAGE}${fileId}`, data)
}

export async function getCachedPage(fileId) {
  try {
    return await get(`${PREFIX_PAGE}${fileId}`)
  } catch {
    return null
  }
}

export async function invalidatePage(fileId) {
  await del(`${PREFIX_PAGE}${fileId}`)
}

// ─── Schemas de database ──────────────────────────────────────────
export async function cacheSchema(dbId, data) {
  await set(`${PREFIX_SCHEMA}${dbId}`, data)
}

export async function getCachedSchema(dbId) {
  try {
    return await get(`${PREFIX_SCHEMA}${dbId}`)
  } catch {
    return null
  }
}

// ─── Metadados de biblioteca ──────────────────────────────────────
export async function cacheLibrary(libId, data) {
  await set(`${PREFIX_LIBRARY}${libId}`, data)
}

export async function getCachedLibrary(libId) {
  try {
    return await get(`${PREFIX_LIBRARY}${libId}`)
  } catch {
    return null
  }
}

// ─── Limpar tudo ──────────────────────────────────────────────────
export async function clearAll() {
  const allKeys = await keys()
  await Promise.all(allKeys.map(k => del(k)))
}
