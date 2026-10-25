import {defineField, defineType} from 'sanity'
import {aboutImages, aboutImagesInitialized, pageImages} from './pictures'

export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  fields: [
    defineField({name: 'title', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'slug', type: 'slug', options: {source: 'title'}, validation: (r) => r.required()}),
    defineField({name: 'headline', title: 'Main heading (H1)', type: 'string'}),
    aboutImages,
    aboutImagesInitialized,
    defineField({name: 'body', type: 'body'}),
    pageImages,
    defineField({name: 'seo', type: 'seo'}),
  ],
})
