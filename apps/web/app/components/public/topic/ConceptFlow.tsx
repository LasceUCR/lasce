import { ArrowRight } from 'lucide-react'

export interface ConceptFlowProps {
  title: string
  steps: readonly string[]
  caption: string
}

export function ConceptFlow({ title, steps, caption }: ConceptFlowProps) {
  return (
    <div aria-label={title} className="concept-flow">
      <p className="concept-flow-title">{title}</p>
      <ol className="concept-flow-steps">
        {steps.map((step, index) => (
          <li key={step}>
            <span>{step}</span>
            {index < steps.length - 1 ? (
              <ArrowRight aria-hidden="true" className="concept-flow-arrow" size={18} strokeWidth={2} />
            ) : null}
          </li>
        ))}
      </ol>
      <p>{caption}</p>
    </div>
  )
}
