/**
 * SharingModal.jsx — Fase 6
 *
 * Modal de compartilhamento da biblioteca.
 * Usa Drive Permissions API — funciona sem backend.
 *
 * Funcionalidades:
 *  - Compartilhar com e-mail (Visualizar / Comentar / Editar)
 *  - Link público (qualquer pessoa com o link)
 *  - Ver e gerenciar colaboradores atuais
 *  - Remover acesso
 */

import { useState, useRef, useEffect } from 'react'
import {
  X, Link, Copy, Check, UserPlus, ChevronDown,
  Globe, Lock, Trash2, Crown, Eye, MessageSquare, Pen,
} from 'lucide-react'
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
  erro:       '#ef4444',
}

// ─── Mapa de papéis ──────────────────────────────────────────────

const ROLES = [
  { value: 'reader',    label: 'Visualizar',  Icon: Eye,          desc: 'Pode ler e navegar' },
  { value: 'commenter', label: 'Comentar',    Icon: MessageSquare, desc: 'Pode adicionar comentários' },
  { value: 'writer',    label: 'Editar',      Icon: Pen,          desc: 'Pode editar o conteúdo' },
]

const ROLE_LABEL = Object.fromEntries(ROLES.map(r => [r.value, r.label]))

// ─── RoleMenu ─────────────────────────────────────────────────────

