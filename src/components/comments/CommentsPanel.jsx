/**
 * CommentsPanel.jsx — Fase 6
 *
 * Painel lateral de comentários de uma página.
 * Suporta:
 *  - Comentários em página (thread geral)
 *  - Comentários em bloco específico
 *  - Comentários em seleção de texto
 *  - Respostas (threading)
 *  - Resolver / reabrir comentário
 *  - Deletar próprio comentário
 *  - Filtrar: abertos / resolvidos / todos
 *
 * Polling automático via CollaborationContext (30s).
 * Sem backend — dados persistem no Drive via _comments.json.
 */

import { useState, useRef, useEffect } from 'react'
import {
  X, MessageSquare, Check, RotateCcw, Trash2,
  ChevronDown, ChevronUp, Send, RefreshCw,
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
  verde:      '#22c55e',
}

// ─── Avatar ───────────────────────────────────────────────────────

function Avatar({ name, avatarUrl, size = 28 }) {
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
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 text-xs font-semibold"
      style={{ width: size, height: size, background: T.destaque, color: T.card }}
    >
      {initials}
    </div>
  )
}

// ─── Tempo relativo ───────────────────────────────────────────────

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60_000)
  const hr   = Math.floor(diff / 3_600_000)
  const day  = Math.floor(diff / 86_400_000)
  if (min < 1)  return 'agora'
  if (min < 60) return `${min}min`
  if (hr < 24)  return `${hr}h`
  if (day < 7)  return `${day}d`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// ─── CommentInput — caixa de texto para novo comentário/resposta ──

