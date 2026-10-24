import {defineField, defineType} from 'sanity'

export const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  fields: [
    defineField({name: 'title', title: 'Page title (browser tab and Google)', type: 'string', validation: (r) => r.max(70).warning('Google usually cuts titles after about 60 characters')}),
    defineField({name: 'description', title: 'Meta description', type: 'text', rows: 3, validation: (r) => r.max(160).warning('Google usually cuts descriptions after about 155 characters')}),
  ],
})
