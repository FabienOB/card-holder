import { useCallback, useEffect, useRef, useState } from 'react'
import { DETECTOR_FORMATS, fromDetectedFormat } from '../lib/barcode'
import type { BarcodeFormat } from '../types'

export type ScannerState =
  | 'idle' // pas encore démarré
  | 'unsupported' // API absente → repli saisie manuelle
  | 'starting' // permission demandée / flux en cours d'ouverture
  | 'scanning' // caméra active, détection en cours
  | 'denied' // permission refusée par l'utilisateur
  | 'error' // caméra indisponible (déjà utilisée, matériel absent…)

export interface ScanResult {
  code: string
  format: BarcodeFormat
}

/** Intervalle de détection : 250 ms suffit et laisse le CPU respirer. */
const DETECT_INTERVAL_MS = 250

/**
 * ── Détection de code-barres et repli ────────────────────────────────────
 *
 * On s'appuie uniquement sur `BarcodeDetector`, natif dans Chrome Android :
 * aucune bibliothèque tierce, aucun WASM à télécharger, rien à précacher.
 *
 * L'API n'est pas universelle (absente de Firefox, et de Chrome desktop sous
 * Linux où le backend de détection n'est pas embarqué). La règle est donc :
 * **échec silencieux**. `isScannerSupported()` est testé avant même d'afficher
 * le bouton « Scanner » ; si l'API manque, l'écran d'ajout n'en parle pas et
 * présente directement la saisie manuelle. L'utilisateur ne voit jamais une
 * fonctionnalité cassée, seulement un formulaire qui marche.
 *
 * Le refus de permission caméra est traité séparément (état `denied`) : là,
 * l'utilisateur a fait un choix explicite, on l'informe et on le bascule sur
 * la saisie manuelle.
 */
export function isScannerSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'BarcodeDetector' in window &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  )
}

export function useBarcodeScanner(onResult: (result: ScanResult) => void) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const busyRef = useRef(false)
  const doneRef = useRef(false)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  const [state, setState] = useState<ScannerState>(() => (isScannerSupported() ? 'idle' : 'unsupported'))
  const [message, setMessage] = useState<string | null>(null)

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    // Couper les pistes éteint la LED caméra : indispensable au démontage.
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const start = useCallback(async () => {
    if (!isScannerSupported()) {
      setState('unsupported')
      return
    }
    doneRef.current = false
    setState('starting')
    setMessage(null)

    try {
      // On ne garde que les formats réellement gérés par l'implémentation :
      // demander un format inconnu fait échouer le constructeur.
      const supported: string[] = await window.BarcodeDetector!.getSupportedFormats()
      const formats = DETECTOR_FORMATS.filter((f) => supported.includes(f))
      if (formats.length === 0) {
        setState('unsupported')
        return
      }
      const detector = new window.BarcodeDetector!({ formats })

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream

      const video = videoRef.current
      if (!video) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      await video.play().catch(() => {})
      setState('scanning')

      timerRef.current = window.setInterval(async () => {
        if (busyRef.current || doneRef.current) return
        const el = videoRef.current
        if (!el || el.readyState < 2) return
        busyRef.current = true
        try {
          const codes = await detector.detect(el)
          for (const detection of codes) {
            const mapped = fromDetectedFormat(detection.format, detection.rawValue)
            if (mapped && mapped.code) {
              doneRef.current = true
              onResultRef.current(mapped)
              break
            }
          }
        } catch {
          // Une frame illisible n'est pas une erreur : on retente au tick suivant.
        } finally {
          busyRef.current = false
        }
      }, DETECT_INTERVAL_MS)
    } catch (e) {
      stop()
      const name = e instanceof DOMException ? e.name : ''
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setState('denied')
        setMessage(
          "L'accès à la caméra a été refusé. Autorisez-le dans les réglages du navigateur, ou saisissez le code à la main.",
        )
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setState('error')
        setMessage('Aucune caméra utilisable sur cet appareil.')
      } else {
        setState('error')
        setMessage("La caméra n'a pas pu être ouverte. Elle est peut-être utilisée par une autre application.")
      }
    }
  }, [stop])

  // Sécurité : on coupe toujours le flux quand le composant disparaît.
  useEffect(() => stop, [stop])

  return { videoRef, state, message, start, stop }
}
