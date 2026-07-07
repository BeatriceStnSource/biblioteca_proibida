/**
 * App.jsx — Projeto Biblioteca (Fases 1–6 completas)
 *
 * Roteamento principal com HashRouter (GitHub Pages compatível).
 * Providers aninhados na ordem correta:
 *   AuthProvider → ToastProvider → NavigationProvider → CollaborationProvider
 *
 * A integração do AppShellV6 (Fase 6) é feita dentro de LibraryView,
 * que já possui acesso ao libraryId, pages, databases e currentUser.
 * Aqui apenas garantimos que o AuthContext expõe o currentUser no
 * formato esperado pelos contextos de colaboração.
 */
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'
import { ToastProvider }         from './components/ui/Toast.jsx'
import LoginScreen  from './components/layout/LoginScreen.jsx'
import LibraryGrid  from './components/layout/LibraryGrid.jsx'
import LibraryView  from './components/layout/LibraryView.jsx'
import PageEditor   from './components/editor/PageEditor.jsx'
import DatabaseView from './components/database/DatabaseView.jsx'

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
      <Route path="/biblioteca/:libId/database/:dbId"    element={<DatabaseView />} />
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
