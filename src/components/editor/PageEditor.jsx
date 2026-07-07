/**
 * PageEditor.jsx
 *
 * Tela principal de edição de uma página.
 * Integra: PageHeader, BlockList, InlineToolbar, SlashMenu,
 * autoSave e carregamento do arquivo do Drive.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { PageHeader }   from './PageHeader.jsx'
import { BlockList }    from './BlockList.jsx'
import { SlashMenu }    from './SlashMenu.jsx'
import { InlineToolbar } from './InlineToolbar.jsx'

import { useAutoSave }   from '../../hooks/useAutoSave.js'
import { readFile }      from '../../lib/drive.js'
import { getCachedPage, cachePage } from '../../lib/cache.js'
import { createBlock, normalizeBlocks } from '../../lib/blocks.js'
import { BLOCK_TYPES }   from '../../lib/constants.js'

// ─── Estado inicial de uma página nova ────────────────────────────
function newPageData() {
  return {
    id:        crypto.randomUUID(),
    title:     '',
    icon:      '📄',
    cover:     null,
    blocks:    [createBlock(BLOCK_TYPES.TEXT)],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ─── Componente ───────────────────────────────────────────────────

export default function PageEditor() {
  const { libId, pageId } = useParams()
  const navigate          = useNavigate()

  const [page,    setPage]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // Slash menu
  const [slashMenu, setSlashMenu]   = useState(null) // { top, left, afterId, query }
  const [slashQuery, setSlashQuery] = useState('')

  // Ref do container do editor (para InlineToolbar)
  const editorRef = useRef(null)

  // ── Carrega página do Drive / cache ────────────────────────────
  useEffect(() => {
    if (!pageId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        // 1. Cache local primeiro
        const cached = await getCachedPage(pageId)
        if (cached && !cancelled) {
          setPage({ ...cached, blocks: normalizeBlocks(cached.blocks ?? []) })
          setLoading(false)
        }

        // 2. Drive (sempre busca para ter a versão mais recente)
        const data = await readFile(pageId)
        if (!cancelled) {
          const normalized = { ...data, blocks: normalizeBlocks(data.blocks ?? []) }
          setPage(normalized)
          await cachePage(pageId, normalized)
          setLoading(false)
        }
      } catch (err) {
        console.error('[PageEditor] Erro ao carregar:', err)
        if (!cancelled) {
          setError('Não foi possível carregar a página. Verifique sua conexão.')
          setLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [pageId])

  // ── Auto-save ──────────────────────────────────────────────────
  const { saving, lastSaved, error: saveError } = useAutoSave(
    pageId,
    page,
    !loading && !!page
  )

  // ── Patch da página ────────────────────────────────────────────
  const patchPage = useCallback((patch) => {
    setPage(prev => prev ? { ...prev, ...patch } : prev)
  }, [])

  // ── Blocos ─────────────────────────────────────────────────────
  const handleBlocksChange = useCallback((newBlocks) => {
    setPage(prev => prev ? { ...prev, blocks: newBlocks } : prev)
  }, [])

  // ── Slash menu ─────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e) {
      // Abre menu ao digitar /
      if (e.key === '/' && !slashMenu) {
        // Só abre se o foco está em um bloco de texto
        const active = document.activeElement
        if (active && active.contentEditable === 'true') {
          const rect  = active.getBoundingClientRect()
          const edRect = editorRef.current?.getBoundingClientRect() ?? { top: 0, left: 0 }
          setSlashMenu({
            top:  rect.bottom - edRect.top + 4,
            left: rect.left   - edRect.left,
          })
          setSlashQuery('')
        }
        return
      }

      if (slashMenu) {
        if (e.key === 'Escape') { setSlashMenu(null); return }

        // Captura texto digitado após / para filtrar o menu
        if (e.key === 'Backspace') {
          setSlashQuery(q => {
            if (q.length === 0) { setSlashMenu(null); return q }
            return q.slice(0, -1)
          })
        } else if (e.key.length === 1) {
          setSlashQuery(q => q + e.key)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [slashMenu])

  function handleSlashSelect(blockType) {
    if (!page) return
    setSlashMenu(null)

    // Remove o "/" que ativou o menu e adiciona bloco do tipo escolhido
    // (o BlockList vai inserir após o bloco focado)
    const blocks = page.blocks ?? []
    const active = document.activeElement
    const blockEl = active?.closest('[data-block-id]')
    const blockId = blockEl?.dataset?.blockId

    if (blockId) {
      // Substitui o bloco atual se estava vazio, senão insere depois
      const currentBlock = blocks.find(b => b.id === blockId)
      const isEmpty = !currentBlock?.segments?.length || currentBlock.segments.every(s => !s.text)

      if (isEmpty) {
        const updated = blocks.map(b =>
          b.id === blockId ? { ...b, type: blockType, segments: [], props: {} } : b
        )
        handleBlocksChange(updated)
      } else {
        const newBlock = createBlock(blockType)
        const idx = blocks.findIndex(b => b.id === blockId)
        const updated = [
          ...blocks.slice(0, idx + 1),
          newBlock,
          ...blocks.slice(idx + 1),
        ]
        handleBlocksChange(updated)
      }
    } else {
      // Sem bloco focado — adiciona ao final
      handleBlocksChange([...blocks, createBlock(blockType)])
    }
  }

  // ── Render ─────────────────────────────────────────────────────

  if (loading && !page) {
    return (
      <div className="min-h-dvh bg-card flex items-center justify-center">
        <span className="text-4xl animate-pulse">📖</span>
      </div>
    )
  }

  if (error && !page) {
    return (
      <div className="min-h-dvh bg-card flex flex-col items-center justify-center gap-4">
        <span className="text-4xl">⚠️</span>
        <p className="font-sans text-sm text-texto-suave">{error}</p>
        <button onClick={() => navigate(-1)} className="btn-primario">← Voltar</button>
      </div>
    )
  }

  if (!page) return null

  return (
    <div className="min-h-dvh bg-card">
      {/* Barra de status */}
      <div className="fixed top-0 right-0 z-30 flex items-center gap-2 p-3 text-xs font-sans text-texto-suave/60">
        {saving && <span className="animate-pulse">💾 Salvando…</span>}
        {!saving && lastSaved && (
          <span>Salvo {lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        )}
        {saveError && <span className="text-red-600">⚠️ {saveError}</span>}
        <button
          onClick={() => navigate(-1)}
          className="ml-3 hover:text-texto transition-colors"
          title="Voltar"
        >
          ← Voltar
        </button>
      </div>

      {/* Área principal */}
      <div
        ref={editorRef}
        className="relative max-w-3xl mx-auto px-8 pt-16 pb-32"
      >
        <PageHeader
          icon={page.icon}
          cover={page.cover}
          title={page.title}
          onIconChange={icon   => patchPage({ icon })}
          onCoverChange={cover => patchPage({ cover })}
          onTitleChange={title => patchPage({ title })}
        />

        {/* Editor de blocos */}
        <div className="relative">
          <BlockList
            blocks={page.blocks ?? []}
            onChange={handleBlocksChange}
          />
        </div>

        {/* Slash menu */}
        {slashMenu && (
          <SlashMenu
            position={{ top: slashMenu.top, left: slashMenu.left }}
            initialQuery={slashQuery}
            onSelect={handleSlashSelect}
            onClose={() => setSlashMenu(null)}
          />
        )}

        {/* Inline toolbar */}
        <InlineToolbar editorRef={editorRef} />
      </div>
    </div>
  )
}
