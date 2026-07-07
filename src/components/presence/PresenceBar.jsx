/**
 * PresenceBar.jsx — Fase 6
 *
 * Exibe avatares de colaboradores ativos na biblioteca.
 * Funciona via polling no Drive (_presence.json), sem WebSocket.
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │  Como funciona (GitHub Pages, sem backend):                  │
 * │                                                              │
 * │  Cada usuário escreve seu próprio heartbeat em              │
 * │  _presence.json a cada 15s. Os outros leem o mesmo          │
 * │  arquivo e filtram quem "viu" há menos de 45s.             │
 * │                                                              │
 * │  Não é tempo real — há latência de até 15s. Mas é          │
 * │  suficiente para saber quem está colaborando agora.         │
 * └──────────────────────────────────────────────────────────────┘
 *
 * Props:
 *   currentUser — { id, name, email, avatarUrl }
 *   compact     — boolean (padrão false): exibe só avatares sem texto
 */

import { useState } from 'react'
import { Users, Wifi, WifiOff } from 'lucide-react'
import { useCollaboration } from '../../contexts/CollaborationContext.jsx'

// ─── Cores ────────────────────────────────────────────────────────

const T = {
  fundo:      '#1C1610',
  superficie: '#2A1F14',
  card:       '#F5EDD6',
  textoSuave: '#6B4C3B',
  destaque:   '#8B4513',
  ouro:       '#C9A84C',
  borda:      '#5C3D1E',
  verde:      '#22c55e',
}

// ─── Paleta de cores para avatares sem foto ───────────────────────

const AVATAR_COLORS = [
  '#8B4513', '#6B4C3B', '#C9A84C', '#5C3D1E',
  '#7C5C2E', '#A0522D', '#D4A76A', '#4A3728',
]

function avatarColor(userId = '') {
  let hash = 0
  for (const ch of userId) hash = (hash * 31 + ch.charCodeAt(0)) & 0xFFFF
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

// ─── UserAvatar ───────────────────────────────────────────────────

function UserAvatar({ user, size = 28, showTooltip = true }) {
  const [hovered, setHovered] = useState(false)

  const initials = (user.name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  const isOnCurrentPage = !!user.pageId

  return (
    <div
      className="relative"
      onMouseEnter={() => showTooltip && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      <div
        className="rounded-full flex items-center justify-center overflow-hidden"
        style={{
          width: size,
          height: size,
          border: `2px solid ${isOnCurrentPage ? T.verde : T.borda}`,
          boxShadow: isOnCurrentPage ? `0 0 0 1px ${T.fundo}` : 'none',
        }}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-xs font-semibold"
            style={{ background: avatarColor(user.userId), color: T.card }}
          >
            {initials}
          </div>
        )}
      </div>

      {/* Indicador verde "online" */}
      <span
        className="absolute -bottom-0.5 -right-0.5 rounded-full border"
        style={{
          width: 8,
          height: 8,
          background: T.verde,
          borderColor: T.fundo,
        }}
      />

      {/* Tooltip */}
      {hovered && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg text-xs font-serif whitespace-nowrap z-50 shadow-xl"
          style={{ background: T.superficie, color: T.card, border: `1px solid ${T.borda}` }}
        >
          <p className="font-semibold">{user.name}</p>
          {user.pageId && (
            <p style={{ color: T.textoSuave }}>Editando agora</p>
          )}
          {/* Seta */}
          <span
            className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"
            style={{ borderTopColor: T.borda }}
          />
        </div>
      )}
    </div>
  )
}

// ─── PresenceBar ──────────────────────────────────────────────────

