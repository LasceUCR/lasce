import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { Modal } from '@/app/components/public/Modal'

import { ToastProvider, useToast } from './ToastProvider'

/** Triggers toasts on the page and inside an open modal. The preview supplies the provider. */
function ToastDemo() {
  const toast = useToast()
  const [open, setOpen] = useState(false)

  return (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
      <Button onClick={() => toast.show('success', 'Cambios guardados correctamente.')}>
        Mostrar éxito
      </Button>
      <Button
        onClick={() => toast.show('error', 'No tiene permisos para modificar este contenido.')}
        variant="secondary"
      >
        Mostrar error
      </Button>
      <Button onClick={() => setOpen(true)} variant="secondary">
        Abrir un formulario
      </Button>
      <Modal onClose={() => setOpen(false)} open={open} title="Formulario">
        <p>Un error mostrado aquí aparece dentro del diálogo y se cierra con él.</p>
        <div className="cms-form-actions">
          <Button onClick={() => setOpen(false)} variant="secondary">
            Cancelar
          </Button>
          <Button
            onClick={() =>
              toast.show(
                'error',
                'No se pudo conectar con el servidor. Revise su conexión e inténtelo de nuevo.',
              )
            }
          >
            Fallar al guardar
          </Button>
        </div>
      </Modal>
    </div>
  )
}

const meta: Meta<typeof ToastProvider> = {
  component: ToastProvider,
}

export default meta

type Story = StoryObj<typeof ToastProvider>

export const Playground: Story = {
  render: () => <ToastDemo />,
}
