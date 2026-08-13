import { base64ToBlob, blobToBase64 } from './image'
import {
  BARCODE_FORMATS,
  DEFAULT_CATEGORY,
  isCardCategory,
  type BarcodeFormat,
  type CardCategory,
  type LoyaltyCard,
} from '../types'
import { DEFAULT_COLOR, isValidHex } from './colors'

export const BACKUP_FORMAT = 'card-holder-backup'
export const BACKUP_VERSION = 1

interface BackupCard {
  id: string
  name: string
  code: string
  format: string
  category: string
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
      category: card.category,
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

function serializeBackup(backup: BackupFile): { blob: Blob; filename: string } {
  const stamp = new Date(backup.exportedAt).toISOString().slice(0, 10)
  return {
    blob: new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
    filename: `cartes-fidelite-${stamp}.json`,
  }
}

/** Déclenche le téléchargement du fichier de sauvegarde. */
export function downloadBackup(backup: BackupFile): void {
  const { blob, filename } = serializeBackup(backup)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Laisse au navigateur le temps de démarrer le téléchargement.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export type ShareOutcome = 'shared' | 'cancelled' | 'downloaded'

/**
 * Le partage de *fichiers* est plus restreint que `navigator.share` seul :
 * on teste les deux, puis `canShare({ files })` avec le fichier réel, car
 * certains navigateurs acceptent le partage de texte mais pas de fichiers.
 */
export function canShareFiles(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare
}

/**
 * Envoie la sauvegarde vers une autre application (WhatsApp, Drive, un autre
 * téléphone…) via la feuille de partage Android, en un seul geste.
 *
 * Deux points d'attention :
 *
 *  - `navigator.share` exige une **activation utilisateur récente**. La
 *    sérialisation (encodage base64 des photos) doit donc rester courte ;
 *    si l'activation a malgré tout expiré, l'appel lève `NotAllowedError`
 *    et on retombe sur le téléchargement classique.
 *  - Une annulation par l'utilisateur lève `AbortError`. Ce n'est pas une
 *    erreur : on ne déclenche surtout pas un téléchargement qu'il n'a pas
 *    demandé, on ne fait rien.
 */
export async function shareOrDownloadBackup(backup: BackupFile): Promise<ShareOutcome> {
  const { blob, filename } = serializeBackup(backup)

  if (canShareFiles()) {
    const file = new File([blob], filename, { type: 'application/json' })
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Sauvegarde des cartes de fidélité' })
        return 'shared'
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
        // Tout autre échec (activation expirée, cible indisponible) : repli.
      }
    }
  }

  downloadBackup(backup)
  return 'downloaded'
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
    // Sauvegardes d'avant les catégories : tout était une carte d'enseigne.
    category: (isCardCategory(c.category) ? c.category : DEFAULT_CATEGORY) as CardCategory,
    color: typeof c.color === 'string' && isValidHex(c.color) ? c.color : DEFAULT_COLOR,
    notes: typeof c.notes === 'string' && c.notes.trim() ? c.notes : undefined,
    logoId: typeof c.logoId === 'string' ? c.logoId : undefined,
    imageBlob,
    createdAt: typeof c.createdAt === 'number' ? c.createdAt : Date.now(),
    lastUsedAt: typeof c.lastUsedAt === 'number' ? c.lastUsedAt : undefined,
    usageCount: typeof c.usageCount === 'number' ? c.usageCount : 0,
  }
}
