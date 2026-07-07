/**
 * constants.js — Constantes centrais do Projeto Biblioteca (Fases 1–6)
 *
 * CLIENT_ID: exposto no bundle intencionalmente (OAuth client-side).
 * Autorize as origens no Google Cloud Console:
 *   - http://localhost:5173
 *   - https://usuario.github.io  ← ajuste para sua URL exata
 */

// ─── Auth ─────────────────────────────────────────────────────────

export const GOOGLE_CLIENT_ID =
  '34502473938-sj8bfg5047rk3655n0vgmi189me3f4a8.apps.googleusercontent.com'

// Escopos OAuth (Fases 1–6)
// drive.file   → leitura/escrita de arquivos criados pelo app
// userinfo.*   → nome, e-mail e foto para PresenceBar e comentários
export const DRIVE_SCOPE = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

// ─── Tipos de bloco ───────────────────────────────────────────────

export const BLOCK_TYPES = {
  TEXT:      'text',
  H1:        'h1',
  H2:        'h2',
  H3:        'h3',
  BULLET:    'bullet',
  NUMBERED:  'numbered',
  TODO:      'todo',
  QUOTE:     'quote',
  CALLOUT:   'callout',
  CODE:      'code',
  DIVIDER:   'divider',
  IMAGE:     'image',
  VIDEO:     'video',
  AUDIO:     'audio',
  FILE:      'file',
  EMBED:     'embed',
  BOOKMARK:  'bookmark',
  PDF:       'pdf',
  TOGGLE:    'toggle',
  COLUMN_LIST: 'column_list',
  COLUMN:    'column',
  EQUATION:  'equation',
  MENTION:   'mention',
  DATE:      'date',
}

// ─── Tipos de propriedade ─────────────────────────────────────────

export const PROPERTY_TYPES = {
  TITLE:        'title',
  TEXT:         'text',
  URL:          'url',
  EMAIL:        'email',
  PHONE:        'phone',
  NUMBER:       'number',
  SELECT:       'select',
  MULTISELECT:  'multiselect',
  STATUS:       'status',
  CHECKBOX:     'checkbox',
  DATE:         'date',
  CREATED_TIME: 'created_time',
  EDITED_TIME:  'edited_time',
  PERSON:       'person',
  CREATED_BY:   'created_by',
  EDITED_BY:    'edited_by',
  RELATION:     'relation',
  ROLLUP:       'rollup',
  FORMULA:      'formula',
  FILE:         'file',
  IMAGE:        'image',
  PLACE:        'place',
  UNIQUE_ID:    'unique_id',
}

// ─── Tipos de view ────────────────────────────────────────────────

export const VIEW_TYPES = {
  TABLE:    'table',
  GALLERY:  'gallery',
  LIST:     'list',
  BOARD:    'board',
  CALENDAR: 'calendar',
  TIMELINE: 'timeline',
}

// ─── Nomes de arquivo no Drive ────────────────────────────────────

export const DRIVE_FILE_NAMES = {
  SCHEMA:    '_schema.json',
  META:      '_meta.json',
  TEMPLATES: '_templates.json',
  PRESENCE:  '_presence.json',  // Fase 6
}

export const DRIVE_FOLDER_NAMES = {
  DATABASES: 'databases',
  PAGES:     'pages',
  ASSETS:    'assets',
}

// ─── Paleta de cores para tags ────────────────────────────────────

export const TAG_COLORS = {
  default: { bg: 'rgba(92,61,30,0.3)',    text: '#F5EDD6' },
  cinza:   { bg: 'rgba(120,120,120,0.3)', text: '#d0d0d0' },
  marrom:  { bg: 'rgba(139,69,19,0.35)',  text: '#F5EDD6' },
  laranja: { bg: 'rgba(217,115,13,0.3)',  text: '#f5c87e' },
  amarelo: { bg: 'rgba(200,175,0,0.3)',   text: '#f0d060' },
  verde:   { bg: 'rgba(68,131,97,0.3)',   text: '#9cdcb0' },
  azul:    { bg: 'rgba(51,126,169,0.3)',  text: '#87c8ef' },
  roxo:    { bg: 'rgba(144,101,176,0.3)', text: '#d0aff0' },
  rosa:    { bg: 'rgba(193,76,138,0.3)',  text: '#f0a0d0' },
  vermelho:{ bg: 'rgba(212,76,71,0.3)',   text: '#f09090' },
}

// ─── Cores de coloração condicional ──────────────────────────────

export const CONDITIONAL_ROW_COLORS = [
  { id: 'vermelho', label: 'Vermelho', bg: 'rgba(212,76,71,0.15)',   border: 'rgba(212,76,71,0.4)' },
  { id: 'laranja',  label: 'Laranja',  bg: 'rgba(217,115,13,0.15)', border: 'rgba(217,115,13,0.4)' },
  { id: 'amarelo',  label: 'Amarelo',  bg: 'rgba(200,175,0,0.15)',  border: 'rgba(200,175,0,0.4)' },
  { id: 'verde',    label: 'Verde',    bg: 'rgba(68,131,97,0.15)',  border: 'rgba(68,131,97,0.4)' },
  { id: 'azul',     label: 'Azul',     bg: 'rgba(51,126,169,0.15)', border: 'rgba(51,126,169,0.4)' },
  { id: 'roxo',     label: 'Roxo',     bg: 'rgba(144,101,176,0.15)',border: 'rgba(144,101,176,0.4)' },
  { id: 'rosa',     label: 'Rosa',     bg: 'rgba(193,76,138,0.15)', border: 'rgba(193,76,138,0.4)' },
  { id: 'ouro',     label: 'Dourado',  bg: 'rgba(201,168,76,0.15)', border: 'rgba(201,168,76,0.4)' },
  { id: 'cinza',    label: 'Cinza',    bg: 'rgba(100,100,100,0.15)',border: 'rgba(100,100,100,0.4)' },
]

// ─── Fórmulas e Rollup ────────────────────────────────────────────

export const FORMULA_FUNCTIONS = [
  'abs','ceil','floor','round','sqrt','pow','log','mod','min','max',
  'concat','length','contains','replace','upper','lower','slice','trim','format',
  'now','today','dateBetween','dateAdd','dateSubtract',
  'day','month','year','hour','minute','formatDate',
  'if','and','or','not','empty',
  'sum','count','countAll','average',
]

export const ROLLUP_FUNCTIONS = [
  { value: 'count',   label: 'Contar' },
  { value: 'sum',     label: 'Somar' },
  { value: 'average', label: 'Média' },
  { value: 'min',     label: 'Mínimo' },
  { value: 'max',     label: 'Máximo' },
  { value: 'list',    label: 'Listar' },
  { value: 'unique',  label: 'Únicos' },
  { value: 'checked', label: '% Marcados' },
]

// ─── Performance ──────────────────────────────────────────────────

export const AUTOSAVE_DEBOUNCE_MS = 1500
export const MAX_VERSIONS         = 30
export const DRIVE_PAGE_SIZE      = 50

// ─── Colaboração (Fase 6) — polling no Drive, sem backend ─────────

export const PRESENCE_POLL_MS  = 15_000   // heartbeat a cada 15s
export const COMMENTS_POLL_MS  = 30_000   // poll de comentários a cada 30s
export const PRESENCE_TTL_MS   = 45_000   // sumir após 45s sem heartbeat
export const MAX_COMMENTS_FILE = 500      // comentários por arquivo (rotaciona)
