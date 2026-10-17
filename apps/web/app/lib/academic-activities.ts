import es from '@/messages/es.json' with { type: 'json' }

export interface AcademicActivity {
  slug: string
  title: string
  category: string
  date: string
  location?: string
  description: string
  imageUrl: string
  imageAlt: string
}

/** The `items` map of the `academicActivities` namespace of a message catalogue. */
export type AcademicActivityMessages = typeof es.academicActivities.items

/**
 * The activities, described in the language of `messages`. Defaults to Spanish, the source
 * language; a page passes the request's catalogue. Slugs, official event titles, places and
 * image paths are the same in every language and stay here.
 */
export function getAcademicActivities(
  messages: AcademicActivityMessages = es.academicActivities.items,
): AcademicActivity[] {
  const workshop = messages.machineLearningWorkshop

  return [
    {
      slug: 'machine-learning-workshop',
      title: '2026 Workshop on Machine Learning Applied to Space Weather and GNSS',
      category: workshop.category,
      date: workshop.date,
      location: 'San José, Costa Rica',
      description: [workshop.p1, workshop.p2, workshop.p3, workshop.p4].join('\n\n'),
      imageUrl: '/images/galeria/workshop-ml-2026/1.jpg',
      imageAlt: workshop.imageAlt,
    },
  ]
}

/** The activities in Spanish, the source language. For stories and tests. */
export const academicActivities: AcademicActivity[] = getAcademicActivities()
