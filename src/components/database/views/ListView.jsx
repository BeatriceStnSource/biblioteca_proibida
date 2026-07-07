/**
 * ListView.jsx — View de lista compacta do database
 *
 * Ideal para listas longas: título + propriedades inline à direita.
 */

import React, { useState } from 'react'
import { useDatabaseContext as useDatabase } from '../../../contexts/DatabaseContext.jsx'
import { PROPERTY_TYPES, TAG_COLORS } from '../../../lib/constants.js'
import { formatPropertyValue } from '../../../lib/database.js'

function Tag({ name, color }) {
  const colors = TAG_COLORS[color] ?? TAG_COLORS.default
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-sans font-medium whitespace-nowrap"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {name}
    </span>
  )
}

function InlinePropValue({ item, prop }) {
  const value = item.properties?.[prop.id]?.value ?? null
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) return null

  switch (prop.type) {
    case PROPERTY_TYPES.CHECKBOX:
      return value ? (
        <span className="text-ouro text-xs font-sans flex items-center gap-1">
          <span className="w-3.5 h-3.5 rounded border border-ouro bg-ouro flex items-center justify-center text-texto text-[9px]">✓</span>
          {prop.name}
        </span>
      ) : null

    case PROPERTY_TYPES.SELECT:
    case PROPERTY_TYPES.STATUS: {
      const opt = prop.options?.find(o => o.id === value)
      if (!opt) return null
      return <Tag name={opt.name} color={opt.color} />
    }

    case PROPERTY_TYPES.MULTISELECT: {
      const ids = Array.isArray(value) ? value : []
      const opts = ids.map(id => prop.options?.find(o => o.id === id)).filter(Boolean)
      return (
        <div className="flex flex-wrap gap-1">
          {opts.map(o => <Tag key={o.id} name={o.name} color={o.color} />)}
        </div>
      )
    }

    default:
      return (
        <span className="text-xs font-sans text-texto-suave">
          {formatPropertyValue(value, prop)}
        </span>
      )
  }
}

function ListItem({ item, visibleProps, titleProp, onDelete, onClick }) {
  const [hovered, setHovered] = useState(false)
  const titleValue = item.properties?.[titleProp?.id]?.value ?? 'Sem título'

  const nonTitleProps = visibleProps.filter(
    p => p.id !== titleProp?.id && p.type !== PROPERTY_TYPES.TITLE
  )

  return (
    <div
      className="flex items-center gap-4 px-4 py-2.5 border-b border-borda/20 hover:bg-superficie/20 group transition-colors cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Ícone de página */}
      <span className="text-base shrink-0 text-texto-suave/50">📄</span>

      {/* Título */}
      <span className="font-serif text-card text-sm font-medium truncate flex-1 min-w-0">
        {titleValue || <span className="text-texto-suave italic">Sem título</span>}
      </span>

      {/* Propriedades inline */}
      <div className="flex items-center gap-3 shrink-0 flex-wrap">
        {nonTitleProps.slice(0, 4).map(prop => (
          <InlinePropValue key={prop.id} item={item} prop={prop} />
        ))}
      </div>

      {/* Botão de remover */}
      {hovered && (
        <button
          className="shrink-0 text-xs text-texto-suave/40 hover:text-vermelho-erro transition-colors ml-2"
          onClick={e => { e.stopPropagation(); onDelete(item._fileId) }}
          title="Remover"
        >
          ✕
        </button>
      )}
    </div>
  )
}

function ListGroup({ group, visibleProps, titleProp, onDelete, onAdd }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div>
      {group.key !== '__all__' && (
        <div className="flex items-center gap-2 px-4 py-2 bg-fundo/40 border-b border-borda/20">
          <button
            className="text-xs text-texto-suave hover:text-card"
            onClick={() => setCollapsed(c => !c)}
          >
            {collapsed ? '▶' : '▼'}
          </button>
          <span className="font-serif text-card text-sm font-medium">{group.label}</span>
          <span className="text-xs font-sans text-texto-suave">({group.items.length})</span>
        </div>
      )}

      {!collapsed && (
        <>
          {group.items.map(item => (
            <ListItem
              key={item.id}
              item={item}
              visibleProps={visibleProps}
              titleProp={titleProp}
              onDelete={onDelete}
              onClick={() => {}}
            />
          ))}
          <div className="px-4 py-2 border-b border-borda/10">
            <button
              className="text-xs font-sans text-texto-suave hover:text-card transition-colors"
              onClick={onAdd}
            >
              + Nova entrada
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function ListView() {
  const {
    schema, groups, activeView,
    addItem, removeItem,
  } = useDatabase()

  const titleProp = schema.properties.find(p => p.type === PROPERTY_TYPES.TITLE)
  const visibleProps = schema.properties.filter(
    p => !(activeView?.hiddenProperties ?? []).includes(p.id)
  )
  const isGrouped = !!activeView?.groupBy

  return (
    <div>
      {/* Cabeçalho de colunas */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-borda/40 bg-superficie/30">
        <span className="w-5 shrink-0" />
        <span className="font-sans text-xs text-texto-suave font-medium flex-1">Nome</span>
        <div className="flex items-center gap-6 shrink-0">
          {visibleProps
            .filter(p => p.type !== PROPERTY_TYPES.TITLE)
            .slice(0, 4)
            .map(prop => (
              <span key={prop.id} className="text-xs font-sans text-texto-suave">{prop.name}</span>
            ))}
        </div>
        <span className="w-6 shrink-0" />
      </div>

      {isGrouped ? (
        groups.map(group => (
          <ListGroup
            key={group.key}
            group={group}
            visibleProps={visibleProps}
            titleProp={titleProp}
            onDelete={removeItem}
            onAdd={() => {
              const groupProp = schema.properties.find(p => p.id === activeView.groupBy)
              const initialProps = {}
              if (groupProp && group.key !== '__empty__') {
                initialProps[groupProp.id] = { type: groupProp.type, value: group.key }
              }
              addItem(initialProps)
            }}
          />
        ))
      ) : (
        <>
          {groups[0]?.items.map(item => (
            <ListItem
              key={item.id}
              item={item}
              visibleProps={visibleProps}
              titleProp={titleProp}
              onDelete={removeItem}
              onClick={() => {}}
            />
          ))}
          <div className="px-4 py-3 border-b border-borda/10">
            <button
              className="text-xs font-sans text-texto-suave hover:text-card transition-colors"
              onClick={() => addItem()}
            >
              + Nova entrada
            </button>
          </div>
        </>
      )}
    </div>
  )
}
