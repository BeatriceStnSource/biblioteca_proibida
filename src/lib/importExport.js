/**
 * importExport.js — Fase 5
 *
 * Import e export de conteúdo sem backend adicional.
 * Tudo roda no browser (File API + Blob + URL.createObjectURL).
 *
 * Funções exportadas:
 *
 * EXPORT
 *   exportPageAsMarkdown(page, blocks) → baixa .md
 *   exportPageAsHTML(page, blocks)     → baixa .html estilizado
 *   exportDatabaseAsCSV(schema, items) → baixa .csv
 *
 * IMPORT
 *   importMarkdownAsPage(file)         → Promise<{ title, blocks }>
 *   importCSVAsDatabase(file, schema)  → Promise<{ items }>
 */

import { PROPERTY_TYPES } from './constants.js'

// ─── Utilitários ──────────────────────────────────────────────────

function downloadBlob(content, filename, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function safeFilename(title = 'pagina') {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'pagina'
}

// ─── Blocks → Markdown ───────────────────────────────────────────

function blockToMarkdown(block) {
  const text = blockText(block)

  switch (block.type) {
    case 'h1':      return `# ${text}`
    case 'h2':      return `## ${text}`
    case 'h3':      return `### ${text}`
    case 'bullet':  {
      const indent = '  '.repeat((block.props?.level ?? 0))
      return `${indent}- ${text}`
    }
    case 'numbered': {
      const indent = '  '.repeat((block.props?.level ?? 0))
      return `${indent}1. ${text}`
    }
    case 'todo':    return `- [${block.props?.checked ? 'x' : ' '}] ${text}`
    case 'quote':   return `> ${text}`
    case 'callout': return `> **${block.props?.icon ?? '💡'}** ${text}`
    case 'code': {
      const lang = block.props?.language ?? ''
      return `\`\`\`${lang}\n${text}\n\`\`\``
    }
    case 'divider': return '---'
    case 'image':   return `![${block.props?.caption ?? ''}](${block.props?.url ?? ''})`
    case 'text':    return text || ''
    default:        return text || ''
  }
}

function blockText(block) {
  if (block.segments?.length) {
    return block.segments.map(s => {
      let t = s.text
      if (s.marks?.includes('bold'))   t = `**${t}**`
      if (s.marks?.includes('italic')) t = `*${t}*`
      if (s.marks?.includes('code'))   t = `\`${t}\``
      return t
    }).join('')
  }
  return block.content ?? ''
}

// ─── Blocks → HTML ───────────────────────────────────────────────

function blockToHTML(block) {
  const text  = blockTextHTML(block)
  const icon  = block.props?.icon ?? ''
  const lang  = block.props?.language ?? ''
  const url   = block.props?.url ?? ''
  const cap   = block.props?.caption ?? ''

  switch (block.type) {
    case 'h1': return `<h1>${text}</h1>`
    case 'h2': return `<h2>${text}</h2>`
    case 'h3': return `<h3>${text}</h3>`
    case 'bullet':   return `<li>${text}</li>`
    case 'numbered': return `<li>${text}</li>`
    case 'todo':
      return `<li class="todo"><input type="checkbox" ${block.props?.checked ? 'checked' : ''} disabled> ${text}</li>`
    case 'quote':
      return `<blockquote>${text}</blockquote>`
    case 'callout':
      return `<div class="callout"><span class="callout-icon">${icon}</span><span>${text}</span></div>`
    case 'code':
      return `<pre><code class="language-${lang}">${escapeHTML(blockText(block))}</code></pre>`
    case 'divider': return `<hr>`
    case 'image':
      return `<figure><img src="${url}" alt="${cap}"><figcaption>${cap}</figcaption></figure>`
    case 'text':
      return text ? `<p>${text}</p>` : '<p>&nbsp;</p>'
    default:
      return text ? `<p>${text}</p>` : ''
  }
}

function blockTextHTML(block) {
  if (block.segments?.length) {
    return block.segments.map(s => {
      let t = escapeHTML(s.text)
      const marks = s.marks ?? []
      if (marks.includes('bold'))      t = `<strong>${t}</strong>`
      if (marks.includes('italic'))    t = `<em>${t}</em>`
      if (marks.includes('underline')) t = `<u>${t}</u>`
      if (marks.includes('strikethrough')) t = `<s>${t}</s>`
      if (marks.includes('code'))      t = `<code>${t}</code>`
      const color = marks.find(m => m?.type === 'color')
      if (color) t = `<span style="color:${color.value}">${t}</span>`
      return t
    }).join('')
  }
  return escapeHTML(block.content ?? '')
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ─── EXPORT: Markdown ─────────────────────────────────────────────

export function exportPageAsMarkdown(page, blocks) {
  const title = page.title || 'Sem título'
  const lines = [
    `# ${title}`,
    '',
    `> *Exportado de Projeto Biblioteca em ${new Date().toLocaleDateString('pt-BR')}*`,
    '',
    ...blocks.map(blockToMarkdown).filter(l => l !== null),
  ]
  downloadBlob(lines.join('\n'), `${safeFilename(title)}.md`, 'text/markdown;charset=utf-8')
}

// ─── EXPORT: HTML ────────────────────────────────────────────────

export function exportPageAsHTML(page, blocks) {
  const title = page.title || 'Sem título'

  // Agrupar bullets/numbered consecutivos em <ul>/<ol>
  const htmlBlocks = []
  let listType = null
  let listItems = []

  function flushList() {
    if (listItems.length > 0) {
      const tag = listType === 'numbered' ? 'ol' : 'ul'
      htmlBlocks.push(`<${tag}>${listItems.join('')}</${tag}>`)
      listItems = []
      listType = null
    }
  }

  for (const block of blocks) {
    if (block.type === 'bullet' || block.type === 'numbered' || block.type === 'todo') {
      if (listType && listType !== block.type && block.type !== 'todo') flushList()
      listType = block.type
      listItems.push(blockToHTML(block))
    } else {
      flushList()
      htmlBlocks.push(blockToHTML(block))
    }
  }
  flushList()

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lora:ital@0;1&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Lora', Georgia, serif;
      background: #F5EDD6;
      color: #2C1810;
      max-width: 720px;
      margin: 0 auto;
      padding: 60px 40px;
      line-height: 1.75;
    }
    h1, h2, h3 { font-family: 'Playfair Display', Georgia, serif; margin: 1.5em 0 0.5em; color: #1C1610; }
    h1 { font-size: 2.2em; border-bottom: 2px solid #C9A84C; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.2em; }
    p  { margin: 0.75em 0; }
    ul, ol { margin: 0.75em 0; padding-left: 1.5em; }
    li { margin: 0.3em 0; }
    li.todo { list-style: none; margin-left: -1em; }
    blockquote {
      border-left: 4px solid #C9A84C;
      margin: 1em 0;
      padding: 0.5em 1em;
      background: rgba(201,168,76,0.08);
      font-style: italic;
      color: #6B4C3B;
    }
    .callout {
      display: flex; gap: 0.75em; align-items: flex-start;
      background: rgba(44,24,16,0.06);
      border-radius: 6px;
      padding: 0.75em 1em;
      margin: 1em 0;
      border: 1px solid rgba(92,61,30,0.3);
    }
    .callout-icon { font-size: 1.2em; }
    pre { background: #2A1F14; color: #F5EDD6; padding: 1em; border-radius: 6px; overflow-x: auto; margin: 1em 0; }
    code { font-family: 'Courier New', monospace; font-size: 0.9em; }
    p code { background: rgba(44,24,16,0.08); padding: 0.1em 0.3em; border-radius: 3px; }
    hr { border: none; border-top: 2px solid #5C3D1E; margin: 2em 0; }
    figure { margin: 1.5em 0; text-align: center; }
    figure img { max-width: 100%; border-radius: 6px; }
    figcaption { font-size: 0.85em; color: #6B4C3B; margin-top: 0.4em; font-style: italic; }
    .footer { margin-top: 4em; padding-top: 1em; border-top: 1px solid #5C3D1E; font-size: 0.8em; color: #6B4C3B; }
  </style>
</head>
<body>
  ${htmlBlocks.join('\n  ')}
  <div class="footer">Exportado de Projeto Biblioteca · ${new Date().toLocaleDateString('pt-BR')}</div>
</body>
</html>`

  downloadBlob(html, `${safeFilename(title)}.html`, 'text/html;charset=utf-8')
}

// ─── EXPORT: CSV (database) ───────────────────────────────────────

export function exportDatabaseAsCSV(schema, items) {
  const props = schema.properties.filter(p => !['formula', 'rollup'].includes(p.type))

  const headers = props.map(p => csvEscape(p.name))
  const rows = items.map(item =>
    props.map(p => {
      const cell = item.properties?.[p.id]
      if (!cell) return ''
      const v = cell.value
      switch (p.type) {
        case 'checkbox':    return v ? 'Sim' : 'Não'
        case 'select':
        case 'status': {
          const opt = p.options?.find(o => o.id === v)
          return opt?.name ?? ''
        }
        case 'multiselect': {
          const ids = Array.isArray(v) ? v : []
          return ids.map(id => p.options?.find(o => o.id === id)?.name ?? id).join('; ')
        }
        case 'date':
        case 'created_time':
        case 'edited_time':
          return v ? new Date(v).toLocaleDateString('pt-BR') : ''
        case 'relation': {
          const rels = Array.isArray(v) ? v : []
          return rels.map(r => r.title ?? r.id).join('; ')
        }
        default: return v != null ? String(v) : ''
      }
    }).map(csvEscape)
  )

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const bom  = '\uFEFF'  // BOM para Excel aceitar UTF-8
  downloadBlob(bom + csv, `${safeFilename(schema.title)}.csv`, 'text/csv;charset=utf-8')
}

function csvEscape(value) {
  const s = String(value ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

// ─── IMPORT: Markdown → Blocks ────────────────────────────────────

export function importMarkdownAsPage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const md     = e.target.result
        const lines  = md.split('\n')
        const blocks = []
        let i = 0

        while (i < lines.length) {
          const line = lines[i]

          // Fenced code block
          if (line.startsWith('```')) {
            const language = line.slice(3).trim()
            const codeLines = []
            i++
            while (i < lines.length && !lines[i].startsWith('```')) {
              codeLines.push(lines[i])
              i++
            }
            blocks.push({
              id: crypto.randomUUID(), type: 'code',
              content: codeLines.join('\n'), props: { language }, children: [],
            })
            i++; continue
          }

          // Headings
          if (line.startsWith('### ')) {
            blocks.push({ id: crypto.randomUUID(), type: 'h3', content: line.slice(4).trim(), props: {}, children: [] })
            i++; continue
          }
          if (line.startsWith('## ')) {
            blocks.push({ id: crypto.randomUUID(), type: 'h2', content: line.slice(3).trim(), props: {}, children: [] })
            i++; continue
          }
          if (line.startsWith('# ')) {
            blocks.push({ id: crypto.randomUUID(), type: 'h1', content: line.slice(2).trim(), props: {}, children: [] })
            i++; continue
          }

          // Blockquote
          if (line.startsWith('> ')) {
            blocks.push({ id: crypto.randomUUID(), type: 'quote', content: line.slice(2).trim(), props: {}, children: [] })
            i++; continue
          }

          // Divider
          if (line.match(/^---+$/) || line.match(/^\*\*\*+$/) || line.match(/^___+$/)) {
            blocks.push({ id: crypto.randomUUID(), type: 'divider', content: '', props: {}, children: [] })
            i++; continue
          }

          // Todo
          const todoMatch = line.match(/^- \[([ xX])\] (.*)$/)
          if (todoMatch) {
            blocks.push({
              id: crypto.randomUUID(), type: 'todo',
              content: todoMatch[2].trim(),
              props: { checked: todoMatch[1].toLowerCase() === 'x' },
              children: [],
            })
            i++; continue
          }

          // Bullet
          if (line.match(/^(\s*)- (.+)/)) {
            const m = line.match(/^(\s*)- (.+)/)
            const level = Math.floor((m[1]?.length ?? 0) / 2)
            blocks.push({
              id: crypto.randomUUID(), type: 'bullet',
              content: m[2].trim(), props: { level }, children: [],
            })
            i++; continue
          }

          // Numbered
          if (line.match(/^(\s*)\d+\. (.+)/)) {
            const m = line.match(/^(\s*)\d+\. (.+)/)
            const level = Math.floor((m[1]?.length ?? 0) / 2)
            blocks.push({
              id: crypto.randomUUID(), type: 'numbered',
              content: m[2].trim(), props: { level }, children: [],
            })
            i++; continue
          }

          // Empty line → skip
          if (line.trim() === '') {
            i++; continue
          }

          // Default: paragraph
          blocks.push({ id: crypto.randomUUID(), type: 'text', content: line.trim(), props: {}, children: [] })
          i++
        }

        // Título = primeiro h1 encontrado
        const h1 = blocks.find(b => b.type === 'h1')
        const title = h1?.content || file.name.replace(/\.md$/i, '') || 'Página importada'

        resolve({ title, blocks })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
    reader.readAsText(file, 'utf-8')
  })
}

// ─── IMPORT: CSV → Items ──────────────────────────────────────────

export function importCSVAsDatabase(file, schema) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const text  = e.target.result.replace(/^\uFEFF/, '')  // remove BOM
        const lines = text.split('\n').filter(l => l.trim())
        if (lines.length < 2) { resolve({ items: [] }); return }

        const headers = parseCSVRow(lines[0])
        const props   = schema.properties

        const items = lines.slice(1).map(line => {
          const values = parseCSVRow(line)
          const properties = {}

          headers.forEach((header, colIdx) => {
            const prop = props.find(p =>
              p.name.toLowerCase().trim() === header.toLowerCase().trim()
            )
            if (!prop) return

            const raw = values[colIdx] ?? ''
            let value = null

            switch (prop.type) {
              case 'title':
              case 'text':
              case 'url':
              case 'email':
              case 'phone':
                value = raw
                break
              case 'number':
                value = raw ? Number(raw.replace(',', '.')) : null
                break
              case 'checkbox':
                value = ['sim', 'yes', 'true', '1', 'x'].includes(raw.toLowerCase())
                break
              case 'select':
              case 'status': {
                const opt = prop.options?.find(o => o.name.toLowerCase() === raw.toLowerCase())
                value = opt?.id ?? null
                break
              }
              case 'multiselect': {
                const parts = raw.split(';').map(s => s.trim()).filter(Boolean)
                value = parts.map(name => {
                  const opt = prop.options?.find(o => o.name.toLowerCase() === name.toLowerCase())
                  return opt?.id ?? null
                }).filter(Boolean)
                break
              }
              case 'date':
                value = raw ? new Date(raw).toISOString().slice(0, 10) : null
                break
              default:
                value = raw
            }

            properties[prop.id] = { type: prop.type, value }
          })

          return {
            id: crypto.randomUUID(),
            databaseId: schema.id,
            properties,
            blocks: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        })

        resolve({ items })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Erro ao ler CSV'))
    reader.readAsText(file, 'utf-8')
  })
}

function parseCSVRow(line) {
  const result = []
  let current  = ''
  let inQuote  = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { current += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      result.push(current); current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}
