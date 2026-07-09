/**
 * AppShellV6.jsx — Fase 6: Colaboração
 *
 * Extensão do AppShell da Fase 5 com:
 *  - CollaborationProvider envolvendo o app
 *  - Botão de compartilhamento na barra superior
 *  - PresenceBar (quem está online)
 *  - Painel de comentários na lateral direita
 *  - Sincronização de pageId ativo com o contexto de colaboração
 *
 * Substitui AppShell.jsx — mantém a mesma interface de props
 * mais as novas (currentUser, pagesParentId, onTokenExpired).
 *
 * Props novas em relação ao AppShell da Fase 5:
 *   currentUser     — { id, name, email, avatarUrl } — usuário logado
 *   pagesParentId   — Drive folder ID de pages/
 *   onTokenExpired  — () => void — chamado em 401
 */

import { useCallback, useState, useEffect } from 'react'
import { NavigationProvider }    from '../../contexts/NavigationContext.jsx'
import { CollaborationProvider } from '../../contexts/CollaborationContext.jsx'
import { useCollaboration }      from '../../contexts/CollaborationContext.jsx'
import Sidebar                   from '../sidebar/Sidebar.jsx'
import GlobalSearch, { useGlobalSearchShortcut } from '../search/GlobalSearch.jsx'
import PageEditorShell           from './PageEditorShell.jsx'
import TemplatePickerModal       from '../templates/PageTemplates.jsx'
import ImportModal               from '../search/ImportModal.jsx'
import SharingModal              from '../sharing/SharingModal.jsx'
import CommentsPanel             from '../comments/CommentsPanel.jsx'
import PresenceBar               from '../presence/PresenceBar.jsx'
import { Search, Upload, Share2, MessageSquare } from 'lucide-react'

const T = {
  fundo:      '#1C1610',
  superficie: '#2A1F14',
  ouro:       '#C9A84C',
  textoSuave: '#6B4C3B',
  borda:      '#5C3D1E',
  destaque:   '#8B4513',
}

// ─── Inner — acessa CollaborationContext após o Provider ──────────

