import { validateCode, eanCheckDigit, groupByFour, guessFormat } from '../src/lib/validation'
import { expandUpcE, fromDetectedFormat, renderBarcodeSVG } from '../src/lib/barcode'
import { parseBackup, buildBackup } from '../src/lib/backup'
import { DEFAULT_COLOR, isValidHex, readableTextOn } from '../src/lib/colors'
import type { LoyaltyCard } from '../src/types'

let pass = 0
let fail = 0
function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) {
    pass++
  } else {
    fail++
    console.log(`ECHEC  ${label}\n       attendu ${e}\n       obtenu  ${a}`)
  }
}

// --- Checksums EAN ---------------------------------------------------
check('EAN-13 valide', validateCode('5901234123457', 'EAN_13'), null)
check('EAN-13 clé fausse', typeof validateCode('5901234123458', 'EAN_13'), 'string')
check('EAN-13 trop court', typeof validateCode('590123412345', 'EAN_13'), 'string')
check('EAN-13 non numérique', typeof validateCode('59012341234A', 'EAN_13'), 'string')
check('EAN-8 valide', validateCode('96385074', 'EAN_8'), null)
check('EAN-8 clé fausse', typeof validateCode('96385075', 'EAN_8'), 'string')
check('clé calculée 590123412345', eanCheckDigit('590123412345'), 7)
check('clé calculée 9638507', eanCheckDigit('9638507'), 4)

// --- CODE_39 / ITF / CODABAR ----------------------------------------
check('CODE_39 valide', validateCode('HELLO 123', 'CODE_39'), null)
check('CODE_39 minuscules refusées', typeof validateCode('hello', 'CODE_39'), 'string')
check('CODE_39 symbole interdit', typeof validateCode('AB@CD', 'CODE_39'), 'string')
check('ITF pair', validateCode('12345670', 'ITF'), null)
check('ITF impair refusé', typeof validateCode('1234567', 'ITF'), 'string')
check('CODABAR valide', validateCode('A12345B', 'CODABAR'), null)
check('CODABAR sans délimiteur', typeof validateCode('12345', 'CODABAR'), 'string')
check('code vide refusé', typeof validateCode('', 'EAN_13'), 'string')

// --- Groupement par 4 ------------------------------------------------
check('groupByFour 13 chiffres', groupByFour('5901234123457'), '5901 2341 2345 7')
check('groupByFour 8 chiffres', groupByFour('96385074'), '9638 5074')
check('guessFormat EAN-13', guessFormat('5901234123457'), 'EAN_13')
check('guessFormat repli', guessFormat('ABC123'), 'CODE_128')

// --- UPC-E → UPC-A ---------------------------------------------------
// Cas de référence : 01278907 se déploie en 012000007897.
check('UPC-E 8 chiffres', expandUpcE('01278907'), '012000007897')
check('UPC-E non numérique', expandUpcE('0127890A'), null)
check('UPC-A → EAN-13 (préfixe 0)', fromDetectedFormat('upc_a', '012000007897'), {
  code: '0012000007897',
  format: 'EAN_13',
})
check('ean_13 natif', fromDetectedFormat('ean_13', '5901234123457'), {
  code: '5901234123457',
  format: 'EAN_13',
})
check('format inconnu ignoré', fromDetectedFormat('pdf417', 'x'), null)

