# Explication detaillee du Back_eval

## Objectif global

L'application Back_eval est un back-office simplifie pour PrestaShop 8. Elle fournit une interface unique pour:

- Authentification locale de demonstration (login rapide) et protection des routes.
- Nettoyage des donnees par groupes respectant les dependances (FK).
- Import massif de fichiers tableur (CSV, TSV, Excel) avec mapping des colonnes.
- Import d'images via ZIP, avec association automatique aux produits.
- Consultation et mise a jour rapide du statut des commandes.

Les points d'entree et flux principaux sont coordonnes par le hook applicatif dans [Back_eval/src/hooks/useBackOffice.ts](Back_eval/src/hooks/useBackOffice.ts), qui orchestre les appels API, les logs et les etats de chargement.

## Architecture et roles des couches

L'architecture suit une separation claire:

- Presentation: pages et composants UI
  - [Back_eval/src/pages/Login.tsx](Back_eval/src/pages/Login.tsx), [Back_eval/src/pages/Dashboard.tsx](Back_eval/src/pages/Dashboard.tsx), [Back_eval/src/pages/ControlCenter.tsx](Back_eval/src/pages/ControlCenter.tsx), [Back_eval/src/pages/OrdersPage.tsx](Back_eval/src/pages/OrdersPage.tsx)
  - [Back_eval/src/components/UploadCard.tsx](Back_eval/src/components/UploadCard.tsx), [Back_eval/src/components/CsvDropzone.tsx](Back_eval/src/components/CsvDropzone.tsx), [Back_eval/src/components/ZipUploader.tsx](Back_eval/src/components/ZipUploader.tsx), [Back_eval/src/components/ResetPanel.tsx](Back_eval/src/components/ResetPanel.tsx), [Back_eval/src/components/OrdersDashboard.tsx](Back_eval/src/components/OrdersDashboard.tsx), [Back_eval/src/components/ActivityLog.tsx](Back_eval/src/components/ActivityLog.tsx)
- Application: orchestration des flux et navigation
  - [Back_eval/src/hooks/useBackOffice.ts](Back_eval/src/hooks/useBackOffice.ts)
  - [Back_eval/src/hooks/useAppRoute.ts](Back_eval/src/hooks/useAppRoute.ts)
- Domaine: types et constantes
  - [Back_eval/src/hooks/backOffice/types.ts](Back_eval/src/hooks/backOffice/types.ts)
  - [Back_eval/src/hooks/backOffice/constants.ts](Back_eval/src/hooks/backOffice/constants.ts)
- Infrastructure: API et XML
  - [Back_eval/src/services/api.tsx](Back_eval/src/services/api.tsx)
  - [Back_eval/src/services/backOffice.ts](Back_eval/src/services/backOffice.ts)
  - [Back_eval/src/services/xmlParser.js](Back_eval/src/services/xmlParser.js)

Cette separation permet de garder la logique metier dans les hooks et services, tandis que l'UI reste declarative.

## Entrees et sorties attendues

### Entrees utilisateur

- Identifiants de login (champ texte): `admin` / `admin`.
- Selection d'un groupe de nettoyage.
- Selection de fichiers tableur (un ou plusieurs) pour import.
- Selection d'archives ZIP (une ou plusieurs) pour import d'images.
- Selection d'une commande et choix d'un statut rapide.
- Navigation entre onglets internes (control / orders).

### Sorties et effets

- Mise a jour de l'URL et route active (SPA).
- Creation ou suppression du token de session dans `sessionStorage`.
- Appels HTTP vers l'API PrestaShop (GET, POST, PUT, DELETE).
- Logs d'activite affiches dans l'UI (succes, erreurs, avertissements).
- Mise a jour du tableau des commandes.

## Logique detaillee par fonctionnalite

### 1) Demarrage de l'application

Dans [Back_eval/src/main.tsx](Back_eval/src/main.tsx):

- L'application est montee sur `#root` avec `StrictMode` pour signaler les usages a risque en dev.
- La feuille de style globale est chargee via [Back_eval/src/index.css](Back_eval/src/index.css).

