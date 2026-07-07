/**
 * PageEditorShell.jsx — Fases 5 + 6
 *
 * Shell que envolve o editor de página integrando:
 *  - Breadcrumb clicável (Fase 5)
 *  - Histórico de versões, export, favoritos, template (Fase 5)
 *  - CurrentPagePresence: avatares de quem está na mesma página (Fase 6)
 *
 * A integração com Fase 6 é feita via import direto + try/catch no render,
 * garantindo que o componente funcione mesmo sem CollaborationProvider.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  History, Download, FileText, FileCode2,
  BookMarked, PanelRight, MoreHorizontal,
} from 'lucide-react'
import Breadcrumb             from '../breadcrumb/Breadcrumb.jsx'
import VersionHistoryPanel, { useVersionAutoSave } from '../history/VersionHistory.jsx'
import { exportPageAsMarkdown, exportPageAsHTML }  from '../../lib/importExport.js'
import { useSaveAsTemplate }  from '../templates/PageTemplates.jsx'
import { useNavigation }      from '../../contexts/NavigationContext.jsx'
import { CurrentPagePresence } from '../presence/PresenceBar.jsx'

const T = {
  fundo:      '#1C1610',
  superficie: '#2A1F14',
  card:       '#F5EDD6',
  textoSuave: '#6B4C3B',
  ouro:       '#C9A84C',
  borda:      '#5C3D1E',
}

// ─── ExportMenu ───────────────────────────────────────────────────

function ExportMenu({ page, blocks, onClose }) {
  return (
    <div
      className="absolute right-0 top-full mt-1 w-52 rounded-lg shadow-xl z-50 overflow-hidden"
      style={{ background: T.superficie, border: `1px solid ${T.borda}` }}
    >
      <p
        className="px-3 py-2 text-xs uppercase tracking-widest font-semibold"
        style={{ color: T.textoSuave, borderBottom: `1px solid ${T.borda}` }}
      >
        Exportar página
      </p>
      <button
        onClick={() => { exportPageAsMarkdown(page, blocks); onClose() }}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
        style={{ color: T.card }}
      >
        <FileText size={14} style={{ color: T.textoSuave }} />
        <div>
          <p className="text-sm font-serif">Markdown (.md)</p>
          <p className="text-xs" style={{ color: T.textoSuave }}>Para editores de texto</p>
        </div>
      </button>
      <button
        onClick={() => { exportPageAsHTML(page, blocks); onClose() }}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
        style={{ color: T.card }}
      >
        <FileCode2 size={14} style={{ color: T.textoSuave }} />
        <div>
          <p className="text-sm font-serif">HTML (.html)</p>
          <p className="text-xs" style={{ color: T.textoSuave }}>Estilizado, abre no navegador</p>
        </div>
      </button>
    </div>
  )
}

// ─── SafePresence — wrapper que não quebra sem CollaborationProvider ──

function SafePresence({ pageId }) {
  try {
    return <CurrentPagePresence pageId={pageId} />
  } catch {
    return null
  }
}

// ─── PageEditorShell ──────────────────────────────────────────────

export default function PageEditorShell({
  page,
  blocks,
  libraryTitle,
  onSave,
  children,
}) {
  const { isFavorite, toggleFavorite } = useNavigation()
  const { onSaved }        = useVersionAutoSave(page?.id)
  const { saveAsTemplate } = useSaveAsTemplate()

  const [showHistory, setShowHistory] = useState(false)
  const [showExport,  setShowExport]  = useState(false)
  const [showMore,    setShowMore]    = useState(false)
  const [saveStatus,  setSaveStatus]  = useState('saved')

  const blocksRef    = useRef(blocks)
  blocksRef.current  = blocks

  // ─── Ctrl+S ───────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!onSave || !page?.id) return
    setSaveStatus('saving')
    try {
      await onSave(blocksRef.current)
      onSaved(blocksRef.current)
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }, [onSave, page?.id, onSaved])

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave])

  // ─── Restaurar versão ─────────────────────────────────────────

  function handleRestoreVersion(restoredBlocks) {
    window.dispatchEvent(new CustomEvent('biblioteca:restore-version', {
      detail: { pageId: page?.id, blocks: restoredBlocks },
    }))
  }

  const fav = page?.id ? isFavorite(page.id) : false

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full" style={{ background: T.fundo }}>
      {/* Topo: breadcrumb + presença + ações */}
      <div
        className="flex items-center justify-between"
        style={{ borderBottom: `1px solid ${T.borda}` }}
      >
        <div className="flex-1 min-w-0">
          <Breadcrumb libraryTitle={libraryTitle} />
        </div>

        {/* Presença na página (Fase 6 — graceful degradation) */}
        {page?.id && <SafePresence pageId={page.id} />}

        {/* Ações */}
        <div className="flex items-center gap-1 px-3 shrink-0">
          <span
            className="text-xs font-serif mr-1"
            style={{
              color: saveStatus === 'error'  ? '#ef4444'
                   : saveStatus === 'saving' ? T.ouro
                   : `${T.textoSuave}88`,
            }}
          >
            {saveStatus === 'saving' ? 'Salvando…'
           : saveStatus === 'error'  ? 'Erro ao salvar'
           : ''}
          </span>

          <button
            onClick={() => { setShowHistory(h => !h); setShowExport(false) }}
            title="Histórico de versões"
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
            style={{ color: showHistory ? T.ouro : T.textoSuave }}
          >
            <History size={15} />
          </button>

          <div className="relative">
            <button
              onClick={() => { setShowExport(e => !e); setShowHistory(false) }}
              title="Exportar"
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: showExport ? T.ouro : T.textoSuave }}
            >
              <Download size={15} />
            </button>
            {showExport && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExport(false)} />
                <ExportMenu page={page} blocks={blocks} onClose={() => setShowExport(false)} />
              </>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMore(m => !m)}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: showMore ? T.ouro : T.textoSuave }}
            >
              <MoreHorizontal size={15} />
            </button>
            {showMore && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)} />
                <div
                  className="absolute right-0 top-full mt-1 w-52 rounded-lg shadow-xl z-50 overflow-hidden"
                  style={{ background: T.superficie, border: `1px solid ${T.borda}` }}
                >
                  <button
                    onClick={() => { toggleFavorite(page?.id); setShowMore(false) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
                    style={{ color: T.card }}
                  >
                    <BookMarked size={14} style={{ color: T.textoSuave }} />
                    <span className="text-sm font-serif">
                      {fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                    </span>
                  </button>
                  <button
                    onClick={() => { saveAsTemplate(page?.title, page?.icon, blocks); setShowMore(false) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
                    style={{ color: T.card }}
                  >
                    <PanelRight size={14} style={{ color: T.textoSuave }} />
                    <span className="text-sm font-serif">Salvar como modelo</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Área principal: editor + painel lateral */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {showHistory && (
          <div
            className="shrink-0 border-l overflow-hidden"
            style={{ width: 300, borderColor: T.borda }}
          >
            <VersionHistoryPanel
              pageId={page?.id}
              currentBlocks={blocks}
              onRestore={handleRestoreVersion}
              onClose={() => setShowHistory(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
