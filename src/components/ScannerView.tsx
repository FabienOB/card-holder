import { useEffect } from 'react'
import { useBarcodeScanner, type ScanResult } from '../hooks/useBarcodeScanner'

interface Props {
  onResult: (result: ScanResult) => void
  onClose: () => void
  /** Appelé si le scan est impossible : l'appelant bascule sur la saisie manuelle. */
  onFallback: () => void
}

/**
 * Overlay caméra. Ne s'affiche que si `isScannerSupported()` est vrai côté
 * appelant ; gère ici les échecs survenant après coup (permission refusée,
 * caméra occupée) en proposant explicitement la saisie manuelle.
 */
export function ScannerView({ onResult, onClose, onFallback }: Props) {
  const { videoRef, state, message, start, stop } = useBarcodeScanner((result) => {
    // Vibration courte : confirme la capture sans qu'on ait à regarder l'écran.
    navigator.vibrate?.(60)
    stop()
    onResult(result)
  })

  useEffect(() => {
    void start()
    return stop
  }, [start, stop])

  const failed = state === 'denied' || state === 'error' || state === 'unsupported'

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-black">
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
          autoPlay
          aria-label="Aperçu de la caméra"
        />

        {state === 'scanning' && (
          <>
            {/* Viseur : cadre large et bas, adapté aux codes-barres linéaires. */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-40 w-[85%] rounded-lg border-2 border-white/90 shadow-[0_0_0_100vmax_rgba(0,0,0,0.45)]" />
            </div>
            <p className="absolute inset-x-0 bottom-6 text-center text-sm text-white/90">
              Cadrez le code-barres de la carte
            </p>
          </>
        )}

        {state === 'starting' && (
          <p className="absolute inset-0 flex items-center justify-center px-8 text-center text-white/90">
            Ouverture de la caméra…
          </p>
        )}

        {failed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black px-8 text-center">
            <p className="text-white/90">
              {message ?? "Le scan n'est pas disponible sur cet appareil."}
            </p>
            <button
              onClick={onFallback}
              className="min-h-touch rounded-lg bg-white px-5 py-3 font-medium text-slate-900"
            >
              Saisir le code à la main
            </button>
          </div>
        )}
      </div>

      <button
        onClick={onClose}
        className="min-h-touch bg-black py-4 text-center text-white"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
      >
        Annuler
      </button>
    </div>
  )
}
