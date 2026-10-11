import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { StandardConfirmDialog } from './StandardConfirmDialog'

const meta: Meta<typeof StandardConfirmDialog> = {
  component: StandardConfirmDialog,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof StandardConfirmDialog>

export const DestructiveDelete: Story = {
  args: {
    open: true,
    title: 'Eliminar investigador',
    message: '¿Está seguro de que desea eliminar a este investigador del equipo?',
    targetEntity: 'Dra. Carolina Salas (Astrofísica Solar)',
    consequence: 'Esta acción no se puede deshacer y desvinculará sus publicaciones asociadas.',
    severity: 'danger',
    confirmLabel: 'Sí, eliminar',
    cancelLabel: 'Cancelar',
    isSubmitting: false,
    onCancel: () => {},
    onConfirm: () => {},
  },
}

export const SaveConfirmation: Story = {
  args: {
    open: true,
    title: 'Guardar cambios',
    message: '¿Desea publicar y guardar los cambios realizados en esta noticia?',
    targetEntity: 'Noticia: Avances en el radiotelescopio de Santa Cruz',
    consequence: 'Los cambios serán visibles inmediatamente para el público en el sitio web.',
    severity: 'info',
    confirmLabel: 'Guardar y publicar',
    cancelLabel: 'Continuar editando',
    isSubmitting: false,
    onCancel: () => {},
    onConfirm: () => {},
  },
}

export const DiscardChangesWarning: Story = {
  args: {
    open: true,
    title: 'Descartar cambios no guardados',
    message:
      'Si descarta ahora, se perderán todos los datos ingresados que no hayan sido guardados.',
    severity: 'warning',
    confirmLabel: 'Descartar y salir',
    cancelLabel: 'Seguir editando',
    isSubmitting: false,
    onCancel: () => {},
    onConfirm: () => {},
  },
}

export const SubmittingState: Story = {
  args: {
    ...DestructiveDelete.args,
    isSubmitting: true,
    submittingLabel: 'Eliminando registro...',
  },
}

export const ErrorState: Story = {
  args: {
    ...DestructiveDelete.args,
    errorMessage: 'No se pudo completar la eliminación. Por favor, intente de nuevo más tarde.',
  },
}
