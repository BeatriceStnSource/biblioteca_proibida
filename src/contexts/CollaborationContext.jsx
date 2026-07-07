/**
 * CollaborationContext.jsx — Fase 6: Colaboração
 *
 * Gerencia colaboração sem backend próprio — tudo via Google Drive + polling.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  DECISÃO DE ARQUITETURA — GitHub Pages sem backend              │
 * │                                                                 │
 * │  Optamos por NÃO exigir servidor externo nesta fase, usando:   │
 * │                                                                 │
 * │  1. Compartilhamento: Drive Permissions API (nativo, sem back)  │
 * │  2. Comentários: arquivo _comments.json no Drive + polling      │
 * │     (30s por padrão). Não é tempo real de verdade, mas         │
 * │     funciona sem WebSocket ou servidor coordenador.            │
 * │  3. Presença: arquivo _presence.json no Drive + polling 15s.   │
 * │     Cada usuário atualiza seu próprio registro; os outros veem  │
 * │     quem está "online" nos últimos 45s.                        │
 * │                                                                 │
 * │  Limitação conhecida: latência de ~15-30s para ver mudanças    │
 * │  de outros usuários. Aceitável para um documento colaborativo   │
 * │  leve; não adequado para edição simultânea com merge CRDT.     │
 * │                                                                 │
 * │  Se no futuro quiser real-time de verdade: adicionar           │
 * │  Cloudflare Workers + Durable Objects ou Supabase Realtime,    │
 * │  sem mudar a interface pública deste contexto.                 │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Estrutura no Drive:
 *   [uuid-biblioteca]/
 *     _meta.json              ← permissões da biblioteca
 *     pages/
 *       [uuid-page].json      ← conteúdo
 *       [uuid-page]_comments.json  ← comentários da página
 *     _presence.json          ← quem está online agora
 */

import {
  createContext, useContext, useState, useEffect,
  useCallback, useRef,
} from 'react'

export const CollaborationContext = createContext(null)

// Valor vazio retornado quando não há CollaborationProvider acima.
// Permite que componentes como CurrentPagePresence usem o hook sem
// precisar de um try/catch ou de verificar se o Provider está presente.
const EMPTY_COLLABORATION = {
  permissions: [], isPublic: false, sharingOpen: false, sharingError: null,
  setSharingOpen: () => {}, shareWithEmail: async () => {}, setPublicLink: async () => {},
  updatePermission: async () => {}, removePermission: async () => {}, getPublicLink: () => '',
  loadPermissions: async () => {},
  loadingComments: false, savingComment: false,
  addComment: async () => {}, replyToComment: async () => {}, resolveComment: async () => {},
  deleteComment: async () => {}, getComments: () => [], getBlockCommentCount: () => 0,
  onlineUsers: [],
  activePageId: null, setActivePageId: () => {},
}

export function useCollaboration() {
  const ctx = useContext(CollaborationContext)
  // Retorna objeto vazio em vez de lançar — graceful degradation
  // quando CollaborationProvider não está presente na árvore.
  return ctx ?? EMPTY_COLLABORATION
}

// ─── Constantes ───────────────────────────────────────────────────

const PRESENCE_POLL_MS  = 15_000   // atualiza presença a cada 15s
const COMMENTS_POLL_MS  = 30_000   // busca novos comentários a cada 30s
const PRESENCE_TTL_MS   = 45_000   // usuário some após 45s sem heartbeat
const MAX_COMMENTS_FILE = 500      // limite de comentários por página (rotaciona)

// ─── Helpers de Drive ──────────────────────────────────────────────

