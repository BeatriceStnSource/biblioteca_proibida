/**
 * ListBlocks.jsx — Bullet, Numerado e Todo
 */
import React from 'react'
import { RichTextEditor } from '../RichText.jsx'

export function BulletBlock({ block, onChange, onKeyDown, autoFocus }) {
  const level = block.props?.level ?? 0
  return (
    <div className="flex items-start gap-2" style={{ paddingLeft: level * 20 }}>
      <span className="mt-1 text-destaque text-base leading-none select-none shrink-0">•</span>
      <RichTextEditor
        segments={block.segments ?? []}
        onChange={segs => onChange({ segments: segs })}
        onKeyDown={onKeyDown}
        placeholder="Item de lista…"
        className="flex-1 text-editor-body font-serif text-texto"
        autoFocus={autoFocus}
      />
    </div>
  )
}

export function NumberedBlock({ block, index = 1, onChange, onKeyDown, autoFocus }) {
  const level = block.props?.level ?? 0
  return (
    <div className="flex items-start gap-2" style={{ paddingLeft: level * 20 }}>
      <span className="mt-0.5 text-sm font-sans text-destaque shrink-0 min-w-[1.25rem] text-right">
        {index}.
      </span>
      <RichTextEditor
        segments={block.segments ?? []}
        onChange={segs => onChange({ segments: segs })}
        onKeyDown={onKeyDown}
        placeholder="Item numerado…"
        className="flex-1 text-editor-body font-serif text-texto"
        autoFocus={autoFocus}
      />
    </div>
  )
}

export function TodoBlock({ block, onChange, onKeyDown, autoFocus }) {
  const checked = block.props?.checked ?? false
  return (
    <div className="flex items-start gap-2">
      <button
        onMouseDown={e => e.preventDefault()}
        onClick={() => onChange({ props: { ...block.props, checked: !checked } })}
        className={`
          mt-1 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center
          transition-colors duration-150
          ${checked
            ? 'bg-destaque border-destaque text-card'
            : 'border-borda hover:border-ouro bg-transparent'}
        `}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
      <RichTextEditor
        segments={block.segments ?? []}
        onChange={segs => onChange({ segments: segs })}
        onKeyDown={onKeyDown}
        placeholder="Tarefa…"
        className={`flex-1 text-editor-body font-serif text-texto ${checked ? 'line-through text-texto-suave' : ''}`}
        autoFocus={autoFocus}
      />
    </div>
  )
}
