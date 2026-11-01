import type { Project } from '../../shared/project'
import { blockClass, scopedCss, usesTailwind } from './page'

const pascal = (s: string): string =>
  s
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('')
    .replace(/^(\d)/, 'C$1') || 'Component'

const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'site'

/** A Vite + React project: one file per component, the page CSS (with Tailwind if used) in index.css. */
export function exportReactProject(p: Project): Record<string, string> {
  const tailwind = usesTailwind(p.css)
  const used = new Set<string>()
  const comps = p.blocks.map((b) => {
    let name = pascal(b.name)
    for (let i = 2; used.has(name); i++) name = `${pascal(b.name)}${i}`
    used.add(name)
    return { b, name }
  })

  const files: Record<string, string> = {}
  for (const { b, name } of comps) {
    files[`src/components/${name}.jsx`] =
      b.lang === 'jsx'
        ? b.code
        : `// Converted from HTML. Rewrite as JSX to make it interactive.
const html = ${JSON.stringify(b.code)}

export default function ${name}({ className }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
`
  }

  files['src/App.jsx'] =
    `${comps.map(({ name }) => `import ${name} from './components/${name}'`).join('\n')}

export default function App() {
  return (
    <>
${comps
  .map(({ b, name }) =>
    b.lang === 'jsx'
      ? `      <div className="${blockClass(b.id)}">\n        <${name} />\n      </div>`
      : `      <${name} className="${blockClass(b.id)}" />`
  )
  .join('\n')}
    </>
  )
}
`
  files['src/main.jsx'] = `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
`
  files['src/index.css'] = [p.css, ...p.blocks.map(scopedCss)].filter(Boolean).join('\n\n') + '\n'
  files['index.html'] = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${(p.title || p.name).replace(/</g, '&lt;')}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`
  files['vite.config.js'] = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
${tailwind ? "import tailwindcss from '@tailwindcss/vite'\n" : ''}
export default defineConfig({
  plugins: [react()${tailwind ? ', tailwindcss()' : ''}]
})
`
  files['package.json'] =
    JSON.stringify(
      {
        name: slug(p.name),
        private: true,
        version: '0.1.0',
        type: 'module',
        scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
        dependencies: { react: '^19.2.0', 'react-dom': '^19.2.0' },
        devDependencies: {
          '@vitejs/plugin-react': '^6.0.0',
          vite: '^8.0.0',
          ...(tailwind ? { tailwindcss: '^4.1.0', '@tailwindcss/vite': '^4.1.0' } : {})
        }
      },
      null,
      2
    ) + '\n'
  files['README.md'] = `# ${p.name}

Exported from Tenonkit.

\`\`\`bash
npm install
npm run dev
\`\`\`
`
  files['.gitignore'] = 'node_modules\ndist\n'
  return files
}
