import {spawnSync} from 'node:child_process'
import {cpSync, readFileSync, writeFileSync} from 'node:fs'
const previewUrl = process.env.SANITY_STUDIO_PREVIEW_URL || process.env.URL || 'https://matador-sanity-trial.netlify.app'
for (const [command, args, env] of [
  ['node', ['node_modules/vite/bin/vite.js', 'build'], process.env],
  ['node_modules/.bin/sanity', ['build', 'dist/studio'], {...process.env, SANITY_STUDIO_BASEPATH: '/studio', SANITY_STUDIO_PREVIEW_URL: previewUrl}],
]) {
  const result = spawnSync(command, args, {stdio: 'inherit', env})
  if (result.status !== 0) process.exit(result.status || 1)
}
// Sanity's default icon links retain /static even when CLI assets use a base path.
const studioHtml = 'dist/studio/index.html'
writeFileSync(studioHtml, readFileSync(studioHtml, 'utf8').replaceAll('href="/static/', 'href="/studio/static/'))
cpSync('web/assets', 'dist/assets', {recursive: true})
