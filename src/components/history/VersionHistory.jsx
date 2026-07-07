/**
 * VersionHistory.jsx — Fase 5
 *
 * Histórico de versões local (sem backend).
 * As versões vivem em memória (NavigationContext) e são perdidas ao fechar a aba.
 * Para versões persistentes entre sessões, usamos IndexedDB via idb-keyval (opcional).
 *
 * Features:
 *  - Lista versões mais recentes de uma página
 *  - Preview dos blocos de cada versão
 *  - Restaurar versão (substitui os blocos atuais)
 *  - Nomeação automática por timestamp
 *
 * Integra-se ao useAutoSave do editor:
 *   a cada salvamento no Drive, chama saveVersion(pageId, blocks)
 */

import { useState } from 'react'
import { Clock, RotateCcw, X, ChevronDown, ChevronRight, History } from 'lucide-react'
import { useNavigation } from '../../contexts/NavigationContext.jsx'

const T = {
  fundo:      '#1C1610',
  superficie: '#2A1F14',
  card:       '#F5EDD6',
  textoSuave: '#6B4C3B',
  ouro:       '#C9A84C',
  borda:      '#5C3D1E',
  destaque:   '#8B4513',
}

// ─── Resumo de blocos de uma versão ──────────────────────────────

function BlockSummary({ blocks = [] }) {
  if (blocks.length === 0) {
    return <p className="text-xs italic" style={{ color: T.textoSuave }}>Página vazia</p>
  }

  const preview = blocks.slice(0, 4)
  return (
    <div className="space-y-0.5">
      {preview.map(b => {
        const content = b.content ||
          (b.segments?.map(s => s.text).join('')) ||
          ''
        const label = {
          h1: '# ', h2: '## ', h3: '### ',
          bullet: '• ', numbered: '1. ',
          todo: '☐ ', quote: '" ', callout: '💬 ',
          code: '{ }', divider: '———', image: '🖼️',
        }[b.type] ?? ''

        return (
          <p
            key={b.id}
            className="text-xs truncate"
            style={{ color: T.textoSuave }}
          >
            <span style={{ color: T.ouro, opacity: 0.6 }}>{label}</span>
            {content || <em style={{ opacity: 0.4 }}>bloco vazio</em>}
          </p>
        )
      })}
      {blocks.length > 4 && (
        <p className="text-xs" style={{ color: `${T.textoSuave}66` }}>
          + {blocks.length - 4} {blocks.length - 4 === 1 ? 'bloco' : 'blocos'} a mais
        </p>
      )}
    </div>
  )
}

// ─── VersionRow ───────────────────────────────────────────────────

function VersionRow({ version, isActive, onExpand, expanded, onRestore }) {
  const date = new Date(version.timestamp)
  const label = version.label || date.toLocaleString('pt-BR')

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        borderColor: isActive ? T.ouro : T.borda,
        background: isActive ? `${T.ouro}10` : `${T.fundo}66`,
      }}
    >
      {/* Cabeçalho da versão */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
        onClick={onExpand}
      >
        <Clock size={13} style={{ color: T.textoSuave, shrink: 0 }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-serif truncate" style={{ color: T.card }}>
            {label}
          </p>
          <p className="text-xs" style={{ color: T.textoSuave }}>
            {date.toLocaleString('pt-BR', {
              day: '2-digit', month: 'short',
              hour: '2-digit', minute: '2-digit',
            })} · {version.blocks.length} {version.blocks.length === 1 ? 'bloco' : 'blocos'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {isActive && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: `${T.ouro}33`, color: T.ouro }}
            >
              atual
            </span>
          )}
          {expanded ? <ChevronDown size={12} style={{ color: T.textoSuave }} /> : <ChevronRight size={12} style={{ color: T.textoSuave }} />}
        </div>
      </div>

      {/* Preview expandida */}
      {expanded && (
        <div
          className="px-3 pb-3"
          style={{ borderTop: `1px solid ${T.borda}` }}
        >
          <div className="pt-2 pb-3">
            <BlockSummary blocks={version.blocks} />
          </div>
          {!isActive && (
            <button
              onClick={() => onRestore(version)}
              className="w-full flex items-center justify-center gap-2 py-1.5 rounded-md text-sm font-serif transition-colors"
              style={{
                background: `${T.destaque}33`,
                color: T.card,
                border: `1px solid ${T.borda}`,
              }}
            >
              <RotateCcw size={13} />
              Restaurar esta versão
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── VersionHistoryPanel ──────────────────────────────────────────

export default function VersionHistoryPanel({ pageId, currentBlocks, onRestore, onClose }) {
  const { getVersions } = useNavigation()
  const [expandedId, setExpandedId] = useState(null)

  const versions = getVersions(pageId)

  function handleRestore(version) {
    if (!window.confirm(
      `Restaurar para a versão de ${new Date(version.timestamp).toLocaleString('pt-BR')}?\n\nO conteúdo atual será substituído.`
    )) return
    onRestore(version.blocks)
    onClose()
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: T.superficie }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid ${T.borda}` }}
      >
        <div className="flex items-center gap-2">
          <History size={15} style={{ color: T.ouro }} />
          <span className="font-serif font-semibold text-sm" style={{ color: T.ouro }}>
            Histórico de versões
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: T.textoSuave }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Info */}
      <div className="px-4 py-2" style={{ borderBottom: `1px solid ${T.borda}` }}>
        <p className="text-xs leading-relaxed" style={{ color: T.textoSuave }}>
          As versões são salvas automaticamente a cada salvamento no Drive.
          As versões ficam em memória e são apagadas ao fechar a aba.
        </p>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: 'thin' }}>
        {versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Clock size={28} style={{ color: T.textoSuave, opacity: 0.3 }} />
            <p className="text-sm font-serif text-center" style={{ color: T.textoSuave }}>
              Nenhuma versão salva ainda.
              <br />
              <span style={{ opacity: 0.6 }}>Versões aparecem após o primeiro salvamento.</span>
            </p>
          </div>
        ) : (
          <>
            {/* Versão atual */}
            <VersionRow
              version={{
                id: '__current__',
                timestamp: new Date().toISOString(),
                label: 'Versão atual',
                blocks: currentBlocks,
              }}
              isActive
              expanded={expandedId === '__current__'}
              onExpand={() => setExpandedId(id => id === '__current__' ? null : '__current__')}
              onRestore={() => {}}
            />

            {/* Histórico */}
            {versions.map(v => (
              <VersionRow
                key={v.id}
                version={v}
                isActive={false}
                expanded={expandedId === v.id}
                onExpand={() => setExpandedId(id => id === v.id ? null : v.id)}
                onRestore={handleRestore}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ─── useVersionAutoSave — hook para salvar versão ao salvar no Drive ─

/**
 * Use dentro do PageEditor, chamando saveVersion após cada save bem-sucedido no Drive.
 *
 * Exemplo de uso:
 *   const { onSaved } = useVersionAutoSave(pageId, blocks)
 *   // Após drive.updateFile(...):
 *   onSaved()
 */
export function useVersionAutoSave(pageId) {
  const { saveVersion } = useNavigation()

  function onSaved(blocks, label = '') {
    saveVersion(pageId, blocks, label)
  }

  return { onSaved }
}