async function driveRequest(url, options, accessToken) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const err = new Error(`Drive API error ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

async function driveUpload(fileId, content, accessToken) {
  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(content),
    }
  )
  if (!res.ok) {
    const err = new Error(`Drive upload error ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

async function driveCreate(name, parentId, content, accessToken) {
  // 1. Criar arquivo vazio com metadados
  const meta = await driveRequest(
    'https://www.googleapis.com/drive/v3/files',
    {
      method: 'POST',
      body: JSON.stringify({
        name,
        parents: [parentId],
        mimeType: 'application/json',
      }),
    },
    accessToken
  )
  // 2. Fazer upload do conteúdo
  await driveUpload(meta.id, content, accessToken)
  return meta.id
}

async function driveReadJson(fileId, accessToken) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (res.status === 404) return null
  if (!res.ok) {
    const err = new Error(`Drive read error ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

async function driveFindFile(name, parentId, accessToken) {
  const q = `name='${name}' and '${parentId}' in parents and trashed=false`
  const data = await driveRequest(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    {},
    accessToken
  )
  return data.files?.[0] ?? null
}

// ─── Provider ──────────────────────────────────────────────────────

export function CollaborationProvider({
  libraryId,        // ID da pasta da biblioteca no Drive
  pagesParentId,    // ID da pasta pages/ no Drive
  accessToken,
  currentUser,      // { id, name, email, avatarUrl }
  onTokenExpired,   // () => void — chamado em 401
  children,
}) {
  // ── Compartilhamento ──────────────────────────────────────────
  const [permissions, setPermissions] = useState([])  // [{ id, email, role, displayName }]
  const [sharingOpen, setSharingOpen] = useState(false)

  // ── Comentários ───────────────────────────────────────────────
  // { [pageId]: Comment[] }
  const [commentsByPage, setCommentsByPage] = useState({})
  const [activePageId, setActivePageId]     = useState(null)
  const commentFileIds = useRef({})   // { [pageId]: driveFileId }

  // ── Presença ──────────────────────────────────────────────────
  const [onlineUsers, setOnlineUsers] = useState([])  // [{ userId, name, avatarUrl, pageId, lastSeen }]
  const presenceFileId = useRef(null)

  // ── Indicadores de UI ─────────────────────────────────────────
  const [loadingComments, setLoadingComments] = useState(false)
  const [savingComment,   setSavingComment]   = useState(false)
  const [sharingError,    setSharingError]    = useState(null)

  // ─── Interceptor de 401 ──────────────────────────────────────

  async function safeRequest(fn) {
    try {
      return await fn()
    } catch (err) {
      if (err.status === 401) {
        onTokenExpired?.()
        throw err
      }
      throw err
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPARTILHAMENTO
  // ═══════════════════════════════════════════════════════════════

  /**
   * Carrega as permissões atuais do arquivo/pasta da biblioteca.
   * Usa a Drive Permissions API — não requer backend próprio.
   */
  async function loadPermissions() {
    if (!libraryId || !accessToken) return
    try {
      const data = await safeRequest(() =>
        driveRequest(
          `https://www.googleapis.com/drive/v3/files/${libraryId}/permissions` +
          `?fields=permissions(id,emailAddress,role,displayName,type)`,
          {},
          accessToken
        )
      )
      setPermissions(data.permissions ?? [])
    } catch (err) {
      console.error('[Colaboração] Erro ao carregar permissões:', err)
    }
  }

  /**
   * Compartilha a biblioteca com um e-mail.
   * role: 'reader' | 'commenter' | 'writer'
   */
  async function shareWithEmail(email, role = 'reader') {
    setSharingError(null)
    try {
      await safeRequest(() =>
        driveRequest(
          `https://www.googleapis.com/drive/v3/files/${libraryId}/permissions`,
          {
            method: 'POST',
            body: JSON.stringify({
              role,
              type: 'user',
              emailAddress: email,
            }),
          },
          accessToken
        )
      )
      await loadPermissions()
    } catch (err) {
      console.error('[Colaboração] Erro ao compartilhar:', err)
      setSharingError(
        err.status === 403
          ? 'Sem permissão para compartilhar esta biblioteca.'
          : 'Não foi possível compartilhar. Tente novamente.'
      )
      throw err
    }
  }

  /**
   * Cria (ou revoga) um link público de somente leitura.
   */
  async function setPublicLink(enabled) {
    setSharingError(null)
    try {
      if (enabled) {
        await safeRequest(() =>
          driveRequest(
            `https://www.googleapis.com/drive/v3/files/${libraryId}/permissions`,
            {
              method: 'POST',
              body: JSON.stringify({ role: 'reader', type: 'anyone' }),
            },
            accessToken
          )
        )
      } else {
        // Remover permissão "anyone"
        const anyonePerm = permissions.find(p => p.type === 'anyone' || p.id === 'anyoneWithLink')
        if (anyonePerm) {
          await safeRequest(() =>
            driveRequest(
              `https://www.googleapis.com/drive/v3/files/${libraryId}/permissions/${anyonePerm.id}`,
              { method: 'DELETE' },
              accessToken
            )
          )
        }
      }
      await loadPermissions()
    } catch (err) {
      console.error('[Colaboração] Erro ao configurar link público:', err)
      setSharingError('Não foi possível alterar o compartilhamento.')
      throw err
    }
  }

  /**
   * Altera o papel de um colaborador.
   */
  async function updatePermission(permissionId, newRole) {
    try {
      await safeRequest(() =>
        driveRequest(
          `https://www.googleapis.com/drive/v3/files/${libraryId}/permissions/${permissionId}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ role: newRole }),
          },
          accessToken
        )
      )
      await loadPermissions()
    } catch (err) {
      console.error('[Colaboração] Erro ao atualizar permissão:', err)
      throw err
    }
  }

  /**
   * Remove um colaborador.
   */
  async function removePermission(permissionId) {
    try {
      await safeRequest(() =>
        driveRequest(
          `https://www.googleapis.com/drive/v3/files/${libraryId}/permissions/${permissionId}`,
          { method: 'DELETE' },
          accessToken
        )
      )
      setPermissions(prev => prev.filter(p => p.id !== permissionId))
    } catch (err) {
      console.error('[Colaboração] Erro ao remover permissão:', err)
      throw err
    }
  }

  /** Link público da biblioteca (Drive viewer) */
  function getPublicLink() {
    return `https://drive.google.com/drive/folders/${libraryId}?usp=sharing`
  }

  const isPublic = permissions.some(p => p.type === 'anyone')

  // ═══════════════════════════════════════════════════════════════
  // COMENTÁRIOS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Obtém o fileId do arquivo de comentários de uma página.
   * Cria o arquivo se não existir.
   */
  async function getOrCreateCommentsFile(pageId) {
    if (commentFileIds.current[pageId]) return commentFileIds.current[pageId]

    const name = `${pageId}_comments.json`
    let file = await safeRequest(() => driveFindFile(name, pagesParentId, accessToken))

    if (!file) {
      const fileId = await safeRequest(() =>
        driveCreate(name, pagesParentId, { comments: [] }, accessToken)
      )
      commentFileIds.current[pageId] = fileId
      return fileId
    }

    commentFileIds.current[pageId] = file.id
    return file.id
  }

  /**
   * Carrega comentários de uma página do Drive.
   */
  async function loadComments(pageId) {
    if (!pageId || !accessToken) return
    setLoadingComments(true)
    try {
      const fileId = await getOrCreateCommentsFile(pageId)
      const data   = await safeRequest(() => driveReadJson(fileId, accessToken))
      const list   = data?.comments ?? []
      setCommentsByPage(prev => ({ ...prev, [pageId]: list }))
    } catch (err) {
      console.error('[Colaboração] Erro ao carregar comentários:', err)
    } finally {
      setLoadingComments(false)
    }
  }

  /**
   * Persiste o array de comentários de uma página no Drive.
   */
  async function saveComments(pageId, comments) {
    const fileId = await getOrCreateCommentsFile(pageId)
    // Rotacionar se exceder limite
    const trimmed = comments.slice(-MAX_COMMENTS_FILE)
    await safeRequest(() => driveUpload(fileId, { comments: trimmed }, accessToken))
  }

  /**
   * Adiciona um comentário a uma página.
   *
   * targetType: 'page' | 'block' | 'selection'
   * targetId: blockId (para block) ou null (para page)
   * selectedText: texto selecionado (para selection)
   */
  async function addComment(pageId, { text, targetType = 'page', targetId = null, selectedText = null }) {
    if (!text.trim()) return
    setSavingComment(true)
    try {
      const comment = {
        id: crypto.randomUUID(),
        pageId,
        targetType,
        targetId,
        selectedText,
        text: text.trim(),
        author: {
          id:        currentUser.id,
          name:      currentUser.name,
          email:     currentUser.email,
          avatarUrl: currentUser.avatarUrl,
        },
        createdAt: new Date().toISOString(),
        resolved:  false,
        replies:   [],
      }

      setCommentsByPage(prev => {
        const list = [...(prev[pageId] ?? []), comment]
        return { ...prev, [pageId]: list }
      })

      const updated = [...(commentsByPage[pageId] ?? []), comment]
      await saveComments(pageId, updated)
    } finally {
      setSavingComment(false)
    }
  }

  /**
   * Responde a um comentário existente.
   */
  async function replyToComment(pageId, commentId, text) {
    if (!text.trim()) return

    const reply = {
      id: crypto.randomUUID(),
      text: text.trim(),
      author: {
        id:        currentUser.id,
        name:      currentUser.name,
        email:     currentUser.email,
        avatarUrl: currentUser.avatarUrl,
      },
      createdAt: new Date().toISOString(),
    }

    const updated = (commentsByPage[pageId] ?? []).map(c =>
      c.id === commentId
        ? { ...c, replies: [...(c.replies ?? []), reply] }
        : c
    )

    setCommentsByPage(prev => ({ ...prev, [pageId]: updated }))
    await saveComments(pageId, updated)
  }

  /**
   * Resolve ou reabre um comentário.
   */
  async function resolveComment(pageId, commentId, resolved = true) {
    const updated = (commentsByPage[pageId] ?? []).map(c =>
      c.id === commentId ? { ...c, resolved, resolvedAt: resolved ? new Date().toISOString() : null } : c
    )
    setCommentsByPage(prev => ({ ...prev, [pageId]: updated }))
    await saveComments(pageId, updated)
  }

  /**
   * Remove um comentário (somente o autor).
   */
  async function deleteComment(pageId, commentId) {
    const updated = (commentsByPage[pageId] ?? []).filter(c => c.id !== commentId)
    setCommentsByPage(prev => ({ ...prev, [pageId]: updated }))
    await saveComments(pageId, updated)
  }

  /** Comentários de uma página, ordenados do mais recente */
  function getComments(pageId, { includeResolved = false } = {}) {
    const list = commentsByPage[pageId] ?? []
    return includeResolved ? list : list.filter(c => !c.resolved)
  }

  /** Quantidade de comentários abertos de um bloco */
  function getBlockCommentCount(pageId, blockId) {
    return (commentsByPage[pageId] ?? []).filter(
      c => c.targetId === blockId && !c.resolved
    ).length
  }

  // ═══════════════════════════════════════════════════════════════
  // PRESENÇA (polling no Drive)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Obtém/cria o arquivo _presence.json da biblioteca.
   */
  async function getOrCreatePresenceFile() {
    if (presenceFileId.current) return presenceFileId.current

    const name = '_presence.json'
    let file = await safeRequest(() => driveFindFile(name, libraryId, accessToken))

    if (!file) {
      const fileId = await safeRequest(() =>
        driveCreate(name, libraryId, { users: [] }, accessToken)
      )
      presenceFileId.current = fileId
      return fileId
    }

    presenceFileId.current = file.id
    return file.id
  }

  /**
   * Heartbeat: atualiza a presença do usuário atual no Drive.
   * Chamado a cada PRESENCE_POLL_MS.
   */
  const sendHeartbeat = useCallback(async () => {
    if (!accessToken || !currentUser?.id || !libraryId) return
    try {
      const fileId = await getOrCreatePresenceFile()
      const data   = await driveReadJson(fileId, accessToken) ?? { users: [] }

      const now   = new Date().toISOString()
      const me    = {
        userId:    currentUser.id,
        name:      currentUser.name,
        avatarUrl: currentUser.avatarUrl,
        pageId:    activePageId,
        lastSeen:  now,
      }

      // Filtrar TTL + substituir registro próprio
      const filtered = (data.users ?? []).filter(u => {
        if (u.userId === currentUser.id) return false
        return (Date.now() - new Date(u.lastSeen).getTime()) < PRESENCE_TTL_MS
      })

      const updated = [...filtered, me]
      await driveUpload(fileId, { users: updated }, accessToken)
      setOnlineUsers(updated.filter(u => u.userId !== currentUser.id))
    } catch (err) {
      // Falha silenciosa — presença é best-effort
      if (err.status === 401) onTokenExpired?.()
    }
  }, [accessToken, currentUser, libraryId, activePageId])

  /**
   * Poll: lê a presença dos outros usuários.
   */
  const pollPresence = useCallback(async () => {
    if (!accessToken || !libraryId) return
    try {
      const fileId = await getOrCreatePresenceFile()
      const data   = await driveReadJson(fileId, accessToken)
      const alive  = (data?.users ?? []).filter(u => {
        if (u.userId === currentUser?.id) return false
        return (Date.now() - new Date(u.lastSeen).getTime()) < PRESENCE_TTL_MS
      })
      setOnlineUsers(alive)
    } catch { /* silencioso */ }
  }, [accessToken, libraryId, currentUser])

  // ─── Polling loops ────────────────────────────────────────────

  // Presença: heartbeat + poll simultâneos
  useEffect(() => {
    if (!accessToken || !libraryId) return

    sendHeartbeat()
    const interval = setInterval(() => {
      sendHeartbeat()
      pollPresence()
    }, PRESENCE_POLL_MS)

    return () => clearInterval(interval)
  }, [sendHeartbeat, pollPresence, accessToken, libraryId])

  // Comentários: poll ao trocar de página
  useEffect(() => {
    if (!activePageId) return

    loadComments(activePageId)
    const interval = setInterval(() => loadComments(activePageId), COMMENTS_POLL_MS)
    return () => clearInterval(interval)
  }, [activePageId, accessToken])

  // Permissões: carregar ao montar
  useEffect(() => {
    loadPermissions()
  }, [libraryId, accessToken])

  // ─── Context value ────────────────────────────────────────────

  const value = {
    // Compartilhamento
    permissions,
    isPublic,
    sharingOpen,
    sharingError,
    setSharingOpen,
    shareWithEmail,
    setPublicLink,
    updatePermission,
    removePermission,
    getPublicLink,
    loadPermissions,

    // Comentários
    loadingComments,
    savingComment,
    addComment,
    replyToComment,
    resolveComment,
    deleteComment,
    getComments,
    getBlockCommentCount,

    // Presença
    onlineUsers,

    // Página ativa (para presença)
    activePageId,
    setActivePageId,
  }

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  )
}
