import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export interface ConceptFlowProps {
  title: string
  steps: readonly string[]
  stepLinks?: readonly (string | null)[]
  caption: string
}

export function ConceptFlow({ title, steps, stepLinks, caption }: ConceptFlowProps) {
  return (
    <div aria-label={title} className="concept-flow" role="group">
      <p className="concept-flow-title">{title}</p>
      <ol className="concept-flow-steps">
        {steps.map((step, index) => {
          const href = stepLinks?.[index]

          return (
            <li key={step}>
              {href ? <Link href={href}>{step}</Link> : <span>{step}</span>}
              {index < steps.length - 1 ? (
                <ArrowRight
                  aria-hidden="true"
                  className="concept-flow-arrow"
                  size={18}
                  strokeWidth={2}
                />
              ) : null}
            </li>
          )
        })}
      </ol>
      <p>{caption}</p>
    </div>
  )
}
