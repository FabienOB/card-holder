import Dexie, { type Table } from 'dexie'
import type { LoyaltyCard } from '../types'

/**
 * Un seul store. Les Blob d'images sont stockés tels quels par IndexedDB
 * (structured clone) — jamais de base64, qui gonflerait la base de ~33 %.
 */
export class CardHolderDB extends Dexie {
  cards!: Table<LoyaltyCard, string>

  constructor() {
    super('card-holder')
    this.version(1).stores({
      cards: 'id, name, lastUsedAt, createdAt',
    })
  }
}

export const db = new CardHolderDB()

/**
 * Demande au navigateur de ne pas évincer nos données sous pression disque.
 * Chrome Android accorde souvent la permission sans prompt si la PWA est installée.
 * Best-effort : un refus n'est pas une erreur bloquante.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    if (!navigator.storage?.estimate) return null
    const { usage = 0, quota = 0 } = await navigator.storage.estimate()
    return { usage, quota }
  } catch {
    return null
  }
}
