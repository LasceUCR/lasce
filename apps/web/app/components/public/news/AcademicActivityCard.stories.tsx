import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import type { AcademicActivity } from '@/app/lib/academic-activities'

import { AcademicActivityCard } from './AcademicActivityCard'

const meta: Meta<typeof AcademicActivityCard> = {
  component: AcademicActivityCard,
}

export default meta

type Story = StoryObj<typeof AcademicActivityCard>

export const mockActivity: AcademicActivity = {
  id: '00000000-0000-4000-8000-000000000001',
  title: '2026 Workshop on Machine Learning Applied to Space Weather and GNSS',
  category: 'Taller',
  date: '16-20 febrero, 2026',
  startDate: '2026-02-16',
  endDate: '2026-02-20',
  location: 'San José, Costa Rica',
  description: [
    'En el marco del proyecto LASCE se realizó, del 16 al 20 de febrero de 2026 en San José, Costa Rica, el Taller sobre Aprendizaje Automático Aplicado al Clima Espacial y a los Sistemas Globales de Navegación por Satélite (GNSS).',
    'El programa combinó conferencias, sesiones de discusión y prácticas computacionales dedicadas a los procesos ionosféricos, los efectos del clima espacial sobre los sistemas GNSS, la computación científica y el análisis de datos mediante herramientas de aprendizaje automático.',
    'El taller contó con 52 participantes presenciales procedentes de 17 países; el 37,2 % fueron mujeres y el 70 % provenía de países en desarrollo.',
    'Esta actividad fortaleció la proyección internacional del LASCE, amplió las redes de colaboración científica y contribuyó a la formación de capacidades regionales.',
  ].join('\n\n'),
  photoUrl: '/images/galeria/workshop-ml-2026/1.jpg',
  photoAlt:
    'Comité y participantes junto al cartel oficial del taller de Machine Learning y clima espacial',
}

export const Default: Story = {
  args: {
    activity: mockActivity,
  },
}