// --- Rendu barcode ---------------------------------------------------
const okRender = renderBarcodeSVG('5901234123457', 'EAN_13')
check('rendu EAN-13 sans erreur', okRender.error, null)
check('rendu EAN-13 produit un SVG', okRender.svg.startsWith('<svg'), true)
check('quiet zone appliquée (viewBox élargi)', /viewBox="0 0 346 /.test(okRender.svg), true)
check('preserveAspectRatio linéaire', okRender.svg.includes('preserveAspectRatio="none"'), true)
const qr = renderBarcodeSVG('https://example.org', 'QR_CODE')
check('QR garde son ratio', qr.svg.includes('preserveAspectRatio="xMidYMid meet"'), true)
// Un code invalide doit produire une erreur exploitable, pas une exception.
const badRender = renderBarcodeSVG('123', 'EAN_13')
check('rendu invalide → message', typeof badRender.error, 'string')
check('rendu invalide → pas de SVG', badRender.svg, '')
// Appels répétés : vérifie qu'aucune option n'est mutée entre deux rendus.
const r1 = renderBarcodeSVG('5901234123457', 'EAN_13').svg
const r2 = renderBarcodeSVG('5901234123457', 'EAN_13').svg
check('rendu idempotent (pas de mutation d’options)', r1 === r2, true)

// --- Sauvegarde ------------------------------------------------------
const sample: LoyaltyCard[] = [
  {
    id: 'abc',
    name: 'Carrefour',
    code: '5901234123457',
    format: 'EAN_13',
    category: 'store',
    color: '#1d4ed8',
    createdAt: 1000,
    usageCount: 3,
    lastUsedAt: 2000,
    notes: 'carte famille',
  },
]

const roundTrip = async () => {
  const backup = await buildBackup(sample)
  const json = JSON.stringify(backup)
  const parsed = parseBackup(json)
  check('aller-retour : 1 carte', parsed.cards.length, 1)
  check('aller-retour : rien ignoré', parsed.skipped, 0)
  check('aller-retour : code préservé', parsed.cards[0].code, '5901234123457')
  check('aller-retour : notes préservées', parsed.cards[0].notes, 'carte famille')
  check('aller-retour : usageCount préservé', parsed.cards[0].usageCount, 3)

  // Fichier étranger refusé.
  let rejected = false
  try {
    parseBackup(JSON.stringify({ format: 'autre-app', cards: [] }))
  } catch {
    rejected = true
  }
  check('sauvegarde étrangère refusée', rejected, true)

  let badJson = false
  try {
    parseBackup('{pas du json')
  } catch {
    badJson = true
  }
  check('JSON invalide refusé', badJson, true)

  // Entrées corrompues écartées, entrées valides conservées.
  const mixed = parseBackup(
    JSON.stringify({
      format: 'card-holder-backup',
      version: 1,
      exportedAt: 1,
      cards: [
        { id: 'ok', name: 'Fnac', code: '96385074', format: 'EAN_8', color: '#15803d', createdAt: 1, usageCount: 0 },
        { id: 'x', name: '', code: '1', format: 'EAN_8', color: '#15803d', createdAt: 1, usageCount: 0 },
        { id: 'y', name: 'Sans format', code: '1', format: 'INCONNU', color: '#000000', createdAt: 1, usageCount: 0 },
        { name: 'Sans id', code: '1', format: 'EAN_8', color: '#000000', createdAt: 1, usageCount: 0 },
        'pas un objet',
      ],
    }),
  )
  check('entrées valides conservées', mixed.cards.length, 1)
  check('entrées invalides comptées', mixed.skipped, 4)
  check('couleur invalide remplacée par défaut', parseBackup(
    JSON.stringify({
      format: 'card-holder-backup', version: 1, exportedAt: 1,
      cards: [{ id: 'c', name: 'X', code: '1', format: 'CODE_128', color: 'rouge', createdAt: 1, usageCount: 0 }],
    }),
  ).cards[0].color, DEFAULT_COLOR)

  // Compatibilité des cartes déjà enregistrées : les couleurs historiques
  // étaient en minuscules, tout doit continuer à fonctionner.
  check('hex minuscule accepté', isValidHex('#1d4ed8'), true)
  check('contraste insensible à la casse', readableTextOn('#1d4ed8'), readableTextOn('#1D4ED8'))
  check('couleur historique préservée à l’import', parseBackup(
    JSON.stringify({
      format: 'card-holder-backup', version: 1, exportedAt: 1,
      cards: [{ id: 'h', name: 'Ancienne', code: '1', format: 'CODE_128', color: '#0f766e', createdAt: 1, usageCount: 0 }],
    }),
  ).cards[0].color, '#0f766e')

  console.log(`\n${pass} réussis, ${fail} échoués`)
  if (fail > 0) process.exit(1)
}

void roundTrip()
