import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Download, LayoutDashboard, Server, Users } from 'lucide-react'

import { AdminSidebar } from './AdminSidebar'

const items = [
  {
    label: 'Resumen',
    href: '/administracion',
    icon: <LayoutDashboard size={18} strokeWidth={1.8} />,
  },
  {
    label: 'Descargas',
    href: '/administracion/descargas',
    icon: <Download size={18} strokeWidth={1.8} />,
  },
  {
    label: 'Usuarios',
    href: '/administracion/usuarios',
    icon: <Users size={18} strokeWidth={1.8} />,
  },
  {
    label: 'Infraestructura',
    href: '/administracion/infraestructura',
    icon: <Server size={18} strokeWidth={1.8} />,
  },
]

const meta: Meta<typeof AdminSidebar> = {
  component: AdminSidebar,
}

export default meta

type Story = StoryObj<typeof AdminSidebar>

export const Default: Story = {
  args: {
    items,
    activePathname: '/administracion',
  },
}
