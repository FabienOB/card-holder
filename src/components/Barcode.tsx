import { useMemo } from 'react'
import { renderBarcodeSVG } from '../lib/barcode'
import type { BarcodeFormat } from '../types'

interface Props {
  code: string
  format: BarcodeFormat
  className?: string
  /** Rendu du message d'erreur si le code est inencodable dans ce format. */
  onError?: (message: string) => void
}

/**
 * Rendu purement synchrone : `useMemo` calcule le SVG pendant le render,
 * il est donc présent dès le premier paint. Aucun effet, aucun état de
 * chargement, aucun reflow après coup.
 */
export function Barcode({ code, format, className }: Props) {
  const { svg, error } = useMemo(() => renderBarcodeSVG(code, format), [code, format])

  if (error) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border-2 border-dashed border-red-300 p-4 ${className ?? ''}`}
        role="alert"
      >
        <p className="text-center text-sm text-red-700">{error}</p>
      </div>
    )
  }

  return (
    <div
      className={className}
      role="img"
      aria-label={`Code-barres ${format.replace('_', '-')}, valeur ${code.split('').join(' ')}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
