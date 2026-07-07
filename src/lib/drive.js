/**
 * drive.js — Wrapper para Google Drive API v3
 *
 * Todas as operações passam por _request(), que intercepta erros 401
 * e renova o token OAuth automaticamente antes de tentar novamente.
 *
 * Nunca chame gapi.client.drive diretamente fora deste módulo.
 */

import { DRIVE_PAGE_SIZE } from './constants.js'

// ─── Token store (em memória — basta para a sessão do navegador) ──
let _accessToken = null
let _tokenClient = null

export function setAccessToken(token) {
  _accessToken = token
  // Injeta nos headers do gapi.client
  if (window.gapi?.client) {
    window.gapi.client.setToken({ access_token: token })
  }
}

export function getAccessToken() {
  return _accessToken
}

// ─── Inicialização OAuth ──────────────────────────────────────────
export function initTokenClient(clientId, scope, onSuccess, onError) {
  if (!window.google?.accounts?.oauth2) {
    console.error('[Drive] Google Identity Services não carregado ainda.')
    return
  }

  _tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope,
    callback: (response) => {
      if (response.error) {
        console.error('[Drive] Erro OAuth:', response.error)
        onError?.(response.error)
        return
      }
      setAccessToken(response.access_token)
      onSuccess?.(response.access_token)
    },
  })

  return _tokenClient
}

export function requestToken(prompt = 'consent') {
  if (!_tokenClient) {
    throw new Error('[Drive] tokenClient não inicializado. Chame initTokenClient primeiro.')
  }
  _tokenClient.requestAccessToken({ prompt })
}

// ─── Renovação silenciosa de token ────────────────────────────────
async function refreshToken() {
  return new Promise((resolve, reject) => {
    if (!_tokenClient) {
      reject(new Error('[Drive] tokenClient não disponível para refresh.'))
      return
    }

    const originalCallback = _tokenClient.callback

    _tokenClient.callback = (response) => {
      _tokenClient.callback = originalCallback // restaura
      if (response.error || !response.access_token) {
        reject(new Error('[Drive] Falha ao renovar token: ' + response.error))
        return
      }
      setAccessToken(response.access_token)
      resolve(response.access_token)
    }

    // prompt vazio = silencioso se a sessão Google ainda está ativa
    _tokenClient.requestAccessToken({ prompt: '' })
  })
}

// ─── Interceptor central ──────────────────────────────────────────
async function _request(fn) {
  try {
    return await fn()
  } catch (err) {
    const status = err?.result?.error?.code ?? err?.status
    if (status === 401) {
      console.warn('[Drive] Token expirado — renovando...')
      await refreshToken()
      return await fn() // retry com token novo
    }
    console.error('[Drive] Erro na requisição:', err)
    throw err
  }
}

// ─── Helpers de serialização ──────────────────────────────────────
function toJson(data) {
  return JSON.stringify(data, null, 2)
}

async function parseResponse(response) {
  return response.result
}

// ─── API pública ──────────────────────────────────────────────────

/**
 * Lista arquivos em uma pasta (paginado, máx. DRIVE_PAGE_SIZE).
 * @param {string} folderId
 * @param {string} [mimeType] — filtrar por mimeType opcional
 * @returns {Promise<Array>}
 */
export async function listFiles(folderId, mimeType = null) {
  return _request(async () => {
    let q = `'${folderId}' in parents and trashed = false`
    if (mimeType) q += ` and mimeType = '${mimeType}'`

    const res = await window.gapi.client.drive.files.list({
      q,
      fields: 'files(id, name, mimeType, createdTime, modifiedTime, appProperties)',
      pageSize: DRIVE_PAGE_SIZE,
      orderBy: 'modifiedTime desc',
    })
    return res.result.files ?? []
  })
}

/**
 * Lê o conteúdo JSON de um arquivo.
 * @param {string} fileId
 * @returns {Promise<Object>}
 */
export async function readFile(fileId) {
  return _request(async () => {
    const res = await window.gapi.client.drive.files.get({
      fileId,
      alt: 'media',
    })
    // gapi retorna string ou objeto dependendo do content-type
    const raw = typeof res.body === 'string' ? res.body : JSON.stringify(res.result)
    return JSON.parse(raw)
  })
}

