// Simule une base v1 déjà installée sur un téléphone, puis vérifie que
// l'ouverture en v2 rattache bien toutes les cartes à « Enseignes ».
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { CardHolderDB } from '../src/db/db'
import { listCards } from '../src/db/repository'

let pass=0, fail=0
const check=(l:string,a:unknown,e:unknown)=>{
  if(JSON.stringify(a)===JSON.stringify(e)) pass++
  else { fail++; console.log(`ECHEC ${l}\n  attendu ${JSON.stringify(e)}\n  obtenu  ${JSON.stringify(a)}`) }
}

const run = async () => {
  // --- 1. Base v1, telle qu'elle existe aujourd'hui sur le téléphone ---
  const v1 = new Dexie('card-holder')
  v1.version(1).stores({ cards: 'id, name, lastUsedAt, createdAt' })
  await v1.open()
  await v1.table('cards').bulkAdd([
    { id:'a', name:'Carrefour', code:'5901234123457', format:'EAN_13', color:'#1d4ed8', createdAt:1, usageCount:5, lastUsedAt:99 },
    { id:'b', name:'Fnac', code:'96385074', format:'EAN_8', color:'#b45309', createdAt:2, usageCount:0 },
  ])
  const before = await v1.table('cards').toArray()
  check('v1 : 2 cartes, aucune catégorie', before.map(c=>c.category), [undefined, undefined])
  v1.close()

  // --- 2. Ouverture par la nouvelle version de l'app -------------------
  const db = new CardHolderDB()
  await db.open()
  check('v2 : version de schéma', db.verno, 2)

  const after = await db.cards.orderBy('id').toArray()
  check('v2 : aucune carte perdue', after.length, 2)
  check('v2 : catégories rétro-remplies', after.map(c=>c.category), ['store','store'])
  check('v2 : noms intacts', after.map(c=>c.name), ['Carrefour','Fnac'])
  check('v2 : codes intacts', after.map(c=>c.code), ['5901234123457','96385074'])
  check('v2 : compteur d’usage intact', after[0].usageCount, 5)
  check('v2 : lastUsedAt intact', after[0].lastUsedAt, 99)
  check('v2 : couleur intacte', after[1].color, '#b45309')

  // --- 3. L'index category est utilisable -----------------------------
  const stores = await db.cards.where('category').equals('store').toArray()
  check('index category interrogeable', stores.length, 2)

  // --- 4. Une tare cohabite avec les cartes migrées --------------------
  await db.cards.put({ id:'c', name:'Bocal 500 g', code:'2000123456789', format:'EAN_13',
    category:'tare', logoId:'jar', color:'#0F766E', createdAt:3, usageCount:0 })
  check('tare enregistrée', (await db.cards.where('category').equals('tare').toArray()).length, 1)
  check('total après ajout', await db.cards.count(), 3)

  // --- 5. Lecture via le repository (filet de sécurité) ---------------
  const listed = await listCards()
  check('repository : 3 cartes', listed.length, 3)
  check('repository : toutes catégorisées', listed.every(c=>c.category==='store'||c.category==='tare'), true)

  console.log(`\n${pass} réussis, ${fail} échoués`)
  if (fail) process.exit(1)
}
void run().catch(e => { console.error('ERREUR', e); process.exit(1) })
