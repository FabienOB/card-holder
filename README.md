# Cartes de fidélité

PWA **offline-first** de gestion de cartes de fidélité, pensée pour un seul contexte d'usage :
on est en caisse, on ouvre la carte, la caissière scanne l'écran. Tout fonctionne en mode avion.

Pas de compte, pas d'authentification, pas de backend. Chaque appareil est autonome ;
le partage entre téléphones de la famille se fait par export / import d'un fichier JSON.

Cible : **Chrome sur Android**, installée via WebAPK.

---

## Commandes

```bash
npm install        # installation des dépendances
npm run dev        # serveur de développement (http://localhost:5173)
npm run build      # build de production dans dist/
npm run preview    # sert le build de production (http://localhost:4173)
npm run typecheck  # vérification TypeScript seule
npm run icons      # régénère les icônes PNG et le favicon dans public/
```

> **Note sur le service worker** : il est désactivé en `dev` (`devOptions.enabled: false`).
> Pour tester le comportement hors ligne, il faut passer par `npm run build && npm run preview`.

## Stack

| Élément | Choix |
| --- | --- |
| UI | React 18 + TypeScript + Vite |
| Persistance | Dexie.js (IndexedDB) |
| Rendu des codes-barres | bwip-js (SVG, synchrone) |
| Scan | `BarcodeDetector` natif, sans bibliothèque tierce |
| PWA | vite-plugin-pwa (Workbox), `registerType: 'autoUpdate'` |
| Styles | Tailwind CSS |

**Aucune ressource n'est chargée depuis un CDN à l'exécution.** Les pictogrammes sont des SVG
inline, les icônes sont générées localement et précachées, et la typographie s'appuie sur les
polices système (`system-ui`, `ui-monospace`) : zéro octet de police à télécharger.

## Structure

```
src/
├── components/     Barcode, CardTile, ScannerView, ColorPicker, LogoPicker, ErrorState
├── db/             db.ts (schéma Dexie) · repository.ts (accès, try/catch systématiques)
├── hooks/          useCards (store) · useWakeLock · useBarcodeScanner · useInstallPrompt
├── lib/            barcode · validation · image · backup · colors · logos
├── screens/        CardView · CardList · CardEdit · Settings
└── types.ts        LoyaltyCard, BarcodeFormat
scripts/
└── generate-icons.mjs   Génère les PNG 192/512 (+ maskable) sans dépendance
```

## Choix d'implémentation notables

### Ouverture de carte instantanée

Les cartes sont chargées **une fois** au démarrage dans un store React (`useCards`).
L'écran d'affichage lit la carte de façon **synchrone** (`getById`), et bwip-js produit le SVG
pendant le rendu via `useMemo`. Résultat : le code-barres est présent dès le premier paint,
sans état de chargement ni reflow. Les dimensions sont exprimées en unités de viewport,
donc aucune mesure JavaScript n'est nécessaire.

### Wake lock

