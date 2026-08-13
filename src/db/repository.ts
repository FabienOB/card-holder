import { db } from './db'
import type { LoyaltyCard } from '../types'

/**
 * Toute opération Dexie passe par ici et remonte une erreur typée :
 * l'UI affiche un état exploitable plutôt qu'un écran blanc.
 */
export class StorageError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'StorageError'
  }
}

export async function listCards(): Promise<LoyaltyCard[]> {
  try {
    return await db.cards.toArray()
  } catch (e) {
    throw new StorageError('Impossible de lire les cartes enregistrées.', e)
  }
}

export async function getCard(id: string): Promise<LoyaltyCard | undefined> {
  try {
    return await db.cards.get(id)
  } catch (e) {
    throw new StorageError('Impossible de lire cette carte.', e)
  }
}

export async function putCard(card: LoyaltyCard): Promise<void> {
  try {
    await db.cards.put(card)
  } catch (e) {
    throw new StorageError("Impossible d'enregistrer la carte.", e)
  }
}

export async function putCards(cards: LoyaltyCard[]): Promise<void> {
  try {
    await db.cards.bulkPut(cards)
  } catch (e) {
    throw new StorageError("Impossible d'importer les cartes.", e)
  }
}

export async function deleteCard(id: string): Promise<void> {
  try {
    await db.cards.delete(id)
  } catch (e) {
    throw new StorageError('Impossible de supprimer la carte.', e)
  }
}

export async function clearAll(): Promise<void> {
  try {
    await db.cards.clear()
  } catch (e) {
    throw new StorageError('Impossible de vider la base.', e)
  }
}

/**
 * Compteur d'usage : écrit en arrière-plan à l'ouverture d'une carte.
 * Ne doit jamais retarder ni faire échouer l'affichage du code-barres.
 */
export async function touchCard(id: string): Promise<Pick<LoyaltyCard, 'lastUsedAt' | 'usageCount'> | null> {
  try {
    const card = await db.cards.get(id)
    if (!card) return null
    const patch = { lastUsedAt: Date.now(), usageCount: (card.usageCount ?? 0) + 1 }
    await db.cards.update(id, patch)
    return patch
  } catch {
    return null
  }
}
