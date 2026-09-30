import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Download, LayoutDashboard, Server, Shield, Users } from 'lucide-react'

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
    label: 'Permisos',
    href: '/administracion/permisos',
    icon: <Shield size={18} strokeWidth={1.8} />,
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

// Below 1120px the sidebar collapses into a bar; this viewport shows that layout.
const mobileViewport = {
  globals: { viewport: { value: 'adminMobile', isRotated: false } },
  parameters: {
    viewport: {
      options: {
        adminMobile: {
          name: 'Mobile (390px)',
          styles: { width: '390px', height: '844px' },
        },
      },
    },
  },
}

export const Default: Story = {
  args: {
    items,
    activePathname: '/administracion',
  },
}

/** The collapsed bar, naming the current section. */
export const Mobile: Story = {
  args: {
    ...Default.args,
    activePathname: '/administracion/usuarios',
  },
  ...mobileViewport,
}

/** The bar with its list expanded in place. */
export const MobileOpen: Story = {
  args: {
    ...Default.args,
    activePathname: '/administracion/usuarios',
    defaultOpen: true,
  },
  ...mobileViewport,
}
