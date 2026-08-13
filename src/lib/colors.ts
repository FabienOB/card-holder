/**
 * 8 teintes prédéfinies. Choisies assez saturées et distinctes les unes des
 * autres pour être identifiables du coin de l'œil sur la grille d'accueil,
 * et assez sombres pour porter du texte blanc en contraste AA.
 */
export interface AccentColor {
  hex: string
  label: string
}

export const COLORS: AccentColor[] = [
  { hex: '#1d4ed8', label: 'Bleu' },
  { hex: '#0f766e', label: 'Turquoise' },
  { hex: '#15803d', label: 'Vert' },
  { hex: '#b45309', label: 'Ambre' },
  { hex: '#b91c1c', label: 'Rouge' },
  { hex: '#be185d', label: 'Rose' },
  { hex: '#6d28d9', label: 'Violet' },
  { hex: '#334155', label: 'Ardoise' },
]

export const DEFAULT_COLOR = COLORS[0].hex

export function isValidHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}
