# Explication complète du code

Ce projet est une application frontend en React + TypeScript construite avec Vite. Son rôle principal est d’afficher un catalogue de produits récupéré depuis une API XML de type PrestaShop, avec une connexion simple par session et un ajout au panier stocké localement dans `sessionStorage`.

## 1. Vue d’ensemble de l’application

Le flux global est le suivant :

1. `src/main.tsx` monte l’application React dans le navigateur.
2. `src/components/LoginGate.tsx` vérifie si l’utilisateur est connecté.
3. Si la connexion est valide, `src/App.tsx` affiche le shell principal.
4. `src/services/listeProduit.tsx` charge, enrichit et affiche les produits.
5. Les services `api.tsx`, `infoProduit.tsx`, `imageProduit.tsx` et `xmlParser.js` récupèrent et transforment les données XML.
6. `vite.config.ts` redirige les appels `/api` vers le backend PrestaShop en développement.

L’application repose donc sur deux couches :
- une couche d’interface React pour l’affichage et les interactions utilisateur,
- une couche de services pour interroger l’API XML et normaliser les données.

## 2. Point d’entrée

### `src/main.tsx`

Ce fichier est le point de départ de l’application.

Il fait trois choses :
- importe `StrictMode` de React pour signaler certains problèmes en développement,
- crée la racine React avec `createRoot(document.getElementById('root')!)`,
- rend le composant `LoginGate`.

En pratique, tout le site démarre depuis `LoginGate`. C’est lui qui décide si l’utilisateur voit l’écran de connexion ou l’application principale.

## 3. Gestion de la connexion

### `src/components/LoginGate.tsx`

Ce composant gère une authentification très simple basée sur `sessionStorage`.

#### État local

Il utilise quatre états :
- `isLoggedIn` : indique si l’utilisateur est connecté,
- `username` : valeur du champ identifiant,
- `password` : valeur du champ mot de passe,
- `error` : message d’erreur éventuel.

#### Logique d’accès

Au chargement, `isLoggedIn` lit `sessionStorage.getItem('front_eval_logged_in')`.
- Si la valeur vaut `'true'`, l’utilisateur est considéré comme connecté.
- Sinon, le formulaire de connexion est affiché.

#### Validation du formulaire

À l’envoi du formulaire :
- si `username === 'admin'` et `password === 'admin'`, la clé `front_eval_logged_in` est enregistrée dans `sessionStorage`,
- sinon, un message d’erreur est affiché.

#### Ce que fait ce composant

Il agit comme un garde d’accès. Il ne protège pas réellement une API ou un serveur, mais empêche simplement l’affichage du contenu principal tant que la session n’est pas marquée comme connectée.

## 4. Structure principale de l’interface

### `src/App.tsx`

Ce composant fournit le shell principal de l’application.

Il affiche :
- un header avec le titre “Catalogue produits”,
- un bouton “Déconnecter”,
- puis le composant `ListeProduit`.

#### Déconnexion

Le bouton “Déconnecter” :
- supprime la clé `front_eval_logged_in` dans `sessionStorage`,
- recharge la page avec `window.location.reload()`.

Le rechargement force `LoginGate` à relire l’état de session et à revenir au formulaire de connexion.

## 5. Le cœur métier : affichage des produits

### `src/services/listeProduit.tsx`

C’est le fichier le plus important du projet. Il orchestre le chargement des produits, des catégories, des images et des détails enrichis.

## 5.1 États locaux

Le composant `ListeProduit` conserve plusieurs états :

- `categories` : liste des catégories disponibles pour le filtre,
- `selectedCategory` : catégorie actuellement sélectionnée,
- `enrichedProducts` : produits enrichis avec infos et images,
- `loading` : indique si le chargement est en cours,
- `cartMessage` : message temporaire après ajout au panier.

## 5.2 Chargement des données

Le `useEffect` principal lance le chargement au montage du composant.

### Appels API simultanés

Le code demande en parallèle :
- `products?display=full&filter[active]=1`
- `categories?filter[active]=1`

Ces deux appels récupèrent le catalogue actif et les catégories actives.

### Parsing des réponses XML

Les réponses sont du XML brut. Le code utilise `extractList(...)` pour convertir :
- le XML des produits en tableau de produits,
- le XML des catégories en tableau de catégories.

