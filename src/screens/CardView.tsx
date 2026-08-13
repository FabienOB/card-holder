import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Barcode } from '../components/Barcode'
import { useCards } from '../hooks/useCards'
import { useWakeLock } from '../hooks/useWakeLock'
import { groupByFour } from '../lib/validation'
import { is2D } from '../types'

/**
 * Écran d'affichage — le seul qui compte vraiment.
 * Fond blanc pur, code noir pur, aucun élément décoratif, aucune animation.
 */
export function CardView() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { getById, status, registerUse } = useCards()
  const card = getById(id)

  const [rotated, setRotated] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)

  // Le verrou d'écran n'est demandé que si l'on affiche réellement une carte.
  useWakeLock(!!card)

  // Comptage d'usage : une seule fois par ouverture d'écran.
  const countedRef = useRef<string | null>(null)
  useEffect(() => {
    if (card && countedRef.current !== card.id) {
      countedRef.current = card.id
      registerUse(card.id)
    }
  }, [card, registerUse])

  // Orientation portrait forcée. N'est autorisé qu'en mode standalone /
  // plein écran : hors PWA installée, l'appel échoue silencieusement.
  useEffect(() => {
    const orientation = screen.orientation as (ScreenOrientation & { lock?: (o: string) => Promise<void> }) | undefined
    void orientation?.lock?.('portrait').catch(() => {})
    return () => {
      try {
        screen.orientation?.unlock?.()
      } catch {
        /* non supporté : sans conséquence */
      }
    }
  }, [])

  const photoUrl = useMemo(
    () => (card?.imageBlob ? URL.createObjectURL(card.imageBlob) : null),
    [card?.imageBlob],
  )
  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl)
    }
  }, [photoUrl])

  if (!card) {
    // Pendant le chargement initial : blanc, sans spinner — l'écran ne doit
    // jamais donner l'impression d'attendre.
    if (status === 'loading') return <div className="fixed inset-0 bg-white" />
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-white p-6">
        <p className="text-center text-slate-700">Cette carte n’existe plus.</p>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="min-h-touch rounded-lg bg-slate-800 px-5 py-3 text-white"
        >
          Retour à la liste
        </button>
      </div>
    )
  }

  // Carte enregistrée sans code lisible : la photo *est* le contenu utile.
  if (!card.code) {
    return (
      <div className="fixed inset-0 flex flex-col bg-white">
        <header
          className="flex shrink-0 items-center gap-2 px-2 pt-3"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
        >
          <span className="min-w-touch" aria-hidden="true" />
          <h1 className="flex-1 truncate text-center text-base font-medium text-slate-500">{card.name}</h1>
          <button
            onClick={() => navigate(`/card/${card.id}/edit`)}
            aria-label="Modifier cette carte"
            className="flex min-h-touch min-w-touch items-center justify-center rounded-lg text-slate-300 active:bg-slate-100"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M4 20h4l10-10-4-4L4 16z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </header>
        <div className="flex flex-1 items-center justify-center overflow-hidden p-2">
          {photoUrl ? (
            <img src={photoUrl} alt={`Carte ${card.name}`} className="max-h-full max-w-full object-contain" />
          ) : (
            <p className="px-8 text-center text-slate-500">Cette carte n’a ni code ni photo.</p>
          )}
        </div>
        <footer className="shrink-0 px-4 pb-3 pt-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}>
          <button
            onClick={() => navigate('/')}
            aria-label="Revenir à la liste"
            className="flex min-h-touch min-w-touch items-center gap-1.5 rounded-lg px-3 text-sm text-slate-500 active:bg-slate-100"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Retour
          </button>
        </footer>
      </div>
    )
  }

  const twoD = is2D(card.format)
  const longCode = card.code.length > 20

  /**
   * Dimensions en unités de viewport : aucune mesure JS, donc aucun reflow
   * après le premier paint. En mode pivoté, largeur et hauteur sont échangées
   * avant l'application de `rotate(90deg)`.
   */
  // En pivoté, la « largeur » devient la hauteur affichée : 68vh laisse une
  // marge suffisante sous l'en-tête, le numéro et le pied de page, même sur
  // un petit écran (~640 px de haut), pour que rien ne soit rogné.
  const boxStyle = twoD
    ? { width: 'min(82vw, 42vh)', height: 'min(82vw, 42vh)' }
    : rotated
      ? { width: '68vh', height: '60vw', transform: 'rotate(90deg)' }
      : { width: '92vw', height: '34vh' }

  return (
    <div
      className="fixed inset-0 flex select-none flex-col bg-white"
      onClick={() => setRotated((r) => !r)}
      role="presentation"
    >
      <header
        className="flex shrink-0 items-center gap-2 px-2 pt-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
      >
        <span className="min-w-touch" aria-hidden="true" />
        <h1 className="flex-1 truncate text-center text-base font-medium text-slate-500">{card.name}</h1>
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/card/${card.id}/edit`)
          }}
          aria-label="Modifier cette carte"
          className="flex min-h-touch min-w-touch items-center justify-center rounded-lg text-slate-300 active:bg-slate-100"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M4 20h4l10-10-4-4L4 16z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>

      {/* Zone code-barres : centrée, occupe l'espace disponible. */}
      <div className="flex flex-1 items-center justify-center overflow-hidden">
        <div style={boxStyle} className="flex items-center justify-center">
          <Barcode code={card.code} format={card.format} className="h-full w-full" />
        </div>
      </div>

      {/* Numéro : la roue de secours quand le scanner ne veut rien savoir. */}
      <p
        className={`shrink-0 break-all px-3 text-center font-mono font-bold tracking-tight text-black ${
          longCode ? 'text-lg' : 'text-[clamp(1.5rem,8.5vw,2.75rem)] leading-tight'
        }`}
      >
        {groupByFour(card.code)}
      </p>

      <footer
        className="flex shrink-0 items-center justify-between px-4 pb-3 pt-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigate('/')
          }}
          aria-label="Revenir à la liste"
          className="flex min-h-touch min-w-touch items-center gap-1.5 rounded-lg px-3 text-sm text-slate-500 active:bg-slate-100"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Retour
        </button>

        <span className="text-xs text-slate-300">Touchez pour pivoter</span>

        {photoUrl ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setPhotoOpen(true)
            }}
            aria-label="Voir la photo de la carte"
            className="min-h-touch min-w-touch overflow-hidden rounded-md border border-slate-200"
          >
            <img src={photoUrl} alt="" className="h-11 w-11 object-cover" />
          </button>
        ) : (
          <span className="min-w-touch" aria-hidden="true" />
        )}
      </footer>

      {photoOpen && photoUrl && (
        <div
          className="fixed inset-0 z-10 flex items-center justify-center bg-black/90 p-4"
          onClick={(e) => {
            e.stopPropagation()
            setPhotoOpen(false)
          }}
          role="dialog"
          aria-label="Photo de la carte"
        >
          <img src={photoUrl} alt={`Photo de la carte ${card.name}`} className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  )
}
