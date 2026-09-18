import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

import { DataTable, type DataTableProps } from './DataTable'
import { Default } from './DataTable.stories'

describe('DataTable', () => {
  test('provides a focusable disclosure and names the scrollable region using its caption', async () => {
    const user = userEvent.setup()
    render(<DataTable {...(Default.args as DataTableProps)} />)
    await user.tab()
    expect(screen.getByText('Ver valores (2)')).toHaveFocus()
    // jsdom does not implement the native Enter activation of <summary>.
    await user.click(screen.getByText('Ver valores (2)'))

    const region = screen.getByRole('region', { name: 'Muestras de demostración' })
    expect(within(region).getByRole('table', { name: 'Muestras de demostración' })).toBeVisible()
    expect(within(region).getByRole('columnheader', { name: 'Hora (UTC)' })).toBeVisible()
    await user.tab()
    expect(region).toHaveFocus()
  })
})
