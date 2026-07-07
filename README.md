# 📚 Projeto Biblioteca

> Editor de conteúdo inspirado no Notion, com tema visual de biblioteca física.
> Frontend React + Tailwind · Google Drive como backend · Deploy no GitHub Pages.

---

## Fases implementadas

| Fase | Status | Descrição |
|------|--------|-----------|
| 1 — Estabilização | ✅ | OAuth, drag & drop de blocos, tema visual |
| 2 — Blocos Avançados | ✅ | Segmentos com marks, toggle, colunas, KaTeX, bookmark |
| 3 — Database | ✅ | Schema no Drive, CRUD, Table/Gallery/List views, filtros |
| 4 — Views Avançadas | ✅ | Calendar, Timeline, relation, rollup, formula, coloração condicional |
| 5 — Navegação & UX | ✅ | Sidebar hierárquica, breadcrumb, Ctrl+K, templates, histórico, import/export |
| 6 — Colaboração | ✅ | Compartilhamento Drive, comentários via polling, presença via polling |

---

## Instalação e dev local

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173`.

---

## Deploy no GitHub Pages

### 1. Configurar variável no repositório

No GitHub → Settings → Variables → Actions, crie:

```
GITHUB_PAGES_BASE = /nome-do-seu-repo/
```

Se o Pages estiver em `usuario.github.io` (sem subpath), use `/`.

### 2. Autorizar a origem no Google Cloud Console

Em [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → seu OAuth Client ID:

- Adicionar em **Authorized JavaScript origins**:
  - `http://localhost:5173`
  - `https://usuario.github.io` ← sua URL exata do Pages

### 3. Push para `main`

O workflow `.github/workflows/deploy.yml` roda automaticamente e publica a pasta `dist/`.

---

## Estrutura de arquivos

```
src/
  App.jsx                          ← roteamento principal (HashRouter)
  main.jsx                         ← ponto de entrada
  index.css                        ← variáveis CSS do tema biblioteca

  contexts/
    AuthContext.jsx                ← OAuth 2.0 client-side
    DatabaseContext.jsx            ← CRUD de databases (Fase 3/4)
    NavigationContext.jsx          ← sidebar, breadcrumb, favoritos (Fase 5)
    CollaborationContext.jsx       ← compartilhamento, comentários, presença (Fase 6)

  components/
    layout/
      LoginScreen.jsx
      LibraryGrid.jsx
      LibraryView.jsx              ← lista páginas + databases de uma biblioteca
    editor/
      AppShell.jsx                 ← layout pós-login (Fase 5)
      AppShellV6.jsx               ← layout com colaboração (Fase 6) ← USE ESTE
      PageEditor.jsx               ← editor de blocos
      PageEditorShell.jsx          ← wrapper breadcrumb + ações (Fase 5)
      Block.jsx / BlockList.jsx    ← renderização de blocos
      SlashMenu.jsx                ← menu /comando
      InlineToolbar.jsx            ← toolbar de seleção de texto
      RichText.jsx                 ← texto com marks (segmentos)
      MentionPicker.jsx            ← picker de @menção (Fase 5)
      blocks/
        TextBlock.jsx
        ListBlocks.jsx
        MediaBlocks.jsx
        AdvancedBlocks.jsx         ← toggle, colunas, equação, bookmark
    database/
      DatabaseView.jsx             ← visualizador de database com tabs de view
      DatabaseToolbar.jsx          ← barra de ações do database
      PropertyCell.jsx             ← célula editável por tipo de propriedade
      ItemModal.jsx                ← modal de edição de item (Fase 4)
      AdvancedPropertyEditors.jsx  ← relation, rollup, formula (Fase 4)
      ConditionalColorEditor.jsx   ← coloração condicional (Fase 4)
      TemplateManager.jsx          ← templates de database (Fase 4)
      views/
        TableView.jsx
        GalleryView.jsx
        ListView.jsx
        CalendarView.jsx           ← (Fase 4)
        TimelineView.jsx           ← (Fase 4)
    sidebar/
      Sidebar.jsx                  ← índice hierárquico com DnD (Fase 5)
    breadcrumb/
      Breadcrumb.jsx               ← localização clicável (Fase 5)
    search/
      GlobalSearch.jsx             ← busca global Ctrl+K (Fase 5)
      ImportModal.jsx              ← importar MD/CSV (Fase 5)
    templates/
      PageTemplates.jsx            ← picker de templates de página (Fase 5)
    history/
      VersionHistory.jsx           ← painel de versões locais (Fase 5)
    sharing/
      SharingModal.jsx             ← compartilhamento via Drive (Fase 6)
    comments/
      CommentsPanel.jsx            ← painel de comentários com polling (Fase 6)
    presence/
      PresenceBar.jsx              ← avatares de quem está online (Fase 6)
    ui/
      Toast.jsx

  lib/
    drive.js                       ← wrapper Drive API + renovação de token
    database.js                    ← CRUD de database no Drive
    blocks.js                      ← helpers de blocos
    cache.js                       ← IndexedDB via idb-keyval
    formula.js                     ← motor de fórmulas (Fase 4)
    importExport.js                ← export MD/HTML/CSV, import MD/CSV (Fase 5)
    constants.js                   ← CLIENT_ID, escopos, configurações
```

