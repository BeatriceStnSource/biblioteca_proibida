/**
 * Breadcrumb.jsx — Fase 5
 *
 * Mostra a localização da página atual na hierarquia:
 *   📚 Biblioteca > 📁 Ficção Científica > 📖 Duna > Capítulo 3
 *
 * Cada item é clicável para navegar.
 * Sempre visível no topo do editor.
 */

import { ChevronRight, BookOpen } from 'lucide-react'
import { useNavigation } from '../../contexts/NavigationContext.jsx'

const T = {
  textoSuave: '#6B4C3B',
  ouro:       '#C9A84C',
  card:       '#F5EDD6',
  borda:      '#5C3D1E',
  fundo:      '#1C1610',
}

export default function Breadcrumb({ libraryTitle = '📚 Biblioteca' }) {
  const { breadcrumb, navigateTo } = useNavigation()

  return (
    <nav
      className="flex items-center gap-1 px-4 py-2 text-xs font-serif overflow-x-auto"
      style={{
        background: T.fundo,
        borderBottom: `1px solid ${T.borda}`,
        scrollbarWidth: 'none',
        minHeight: 36,
      }}
      aria-label="Localização na estante"
    >
      {/* Raiz: nome da biblioteca */}
      <button
        onClick={() => navigateTo(null)}
        className="flex items-center gap-1 shrink-0 hover:opacity-80 transition-opacity"
        style={{ color: T.textoSuave }}
      >
        <BookOpen size={12} />
        <span>{libraryTitle}</span>
      </button>

      {/* Trail de páginas */}
      {breadcrumb.map((page, idx) => {
        const isLast = idx === breadcrumb.length - 1
        return (
          <div key={page.id} className="flex items-center gap-1 shrink-0">
            <ChevronRight size={11} style={{ color: T.textoSuave, opacity: 0.5 }} />
            {isLast ? (
              // Página atual: não clicável, destaque dourado
              <span
                className="font-semibold truncate max-w-[200px]"
                style={{ color: T.ouro }}
                title={page.title}
              >
                {page.icon && <span className="mr-1">{page.icon}</span>}
                {page.title || 'Sem título'}
              </span>
            ) : (
              <button
                onClick={() => navigateTo(page.id)}
                className="hover:opacity-80 transition-opacity truncate max-w-[160px]"
                style={{ color: T.card }}
                title={page.title}
              >
                {page.icon && <span className="mr-1">{page.icon}</span>}
                {page.title || 'Sem título'}
              </button>
            )}
          </div>
        )
      })}
    </nav>
  )
}
