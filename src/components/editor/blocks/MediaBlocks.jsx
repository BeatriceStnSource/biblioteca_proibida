/**
 * MediaBlocks.jsx — Callout, Code, Divider, Image, Video, Audio, Arquivo, Bookmark, Embed
 */
import React, { useState, useRef } from 'react'
import { RichTextEditor } from '../RichText.jsx'

// ─── Callout ──────────────────────────────────────────────────────

const CALLOUT_COLORS = {
  amarelo: { bg: 'rgba(251,243,219,0.9)', border: '#CB912F', text: '#2C1810' },
  azul:    { bg: 'rgba(211,229,239,0.9)', border: '#337EA9', text: '#1a3a4a' },
  verde:   { bg: 'rgba(219,237,219,0.9)', border: '#448361', text: '#1a3020' },
  vermelho:{ bg: 'rgba(255,226,221,0.9)', border: '#D44C47', text: '#4a1a1a' },
  roxo:    { bg: 'rgba(232,222,238,0.9)', border: '#9065B0', text: '#2a1a3a' },
  default: { bg: 'rgba(241,236,226,0.9)', border: '#8B4513', text: '#2C1810' },
}

export function CalloutBlock({ block, onChange, onKeyDown, autoFocus }) {
  const icon  = block.props?.icon  ?? '💡'
  const color = block.props?.color ?? 'default'
  const theme = CALLOUT_COLORS[color] ?? CALLOUT_COLORS.default

  return (
    <div
      className="flex gap-3 p-3 rounded border-l-4"
      style={{ backgroundColor: theme.bg, borderColor: theme.border }}
    >
      <span
        className="text-xl shrink-0 cursor-pointer select-none"
        title="Clique para mudar emoji"
        onClick={() => {
          const newIcon = window.prompt('Emoji do callout:', icon)
          if (newIcon !== null) onChange({ props: { ...block.props, icon: newIcon || '💡' } })
        }}
      >
        {icon}
      </span>
      <RichTextEditor
        segments={block.segments ?? []}
        onChange={segs => onChange({ segments: segs })}
        onKeyDown={onKeyDown}
        placeholder="Nota de destaque…"
        className="flex-1 text-editor-body font-serif"
        style={{ color: theme.text }}
        autoFocus={autoFocus}
      />
    </div>
  )
}

// ─── Code ─────────────────────────────────────────────────────────

const LANGUAGES = ['javascript','typescript','python','rust','go','java','c','cpp','css','html','bash','json','sql','yaml','markdown','plain']

export function CodeBlock({ block, onChange, onKeyDown, autoFocus }) {
  const language = block.props?.language ?? 'plain'
  const text = (block.segments ?? []).map(s => s.text).join('')

  return (
    <div className="rounded border border-borda overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-fundo/80 px-3 py-1.5 border-b border-borda">
        <select
          value={language}
          onChange={e => onChange({ props: { ...block.props, language: e.target.value } })}
          className="text-xs font-mono text-ouro bg-transparent border-none outline-none cursor-pointer"
        >
          {LANGUAGES.map(l => (
            <option key={l} value={l} style={{ background: '#1C1610' }}>{l}</option>
          ))}
        </select>
        <button
          onClick={() => navigator.clipboard.writeText(text)}
          className="text-xs font-sans text-texto-suave hover:text-card transition-colors"
        >
          Copiar
        </button>
      </div>
      {/* Editor */}
      <textarea
        value={text}
        onChange={e => onChange({ segments: [{ text: e.target.value, marks: [] }] })}
        onKeyDown={e => {
          if (e.key === 'Tab') {
            e.preventDefault()
            const start = e.target.selectionStart
            const end   = e.target.selectionEnd
            const val   = e.target.value
            const newVal = val.slice(0, start) + '  ' + val.slice(end)
            onChange({ segments: [{ text: newVal, marks: [] }] })
            requestAnimationFrame(() => {
              e.target.selectionStart = e.target.selectionEnd = start + 2
            })
          }
        }}
        placeholder="// código…"
        className="w-full p-4 font-mono text-sm bg-superficie text-card resize-none outline-none min-h-[100px]"
        style={{ tabSize: 2 }}
        autoFocus={autoFocus}
        spellCheck={false}
      />
    </div>
  )
}

// ─── Divider ──────────────────────────────────────────────────────

export function DividerBlock() {
  return <div className="divider-ouro my-2" />
}

