import {createClient} from '@sanity/client'

export const PROJECT_ID = 'i2tdfchw'
export const DATASET = 'production'
export const CONTENT_TYPES = ['page', 'practiceArea', 'attorney']

export function createSanityClient(token) {
  return createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: '2026-01-01',
    useCdn: false,
    perspective: 'published',
    token: token || undefined,
    requestTagPrefix: 'matador-trial-preview',
  })
}

// Neither the query nor its document scope can be supplied by a caller.
// The older imported Matador documents are deliberately excluded.
const scope = '_type in $types && (string::startsWith(_id, "wyatt-trial-") || string::startsWith(_id, "drafts.wyatt-trial-"))'
const image = '{..., asset->{_id,url,metadata{dimensions,lqip}}, "url": asset->url}'
const portableText = `[]{..., _type == "image" => ${image}}`
const aboutImageSlots = [
  'hero', 'storyPortrait', 'justinPortrait', 'awardJustia', 'awardTop100',
  'awardRisingStars', 'awardTop40', 'awardAvvo', 'awardTrialLawyersUniversity', 'awardExpertise',
]
export const LIST_QUERY = `*[${scope} && defined(slug.current)] | order(_type asc, title asc, name asc){_id,_type,_rev,_updatedAt,title,name,slug}`
export const DOCUMENT_QUERY = `*[${scope} && slug.current == $slug][0]{
  _id,_type,_rev,_updatedAt,title,name,slug,headline,intro,role,seo,aboutImagesInitialized,
  body${portableText},bio${portableText},photo${image},"photoUrl":photo.asset->url,
  heroImage${image},pageImages[]${image},
  defined(aboutImages) => {aboutImages{${aboutImageSlots.map(slot => `${slot}${image}`).join(',')}}}
}`

export async function fetchTrialContent({slug, perspective, token}) {
  const client = createSanityClient(perspective === 'drafts' ? token : undefined)
  return client.fetch(slug ? DOCUMENT_QUERY : LIST_QUERY,
    {types: CONTENT_TYPES, ...(slug ? {slug} : {})},
    {perspective, cache: 'no-store', tag: slug ? 'document' : 'list'})
}