Dans [Back_eval/src/App.tsx](Back_eval/src/App.tsx):

- Le hook `useBackOffice()` expose l'etat d'auth, les donnees et les actions.
- Le hook `useAppRoute()` garde l'URL et l'etat interne coherents.
- Un effet charge automatiquement les commandes si l'utilisateur est sur `/orders` et si la liste est vide.
  - Ceci evite de declencher un fetch inutile si les commandes sont deja en memoire.
  - Un `useRef` memorise le fait que le chargement auto a deja eu lieu.

### 2) Authentification et protection des routes

Dans [Back_eval/src/hooks/useAppRoute.ts](Back_eval/src/hooks/useAppRoute.ts):

- `KNOWN_ROUTES` limite les routes valides (whitelist).
- `resolveAppRoute()` applique la garde:
  - Si non authentifie et route != `/login`, redirection vers `/login`.
  - Si authentifie et route == `/login`, redirection vers `/control`.
- `useAppRoute()` ecoute `popstate` pour rester en phase avec l'historique.
- `navigateTo()` applique la garde avant de modifier l'URL.

Dans [Back_eval/src/services/backOffice.ts](Back_eval/src/services/backOffice.ts):

- Le token de session est stocke dans `sessionStorage` sous `SESSION_KEY`.
- `login()` renvoie un token fixe quand les identifiants sont `admin/admin`.
- `logout()` supprime le token, ce qui bloque l'acces direct aux routes protegees.

### 3) Nettoyage des donnees (Cleaner)

Le flux principal est dans `useBackOffice.resetGroup()` dans [Back_eval/src/hooks/useBackOffice.ts](Back_eval/src/hooks/useBackOffice.ts):

- Boucle sur les ressources d'un groupe dans l'ordre defini par [Back_eval/src/hooks/backOffice/constants.ts](Back_eval/src/hooks/backOffice/constants.ts).
- Pour chaque ressource:
  - `fetchResourceIdentifiers()` charge uniquement les IDs, ce qui reduit le volume de donnees.
  - Chaque ID est supprime via `deleteResourceById()`.
  - Les categories racine `1` et `2` sont ignorees via `shouldSkipDeletion()`.
- Les erreurs sont capturees par element pour continuer le nettoyage.
- Un rapport est construit et ajoute aux logs.

Pourquoi cette logique est necessaire:

- Le nettoyage doit respecter l'ordre des dependances pour eviter les erreurs FK.
- La suppression par ID permet de continuer meme si un element echoue.
- Le skip des categories racine evite de casser l'arborescence de base PrestaShop.

Edge cases:

- Aucune ressource a supprimer -> log "aucun element trouve".
- Erreur HTTP sur une ressource -> log d'erreur mais la boucle continue.

### 4) Import tableur multi-fichiers

Le flux est dans `useBackOffice.importCsv()` [Back_eval/src/hooks/useBackOffice.ts](Back_eval/src/hooks/useBackOffice.ts), la lecture tableur dans [Back_eval/src/hooks/backOffice/csv.ts](Back_eval/src/hooks/backOffice/csv.ts) et l'import PrestaShop structure dans [Back_eval/src/hooks/backOffice/importer.ts](Back_eval/src/hooks/backOffice/importer.ts).

Etapes:

1) Selection fichiers
- `FileList` est converti en tableau pour une iteration simple.
- Si aucun fichier, la fonction retourne immediatement.

2) Resolution de la ressource
- `resolveResourceName()` utilise le nom de fichier, le nom de feuille ou les colonnes (ex: `products.xlsx` -> `products`).
- Le fichier fourni est reconnu par ses colonnes:
  - `fichier1`: produits, categories et taxes.
  - `fichier2`: declinaisons, valeurs d'attributs et stocks.
  - `fichier3`: clients, adresses, paniers et commandes.
- Cette strategie permet d'eviter un mapping manuel par l'utilisateur.

