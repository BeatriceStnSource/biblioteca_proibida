/**
 * PageTemplates.jsx — Fase 5
 *
 * Templates de página (não de database — esses já estão na Fase 4).
 *
 * Templates disponíveis:
 *  - 📖 Resenha de Livro
 *  - 📝 Capítulo com estrutura padrão
 *  - 🎭 Ficha de Personagem
 *  - 🗺️ Mapa da História
 *  - 📅 Planejamento de Escrita
 *  - 📄 Página em branco
 *
 * Persistidos em localStorage (sem backend).
 * Retorna os blocos prontos para usar no editor.
 */

import { useState } from 'react'
import { X, FileText, Plus, ChevronRight } from 'lucide-react'

const T = {
  fundo:      '#1C1610',
  superficie: '#2A1F14',
  card:       '#F5EDD6',
  cardHover:  '#EDE0C4',
  texto:      '#2C1810',
  textoSuave: '#6B4C3B',
  destaque:   '#8B4513',
  ouro:       '#C9A84C',
  borda:      '#5C3D1E',
}

// ─── Templates embutidos ──────────────────────────────────────────

const BUILTIN_TEMPLATES = [
  {
    id: 'blank',
    name: 'Página em branco',
    icon: '📄',
    description: 'Começa do zero, sem estrutura pré-definida.',
    blocks: [],
  },
  {
    id: 'book-review',
    name: 'Resenha de Livro',
    icon: '📖',
    description: 'Estrutura completa para registrar leituras.',
    blocks: [
      { id: () => crypto.randomUUID(), type: 'h1',     content: 'Título do Livro' },
      { id: () => crypto.randomUUID(), type: 'callout', content: 'Autor · Ano · Gênero', props: { icon: '📚', color: 'marrom' } },
      { id: () => crypto.randomUUID(), type: 'h2',     content: 'Sinopse' },
      { id: () => crypto.randomUUID(), type: 'text',   content: 'Escreva aqui um breve resumo da obra...' },
      { id: () => crypto.randomUUID(), type: 'h2',     content: 'Impressões' },
      { id: () => crypto.randomUUID(), type: 'text',   content: 'O que mais me chamou atenção foi...' },
      { id: () => crypto.randomUUID(), type: 'h2',     content: 'Citações marcantes' },
      { id: () => crypto.randomUUID(), type: 'quote',  content: 'Adicione aqui uma citação do livro.' },
      { id: () => crypto.randomUUID(), type: 'h2',     content: 'Avaliação' },
      { id: () => crypto.randomUUID(), type: 'bullet', content: '⭐ Nota geral:', props: {} },
      { id: () => crypto.randomUUID(), type: 'bullet', content: '🎯 Recomendo para:', props: {} },
      { id: () => crypto.randomUUID(), type: 'bullet', content: '📅 Lido em:', props: {} },
      { id: () => crypto.randomUUID(), type: 'divider', content: '' },
      { id: () => crypto.randomUUID(), type: 'text',   content: '' },
    ],
  },
  {
    id: 'chapter',
    name: 'Capítulo',
    icon: '📝',
    description: 'Estrutura padrão para capítulos de uma obra.',
    blocks: [
      { id: () => crypto.randomUUID(), type: 'h1',    content: 'Capítulo X — Título' },
      { id: () => crypto.randomUUID(), type: 'callout', content: 'Ponto de vista · Localização · Tempo', props: { icon: '🎬', color: 'azul' } },
      { id: () => crypto.randomUUID(), type: 'h2',    content: 'Cena de abertura' },
      { id: () => crypto.randomUUID(), type: 'text',  content: '' },
      { id: () => crypto.randomUUID(), type: 'h2',    content: 'Desenvolvimento' },
      { id: () => crypto.randomUUID(), type: 'text',  content: '' },
      { id: () => crypto.randomUUID(), type: 'h2',    content: 'Gancho final' },
      { id: () => crypto.randomUUID(), type: 'text',  content: '' },
      { id: () => crypto.randomUUID(), type: 'divider', content: '' },
      { id: () => crypto.randomUUID(), type: 'callout', content: 'Notas do autor', props: { icon: '✏️', color: 'amarelo' } },
    ],
  },
  {
    id: 'character',
    name: 'Ficha de Personagem',
    icon: '🎭',
    description: 'Documenta um personagem em profundidade.',
    blocks: [
      { id: () => crypto.randomUUID(), type: 'h1',    content: 'Nome do Personagem' },
      { id: () => crypto.randomUUID(), type: 'callout', content: 'Função na história · Archétipo', props: { icon: '🎭', color: 'roxo' } },
      { id: () => crypto.randomUUID(), type: 'h2',    content: 'Aparência' },
      { id: () => crypto.randomUUID(), type: 'text',  content: 'Descreva a aparência física...' },
      { id: () => crypto.randomUUID(), type: 'h2',    content: 'Personalidade' },
      { id: () => crypto.randomUUID(), type: 'bullet', content: 'Traço dominante:', props: {} },
      { id: () => crypto.randomUUID(), type: 'bullet', content: 'Maior virtude:', props: {} },
      { id: () => crypto.randomUUID(), type: 'bullet', content: 'Maior falha:', props: {} },
      { id: () => crypto.randomUUID(), type: 'bullet', content: 'Medo principal:', props: {} },
      { id: () => crypto.randomUUID(), type: 'bullet', content: 'Desejo principal:', props: {} },
      { id: () => crypto.randomUUID(), type: 'h2',    content: 'Backstory' },
      { id: () => crypto.randomUUID(), type: 'text',  content: 'Contexto e história antes da narrativa...' },
      { id: () => crypto.randomUUID(), type: 'h2',    content: 'Arco narrativo' },
      { id: () => crypto.randomUUID(), type: 'text',  content: 'Como o personagem muda ao longo da história...' },
      { id: () => crypto.randomUUID(), type: 'h2',    content: 'Relações' },
      { id: () => crypto.randomUUID(), type: 'text',  content: 'Com quem se relaciona e como...' },
    ],
  },
  {
    id: 'story-map',
    name: 'Mapa da História',
    icon: '🗺️',
    description: 'Visão macro da narrativa: atos, viradas e arcos.',
    blocks: [
      { id: () => crypto.randomUUID(), type: 'h1',    content: 'Mapa da História' },
      { id: () => crypto.randomUUID(), type: 'text',  content: 'Premissa central da obra...' },
      { id: () => crypto.randomUUID(), type: 'h2',    content: 'Ato I — Apresentação' },
      { id: () => crypto.randomUUID(), type: 'numbered', content: 'Mundo comum', props: { level: 0 } },
      { id: () => crypto.randomUUID(), type: 'numbered', content: 'Chamado à aventura', props: { level: 0 } },
      { id: () => crypto.randomUUID(), type: 'numbered', content: 'Recusa / hesitação', props: { level: 0 } },
      { id: () => crypto.randomUUID(), type: 'numbered', content: 'Virada — ponto sem retorno', props: { level: 0 } },
      { id: () => crypto.randomUUID(), type: 'h2',    content: 'Ato II — Confronto' },
      { id: () => crypto.randomUUID(), type: 'numbered', content: 'Escalada de conflito', props: { level: 0 } },
      { id: () => crypto.randomUUID(), type: 'numbered', content: 'Ponto médio (virada interna)', props: { level: 0 } },
      { id: () => crypto.randomUUID(), type: 'numbered', content: 'Crise — tudo piora', props: { level: 0 } },
      { id: () => crypto.randomUUID(), type: 'h2',    content: 'Ato III — Resolução' },
      { id: () => crypto.randomUUID(), type: 'numbered', content: 'Clímax — confronto final', props: { level: 0 } },
      { id: () => crypto.randomUUID(), type: 'numbered', content: 'Resolução e desenlace', props: { level: 0 } },
      { id: () => crypto.randomUUID(), type: 'h2',    content: 'Temas e Símbolos' },
      { id: () => crypto.randomUUID(), type: 'text',  content: '' },
      { id: () => crypto.randomUUID(), type: 'h2',    content: 'Notas de Worldbuilding' },
      { id: () => crypto.randomUUID(), type: 'text',  content: '' },
    ],
  },
  {
    id: 'writing-plan',
    name: 'Planejamento de Escrita',
    icon: '📅',
    description: 'Organize metas de escrita semanais ou mensais.',
    blocks: [
      { id: () => crypto.randomUUID(), type: 'h1',    content: 'Planejamento — [Período]' },
      { id: () => crypto.randomUUID(), type: 'callout', content: 'Meta de palavras: ____ | Prazo: ____', props: { icon: '🎯', color: 'verde' } },
      { id: () => crypto.randomUUID(), type: 'h2',    content: 'O que escrever' },
      { id: () => crypto.randomUUID(), type: 'todo',  content: 'Capítulo X — cena de abertura', props: { checked: false } },
      { id: () => crypto.randomUUID(), type: 'todo',  content: 'Revisão do Capítulo Y', props: { checked: false } },
      { id: () => crypto.randomUUID(), type: 'todo',  content: 'Ficha de personagem: Z', props: { checked: false } },
      { id: () => crypto.randomUUID(), type: 'h2',    content: 'Pesquisa necessária' },
      { id: () => crypto.randomUUID(), type: 'bullet', content: '', props: {} },
      { id: () => crypto.randomUUID(), type: 'h2',    content: 'Progresso' },
      { id: () => crypto.randomUUID(), type: 'text',  content: 'Palavras escritas: 0 / ____' },
      { id: () => crypto.randomUUID(), type: 'h2',    content: 'Reflexões ao final' },
      { id: () => crypto.randomUUID(), type: 'text',  content: '' },
    ],
  },
]

