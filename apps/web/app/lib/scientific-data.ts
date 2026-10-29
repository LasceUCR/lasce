import { z } from 'zod'

import es from '@/messages/es.json' with { type: 'json' }

export const SCIENTIFIC_SOURCE_CODES = ['GOES', 'ROSAC'] as const
export const GOES_PRODUCT_CODES = [
  'SFEU',
  'SFXR',
  'GEOF',
  'EHIS',
  'MPSL',
  'MPSH',
  'SGPS',
  'Fe093',
  'Fe131',
  'Fe171',
  'Fe195',
  'Fe284',
  'He303',
] as const
export const ROSAC_PRODUCT_CODES = ['ROSAC-I1', 'ROSAC-I2'] as const
export const SCIENTIFIC_PRODUCT_CODES = [...GOES_PRODUCT_CODES, ...ROSAC_PRODUCT_CODES] as const
export const SCIENTIFIC_INSTRUMENT_CODES = [
  'EXIS',
  'MAG',
  'SEISS',
  'SUVI',
  'ROSAC-I1',
  'ROSAC-I2',
] as const

export type ScientificSourceCode = (typeof SCIENTIFIC_SOURCE_CODES)[number]
export type ScientificProductCode = (typeof SCIENTIFIC_PRODUCT_CODES)[number]
export type ScientificInstrumentCode = (typeof SCIENTIFIC_INSTRUMENT_CODES)[number]
export type VisualizationKind = 'time-series' | 'image-sequence' | 'dynamic-spectrum'

export interface ScientificParameter {
  code: string
  label: string
  unit: string
}

export interface ScientificProduct {
  code: ScientificProductCode
  name: string
  visualization: VisualizationKind
  available: boolean
  availabilityNote?: string
  wavelength?: string
  parameters: ScientificParameter[]
}

export interface ScientificInstrument {
  code: ScientificInstrumentCode
  name: string
  products: ScientificProduct[]
}

export interface ScientificSource {
  code: ScientificSourceCode
  name: string
  description: string
  dataKind: 'observed' | 'simulated'
  instruments: ScientificInstrument[]
}

export interface ScientificDataQuery {
  source: ScientificSourceCode
  product: ScientificProductCode
  parameter: string
  date: string
  startTime: string
  endTime: string
}

export interface ScientificDataPoint {
  timestamp: string
  value: number
}

export interface ScientificDataOrigin {
  kind: 'observed' | 'simulated'
  provider: string
  notice: string
  satellite?: number
}

interface ScientificDataResultBase {
  query: ScientificDataQuery
  instrument: Pick<ScientificInstrument, 'code' | 'name'>
  product: Pick<ScientificProduct, 'code' | 'name'>
  parameter: ScientificParameter
  origin: ScientificDataOrigin
}

export interface TimeSeriesDataResult extends ScientificDataResultBase {
  visualization: 'time-series'
  points: ScientificDataPoint[]
}

export interface ScientificImage {
  timestamp: string
  imageUrl: string
  alt: string
}

export interface ImageSequenceDataResult extends ScientificDataResultBase {
  visualization: 'image-sequence'
  images: ScientificImage[]
}

export interface DynamicSpectrumCell {
  timestamp: string
  frequency: number
  value: number
}

export interface DynamicSpectrumDataResult extends ScientificDataResultBase {
  visualization: 'dynamic-spectrum'
  frequencyUnit: 'MHz'
  cells: DynamicSpectrumCell[]
  timestamps: string[]
  frequencies: number[]
}

export type ScientificDataResult =
  TimeSeriesDataResult | ImageSequenceDataResult | DynamicSpectrumDataResult

/** The parts of a message catalogue the scientific data page reads. */
export type ScientificDataMessages = Pick<typeof es, 'scientificData'>

const sgpsChannels = [
  'P1',
  'P2A',
  'P2B',
  'P3',
  'P4',
  'P5',
  'P6',
  'P7',
  'P8AF',
  'P8BF',
  'P8CF',
  'P9F',
  'P10',
]

/**
 * The instrument, product and parameter metadata, in the language of `messages`. The structure
 * (codes, which product uses which visualization, availability) stays in this module; only the
 * copy fields are looked up from the catalogue, with a Spanish fallback at every level — the same
 * "safe fallback" pattern `getRosacInstrumentsContent` uses.
 */
