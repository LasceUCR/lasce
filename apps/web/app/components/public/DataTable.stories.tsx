import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DataTable } from './DataTable'

const meta: Meta<typeof DataTable> = { component: DataTable }
export default meta
type Story = StoryObj<typeof DataTable>

export const Default: Story = {
  args: {
    summary: 'Ver valores (2)',
    caption: 'Muestras de demostración',
    columns: ['Hora (UTC)', 'Valor'],
    children: (
      <>
        <tr>
          <th scope="row">08:00</th>
          <td>12</td>
        </tr>
        <tr>
          <th scope="row">08:10</th>
          <td>24</td>
        </tr>
      </>
    ),
  },
}
