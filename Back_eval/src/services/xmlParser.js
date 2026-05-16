// ============================================================
// xmlParser.js — Utilitaires pour parser et générer du XML
// ============================================================
// PrestaShop communique en XML. Ce fichier contient les fonctions
// pour convertir le XML en objets JavaScript (et vice-versa).
//
// Fonctions principales :
//   - parseXML(xmlString)         → XML string → objet JS
//   - extractList(xml, resource)  → extraire une LISTE d'éléments
//   - extractDetail(xml, resource)→ extraire UN SEUL élément
//   - generatePrestashopXML(...)  → objet JS → XML pour envoi à PrestaShop
//
// Exemple de XML PrestaShop (liste de produits) :
//   <prestashop>
//     <products>
//       <product><id>1</id><name>T-shirt</name></product>
//       <product><id>2</id><name>Jean</name></product>
//     </products>
//   </prestashop>
// ============================================================

// ============================================================
// parseXML() — Convertir une chaîne XML en objet JavaScript
// ============================================================
// Entrée : '<prestashop><product><id>1</id></product></prestashop>'
// Sortie : { prestashop: { product: { id: '1' } } }
// ============================================================
export function parseXML(xmlString) {
  const normalized = String(xmlString ?? '').replace(/^\ufeff/, '').trimStart();
  if (!normalized.trim()) {
    throw new Error('Reponse API vide (XML attendu).');
  }

  if (/^<(!doctype|html)/i.test(normalized)) {
    throw new Error(
      'Reponse API non XML (HTML detecte). Verifiez le proxy /api ou la cle API.',
    );
  }

  // DOMParser est une API native du navigateur pour parser du XML
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(normalized, 'text/xml');
  
  // Vérifier si le XML est valide (sinon il y a une balise <parsererror>)
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error(`Erreur de parsing XML: ${parserError.textContent}`);
  }
  
  // Convertir le document XML en objet JS (fonction récursive ci-dessous)
  return xmlToObject(xmlDoc.documentElement);
}

// ============================================================
// xmlToObject() — Fonction récursive interne
// ============================================================
// Parcourt chaque nœud XML et le transforme en objet JS.
// Si un nœud a des enfants → objet avec des clés
// Si un nœud n'a pas d'enfants → retourne son texte
// Si plusieurs enfants ont le même nom → tableau
// ============================================================
function xmlToObject(node) {
  // Si le nœud est juste du texte, retourner le texte
  if (!node || node.nodeType === Node.TEXT_NODE) {
    return node ? node.textContent.trim() : null;
  }
  
  const obj = {};
  
  // Récupérer les attributs XML (ex: <language id="1">)
  if (node.attributes && node.attributes.length > 0) {
    obj._attributes = {};
    for (let i = 0; i < node.attributes.length; i++) {
      const attr = node.attributes[i];
      obj._attributes[attr.name] = attr.value;
    }
  }
  
  // Récupérer les enfants (sous-balises)
  const children = node.children;
  if (children.length === 0) {
    // Pas d'enfants = c'est une "feuille" → retourner le texte
    // Ex: <price>19.99</price> → retourne "19.99"
    return node.textContent.trim() || obj;
  }
  
  // Parcourir chaque enfant et l'ajouter à l'objet
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const childName = child.tagName;          // Ex: "product", "name", "price"
    const childValue = xmlToObject(child);     // Appel récursif !
    
    // Si cette clé existe déjà, on crée un tableau
    // (cas où il y a plusieurs <product> dans <products>)
    if (Array.isArray(obj[childName])) {
      obj[childName].push(childValue);        // Ajouter au tableau existant
    } else if (obj[childName] !== undefined) {
      obj[childName] = [obj[childName], childValue]; // Transformer en tableau
    } else {
      obj[childName] = childValue;            // Première occurrence
    }
  }
  
  return obj;
}

