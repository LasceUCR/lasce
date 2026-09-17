'use client'

import { HeroObservationBadge } from './HeroObservationBadge'
import { useLatestSuviObservation } from './solar-astrophysics/useLatestSuviObservation'

/** Wires the live SUVI feed into the hero's accessible observation caption. */
export function HeroSolarObservation() {
  const observation = useLatestSuviObservation()

  return <HeroObservationBadge observation={observation} />
}
