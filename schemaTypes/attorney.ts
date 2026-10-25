import {defineField, defineType} from 'sanity'
import {pageImages} from './pictures'

export const attorney = defineType({
  name: 'attorney',
  title: 'Attorney',
  type: 'document',
  fields: [
    defineField({name: 'name', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'slug', type: 'slug', options: {source: 'name'}, validation: (r) => r.required()}),
    defineField({name: 'role', title: 'Role', type: 'string'}),
    defineField({name: 'photo', type: 'image', options: {hotspot: true}, fields: [{name: 'alt', title: 'Alt text', type: 'string'}]}),
    defineField({name: 'bio', title: 'Bio', type: 'body'}),
    pageImages,
    defineField({name: 'seo', type: 'seo'}),
  ],
  preview: {select: {title: 'name', subtitle: 'role', media: 'photo'}},
})
