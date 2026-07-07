/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Tema biblioteca — paleta completa
        fundo:       '#1C1610', // madeira escura
        superficie:  '#2A1F14', // prateleira
        card:        '#F5EDD6', // papel envelhecido
        'card-hover':'#EDE0C4', // papel claro
        texto:       '#2C1810', // tinta
        'texto-suave':'#6B4C3B',// tinta desbotada
        destaque:    '#8B4513', // couro
        ouro:        '#C9A84C', // dourado de lombada
        borda:       '#5C3D1E', // madeira clara
        // Cores de estado
        verde:    '#448361',
        vermelho: '#D44C47',
        laranja:  '#D9730D',
        azul:     '#337EA9',
        roxo:     '#9065B0',
        // Aliases semânticos usados em componentes
        'vermelho-erro': '#D44C47',
        'azul-link':     '#337EA9',
      },
      fontFamily: {
        serif:  ['Playfair Display', 'Georgia', 'serif'],
        sans:   ['Inter', 'system-ui', 'sans-serif'],
        mono:   ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        // Escala tipográfica do editor
        'editor-body': ['1.0625rem', { lineHeight: '1.75' }],
        'editor-h1':   ['2rem',      { lineHeight: '1.25', fontWeight: '700' }],
        'editor-h2':   ['1.5rem',    { lineHeight: '1.3',  fontWeight: '600' }],
        'editor-h3':   ['1.25rem',   { lineHeight: '1.4',  fontWeight: '600' }],
      },
      boxShadow: {
        'livro':    '4px 6px 16px rgba(0,0,0,0.45), inset -2px 0 4px rgba(0,0,0,0.3)',
        'livro-hover': '8px 12px 28px rgba(0,0,0,0.55), inset -2px 0 4px rgba(0,0,0,0.3)',
        'pagina':   '0 2px 8px rgba(44,24,16,0.12)',
      },
      backgroundImage: {
        'lombada': 'linear-gradient(to right, #C9A84C 0%, #E8C96A 40%, #C9A84C 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
        'slide-up': 'slideUp 200ms ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 },               to: { opacity: 1 } },
        slideUp: { from: { transform: 'translateY(6px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
      },
    },
  },
  plugins: [],
}
