/**
 * État d'erreur exploitable : on dit ce qui s'est passé et on propose
 * une action. Jamais d'écran blanc muet.
 */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center" role="alert">
      <svg viewBox="0 0 24 24" className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.5" strokeLinecap="round" />
        <circle cx="12" cy="16.5" r="0.9" fill="currentColor" stroke="none" />
      </svg>
      <p className="text-slate-700">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="min-h-touch rounded-lg bg-slate-800 px-5 py-3 text-white">
          Réessayer
        </button>
      )}
    </div>
  )
}