export function getScientificSources(messages: ScientificDataMessages): ScientificSource[] {
  const sd = messages?.scientificData ?? es.scientificData
  const sources = sd?.sources ?? es.scientificData.sources
  const instruments = sd?.instruments ?? es.scientificData.instruments
  const parameters = sd?.parameters ?? es.scientificData.parameters
  const units = sd?.units ?? es.scientificData.units

  const wPerM2 = units?.wPerM2 ?? es.scientificData.units.wPerM2
  const index = units?.index ?? es.scientificData.units.index
  const nanotesla = units?.nanotesla ?? es.scientificData.units.nanotesla
  const particles = units?.particles ?? es.scientificData.units.particles
  const relativeIntensity = units?.relativeIntensity ?? es.scientificData.units.relativeIntensity
  const pfu = units?.pfu ?? es.scientificData.units.pfu
  const protonUnit = units?.protonUnit ?? es.scientificData.units.protonUnit
  const imageUnit = units?.image ?? es.scientificData.units.image
  const ehisUnit = units?.ehisUnit ?? es.scientificData.units.ehisUnit

  const xray = parameters?.xray ?? es.scientificData.parameters.xray
  const xrayParameters: ScientificParameter[] = [
    {
      code: '0.05-0.4nm',
      label: xray?.shortBand ?? es.scientificData.parameters.xray.shortBand,
      unit: wPerM2,
    },
    {
      code: '0.1-0.8nm',
      label: xray?.longBand ?? es.scientificData.parameters.xray.longBand,
      unit: wPerM2,
    },
  ]

  const euv = parameters?.euv ?? es.scientificData.parameters.euv
  const euvParameters: ScientificParameter[] = [
    {
      code: '1175',
      label: euv?.line1175 ?? es.scientificData.parameters.euv.line1175,
      unit: wPerM2,
    },
    {
      code: '1216',
      label: euv?.line1216 ?? es.scientificData.parameters.euv.line1216,
      unit: wPerM2,
    },
    {
      code: '1335',
      label: euv?.line1335 ?? es.scientificData.parameters.euv.line1335,
      unit: wPerM2,
    },
    {
      code: '1405',
      label: euv?.line1405 ?? es.scientificData.parameters.euv.line1405,
      unit: wPerM2,
    },
    { code: '256', label: euv?.line256 ?? es.scientificData.parameters.euv.line256, unit: wPerM2 },
    { code: '284', label: euv?.line284 ?? es.scientificData.parameters.euv.line284, unit: wPerM2 },
    { code: '304', label: euv?.line304 ?? es.scientificData.parameters.euv.line304, unit: wPerM2 },
    {
      code: 'mgii_index',
      label: euv?.mgiiIndex ?? es.scientificData.parameters.euv.mgiiIndex,
      unit: index,
    },
  ]

  const magnetic = parameters?.magnetic ?? es.scientificData.parameters.magnetic
  const magneticParameters: ScientificParameter[] = [
    {
      code: 'EPN-x',
      label: magnetic?.x ?? es.scientificData.parameters.magnetic.x,
      unit: nanotesla,
    },
    {
      code: 'EPN-y',
      label: magnetic?.y ?? es.scientificData.parameters.magnetic.y,
      unit: nanotesla,
    },
    {
      code: 'EPN-z',
      label: magnetic?.z ?? es.scientificData.parameters.magnetic.z,
      unit: nanotesla,
    },
    {
      code: 'total',
      label: magnetic?.total ?? es.scientificData.parameters.magnetic.total,
      unit: nanotesla,
    },
  ]

  const mpsh = parameters?.mpsh ?? es.scientificData.parameters.mpsh
  const mpshLabelTemplate = mpsh?.label ?? es.scientificData.parameters.mpsh.label
  const mpshSpecies = {
    electron: mpsh?.electron ?? es.scientificData.parameters.mpsh.electron,
    proton: mpsh?.proton ?? es.scientificData.parameters.mpsh.proton,
  }
  const mpshParameters: ScientificParameter[] = (['electron', 'proton'] as const).flatMap(
    (species) =>
      Array.from({ length: 5 }, (_, telescope) =>
        Array.from({ length: species === 'electron' ? 10 : 11 }, (_, band) => ({
          code: `${species}:T${telescope + 1}:E${band + 1}`,
          label: mpshLabelTemplate
            .replace('{species}', mpshSpecies[species])
            .replace('{telescope}', String(telescope + 1))
            .replace('{band}', String(band + 1)),
          unit: particles,
        })),
      ).flat(),
  )

  const ehis = parameters?.ehis ?? es.scientificData.parameters.ehis
  const ehisLabelTemplate = ehis?.label ?? es.scientificData.parameters.ehis.label
  const ehisGroups = ['H', 'He', 'CNO', 'NeS', 'ClNi'] as const
  const ehisParameters: ScientificParameter[] = ehisGroups.flatMap((group) =>
    Array.from({ length: 5 }, (_, band) => ({
      code: `${group}:E${band + 1}`,
      label: ehisLabelTemplate
        .replace(
          '{group}',
          ehis?.groups?.[group] ?? es.scientificData.parameters.ehis.groups[group],
        )
        .replace('{band}', String(band + 1)),
      unit: ehisUnit,
    })),
  )

  const sgps = parameters?.sgps ?? es.scientificData.parameters.sgps
  const sgpsLabelTemplate = sgps?.label ?? es.scientificData.parameters.sgps.label
  const sgpsIntegral = sgps?.integral ?? es.scientificData.parameters.sgps.integral
  const sgpsDifferentialTemplate =
    sgps?.differential ?? es.scientificData.parameters.sgps.differential
  const sgpsParameters: ScientificParameter[] = (['minus', 'plus'] as const).flatMap((sensor) =>
    [...sgpsChannels, 'P11'].map((channel) => ({
      code: `${sensor}:${channel}`,
      label: sgpsLabelTemplate
        .replace('{sign}', sensor === 'minus' ? '−' : '+')
        .replace(
          '{value}',
          channel === 'P11' ? sgpsIntegral : sgpsDifferentialTemplate.replace('{channel}', channel),
        ),
      unit: channel === 'P11' ? pfu : protonUnit,
    })),
  )

  const exis = instruments?.exis ?? es.scientificData.instruments.exis
  const mag = instruments?.mag ?? es.scientificData.instruments.mag
  const seiss = instruments?.seiss ?? es.scientificData.instruments.seiss
  const suvi = instruments?.suvi ?? es.scientificData.instruments.suvi
  const rosacI1 = instruments?.rosacI1 ?? es.scientificData.instruments.rosacI1
  const rosacI2 = instruments?.rosacI2 ?? es.scientificData.instruments.rosacI2
  const unavailableFromRollingApi =
    seiss?.unavailableNote ?? es.scientificData.instruments.seiss.unavailableNote
  const image = parameters?.image ?? es.scientificData.parameters.image
  const simulatedIntensity =
    parameters?.simulatedIntensity ?? es.scientificData.parameters.simulatedIntensity
  const simulatedSpectrum =
    parameters?.simulatedSpectrum ?? es.scientificData.parameters.simulatedSpectrum

  const goesInstruments: ScientificInstrument[] = [
    {
      code: 'EXIS',
      name: exis?.name ?? es.scientificData.instruments.exis.name,
      products: [
        {
          code: 'SFEU',
          name: exis?.products?.sfeu?.name ?? es.scientificData.instruments.exis.products.sfeu.name,
          visualization: 'time-series',
          available: true,
          parameters: euvParameters,
        },
        {
          code: 'SFXR',
          name: exis?.products?.sfxr?.name ?? es.scientificData.instruments.exis.products.sfxr.name,
          visualization: 'time-series',
          available: true,
          parameters: xrayParameters,
        },
      ],
    },
    {
      code: 'MAG',
      name: mag?.name ?? es.scientificData.instruments.mag.name,
      products: [
        {
          code: 'GEOF',
          name: mag?.products?.geof?.name ?? es.scientificData.instruments.mag.products.geof.name,
          visualization: 'time-series',
          available: true,
          parameters: magneticParameters,
        },
      ],
    },
    {
      code: 'SEISS',
      name: seiss?.name ?? es.scientificData.instruments.seiss.name,
      products: [
        {
          code: 'EHIS',
          name:
            seiss?.products?.ehis?.name ?? es.scientificData.instruments.seiss.products.ehis.name,
          visualization: 'time-series',
          available: true,
          availabilityNote:
            seiss?.products?.ehis?.availabilityNote ??
            es.scientificData.instruments.seiss.products.ehis.availabilityNote,
          parameters: ehisParameters,
        },
        {
          code: 'MPSL',
          name:
            seiss?.products?.mpsl?.name ?? es.scientificData.instruments.seiss.products.mpsl.name,
          visualization: 'time-series',
          available: false,
          availabilityNote: unavailableFromRollingApi,
          parameters: [],
        },
        {
          code: 'MPSH',
          name:
            seiss?.products?.mpsh?.name ?? es.scientificData.instruments.seiss.products.mpsh.name,
          visualization: 'time-series',
          available: true,
          availabilityNote:
            seiss?.products?.mpsh?.availabilityNote ??
            es.scientificData.instruments.seiss.products.mpsh.availabilityNote,
          parameters: mpshParameters,
        },
        {
          code: 'SGPS',
          name:
            seiss?.products?.sgps?.name ?? es.scientificData.instruments.seiss.products.sgps.name,
          visualization: 'time-series',
          available: true,
          availabilityNote:
            seiss?.products?.sgps?.availabilityNote ??
            es.scientificData.instruments.seiss.products.sgps.availabilityNote,
          parameters: sgpsParameters,
        },
      ],
    },
    {
      code: 'SUVI',
      name: suvi?.name ?? es.scientificData.instruments.suvi.name,
      products: [
        { code: 'Fe093', wavelength: '94 Å' },
        { code: 'Fe131', wavelength: '131 Å' },
        { code: 'Fe171', wavelength: '171 Å' },
        { code: 'Fe195', wavelength: '195 Å' },
        { code: 'Fe284', wavelength: '284 Å' },
        { code: 'He303', wavelength: '304 Å' },
      ].map(({ code, wavelength }) => ({
        code: code as ScientificProductCode,
        name: (suvi?.imageProductName ?? es.scientificData.instruments.suvi.imageProductName)
          .replace('{wavelength}', wavelength)
          .replace('{code}', code),
        wavelength,
        visualization: 'image-sequence' as const,
        available: true,
        parameters: [{ code: 'image', label: image, unit: imageUnit }],
      })),
    },
  ]

  const rosacInstruments: ScientificInstrument[] = [
    {
      code: 'ROSAC-I1',
      name: rosacI1?.name ?? es.scientificData.instruments.rosacI1.name,
      products: [
        {
          code: 'ROSAC-I1',
          name:
            rosacI1?.products?.timeSeries?.name ??
            es.scientificData.instruments.rosacI1.products.timeSeries.name,
          visualization: 'time-series',
          available: true,
          parameters: [
            {
              code: 'simulated-intensity',
              label: simulatedIntensity,
              unit: relativeIntensity,
            },
          ],
        },
      ],
    },
    {
      code: 'ROSAC-I2',
      name: rosacI2?.name ?? es.scientificData.instruments.rosacI2.name,
      products: [
        {
          code: 'ROSAC-I2',
          name:
            rosacI2?.products?.dynamicSpectrum?.name ??
            es.scientificData.instruments.rosacI2.products.dynamicSpectrum.name,
          visualization: 'dynamic-spectrum',
          available: true,
          parameters: [
            {
              code: 'simulated-spectrum',
              label: simulatedSpectrum,
              unit: relativeIntensity,
            },
          ],
        },
      ],
    },
  ]

  const goes = sources?.goes ?? es.scientificData.sources.goes
  const rosac = sources?.rosac ?? es.scientificData.sources.rosac

  return [
    {
      code: 'GOES',
      name: goes?.name ?? es.scientificData.sources.goes.name,
      description: goes?.description ?? es.scientificData.sources.goes.description,
      dataKind: 'observed',
      instruments: goesInstruments,
    },
    {
      code: 'ROSAC',
      name: rosac?.name ?? es.scientificData.sources.rosac.name,
      description: rosac?.description ?? es.scientificData.sources.rosac.description,
      dataKind: 'simulated',
      instruments: rosacInstruments,
    },
  ]
}

