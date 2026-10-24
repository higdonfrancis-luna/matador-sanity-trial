import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'Matador Sanity Trial',
  projectId: 'i2tdfchw',
  dataset: 'production',
  plugins: [structureTool()],
  schema: {types: schemaTypes},
})