### Construction des catégories

Chaque catégorie est normalisée sous la forme :
- `id` : identifiant XML,
- `name` : nom de la catégorie, ou texte de secours du type `Catégorie X` si le nom manque.

Seules les catégories ayant un `id` valide sont conservées.

## 5.3 Enrichissement produit par produit

Le chargement ne se limite pas à la liste brute des produits.

Pour chaque produit :
- l’identifiant est extrait avec `readXmlText(product.id)`,
- `loadProductInfo(id)` récupère le détail complet du produit,
- `loadProductImages(id)` récupère les images associées,
- le tout est regroupé dans un objet `EnrichedProduct`.

Les produits sont ajoutés un par un dans `orderedProducts`, puis `setEnrichedProducts([...orderedProducts])` met à jour l’interface au fur et à mesure.

### Conséquence UX

L’utilisateur voit les produits apparaître progressivement, au lieu d’attendre la fin de tout le chargement. C’est un chargement séquentiel, pas totalement optimisé, mais simple à comprendre.

## 5.4 Filtrage par catégorie

Le tableau visible est calculé avec `useMemo`.

- Si `selectedCategory === 'all'`, tous les produits enrichis sont affichés.
- Sinon, `productMatchesCategory(...)` filtre les produits appartenant à la catégorie choisie.

La fonction `productMatchesCategory` vérifie plusieurs sources possibles dans le XML :
- `id_category_default`,
- `id_category`,
- les catégories dans `associations.categories`.

Cela permet de mieux gérer les différences de structure entre réponses XML.

## 5.5 Ajout au panier

Quand on clique sur “Ajouter au panier” :
- le panier courant est lu depuis `sessionStorage` via `readCart()`,
- un nouvel objet est ajouté avec `id`, `name` et `price`,
- le tout est réécrit dans `sessionStorage` sous la clé `front_eval_cart`.

Un message temporaire est ensuite affiché, puis effacé après 2,5 secondes.

### Important

Le panier n’est pas géré par un store React global. Il est persistant uniquement pendant la session du navigateur grâce à `sessionStorage`.

## 5.6 Rendu visuel des produits

Chaque produit est affiché sous forme de carte contenant :
- l’image du produit si disponible,
- le nom,
- une description courte ou longue,
- les champs `reference`, `price` et `quantity` si présents,
- un bouton d’ajout au panier.

Si aucune image n’existe, un bloc de remplacement affiche “Image indisponible”.

## 6. Services de données

## 6.1 `src/services/api.tsx`

Ce fichier centralise l’accès au backend.

### `BASE_URL`

La base de l’API est définie à `'/api'`. Cela correspond au proxy Vite en développement.

### `API_KEY`

Une clé API PrestaShop est ajoutée automatiquement à chaque requête sous le paramètre `ws_key`.

### `buildApiUrl(endpoint)`

Cette fonction :
- enlève un éventuel slash initial,
- ajoute le bon séparateur `?` ou `&`,
- retourne une URL complète du type `/api/...?...&ws_key=...`.

### `getData(endpoint)`

Cette fonction :
- construit l’URL,
- effectue un `fetch`,
- vérifie `response.ok`,
- retourne le texte XML brut,
- renvoie `null` en cas d’erreur.

Elle encapsule donc le transport réseau et simplifie les autres services.

## 6.2 `src/services/infoProduit.tsx`

Ce service récupère le détail complet d’un produit.

### `loadProductInfo(productId)`

- appelle `getData('products/${productId}')`,
- parse le XML avec `extractDetail(xmlData, 'product')`,
- renvoie l’objet du produit ou `null`.

### `readXmlText(value)`

C’est une fonction utilitaire essentielle pour extraire du texte depuis des structures XML parfois imbriquées.

Elle gère plusieurs cas :
- `null` ou `undefined` : chaîne vide,
- string ou number : conversion directe en texte,
- tableau : concaténation des éléments,
- objet contenant `#text` : extraction du texte,
- objet contenant `language` : extraction du contenu multilingue,
- objet imbriqué plus complexe : recherche récursive du premier texte exploitable.

Cette fonction permet de rendre les structures XML PrestaShop plus faciles à consommer côté React.

## 6.3 `src/services/imageProduit.tsx`