/** Spanish, for stories, tests and the fixtures that structural consumers (codes only) read. */
export const scientificSources: ScientificSource[] = getScientificSources(es)
export const goesInstruments: ScientificInstrument[] = scientificSources[0]!.instruments
export const rosacInstruments: ScientificInstrument[] = scientificSources[1]!.instruments

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/

function isCalendarDate(value: string) {
  if (!isoDatePattern.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year!, month! - 1, day))

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day
  )
}

/**
 * Looks a product up in `sources`, which defaults to the Spanish catalogue. A client component
 * passes the sources it received for the visitor's language so the copy it shows matches.
 */
export function findScientificProduct(
  sourceCode: ScientificSourceCode,
  productCode: ScientificProductCode,
  sources: readonly ScientificSource[] = scientificSources,
) {
  const source = sources.find((candidate) => candidate.code === sourceCode)
  if (!source) return null

  for (const instrument of source.instruments) {
    const product = instrument.products.find((candidate) => candidate.code === productCode)
    if (product) return { source, instrument, product }
  }

  return null
}

export function getDefaultQueryForSource(
  source: ScientificSource,
  date: string,
): ScientificDataQuery {
  const product = source.instruments
    .flatMap((instrument) => instrument.products)
    .find((item) => item.available)!

  return {
    source: source.code,
    product: product.code,
    parameter: product.parameters[0]!.code,
    date,
    startTime: '00:00',
    endTime: '23:59',
  }
}

