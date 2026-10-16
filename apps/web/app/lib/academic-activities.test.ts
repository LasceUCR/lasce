import { describe, expect, test } from 'vitest'

import { academicActivities, getAcademicActivities } from './academic-activities'
import { getMessages } from './i18n/messages'

describe('academic activities', () => {
  test('describes the workshop in Spanish by default, in four paragraphs', () => {
    const [workshop] = academicActivities

    expect(workshop?.slug).toBe('machine-learning-workshop')
    expect(workshop?.category).toBe('Taller')
    expect(workshop?.date).toBe('16-20 febrero, 2026')
    expect(workshop?.description.split('\n\n')).toHaveLength(4)
  })

  test('describes it in the language it is given and keeps slug, title and place', () => {
    const [spanish] = academicActivities
    const [english] = getAcademicActivities(getMessages('en').academicActivities.items)

    expect(english?.category).toBe('Workshop')
    expect(english?.description.split('\n\n')).toHaveLength(4)
    expect(english).toMatchObject({
      slug: spanish?.slug,
      title: spanish?.title,
      location: spanish?.location,
      imageUrl: spanish?.imageUrl,
    })
  })
})
