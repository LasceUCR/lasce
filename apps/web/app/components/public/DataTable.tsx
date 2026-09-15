import { useId, type ReactNode } from 'react'

export interface DataTableProps {
  summary: string
  caption: string
  columns: string[]
  children: ReactNode
}

/** Scrollable, keyboard-accessible alternative for charts and other dense data. */
export function DataTable({ summary, caption, columns, children }: DataTableProps) {
  const captionId = useId()

  return (
    <details className="data-table">
      <summary>{summary}</summary>
      <div className="data-table-region" role="region" aria-labelledby={captionId} tabIndex={0}>
        <table>
          <caption id={captionId}>{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </details>
  )
}
