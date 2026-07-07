/**
 * LibraryView.jsx — Fases 3–6
 *
 * Tela de uma biblioteca: lista páginas e databases, permite criar ambos.
 * A partir da Fase 6, envolve o conteúdo no AppShellV6 quando a biblioteca
 * está aberta, habilitando colaboração (compartilhamento, comentários,
 * presença) sem exigir backend próprio.
 *
 * O AppShellV6 só é montado quando pagesFolder já foi resolvido —
 * assim o pagesParentId nunca é null no CollaborationProvider.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth }   from '../../contexts/AuthContext.jsx'
import { useToast }  from '../ui/Toast.jsx'
import {
  listFiles, readFile, createFile, createFolder,
} from '../../lib/drive.js'
import { createDatabase } from '../../lib/database.js'
import { createBlock, normalizeBlocks } from '../../lib/blocks.js'
import {
  BLOCK_TYPES, DRIVE_FILE_NAMES, DRIVE_FOLDER_NAMES,
} from '../../lib/constants.js'
import AppShellV6 from '../editor/AppShellV6.jsx'

// ─── Row de página ────────────────────────────────────────────────

function PageRow({ page, onClick }) {
  const icon  = page.data?.icon  ?? '📄'
  const title = page.data?.title ?? 'Sem título'
  const date  = page.modifiedTime
    ? new Date(page.modifiedTime).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short',
      })
    : ''

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded hover:bg-superficie/30 transition-colors text-left group"
    >
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-serif text-card text-sm font-medium truncate group-hover:text-ouro transition-colors">
          {title || 'Sem título'}
        </p>
      </div>
      <span className="text-xs font-sans text-texto-suave shrink-0">{date}</span>
    </button>
  )
}

// ─── Row de database ──────────────────────────────────────────────

function DatabaseRow({ db, onClick }) {
  const icon  = db.schema?.icon  ?? '🗂️'
  const title = db.schema?.title ?? 'Database'
  const count = db.itemCount ?? 0

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded hover:bg-superficie/30 transition-colors text-left group"
    >
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-serif text-card text-sm font-medium truncate group-hover:text-ouro transition-colors">
          {title}
        </p>
        <p className="text-xs font-sans text-texto-suave">
          Estante · {count} {count === 1 ? 'item' : 'itens'}
        </p>
      </div>
      <span className="text-xs font-sans text-texto-suave shrink-0 border border-borda/40 px-1.5 py-0.5 rounded">
        Database
      </span>
    </button>
  )
}

// ─── Modal de criação de database ────────────────────────────────

function NewDatabaseModal({ onConfirm, onClose }) {
  const [title, setTitle] = useState('')
  const [icon,  setIcon]  = useState('🗂️')

  const QUICK_ICONS = ['🗂️','📚','🎭','🎬','🎵','🌍','📝','⭐','🏆','💡']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-fundo/80 backdrop-blur-sm">
      <div className="bg-superficie border border-borda rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="font-serif text-xl text-card font-semibold mb-4">Nova Estante</h2>

        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_ICONS.map(e => (
            <button
              key={e}
              onClick={() => setIcon(e)}
              className={`text-2xl p-1.5 rounded transition-colors ${
                icon === e ? 'bg-ouro/20 ring-1 ring-ouro' : 'hover:bg-fundo/50'
              }`}
            >
              {e}
            </button>
          ))}
        </div>

        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && title.trim()) onConfirm(title.trim(), icon)
          }}
          placeholder="Nome da estante..."
          className="w-full bg-fundo border border-borda rounded-lg px-3 py-2 font-sans text-sm text-card outline-none focus:border-ouro mb-4"
        />

        <div className="flex gap-3">
          <button
            onClick={() => title.trim() && onConfirm(title.trim(), icon)}
            disabled={!title.trim()}
            className="flex-1 btn-primario disabled:opacity-40"
          >
            Criar Estante
          </button>
          <button onClick={onClose} className="flex-1 btn-secundario">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Conteúdo interno da lista (sem AppShell) ─────────────────────

function LibraryContent({
  meta, pages, databases, loading,
  libId, pagesFolder, activeTab, setActiveTab,
  onNewPage, onNewDatabase, onShowNewDb,
  navigate,
}) {
  const showPages     = activeTab === 'all' || activeTab === 'pages'
  const showDatabases = activeTab === 'all' || activeTab === 'databases'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-3xl animate-pulse">📄</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Databases */}
      {showDatabases && databases.length > 0 && (
        <div className="mb-4">
          {activeTab === 'all' && (
            <p className="text-xs font-sans text-texto-suave uppercase tracking-wide px-4 mb-1">
              Estantes
            </p>
          )}
          <div className="flex flex-col divide-y divide-borda/20">
            {databases.map(db => (
              <DatabaseRow
                key={db.folderId}
                db={db}
                onClick={() => navigate(`/biblioteca/${libId}/database/${db.folderId}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Páginas */}
      {showPages && pages.length > 0 && (
        <div>
          {activeTab === 'all' && databases.length > 0 && (
            <p className="text-xs font-sans text-texto-suave uppercase tracking-wide px-4 mb-1">
              Páginas
            </p>
          )}
          <div className="flex flex-col divide-y divide-borda/20">
            {pages.map(page => (
              <PageRow
                key={page.id}
                page={page}
                onClick={() => navigate(`/biblioteca/${libId}/pagina/${page.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {databases.length === 0 && pages.length === 0 && (
        <div className="text-center py-20">
          <span className="text-5xl block mb-3">📭</span>
          <p className="font-serif text-lg text-card/70 mb-2">Biblioteca vazia</p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button onClick={onNewPage} className="btn-primario">
              + Nova Página
            </button>
            <button onClick={onShowNewDb} className="btn-secundario">
              + Nova Estante
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── LibraryView principal ────────────────────────────────────────

export default function LibraryView() {
  const { libId }  = useParams()
  const navigate   = useNavigate()
  const toast      = useToast()
  const { user, token, signIn } = useAuth()

  const [meta,       setMeta]       = useState(null)
  const [pages,      setPages]      = useState([])
  const [databases,  setDatabases]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [pagesFolder,    setPagesFolder]    = useState(null)
  const [dbsFolder,      setDbsFolder]      = useState(null)
  const [showNewDb,      setShowNewDb]      = useState(false)
  const [creatingDb,     setCreatingDb]     = useState(false)
  const [activeTab,      setActiveTab]      = useState('all')

  // currentUser no formato esperado pela Fase 6
  const currentUser = user ? {
    id:        user.googleId,
    name:      user.name,
    email:     user.email,
    avatarUrl: user.picture,
  } : null

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const files = await listFiles(libId)

      // Meta
      const metaFile = files.find(f => f.name === DRIVE_FILE_NAMES.META)
      if (metaFile) {
        const m = await readFile(metaFile.id)
        setMeta(m)
      }

      // Pasta pages/
      const pagesDir = files.find(f => f.name === DRIVE_FOLDER_NAMES.PAGES)
      if (pagesDir) {
        setPagesFolder(pagesDir.id)
        const pageFiles = await listFiles(pagesDir.id, 'application/json')
        // Ignorar arquivos _comments.json (Fase 6)
        const filtered = pageFiles.filter(f => !f.name.endsWith('_comments.json'))
        const loaded = await Promise.all(
          filtered.map(async f => {
            try {
              const data = await readFile(f.id)
              return { ...f, data }
            } catch {
              return { ...f, data: null }
            }
          })
        )
        setPages(loaded.filter(p => p.data))
      }

      // Pasta databases/
      const dbsDir = files.find(f => f.name === DRIVE_FOLDER_NAMES.DATABASES)
      if (dbsDir) {
        setDbsFolder(dbsDir.id)
        const dbFolders = await listFiles(dbsDir.id)
        const loadedDbs = await Promise.all(
          dbFolders
            .filter(f => f.mimeType === 'application/vnd.google-apps.folder')
            .map(async folder => {
              try {
                const folderFiles = await listFiles(folder.id)
                const schemaFile = folderFiles.find(f => f.name === DRIVE_FILE_NAMES.SCHEMA)
                if (!schemaFile) return null
                const schema = await readFile(schemaFile.id)
                const itemCount = folderFiles.filter(
                  f => f.name !== DRIVE_FILE_NAMES.SCHEMA && f.mimeType === 'application/json'
                ).length
                return { folderId: folder.id, schema, itemCount }
              } catch {
                return null
              }
            })
        )
        setDatabases(loadedDbs.filter(Boolean))
      }
    } catch (err) {
      console.error('[LibraryView] Erro:', err)
      toast.error('Erro ao carregar biblioteca.')
    } finally {
      setLoading(false)
    }
  }, [libId, toast])

  useEffect(() => { load() }, [load])

  // ── Criar página ───────────────────────────────────────────────

  async function handleNewPage(template = null) {
    let folder = pagesFolder
    if (!folder) {
      try {
        const created = await createFolder(libId, DRIVE_FOLDER_NAMES.PAGES)
        folder = created.id
        setPagesFolder(folder)
      } catch {
        toast.error('Erro ao criar pasta de páginas.')
        return
      }
    }

    const id = crypto.randomUUID()
    const data = {
      id,
      title:     template?.title ?? '',
      icon:      template?.icon  ?? '📄',
      cover:     null,
      blocks:    template?.blocks
        ? template.blocks.map(b => ({ ...b, id: crypto.randomUUID() }))
        : [createBlock(BLOCK_TYPES.TEXT)],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    try {
      const file = await createFile(folder, `${id}.json`, data)
      navigate(`/biblioteca/${libId}/pagina/${file.id}`)
    } catch (err) {
      console.error('[LibraryView] Erro ao criar página:', err)
      toast.error('Erro ao criar página.')
    }
  }

  // ── Criar database ─────────────────────────────────────────────

  async function handleNewDatabase(title, icon) {
    setCreatingDb(true)
    setShowNewDb(false)
    try {
      const result = await createDatabase(libId, { title, icon })
      navigate(`/biblioteca/${libId}/database/${result.folderId}`)
    } catch (err) {
      console.error('[LibraryView] Erro ao criar database:', err)
      toast.error('Erro ao criar estante.')
    } finally {
      setCreatingDb(false)
    }
  }

  // ── Conteúdo da lista ──────────────────────────────────────────

  const listContent = (
    <>
      {/* Tabs + botões de criação */}
      <div className="flex items-center gap-1 mb-6 border-b border-borda/30">
        {[
          { key: 'all',       label: 'Tudo' },
          { key: 'pages',     label: 'Páginas' },
          { key: 'databases', label: 'Estantes' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-sans border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-ouro text-ouro'
                : 'border-transparent text-texto-suave hover:text-card'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 pb-1">
          <button onClick={() => handleNewPage()} className="btn-primario text-sm py-1.5">
            + Nova Página
          </button>
          <button
            onClick={() => setShowNewDb(true)}
            disabled={creatingDb}
            className="btn-secundario text-sm py-1.5 disabled:opacity-40"
          >
            {creatingDb ? '⏳' : '+ Nova Estante'}
          </button>
        </div>
      </div>

      <LibraryContent
        meta={meta}
        pages={pages}
        databases={databases}
        loading={loading}
        libId={libId}
        pagesFolder={pagesFolder}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewPage={() => handleNewPage()}
        onNewDatabase={handleNewDatabase}
        onShowNewDb={() => setShowNewDb(true)}
        navigate={navigate}
      />
    </>
  )

  // ── Render: AppShellV6 envolve a lista quando pronto ──────────

  // Aguardar pagesFolder ser resolvido antes de montar AppShellV6
  // para garantir que pagesParentId nunca seja null no CollaborationProvider
  if (!pagesFolder && loading) {
    // Enquanto carrega, exibir tela simples sem Shell
    return (
      <div className="min-h-dvh bg-fundo flex items-center justify-center">
        <span className="text-4xl animate-pulse">📚</span>
      </div>
    )
  }

  return (
    <AppShellV6
      libraryId={libId}
      libraryTitle={meta?.name ?? '📚 Biblioteca'}
      accessToken={token}
      pages={pages}
      databases={databases}
      onPagesChange={setPages}
      onNewPage={handleNewPage}
      onNewDatabase={handleNewDatabase}
      activePage={null}      // LibraryView não tem página ativa — só lista
      activeBlocks={[]}
      onSavePage={null}
      activeSchema={null}
      onImportPage={({ title, blocks }) => handleNewPage({ title, blocks })}
      onImportCSV={null}
      currentUser={currentUser}
      pagesParentId={pagesFolder ?? libId}  // fallback para libId se pasta ainda não existe
      onTokenExpired={signIn}
    >
      {/* Conteúdo principal: lista de páginas e databases */}
      <div className="min-h-full" style={{ background: '#1C1610' }}>
        {/* Header da biblioteca */}
        <header
          className="border-b border-borda bg-superficie/50 px-6 py-4 flex items-center gap-4"
        >
          <button
            onClick={() => navigate('/')}
            className="text-texto-suave hover:text-card transition-colors font-sans text-sm"
          >
            ← Bibliotecas
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">{meta?.icon ?? '📚'}</span>
            <h1 className="font-serif text-lg text-card font-semibold">
              {meta?.name ?? 'Biblioteca'}
            </h1>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-10">
          {listContent}
        </main>
      </div>

      {/* Modal de database */}
      {showNewDb && (
        <NewDatabaseModal
          onConfirm={handleNewDatabase}
          onClose={() => setShowNewDb(false)}
        />
      )}
    </AppShellV6>
  )
}
