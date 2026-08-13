import { parseBackup, buildBackup } from '../src/lib/backup'
import { LOGOS, logosForCategory, LOGO_BY_ID } from '../src/lib/logos'
import { isCardCategory, CARD_CATEGORIES, type LoyaltyCard } from '../src/types'

let pass=0, fail=0
const check=(l:string,a:unknown,e:unknown)=>{
  if(JSON.stringify(a)===JSON.stringify(e)) pass++
  else { fail++; console.log(`ECHEC ${l}\n  attendu ${JSON.stringify(e)}\n  obtenu  ${JSON.stringify(a)}`) }
}

// --- Garde de type ---------------------------------------------------
check('store valide', isCardCategory('store'), true)
check('tare valide', isCardCategory('tare'), true)
check('valeur inconnue', isCardCategory('bocaux'), false)
check('undefined', isCardCategory(undefined), false)

// --- Pictogrammes ----------------------------------------------------
check('4 pictos de contenant', logosForCategory('tare').map(l=>l.id), ['jar','box','bottle','bag'])
check('16 pictos d’enseigne', logosForCategory('store').length, 16)
// Les id sont persistés en base : les renommer ferait disparaître le
// pictogramme des cartes déjà enregistrées.
check('id historiques intacts',
  ['supermarket','pharmacy','fuel','books','sport','beauty','restaurant','diy','jar','box','bottle']
    .every(id => LOGO_BY_ID.has(id)), true)
check('nouveaux pictos présents',
  ['frozen','bakery','clothing','optical','tech','garden','home','pets','bag']
    .every(id => LOGO_BY_ID.has(id)), true)
check('aucun id de picto en double', LOGOS.length, new Set(LOGOS.map(l=>l.id)).size)
check('tous les pictos ont une catégorie valide', LOGOS.every(l=>isCardCategory(l.category)), true)
check('les contenants sont indexés', ['jar','box','bottle','bag'].every(id=>LOGO_BY_ID.has(id)), true)

// --- Compatibilité ascendante des sauvegardes ------------------------
// Une sauvegarde exportée AVANT l'ajout des catégories n'a pas le champ.
const legacy = parseBackup(JSON.stringify({
  format: 'card-holder-backup', version: 1, exportedAt: 1,
  cards: [{ id:'old', name:'Carrefour', code:'5901234123457', format:'EAN_13',
            color:'#1d4ed8', createdAt:1, usageCount:2 }],
}))
check('sauvegarde ancienne : 1 carte conservée', legacy.cards.length, 1)
check('sauvegarde ancienne : rattachée aux enseignes', legacy.cards[0].category, 'store')
check('sauvegarde ancienne : rien ignoré', legacy.skipped, 0)

// Catégorie invalide dans un fichier bricolé → repli, sans perdre la carte.
const bogus = parseBackup(JSON.stringify({
  format: 'card-holder-backup', version: 1, exportedAt: 1,
  cards: [{ id:'x', name:'Truc', code:'1', format:'CODE_128', category:'bocaux',
            color:'#1D4ED8', createdAt:1, usageCount:0 }],
}))
check('catégorie invalide → repli store', bogus.cards[0].category, 'store')
check('catégorie invalide → carte conservée', bogus.skipped, 0)

// --- Aller-retour avec une tare --------------------------------------
const cards: LoyaltyCard[] = [
  { id:'a', name:'Carrefour', code:'5901234123457', format:'EAN_13', category:'store',
    color:'#1D4ED8', createdAt:1, usageCount:0 },
  { id:'b', name:'Bocal 500 g', code:'2000123456789', format:'EAN_13', category:'tare',
    logoId:'jar', color:'#0F766E', createdAt:2, usageCount:0 },
]
const run = async () => {
  const parsed = parseBackup(JSON.stringify(await buildBackup(cards)))
  check('aller-retour : 2 cartes', parsed.cards.length, 2)
  check('aller-retour : catégories préservées', parsed.cards.map(c=>c.category), ['store','tare'])
  check('aller-retour : picto bocal préservé', parsed.cards[1].logoId, 'jar')

  // Filtrage par catégorie, comme dans la liste.
  for (const cat of CARD_CATEGORIES) {
    check(`filtre ${cat}`, parsed.cards.filter(c=>c.category===cat).length, 1)
  }

  console.log(`\n${pass} réussis, ${fail} échoués`)
  if (fail) process.exit(1)
}
void run()
