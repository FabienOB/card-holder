export const BARCODE_FORMATS = [
  'EAN_13',
  'EAN_8',
  'CODE_128',
  'CODE_39',
  'ITF',
  'CODABAR',
  'QR_CODE',
  'DATA_MATRIX',
] as const

export type BarcodeFormat = (typeof BARCODE_FORMATS)[number]

export interface LoyaltyCard {
  id: string
  name: string
  code: string
  format: BarcodeFormat
  imageBlob?: Blob
  logoId?: string
  color: string
  notes?: string
  createdAt: number
  lastUsedAt?: number
  usageCount: number
}

export type SortMode = 'recent' | 'alpha' | 'created'

/** 2D symbologies are square and must never be stretched. */
export const TWO_D_FORMATS: ReadonlySet<BarcodeFormat> = new Set<BarcodeFormat>(['QR_CODE', 'DATA_MATRIX'])

export function is2D(format: BarcodeFormat): boolean {
  return TWO_D_FORMATS.has(format)
}

export const FORMAT_LABELS: Record<BarcodeFormat, string> = {
  EAN_13: 'EAN-13',
  EAN_8: 'EAN-8',
  CODE_128: 'Code 128',
  CODE_39: 'Code 39',
  ITF: 'ITF (entrelacé 2/5)',
  CODABAR: 'Codabar',
  QR_CODE: 'QR Code',
  DATA_MATRIX: 'Data Matrix',
}
