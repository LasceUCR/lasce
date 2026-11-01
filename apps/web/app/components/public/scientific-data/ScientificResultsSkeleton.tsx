import { Skeleton } from '@/app/components/public/skeleton/Skeleton'
import { SkeletonChart } from '@/app/components/public/skeleton/SkeletonChart'
import { SkeletonImageCard } from '@/app/components/public/skeleton/SkeletonImageCard'
import type { VisualizationKind } from '@/app/lib/scientific-data'

/**
 * Placeholder images while a SUVI query runs: one full row of the result grid on a desktop (four
 * columns), two by two on a tablet, and not an endless column on a phone.
 */
export const RESULT_IMAGE_PLACEHOLDERS = 4

/** Metadata tiles of a result: instrument, wavelength or channel, date, interval and source. */
const METADATA_TILES = 5

export interface ScientificResultsSkeletonProps {
  /** The visualization the query will return, from the selected product. */
  visualization: VisualizationKind
}

/**
 * The results card of `ScientificDataExplorer` while a query runs, box for box: the heading, the
 * metadata tiles (`.data-metadata`) and the result itself, which takes the shape of the product
 * asked for — summary tiles and a chart for a time series, a chart for a dynamic spectrum, an
 * image grid for SUVI. Render it inside `LoadingRegion`, which hides it from assistive technology.
 */
export function ScientificResultsSkeleton({ visualization }: ScientificResultsSkeletonProps) {
  return (
    <div className="data-results" data-visualization={visualization}>
      <div className="data-section-heading">
        <div style={{ width: 'min(100%, 22rem)' }}>
          <Skeleton shape="text" width="7rem" />
          <Skeleton height="1.4rem" width="100%" />
        </div>
      </div>

      <div className="data-metadata">
        {Array.from({ length: METADATA_TILES }, (_, index) => (
          <div key={index}>
            <Skeleton shape="text" width="50%" />
            <Skeleton shape="text" width="80%" />
          </div>
        ))}
      </div>

      {visualization === 'image-sequence' ? (
        <ul className="data-image-grid">
          {Array.from({ length: RESULT_IMAGE_PLACEHOLDERS }, (_, index) => (
            <li key={index}>
              <SkeletonImageCard />
            </li>
          ))}
        </ul>
      ) : (
        <SkeletonChart summaryTiles={visualization === 'time-series' ? 3 : 0} />
      )}
    </div>
  )
}