/** The parts of a message catalogue the query form's own validation reads. */
export type ScientificDataValidationMessages = Pick<
  typeof es.scientificData.validation,
  | 'invalidSource'
  | 'invalidProduct'
  | 'invalidParameter'
  | 'invalidDate'
  | 'invalidStartTime'
  | 'invalidEndTime'
  | 'startBeforeEnd'
  | 'productUnavailable'
  | 'invalidParameterForProduct'
>

/**
 * Builds the query schema with its validation messages in `messages`' language. `ScientificDataExplorer`
 * builds one from `useTranslations('scientificData.validation')` for the message a visitor sees before
 * submitting; `scientificDataQuerySchema` below is the Spanish default other, request-less call sites use.
 */
export function getScientificDataQuerySchema(messages: ScientificDataValidationMessages) {
  return z
    .object({
      source: z.enum(SCIENTIFIC_SOURCE_CODES, { error: messages.invalidSource }),
      product: z.enum(SCIENTIFIC_PRODUCT_CODES, { error: messages.invalidProduct }),
      parameter: z.string().min(1, messages.invalidParameter),
      date: z.string().refine(isCalendarDate, messages.invalidDate),
      startTime: z.string().regex(timePattern, messages.invalidStartTime),
      endTime: z.string().regex(timePattern, messages.invalidEndTime),
    })
    .superRefine((query, context) => {
      if (
        timePattern.test(query.startTime) &&
        timePattern.test(query.endTime) &&
        query.startTime >= query.endTime
      ) {
        context.addIssue({
          code: 'custom',
          message: messages.startBeforeEnd,
          path: ['endTime'],
        })
      }

      const selection = findScientificProduct(query.source, query.product)
      if (!selection || !selection.product.available) {
        context.addIssue({
          code: 'custom',
          message: messages.productUnavailable,
          path: ['product'],
        })
        return
      }

      if (!selection.product.parameters.some((parameter) => parameter.code === query.parameter)) {
        context.addIssue({
          code: 'custom',
          message: messages.invalidParameterForProduct,
          path: ['parameter'],
        })
      }
    })
}

