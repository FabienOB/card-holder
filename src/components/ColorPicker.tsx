import { COLORS } from '../lib/colors'

export function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Couleur de la carte">
      {COLORS.map((color) => {
        const selected = value.toLowerCase() === color.hex.toLowerCase()
        return (
          <button
            key={color.hex}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color.label}
            onClick={() => onChange(color.hex)}
            className={`h-11 w-11 rounded-full ${
              selected ? 'ring-2 ring-slate-900 ring-offset-2' : ''
            }`}
            style={{ backgroundColor: color.hex }}
          >
            {selected && (
              <svg viewBox="0 0 24 24" className="mx-auto h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        )
      })}
    </div>
  )
}
