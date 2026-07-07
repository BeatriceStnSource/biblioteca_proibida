/**
 * LibraryGrid.jsx
 *
 * Tela inicial: exibe todas as bibliotecas do usuário (pastas no Drive raiz),
 * com cards no estilo capa de livro. Permite criar nova biblioteca.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useToast } from '../ui/Toast.jsx'
import {
  listFiles, createFolder, createFile, readFile,
} from '../../lib/drive.js'
import { DRIVE_FILE_NAMES } from '../../lib/constants.js'

// ─── Card de biblioteca (capa de livro) ───────────────────────────

function LibraryCard({ library, onClick }) {
  const icon  = library.meta?.icon  ?? '📚'
  const color = library.meta?.color ?? '#8B4513'

  return (
    <button
      onClick={onClick}
      className="card-livro flex flex-col items-center justify-end p-3 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ouro"
      title={library.name}
    >
      {/* Área de imagem / cor */}
      <div
        className="absolute inset-0"
        style={{
          background: library.meta?.cover
            ? `url(${library.meta.cover}) center/cover no-repeat`
            : `linear-gradient(160deg, ${color}cc 0%, ${color}44 100%)`,
        }}
      />

      {/* Sobreposição de papel */}
      <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/20 to-transparent" />

      {/* Conteúdo */}
      <div className="relative z-10">
        <span className="text-2xl block mb-1">{icon}</span>
        <p className="font-serif text-sm font-semibold text-texto leading-tight truncar-2">
          {library.name || 'Sem título'}
        </p>
        {library.meta?.description && (
          <p className="font-sans text-[10px] text-texto-suave mt-0.5 truncar-2">
            {library.meta.description}
          </p>
        )}
      </div>
    </button>
  )
}

// ─── Modal de nova biblioteca ──────────────────────────────────────

function NewLibraryModal({ onConfirm, onClose }) {
  const [name, setName]   = useState('')
  const [icon, setIcon]   = useState('📚')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    await onConfirm({ name: name.trim(), icon })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card text-texto rounded shadow-livro p-8 w-full max-w-sm flex flex-col gap-5">
        <h2 className="font-serif text-xl font-bold">Nova Biblioteca</h2>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={icon}
            onChange={e => setIcon(e.target.value)}
            className="w-12 h-12 text-2xl text-center bg-superficie/10 border border-borda rounded outline-none focus:ring-1 focus:ring-ouro"
            maxLength={2}
          />
          <input
            autoFocus
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
            placeholder="Nome da biblioteca…"
            className="flex-1 px-3 py-2 bg-superficie/10 border border-borda rounded font-serif text-texto outline-none focus:ring-1 focus:ring-ouro placeholder:text-texto-suave/50 text-sm"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-ghost text-texto">Cancelar</button>
          <button onClick={handleCreate} disabled={!name.trim() || loading} className="btn-primario">
            {loading ? 'Criando…' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────────────

export default function LibraryGrid() {
  const { user, signOut }     = useAuth()
  const navigate              = useNavigate()
  const toast                 = useToast()
  const [libraries, setLibraries] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)

  // ── Carrega bibliotecas (pastas no root do Drive) ──────────────
  const loadLibraries = useCallback(async () => {
    setLoading(true)
    try {
      // Lista todas as pastas na raiz do Drive do app
      const folders = await listFiles('root', 'application/vnd.google-apps.folder')

      // Para cada pasta, tenta ler _meta.json
      const libs = await Promise.all(
        folders.map(async (folder) => {
          try {
            const metaFiles = await listFiles(folder.id)
            const metaFile  = metaFiles.find(f => f.name === DRIVE_FILE_NAMES.META)
            const meta      = metaFile ? await readFile(metaFile.id) : null
            return { ...folder, meta }
          } catch {
            return { ...folder, meta: null }
          }
        })
      )

      setLibraries(libs)
    } catch (err) {
      console.error('[LibraryGrid] Erro ao carregar bibliotecas:', err)
      toast.error('Erro ao carregar bibliotecas.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { loadLibraries() }, [loadLibraries])

  // ── Cria nova biblioteca ───────────────────────────────────────
  async function handleCreateLibrary({ name, icon }) {
    try {
      // 1. Cria a pasta raiz
      const folder = await createFolder('root', name)

      // 2. Cria subpastas
      await Promise.all([
        createFolder(folder.id, 'pages'),
        createFolder(folder.id, 'databases'),
        createFolder(folder.id, 'assets'),
      ])

      // 3. Cria _meta.json
      const meta = {
        id:          folder.id,
        name,
        icon,
        description: '',
        cover:       null,
        createdAt:   new Date().toISOString(),
        updatedAt:   new Date().toISOString(),
      }
      await createFile(folder.id, DRIVE_FILE_NAMES.META, meta)

      toast.success(`Biblioteca "${name}" criada!`)
      setShowModal(false)
      loadLibraries()
    } catch (err) {
      console.error('[LibraryGrid] Erro ao criar biblioteca:', err)
      toast.error('Erro ao criar biblioteca.')
    }
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-fundo">
      {/* Header */}
      <header className="border-b border-borda bg-superficie/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📚</span>
          <h1 className="font-serif text-xl text-card font-bold">Biblioteca</h1>
        </div>
        <div className="flex items-center gap-3">
          {user?.picture && (
            <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border-2 border-borda" />
          )}
          <span className="text-sm font-sans text-texto-suave hidden sm:inline">{user?.name}</span>
          <button onClick={signOut} className="btn-ghost text-sm">Sair</button>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-serif text-2xl text-card font-semibold">Suas Bibliotecas</h2>
            <p className="font-sans text-sm text-texto-suave mt-1">
              {libraries.length} {libraries.length === 1 ? 'biblioteca' : 'bibliotecas'}
            </p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primario flex items-center gap-2">
            <span>+</span> Nova Biblioteca
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-4xl animate-pulse">📚</span>
          </div>
        ) : libraries.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-6xl block mb-4">📭</span>
            <p className="font-serif text-xl text-card/70 mb-2">Nenhuma biblioteca ainda</p>
            <p className="font-sans text-sm text-texto-suave mb-6">
              Crie sua primeira biblioteca para começar a escrever
            </p>
            <button onClick={() => setShowModal(true)} className="btn-primario">
              + Criar primeira biblioteca
            </button>
          </div>
        ) : (
          /* Prateleira */
          <div className="prateleira pb-8">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 pt-4">
              {libraries.map(lib => (
                <LibraryCard
                  key={lib.id}
                  library={lib}
                  onClick={() => navigate(`/biblioteca/${lib.id}`)}
                />
              ))}
              {/* Card de nova biblioteca */}
              <button
                onClick={() => setShowModal(true)}
                className="
                  aspect-[2/3] border-2 border-dashed border-borda/40
                  rounded flex flex-col items-center justify-center gap-2
                  hover:border-ouro/60 hover:bg-white/5
                  transition-colors text-texto-suave/40 hover:text-ouro/60
                "
              >
                <span className="text-3xl">+</span>
                <span className="text-xs font-sans">Nova</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {showModal && (
        <NewLibraryModal
          onConfirm={handleCreateLibrary}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