// ============================================================
// objectToXML() — Convertir un objet JS en chaîne XML complète
// ============================================================
// Utilisé en interne. Tu n'as normalement pas besoin d'appeler
// cette fonction directement. Utilise generatePrestashopXML() à la place.
// ============================================================
const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export function objectToXML(obj, rootName = 'prestashop') {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<${rootName} xmlns:xlink="http://www.w3.org/1999/xlink">\n`;
  xml += objectToXMLString(obj, 1);
  xml += `</${rootName}>\n`;
  return xml;
}

// ============================================================
// objectToXMLString() — Convertir un objet en XML (récursif)
// ============================================================
// Transforme chaque clé de l'objet en balise XML.
// Ex : { name: 'T-shirt', price: '19.99' }
// →    <name>T-shirt</name>
//      <price>19.99</price>
// ============================================================
function objectToXMLString(obj, indent = 0) {
  const indentStr = '  '.repeat(indent); // Espaces pour l'indentation
  let xml = '';

  // Cas spécial : objet avec #text et @attrs (pour PrestaShop multilingue)
  // Ex: { '@attrs': { id: '1' }, '#text': 'Nom' } → <language id="1">Nom</language>
  if (obj['#text'] !== undefined && obj['@attrs']) {
    const attrs = Object.entries(obj['@attrs'])
      .map(([k, v]) => `${k}="${escapeXml(v)}"`)
      .join(' ');
    return `${indentStr}<${obj._tagName || 'element'}${attrs ? ' ' + attrs : ''}>${escapeXml(obj['#text'])}</${obj._tagName || 'element'}>\n`;
  }

  for (const key in obj) {
    if (key === '_attributes' || key === '@attrs' || key === '#text') continue; // Ignorer les clés spéciales

    const value = obj[key];
    const attrs = value['@attrs'] ? Object.entries(value['@attrs']).map(([k, v]) => `${k}="${escapeXml(v)}"`).join(' ') : '';
    const textContent = value['#text'] !== undefined ? value['#text'] : null;

    if (Array.isArray(value)) {
      // Si c'est un TABLEAU → créer une balise pour chaque élément
      // Ex: language: [{...}, {...}] → <language>...</language><language>...</language>
      for (const item of value) {
        const itemAttrs = item['@attrs'] ? Object.entries(item['@attrs']).map(([k, v]) => `${k}="${escapeXml(v)}"`).join(' ') : '';
        const itemText = item['#text'] !== undefined ? item['#text'] : null;

        if (itemText !== null && Object.keys(item).filter(k => k !== '@attrs' && k !== '#text').length === 0) {
          // Cas simple : juste du texte avec attributs
          xml += `${indentStr}<${key}${itemAttrs ? ' ' + itemAttrs : ''}>${escapeXml(itemText)}</${key}>\n`;
        } else {
          xml += `${indentStr}<${key}${itemAttrs ? ' ' + itemAttrs : ''}>\n`;
          const tempObj = { ...item };
          delete tempObj['@attrs'];
          delete tempObj['#text'];
          if (itemText !== null) {
            tempObj._textContent = itemText;
          }
          xml += objectToXMLString(tempObj, indent + 1);
          xml += `${indentStr}</${key}>\n`;
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      // Si c'est un OBJET avec texte direct (cas PrestaShop multilingue simple)
      if (textContent !== null && Object.keys(value).filter(k => k !== '@attrs' && k !== '#text').length === 0) {
        xml += `${indentStr}<${key}${attrs ? ' ' + attrs : ''}>${escapeXml(textContent)}</${key}>\n`;
      } else {
        // Si c'est un OBJET → créer une balise qui contient les sous-éléments
        xml += `${indentStr}<${key}${attrs ? ' ' + attrs : ''}>\n`;
        const tempObj = { ...value };
        delete tempObj['@attrs'];
        delete tempObj['#text'];
        if (textContent !== null) {
          tempObj._textContent = textContent;
        }
        xml += objectToXMLString(tempObj, indent + 1);
        xml += `${indentStr}</${key}>\n`;
      }
    } else {
      // Si c'est une VALEUR simple (string, number) → balise avec texte
      xml += `${indentStr}<${key}>${escapeXml(value)}</${key}>\n`;
    }
  }

  // Ajouter le contenu texte s'il existe
  if (obj._textContent !== undefined) {
    xml += `${indentStr}${escapeXml(obj._textContent)}\n`;
  }

  return xml;
}

// ============================================================
// extractList() — Extraire une LISTE d'éléments d'une réponse XML
// ============================================================
// C'est la fonction la plus utilisée dans l'app !
//
// Comment ça marche :
//   1. PrestaShop répond avec un XML structuré comme ça :
//      <prestashop> <products> <product>...</product> <product>...</product> </products> </prestashop>
//   2. On parse le XML en objet JS
//   3. On cherche la clé au pluriel (ex: "products") puis au singulier (ex: "product")
//   4. On retourne un TABLEAU d'objets
//
// Paramètres :
//   - xmlString  : la réponse XML brute de PrestaShop
//   - resource   : le nom au SINGULIER (ex: 'product', 'customer', 'category')
//   - pluralName : optionnel, forcer le nom au pluriel (si le calcul auto est faux)
//
// Retourne : un tableau d'objets JS (ou [] si rien trouvé)
// ============================================================
export function extractList(xmlString, resource, pluralName = null) {
  // Étape 1 : Parser le XML en objet JS
  const parsed = parseXML(xmlString);
  const root = parsed.prestashop || parsed;
  
  // Étape 2 : Calculer le nom au pluriel
  // "product" → "products" (simple : ajouter "s")
  // "category" → "categories" (terminaison "y" → "ies")
  // "address" → "addresses" (terminaison "ss" → "es")
  const plural = pluralName || (resource.endsWith('y') 
    ? resource.slice(0, -1) + 'ies' 
    : resource.endsWith('ss') || resource.endsWith('x') || resource.endsWith('sh')
      ? resource + 'es'
      : resource + 's');

  // Étape 3 : Chercher les données dans l'objet parsé
  // Structure attendue : root.products.product (pluriel > singulier)
  const list = root[plural]?.[resource] || root[resource];
  
  // Si rien trouvé → retourner un tableau vide
  if (!list) return [];
  
  // Si c'est déjà un tableau → le retourner tel quel
  if (Array.isArray(list)) return list;
  
  // Si c'est un seul objet (1 seul résultat) → le mettre dans un tableau
  return [list];
}

// ============================================================
// extractDetail() — Extraire UN SEUL élément d'une réponse XML
// ============================================================
// Utilisé quand on récupère le détail d'une ressource (ex: GET /products/1)
//
// Exemple : extractDetail(xmlResponse, 'product')
// → retourne l'objet du produit avec tous ses champs
// ============================================================
export function extractDetail(xmlString, resource) {
  const parsed = parseXML(xmlString);
  const root = parsed.prestashop || parsed;
  return root[resource] || null;
}

// ============================================================
// generatePrestashopXML() — Générer le XML pour CRÉER ou MODIFIER
// ============================================================
// C'est cette fonction qu'on utilise avant d'envoyer un POST ou PUT.
//
// Exemple d'utilisation :
//   const xml = generatePrestashopXML('product', { name: 'T-shirt', price: '19.99' });
//
// Résultat :
//   <?xml version="1.0" encoding="UTF-8"?>
//   <prestashop>
//     <product>
//       <name>T-shirt</name>
//       <price>19.99</price>
//     </product>
//   </prestashop>
//
// Ensuite on envoie ce XML avec : post('products', xml)
// ============================================================
export function generatePrestashopXML(resource, data) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <${resource}>
${objectToXMLString(data, 2)}
  </${resource}>
</prestashop>`;
  return xml;
}

    
