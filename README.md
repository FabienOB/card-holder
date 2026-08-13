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
npm test           # lance les 5 suites de tests
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

### Catégories

Chaque carte relève d'une catégorie : **Enseignes** (cartes de fidélité) ou **Bocaux** (codes de
tare collés sur un contenant, pour l'achat en vrac). La liste d'accueil propose un filtre
`Toutes / Enseignes / Bocaux`, qui **n'apparaît que si les deux catégories sont utilisées** —
inutile d'encombrer l'écran de quelqu'un qui n'a que des cartes d'enseigne.

Les pictogrammes proposés suivent la catégorie : bocal, boîte et bouteille pour une tare,
les huit commerces pour une enseigne. La reconnaissance d'enseigne est désactivée sur une tare
(« Bocal 500 g » n'est pas un magasin, et une correspondance fortuite serait déroutante).

Le schéma Dexie est passé en **version 2**. Les bases déjà installées sur les téléphones
contiennent des cartes sans catégorie : l'`upgrade` les rattache toutes à « Enseignes », qui
était le seul usage jusque-là. Les sauvegardes JSON exportées avant cette évolution s'importent
sans perte, avec le même repli.

### Migration bloquée

Une migration de schéma IndexedDB ne peut s'appliquer que si **aucune autre connexion** ne tient
l'ancienne version ouverte. Sur Android, une PWA laissée en arrière-plan peut être gelée par le
système : elle ne traite plus l'événement `versionchange`, ne se ferme donc pas, et bloque la
migration indéfiniment.

`openDatabase()` (dans `src/db/db.ts`) borne l'attente et remonte une `DatabaseBlockedError`
avec la marche à suivre — fermer les autres fenêtres — en précisant que les données ne sont pas
perdues. C'est un cas réellement rencontré : sans ce traitement, l'application restait figée sur
un écran vide qui laissait croire à une disparition des cartes.

### Reconnaissance d'enseigne

À la saisie du nom, l'app reconnaît une cinquantaine d'enseignes françaises courantes
(`src/lib/brands.ts`) et applique automatiquement une couleur proche de celle de la marque :
« Picard » → bleu, « Bricomarché » → rouge. La tuile affiche un **monogramme** dérivé du nom
(« Brico Dépôt » → « BD ») quand il n'y a ni photo ni pictogramme.

C'est une **table embarquée** : aucun appel réseau, rien qui sorte du téléphone, et ça marche
en mode avion. Aucun logo de marque n'est reproduit — seule la teinte est reprise, et les
couleurs sont des approximations choisies à l'œil.

La reconnaissance n'écrase jamais un choix explicite : elle ne s'applique qu'aux **nouvelles**
cartes, et s'arrête dès que l'utilisateur touche au sélecteur de couleur. Une enseigne inconnue
laisse simplement la couleur par défaut.

### Couleurs et contraste

La palette compte 18 teintes, dont des claires (jaune, ambre, bleu ciel, corail). C'est possible
parce que la couleur du texte n'est plus figée en blanc : `readableTextOn()` calcule la
luminance relative WCAG du fond et choisit entre texte clair et texte sombre.

Un test automatique vérifie que **chaque** teinte de la palette et **chaque** couleur de marque
atteint le seuil AA (4,5:1) avec le texte qui lui est associé. Il a d'ailleurs servi : deux
couleurs de marque (Decathlon, Subway) tombaient à 4,2 et 4,4:1 et ont été très légèrement
assombries. Ajouter une couleur qui ne respecte pas le seuil fait échouer le test.

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

Cibles tactiles ≥ 44 px, libellés ARIA sur tous les contrôles à icône, messages d'erreur reliés
aux champs via `aria-describedby`.

Contrastes AA garantis par construction : couleur de texte calculée selon la luminance du fond
(vérifiée par test sur toute la palette et toutes les couleurs de marque), et voile sombre sur
les vignettes photo pour que le nom reste lisible quelle que soit l'image.

## Tests

`npm test` — cinq suites, 117 assertions, sans framework : `scripts/run-tests.mjs` bundle chaque
fichier de `tests/` avec esbuild et l'exécute. Le choix de ne pas ajouter de framework va avec
l'esprit du projet, dont l'atout principal est de n'avoir aucune dépendance à l'exécution.

| Suite | Couvre |
| --- | --- |
| `logic` | checksums EAN, jeux de caractères, UPC-E, rendu bwip-js, aller-retour export/import |
| `share` | partage natif et ses replis, avec API navigateur simulée |
| `brands` | reconnaissance d'enseigne + **audit AA de toutes les couleurs** |
| `categories` | catégories, pictogrammes, compatibilité ascendante des sauvegardes |
| `migration` | **migration Dexie v1 → v2** sur une vraie IndexedDB (`fake-indexeddb`) |
| `blocked` | **migration bloquée** par une autre connexion : erreur remontée, pas de blocage infini, données intactes |

La suite tourne dans le workflow de déploiement, avant le build : un échec bloque la mise en
ligne. La migration est la plus critique — une régression y ferait disparaître des cartes sur
les téléphones déjà équipés.

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
- 25 assertions sur la reconnaissance d'enseigne et le contraste : correspondance insensible à
  la casse et aux accents, clé la plus longue prioritaire, monogrammes, et **audit AA de la
  totalité des couleurs** (palette + marques). Pire cas mesuré : 4,52:1 (marques), 4,71:1
  (palette), pour un seuil à 4,5:1.
- Build audité : aucune URL externe chargée à l'exécution ; app shell entièrement précachée.

L'application **n'a pas pu être testée dans un navigateur** dans cet environnement (pas de
Chrome pilotable). Le parcours tactile réel — scan caméra, wake lock, verrouillage d'orientation,
installation WebAPK — reste donc à valider sur un appareil Android.