/**
 * Cria um novo arquivo JSON em uma pasta.
 * @param {string} folderId
 * @param {string} name — nome do arquivo (ex: "uuid.json")
 * @param {Object} data — conteúdo a salvar
 * @returns {Promise<{id: string}>}
 */
export async function createFile(folderId, name, data) {
  return _request(async () => {
    const metadata = {
      name,
      mimeType: 'application/json',
      parents: [folderId],
    }

    const body = toJson(data)
    const boundary = '-------bibliotecabound'
    const delimiter = `\r\n--${boundary}\r\n`
    const closeDelimiter = `\r\n--${boundary}--`

    const multipartBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      body +
      closeDelimiter

    const res = await window.gapi.client.request({
      path: '/upload/drive/v3/files',
      method: 'POST',
      params: { uploadType: 'multipart', fields: 'id,name' },
      headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
      body: multipartBody,
    })

    return res.result
  })
}

/**
 * Atualiza o conteúdo de um arquivo existente.
 * @param {string} fileId
 * @param {Object} data
 * @returns {Promise<{id: string}>}
 */
export async function updateFile(fileId, data) {
  return _request(async () => {
    const res = await window.gapi.client.request({
      path: `/upload/drive/v3/files/${fileId}`,
      method: 'PATCH',
      params: { uploadType: 'media', fields: 'id' },
      headers: { 'Content-Type': 'application/json' },
      body: toJson(data),
    })
    return res.result
  })
}

/**
 * Deleta um arquivo (move para lixeira).
 * @param {string} fileId
 */
export async function deleteFile(fileId) {
  return _request(async () => {
    await window.gapi.client.drive.files.delete({ fileId })
  })
}

/**
 * Cria uma pasta no Drive.
 * @param {string} parentId
 * @param {string} name
 * @returns {Promise<{id: string, name: string}>}
 */
export async function createFolder(parentId, name) {
  return _request(async () => {
    const res = await window.gapi.client.drive.files.create({
      resource: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id,name',
    })
    return res.result
  })
}

/**
 * Faz upload de uma imagem para uma pasta.
 * @param {string} folderId
 * @param {File} file — objeto File do navegador
 * @returns {Promise<{id: string, name: string, webViewLink: string}>}
 */
export async function uploadImage(folderId, file) {
  return _request(async () => {
    const ext = file.name.split('.').pop() || 'jpg'
    const uuid = crypto.randomUUID()
    const name = `${uuid}.${ext}`

    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    const boundary = '-------bibliotecaimgbound'
    const delimiter = `\r\n--${boundary}\r\n`
    const closeDelimiter = `\r\n--${boundary}--`

    const metadata = { name, mimeType: file.type, parents: [folderId] }
    const multipartBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${file.type}\r\nContent-Transfer-Encoding: base64\r\n\r\n` +
      base64 +
      closeDelimiter

    const res = await window.gapi.client.request({
      path: '/upload/drive/v3/files',
      method: 'POST',
      params: { uploadType: 'multipart', fields: 'id,name,webViewLink,webContentLink' },
      headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
      body: multipartBody,
    })

    // Torna o arquivo público para leitura (necessário para exibir imagens no app)
    await window.gapi.client.drive.permissions.create({
      fileId: res.result.id,
      resource: { role: 'reader', type: 'anyone' },
    })

    return {
      ...res.result,
      // URL direta para exibição no <img>
      src: `https://drive.google.com/uc?export=view&id=${res.result.id}`,
    }
  })
}

/**
 * Busca arquivos cujo conteúdo contenha o termo (fullText search do Drive).
 * @param {string} query
 * @param {string[]} [folderIds] — restringir pastas
 * @returns {Promise<Array>}
 */
export async function searchFiles(query, folderIds = []) {
  return _request(async () => {
    let q = `fullText contains '${query.replace(/'/g, "\\'")}' and trashed = false`
    if (folderIds.length > 0) {
      const parentClauses = folderIds.map(id => `'${id}' in parents`).join(' or ')
      q += ` and (${parentClauses})`
    }

    const res = await window.gapi.client.drive.files.list({
      q,
      fields: 'files(id, name, modifiedTime)',
      pageSize: DRIVE_PAGE_SIZE,
    })
    return res.result.files ?? []
  })
}
