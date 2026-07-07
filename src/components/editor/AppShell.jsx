/**
 * AppShell.jsx — Fase 5
 *
 * Layout principal da aplicação depois do login.
 * Une todos os componentes da Fase 5:
 *
 *   ┌────────────┬─────────────────────────────────────┐
 *   │            │  Breadcrumb     [H] [↓] [···]        │
 *   │  Sidebar   ├─────────────────────────────────────┤
 *   │            │                                     │
 *   │ favoritos  │   PageEditorShell / DatabaseView     │
 *   │ páginas    │                    (children)        │
 *   │ estantes   │                                     │
 *   └────────────┴─────────────────────────────────────┘
 *
 * Props:
 *   libraryId    — ID da biblioteca no Drive
 *   libraryTitle — nome da biblioteca
 *   accessToken  — token OAuth
 *   pages        — array flat de páginas
 *   databases    — array de databases
 *   onPagesChange — (newPages) => void
 *   onNewPage    — () => void
 *   onNewDatabase — () => void
 *   activePage   — página ativa { id, title, icon, ... }
 *   activeBlocks — blocos da página ativa
 *   onSavePage   — async (blocks) => void
 *   activeSchema — schema do database ativo (para import CSV)
 *   onImportPage — ({ title, blocks }) => void
 *   onImportCSV  — ({ items }) => void
 *   children     — o editor de blocos ou DatabaseView
 */

import { useCallback, useState } from 'react'
import { NavigationProvider }   from '../../contexts/NavigationContext.jsx'
import Sidebar                  from '../sidebar/Sidebar.jsx'
import GlobalSearch, { useGlobalSearchShortcut } from '../search/GlobalSearch.jsx'
import PageEditorShell          from './PageEditorShell.jsx'
import TemplatePickerModal      from '../templates/PageTemplates.jsx'
import ImportModal              from '../search/ImportModal.jsx'
import { Search, Upload }       from 'lucide-react'

const T = {
  fundo:      '#1C1610',
  superficie: '#2A1F14',
  ouro:       '#C9A84C',
  textoSuave: '#6B4C3B',
  borda:      '#5C3D1E',
}

export default function AppShell({
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
  children,
}) {
  const [searchOpen,    setSearchOpen]    = useState(false)
  const [templateOpen,  setTemplateOpen]  = useState(false)
  const [importOpen,    setImportOpen]    = useState(false)

  // Ctrl+K abre busca global
  useGlobalSearchShortcut(useCallback(() => setSearchOpen(true), []))

  // Items de database achatados para a busca global (montados externamente)
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
    // Ao criar nova página, oferecer template picker
    setTemplateOpen(true)
  }

  function handleTemplateSelect(tpl) {
    // Criar página com os blocos do template
    onNewPage?.(tpl)
    setTemplateOpen(false)
  }

  return (
    <NavigationProvider
      libraryId={libraryId}
      accessToken={accessToken}
      pages={pages}
      databases={databases}
      onPagesChange={onPagesChange}
    >
      <div className="flex h-screen overflow-hidden" style={{ background: T.fundo }}>
        {/* Sidebar */}
        <Sidebar
          onNewPage={handleNewPage}
          onNewDatabase={onNewDatabase}
        />

        {/* Área principal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Barra superior: search + import */}
          <div
            className="flex items-center justify-end gap-1 px-3 py-1.5"
            style={{ borderBottom: `1px solid ${T.borda}`, background: T.superficie }}
          >
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs hover:bg-white/10 transition-colors font-serif"
              style={{ color: T.textoSuave }}
              title="Importar arquivo"
            >
              <Upload size={12} />
              Importar
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs hover:bg-white/10 transition-colors font-serif"
              style={{ color: T.textoSuave }}
              title="Buscar (Ctrl+K)"
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

          {/* Editor shell (breadcrumb + ações) ou conteúdo direto */}
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
            <div className="flex-1 overflow-hidden">
              {children}
            </div>
          )}
        </div>
      </div>

      {/* Modais globais */}
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
    </NavigationProvider>
  )
}