function AppShellInner({
  libraryId,
  libraryTitle,
  accessToken,
  pages,
  databases,
  onPagesChange,
  onNewPage,
  onNewDatabase,
  activePage,
  activeBlocks,
  onSavePage,
  activeSchema,
  onImportPage,
  onImportCSV,
  currentUser,
  children,
}) {
  const {
    setSharingOpen, sharingOpen,
    setActivePageId,
  } = useCollaboration()

  const [searchOpen,    setSearchOpen]    = useState(false)
  const [templateOpen,  setTemplateOpen]  = useState(false)
  const [importOpen,    setImportOpen]    = useState(false)
  const [commentsOpen,  setCommentsOpen]  = useState(false)

  // Ctrl+K
  useGlobalSearchShortcut(useCallback(() => setSearchOpen(true), []))

  // Sincronizar página ativa com CollaborationContext (para presença e poll de comentários)
  useEffect(() => {
    setActivePageId(activePage?.id ?? null)
  }, [activePage?.id, setActivePageId])

  // Flatten itens de database para busca global
  const dbItems = databases.flatMap(db =>
    (db.items ?? []).map(item => {
      const titleProp = db.schema.properties?.find(p => p.type === 'title')
      return {
        id: item.id,
        _title: titleProp ? item.properties?.[titleProp.id]?.value : '',
        _dbTitle: db.schema.title,
      }
    })
  )

  function handleNewPage() {
    setTemplateOpen(true)
  }

  function handleTemplateSelect(tpl) {
    onNewPage?.(tpl)
    setTemplateOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: T.fundo }}>
      {/* Sidebar */}
      <Sidebar
        onNewPage={handleNewPage}
        onNewDatabase={onNewDatabase}
        libraryId={libraryId}
      />

      {/* Área principal */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Barra superior */}
        <div
          className="flex items-center justify-between gap-2 px-3 py-1.5 shrink-0"
          style={{ borderBottom: `1px solid ${T.borda}`, background: T.superficie }}
        >
          {/* Esquerda: presença */}
          <PresenceBar currentUser={currentUser} />

          {/* Direita: ações */}
          <div className="flex items-center gap-1">
            {/* Comentários (só aparece quando há página ativa) */}
            {activePage && (
              <button
                onClick={() => setCommentsOpen(o => !o)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs hover:bg-white/10 transition-colors font-serif"
                style={{ color: commentsOpen ? T.ouro : T.textoSuave }}
                title="Comentários (Ctrl+Shift+M)"
              >
                <MessageSquare size={12} />
                Comentários
              </button>
            )}

            {/* Compartilhar */}
            <button
              onClick={() => setSharingOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs hover:bg-white/10 transition-colors font-serif"
              style={{ color: T.textoSuave }}
              title="Compartilhar biblioteca"
            >
              <Share2 size={12} />
              Compartilhar
            </button>

            {/* Importar */}
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs hover:bg-white/10 transition-colors font-serif"
              style={{ color: T.textoSuave }}
            >
              <Upload size={12} />
              Importar
            </button>

            {/* Buscar */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs hover:bg-white/10 transition-colors font-serif"
              style={{ color: T.textoSuave }}
            >
              <Search size={12} />
              Buscar
              <kbd
                className="ml-1 px-1 py-0.5 rounded text-xs"
                style={{ background: `${T.fundo}88`, color: `${T.textoSuave}88`, border: `1px solid ${T.borda}` }}
              >
                ⌘K
              </kbd>
            </button>
          </div>
        </div>

        {/* Conteúdo principal + painel de comentários */}
        <div className="flex flex-1 overflow-hidden">

          {/* Editor */}
          <div className="flex-1 overflow-hidden min-w-0">
            {activePage ? (
              <PageEditorShell
                page={activePage}
                blocks={activeBlocks}
                libraryTitle={libraryTitle}
                onSave={onSavePage}
              >
                {children}
              </PageEditorShell>
            ) : (
              <div className="h-full overflow-hidden">
                {children}
              </div>
            )}
          </div>

          {/* Painel de comentários */}
          {commentsOpen && activePage && (
            <div
              className="shrink-0 border-l overflow-hidden"
              style={{ width: 320, borderColor: T.borda }}
            >
              <CommentsPanel
                pageId={activePage.id}
                currentUser={currentUser}
                onClose={() => setCommentsOpen(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Modais globais ── */}

      <GlobalSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        items={dbItems}
      />
      <TemplatePickerModal
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        onSelect={handleTemplateSelect}
      />
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        schema={activeSchema}
        onImportPage={onImportPage}
        onImportCSV={onImportCSV}
      />
      <SharingModal
        open={sharingOpen}
        onClose={() => setSharingOpen(false)}
        libraryTitle={libraryTitle}
      />
    </div>
  )
}

// ─── AppShellV6 (exportação pública) ─────────────────────────────

export default function AppShellV6({
  libraryId,
  libraryTitle = '📚 Biblioteca',
  accessToken,
  pages = [],
  databases = [],
  onPagesChange,
  onNewPage,
  onNewDatabase,
  activePage,
  activeBlocks = [],
  onSavePage,
  activeSchema,
  onImportPage,
  onImportCSV,
  currentUser,
  pagesParentId,
  onTokenExpired,
  children,
}) {
  return (
    <NavigationProvider
      libraryId={libraryId}
      accessToken={accessToken}
      pages={pages}
      databases={databases}
      onPagesChange={onPagesChange}
    >
      <CollaborationProvider
        libraryId={libraryId}
        pagesParentId={pagesParentId}
        accessToken={accessToken}
        currentUser={currentUser}
        onTokenExpired={onTokenExpired}
      >
        <AppShellInner
          libraryId={libraryId}
          libraryTitle={libraryTitle}
          accessToken={accessToken}
          pages={pages}
          databases={databases}
          onPagesChange={onPagesChange}
          onNewPage={onNewPage}
          onNewDatabase={onNewDatabase}
          activePage={activePage}
          activeBlocks={activeBlocks}
          onSavePage={onSavePage}
          activeSchema={activeSchema}
          onImportPage={onImportPage}
          onImportCSV={onImportCSV}
          currentUser={currentUser}
        >
          {children}
        </AppShellInner>
      </CollaborationProvider>
    </NavigationProvider>
  )
}
