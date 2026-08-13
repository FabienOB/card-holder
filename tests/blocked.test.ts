/**
 * Reproduit le scénario qui a fait croire à une perte de données :
 * une autre connexion garde la base v1 ouverte, la migration v2 est bloquée.
 *
 * L'application doit alors remonter une erreur exploitable — surtout pas
 * rester en chargement indéfini avec un écran laissant croire que les cartes
 * ont disparu. Et les données doivent être intactes une fois débloquées.
 */
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { db, openDatabase, DatabaseBlockedError } from '../src/db/db'
import { listCards } from '../src/db/repository'

let pass = 0
let fail = 0
const check = (l: string, a: unknown, e: unknown) => {
  if (JSON.stringify(a) === JSON.stringify(e)) pass++
  else {
    fail++
    console.log(`ECHEC ${l}\n  attendu ${JSON.stringify(e)}\n  obtenu  ${JSON.stringify(a)}`)
  }
}

const run = async () => {
  // --- Une base v1 déjà remplie, comme sur le téléphone ---------------
  const seed = new Dexie('card-holder')
  seed.version(1).stores({ cards: 'id, name, lastUsedAt, createdAt' })
  await seed.open()
  await seed.table('cards').bulkAdd([
    { id: 'a', name: 'Carrefour', code: '5901234123457', format: 'EAN_13', color: '#1d4ed8', createdAt: 1, usageCount: 3 },
    { id: 'b', name: 'Picard', code: '96385074', format: 'EAN_8', color: '#003DA5', createdAt: 2, usageCount: 1 },
  ])
  seed.close()

  /*
   * Connexion **brute**, sans gestionnaire `versionchange` : c'est la
   * simulation fidèle d'une PWA gelée par Android, dont plus aucun code ne
   * s'exécute. Passer par Dexie ne conviendrait pas — sa gestion par défaut
   * ferme la connexion et laisserait la migration passer.
   */
  const holder = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('card-holder')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  // --- La nouvelle version tente d'ouvrir en v2 -----------------------
  const started = Date.now()
  let caught: unknown = null
  try {
    await openDatabase(1_000)
  } catch (e) {
    caught = e
  }
  const elapsed = Date.now() - started

  check('une erreur est remontée', caught instanceof DatabaseBlockedError, true)
  check('le message est exploitable', /Fermez les autres onglets/.test((caught as Error)?.message ?? ''), true)
  check('le message rassure sur les données', /ne sont pas perdues/.test((caught as Error)?.message ?? ''), true)
  check('pas de blocage indéfini', elapsed < 5_000, true)

  // --- L'autre connexion se ferme : tout doit revenir -----------------
  holder.close()
  await openDatabase(5_000)
  const cards = await listCards()
  check('les cartes sont intactes', cards.length, 2)
  check('noms préservés', cards.map((c) => c.name).sort(), ['Carrefour', 'Picard'])
  check('compteur d’usage préservé', cards.find((c) => c.id === 'a')?.usageCount, 3)
  check('migration appliquée après déblocage', cards.every((c) => c.category === 'store'), true)

  db.close()
  console.log(`\n${pass} réussis, ${fail} échoués`)
  if (fail) process.exit(1)
}

void run().catch((e) => {
  console.error('ERREUR', e)
  process.exit(1)
})