3) Lecture
- `readDelimitedLinesWithStream()` lit les fichiers CSV/TSV/TXT via `file.stream()` + `TextDecoderStream`.
- Si le navigateur ne supporte pas `TextDecoderStream`, fallback sur `file.text()`.
- Les fichiers Excel OpenXML (`.xlsx`, `.xlsm`, `.xltx`, `.xltm`) sont ouverts avec `JSZip` puis parses feuille par feuille.
- Cette lecture limite la memoire pour les gros fichiers.

4) Parsing tableur
- `detectDelimiter()` compare tabulation, `;` et `,` sur la premiere ligne.
- `parseDelimitedLine()` gere les quotes doubles (`""` -> `"`).
- Le parseur Excel lit les shared strings, les feuilles et les dates numeriques.
- `buildRecord()` associe les colonnes a des champs normalises.
- `normalizeKey()` supprime accents, ponctuation et met en snake_case.
- `COMMON_FIELD_ALIASES` harmonise des colonnes usuelles (ex: `prix_ttc` -> `price`).

5) Nettoyage et envoi
- `sanitizeRecord()` elimine les valeurs vides et corrige certains champs.
- `upsertResourceFromRecord()` genere du XML et envoie `POST` ou `PUT`.
- Si le format du fichier fourni est detecte, `importStructuredPrestashopData()` utilise les endpoints PrestaShop metier:
  `categories`, `taxes`, `tax_rule_groups`, `tax_rules`, `products`, `product_options`,
  `product_option_values`, `combinations`, `stock_availables`, `customers`, `addresses`,
  `carts` et `orders`.

Pourquoi cette logique:

- Le format tableur peut varier, d'ou la detection du delimiteur et des feuilles Excel.
- La normalisation reduit les erreurs de mapping entre CSV et API.
- Le nettoyage des valeurs vides evite d'envoyer des champs inutiles.

Edge cases:

- Fichier vide -> tableau vide et log d'echec.
- `.xls` binaire historique ou `.xlsb` -> message demandant un export en `.xlsx` ou `.csv`.
- Colonnes inconnues -> champs normalises, mais peuvent ne pas etre reconnus par PrestaShop.
- Lignes partielles -> champs manquants mais l'objet est quand meme envoye.

### 5) Import images ZIP

Le flux est dans `useBackOffice.uploadZip()` et [Back_eval/src/hooks/backOffice/zip.ts](Back_eval/src/hooks/backOffice/zip.ts).

Etapes:

- L'archive ZIP est ouverte avec `JSZip`.
- Le dossier interne du ZIP est parcouru pour trouver les images.
- Les fichiers systeme ou non images sont ignores.
- L'ID produit est extrait du prefixe numerique du nom (ex: `101.jpg`).
- L'image est reconstruite en `File` avec un type MIME fiable.
- L'upload est effectue par `uploadProductImage()`.

Pourquoi cette logique:

- L'extraction par prefixe evite un mapping manuel.
- Les warnings permettent de signaler les fichiers mal nommes ou non supportes.

Edge cases:

- Nom d'image sans prefixe numerique -> avertissement et skip.
- Fichiers non images -> avertissement et skip.
- ZIP sans image valide -> avertissement explicite.
- Erreur sur une image -> l'import continue pour les autres.

### 6) Gestion des commandes

Le flux est dans `useBackOffice.refreshOrders()` et `useBackOffice.updateOrder()`.

- `fetchResourceList('orders')` recupere la liste.
- `mapOrders()` normalise les champs pour l'UI.
- Les actions rapides appellent `updateOrderStatus()` qui poste un `order_history`.
- Apres modification, la liste est rechargee pour rester coherente.

Pourquoi cette logique:

- Le mapping des champs garantit un format stable pour l'UI.
- Le reload apres update evite un etat local divergent.

Edge cases:

- Aucun resultat -> affichage "Aucune commande chargee".
- Erreur API -> log affiche, UI reste stable.

## UI et interface utilisateur

### Login

Dans [Back_eval/src/pages/Login.tsx](Back_eval/src/pages/Login.tsx):

- Les champs sont pre-remplis (admin/admin) pour l'acces rapide.
- Le submit empeche le refresh navigateur et declenche l'action `onLogin()`.
- L'erreur d'authentification est affichee sous forme d'alerte visuelle.