function CommentInput({ placeholder = 'Adicionar comentário…', onSubmit, autoFocus }) {
  const [text, setText] = useState('')
  const { savingComment } = useCollaboration()
  const textareaRef = useRef(null)

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus()
  }, [autoFocus])

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  async function handleSubmit() {
    const trimmed = text.trim()
    if (!trimmed) return
    await onSubmit(trimmed)
    setText('')
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${T.borda}`, background: `${T.fundo}88` }}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={2}
        className="w-full px-3 pt-2.5 pb-1 text-sm font-serif bg-transparent outline-none resize-none"
        style={{ color: T.card }}
      />
      <div className="flex items-center justify-between px-2 pb-2">
        <p className="text-xs" style={{ color: T.textoSuave }}>Enter para enviar · Shift+Enter nova linha</p>
        <button
          onClick={handleSubmit}
          disabled={savingComment || !text.trim()}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-serif transition-colors disabled:opacity-40"
          style={{ background: T.destaque, color: T.card }}
        >
          <Send size={11} />
          Enviar
        </button>
      </div>
    </div>
  )
}

// ─── ReplyThread ──────────────────────────────────────────────────

function ReplyThread({ pageId, comment, currentUserId }) {
  const { replyToComment } = useCollaboration()
  const [showReplyBox, setShowReplyBox] = useState(false)
  const [showReplies,  setShowReplies]  = useState(true)

  const replies = comment.replies ?? []

  return (
    <div>
      {/* Respostas existentes */}
      {replies.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowReplies(r => !r)}
            className="flex items-center gap-1 text-xs mb-1 hover:opacity-80 transition-opacity"
            style={{ color: T.textoSuave }}
          >
            {showReplies ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {replies.length} {replies.length === 1 ? 'resposta' : 'respostas'}
          </button>
          {showReplies && (
            <div
              className="ml-3 pl-3 space-y-3"
              style={{ borderLeft: `2px solid ${T.borda}` }}
            >
              {replies.map(reply => (
                <div key={reply.id} className="flex gap-2">
                  <Avatar name={reply.author?.name} avatarUrl={reply.author?.avatarUrl} size={22} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold font-serif truncate" style={{ color: T.card }}>
                        {reply.author?.name}
                      </span>
                      <span className="text-xs shrink-0" style={{ color: T.textoSuave }}>
                        {relativeTime(reply.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm font-serif mt-0.5" style={{ color: T.card, lineHeight: '1.5' }}>
                      {reply.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Botão de responder / caixa de resposta */}
      {!showReplyBox ? (
        <button
          onClick={() => setShowReplyBox(true)}
          className="text-xs mt-2 hover:opacity-80 transition-opacity"
          style={{ color: T.textoSuave }}
        >
          Responder
        </button>
      ) : (
        <div className="mt-2">
          <CommentInput
            placeholder="Escrever resposta… (Enter para enviar)"
            autoFocus
            onSubmit={async text => {
              await replyToComment(pageId, comment.id, text)
              setShowReplyBox(false)
            }}
          />
          <button
            onClick={() => setShowReplyBox(false)}
            className="text-xs mt-1 hover:opacity-80"
            style={{ color: T.textoSuave }}
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}

// ─── CommentCard ──────────────────────────────────────────────────

function CommentCard({ comment, pageId, currentUserId }) {
  const { resolveComment, deleteComment } = useCollaboration()
  const [resolving, setResolving] = useState(false)

  const isOwn     = comment.author?.id === currentUserId
  const isResolved = comment.resolved

  async function handleResolve() {
    setResolving(true)
    try { await resolveComment(pageId, comment.id, !isResolved) }
    finally { setResolving(false) }
  }

  // Badge de alvo do comentário
  const targetBadge = {
    page:      null,
    block:     '📦 Bloco',
    selection: `💬 "${comment.selectedText?.slice(0, 30)}${comment.selectedText?.length > 30 ? '…' : ''}"`,
  }[comment.targetType]

  return (
    <div
      className="rounded-xl p-3 transition-colors"
      style={{
        background: isResolved ? `${T.fundo}44` : `${T.fundo}88`,
        border: `1px solid ${isResolved ? T.borda + '44' : T.borda}`,
        opacity: isResolved ? 0.7 : 1,
      }}
    >
      {/* Target badge */}
      {targetBadge && (
        <p
          className="text-xs mb-2 px-2 py-0.5 rounded-md inline-block font-serif"
          style={{ background: `${T.ouro}22`, color: T.ouro }}
        >
          {targetBadge}
        </p>
      )}

      {/* Cabeçalho */}
      <div className="flex items-start gap-2">
        <Avatar name={comment.author?.name} avatarUrl={comment.author?.avatarUrl} size={28} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold font-serif truncate" style={{ color: T.card }}>
              {comment.author?.name}
            </span>
            <span className="text-xs shrink-0" style={{ color: T.textoSuave }}>
              {relativeTime(comment.createdAt)}
            </span>
          </div>
          <p className="text-sm font-serif mt-1" style={{ color: isResolved ? T.textoSuave : T.card, lineHeight: '1.6' }}>
            {comment.text}
          </p>
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 mt-2 ml-9">
        <button
          onClick={handleResolve}
          disabled={resolving}
          className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
          style={{ color: isResolved ? T.textoSuave : T.verde }}
          title={isResolved ? 'Reabrir comentário' : 'Marcar como resolvido'}
        >
          {isResolved ? <RotateCcw size={11} /> : <Check size={11} />}
          {isResolved ? 'Reabrir' : 'Resolver'}
        </button>

        {isOwn && (
          <button
            onClick={() => deleteComment(pageId, comment.id)}
            className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
            style={{ color: T.erro }}
            title="Deletar comentário"
          >
            <Trash2 size={11} />
            Deletar
          </button>
        )}

        {isResolved && comment.resolvedAt && (
          <span className="text-xs ml-auto" style={{ color: T.textoSuave }}>
            Resolvido {relativeTime(comment.resolvedAt)}
          </span>
        )}
      </div>

      {/* Respostas */}
      {!isResolved && (
        <div className="mt-2 ml-9">
          <ReplyThread pageId={pageId} comment={comment} currentUserId={currentUserId} />
        </div>
      )}
    </div>
  )
}

// ─── CommentsPanel ────────────────────────────────────────────────

export default function CommentsPanel({ pageId, currentUser, onClose }) {
  const {
    getComments,
    loadComments,
    loadingComments,
    addComment,
  } = useCollaboration()

  const [filter, setFilter] = useState('open')   // 'open' | 'resolved' | 'all'

  const comments = getComments(pageId, { includeResolved: filter !== 'open' })
  const visible  = filter === 'resolved'
    ? comments.filter(c => c.resolved)
    : filter === 'open'
      ? comments.filter(c => !c.resolved)
      : comments

  const openCount     = comments.filter(c => !c.resolved).length
  const resolvedCount = comments.filter(c => c.resolved).length

  return (
    <div className="flex flex-col h-full" style={{ background: T.superficie }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: `1px solid ${T.borda}` }}
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={15} style={{ color: T.ouro }} />
          <h3 className="text-sm font-semibold font-serif" style={{ color: T.card }}>
            Comentários
          </h3>
          {openCount > 0 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: `${T.destaque}44`, color: T.ouro }}
            >
              {openCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => loadComments(pageId)}
            disabled={loadingComments}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
            style={{ color: T.textoSuave }}
            title="Atualizar comentários"
          >
            <RefreshCw size={13} className={loadingComments ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
            style={{ color: T.textoSuave }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div
        className="flex px-4 py-2 gap-1 shrink-0"
        style={{ borderBottom: `1px solid ${T.borda}` }}
      >
        {[
          { value: 'open',     label: `Abertos (${openCount})` },
          { value: 'resolved', label: `Resolvidos (${resolvedCount})` },
          { value: 'all',      label: 'Todos' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className="px-2.5 py-1 rounded-md text-xs font-serif transition-colors"
            style={{
              background: filter === value ? `${T.ouro}22` : 'transparent',
              color: filter === value ? T.ouro : T.textoSuave,
              border: `1px solid ${filter === value ? T.ouro + '44' : 'transparent'}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Novo comentário na página */}
      <div className="px-4 py-3 shrink-0" style={{ borderBottom: `1px solid ${T.borda}` }}>
        <CommentInput
          placeholder="Comentar nesta página… (Enter para enviar)"
          onSubmit={text => addComment(pageId, { text, targetType: 'page' })}
        />
      </div>

      {/* Lista de comentários */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ scrollbarWidth: 'thin' }}>
        {loadingComments && visible.length === 0 && (
          <p className="text-sm text-center py-6 font-serif" style={{ color: T.textoSuave }}>
            Carregando comentários…
          </p>
        )}

        {!loadingComments && visible.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare size={28} className="mx-auto mb-2 opacity-30" style={{ color: T.textoSuave }} />
            <p className="text-sm font-serif" style={{ color: T.textoSuave }}>
              {filter === 'open' ? 'Nenhum comentário aberto.' : 'Nenhum comentário aqui.'}
            </p>
            <p className="text-xs mt-1" style={{ color: T.textoSuave }}>
              Escreva acima para iniciar a discussão.
            </p>
          </div>
        )}

        {visible.map(comment => (
          <CommentCard
            key={comment.id}
            comment={comment}
            pageId={pageId}
            currentUserId={currentUser?.id}
          />
        ))}
      </div>
    </div>
  )
}