// ─── Image ────────────────────────────────────────────────────────

export function ImageBlock({ block, onChange }) {
  const url     = block.props?.url     ?? ''
  const caption = block.props?.caption ?? ''
  const [editing, setEditing] = useState(!url)
  const [urlInput, setUrlInput] = useState(url)

  if (editing || !url) {
    return (
      <div className="flex flex-col gap-2 p-4 border-2 border-dashed border-borda rounded bg-superficie/30 text-center">
        <span className="text-3xl">🖼</span>
        <p className="text-sm font-sans text-texto-suave">URL da imagem</p>
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { onChange({ props: { ...block.props, url: urlInput } }); setEditing(false) } }}
            placeholder="https://exemplo.com/imagem.jpg"
            className="input-biblioteca flex-1 text-sm"
            autoFocus
          />
          <button
            onClick={() => { onChange({ props: { ...block.props, url: urlInput } }); setEditing(false) }}
            className="btn-primario"
          >OK</button>
        </div>
      </div>
    )
  }

  return (
    <figure className="my-1">
      <img
        src={url}
        alt={caption}
        className="max-w-full rounded shadow-pagina"
        onClick={() => setEditing(true)}
      />
      <input
        value={caption}
        onChange={e => onChange({ props: { ...block.props, caption: e.target.value } })}
        placeholder="Legenda da imagem…"
        className="w-full text-xs font-sans text-texto-suave text-center mt-1 bg-transparent border-none outline-none focus:border-b focus:border-borda"
      />
    </figure>
  )
}

// ─── Video ────────────────────────────────────────────────────────