### Dashboard + navigation

Dans [Back_eval/src/pages/Dashboard.tsx](Back_eval/src/pages/Dashboard.tsx):

- Barre de navigation en onglets (control / orders).
- Bouton `Deconnexion` qui supprime la session et redirige vers `/login`.
- Rendu conditionnel pour afficher la page correspondante.

### Control center

Dans [Back_eval/src/pages/ControlCenter.tsx](Back_eval/src/pages/ControlCenter.tsx):

- Trois cartes principales: nettoyage, import tableur, import ZIP.
- Chaque carte affiche un log d'activite associe.

### Orders dashboard

Dans [Back_eval/src/components/OrdersDashboard.tsx](Back_eval/src/components/OrdersDashboard.tsx):

- Tableau avec action "Modifier" pour selectionner une commande.
- Panneau lateral avec details et boutons d'action rapide.
- Les actions rapides sont definies dans [Back_eval/src/hooks/backOffice/constants.ts](Back_eval/src/hooks/backOffice/constants.ts).

### ActivityLog

Dans [Back_eval/src/components/ActivityLog.tsx](Back_eval/src/components/ActivityLog.tsx):

- `aria-live="polite"` pour annoncer les nouveaux logs.
- Affichage d'un message vide si aucun log.

## Services API et XML

Dans [Back_eval/src/services/api.tsx](Back_eval/src/services/api.tsx):

- `buildApiUrl()` ajoute `ws_key` a chaque endpoint.
- `request()` centralise l'auth Basic et le check HTTP.
- `sendXml()` force le `Content-Type` en `text/xml`.
- `uploadBinary()` utilise un `FormData` avec la cle `image`.

Dans [Back_eval/src/services/xmlParser.js](Back_eval/src/services/xmlParser.js):

- `parseXML()` convertit le XML en objet JS.
- `extractList()` isole un tableau de ressources a partir d'une reponse XML.
- `generatePrestashopXML()` reconstruit le XML attendu par PrestaShop.

Ces utilitaires rendent l'API PrestaShop exploitable sans dependances externes complexes.

## Cas particuliers et limites pris en compte

- Support d'anciens navigateurs sans `TextDecoderStream` (fallback).
- Logs par feature pour isoler les erreurs et conserver l'historique.
- Suppression partielle lors du nettoyage sans interruption globale.
- Validation minimale des fichiers ZIP (extensions et prefixe numerique).
- Protection des categories racine (IDs 1 et 2).

## Optimisations et ameliorations possibles

- Securite:
  - Ne pas exposer la cle d'API dans le front, utiliser un backend proxy.
  - Remplacer le login local par un vrai mecanisme d'auth.
- Performance:
  - Mettre une limite de concurrence pour les suppressions et uploads.
  - Traiter les gros CSV en streaming complet (emit record par record).
  - Virtualiser le tableau des commandes pour les grands volumes.
- Maintenabilite:
  - Ajouter des tests unitaires pour `csv.ts` et `zip.ts`.
  - Centraliser les messages utilisateur pour la traduction.
  - Renforcer les types des ressources PrestaShop (interfaces par endpoint).

## Resume final

### Complexite temporelle et spatiale (Big O)

- Nettoyage (per groupe): $O(n)$ appels, $n$ = total des IDs; memoire $O(1)$ hors logs.
- Parsing tableur: $O(l \cdot c)$, $l$ = lignes, $c$ = colonnes; memoire $O(l)$ (reduit avec streaming pour CSV/TSV).
- ZIP images: $O(f)$, $f$ = fichiers dans l'archive; memoire $O(f)$ pour les metadonnees.
- Mapping commandes: $O(o)$, $o$ = nombre de commandes; memoire $O(o)$.

### Points de vigilance

- Securite: la cle API et le login local doivent etre remplaces pour un usage reel.
- Maintenabilite: sans tests et types stricts par ressource, les regressions sont possibles.
- Performances: les boucles de requetes (suppression, upload) peuvent etre lentes sans concurrence controlee.
