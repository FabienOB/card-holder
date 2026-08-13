import { BRANDS, findBrand, monogramOf, normalizeBrandKey } from '../src/lib/brands'
import { COLORS, contrastRatio, readableTextOn } from '../src/lib/colors'

let pass=0, fail=0
const check=(l:string,a:unknown,e:unknown)=>{
  if(JSON.stringify(a)===JSON.stringify(e)) pass++
  else { fail++; console.log(`ECHEC ${l}\n  attendu ${JSON.stringify(e)}\n  obtenu  ${JSON.stringify(a)}`) }
}

// --- Reconnaissance --------------------------------------------------
check('Picard', findBrand('Picard')?.label, 'Picard')
check('casse ignorée', findBrand('picard')?.label, 'Picard')
check('nom composé', findBrand('Carte Picard surgelés')?.label, 'Picard')
check('accents ignorés', findBrand('Bricomarché')?.label, 'Bricomarché')
check('sans accent', findBrand('bricomarche')?.label, 'Bricomarché')
check('espaces ignorés', findBrand('Brico Depot')?.label, 'Brico Dépôt')
check('clé la plus longue gagne', findBrand('brico depot')?.label, 'Brico Dépôt')
check('Super U', findBrand('Super U')?.label, 'Super U')
check('Leroy Merlin', findBrand('leroy merlin')?.label, 'Leroy Merlin')
check('E.Leclerc', findBrand('E.Leclerc')?.label, 'E.Leclerc')
check('inconnue', findBrand('Boucherie Dupont'), undefined)
check('vide', findBrand(''), undefined)
check('une lettre', findBrand('P'), undefined)
check('normalisation', normalizeBrandKey('Brico Dépôt !'), 'bricodepot')

// --- Monogramme ------------------------------------------------------
check('monogramme simple', monogramOf('Picard'), 'P')
check('monogramme composé', monogramOf('Brico Dépôt'), 'BD')
check('monogramme point', monogramOf('E.Leclerc'), 'EL')
check('monogramme vide', monogramOf('   '), '?')
check('monogramme minuscules', monogramOf('yves rocher'), 'YR')

// --- Contraste : le point critique -----------------------------------
const AA = 4.5
let worstBrand = { label:'', ratio: Infinity, text:'' }
for (const b of BRANDS) {
  const text = readableTextOn(b.color)
  const ratio = contrastRatio(b.color, text)
  if (ratio < worstBrand.ratio) worstBrand = { label:b.label, ratio, text }
  if (ratio < AA) { fail++; console.log(`ECHEC contraste ${b.label} ${b.color} + ${text} = ${ratio.toFixed(2)}:1`) }
}
if (worstBrand.ratio >= AA) pass++
console.log(`\ncontraste le plus faible (marques) : ${worstBrand.label} → ${worstBrand.ratio.toFixed(2)}:1 avec ${worstBrand.text}`)

let worstPalette = { label:'', ratio: Infinity }
for (const c of COLORS) {
  const ratio = contrastRatio(c.hex, readableTextOn(c.hex))
  if (ratio < worstPalette.ratio) worstPalette = { label:c.label, ratio }
  if (ratio < AA) { fail++; console.log(`ECHEC contraste palette ${c.label}`) }
}
if (worstPalette.ratio >= AA) pass++
console.log(`contraste le plus faible (palette) : ${worstPalette.label} → ${worstPalette.ratio.toFixed(2)}:1`)

// Les teintes claires doivent bien basculer en texte sombre.
check('jaune La Poste → texte sombre', readableTextOn('#FFCC00'), '#111827')
check('bleu Picard → texte blanc', readableTextOn('#003DA5'), '#FFFFFF')
check('hex invalide → blanc par défaut', readableTextOn('rouge'), '#FFFFFF')

// Pas de doublon de clé.
const keys = BRANDS.map(b=>b.key)
check('aucune clé en double', keys.length, new Set(keys).size)

console.log(`\n${pass} réussis, ${fail} échoués`)
if (fail) process.exit(1)