// Materializa os blocos (executa os id: () => ...)
function materializeTemplate(tpl) {
  return {
    ...tpl,
    blocks: tpl.blocks.map(b => ({
      ...b,
      id: typeof b.id === 'function' ? b.id() : b.id,
      props: b.props ?? {},
      children: b.children ?? [],
    })),
  }
}

// ─── TemplateCard ─────────────────────────────────────────────────

function TemplateCard({ tpl, onSelect, isCustom, onDelete }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      className="relative rounded-lg p-4 cursor-pointer transition-all border"
      style={{
        background: hover ? `${T.ouro}15` : `${T.fundo}88`,
        borderColor: hover ? T.ouro : T.borda,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onSelect(tpl)}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none mt-0.5">{tpl.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-serif font-semibold text-sm" style={{ color: T.card }}>{tpl.name}</p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: T.textoSuave }}>
            {tpl.description}
          </p>
          {tpl.blocks.length > 0 && (
            <p className="text-xs mt-1" style={{ color: `${T.textoSuave}88` }}>
              {tpl.blocks.length} {tpl.blocks.length === 1 ? 'bloco' : 'blocos'}
            </p>
          )}
        </div>
        <ChevronRight size={14} style={{ color: T.textoSuave, shrink: 0 }} />
      </div>

      {isCustom && onDelete && (
        <button
          className="absolute top-2 right-2 p-1 rounded hover:bg-red-500/20 transition-colors"
          style={{ color: T.textoSuave }}
          onClick={e => { e.stopPropagation(); onDelete(tpl.id) }}
          title="Excluir template"
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}

// ─── TemplatePickerModal ──────────────────────────────────────────

export default function TemplatePickerModal({ open, onClose, onSelect }) {
  const [customTemplates, setCustomTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem('page-templates')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  function handleSelect(tpl) {
    const materialized = materializeTemplate(tpl)
    onSelect(materialized)
    onClose()
  }

  function deleteCustom(id) {
    setCustomTemplates(prev => {
      const next = prev.filter(t => t.id !== id)
      localStorage.setItem('page-templates', JSON.stringify(next))
      return next
    })
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[80vh] flex flex-col rounded-xl shadow-2xl overflow-hidden"
        style={{ background: T.superficie, border: `1px solid ${T.borda}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${T.borda}` }}
        >
          <div>
            <h2 className="font-serif text-lg font-semibold" style={{ color: T.ouro }}>
              📚 Escolher modelo
            </h2>
            <p className="text-xs mt-0.5" style={{ color: T.textoSuave }}>
              Selecione um modelo ou comece com uma página em branco
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
            style={{ color: T.textoSuave }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Grid de templates */}
        <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
          {/* Templates embutidos */}
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: T.textoSuave }}>
            Modelos de biblioteca
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {BUILTIN_TEMPLATES.map(tpl => (
              <TemplateCard key={tpl.id} tpl={tpl} onSelect={handleSelect} />
            ))}
          </div>

          {/* Templates customizados */}
          {customTemplates.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: T.textoSuave }}>
                Meus modelos
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {customTemplates.map(tpl => (
                  <TemplateCard
                    key={tpl.id}
                    tpl={tpl}
                    onSelect={handleSelect}
                    isCustom
                    onDelete={deleteCustom}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Hook para salvar página atual como template ──────────────────

export function useSaveAsTemplate() {
  function saveAsTemplate(title, icon, blocks) {
    const tpl = {
      id: crypto.randomUUID(),
      name: title || 'Modelo sem nome',
      icon: icon || '📄',
      description: `Criado a partir de "${title || 'página'}"`,
      blocks: blocks.map(b => ({
        ...b,
        id: () => crypto.randomUUID(),  // será reavaliado ao usar
      })),
      createdAt: new Date().toISOString(),
    }
    try {
      const saved = localStorage.getItem('page-templates')
      const existing = saved ? JSON.parse(saved) : []
      localStorage.setItem('page-templates', JSON.stringify([...existing, tpl]))
    } catch { /* ignore */ }
    return tpl
  }

  return { saveAsTemplate }
}
