import { useEffect, useRef } from 'react'

/**
 * ── Gestion du Screen Wake Lock ──────────────────────────────────────────
 *
 * Problème concret : l'écran s'éteint pendant que la caissière cherche son
 * scanner. Le verrou empêche la mise en veille tant que la carte est affichée.
 *
 * Trois règles imposées par l'API :
 *
 *  1. `navigator.wakeLock.request()` ne peut aboutir que si le document est
 *     **visible**. Appelé sur un onglet caché, il rejette avec NotAllowedError.
 *
 *  2. Le système **relâche le verrou tout seul** dès que l'onglet passe en
 *     arrière-plan (notification, changement d'app, écran verrouillé). Il
 *     n'est jamais réacquis automatiquement : c'est à nous de le refaire au
 *     retour, d'où l'écoute de `visibilitychange`.
 *
 *  3. Le verrou doit être relâché explicitement en sortie d'écran, sinon il
 *     survit à la navigation et draine la batterie sur la liste.
 *
 * L'API est absente hors contexte sécurisé (HTTPS) et sur certains
 * navigateurs : tout est en best-effort, un échec ne casse jamais l'affichage.
 */
export function useWakeLock(enabled: boolean): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!enabled) return
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

    let cancelled = false

    const acquire = async () => {
      // Règle 1 : inutile d'essayer si le document n'est pas visible.
      if (document.visibilityState !== 'visible') return
      if (sentinelRef.current) return
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          // L'écran a été quitté pendant l'await : on relâche aussitôt.
          void sentinel.release()
          return
        }
        sentinelRef.current = sentinel
        // Le système a pu relâcher le verrou de son côté : on nettoie la ref
        // pour qu'une réacquisition reste possible au retour au premier plan.
        sentinel.addEventListener('release', () => {
          if (sentinelRef.current === sentinel) sentinelRef.current = null
        })
      } catch {
        // NotAllowedError (onglet caché, batterie faible, politique système) :
        // on continue sans verrou, l'écran reste parfaitement utilisable.
      }
    }

    const release = () => {
      const sentinel = sentinelRef.current
      sentinelRef.current = null
      if (sentinel) void sentinel.release().catch(() => {})
    }

    // Règle 2 : réacquisition au retour au premier plan, libération en sortie.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void acquire()
      else release()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      // Règle 3 : libération explicite au démontage de l'écran carte.
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      release()
    }
  }, [enabled])
}