export const scientificDataQuerySchema = getScientificDataQuerySchema(es.scientificData.validation)

const scientificParameterSchema = z.object({
  code: z.string(),
  label: z.string(),
  unit: z.string(),
})
const scientificOriginSchema = z.object({
  kind: z.enum(['observed', 'simulated']),
  provider: z.string(),
  notice: z.string(),
  satellite: z.number().int().optional(),
})
/** An absolute URL, or a same-origin path such as `/api/suvi/frames/<id>` (never `//host`). */
const imageUrlSchema = z
  .string()
  .refine((value) => /^\/(?!\/)/.test(value) || URL.canParse(value), 'Invalid image URL')
const scientificResultBaseSchema = z.object({
  query: scientificDataQuerySchema,
  instrument: z.object({ code: z.enum(SCIENTIFIC_INSTRUMENT_CODES), name: z.string() }),
  product: z.object({ code: z.enum(SCIENTIFIC_PRODUCT_CODES), name: z.string() }),
  parameter: scientificParameterSchema,
  origin: scientificOriginSchema,
})

export const scientificDataResultSchema: z.ZodType<ScientificDataResult> = z.discriminatedUnion(
  'visualization',
  [
    scientificResultBaseSchema.extend({
      visualization: z.literal('time-series'),
      points: z.array(z.object({ timestamp: z.string(), value: z.number().finite() })),
    }),
    scientificResultBaseSchema.extend({
      visualization: z.literal('image-sequence'),
      images: z.array(
        z.object({ timestamp: z.string(), imageUrl: imageUrlSchema, alt: z.string() }),
      ),
    }),
    scientificResultBaseSchema.extend({
      visualization: z.literal('dynamic-spectrum'),
      frequencyUnit: z.literal('MHz'),
      cells: z.array(
        z.object({ timestamp: z.string(), frequency: z.number(), value: z.number().finite() }),
      ),
      timestamps: z.array(z.string()),
      frequencies: z.array(z.number()),
    }),
  ],
)
