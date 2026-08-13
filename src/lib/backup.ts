import { base64ToBlob, blobToBase64 } from './image'
import { BARCODE_FORMATS, type BarcodeFormat, type LoyaltyCard } from '../types'
import { DEFAULT_COLOR, isValidHex } from './colors'

export const BACKUP_FORMAT = 'card-holder-backup'
export const BACKUP_VERSION = 1

interface BackupCard {
  id: string
  name: string
  code: string
  format: string
  color: string
  notes?: string
  logoId?: string
  createdAt: number
  lastUsedAt?: number
  usageCount: number
  /** Image encodée en base64 **uniquement à l'export**. */
  image?: { mime: string; data: string }
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: number
  cards: BackupCard[]
}

/**
 * Sérialise toute la base en un JSON unique. C'est ici, et seulement ici,
 * que les Blob passent en base64 : le stockage local reste binaire.
 */
export async function buildBackup(cards: LoyaltyCard[]): Promise<BackupFile> {
  const serialized: BackupCard[] = []
  for (const card of cards) {
    serialized.push({
      id: card.id,
      name: card.name,
      code: card.code,
      format: card.format,
      color: card.color,
      notes: card.notes,
      logoId: card.logoId,
      createdAt: card.createdAt,
      lastUsedAt: card.lastUsedAt,
      usageCount: card.usageCount,
      image: card.imageBlob
        ? { mime: card.imageBlob.type || 'image/jpeg', data: await blobToBase64(card.imageBlob) }
        : undefined,
    })
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    cards: serialized,
  }
}

/** Déclenche le téléchargement du fichier de sauvegarde. */
export function downloadBackup(backup: BackupFile): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const stamp = new Date(backup.exportedAt).toISOString().slice(0, 10)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `cartes-fidelite-${stamp}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Laisse au navigateur le temps de démarrer le téléchargement.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export class BackupParseError extends Error {}

const FORMAT_SET = new Set<string>(BARCODE_FORMATS)

/**
 * Analyse un fichier importé sans jamais faire confiance à son contenu :
 * chaque champ est validé, les cartes invalides sont écartées et comptées.
 */
export function parseBackup(raw: string): { cards: LoyaltyCard[]; skipped: number; exportedAt?: number } {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new BackupParseError("Ce fichier n'est pas un JSON valide.")
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new BackupParseError('Fichier de sauvegarde illisible.')
  }
  const file = parsed as Partial<BackupFile>
  if (file.format !== BACKUP_FORMAT) {
    throw new BackupParseError("Ce fichier n'est pas une sauvegarde de cette application.")
  }
  if (!Array.isArray(file.cards)) {
    throw new BackupParseError('Le fichier ne contient aucune liste de cartes.')
  }

  const cards: LoyaltyCard[] = []
  let skipped = 0

  for (const entry of file.cards) {
    const card = toCard(entry)
    if (card) cards.push(card)
    else skipped++
  }

  return { cards, skipped, exportedAt: typeof file.exportedAt === 'number' ? file.exportedAt : undefined }
}

function toCard(entry: unknown): LoyaltyCard | null {
  if (!entry || typeof entry !== 'object') return null
  const c = entry as Partial<BackupCard>

  if (typeof c.id !== 'string' || !c.id) return null
  if (typeof c.name !== 'string' || !c.name.trim()) return null
  if (typeof c.format !== 'string' || !FORMAT_SET.has(c.format)) return null

  let imageBlob: Blob | undefined
  if (c.image && typeof c.image.data === 'string') {
    try {
      imageBlob = base64ToBlob(c.image.data, c.image.mime || 'image/jpeg')
    } catch {
      // Image corrompue : on garde la carte, on perd la photo.
      imageBlob = undefined
    }
  }

  return {
    id: c.id,
    name: c.name.trim(),
    code: typeof c.code === 'string' ? c.code : '',
    format: c.format as BarcodeFormat,
    color: typeof c.color === 'string' && isValidHex(c.color) ? c.color : DEFAULT_COLOR,
    notes: typeof c.notes === 'string' && c.notes.trim() ? c.notes : undefined,
    logoId: typeof c.logoId === 'string' ? c.logoId : undefined,
    imageBlob,
    createdAt: typeof c.createdAt === 'number' ? c.createdAt : Date.now(),
    lastUsedAt: typeof c.lastUsedAt === 'number' ? c.lastUsedAt : undefined,
    usageCount: typeof c.usageCount === 'number' ? c.usageCount : 0,
  }
}
