/**
 * Reconnaissance d'enseigne par le nom saisi.
 *
 * Objectif : donner à la tuile d'accueil une couleur proche de celle de la
 * marque, pour qu'on repère sa carte sans lire. **Aucun appel réseau** — la
 * table est embarquée, la reconnaissance est instantanée et fonctionne en
 * mode avion.
 *
 * Les couleurs sont des **approximations** de la charte de chaque enseigne,
 * choisies à l'œil. Ce ne sont pas des références officielles, et aucun logo
 * de marque n'est reproduit : seule la teinte est reprise, avec le monogramme
 * dérivé du nom saisi.
 *
 * Une enseigne absente de la table n'est pas un problème : la carte garde la
 * couleur choisie par l'utilisateur dans la palette prédéfinie.
 *
 * Chaque teinte est vérifiée en contraste AA par un test automatique : deux
 * couleurs de marque (Decathlon, Subway) ont d'ailleurs été très légèrement
 * assombries pour franchir le seuil, sans changement perceptible.
 */
export interface Brand {
  /** Clé normalisée cherchée dans le nom saisi (sans accent ni espace). */
  key: string
  label: string
  color: string
}

export const BRANDS: Brand[] = [
  // Grande distribution
  { key: 'carrefour', label: 'Carrefour', color: '#004E9F' },
  { key: 'leclerc', label: 'E.Leclerc', color: '#0066B3' },
  { key: 'intermarche', label: 'Intermarché', color: '#E2001A' },
  { key: 'superu', label: 'Super U', color: '#E30613' },
  { key: 'hyperu', label: 'Hyper U', color: '#E30613' },
  { key: 'auchan', label: 'Auchan', color: '#E2001A' },
  { key: 'lidl', label: 'Lidl', color: '#0050AA' },
  { key: 'aldi', label: 'Aldi', color: '#00447C' },
  { key: 'casino', label: 'Casino', color: '#E30613' },
  { key: 'monoprix', label: 'Monoprix', color: '#E5007D' },
  { key: 'franprix', label: 'Franprix', color: '#8CC63F' },
  { key: 'cora', label: 'Cora', color: '#E2001A' },
  { key: 'geant', label: 'Géant', color: '#E30613' },
  { key: 'grandfrais', label: 'Grand Frais', color: '#0F7B3E' },
  { key: 'picard', label: 'Picard', color: '#003DA5' },
  { key: 'biocoop', label: 'Biocoop', color: '#7AB51D' },
  { key: 'naturalia', label: 'Naturalia', color: '#6CB33F' },

  // Bricolage / maison
  { key: 'bricomarche', label: 'Bricomarché', color: '#E2001A' },
  { key: 'bricodepot', label: 'Brico Dépôt', color: '#F39200' },
  { key: 'leroymerlin', label: 'Leroy Merlin', color: '#78BE20' },
  { key: 'castorama', label: 'Castorama', color: '#0072CE' },
  { key: 'mrbricolage', label: 'Mr Bricolage', color: '#E2001A' },
  { key: 'weldom', label: 'Weldom', color: '#E2001A' },
  { key: 'ikea', label: 'IKEA', color: '#0058A3' },
  { key: 'conforama', label: 'Conforama', color: '#0055A5' },
  { key: 'maisonsdumonde', label: 'Maisons du Monde', color: '#2B2B2B' },
  { key: 'gifi', label: 'Gifi', color: '#E2001A' },
  { key: 'action', label: 'Action', color: '#003DA5' },

  // Culture / high-tech
  { key: 'fnac', label: 'Fnac', color: '#E1A200' },
  { key: 'darty', label: 'Darty', color: '#E2001A' },
  { key: 'boulanger', label: 'Boulanger', color: '#C8102E' },
  { key: 'cultura', label: 'Cultura', color: '#E94E1B' },

  // Sport
  { key: 'decathlon', label: 'Decathlon', color: '#007DBB' },
  { key: 'intersport', label: 'Intersport', color: '#003DA6' },
  { key: 'gosport', label: 'Go Sport', color: '#E2001A' },

  // Beauté / santé
  { key: 'sephora', label: 'Sephora', color: '#1A1A1A' },
  { key: 'marionnaud', label: 'Marionnaud', color: '#C8102E' },
  { key: 'nocibe', label: 'Nocibé', color: '#E5007D' },
  { key: 'yvesrocher', label: 'Yves Rocher', color: '#007A3D' },

  // Habillement
  { key: 'kiabi', label: 'Kiabi', color: '#E2007A' },
  { key: 'zara', label: 'Zara', color: '#1A1A1A' },
  { key: 'celio', label: 'Celio', color: '#1A1A1A' },
  { key: 'jules', label: 'Jules', color: '#003DA5' },

  // Carburant
  { key: 'total', label: 'TotalEnergies', color: '#ED0000' },
  { key: 'esso', label: 'Esso', color: '#CE1126' },
  { key: 'bp', label: 'BP', color: '#009B3A' },

  // Restauration
  { key: 'mcdonald', label: "McDonald's", color: '#FFC72C' },
  { key: 'burgerking', label: 'Burger King', color: '#D62300' },
  { key: 'kfc', label: 'KFC', color: '#A3080C' },
  { key: 'starbucks', label: 'Starbucks', color: '#00704A' },
  { key: 'subway', label: 'Subway', color: '#008915' },
  { key: 'paul', label: 'Paul', color: '#00293C' },

  // Services
  { key: 'laposte', label: 'La Poste', color: '#FFCC00' },
  { key: 'sncf', label: 'SNCF', color: '#8D1B3D' },
]

/** Normalise pour la comparaison : sans accent, sans espace, minuscules. */
export function normalizeBrandKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Cherche l'enseigne correspondant au nom saisi.
 * La clé la plus longue gagne, pour que « Brico Dépôt » ne soit pas capté
 * par une clé plus courte qui serait incluse dedans.
 */
export function findBrand(name: string): Brand | undefined {
  const needle = normalizeBrandKey(name)
  if (needle.length < 2) return undefined

  let best: Brand | undefined
  for (const brand of BRANDS) {
    if (brand.key.length >= 2 && needle.includes(brand.key)) {
      if (!best || brand.key.length > best.key.length) best = brand
    }
  }
  return best
}

/**
 * Monogramme affiché sur la tuile : une lettre pour un nom simple,
 * deux pour un nom composé (« Brico Dépôt » → « BD »).
 */
export function monogramOf(name: string): string {
  const words = name
    .trim()
    .split(/[\s'’.\-_]+/)
    .filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}
