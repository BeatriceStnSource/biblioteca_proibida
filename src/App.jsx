import React from 'react'
import { Routes, Route, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'
import { ToastProvider }         from './components/ui/Toast.jsx'
import { DatabaseProvider }      from './contexts/DatabaseContext.jsx'
import LoginScreen  from './components/layout/LoginScreen.jsx'
import LibraryGrid  from './components/layout/LibraryGrid.jsx'
import LibraryView  from './components/layout/LibraryView.jsx'
import PageEditor   from './components/editor/PageEditor.jsx'
import DatabaseView from './components/database/DatabaseView.jsx'

function DatabaseRoute() {
  const { libId, dbId } = useParams()
  const { token } = useAuth()
  return (
    <DatabaseProvider libraryId={libId} databaseId={dbId} accessToken={token}>
      <DatabaseView />
    </DatabaseProvider>
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

  if (!isAuthenticated) {
    return <LoginScreen />
  }

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