Détaillé en commentaire dans `src/hooks/useWakeLock.ts`. Trois contraintes de l'API :
le verrou ne peut être demandé que si le document est visible, le système le relâche
automatiquement dès le passage en arrière-plan (d'où la réacquisition sur `visibilitychange`),
et il doit être relâché explicitement en sortie d'écran.

### Repli de scan

Détaillé en commentaire dans `src/hooks/useBarcodeScanner.ts`. `BarcodeDetector` est absent de
certains navigateurs : `isScannerSupported()` est testé **avant d'afficher le bouton**, si bien
que l'utilisateur ne voit jamais une fonctionnalité cassée — le formulaire de saisie manuelle
est simplement seul à l'écran. Le refus de permission caméra est traité à part, avec un message
explicite et un bouton vers la saisie manuelle.

### Taille du bundle

`bwip-js` expose un `toSVG({ bcid })` générique qui passe par une table référençant les
~110 symbologies de la bibliothèque, ce qui empêche tout tree-shaking. On importe donc
**une fonction par symbologie** (`ean13`, `code128`, …) avec le backend `drawingSVG()` — le
même que celui utilisé en interne par `toSVG`. Le SVG produit est identique octet pour octet
(vérifié sur les 8 formats), et le bundle passe de **1,25 Mo à 558 Ko** (183 Ko gzip).

### Images

Toute photo importée est redimensionnée à 1200 px sur le grand côté (JPEG 0.8) via `canvas`,
puis stockée en **`Blob`** dans IndexedDB — jamais en base64. La conversion base64 n'a lieu
qu'au moment de l'export JSON.

`navigator.storage.persist()` est appelé au premier lancement pour empêcher l'éviction du cache.

## Sauvegarde et partage entre téléphones

Réglages → **Partager** produit un fichier `cartes-fidelite-AAAA-MM-JJ.json` contenant toutes
les cartes et leurs photos, et ouvre la feuille de partage Android (`navigator.share`) :
messagerie, cloud, autre téléphone — en un seul geste, sans passer par le gestionnaire de
fichiers.

Un bouton **Télécharger le fichier** reste disponible à côté. Si le partage de fichiers n'est
pas supporté par le navigateur, seul le téléchargement est proposé — l'app ne montre jamais
un bouton qui ne marcherait pas.

> **Attention** : c'est la **seule sauvegarde qui existe**. Les données ne quittent jamais
> l'appareil ; elles disparaissent si l'on efface les données de navigation, si l'on
> désinstalle la PWA, ou si l'on perd le téléphone. `navigator.storage.persist()` protège
> contre l'éviction automatique par manque d'espace, pas contre une suppression volontaire.

Réglages → **Choisir un fichier** affiche le nombre de cartes détectées **avant** toute écriture,
puis laisse choisir entre :

- **Fusionner** — les cartes du fichier sont ajoutées ; en cas d'identifiant identique,
  la version du fichier écrase la locale ;
- **Remplacer** — la base locale est vidée puis remplacée.

Les entrées invalides sont écartées et comptées plutôt que de faire échouer tout l'import.

## Déploiement (hébergement statique HTTPS)

`npm run build` produit un dossier `dist/` entièrement statique. Il suffit de le servir tel quel.

**HTTPS est obligatoire** — sans lui, ni le service worker, ni `getUserMedia`, ni le Wake Lock,
ni l'installation de la PWA ne fonctionnent. Seule exception : `http://localhost` en développement.

Le routage est **par hash** (`/#/card/<id>`) : aucune règle de réécriture d'URL n'est à configurer
côté serveur, l'application fonctionne sur n'importe quel hébergeur statique
(GitHub Pages, Netlify, Cloudflare Pages, un simple Nginx…).

Le build utilise des **chemins relatifs** (`base: './'`, `start_url` et `scope` relatifs) :
le même `dist/` fonctionne indifféremment à la racine d'un domaine
(`https://cartes.example.fr/`) ou dans un sous-répertoire
(`https://fabienob.github.io/card-holder/`), sans reconfiguration.

### GitHub Pages

Un workflow `.github/workflows/deploy.yml` construit et publie `dist/` à chaque push sur `main`.
Pour l'activer une seule fois : **Settings → Pages → Source : GitHub Actions**.
L'application est ensuite disponible sur `https://<compte>.github.io/card-holder/`, en HTTPS,
ce qui suffit pour l'installer et la tester sur un téléphone.

### Serveur personnel

Copier le contenu de `dist/` dans la racine servie. Rien d'autre à faire.

### En-têtes recommandés

```nginx
# Le service worker ne doit jamais être servi depuis le cache HTTP.
location = /sw.js {
  add_header Cache-Control "no-cache, no-store, must-revalidate";
}

# Les assets sont hashés : cache long sans risque.
location /assets/ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}
```

La mise à jour est automatique (`registerType: 'autoUpdate'`) : la nouvelle version est
installée en arrière-plan et prend effet au lancement suivant.

## Accessibilité

Cibles tactiles ≥ 44 px, libellés ARIA sur tous les contrôles à icône, contrastes conformes AA
(le voile sombre sur les vignettes photo garantit la lisibilité du nom quelle que soit l'image),
messages d'erreur reliés aux champs via `aria-describedby`.

## Vérifications effectuées

- `npm run build` — typecheck TypeScript strict + build de production : OK.
- Sortie SVG **identique octet pour octet** à `toSVG` sur les 8 formats, après le passage aux
  imports par symbologie.
- Quiet zone mesurée sur le rendu rasterisé : **10 modules** de chaque côté.
- Codes EAN-13 rendus puis **redécodés** par un décodeur indépendant (guards, parité,
  tables L/G/R) : 4/4 corrects, dont un cas UPC-A converti en EAN-13.
- 43 assertions sur la logique pure (checksums EAN-13/EAN-8, jeux de caractères CODE_39 /
  ITF / CODABAR, expansion UPC-E, groupement par 4, aller-retour d'export/import, rejet des
  fichiers étrangers et des entrées corrompues) : toutes vertes.
- 13 assertions sur le partage natif avec API navigateur simulée : partage accepté, annulation
  (`AbortError` → aucun téléchargement parasite), activation expirée (`NotAllowedError` → repli),
  fichiers non partageables, API absente.
- Build audité : aucune URL externe chargée à l'exécution ; app shell entièrement précachée.

L'application **n'a pas pu être testée dans un navigateur** dans cet environnement (pas de
Chrome pilotable). Le parcours tactile réel — scan caméra, wake lock, verrouillage d'orientation,
installation WebAPK — reste donc à valider sur un appareil Android.
