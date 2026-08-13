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

    /**
     * v2 — introduction des catégories (enseigne / tare de contenant).
     *
     * Les bases déjà installées sur les téléphones contiennent des cartes
     * sans champ `category` : l'`upgrade` les rattache toutes à « Enseignes »,
     * qui était le seul usage jusqu'ici. Sans cela, ces cartes seraient
     * invisibles dans un filtre par catégorie.
     */
    this.version(2)
      .stores({
        cards: 'id, name, lastUsedAt, createdAt, category',
      })
      .upgrade((tx) =>
        tx
          .table('cards')
          .toCollection()
          .modify((card) => {
            if (!card.category) card.category = 'store'
          }),
      )
  }
}

export const db = new CardHolderDB()

/**
 * Une migration de schéma ne peut s'appliquer que si **aucune autre
 * connexion** ne tient encore l'ancienne version ouverte. Sur Android, une
 * PWA laissée en arrière-plan peut être gelée par le système : elle ne traite
 * plus l'événement `versionchange`, ne se ferme donc pas, et bloque la
 * migration indéfiniment.
 *
 * Sans traitement, `db.open()` ne se résout jamais et l'application reste
 * figée sur un écran vide — en donnant la fausse impression que les données
 * ont disparu, alors qu'elles sont intactes.
 */
export class DatabaseBlockedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DatabaseBlockedError'
  }
}

let upgradeBlocked = false

// Notre migration est bloquée par une autre connexion.
db.on('blocked', () => {
  upgradeBlocked = true
})

// Un autre client veut migrer : on libère la base pour le laisser passer.
db.on('versionchange', () => {
  db.close()
})

const BLOCKED_MESSAGE =
  'La mise à jour de la base est bloquée par une autre fenêtre de l’application. ' +
  'Fermez les autres onglets et l’application (y compris depuis les applications ' +
  'récentes), puis rouvrez-la. Vos cartes ne sont pas perdues.'

/**
 * Ouvre la base avec un délai maximal : au-delà, on remonte une erreur
 * exploitable plutôt que de laisser l'utilisateur devant un écran vide.
 */
export async function openDatabase(timeoutMs = 12_000): Promise<void> {
  if (db.isOpen()) return

  // Remis à zéro à chaque tentative : un blocage passé ne doit pas faire
  // qualifier à tort une erreur ultérieure.
  upgradeBlocked = false

  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DatabaseBlockedError(BLOCKED_MESSAGE)), timeoutMs)
  })

  try {
    await Promise.race([db.open(), timeout])
  } catch (e) {
    if (upgradeBlocked || e instanceof DatabaseBlockedError) {
      throw new DatabaseBlockedError(BLOCKED_MESSAGE)
    }
    throw e
  } finally {
    if (timer) clearTimeout(timer)
  }
}

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