export default function PresenceBar({ currentUser, compact = false }) {
  const { onlineUsers } = useCollaboration()
  const [expanded, setExpanded] = useState(false)

  const total = onlineUsers.length

  // Modo compacto: só avatares empilhados
  if (compact) {
    if (total === 0) return null

    return (
      <div className="flex items-center">
        {/* Avatares empilhados (máx 4) */}
        <div className="flex -space-x-1.5">
          {onlineUsers.slice(0, 4).map(user => (
            <UserAvatar key={user.userId} user={user} size={24} />
          ))}
        </div>
        {total > 4 && (
          <span className="ml-1.5 text-xs" style={{ color: T.textoSuave }}>
            +{total - 4}
          </span>
        )}
      </div>
    )
  }

  // Modo completo: barra com lista dropdown
  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-white/10"
        style={{ color: total > 0 ? T.ouro : T.textoSuave }}
      >
        {total > 0
          ? <Wifi size={13} />
          : <WifiOff size={13} />
        }

        {/* Avatares empilhados */}
        {total > 0 && (
          <div className="flex -space-x-1.5">
            {onlineUsers.slice(0, 3).map(user => (
              <UserAvatar key={user.userId} user={user} size={22} showTooltip={false} />
            ))}
          </div>
        )}

        <span className="text-xs font-serif">
          {total === 0
            ? 'Somente você'
            : total === 1
              ? '1 online'
              : `${total} online`
          }
        </span>
      </button>

      {/* Dropdown de usuários online */}
      {expanded && total > 0 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setExpanded(false)} />
          <div
            className="absolute right-0 top-full mt-1 w-56 rounded-xl shadow-2xl z-50 overflow-hidden"
            style={{ background: T.superficie, border: `1px solid ${T.borda}` }}
          >
            <div
              className="px-3 py-2 flex items-center gap-1.5"
              style={{ borderBottom: `1px solid ${T.borda}` }}
            >
              <Users size={12} style={{ color: T.textoSuave }} />
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: T.textoSuave }}>
                Ativos agora
              </p>
            </div>
            {onlineUsers.map(user => (
              <div
                key={user.userId}
                className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 transition-colors"
              >
                <UserAvatar user={user} size={28} showTooltip={false} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-serif truncate" style={{ color: T.card }}>
                    {user.name}
                  </p>
                  <p className="text-xs truncate" style={{ color: T.textoSuave }}>
                    {user.pageId ? 'Editando uma página' : 'Na biblioteca'}
                  </p>
                </div>
                {/* Indicador de "mesma página" */}
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: T.verde }}
                  title="Online"
                />
              </div>
            ))}

            {/* Você mesmo */}
            {currentUser && (
              <>
                <div className="mx-3 my-1" style={{ borderTop: `1px solid ${T.borda}` }} />
                <div className="flex items-center gap-2.5 px-3 pb-2.5">
                  <div
                    className="rounded-full flex items-center justify-center text-xs font-semibold"
                    style={{ width: 28, height: 28, background: T.ouro, color: T.fundo }}
                  >
                    {(currentUser.name ?? 'V')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-serif truncate" style={{ color: T.card }}>
                      {currentUser.name} (você)
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── CurrentPagePresence — avatares de quem está na mesma página ──

/**
 * Versão compacta mostrando somente quem está NA MESMA página.
 * Útil no PageEditorShell, ao lado do título.
 *
 * Uso:
 *   <CurrentPagePresence pageId={page.id} />
 */
export function CurrentPagePresence({ pageId }) {
  const { onlineUsers } = useCollaboration()

  const hereUsers = onlineUsers.filter(u => u.pageId === pageId)
  if (hereUsers.length === 0) return null

  return (
    <div className="flex items-center gap-1" title={`${hereUsers.length} pessoa(s) nesta página`}>
      <div className="flex -space-x-1.5">
        {hereUsers.slice(0, 4).map(user => (
          <UserAvatar key={user.userId} user={user} size={22} />
        ))}
      </div>
      {hereUsers.length > 4 && (
        <span className="text-xs ml-1" style={{ color: '#6B4C3B' }}>
          +{hereUsers.length - 4}
        </span>
      )}
    </div>
  )
}
