import {defineArrayMember, defineField} from 'sanity'

const details = [
  defineField({name: 'alt', title: 'Describe the picture', type: 'string', description: 'Used by screen readers and when the picture cannot load.'}),
  defineField({name: 'caption', title: 'Caption', type: 'string'}),
]
export const heroImage = defineField({name: 'heroImage', title: 'Page photograph', type: 'image', options: {hotspot: true}, fields: details})
export const pageImages = defineField({
  name: 'pageImages', title: 'Additional pictures', type: 'array',
  description: 'Add, replace, remove, or reorder pictures shown below this page’s content.',
  of: [defineArrayMember({type: 'image', options: {hotspot: true}, fields: details})],
})
const slots = [
  ['hero', 'Header background'], ['storyPortrait', 'Our story portrait'], ['justinPortrait', 'Meet Justin portrait'],
  ['awardJustia', 'Justia award'], ['awardTop100', 'Top 100 award'], ['awardRisingStars', 'Rising Stars award'],
  ['awardTop40', 'Top 40 award'], ['awardAvvo', 'Avvo award'], ['awardTrialLawyersUniversity', 'Trial Lawyers University award'], ['awardExpertise', 'Expertise award'],
]
export const aboutImages = defineField({
  name: 'aboutImages', title: 'Pictures on this page', type: 'object',
  hidden: ({document}) => document?._id?.replace(/^drafts\./, '') !== 'wyatt-trial-about-us',
  description: 'Replace a picture to change it. Remove it to hide it from this page. Use Website editor to preview your changes.',
  options: {collapsible: true, collapsed: false},
  fields: slots.map(([name, title]) => defineField({name, title, type: 'image', options: {hotspot: true}, fields: details.filter(field => field.name !== 'caption')})),
})
export const aboutImagesInitialized = defineField({name: 'aboutImagesInitialized', type: 'boolean', hidden: true, readOnly: true})
