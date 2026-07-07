/**
 * GalleryView.jsx — View de galeria do database
 *
 * Ideal para o tema biblioteca: exibe cards com capa/imagem,
 * título e propriedades selecionadas.
 *
 * Funcionalidades:
 * - Tamanho de card: pequeno, médio, grande
 * - Propriedade de capa configurável
 * - Mostrar/ocultar propriedades no card
 * - Agrupamento por propriedade
 */

import React, { useState } from 'react'
import { useDatabaseContext as useDatabase } from '../../../contexts/DatabaseContext.jsx'
import { PROPERTY_TYPES, TAG_COLORS } from '../../../lib/constants.js'
import { formatPropertyValue } from '../../../lib/database.js'

// ─── Tag inline (para select/multiselect nos cards) ───────────────

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

// ─── Valor resumido de propriedade (somente leitura para o card) ──

function PropValue({ item, prop }) {
  const value = item.properties?.[prop.id]?.value ?? null

  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) return null

  switch (prop.type) {
    case PROPERTY_TYPES.CHECKBOX:
      return value ? <span className="text-ouro text-xs">✓ {prop.name}</span> : null

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
        <span className="text-[11px] font-sans text-texto-suave truncate">
          {formatPropertyValue(value, prop)}
        </span>
      )
  }
}

// ─── Tamanhos disponíveis ────────────────────────────────────────

const SIZE_CONFIG = {
  small:  { grid: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5', imageH: 'h-24' },
  medium: { grid: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',               imageH: 'h-36' },
  large:  { grid: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',               imageH: 'h-52' },
}

// ─── Card individual ──────────────────────────────────────────────

function GalleryCard({ item, visibleProps, titleProp, coverPropId, imageH, onDelete }) {
  const [hovered, setHovered] = useState(false)

  const titleValue = item.properties?.[titleProp?.id]?.value ?? 'Sem título'

  // Determina imagem de capa
  const coverProp = coverPropId ? visibleProps.find(p => p.id === coverPropId) : null
  const coverUrl = coverProp ? item.properties?.[coverPropId]?.value : null

  const nonTitleProps = visibleProps.filter(
    p => p.id !== titleProp?.id && p.type !== PROPERTY_TYPES.TITLE
  )

  return (
    <div
      className="card-livro rounded-lg overflow-hidden border border-borda/30 hover:border-ouro/40 transition-all group relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Botão de remover */}
      {hovered && (
        <button
          className="absolute top-2 right-2 z-10 w-6 h-6 bg-fundo/80 rounded-full text-xs text-texto-suave hover:text-vermelho-erro transition-colors flex items-center justify-center"
          onClick={() => onDelete(item._fileId)}
          title="Remover"
        >
          ✕
        </button>
      )}

      {/* Imagem de capa ou placeholder */}
      <div className={`${imageH} bg-superficie flex items-center justify-center overflow-hidden`}>
        {coverUrl ? (
          <img src={coverUrl} alt={titleValue} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl opacity-20">📖</span>
        )}
      </div>

      {/* Lombada dourada */}
      <div
        className="absolute left-0 top-0 h-full w-1"
        style={{ background: 'linear-gradient(to right, #C9A84C 0%, #E8C96A 40%, #C9A84C 100%)' }}
      />

      {/* Conteúdo */}
      <div className="p-3 bg-card">
        <p className="font-serif text-texto text-sm font-semibold leading-tight mb-2 line-clamp-2">
          {titleValue}
        </p>
        <div className="flex flex-col gap-1">
          {nonTitleProps.slice(0, 3).map(prop => (
            <PropValue key={prop.id} item={item} prop={prop} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Grupo de galeria ─────────────────────────────────────────────

function GalleryGroup({ group, visibleProps, titleProp, coverPropId, sizeConfig, onAdd, onDelete }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="mb-8">
      {group.key !== '__all__' && (
        <div className="flex items-center gap-2 mb-4">
          <button
            className="text-xs text-texto-suave hover:text-card transition-colors"
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
          <div className={`grid ${sizeConfig.grid} gap-4`}>
            {group.items.map(item => (
              <GalleryCard
                key={item.id}
                item={item}
                visibleProps={visibleProps}
                titleProp={titleProp}
                coverPropId={coverPropId}
                imageH={sizeConfig.imageH}
                onDelete={onDelete}
              />
            ))}

            {/* Card de nova entrada */}
            <button
              className="border-2 border-dashed border-borda/40 hover:border-ouro/50 rounded-lg flex flex-col items-center justify-center gap-2 text-texto-suave hover:text-card transition-all min-h-[120px]"
              onClick={onAdd}
            >
              <span className="text-2xl">+</span>
              <span className="text-xs font-sans">Nova entrada</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── GalleryView principal ────────────────────────────────────────

export default function GalleryView() {
  const {
    schema, groups, activeView,
    addItem, removeItem,
  } = useDatabase()

  const [cardSize, setCardSize] = useState('medium')
  const sizeConfig = SIZE_CONFIG[cardSize]

  const titleProp = schema.properties.find(p => p.type === PROPERTY_TYPES.TITLE)
  const visibleProps = schema.properties.filter(
    p => !(activeView?.hiddenProperties ?? []).includes(p.id)
  )

  // Encontra propriedade de imagem para capa (primeira prop do tipo image ou url)
  const coverPropId = schema.properties.find(
    p => p.type === PROPERTY_TYPES.IMAGE || (p.type === PROPERTY_TYPES.URL && p.name.toLowerCase().includes('capa'))
  )?.id ?? null

  const isGrouped = !!activeView?.groupBy

  return (
    <div className="p-6">
      {/* Controles de tamanho */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs font-sans text-texto-suave">Tamanho:</span>
        {Object.keys(SIZE_CONFIG).map(size => (
          <button
            key={size}
            onClick={() => setCardSize(size)}
            className={`px-2 py-1 text-xs font-sans rounded transition-colors ${
              cardSize === size
                ? 'bg-ouro text-texto font-medium'
                : 'text-texto-suave hover:text-card'
            }`}
          >
            {{ small: 'Pequeno', medium: 'Médio', large: 'Grande' }[size]}
          </button>
        ))}
      </div>

      {/* Grupos / itens */}
      {isGrouped ? (
        groups.map(group => (
          <GalleryGroup
            key={group.key}
            group={group}
            visibleProps={visibleProps}
            titleProp={titleProp}
            coverPropId={coverPropId}
            sizeConfig={sizeConfig}
            onAdd={() => {
              const groupProp = schema.properties.find(p => p.id === activeView.groupBy)
              const initialProps = {}
              if (groupProp && group.key !== '__empty__') {
                initialProps[groupProp.id] = { type: groupProp.type, value: group.key }
              }
              addItem(initialProps)
            }}
            onDelete={removeItem}
          />
        ))
      ) : (
        <div className={`grid ${sizeConfig.grid} gap-4`}>
          {groups[0]?.items.map(item => (
            <GalleryCard
              key={item.id}
              item={item}
              visibleProps={visibleProps}
              titleProp={titleProp}
              coverPropId={coverPropId}
              imageH={sizeConfig.imageH}
              onDelete={removeItem}
            />
          ))}

          {/* Nova entrada */}
          <button
            className="border-2 border-dashed border-borda/40 hover:border-ouro/50 rounded-lg flex flex-col items-center justify-center gap-2 text-texto-suave hover:text-card transition-all min-h-[120px]"
            onClick={() => addItem()}
          >
            <span className="text-2xl">+</span>
            <span className="text-xs font-sans">Nova entrada</span>
          </button>
        </div>
      )}
    </div>
  )
}
