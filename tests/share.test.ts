import { buildBackup, shareOrDownloadBackup } from '../src/lib/backup'
import type { LoyaltyCard } from '../src/types'

let downloads = 0
let shared: any = null

// --- stubs navigateur -------------------------------------------------
;(globalThis as any).URL.createObjectURL = () => 'blob:stub'
;(globalThis as any).URL.revokeObjectURL = () => {}
;(globalThis as any).document = {
  createElement: () => ({ href:'', download:'', click(){ downloads++ }, remove(){} }),
  body: { appendChild(){} },
}

function setNavigator(opts: { share?: (d:any)=>Promise<void>, canShare?: (d:any)=>boolean }) {
  Object.defineProperty(globalThis, 'navigator', { value: { ...opts }, configurable: true, writable: true })
}

const cards: LoyaltyCard[] = [{
  id:'a', name:'Carrefour', code:'5901234123457', format:'EAN_13',
  color:'#1d4ed8', createdAt:1, usageCount:0,
}]

let pass=0, fail=0
const check=(l:string,a:unknown,e:unknown)=>{
  if(JSON.stringify(a)===JSON.stringify(e)) pass++
  else { fail++; console.log(`ECHEC ${l}\n  attendu ${JSON.stringify(e)}\n  obtenu  ${JSON.stringify(a)}`) }
}

const run = async () => {
  const backup = await buildBackup(cards)

  // 1. Partage accepté
  downloads=0; shared=null
  setNavigator({ canShare: () => true, share: async (d) => { shared=d } })
  check('partage accepté → shared', await shareOrDownloadBackup(backup), 'shared')
  check('  aucun téléchargement parasite', downloads, 0)
  check('  un fichier joint', shared.files.length, 1)
  check('  nom de fichier', /^cartes-fidelite-\d{4}-\d{2}-\d{2}\.json$/.test(shared.files[0].name), true)
  check('  type MIME', shared.files[0].type, 'application/json')

  // 2. Annulation utilisateur → surtout pas de téléchargement
  downloads=0
  setNavigator({ canShare: () => true, share: async () => { throw new DOMException('x','AbortError') } })
  check('annulation → cancelled', await shareOrDownloadBackup(backup), 'cancelled')
  check('  aucun téléchargement après annulation', downloads, 0)

  // 3. Activation expirée → repli téléchargement
  downloads=0
  setNavigator({ canShare: () => true, share: async () => { throw new DOMException('x','NotAllowedError') } })
  check('NotAllowedError → downloaded', await shareOrDownloadBackup(backup), 'downloaded')
  check('  téléchargement déclenché', downloads, 1)

  // 4. canShare refuse les fichiers
  downloads=0
  setNavigator({ canShare: () => false, share: async () => {} })
  check('fichiers non partageables → downloaded', await shareOrDownloadBackup(backup), 'downloaded')
  check('  téléchargement déclenché', downloads, 1)

  // 5. API absente
  downloads=0
  setNavigator({})
  check('API absente → downloaded', await shareOrDownloadBackup(backup), 'downloaded')
  check('  téléchargement déclenché', downloads, 1)

  console.log(`\n${pass} réussis, ${fail} échoués`)
  if (fail) process.exit(1)
}
void run()
