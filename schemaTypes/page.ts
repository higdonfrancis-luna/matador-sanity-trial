import {defineField, defineType} from 'sanity'

export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  fields: [
    defineField({name: 'title', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'slug', type: 'slug', options: {source: 'title'}, validation: (r) => r.required()}),
    defineField({name: 'headline', title: 'Main heading (H1)', type: 'string'}),
    defineField({name: 'body', type: 'body'}),
    defineField({name: 'seo', type: 'seo'}),
  ],
})
