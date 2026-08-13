import { useEffect, useState } from 'react'

const DISMISSED_KEY = 'ch.install.dismissed'
const VISITS_KEY = 'ch.visits'

/** Nombre de lancements avant de proposer l'installation. */
const MIN_VISITS = 2

export function countVisit(): void {
  try {
    const n = Number(localStorage.getItem(VISITS_KEY) ?? '0')
    localStorage.setItem(VISITS_KEY, String(n + 1))
  } catch {
    /* mode navigation privée : sans importance */
  }
}

function visits(): number {
  try {
    return Number(localStorage.getItem(VISITS_KEY) ?? '0')
  } catch {
    return 0
  }
}

function dismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Le prompt d'installation n'apparaît pas au premier chargement :
 * on attend que l'utilisateur soit revenu (2e lancement) et qu'il ait au
 * moins une carte, c'est-à-dire qu'il ait vu la valeur de l'app.
 */
export function useInstallPrompt(hasCards: boolean) {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [hidden, setHidden] = useState(() => dismissed())

  useEffect(() => {
    const onBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault() // garde la main sur le moment d'affichage
      setEvent(e)
    }
    const onInstalled = () => {
      setEvent(null)
      setHidden(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const canPrompt = !!event && !hidden && hasCards && visits() >= MIN_VISITS

  const promptInstall = async () => {
    if (!event) return
    await event.prompt()
    await event.userChoice
    setEvent(null)
  }

  const dismiss = () => {
    setHidden(true)
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  return { canPrompt, promptInstall, dismiss }
}
