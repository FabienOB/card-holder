import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { LoyaltyCard } from '../types'
import { LOGO_BY_ID } from '../lib/logos'
import { monogramOf } from '../lib/brands'
import { readableTextOn } from '../lib/colors'

/**
 * Tuile de la grille d'accueil. C'est le seul endroit où l'esthétique compte :
 * la couleur et le pictogramme doivent permettre de trouver sa carte
 * sans lire le texte.
 */
export function CardTile({ card }: { card: LoyaltyCard }) {
  const thumbUrl = useMemo(
    () => (card.imageBlob ? URL.createObjectURL(card.imageBlob) : null),
    [card.imageBlob],
  )
  useEffect(() => {
    return () => {
      if (thumbUrl) URL.revokeObjectURL(thumbUrl)
    }
  }, [thumbUrl])

  const logo = card.logoId ? LOGO_BY_ID.get(card.logoId) : undefined

  // Sur une photo, le nom est toujours blanc (le voile sombre s'en charge).
  // Sur un aplat de couleur, on choisit selon la luminance : une teinte de
  // marque claire impose du texte sombre.
  const textColor = thumbUrl ? '#FFFFFF' : readableTextOn(card.color)

  return (
    <Link
      to={`/card/${card.id}`}
      className="relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-xl p-3 shadow-sm active:opacity-90"
      style={{ backgroundColor: card.color, color: textColor }}
      aria-label={`Ouvrir la carte ${card.name}`}
    >
      {thumbUrl ? (
        <>
          <img src={thumbUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          {/* Voile sombre : garantit le contraste AA du nom sur n'importe quelle photo. */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        </>
      ) : logo ? (
        <div className="absolute inset-0 flex items-center justify-center opacity-30" aria-hidden="true">
          {logo.render({ className: 'h-16 w-16' })}
        </div>
      ) : (
        // Ni photo ni pictogramme : monogramme dérivé du nom. Repère visuel
        // immédiat, sans reproduire aucun logo de marque.
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <span className="text-5xl font-bold leading-none opacity-90">{monogramOf(card.name)}</span>
        </div>
      )}

      <span className="relative line-clamp-2 text-sm font-semibold leading-tight">{card.name}</span>
    </Link>
  )
}
