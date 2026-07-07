/**
 * ImportModal.jsx — Fase 5
 *
 * Modal unificado de importação:
 *  - Markdown → nova página com blocos parseados
 *  - CSV → itens de um database existente
 *
 * Roda 100% no browser via File API.
 * Compatível com GitHub Pages (sem backend).
 */

import { useState, useRef } from 'react'
import { Upload, FileText, Table2, X, Check, AlertCircle, Loader2 } from 'lucide-react'
import { importMarkdownAsPage, importCSVAsDatabase } from '../../lib/importExport.js'

const T = {
  fundo:      '#1C1610',
  superficie: '#2A1F14',
  card:       '#F5EDD6',
  textoSuave: '#6B4C3B',
  ouro:       '#C9A84C',
  borda:      '#5C3D1E',
  destaque:   '#8B4513',
}

export default function ImportModal({ open, onClose, onImportPage, onImportCSV, schema }) {
  const [mode, setMode]         = useState('md')    // 'md' | 'csv'
  const [status, setStatus]     = useState('idle')  // 'idle' | 'loading' | 'done' | 'error'
  const [message, setMessage]   = useState('')
  const [preview, setPreview]   = useState(null)

  const mdRef  = useRef(null)
  const csvRef = useRef(null)

  function reset() {
    setStatus('idle')
    setMessage('')
    setPreview(null)
  }

  async function handleMDFile(file) {
    if (!file) return
    if (!file.name.match(/\.(md|markdown|txt)$/i)) {
      setStatus('error')
      setMessage('Selecione um arquivo .md ou .txt')
      return
    }
    setStatus('loading')
    try {
      const result = await importMarkdownAsPage(file)
      setPreview(result)
      setStatus('done')
      setMessage(`${result.blocks.length} blocos importados`)
    } catch (err) {
      setStatus('error')
      setMessage(`Erro ao importar: ${err.message}`)
    }
  }

  async function handleCSVFile(file) {
    if (!file) return
    if (!file.name.match(/\.csv$/i)) {
      setStatus('error')
      setMessage('Selecione um arquivo .csv')
      return
    }
    if (!schema) {
      setStatus('error')
      setMessage('Abra um database antes de importar CSV.')
      return
    }
    setStatus('loading')
    try {
      const result = await importCSVAsDatabase(file, schema)
      setPreview(result)
      setStatus('done')
      setMessage(`${result.items.length} itens prontos para importar`)
    } catch (err) {
      setStatus('error')
      setMessage(`Erro ao importar: ${err.message}`)
    }
  }

  function confirmImport() {
    if (!preview) return
    if (mode === 'md') {
      onImportPage?.(preview)
    } else {
      onImportCSV?.(preview)
    }
    onClose()
    reset()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
        style={{ background: T.superficie, border: `1px solid ${T.borda}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${T.borda}` }}
        >
          <div className="flex items-center gap-2">
            <Upload size={16} style={{ color: T.ouro }} />
            <h2 className="font-serif font-semibold" style={{ color: T.ouro }}>
              Importar conteúdo
            </h2>
          </div>
          <button
            onClick={() => { onClose(); reset() }}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            style={{ color: T.textoSuave }}
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Tabs: MD | CSV */}
          <div className="flex gap-2">
            {[
              { key: 'md',  icon: <FileText size={14} />,  label: 'Markdown → Página' },
              { key: 'csv', icon: <Table2 size={14} />,    label: 'CSV → Database' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => { setMode(t.key); reset() }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-serif transition-colors"
                style={{
                  background: mode === t.key ? `${T.ouro}22` : 'transparent',
                  color: mode === t.key ? T.ouro : T.textoSuave,
                  border: `1px solid ${mode === t.key ? T.ouro : T.borda}`,
                }}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Área de drop / seleção */}
          <div
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors"
            style={{ borderColor: T.borda }}
            onClick={() => mode === 'md' ? mdRef.current?.click() : csvRef.current?.click()}
          >
            <Upload size={28} style={{ color: T.textoSuave, opacity: 0.5 }} />
            <div className="text-center">
              <p className="text-sm font-serif" style={{ color: T.card }}>
                {mode === 'md' ? 'Selecionar arquivo Markdown' : 'Selecionar arquivo CSV'}
              </p>
              <p className="text-xs mt-1" style={{ color: T.textoSuave }}>
                {mode === 'md' ? '.md, .markdown ou .txt' : '.csv (separado por vírgulas)'}
              </p>
            </div>
          </div>

          {/* Inputs ocultos */}
          <input
            ref={mdRef}
            type="file"
            accept=".md,.markdown,.txt"
            className="hidden"
            onChange={e => handleMDFile(e.target.files?.[0])}
          />
          <input
            ref={csvRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => handleCSVFile(e.target.files?.[0])}
          />

          {/* Feedback de status */}
          {status !== 'idle' && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm"
              style={{
                background: status === 'error' ? 'rgba(212,76,71,0.15)'
                          : status === 'done'  ? 'rgba(68,131,97,0.15)'
                          : `${T.fundo}66`,
                border: `1px solid ${
                  status === 'error' ? 'rgba(212,76,71,0.4)'
                : status === 'done'  ? 'rgba(68,131,97,0.4)'
                : T.borda
                }`,
              }}
            >
              {status === 'loading' && <Loader2 size={14} className="animate-spin" style={{ color: T.ouro }} />}
              {status === 'done'    && <Check size={14} style={{ color: '#9cdcb0' }} />}
              {status === 'error'   && <AlertCircle size={14} style={{ color: '#f09090' }} />}
              <span style={{ color: T.card }}>{message}</span>
            </div>
          )}

          {/* Preview de MD */}
          {mode === 'md' && preview && (
            <div
              className="rounded-md p-3 max-h-36 overflow-y-auto"
              style={{ background: `${T.fundo}88`, scrollbarWidth: 'thin' }}
            >
              <p className="text-xs font-semibold mb-2" style={{ color: T.textoSuave }}>
                Prévia — {preview.title}
              </p>
              {preview.blocks.slice(0, 5).map(b => (
                <p key={b.id} className="text-xs truncate font-serif" style={{ color: T.card }}>
                  <span style={{ color: T.ouro, opacity: 0.6 }}>{b.type} </span>
                  {b.content || '—'}
                </p>
              ))}
              {preview.blocks.length > 5 && (
                <p className="text-xs" style={{ color: T.textoSuave }}>
                  + {preview.blocks.length - 5} blocos
                </p>
              )}
            </div>
          )}

          {/* Preview de CSV */}
          {mode === 'csv' && preview && (
            <div
              className="rounded-md p-3"
              style={{ background: `${T.fundo}88` }}
            >
              <p className="text-xs font-semibold mb-1" style={{ color: T.textoSuave }}>
                {preview.items.length} itens prontos para adicionar ao database.
              </p>
              {preview.items.slice(0, 2).map(item => {
                const titlePropId = schema?.properties?.find(p => p.type === 'title')?.id
                const title = titlePropId ? item.properties?.[titlePropId]?.value : null
                return (
                  <p key={item.id} className="text-xs font-serif truncate" style={{ color: T.card }}>
                    · {title || '(sem título)'}
                  </p>
                )
              })}
            </div>
          )}

          {/* Confirmar */}
          {status === 'done' && (
            <button
              onClick={confirmImport}
              className="w-full py-2.5 rounded-md font-serif text-sm font-semibold transition-colors"
              style={{ background: T.ouro, color: T.fundo }}
            >
              {mode === 'md' ? '📖 Criar página a partir do arquivo' : '📊 Adicionar itens ao database'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
