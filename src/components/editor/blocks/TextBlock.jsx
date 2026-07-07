/**
 * TextBlock.jsx — Bloco de texto simples e variantes de título
 */
import React from 'react'
import { RichTextEditor } from '../RichText.jsx'
import { BLOCK_TYPES } from '../../../lib/constants.js'

const classMap = {
  [BLOCK_TYPES.TEXT]:     'text-editor-body font-serif text-texto',
  [BLOCK_TYPES.H1]:       'text-editor-h1 font-serif font-bold text-texto border-b border-borda/30 pb-1',
  [BLOCK_TYPES.H2]:       'text-editor-h2 font-serif font-semibold text-texto',
  [BLOCK_TYPES.H3]:       'text-editor-h3 font-serif font-semibold text-texto',
  [BLOCK_TYPES.QUOTE]:    'text-editor-body font-serif italic text-texto-suave border-l-4 border-ouro pl-4',
}

const placeholders = {
  [BLOCK_TYPES.TEXT]:  'Escreva algo ou digite / para comandos…',
  [BLOCK_TYPES.H1]:    'Título 1',
  [BLOCK_TYPES.H2]:    'Título 2',
  [BLOCK_TYPES.H3]:    'Título 3',
  [BLOCK_TYPES.QUOTE]: 'Citação…',
}

export function TextBlock({ block, onChange, onKeyDown, autoFocus }) {
  return (
    <RichTextEditor
      segments={block.segments ?? []}
      onChange={segs => onChange({ segments: segs })}
      onKeyDown={onKeyDown}
      placeholder={placeholders[block.type]}
      className={classMap[block.type] || classMap[BLOCK_TYPES.TEXT]}
      autoFocus={autoFocus}
      singleLine={block.type === BLOCK_TYPES.H1 || block.type === BLOCK_TYPES.H2 || block.type === BLOCK_TYPES.H3}
    />
  )
}
