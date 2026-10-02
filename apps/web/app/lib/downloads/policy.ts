import type { Permission } from '@/app/lib/auth/permissions'
import {
  findScientificProduct,
  type ScientificDataQuery,
  type ScientificInstrumentCode,
  type ScientificSourceCode,
} from '@/app/lib/scientific-data'

import {
  DOWNLOAD_FORMAT_DEFINITIONS,
  DOWNLOAD_FORMATS,
  type DownloadFormat,
  type DownloadFormatDefinition,
} from './formats'

/** Which formats an instrument offers, and the grants each one needs. A missing format is not offered. */
export type InstrumentDownloadPolicy = Partial<Record<DownloadFormat, readonly Permission[]>>

const GRAPHIC: readonly Permission[] = ['download_resources']
const OPEN_DATA: readonly Permission[] = ['download_resources']
const GOES_DATA: readonly Permission[] = ['download_resources', 'download_goes_resources']

/**
 * What can be downloaded from `/datos`, per source and instrument. Deny by default: an
 * instrument with no entry offers nothing. Both the page (to draw the buttons) and the
 * download service (to enforce) read this table, so they cannot disagree.
 *
 * - Chart images: every charted instrument.
 * - Data: free for non-GOES sources; GOES data needs `download_goes_resources`. Only EXIS has a
 *   full-resolution reader in the web today; MAG and SEISS data come later.
 * - SUVI: nothing, by design. Leave it out rather than adding an empty entry.
 */
export const DOWNLOAD_POLICIES: Partial<
  Record<ScientificSourceCode, Partial<Record<ScientificInstrumentCode, InstrumentDownloadPolicy>>>
> = {
  GOES: {
    EXIS: { png: GRAPHIC, csv: GOES_DATA },
    MAG: { png: GRAPHIC },
    SEISS: { png: GRAPHIC },
  },
  ROSAC: {
    'ROSAC-I1': { png: GRAPHIC, csv: OPEN_DATA },
    'ROSAC-I2': { png: GRAPHIC, csv: OPEN_DATA },
  },
}

export type DownloadTarget = Pick<ScientificDataQuery, 'source' | 'product'>

export type DownloadDecision =
  | { status: 'allowed'; instrument: ScientificInstrumentCode }
  | { status: 'forbidden'; instrument: ScientificInstrumentCode; missing: Permission[] }
  | { status: 'unsupported' }

export interface DownloadOption {
  format: DownloadFormat
  label: string
  kind: DownloadFormatDefinition['kind']
  allowed: boolean
}

function instrumentPolicy(target: DownloadTarget) {
  const selection = findScientificProduct(target.source, target.product)
  if (!selection) return null
  const policy = DOWNLOAD_POLICIES[target.source]?.[selection.instrument.code]
  return policy ? { instrument: selection.instrument.code, policy } : null
}

/** Whether `grants` may download `target` as `format`. The one check the server enforces. */
export function decideDownload(
  target: DownloadTarget,
  format: DownloadFormat,
  grants: Iterable<Permission>,
): DownloadDecision {
  const found = instrumentPolicy(target)
  const required = found?.policy[format]
  if (!found || !required) return { status: 'unsupported' }

  const held = new Set(grants)
  const missing = required.filter((permission) => !held.has(permission))
  return missing.length === 0
    ? { status: 'allowed', instrument: found.instrument }
    : { status: 'forbidden', instrument: found.instrument, missing }
}

/** The formats `target` offers, in `DOWNLOAD_FORMATS` order, each marked allowed or not for `grants`. */
export function getDownloadOptions(
  target: DownloadTarget,
  grants: Iterable<Permission>,
): DownloadOption[] {
  const held = [...grants]
  return DOWNLOAD_FORMATS.flatMap((format) => {
    const decision = decideDownload(target, format, held)
    if (decision.status === 'unsupported') return []
    return [
      {
        format,
        label: DOWNLOAD_FORMAT_DEFINITIONS[format].label,
        kind: DOWNLOAD_FORMAT_DEFINITIONS[format].kind,
        allowed: decision.status === 'allowed',
      },
    ]
  })
}
