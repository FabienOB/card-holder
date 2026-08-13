import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CardTile } from '../components/CardTile'
import { ErrorState } from '../components/ErrorState'
import { useCards } from '../hooks/useCards'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { CARD_CATEGORIES, CATEGORY_LABELS, type CardCategory, type LoyaltyCard, type SortMode } from '../types'

/** Normalisation pour la recherche : insensible à la casse et aux accents. */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function sortCards(cards: LoyaltyCard[], mode: SortMode): LoyaltyCard[] {
  const sorted = cards.slice()
  switch (mode) {
    case 'alpha':
      return sorted.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
    case 'created':
      return sorted.sort((a, b) => b.createdAt - a.createdAt)
    case 'recent':
    default:
      // Cartes déjà utilisées d'abord (plus récente en tête),
      // puis les cartes jamais utilisées, de la plus récemment ajoutée.
      return sorted.sort((a, b) => {
        const aUsed = a.lastUsedAt ?? 0
        const bUsed = b.lastUsedAt ?? 0
        if (aUsed && bUsed) return bUsed - aUsed
        if (aUsed) return -1
        if (bUsed) return 1
        return b.createdAt - a.createdAt
      })
  }
}

const SORT_LABELS: Record<SortMode, string> = {
  recent: 'Récentes',
  alpha: 'A → Z',
  created: 'Ajout',
}

export function CardList() {
  const { cards, status, error, reload } = useCards()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortMode>('recent')
  const [category, setCategory] = useState<CardCategory | 'all'>('all')
  const { canPrompt, promptInstall, dismiss } = useInstallPrompt(cards.length > 0)

  // Le filtre ne s'affiche que s'il sert à quelque chose : inutile de
  // montrer « Enseignes / Bocaux » à qui n'a que des cartes d'enseigne.
  const usedCategories = useMemo(
    () => CARD_CATEGORIES.filter((c) => cards.some((card) => card.category === c)),
    [cards],
  )
  const showCategoryFilter = usedCategories.length > 1

  const visible = useMemo(() => {
    const needle = normalize(query.trim())
    const filtered = cards.filter((c) => {
      if (category !== 'all' && c.category !== category) return false
      if (!needle) return true
      return normalize(c.name).includes(needle) || normalize(c.notes ?? '').includes(needle)
    })
    return sortCards(filtered, sort)
  }, [cards, query, sort, category])

  if (status === 'error') {
    return <ErrorState message={error ?? 'Erreur de lecture des données.'} onRetry={reload} />
  }

  return (
    <div className="min-h-full bg-slate-50 pb-28">
      <header
        className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-4 pb-3 backdrop-blur"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">Mes cartes</h1>
          <Link
            to="/settings"
            aria-label="Réglages"
            className="flex min-h-touch min-w-touch items-center justify-center rounded-lg text-slate-600 active:bg-slate-200"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </Link>
        </div>

        {cards.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <svg
                viewBox="0 0 24 24"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher"
                aria-label="Rechercher une carte"
                className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div className="flex h-11 overflow-hidden rounded-lg border border-slate-300 bg-white" role="group" aria-label="Trier les cartes">
              {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSort(mode)}
                  aria-pressed={sort === mode}
                  className={`px-2.5 text-xs font-medium ${
                    sort === mode ? 'bg-slate-800 text-white' : 'text-slate-600'
                  }`}
                >
                  {SORT_LABELS[mode]}
                </button>
              ))}
            </div>
          </div>
        )}

        {showCategoryFilter && (
          <div className="mt-2 flex gap-2" role="group" aria-label="Filtrer par type">
            {(['all', ...usedCategories] as const).map((value) => (
              <button
                key={value}
                onClick={() => setCategory(value)}
                aria-pressed={category === value}
                className={`min-h-touch rounded-full px-4 text-sm font-medium ${
                  category === value
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-300 bg-white text-slate-700'
                }`}
              >
                {value === 'all' ? 'Toutes' : CATEGORY_LABELS[value]}
              </button>
            ))}
          </div>
        )}
      </header>

      {canPrompt && (
        <div className="mx-4 mt-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <p className="flex-1 text-sm text-slate-700">
            Installez l’app pour l’ouvrir plus vite, même sans réseau.
          </p>
          <button onClick={dismiss} className="min-h-touch px-2 text-sm text-slate-500">
            Plus tard
          </button>
          <button onClick={promptInstall} className="min-h-touch rounded-lg bg-slate-800 px-3 text-sm font-medium text-white">
            Installer
          </button>
        </div>
      )}

      {/*
        Tant que la lecture n'est pas terminée, on n'affirme rien : annoncer
        « aucune carte » pendant le chargement laisse croire à une perte de
        données. On attend d'avoir réellement lu la base.
      */}
      {status === 'loading' ? (
        <p className="px-4 py-16 text-center text-slate-400" role="status">
          Chargement…
        </p>
      ) : cards.length === 0 ? (
        <EmptyState />
      ) : visible.length === 0 ? (
        <p className="px-4 py-16 text-center text-slate-500">
          {query.trim()
            ? `Aucune carte ne correspond à « ${query} ».`
            : 'Aucune carte dans cette catégorie.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4">
          {visible.map((card) => (
            <CardTile key={card.id} card={card} />
          ))}
        </div>
      )}

      <Link
        to="/add"
        aria-label="Ajouter une carte"
        className="fixed bottom-6 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg active:bg-slate-700"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </Link>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center px-8 py-20 text-center">
      <svg viewBox="0 0 24 24" className="mb-5 h-14 w-14 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
        <path d="M6 9.5v5M8.5 9.5v5M11 9.5v5M14 9.5v5M16 9.5v5M18 9.5v5" strokeLinecap="round" />
      </svg>
      <h2 className="mb-2 text-lg font-semibold text-slate-800">Aucune carte pour l’instant</h2>
      <p className="mb-6 text-sm leading-relaxed text-slate-600">
        Scannez le code-barres d’une carte de fidélité, ou saisissez son numéro à la main.
        Tout reste sur ce téléphone.
      </p>
      <Link to="/add" className="min-h-touch rounded-lg bg-slate-900 px-6 py-3 font-medium text-white">
        Ajouter ma première carte
      </Link>
    </div>
  )
}