Ce service charge les images associées à un produit.

### `loadProductImages(productId)`

- interroge `images/products/${productId}`,
- extrait la liste des images avec `extractList(xmlData, 'image')`,
- récupère un identifiant d’image via `readImageId(...)`,
- construit une URL finale avec `buildApiUrl('images/products/${productId}/${id}')`.

Le résultat est un tableau d’objets :
- `id` : identifiant de l’image,
- `src` : URL directe à afficher dans `<img>`.

### `readImageId(image)`

La fonction essaie plusieurs clés possibles :
- `id`,
- `id_image`,
- `image_id`.

Si aucune ne fonctionne, elle parcourt toutes les valeurs de l’objet jusqu’à trouver un texte exploitable.

## 6.4 `src/services/xmlParser.js`

Ce fichier contient les utilitaires XML centraux.

### `parseXML(xmlString)`

- utilise `DOMParser` pour lire le XML,
- vérifie la présence d’une erreur de parsing,
- transforme le document XML en objet JavaScript via `xmlToObject(...)`.

### `xmlToObject(node)`

Cette fonction récursive convertit un nœud XML en objet JS.

Elle gère :
- les nœuds texte,
- les attributs XML,
- les enfants multiples,
- les répétitions qui deviennent des tableaux.

### `extractList(xmlString, resource)`

Cette fonction récupère une liste de ressources dans la réponse XML.

Exemples :
- `extractList(xml, 'product')` pour obtenir une liste de produits,
- `extractList(xml, 'category')` pour obtenir une liste de catégories.

Elle essaie de retrouver la structure plurielle attendue (`products.product`, `categories.category`, etc.) et retourne toujours un tableau.

### `extractDetail(xmlString, resource)`

Cette fonction récupère un seul élément détaillé, par exemple un produit unique.

### `objectToXML(...)` et `objectToXMLString(...)`

Ces fonctions servent à convertir un objet JavaScript en XML.
Elles sont utiles pour préparer des données à envoyer à PrestaShop, même si dans le flux actuel du frontend elles semblent surtout présentes comme utilitaires génériques.

## 7. Proxy de développement

### `vite.config.ts`

Ce fichier configure Vite.

La partie importante est le proxy :
- toutes les requêtes qui commencent par `/api` sont redirigées vers `http://localhost/eval`,
- `changeOrigin: true` adapte l’origine de la requête,
- `rewrite` conserve le chemin `/api`.

Ce mécanisme évite les problèmes de CORS en développement et permet d’écrire les appels API comme s’ils étaient locaux.

## 8. Flux complet d’exécution

Voici le scénario complet lorsqu’un utilisateur ouvre l’application :

1. Le navigateur charge `main.tsx`.
2. `LoginGate` vérifie si la session contient `front_eval_logged_in`.
3. Si l’utilisateur n’est pas connecté, il voit le formulaire.
4. Après connexion, `App` affiche le header et `ListeProduit`.
5. `ListeProduit` charge les produits et catégories depuis l’API XML.
6. Chaque produit est enrichi avec ses informations détaillées et ses images.
7. L’utilisateur peut filtrer les produits par catégorie.
8. L’utilisateur peut ajouter un produit au panier, qui est stocké dans `sessionStorage`.
9. La déconnexion supprime la session et revient à l’écran de login.

## 9. Points techniques importants

- L’application dépend fortement de la structure XML renvoyée par PrestaShop.
- Les fonctions `readXmlText`, `extractList` et `extractDetail` servent à absorber les variations de structure XML.
- Le chargement des produits est séquentiel, ce qui simplifie la logique mais peut être plus lent si le catalogue est volumineux.
- Le panier et la session sont côté navigateur uniquement ; il n’y a pas de backend d’authentification dans ce projet.

## 10. Résumé

Ce code met en place un mini front office e-commerce centré sur la lecture d’un catalogue PrestaShop en XML.

Les briques principales sont :
- une connexion simulée par session,
- un catalogue enrichi produit par produit,
- un filtre par catégorie,
- un panier local stocké dans le navigateur,
- un proxy Vite pour accéder au backend pendant le développement.

Si tu veux, je peux aussi te faire une version encore plus pédagogique, avec une explication fichier par fichier en français simple, ou une version plus courte à remettre dans un compte rendu.
