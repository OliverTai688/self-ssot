/** Build a source snapshot in a disposable directory without disturbing the owner's dev server. */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
const root = process.cwd()
const reuseIndex = process.argv.indexOf('--reuse')
const target = reuseIndex < 0 ? fs.mkdtempSync(path.join(os.tmpdir(), 'personal-os-ui-build-')) : path.resolve(process.argv[reuseIndex + 1])
if (fs.realpathSync(path.dirname(target)) !== fs.realpathSync(os.tmpdir()) || !path.basename(target).startsWith('personal-os-ui-build-')) throw new Error('Reuse target must be a disposable UI build directory.')
for (const name of ['src', 'public', 'prisma', 'next.config.ts', 'postcss.config.mjs', 'tsconfig.json', 'package.json', 'pnpm-lock.yaml', 'components.json']) {
  if (fs.existsSync(path.join(root, name))) fs.cpSync(path.join(root, name), path.join(target, name), { recursive: true, filter: (source, destination) => fs.statSync(source).isDirectory() || !fs.existsSync(destination) || !fs.readFileSync(source).equals(fs.readFileSync(destination)) })
}
for (const name of ['node_modules', 'docs']) if (!fs.existsSync(path.join(target, name))) fs.symlinkSync(path.join(root, name), path.join(target, name), 'dir')
console.log(`Disposable integration build: ${target}; env files are not copied; no migrations or seeds`)
const env = { ...process.env, PERSONAL_OS_UI_DATA_MODE: 'empty', PERSONAL_OS_AUTH_MODE: 'supabase', DATABASE_URL: 'postgresql://ui_build:ui_build@127.0.0.1:9/ui_build', DIRECT_URL: 'postgresql://ui_build:ui_build@127.0.0.1:9/ui_build', NEXT_TELEMETRY_DISABLED: '1' }
if (process.argv.includes('--cached-fonts')) {
  const preview = ['empty', 'showcase'].map(mode => path.join(os.tmpdir(), `personal-os-yuanzhan-${mode}/.next/dev`)).find(dir => fs.existsSync(path.join(dir, 'static/css/app/layout.css')))
  if (!preview) throw new Error('Open either UI preview once to cache its existing Geist fonts.')
  const cachedCss = fs.readFileSync(path.join(preview, 'static/css/app/layout.css'), 'utf8')
  const faces = (cachedCss.match(/@font-face\s*\{[^}]+\}/g) ?? []).filter(face => face.includes('src: url('))
  const css = faces.join('\n').replace(/url\(\/_next\/static\/media\/([^)]*)\)/g, (_, name) => `url(${path.join(preview, 'static/media', name)})`)
  if (!faces.length) throw new Error('Open either UI preview once to cache its existing Geist fonts.')
  const response = path.join(target, 'font-cache-responses.cjs')
  fs.writeFileSync(response, `module.exports = new Proxy({}, {get: () => ${JSON.stringify(css)}})\n`)
  env.NEXT_FONT_GOOGLE_MOCKED_RESPONSES = response
  console.log('FONT_CACHE_FALLBACK: Next font test adapter reuses already downloaded local font bytes; external Google availability is not proven.')
}
const child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'build', target, '--webpack'], { cwd: target, env, stdio: 'inherit' })
child.on('exit', code => { process.exitCode = code ?? 1 })