// ─── BlockCommentButton — botão inline num bloco ──────────────────

/**
 * Botão que aparece no hover de um bloco para adicionar comentário.
 * Integrar no componente Block existente na margem esquerda.
 *
 * Uso:
 *   <BlockCommentButton pageId={pageId} blockId={block.id} />
 */
export function BlockCommentButton({ pageId, blockId, onOpenPanel }) {
  const { getBlockCommentCount, addComment } = useCollaboration()
  const count = getBlockCommentCount(pageId, blockId)

  function handleClick(e) {
    e.stopPropagation()
    onOpenPanel?.()
  }

  return (
    <button
      onClick={handleClick}
      title="Comentar neste bloco"
      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs transition-colors hover:bg-white/10"
      style={{ color: count > 0 ? T.ouro : T.textoSuave }}
    >
      <MessageSquare size={12} />
      {count > 0 && <span>{count}</span>}
    </button>
  )
}

// ─── useBlockComment — hook para adicionar comentário num bloco ───

/**
 * Retorna uma função para adicionar comentário a um bloco,
 * e o count de comentários abertos daquele bloco.
 */
export function useBlockComment(pageId, blockId) {
  const { addComment, getBlockCommentCount } = useCollaboration()

  const count = getBlockCommentCount(pageId, blockId)

  function addBlockComment(text) {
    return addComment(pageId, { text, targetType: 'block', targetId: blockId })
  }

  function addSelectionComment(text, selectedText) {
    return addComment(pageId, { text, targetType: 'selection', targetId: blockId, selectedText })
  }

  return { count, addBlockComment, addSelectionComment }
}
