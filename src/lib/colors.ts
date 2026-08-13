/**
 * Teintes prédéfinies, saturées et distinctes les unes des autres pour être
 * identifiables du coin de l'œil sur la grille d'accueil.
 *
 * Les teintes claires (jaune, ambre, bleu ciel…) sont possibles depuis que la
 * couleur du texte est calculée par `readableTextOn` : chaque teinte est
 * vérifiée à ≥ 4,5:1 (AA) avec le texte qui lui est associé — un test
 * automatique échoue si une couleur ajoutée ne respecte pas ce seuil.
 */
export interface AccentColor {
  hex: string
  label: string
}

export const COLORS: AccentColor[] = [
  { hex: '#1D4ED8', label: 'Bleu' },
  { hex: '#4338CA', label: 'Indigo' },
  { hex: '#38BDF8', label: 'Bleu ciel' },
  { hex: '#0891B2', label: 'Cyan' },
  { hex: '#0F766E', label: 'Turquoise' },
  { hex: '#15803D', label: 'Vert' },
  { hex: '#84CC16', label: 'Vert clair' },
  { hex: '#FACC15', label: 'Jaune' },
  { hex: '#F59E0B', label: 'Ambre' },
  { hex: '#EA580C', label: 'Orange' },
  { hex: '#B45309', label: 'Brun' },
  { hex: '#B91C1C', label: 'Rouge' },
  { hex: '#FB7185', label: 'Corail' },
  { hex: '#BE185D', label: 'Rose' },
  { hex: '#C026D3', label: 'Fuchsia' },
  { hex: '#6D28D9', label: 'Violet' },
  { hex: '#64748B', label: 'Gris' },
  { hex: '#334155', label: 'Ardoise' },
]

export const DEFAULT_COLOR = COLORS[0].hex

export function isValidHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

/** Luminance relative WCAG d'une couleur hexadécimale. */
function relativeLuminance(hex: string): number {
  const channel = (value: number) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const r = channel(parseInt(hex.slice(1, 3), 16))
  const g = channel(parseInt(hex.slice(3, 5), 16))
  const b = channel(parseInt(hex.slice(5, 7), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [light, dark] = la > lb ? [la, lb] : [lb, la]
  return (light + 0.05) / (dark + 0.05)
}

const INK = '#111827'
const PAPER = '#FFFFFF'

/**
 * Choisit entre texte clair et texte sombre selon le fond.
 *
 * Indispensable depuis l'introduction des couleurs de marque : les teintes
 * prédéfinies sont toutes sombres (le blanc y passe toujours), mais une
 * enseigne comme La Poste ou McDonald's a un jaune sur lequel du texte blanc
 * tomberait très en dessous du seuil AA.
 */
export function readableTextOn(background: string): string {
  if (!isValidHex(background)) return PAPER
  return contrastRatio(background, PAPER) >= contrastRatio(background, INK) ? PAPER : INK
}
