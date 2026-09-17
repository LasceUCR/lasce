const NOAA_ORIGIN = 'https://services.swpc.noaa.gov'

/** NOAA's rolling SUVI 195 Å animation feed — the only source with per-frame timestamps. */
export const SUVI_195_ANIMATION_FEED_URL = `${NOAA_ORIGIN}/products/animations/suvi-primary-195.json`

// SUVI filenames embed their observation window, e.g.
// "or_suvi-l2-ci195_g19_s20260915T184000Z_e20260915T184400Z_v1-0-2.png".
// The feed itself carries no separate timestamp field, so the filename is the
// only source of truth for when a frame was captured.
const FRAME_TIMESTAMP_PATTERN = /_s(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z_/

export interface SuviObservationTimestamp {
  /** Machine-readable UTC instant, for a `<time dateTime>` attribute. */
  iso: string
  /** Human-readable UTC instant, e.g. "2026-09-15 18:40 UTC". */
  label: string
}

/** Resolves a feed frame's `url` (relative or absolute) against the NOAA origin. */
export function resolveSuviFrameUrl(rawUrl: string): string {
  return new URL(rawUrl, NOAA_ORIGIN).toString()
}

/** Reads the observation timestamp embedded in a SUVI frame filename, if present. */
export function getSuviObservationTimestamp(url: string): SuviObservationTimestamp | null {
  const match = FRAME_TIMESTAMP_PATTERN.exec(url)

  if (!match) {
    return null
  }

  const [, year, month, day, hour, minute] = match

  return {
    iso: `${year}-${month}-${day}T${hour}:${minute}:00Z`,
    label: `${year}-${month}-${day} ${hour}:${minute} UTC`,
  }
}
