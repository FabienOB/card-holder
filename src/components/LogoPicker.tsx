import { LOGOS } from '../lib/logos'

interface Props {
  value?: string
  onChange: (logoId: string | undefined) => void
}

/**
 * Proposé uniquement quand la carte n'a pas de photo : donne quand même
 * un repère visuel à la tuile d'accueil.
 */
export function LogoPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Pictogramme de la carte">
      {LOGOS.map((logo) => {
        const selected = value === logo.id
        return (
          <button
            key={logo.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={logo.label}
            // Un second appui désélectionne.
            onClick={() => onChange(selected ? undefined : logo.id)}
            className={`flex min-h-touch flex-col items-center gap-1 rounded-lg border p-2 ${
              selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-600'
            }`}
          >
            {logo.render({ className: 'h-7 w-7' })}
            <span className="text-[10px] leading-tight">{logo.label}</span>
          </button>
        )
      })}
    </div>
  )
}