function getVideoEmbed(url) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\s]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`
  return url // link direto
}

export function VideoBlock({ block, onChange }) {
  const url     = block.props?.url     ?? ''
  const caption = block.props?.caption ?? ''
  const [urlInput, setUrlInput] = useState(url)

  if (!url) {
    return (
      <div className="flex flex-col gap-2 p-4 border-2 border-dashed border-borda rounded bg-superficie/30 text-center">
        <span className="text-3xl">▶️</span>
        <p className="text-sm font-sans text-texto-suave">Link do vídeo (YouTube, Vimeo, etc.)</p>
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onChange({ props: { url: urlInput } }) }}
            placeholder="https://youtube.com/watch?v=…"
            className="input-biblioteca flex-1 text-sm"
            autoFocus
          />
          <button onClick={() => onChange({ props: { url: urlInput } })} className="btn-primario">OK</button>
        </div>
      </div>
    )
  }

  const embed = getVideoEmbed(url)
  return (
    <figure>
      <div className="relative w-full rounded overflow-hidden" style={{ paddingBottom: '56.25%' }}>
        <iframe
          src={embed}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={caption || 'Vídeo'}
        />
      </div>
      <input
        value={caption}
        onChange={e => onChange({ props: { ...block.props, caption: e.target.value } })}
        placeholder="Legenda…"
        className="w-full text-xs font-sans text-texto-suave text-center mt-1 bg-transparent border-none outline-none"
      />
    </figure>
  )
}

// ─── Audio ────────────────────────────────────────────────────────

export function AudioBlock({ block, onChange }) {
  const url     = block.props?.url     ?? ''
  const caption = block.props?.caption ?? ''
  const [urlInput, setUrlInput] = useState(url)

  if (!url) {
    return (
      <div className="flex flex-col gap-2 p-3 border-2 border-dashed border-borda rounded bg-superficie/30 text-center">
        <span className="text-2xl">🎵</span>
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onChange({ props: { url: urlInput } }) }}
            placeholder="URL do arquivo de áudio…"
            className="input-biblioteca flex-1 text-sm"
            autoFocus
          />
          <button onClick={() => onChange({ props: { url: urlInput } })} className="btn-primario">OK</button>
        </div>
      </div>
    )
  }

  return (
    <figure className="bg-superficie/40 rounded p-3 border border-borda">
      <audio controls src={url} className="w-full" />
      <figcaption className="text-xs font-sans text-texto-suave mt-1 text-center">{caption}</figcaption>
    </figure>
  )
}

// ─── Arquivo ──────────────────────────────────────────────────────

export function FileBlock({ block, onChange }) {
  const url  = block.props?.url  ?? ''
  const name = block.props?.name ?? 'Arquivo'
  const size = block.props?.size ?? ''
  const [urlInput, setUrlInput] = useState(url)

  if (!url) {
    return (
      <div className="flex flex-col gap-2 p-3 border-2 border-dashed border-borda rounded bg-superficie/30 text-center">
        <span className="text-2xl">📎</span>
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onChange({ props: { url: urlInput, name: urlInput.split('/').pop() } }) }}
            placeholder="URL do arquivo…"
            className="input-biblioteca flex-1 text-sm"
            autoFocus
          />
          <button onClick={() => onChange({ props: { url: urlInput, name: urlInput.split('/').pop() } })} className="btn-primario">OK</button>
        </div>
      </div>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 rounded border border-borda bg-superficie/40 hover:bg-superficie/80 transition-colors group"
    >
      <span className="text-2xl">📎</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-sans text-card truncate group-hover:text-ouro transition-colors">{name}</p>
        {size && <p className="text-xs font-sans text-texto-suave">{size}</p>}
      </div>
      <span className="text-xs font-sans text-texto-suave shrink-0">↓ Baixar</span>
    </a>
  )
}

// ─── Bookmark ─────────────────────────────────────────────────────

export function BookmarkBlock({ block, onChange }) {
  const url         = block.props?.url         ?? ''
  const title       = block.props?.title       ?? ''
  const description = block.props?.description ?? ''
  const image       = block.props?.image       ?? ''
  const [urlInput, setUrlInput] = useState(url)
  const [loading, setLoading]   = useState(false)

  async function fetchPreview(targetUrl) {
    setLoading(true)
    try {
      // Tenta buscar metadados via allorigins (proxy CORS gratuito)
      const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`
      const res = await fetch(proxy)
      const data = await res.json()
      const html = data.contents
      const doc  = new DOMParser().parseFromString(html, 'text/html')

      const getMeta = (sel) => doc.querySelector(sel)?.getAttribute('content') ?? ''

      onChange({
        props: {
          url:         targetUrl,
          title:       getMeta('meta[property="og:title"]') || doc.querySelector('title')?.textContent || targetUrl,
          description: getMeta('meta[property="og:description"]') || getMeta('meta[name="description"]') || '',
          image:       getMeta('meta[property="og:image"]') || '',
        }
      })
    } catch {
      onChange({ props: { url: targetUrl, title: targetUrl, description: '', image: '' } })
    } finally {
      setLoading(false)
    }
  }

  if (!url) {
    return (
      <div className="flex flex-col gap-2 p-3 border-2 border-dashed border-borda rounded bg-superficie/30 text-center">
        <span className="text-2xl">🔖</span>
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') fetchPreview(urlInput) }}
            placeholder="https://exemplo.com"
            className="input-biblioteca flex-1 text-sm"
            autoFocus
          />
          <button onClick={() => fetchPreview(urlInput)} disabled={loading} className="btn-primario">
            {loading ? '…' : 'OK'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-stretch rounded border border-borda overflow-hidden hover:border-ouro transition-colors bg-superficie/40 group"
    >
      <div className="flex-1 p-3 min-w-0">
        <p className="text-sm font-sans font-medium text-card group-hover:text-ouro transition-colors truncate">{title || url}</p>
        {description && <p className="text-xs font-sans text-texto-suave mt-0.5 line-clamp-2">{description}</p>}
        <p className="text-xs font-sans text-texto-suave/60 mt-1 truncate">{url}</p>
      </div>
      {image && (
        <div className="w-24 shrink-0">
          <img src={image} alt="" className="w-full h-full object-cover" />
        </div>
      )}
    </a>
  )
}

// ─── Embed ────────────────────────────────────────────────────────

export function EmbedBlock({ block, onChange }) {
  const url     = block.props?.url     ?? ''
  const [urlInput, setUrlInput] = useState(url)

  if (!url) {
    return (
      <div className="flex flex-col gap-2 p-3 border-2 border-dashed border-borda rounded bg-superficie/30 text-center">
        <span className="text-2xl">🔌</span>
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onChange({ props: { url: urlInput } }) }}
            placeholder="URL para incorporar…"
            className="input-biblioteca flex-1 text-sm"
            autoFocus
          />
          <button onClick={() => onChange({ props: { url: urlInput } })} className="btn-primario">OK</button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded border border-borda overflow-hidden">
      <iframe
        src={url}
        className="w-full"
        style={{ height: 400 }}
        title="Conteúdo incorporado"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  )
}
