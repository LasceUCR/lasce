import { z } from 'zod'

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

export type ScientificSourceCode = (typeof SCIENTIFIC_SOURCE_CODES)[number]
export type ScientificProductCode = (typeof SCIENTIFIC_PRODUCT_CODES)[number]
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
  parameters: ScientificParameter[]
}

export interface ScientificInstrument {
  code: string
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

const xrayParameters: ScientificParameter[] = [
  { code: '0.05-0.4nm', label: 'Banda corta (0,05–0,4 nm)', unit: 'W/m²' },
  { code: '0.1-0.8nm', label: 'Banda larga (0,1–0,8 nm)', unit: 'W/m²' },
]

const euvParameters: ScientificParameter[] = [
  { code: '1175', label: 'Línea 117,5 nm', unit: 'W/m²' },
  { code: '1216', label: 'Línea 121,6 nm', unit: 'W/m²' },
  { code: '1335', label: 'Línea 133,5 nm', unit: 'W/m²' },
  { code: '1405', label: 'Línea 140,5 nm', unit: 'W/m²' },
  { code: '256', label: 'Línea 25,6 nm', unit: 'W/m²' },
  { code: '284', label: 'Línea 28,4 nm', unit: 'W/m²' },
  { code: '304', label: 'Línea 30,4 nm', unit: 'W/m²' },
  { code: 'mgii_index', label: 'Índice Mg II', unit: 'índice' },
]

const magneticParameters: ScientificParameter[] = [
  { code: 'Hp', label: 'Componente Hp', unit: 'nT' },
  { code: 'He', label: 'Componente He', unit: 'nT' },
  { code: 'Hn', label: 'Componente Hn', unit: 'nT' },
  { code: 'total', label: 'Magnitud total', unit: 'nT' },
]

const electronParameters = [
  '79',
  '134',
  '186',
  '271',
  '378',
  '548',
  '865',
  '1509',
  '2205',
  '2894',
].map((energy) => ({
  code: `electron:${energy} keV`,
  label: `Electrones: ${energy} keV`,
  unit: 'partículas/(cm²·s·sr·keV)',
}))

const protonParameters: ScientificParameter[] = [
  'P1',
  'P2A',
  'P2B',
  'P3',
  'P4',
  'P5',
  'P6',
  'P7',
  'P8A',
  'P8B',
  'P8C',
  'P9',
  'P10',
].map((channel) => ({
  code: `proton:${channel}`,
  label: `Protones: canal ${channel} (diferencial)`,
  unit: 'protones/(cm²·s·sr·keV)',
}))

const integralProtonParameters = ['1', '5', '10', '30', '50', '60', '100', '500'].map((energy) => ({
  code: `>=${energy} MeV`,
  label: `Energía ≥ ${energy} MeV`,
  unit: 'pfu',
}))

const unavailableFromRollingApi =
  'Este producto requiere integrar y validar los archivos científicos NetCDF de NOAA.'

export const goesInstruments: ScientificInstrument[] = [
  {
    code: 'EXIS',
    name: 'Sensores de irradiancia ultravioleta extrema y rayos X',
    products: [
      {
        code: 'SFEU',
        name: 'Flujo solar: EUV',
        visualization: 'time-series',
        available: true,
        parameters: euvParameters,
      },
      {
        code: 'SFXR',
        name: 'Flujo solar: rayos X',
        visualization: 'time-series',
        available: true,
        parameters: xrayParameters,
      },
    ],
  },
  {
    code: 'MAG',
    name: 'Magnetómetro',
    products: [
      {
        code: 'GEOF',
        name: 'Campo geomagnético',
        visualization: 'time-series',
        available: true,
        parameters: magneticParameters,
      },
    ],
  },
  {
    code: 'SEISS',
    name: 'Suite ambiental espacial in situ',
    products: [
      {
        code: 'EHIS',
        name: 'Iones pesados energéticos',
        visualization: 'time-series',
        available: false,
        availabilityNote: unavailableFromRollingApi,
        parameters: [],
      },
      {
        code: 'MPSL',
        name: 'Electrones y protones magnetosféricos: baja energía',
        visualization: 'time-series',
        available: false,
        availabilityNote: unavailableFromRollingApi,
        parameters: [],
      },
      {
        code: 'MPSH',
        name: 'Electrones y protones magnetosféricos: energía media y alta',
        visualization: 'time-series',
        available: true,
        availabilityNote:
          'Esta consulta ofrece los canales de electrones. Los protones MPS-HI requieren integrar el archivo científico.',
        parameters: electronParameters,
      },
      {
        code: 'SGPS',
        name: 'Protones solares y galácticos',
        visualization: 'time-series',
        available: true,
        parameters: [...integralProtonParameters, ...protonParameters],
      },
    ],
  },
  {
    code: 'SUVI',
    name: 'Generador de imágenes solares ultravioleta',
    products: [
      { code: 'Fe093', name: 'Imágenes solares: 94 Å (Fe093)' },
      { code: 'Fe131', name: 'Imágenes solares: 131 Å (Fe131)' },
      { code: 'Fe171', name: 'Imágenes solares: 171 Å (Fe171)' },
      { code: 'Fe195', name: 'Imágenes solares: 195 Å (Fe195)' },
      { code: 'Fe284', name: 'Imágenes solares: 284 Å (Fe284)' },
      { code: 'He303', name: 'Imágenes solares: 304 Å (He303)' },
    ].map(({ code, name }) => ({
      code: code as ScientificProductCode,
      name,
      visualization: 'image-sequence' as const,
      available: true,
      parameters: [{ code: 'image', label: 'Imagen calibrada', unit: 'imagen' }],
    })),
  },
]

export const rosacInstruments: ScientificInstrument[] = [
  {
    code: 'ROSAC-I1',
    name: 'Instrumento 1 (por definir)',
    products: [
      {
        code: 'ROSAC-I1',
        name: 'Serie temporal de prueba',
        visualization: 'time-series',
        available: true,
        parameters: [
          {
            code: 'simulated-intensity',
            label: 'Intensidad simulada',
            unit: 'intensidad relativa',
          },
        ],
      },
    ],
  },
  {
    code: 'ROSAC-I2',
    name: 'Instrumento 2 (por definir)',
    products: [
      {
        code: 'ROSAC-I2',
        name: 'Espectro dinámico de prueba',
        visualization: 'dynamic-spectrum',
        available: true,
        parameters: [
          {
            code: 'simulated-spectrum',
            label: 'Intensidad espectral simulada',
            unit: 'intensidad relativa',
          },
        ],
      },
    ],
  },
]

export const scientificSources: ScientificSource[] = [
  {
    code: 'GOES',
    name: 'GOES — NOAA',
    description: 'Observaciones públicas de los satélites operativos de NOAA.',
    dataKind: 'observed',
    instruments: goesInstruments,
  },
  {
    code: 'ROSAC',
    name: 'ROSAC — UCR',
    description: 'Previsión de la futura fuente ROSAC; sus instrumentos aún están por definir.',
    dataKind: 'simulated',
    instruments: rosacInstruments,
  },
]

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

export function findScientificProduct(
  sourceCode: ScientificSourceCode,
  productCode: ScientificProductCode,
) {
  const source = scientificSources.find((candidate) => candidate.code === sourceCode)
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

export const scientificDataQuerySchema = z
  .object({
    source: z.enum(SCIENTIFIC_SOURCE_CODES, { error: 'Seleccione una fuente válida.' }),
    product: z.enum(SCIENTIFIC_PRODUCT_CODES, {
      error: 'Seleccione un producto científico válido.',
    }),
    parameter: z.string().min(1, 'Seleccione un canal o parámetro.'),
    date: z
      .string()
      .refine(isCalendarDate, 'Seleccione una fecha válida con el formato AAAA-MM-DD.'),
    startTime: z
      .string()
      .regex(timePattern, 'Seleccione una hora de inicio válida con el formato HH:mm.'),
    endTime: z
      .string()
      .regex(timePattern, 'Seleccione una hora de fin válida con el formato HH:mm.'),
  })
  .superRefine((query, context) => {
    if (
      timePattern.test(query.startTime) &&
      timePattern.test(query.endTime) &&
      query.startTime >= query.endTime
    ) {
      context.addIssue({
        code: 'custom',
        message: 'La hora de inicio debe ser anterior a la hora de fin.',
        path: ['endTime'],
      })
    }

    const selection = findScientificProduct(query.source, query.product)
    if (!selection || !selection.product.available) {
      context.addIssue({
        code: 'custom',
        message: 'El producto seleccionado todavía no está disponible para esta fuente.',
        path: ['product'],
      })
      return
    }

    if (!selection.product.parameters.some((parameter) => parameter.code === query.parameter)) {
      context.addIssue({
        code: 'custom',
        message: 'Seleccione un canal o parámetro válido para el producto.',
        path: ['parameter'],
      })
    }
  })

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
const scientificResultBaseSchema = z.object({
  query: scientificDataQuerySchema,
  instrument: z.object({ code: z.string(), name: z.string() }),
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
        z.object({ timestamp: z.string(), imageUrl: z.string().url(), alt: z.string() }),
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
