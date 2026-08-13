import type { JSX } from 'react'
import type { CardCategory } from '../types'

/**
 * Bibliothèque de pictogrammes génériques, en SVG inline (aucun fichier,
 * aucune requête réseau). Tracés en `currentColor` pour s'adapter à la
 * couleur d'accent de la tuile.
 *
 * Chaque pictogramme est rattaché à une catégorie : le sélecteur ne propose
 * que les formes pertinentes (des contenants pour une tare, des commerces
 * pour une carte d'enseigne).
 *
 * Les `id` sont des identifiants **persistés en base** : ils ne doivent
 * jamais être renommés, sous peine de faire disparaître le pictogramme des
 * cartes déjà enregistrées. L'ordre du tableau, lui, ne sert qu'à
 * l'affichage du sélecteur et peut changer librement.
 */
export interface GenericLogo {
  id: string
  label: string
  category: CardCategory
  render: (props: { className?: string }) => JSX.Element
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const LOGOS: GenericLogo[] = [
  // ── Enseignes ───────────────────────────────────────────────────────
  // Ordonnées par proximité d'usage : l'alimentaire d'abord, qui concentre
  // l'essentiel des cartes de fidélité.
  {
    id: 'supermarket',
    label: 'Supermarché',
    category: 'store',
    render: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <g {...stroke}>
          <path d="M3 4h2l2.4 10.5a2 2 0 0 0 2 1.5h7.2a2 2 0 0 0 2-1.5L20.5 8H6" />
          <circle cx="10" cy="20" r="1.4" />
          <circle cx="17" cy="20" r="1.4" />
        </g>
      </svg>
    ),
  },
  {
    id: 'frozen',
    label: 'Surgelés',
    category: 'store',
    render: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <g {...stroke}>
          {/* Flocon : trois axes à 60°, chacun terminé par deux barbes. */}
          <path d="M12 2.5v19" />
          <path d="M12 6.6 9.7 4.3M12 6.6l2.3-2.3M12 17.4l-2.3 2.3M12 17.4l2.3 2.3" />
          <path d="M3.77 7.25l16.46 9.5" />
          <path d="m7.3 8.7-.85-3.15M7.3 8.7l-3.15.85M16.7 15.3l.85 3.15M16.7 15.3l3.15-.85" />
          <path d="M20.23 7.25 3.77 16.75" />
          <path d="m16.7 8.7.85-3.15M16.7 8.7l3.15.85M7.3 15.3l-.85 3.15M7.3 15.3l-3.15-.85" />
        </g>
      </svg>
    ),
  },
  {
    id: 'bakery',
    label: 'Boulangerie',
    category: 'store',
    render: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <g {...stroke}>
          <path d="M3.5 14.5c0-4.1 3.8-7.5 8.5-7.5s8.5 3.4 8.5 7.5a2.5 2.5 0 0 1-2.5 2.5h-12a2.5 2.5 0 0 1-2.5-2.5z" />
          <path d="M9 10.6 7.4 14.4M12.6 10.2 11 14.6M16.2 10.6l-1.6 3.8" />
        </g>
      </svg>
    ),
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    category: 'store',
    render: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <g {...stroke}>
          <path d="M7 3v8a2.5 2.5 0 0 0 2.5 2.5h0V21" />
          <path d="M7 3v5M10 3v5" />
          <path d="M17 3c-1.5 1.2-2 3-2 5s.7 3 2 3.2V21" />
        </g>
      </svg>
    ),
  },
  {
    id: 'pharmacy',
    label: 'Pharmacie',
    category: 'store',
    render: ({ className }) => (
      // Gélule inclinée à 45°. Le `rx` égal à la demi-hauteur donne les
      // extrémités parfaitement arrondies ; la barre centrale marque la
      // jonction des deux demi-capsules.
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <g {...stroke} transform="rotate(-45 12 12)">
          <rect x="3.6" y="8.5" width="16.8" height="7" rx="3.5" />
          <path d="M12 8.5v7" />
        </g>
      </svg>
    ),
  },
  {
    id: 'beauty',
    label: 'Beauté',
    category: 'store',
    render: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <g {...stroke}>
          <path d="M9 9h6v10.5a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 19.5z" />
          <path d="M10 9V5.5a2 2 0 0 1 4 0V9" />
          <path d="M9 13.5h6" />
        </g>
      </svg>
    ),
  },
  {
    id: 'optical',
    label: 'Optique',
    category: 'store',
    render: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <g {...stroke}>
          <circle cx="6.3" cy="14.5" r="3.6" />
          <circle cx="17.7" cy="14.5" r="3.6" />
          <path d="M9.9 14.2a2.1 2.1 0 0 1 4.2 0" />
          <path d="M2.7 12 4.6 8.2h2.6M21.3 12 19.4 8.2h-2.6" />
        </g>
      </svg>
    ),
  },
  {
    id: 'clothing',
    label: 'Vêtements',
    category: 'store',
    render: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <g {...stroke}>
          <path d="M8.6 3.4 5 5.4l1.6 4.2 2-1v11.9h6.8V8.6l2 1L19 5.4l-3.6-2a3.4 3.4 0 0 1-6.8 0z" />
        </g>
      </svg>
    ),
  },
  {
    id: 'sport',
    label: 'Sport',
    category: 'store',
    render: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <g {...stroke}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 3.5c2.5 2.2 3.8 5 3.8 8.5s-1.3 6.3-3.8 8.5" />
          <path d="M12 3.5c-2.5 2.2-3.8 5-3.8 8.5s1.3 6.3 3.8 8.5" />
          <path d="M3.7 9.5h16.6M3.7 14.5h16.6" />
        </g>
      </svg>
    ),
  },
  {
    id: 'books',
    label: 'Librairie',
    category: 'store',
    render: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <g {...stroke}>
          <path d="M12 6.5C10.5 5 8.5 4.5 4 4.5v13C8.5 17.5 10.5 18 12 19.5" />
          <path d="M12 6.5C13.5 5 15.5 4.5 20 4.5v13c-4.5 0-6.5.5-8 2" />
          <path d="M12 6.5v13" />
        </g>
      </svg>
    ),
  },
  {
    id: 'tech',
    label: 'High-tech',
    category: 'store',
    render: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <g {...stroke}>
          <rect x="2.5" y="4" width="19" height="12.5" rx="2" />
          <path d="M9 20.5h6M12 16.5v4" />
        </g>
      </svg>
    ),
  },
  {
    id: 'diy',
    label: 'Bricolage',
    category: 'store',
    render: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <g {...stroke}>
          <path d="M14.5 3.5a4.5 4.5 0 0 0-4 6.6L4 16.6a1.9 1.9 0 0 0 2.7 2.7l6.5-6.5a4.5 4.5 0 0 0 5.6-5.9l-2.6 2.6-2.4-.6-.6-2.4z" />
        </g>
      </svg>
    ),
  },
  {
    id: 'garden',
    label: 'Jardinerie',
    category: 'store',
    render: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <g {...stroke}>
          <path d="M12 15.5c0-3.4 2.2-6 5.4-6.5-.3 3.6-2.4 6-5.4 6.5z" />
          <path d="M12 15.5c0-2.8-1.9-5-4.6-5.5.3 3.1 2 5 4.6 5.5z" />
          <path d="M12 15.5V18" />
          <path d="M6.8 18h10.4l-.9 3.1a1.5 1.5 0 0 1-1.4 1.1H9.1a1.5 1.5 0 0 1-1.4-1.1z" />
        </g>
      </svg>
    ),
  },
  {
    id: 'home',
    label: 'Maison',
    category: 'store',
    render: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <g {...stroke}>
          <path d="M3.2 10.8 12 3.5l8.8 7.3" />
          <path d="M5.5 9.2v10.3a1.2 1.2 0 0 0 1.2 1.2h10.6a1.2 1.2 0 0 0 1.2-1.2V9.2" />
          <path d="M9.8 20.7v-5.9h4.4v5.9" />
        </g>
      </svg>
    ),
  },
  {
    id: 'pets',
    label: 'Animalerie',
    category: 'store',
    render: ({ className }) => (
      // Empreinte : quatre coussinets et la pelote. Retenue de préférence à
      // une tête de chien — la patte reste lisible plus petite et ne se
      // limite pas à une espèce.
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <g {...stroke}>
          <ellipse cx="6.6" cy="10.2" rx="1.7" ry="2.1" />
          <ellipse cx="10.4" cy="7.4" rx="1.7" ry="2.2" />
          <ellipse cx="14.6" cy="7.4" rx="1.7" ry="2.2" />
          <ellipse cx="18.4" cy="10.2" rx="1.7" ry="2.1" />
          <path d="M12.5 13.2c2.7 0 4.9 2 4.9 4.3 0 1.9-1.5 3.2-3.4 3.2h-3c-1.9 0-3.4-1.3-3.4-3.2 0-2.3 2.2-4.3 4.9-4.3z" />
        </g>
      </svg>
    ),
  },
  {
    id: 'fuel',
    label: 'Station-service',
    category: 'store',
    render: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <g {...stroke}>
          <path d="M4 20V5a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 13 5v15" />
          <path d="M3 20h11" />
          <path d="M6.5 7.5h4" />
          <path d="M16 20v-6.5h1.5A1.5 1.5 0 0 0 19 12V8.5l-2.5-3" />
          <path d="M13 11h3" />
        </g>
      </svg>
    ),
  },

  // ── Contenants (tare, achat en vrac) ────────────────────────────────
  {
    id: 'jar',
    label: 'Bocal',
    category: 'tare',
    render: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <g {...stroke}>
          {/* Couvercle */}
          <path d="M8 2.5h8v2.2H8z" />
          {/* Col puis panse du bocal */}
          <path d="M8.6 4.7v1.8c0 .8-.5 1.3-1.1 1.9A4 4 0 0 0 6 11.2v7.9A2.4 2.4 0 0 0 8.4 21.5h7.2a2.4 2.4 0 0 0 2.4-2.4v-7.9a4 4 0 0 0-1.5-2.8c-.6-.6-1.1-1.1-1.1-1.9V4.7" />
          {/* Étiquette */}
          <path d="M8.8 12.5h6.4v4H8.8z" />
        </g>
      </svg>
    ),
  },
  {
    id: 'box',
    label: 'Boîte',
    category: 'tare',
    render: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <g {...stroke}>
          {/* Boîte en perspective : dessus puis corps */}
          <path d="M3 7.2 12 3l9 4.2-9 4.2z" />
          <path d="M3 7.2v9.6L12 21v-9.6" />
          <path d="M21 7.2v9.6L12 21" />
        </g>
      </svg>
    ),
  },
  {
    id: 'bottle',
    label: 'Bouteille',
    category: 'tare',
    render: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <g {...stroke}>
          {/* Bouchon, goulot, épaule puis corps */}
          <path d="M10 2.5h4v2.2h-4z" />
          <path d="M10.2 4.7v3.1c0 .9-.6 1.5-1.2 2.2A4.2 4.2 0 0 0 8 12.8v6.3A2.4 2.4 0 0 0 10.4 21.5h3.2a2.4 2.4 0 0 0 2.4-2.4v-6.3a4.2 4.2 0 0 0-1-2.8c-.6-.7-1.2-1.3-1.2-2.2V4.7" />
          {/* Étiquette */}
          <path d="M8.2 13.5h7.6v3.6H8.2z" />
        </g>
      </svg>
    ),
  },
  {
    id: 'bag',
    label: 'Sac',
    category: 'tare',
    render: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <g {...stroke}>
          <path d="M6.6 8h10.8l1.1 11.6a1.8 1.8 0 0 1-1.8 2H7.3a1.8 1.8 0 0 1-1.8-2z" />
          <path d="M9.3 8V5.8a2.7 2.7 0 0 1 5.4 0V8" />
        </g>
      </svg>
    ),
  },
]

export const LOGO_BY_ID = new Map(LOGOS.map((logo) => [logo.id, logo]))

/** Pictogrammes proposés pour une catégorie donnée. */
export function logosForCategory(category: CardCategory): GenericLogo[] {
  return LOGOS.filter((logo) => logo.category === category)
}