---

## Integrando a Fase 6 (AppShellV6)

Substitua `<AppShell>` por `<AppShellV6>` dentro de `LibraryView.jsx`, adicionando 3 props novas:

```jsx
import AppShellV6 from '../editor/AppShellV6.jsx'

<AppShellV6
  // ...mesmas props do AppShell (Fase 5)...
  currentUser={{            // ← NOVO: usuário logado
    id:        user.googleId,
    name:      user.name,
    email:     user.email,
    avatarUrl: user.picture,
  }}
  pagesParentId={pagesFolderId}   // ← NOVO: ID da pasta pages/ no Drive
  onTokenExpired={signIn}         // ← NOVO: re-autentica em 401
>
  {children}
</AppShellV6>
```

Consulte `fase6/MIGRATION_GUIDE.md` para o passo a passo completo.

---

## Estrutura de dados no Drive

```
Drive raiz/
  [uuid-biblioteca]/
    _meta.json              ← título, ícone, capa da biblioteca
    _presence.json          ← quem está online (Fase 6, criado automaticamente)
    pages/
      [uuid-page].json      ← conteúdo da página (blocos + metadados)
      [uuid]_comments.json  ← comentários da página (Fase 6, criado ao 1º comentário)
    databases/
      [uuid-db]/
        _schema.json        ← propriedades e views do database
        [uuid-item].json    ← cada item é uma página de database
    assets/
      cover.[ext]
      [uuid-imagem].[ext]
```

---

## Decisões de arquitetura — Fase 6 sem backend

| Feature | Solução | Limitação |
|---|---|---|
| Compartilhamento | Drive Permissions API | Sem permissão por linha/bloco |
| Comentários | `_comments.json` + polling 30s | Atraso de até 30s entre usuários |
| Presença | `_presence.json` + polling 15s | Atraso de até 15s; sem cursor em tempo real |
| Notificações | ❌ Não implementado | Requer backend (e-mail/push) |
| Edição simultânea com merge | ❌ Não implementado | Requer CRDT + WebSocket |

Se no futuro precisar de colaboração em tempo real, substitua `CollaborationContext.jsx`
por uma implementação com Supabase Realtime ou Cloudflare Durable Objects —
a interface pública do contexto não muda.

---

## Tema visual

Paleta "biblioteca física":

| Variável CSS | Hex | Uso |
|---|---|---|
| `--cor-fundo` | `#1C1610` | Madeira escura — fundo principal |
| `--cor-superficie` | `#2A1F14` | Prateleira — sidebar, modais |
| `--cor-card` | `#F5EDD6` | Papel envelhecido — texto sobre fundo escuro |
| `--cor-card-hover` | `#EDE0C4` | Papel mais claro — hover de cards |
| `--cor-texto` | `#2C1810` | Tinta — texto sobre papel |
| `--cor-texto-suave` | `#6B4C3B` | Tinta desbotada — labels, placeholders |
| `--cor-destaque` | `#8B4513` | Couro — botões primários |
| `--cor-ouro` | `#C9A84C` | Dourado de lombada — destaques, ativo |
| `--cor-borda` | `#5C3D1E` | Madeira clara — bordas |

Fontes: `Georgia, 'Playfair Display', serif` para conteúdo e UI principais.
