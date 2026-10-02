import { build as esbuildBuild } from 'esbuild'
import { build as viteBuild } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rm, mkdir, copyFile } from 'node:fs/promises'
import viteConfig from '../vite.config'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const dist = resolve(root, 'dist')

async function clean(): Promise<void> {
  await rm(dist, { recursive: true, force: true })
  await mkdir(dist, { recursive: true })
}

async function copyStaticFiles(): Promise<void> {
  await copyFile(resolve(root, 'public/manifest.json'), resolve(dist, 'manifest.json'))
  await copyFile(resolve(root, 'public/icon.png'), resolve(dist, 'icon.png'))
}

async function buildBackground(): Promise<void> {
  await esbuildBuild({
    entryPoints: [resolve(root, 'src/background/background.ts')],
    outfile: resolve(dist, 'background/background.js'),
    bundle: true,
    format: 'esm',
    target: 'chrome110',
    platform: 'browser',
    minify: true,
  })
}

async function buildContentScripts(): Promise<void> {
  const scripts = ['leetcode', 'hackerrank', 'codeforces']
  await Promise.all(
    scripts.map((name) =>
      esbuildBuild({
        entryPoints: [resolve(root, `src/content/${name}.ts`)],
        outfile: resolve(dist, `content/${name}.js`),
        bundle: true,
        format: 'iife',
        target: 'chrome110',
        platform: 'browser',
        minify: true,
      }),
    ),
  )
}

async function buildFrontendPages(): Promise<void> {
  // Builds both the popup and the OAuth auth window in one pass (see vite.config.ts).
  await viteBuild(viteConfig)
}

async function main(): Promise<void> {
  await clean()
  await copyStaticFiles()
  await Promise.all([buildBackground(), buildContentScripts(), buildFrontendPages()])
  // eslint-disable-next-line no-console
  console.log('Build complete -> dist/')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
