import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {presentationTool, defineDocuments, defineLocations} from 'sanity/presentation'
import {schemaTypes} from './schemaTypes'

const previewUrl = process.env.SANITY_STUDIO_PREVIEW_URL || 'https://matador-sanity-trial.netlify.app'
const locations = defineLocations({
  select: {title: 'title', name: 'name', slug: 'slug.current'},
  resolve: (doc) => doc?.slug ? {locations: [{title: doc.title || doc.name || 'Page', href: `/${doc.slug}/`}]} : null,
})

export default defineConfig({
  name: 'default',
  title: 'Matador Sanity Trial',
  projectId: 'i2tdfchw',
  dataset: 'production',
  basePath: process.env.SANITY_STUDIO_BASE_PATH || '/',
  plugins: [
    presentationTool({
      title: 'Website editor',
      previewUrl: {initial: `${previewUrl}/about-us/`, previewMode: {enable: '/api/preview/enable'}},
      resolve: {
        mainDocuments: defineDocuments([{route: '/:slug', filter: '_type in ["page", "practiceArea", "attorney"] && slug.current == $slug && (string::startsWith(_id, "wyatt-trial-") || string::startsWith(_id, "drafts.wyatt-trial-"))'}]),
        locations: {page: locations, practiceArea: locations, attorney: locations},
      },
    }),
    structureTool(),
  ],
  schema: {types: schemaTypes},
})
