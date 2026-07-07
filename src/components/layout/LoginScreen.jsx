import React from 'react'
import { useAuth } from '../../contexts/AuthContext.jsx'

export default function LoginScreen() {
  const { signIn, loading, error } = useAuth()

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center bg-fundo"
      style={{
        backgroundImage: `
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 60px,
            rgba(92,61,30,0.08) 60px,
            rgba(92,61,30,0.08) 62px
          )
        `,
      }}
    >
      {/* Painel central — papel envelhecido */}
      <div className="bg-card text-texto rounded shadow-livro px-12 py-14 flex flex-col items-center gap-8 max-w-sm w-full mx-4">

        {/* Ícone de biblioteca */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-6xl select-none" role="img" aria-label="biblioteca">📚</span>
          <h1 className="font-serif text-3xl font-bold text-texto text-center leading-tight">
            Biblioteca
          </h1>
          <p className="font-sans text-sm text-texto-suave text-center">
            Seu acervo pessoal de ideias e histórias
          </p>
        </div>

        {/* Divider dourado */}
        <div className="divider-ouro w-full" />

        {/* Botão de login */}
        <button
          onClick={signIn}
          disabled={loading}
          className="
            w-full flex items-center justify-center gap-3
            bg-texto text-card px-6 py-3 rounded
            font-sans font-medium text-sm
            hover:brightness-110 active:scale-95
            transition-all duration-150
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {/* Logo Google SVG simples */}
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.29-8.16 2.29-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {loading ? 'Aguardando…' : 'Entrar com Google'}
        </button>

        {error && (
          <p className="text-xs font-sans text-center" style={{ color: '#D44C47' }}>
            {error}
          </p>
        )}

        <p className="text-xs font-sans text-texto-suave text-center">
          Seus dados ficam no seu Google Drive.<br />Nenhum servidor externo armazena seu conteúdo.
        </p>
      </div>

      {/* Rodapé */}
      <p className="mt-8 text-xs font-sans text-texto-suave/50">
        Biblioteca · Inspirado no Notion
      </p>
    </div>
  )
}
