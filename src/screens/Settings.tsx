import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCards } from '../hooks/useCards'
import { getStorageEstimate } from '../db/db'
import { buildBackup, downloadBackup, parseBackup, BackupParseError } from '../lib/backup'
import { formatBytes } from '../lib/image'
import type { LoyaltyCard } from '../types'

interface Pending {
  cards: LoyaltyCard[]
  skipped: number
  exportedAt?: number
}

export function Settings() {
  const navigate = useNavigate()
  const { cards, mergeCards, replaceAll, wipe } = useCards()
  const fileRef = useRef<HTMLInputElement | null>(null)

  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [wipeStep, setWipeStep] = useState<0 | 1 | 2>(0)

  useEffect(() => {
    void getStorageEstimate().then(setStorage)
  }, [cards])

  const doExport = async () => {
    setBusy(true)
    setMessage(null)
    try {
      downloadBackup(await buildBackup(cards))
      setMessage({ kind: 'ok', text: `${cards.length} carte(s) exportée(s).` })
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : "L'export a échoué." })
    } finally {
      setBusy(false)
    }
  }

  const onFilePicked = async (file: File | undefined) => {
    if (!file) return
    setMessage(null)
    try {
      const result = parseBackup(await file.text())
      if (result.cards.length === 0) {
        setMessage({ kind: 'error', text: 'Aucune carte valide dans ce fichier.' })
        return
      }
      // Prévisualisation avant toute écriture : rien n'est encore modifié.
      setPending(result)
    } catch (e) {
      setMessage({
        kind: 'error',
        text: e instanceof BackupParseError ? e.message : "Ce fichier n'a pas pu être lu.",
      })
    }
  }

  const applyImport = async (mode: 'merge' | 'replace') => {
    if (!pending) return
    setBusy(true)
    try {
      if (mode === 'merge') await mergeCards(pending.cards)
      else await replaceAll(pending.cards)
      setMessage({
        kind: 'ok',
        text: mode === 'merge' ? `${pending.cards.length} carte(s) fusionnée(s).` : `Base remplacée par ${pending.cards.length} carte(s).`,
      })
      setPending(null)
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : "L'import a échoué." })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full bg-slate-50 pb-10">
      <header
        className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-white px-2 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
      >
        <button
          onClick={() => navigate('/')}
          aria-label="Revenir à la liste"
          className="flex min-h-touch min-w-touch items-center justify-center rounded-lg text-slate-600 active:bg-slate-100"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-slate-900">Réglages</h1>
      </header>

      <div className="space-y-4 p-4">
        {message && (
          <p
            role="status"
            className={`rounded-lg p-3 text-sm ${
              message.kind === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </p>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-1 font-semibold text-slate-900">Sauvegarde</h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-600">
            Un fichier JSON contenant toutes les cartes et leurs photos. C’est aussi comme cela
            qu’on transfère les cartes vers un autre téléphone de la famille.
          </p>
          <button
            onClick={doExport}
            disabled={busy || cards.length === 0}
            className="min-h-touch w-full rounded-lg bg-slate-900 py-3 font-medium text-white disabled:opacity-40"
          >
            Exporter {cards.length > 0 ? `(${cards.length} carte${cards.length > 1 ? 's' : ''})` : ''}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-1 font-semibold text-slate-900">Restauration</h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-600">
            Importez un fichier exporté depuis cette application.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              void onFilePicked(e.target.files?.[0])
              e.target.value = '' // permet de réimporter le même fichier
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="min-h-touch w-full rounded-lg border border-slate-300 py-3 font-medium text-slate-800 disabled:opacity-40"
          >
            Choisir un fichier…
          </button>

          {pending && (
            <div className="mt-4 rounded-lg border border-slate-300 bg-slate-50 p-3">
              <p className="text-sm text-slate-800">
                <strong>{pending.cards.length}</strong> carte{pending.cards.length > 1 ? 's' : ''} détectée
                {pending.cards.length > 1 ? 's' : ''} dans le fichier
                {pending.exportedAt ? ` (export du ${new Date(pending.exportedAt).toLocaleDateString('fr-FR')})` : ''}.
              </p>
              {pending.skipped > 0 && (
                <p className="mt-1 text-sm text-amber-700">
                  {pending.skipped} entrée(s) ignorée(s) car invalide(s).
                </p>
              )}
              <p className="mt-2 text-sm text-slate-600">
                Vous avez actuellement {cards.length} carte{cards.length > 1 ? 's' : ''}.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <button
                  onClick={() => applyImport('merge')}
                  disabled={busy}
                  className="min-h-touch rounded-lg bg-slate-900 py-3 font-medium text-white disabled:opacity-40"
                >
                  Fusionner avec mes cartes
                </button>
                <button
                  onClick={() => applyImport('replace')}
                  disabled={busy}
                  className="min-h-touch rounded-lg border border-red-300 py-3 font-medium text-red-700 disabled:opacity-40"
                >
                  Remplacer tout mon contenu
                </button>
                <button onClick={() => setPending(null)} className="min-h-touch py-2 text-sm text-slate-600">
                  Annuler
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-1 font-semibold text-slate-900">Stockage</h2>
          {storage ? (
            <p className="text-sm text-slate-600">
              {formatBytes(storage.usage)} utilisés
              {storage.quota > 0 && ` sur ${formatBytes(storage.quota)} disponibles`}.
            </p>
          ) : (
            <p className="text-sm text-slate-500">Information non disponible sur cet appareil.</p>
          )}
        </section>

        <section className="rounded-xl border border-red-200 bg-white p-4">
          <h2 className="mb-1 font-semibold text-red-700">Zone de danger</h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-600">
            Supprime définitivement toutes les cartes de cet appareil. Pensez à exporter avant.
          </p>
          {wipeStep === 0 && (
            <button
              onClick={() => setWipeStep(1)}
              disabled={cards.length === 0}
              className="min-h-touch w-full rounded-lg border border-red-300 py-3 font-medium text-red-700 disabled:opacity-40"
            >
              Tout supprimer
            </button>
          )}
          {wipeStep === 1 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-900">
                Supprimer les {cards.length} cartes de cet appareil ?
              </p>
              <button
                onClick={() => setWipeStep(2)}
                className="min-h-touch w-full rounded-lg bg-red-600 py-3 font-medium text-white"
              >
                Oui, continuer
              </button>
              <button onClick={() => setWipeStep(0)} className="min-h-touch w-full py-2 text-sm text-slate-600">
                Annuler
              </button>
            </div>
          )}
          {wipeStep === 2 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-700">
                Dernière confirmation : cette action est irréversible.
              </p>
              <button
                onClick={async () => {
                  setBusy(true)
                  try {
                    await wipe()
                    setMessage({ kind: 'ok', text: 'Toutes les cartes ont été supprimées.' })
                  } catch (e) {
                    setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Suppression impossible.' })
                  } finally {
                    setWipeStep(0)
                    setBusy(false)
                  }
                }}
                disabled={busy}
                className="min-h-touch w-full rounded-lg bg-red-700 py-3 font-semibold text-white disabled:opacity-40"
              >
                Supprimer définitivement
              </button>
              <button onClick={() => setWipeStep(0)} className="min-h-touch w-full py-2 text-sm text-slate-600">
                Annuler
              </button>
            </div>
          )}
        </section>

        <p className="pt-2 text-center text-xs text-slate-400">
          Toutes les données restent sur cet appareil. Aucun compte, aucun serveur.
        </p>
      </div>
    </div>
  )
}
