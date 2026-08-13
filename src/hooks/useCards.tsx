import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { LoyaltyCard } from '../types'
import {
  clearAll,
  deleteCard,
  listCards,
  putCard,
  putCards,
  touchCard,
  StorageError,
} from '../db/repository'
import { requestPersistentStorage } from '../db/db'

type Status = 'loading' | 'ready' | 'error'

interface CardsContextValue {
  cards: LoyaltyCard[]
  status: Status
  error: string | null
  reload: () => void
  /** Lecture synchrone : l'écran carte n'attend aucune promesse. */
  getById: (id: string) => LoyaltyCard | undefined
  saveCard: (card: LoyaltyCard) => Promise<void>
  removeCard: (id: string) => Promise<void>
  registerUse: (id: string) => void
  mergeCards: (incoming: LoyaltyCard[]) => Promise<void>
  replaceAll: (incoming: LoyaltyCard[]) => Promise<void>
  wipe: () => Promise<void>
}

const CardsContext = createContext<CardsContextValue | null>(null)

function messageOf(e: unknown): string {
  if (e instanceof StorageError) return e.message
  if (e instanceof Error) return e.message
  return 'Erreur inconnue.'
}

export function CardsProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<LoyaltyCard[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const rows = await listCards()
      setCards(rows)
      setStatus('ready')
    } catch (e) {
      setError(messageOf(e))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void load()
    // Au premier lancement seulement : protège la base contre l'éviction.
    void requestPersistentStorage()
  }, [load])

  const saveCard = useCallback(async (card: LoyaltyCard) => {
    await putCard(card)
    setCards((prev) => {
      const index = prev.findIndex((c) => c.id === card.id)
      if (index === -1) return [...prev, card]
      const next = prev.slice()
      next[index] = card
      return next
    })
  }, [])

  const removeCard = useCallback(async (id: string) => {
    await deleteCard(id)
    setCards((prev) => prev.filter((c) => c.id !== id))
  }, [])

  /**
   * Compteur d'usage : volontairement « fire and forget ».
   * L'état local est mis à jour immédiatement, l'écriture Dexie suit.
   * Un échec de persistance ne doit jamais empêcher d'afficher le code.
   */
  const registerUse = useCallback((id: string) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, lastUsedAt: Date.now(), usageCount: (c.usageCount ?? 0) + 1 } : c,
      ),
    )
    void touchCard(id)
  }, [])

  const mergeCards = useCallback(async (incoming: LoyaltyCard[]) => {
    await putCards(incoming)
    setCards((prev) => {
      const byId = new Map(prev.map((c) => [c.id, c]))
      for (const card of incoming) byId.set(card.id, card)
      return [...byId.values()]
    })
  }, [])

  const replaceAll = useCallback(async (incoming: LoyaltyCard[]) => {
    await clearAll()
    await putCards(incoming)
    setCards(incoming)
  }, [])

  const wipe = useCallback(async () => {
    await clearAll()
    setCards([])
  }, [])

  const getById = useCallback((id: string) => cards.find((c) => c.id === id), [cards])

  const value = useMemo<CardsContextValue>(
    () => ({
      cards,
      status,
      error,
      reload: () => void load(),
      getById,
      saveCard,
      removeCard,
      registerUse,
      mergeCards,
      replaceAll,
      wipe,
    }),
    [cards, status, error, load, getById, saveCard, removeCard, registerUse, mergeCards, replaceAll, wipe],
  )

  return <CardsContext.Provider value={value}>{children}</CardsContext.Provider>
}

export function useCards(): CardsContextValue {
  const ctx = useContext(CardsContext)
  if (!ctx) throw new Error('useCards doit être utilisé dans <CardsProvider>.')
  return ctx
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
