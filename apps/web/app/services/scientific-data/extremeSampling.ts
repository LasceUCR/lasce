/*
 * Peak-preserving reduction of a time series. A long series is cut into equal stretches by row
 * number; each stretch keeps its lowest and its highest reading, and the first and the last
 * reading are always kept. Nothing is averaged or interpolated, so a short flare between two
 * evenly spaced rows can no longer be skipped.
 *
 * `goesReadingsDataSource` runs the same rule inside InfluxDB (`sampledReadingsSql`), so only the
 * reduced rows cross the wire, and applies `keepExtremes` to what comes back as the guard that
 * enforces the point limit. Keep the two in step.
 */

/** How many stretches a series cut down to `maxPoints` is divided into (two readings each). */
export function extremeBuckets(maxPoints: number) {
  return Math.max(Math.floor((maxPoints - 2) / 2), 1)
}

/** The stretch the `rowNumber`-th reading (1-based, in time order) of `total` falls into. */
export function bucketOf(rowNumber: number, total: number, buckets: number) {
  return Math.floor(((rowNumber - 1) * buckets) / total)
}

/**
 * At most `maxPoints` of `readings` (in time order): all of them when they fit, otherwise the
 * lowest and the highest of each stretch plus the first and the last. Ties go to the earlier
 * reading, as in the SQL.
 */
export function keepExtremes<T extends { value: number }>(
  readings: readonly T[],
  maxPoints: number,
) {
  if (readings.length <= maxPoints) return [...readings]

  const buckets = extremeBuckets(maxPoints)
  const kept = new Set<number>([0, readings.length - 1])
  const lowest = new Map<number, number>()
  const highest = new Map<number, number>()

  readings.forEach((reading, index) => {
    const bucket = bucketOf(index + 1, readings.length, buckets)
    const low = lowest.get(bucket)
    const high = highest.get(bucket)
    if (low === undefined || reading.value < readings[low]!.value) lowest.set(bucket, index)
    if (high === undefined || reading.value > readings[high]!.value) highest.set(bucket, index)
  })
  for (const index of lowest.values()) kept.add(index)
  for (const index of highest.values()) kept.add(index)

  return [...kept].sort((a, b) => a - b).map((index) => readings[index]!)
}
