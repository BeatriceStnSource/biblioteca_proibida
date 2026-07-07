/**
 * blocks.js — Fábrica e utilitários de blocos
 *
 * Todos os blocos usam o schema com `segments` (Fase 2).
 * Blocos legados com `content: string` são normalizados
 * automaticamente pela função `normalizeBlock`.
 */

import { BLOCK_TYPES } from './constants.js'

// ─── Fábrica ──────────────────────────────────────────────────────

/**
 * Cria um bloco novo com ID gerado.
 * @param {string} type — ver BLOCK_TYPES
 * @param {string} [text] — texto inicial
 * @param {Object} [props] — propriedades extras por tipo
 */
export function createBlock(type = BLOCK_TYPES.TEXT, text = '', props = {}) {
  return {
    id: crypto.randomUUID(),
    type,
    segments: text ? [{ text, marks: [] }] : [],
    props,
    children: [],
  }
}

// ─── Normalização retrocompatível ─────────────────────────────────

/**
 * Converte bloco legado (content: string) para o schema com segments.
 * Se o bloco já tem `segments`, retorna sem alteração.
 */
export function normalizeBlock(block) {
  if (block.segments) return block

  return {
    ...block,
    segments: block.content ? [{ text: block.content, marks: [] }] : [],
    children: block.children ?? [],
    // mantém content para compatibilidade de leitura, mas segments tem prioridade
  }
}

/**
 * Normaliza recursivamente uma lista de blocos.
 */
export function normalizeBlocks(blocks = []) {
  return blocks.map(b => ({
    ...normalizeBlock(b),
    children: normalizeBlocks(b.children),
  }))
}

// ─── Texto extraído (para busca, preview etc.) ─────────────────────

/**
 * Retorna o texto puro de um bloco (sem marks).
 */
export function blockToText(block) {
  if (block.segments) {
    return block.segments.map(s => s.text).join('')
  }
  return block.content ?? ''
}

// ─── Utilitários de lista ─────────────────────────────────────────

/**
 * Insere um bloco após o bloco com o dado ID.
 */
export function insertAfter(blocks, afterId, newBlock) {
  const idx = blocks.findIndex(b => b.id === afterId)
  if (idx === -1) return [...blocks, newBlock]
  return [
    ...blocks.slice(0, idx + 1),
    newBlock,
    ...blocks.slice(idx + 1),
  ]
}

/**
 * Remove um bloco por ID.
 */
export function removeBlock(blocks, id) {
  return blocks.filter(b => b.id !== id)
}

/**
 * Atualiza um bloco por ID (merge superficial).
 */
export function updateBlock(blocks, id, patch) {
  return blocks.map(b => b.id === id ? { ...b, ...patch } : b)
}

// ─── Tipos de bloco que aceitam texto ─────────────────────────────
const TEXT_TYPES = new Set([
  BLOCK_TYPES.TEXT,
  BLOCK_TYPES.H1,
  BLOCK_TYPES.H2,
  BLOCK_TYPES.H3,
  BLOCK_TYPES.BULLET,
  BLOCK_TYPES.NUMBERED,
  BLOCK_TYPES.TODO,
  BLOCK_TYPES.QUOTE,
  BLOCK_TYPES.CALLOUT,
  BLOCK_TYPES.CODE,
])

export function isTextBlock(type) {
  return TEXT_TYPES.has(type)
}