function RoleMenu({ value, onChange, align = 'right' }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-sm transition-colors hover:bg-white/10"
        style={{ color: T.card, border: `1px solid ${T.borda}` }}
      >
        {ROLE_LABEL[value] ?? value}
        <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1 w-52 rounded-lg shadow-xl z-50 overflow-hidden`}
            style={{ background: T.superficie, border: `1px solid ${T.borda}` }}
          >
            {ROLES.map(({ value: v, label, Icon, desc }) => (
              <button
                key={v}
                onClick={() => { onChange(v); setOpen(false) }}
                className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
              >
                <Icon size={14} style={{ color: T.textoSuave, marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p
                    className="text-sm font-serif"
                    style={{ color: value === v ? T.ouro : T.card }}
                  >
                    {label}
                  </p>
                  <p className="text-xs" style={{ color: T.textoSuave }}>{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────

function Avatar({ name, avatarUrl, size = 32 }) {
  const initials = (name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 text-xs font-semibold"
      style={{
        width: size, height: size,
        background: T.destaque,
        color: T.card,
      }}
    >
      {initials}
    </div>
  )
}

// ─── SharingModal ─────────────────────────────────────────────────

export default function SharingModal({ open, onClose, libraryTitle }) {
  const {
    permissions,
    isPublic,
    sharingError,
    shareWithEmail,
    setPublicLink,
    updatePermission,
    removePermission,
    getPublicLink,
    loadPermissions,
  } = useCollaboration()

  const [email,      setEmail]      = useState('')
  const [role,       setRole]       = useState('reader')
  const [inviting,   setInviting]   = useState(false)
  const [inviteErr,  setInviteErr]  = useState(null)
  const [copied,     setCopied]     = useState(false)
  const [togglingPub, setTogglingPub] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      loadPermissions()
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  if (!open) return null

  // ── Convidar ──────────────────────────────────────────────────

  async function handleInvite() {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) {
      setInviteErr('Digite um e-mail válido.')
      return
    }
    setInviteErr(null)
    setInviting(true)
    try {
      await shareWithEmail(trimmed, role)
      setEmail('')
    } catch {
      setInviteErr('Não foi possível convidar. Tente novamente.')
    } finally {
      setInviting(false)
    }
  }

  // ── Copiar link ───────────────────────────────────────────────

  function handleCopyLink() {
    navigator.clipboard.writeText(getPublicLink()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Toggle público ───────────────────────────────────────────

  async function handleTogglePublic() {
    setTogglingPub(true)
    try { await setPublicLink(!isPublic) }
    finally { setTogglingPub(false) }
  }

  // ── Colaboradores (filtrar owner e anyone) ───────────────────

  const collaborators = permissions.filter(
    p => p.type === 'user' && p.role !== 'owner'
  )
  const owner = permissions.find(p => p.role === 'owner')

  // ─── Render ───────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: T.superficie, border: `1px solid ${T.borda}` }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: `1px solid ${T.borda}` }}
          >
            <div>
              <h2 className="font-serif text-base font-semibold" style={{ color: T.card }}>
                Compartilhar biblioteca
              </h2>
              <p className="text-xs mt-0.5" style={{ color: T.textoSuave }}>
                {libraryTitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
              style={{ color: T.textoSuave }}
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-5 py-4 space-y-5 max-h-[70vh] overflow-y-auto">

            {/* Convidar por e-mail */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: T.textoSuave }}>
                Convidar colaborador
              </label>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setInviteErr(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') handleInvite() }}
                  placeholder="email@exemplo.com"
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-serif outline-none transition-colors"
                  style={{
                    background: `${T.fundo}cc`,
                    color: T.card,
                    border: `1px solid ${inviteErr ? T.erro : T.borda}`,
                  }}
                />
                <RoleMenu value={role} onChange={setRole} align="right" />
                <button
                  onClick={handleInvite}
                  disabled={inviting || !email.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-serif transition-colors disabled:opacity-50"
                  style={{ background: T.destaque, color: T.card }}
                >
                  <UserPlus size={14} />
                  {inviting ? 'Enviando…' : 'Convidar'}
                </button>
              </div>
              {(inviteErr || sharingError) && (
                <p className="text-xs mt-1.5" style={{ color: T.erro }}>
                  {inviteErr || sharingError}
                </p>
              )}
            </div>

            {/* Link público */}
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: `${T.fundo}66`, border: `1px solid ${T.borda}` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {isPublic
                    ? <Globe size={16} style={{ color: T.ouro }} />
                    : <Lock  size={16} style={{ color: T.textoSuave }} />
                  }
                  <div>
                    <p className="text-sm font-serif" style={{ color: T.card }}>
                      {isPublic ? 'Link público ativo' : 'Link público inativo'}
                    </p>
                    <p className="text-xs" style={{ color: T.textoSuave }}>
                      {isPublic
                        ? 'Qualquer pessoa com o link pode visualizar'
                        : 'Apenas colaboradores convidados têm acesso'}
                    </p>
                  </div>
                </div>

                {/* Toggle switch */}
                <button
                  onClick={handleTogglePublic}
                  disabled={togglingPub}
                  className="relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none"
                  style={{ background: isPublic ? T.ouro : T.borda }}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200"
                    style={{ transform: isPublic ? 'translateX(22px)' : 'translateX(2px)' }}
                  />
                </button>
              </div>

              {isPublic && (
                <div className="flex gap-2">
                  <div
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-mono truncate"
                    style={{ background: `${T.fundo}cc`, color: T.textoSuave, border: `1px solid ${T.borda}` }}
                  >
                    {getPublicLink()}
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-serif transition-colors"
                    style={{
                      background: copied ? `${T.ouro}22` : 'transparent',
                      color: copied ? T.ouro : T.textoSuave,
                      border: `1px solid ${copied ? T.ouro : T.borda}`,
                    }}
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              )}
            </div>

            {/* Lista de colaboradores */}
            {(owner || collaborators.length > 0) && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: T.textoSuave }}>
                  Pessoas com acesso
                </p>
                <div className="space-y-1">
                  {/* Dono */}
                  {owner && (
                    <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
                      <Avatar name={owner.displayName ?? owner.emailAddress} size={30} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-serif truncate" style={{ color: T.card }}>
                          {owner.displayName || owner.emailAddress}
                        </p>
                        <p className="text-xs truncate" style={{ color: T.textoSuave }}>
                          {owner.emailAddress}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0" style={{ color: T.ouro }}>
                        <Crown size={12} />
                        <span className="text-xs font-serif">Proprietário</span>
                      </div>
                    </div>
                  )}

                  {/* Colaboradores */}
                  {collaborators.map(perm => (
                    <CollaboratorRow
                      key={perm.id}
                      perm={perm}
                      onRoleChange={newRole => updatePermission(perm.id, newRole)}
                      onRemove={() => removePermission(perm.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderTop: `1px solid ${T.borda}`, background: `${T.fundo}44` }}
          >
            <p className="text-xs" style={{ color: T.textoSuave }}>
              Permissões gerenciadas pelo Google Drive
            </p>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-sm font-serif transition-colors"
              style={{ background: T.destaque, color: T.card }}
            >
              Concluído
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── CollaboratorRow ──────────────────────────────────────────────

function CollaboratorRow({ perm, onRoleChange, onRemove }) {
  const [removing, setRemoving] = useState(false)

  async function handleRemove() {
    setRemoving(true)
    try { await onRemove() }
    finally { setRemoving(false) }
  }

  return (
    <div className="flex items-center gap-3 px-2 py-2 rounded-lg group hover:bg-white/5 transition-colors">
      <Avatar name={perm.displayName ?? perm.emailAddress} size={30} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-serif truncate" style={{ color: T.card }}>
          {perm.displayName || perm.emailAddress}
        </p>
        <p className="text-xs truncate" style={{ color: T.textoSuave }}>
          {perm.emailAddress}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <RoleMenu value={perm.role} onChange={onRoleChange} align="right" />
        <button
          onClick={handleRemove}
          disabled={removing}
          className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
          style={{ color: T.erro }}
          title="Remover acesso"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}
