import type { JSX } from 'react'

/**
 * Bibliothèque de pictogrammes génériques, en SVG inline (aucun fichier,
 * aucune requête réseau). Tracés en `currentColor` pour s'adapter à la
 * couleur d'accent de la tuile.
 */
export interface GenericLogo {
  id: string
  label: string
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
  {
    id: 'supermarket',
    label: 'Supermarché',
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
    id: 'pharmacy',
    label: 'Pharmacie',
    render: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <g {...stroke}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
          <path d="M12 8v8M8 12h8" />
        </g>
      </svg>
    ),
  },
  {
    id: 'fuel',
    label: 'Station-service',
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
  {
    id: 'books',
    label: 'Librairie',
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
    id: 'sport',
    label: 'Sport',
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
    id: 'beauty',
    label: 'Beauté',
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
    id: 'restaurant',
    label: 'Restaurant',
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
    id: 'diy',
    label: 'Bricolage',
    render: ({ className }) => (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <g {...stroke}>
          <path d="M14.5 3.5a4.5 4.5 0 0 0-4 6.6L4 16.6a1.9 1.9 0 0 0 2.7 2.7l6.5-6.5a4.5 4.5 0 0 0 5.6-5.9l-2.6 2.6-2.4-.6-.6-2.4z" />
        </g>
      </svg>
    ),
  },
]

export const LOGO_BY_ID = new Map(LOGOS.map((logo) => [logo.id, logo]))
