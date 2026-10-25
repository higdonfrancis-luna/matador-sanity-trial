import {createClient} from '@sanity/client'
import {createReadStream} from 'node:fs'
import {readFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {resolve} from 'node:path'

const id = 'wyatt-trial-about-us'
export function planAboutImageSeed(current, draft) {
  if (!current) throw new Error('The existing trial About Us document was not found')
  const wasInitialized = current.aboutImagesInitialized === true || Object.hasOwn(current, 'aboutImages')
  const patches = [current, draft].filter(Boolean).filter(doc => doc.aboutImagesInitialized !== true).map(doc => ({
    id: doc._id, revision: doc._rev,
    initializeImages: !wasInitialized && !Object.hasOwn(doc, 'aboutImages'),
  }))
  return {patches, needsAssets: patches.some(patch => patch.initializeImages)}
}

async function seedAboutImages() {
const token = process.env.SANITY_AUTH_TOKEN
if (!token) throw new Error('Provide SANITY_AUTH_TOKEN through the environment. Never put it in a file or command argument.')
const client = createClient({projectId: 'i2tdfchw', dataset: 'production', apiVersion: '2026-01-01', useCdn: false, token})
const [current, draft] = await Promise.all([client.getDocument(id), client.getDocument('drafts.' + id)])
const plan = planAboutImageSeed(current, draft)
if (!plan.patches.length) {
  console.log('Pictures already initialized; no documents or images changed.')
  return
}
const aboutImages = {_type: 'object'}
if (plan.needsAssets) {
const manifest = JSON.parse(await readFile(new URL('../web/about-image-slots.json', import.meta.url), 'utf8'))
for (const slot of manifest) {
  const path = new URL('../' + slot.localPath, import.meta.url)
  const asset = await client.assets.upload('image', createReadStream(path), {filename: path.pathname.split('/').pop(), source: {id: slot.source, name: 'Existing approved Wyatt website', url: slot.source}})
  aboutImages[slot.name] = {_type: 'image', asset: {_type: 'reference', _ref: asset._id}, alt: slot.alt}
}
}
let transaction = client.transaction()
for (const item of plan.patches) transaction = transaction.patch(item.id, patch => {
  patch = patch.ifRevisionId(item.revision).set({aboutImagesInitialized: true})
  return item.initializeImages ? patch.setIfMissing({aboutImages}) : patch
})
await transaction.commit()
console.log(plan.needsAssets
  ? 'Initialized 10 existing website pictures on the trial About Us page. Text and older Matador documents unchanged.'
  : 'Recorded image initialization without replacing pictures or restoring removed pictures.')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await seedAboutImages()
