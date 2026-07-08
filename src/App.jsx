import React, { useState, useEffect } from 'react'
import { Routes, Route, useParams, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'
import { ToastProvider }         from './components/ui/Toast.jsx'
import { DatabaseProvider }      from './contexts/DatabaseContext.jsx'
import AppShellV6                from './components/editor/AppShellV6.jsx'
import LoginScreen  from './components/layout/LoginScreen.jsx'
import LibraryGrid  from './components/layout/LibraryGrid.jsx'
import LibraryView  from './components/layout/LibraryView.jsx'
import PageEditor   from './components/editor/PageEditor.jsx'
import DatabaseView from './components/database/DatabaseView.jsx'
import { listFiles, readFile } from './lib/drive.js'
import { DRIVE_FOLDER_NAMES, DRIVE_FILE_NAMES } from './lib/constants.js'

function DatabaseRoute() {
  const { libId, dbId } = useParams()
  const navigate         = useNavigate()
  const { token, signIn } = useAuth()

  const [meta,        setMeta]        = useState(null)
  const [pages,       setPages]       = useState([])
  const [databases,   setDatabases]   = useState([])
  const [pagesFolder, setPagesFolder] = useState(null)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!token || !libId) return
    async function load() {
      setLoading(true)
      try {
        const files = await listFiles(libId)
        const metaFile = files.find(f => f.name === DRIVE_FILE_NAMES.META)
        if (metaFile) setMeta(await readFile(metaFile.id))

        const pagesDir = files.find(f => f.name === DRIVE_FOLDER_NAMES.PAGES)
        if (pagesDir) {
          setPagesFolder(pagesDir.id)
          const pf = await listFiles(pagesDir.id, 'application/json')
          const loaded = await Promise.all(
            pf.filter(f => !f.name.endsWith('_comments.json')).map(async f => {
              try { return { ...f, data: await readFile(f.id) } } catch { return null }
            })
          )
          setPages(loaded.filter(Boolean))
        }

        const dbsDir = files.find(f => f.name === DRIVE_FOLDER_NAMES.DATABASES)
        if (dbsDir) {
          const dbFolders = await listFiles(dbsDir.id)
          const loadedDbs = await Promise.all(
            dbFolders.filter(f => f.mimeType === 'application/vnd.google-apps.folder').map(async folder => {
              try {
                const ff = await listFiles(folder.id)
                const schemaFile = ff.find(f => f.name === DRIVE_FILE_NAMES.SCHEMA)
                if (!schemaFile) return null
                return { folderId: folder.id, schema: await readFile(schemaFile.id), itemCount: ff.length - 1 }
              } catch { return null }
            })
          )
          setDatabases(loadedDbs.filter(Boolean))
        }
      } catch (err) {
        console.error('[DatabaseRoute] Erro:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [libId, token])

  if (loading) {
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
      onNewPage={() => navigate(`/biblioteca/${libId}`)}
      onNewDatabase={() => navigate(`/biblioteca/${libId}`)}
      activePage={null}
      activeBlocks={[]}
      onSavePage={null}
      activeSchema={null}
      onImportPage={null}
      onImportCSV={null}
      currentUser={null}
      pagesParentId={pagesFolder ?? libId}
      onTokenExpired={signIn}
    >
      <DatabaseProvider libraryId={libId} databaseId={dbId} accessToken={token}>
        <div className="h-full overflow-auto">
          <DatabaseView />
        </div>
      </DatabaseProvider>
    </AppShellV6>
  )
}

function NotFound() {
  return (
    <div className="min-h-dvh bg-fundo flex flex-col items-center justify-center gap-4">
      <span className="text-5xl">🔍</span>
      <p className="font-serif text-card text-xl">Página não encontrada</p>
    </div>
  )
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-dvh bg-fundo flex items-center justify-center">
        <span className="text-4xl animate-pulse">📚</span>
      </div>
    )
  }

  if (!isAuthenticated) return <LoginScreen />

  return (
    <Routes>
      <Route path="/"                                    element={<LibraryGrid />} />
      <Route path="/biblioteca/:libId"                   element={<LibraryView />} />
      <Route path="/biblioteca/:libId/pagina/:pageId"    element={<PageEditor />} />
      <Route path="/biblioteca/:libId/database/:dbId"    element={<DatabaseRoute />} />
      <Route path="*"                                    element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  )
}
