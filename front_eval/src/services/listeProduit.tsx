import { useEffect, useMemo, useState } from 'react'
import { getData } from './api'
import { loadProductImages, type ProductImage } from './imageProduit'
import { loadProductInfo, readXmlText, type ProductInfo } from './infoProduit'
import { extractList } from './xmlParser'

type ProductSummary = Record<string, unknown>

type CategoryOption = {
  id: string
  name: string
}

type EnrichedProduct = {
  id: string
  summary: ProductSummary
  info: ProductInfo | null
  images: ProductImage[]
}

export function ListeProduit() {
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [enrichedProducts, setEnrichedProducts] = useState<EnrichedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [cartMessage, setCartMessage] = useState('')

  useEffect(() => {
    let isActive = true

    const run = async () => {
      setLoading(true)

      const [productsXml, categoriesXml] = await Promise.all([
        getData('products?display=full&filter[active]=1'),
        getData('categories?filter[active]=1'),
      ])

      if (!isActive) {
        return
      }

      const productList = productsXml ? (extractList(productsXml, 'product') as ProductSummary[]) : []
      const categoryList = categoriesXml ? (extractList(categoriesXml, 'category') as ProductSummary[]) : []

      setCategories(
        categoryList
          .map((category) => ({
            id: readXmlText(category.id),
            name: readXmlText(category.name) || `Catégorie ${readXmlText(category.id)}`,
          }))
          .filter((category) => category.id),
      )

      const orderedProducts: EnrichedProduct[] = []

      for (const product of productList) {
        const id = readXmlText(product.id)

        if (!id) {
          continue
        }

        const info = await loadProductInfo(id)
        const images = await loadProductImages(id)

        orderedProducts.push({ id, summary: product, info, images })
        setEnrichedProducts([...orderedProducts])
      }

      setLoading(false)
    }

    run()

    return () => {
      isActive = false
    }
  }, [])

  const visibleProducts = useMemo(() => {
    if (selectedCategory === 'all') {
      return enrichedProducts
    }

    return enrichedProducts.filter((product) => productMatchesCategory(product.summary, selectedCategory))
  }, [enrichedProducts, selectedCategory])

  const handleAddToCart = (product: EnrichedProduct) => {
    const currentCart = readCart()
    const nextCart = [
      ...currentCart,
      {
        id: product.id,
        name: readProductName(product),
        price: readField(product.info || product.summary, 'price'),
      },
    ]

    sessionStorage.setItem('front_eval_cart', JSON.stringify(nextCart))
    setCartMessage(`${readProductName(product)} ajouté au panier.`)

    window.setTimeout(() => {
      setCartMessage('')
    }, 2500)
  }

  return (
    <main className="catalog-shell">
      <section className="catalog-hero">
        <div>
          <p className="catalog-kicker">Page d'accueil</p>
          <h1>Produits actifs</h1>
          <p className="catalog-intro">
            La liste est construite depuis l'API XML, puis chaque fiche charge ses détails et son image un par un.
          </p>
        </div>

        <label className="category-filter">
          <span>Filtrer par catégorie</span>
          <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
            <option value="all">Toutes les catégories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      {cartMessage ? <p className="cart-message">{cartMessage}</p> : null}

      {loading && enrichedProducts.length === 0 ? <p className="catalog-loading">Chargement des produits...</p> : null}

      <section className="product-grid">
        {visibleProducts.map((product) => {
          const name = readProductName(product)
          const description = readField(product.info || product.summary, 'description_short') || readField(product.info || product.summary, 'description')
          const price = readField(product.info || product.summary, 'price')
          const reference = readField(product.info || product.summary, 'reference')
          const stock = readField(product.info || product.summary, 'quantity')
          const imageSrc = product.images[0]?.src

          return (
            <article className="product-card" key={product.id}>
              <div className="product-media">
                {imageSrc ? (
                  <img className="product-image" src={imageSrc} alt={name} loading="lazy" />
                ) : (
                  <div className="product-image product-image-placeholder">
                    <span>Image indisponible</span>
                  </div>
                )}
              </div>

              <div className="product-meta">
                <p className="product-name">{name}</p>
                <p className="product-description">{description || 'Aucune description disponible.'}</p>
                <div className="product-flags">
                  {reference ? <span>Réf: {reference}</span> : null}
                  {price ? <span>Prix: {price}</span> : null}
                  {stock ? <span>Stock: {stock}</span> : null}
                </div>
              </div>

              <div className="product-actions">
                <button type="button" className="add-cart-button" onClick={() => handleAddToCart(product)}>
                  Ajouter au panier
                </button>
              </div>
            </article>
          )
        })}
      </section>
    </main>
  )
}

function readCart() {
  try {
    const stored = sessionStorage.getItem('front_eval_cart')
    return stored ? (JSON.parse(stored) as Array<Record<string, unknown>>) : []
  } catch {
    return []
  }
}

function readProductName(product: EnrichedProduct) {
  return readField(product.info || product.summary, 'name') || `Produit ${product.id}`
}

function productMatchesCategory(product: ProductSummary, categoryId: string) {
  const categoryValues = [
    readField(product, 'id_category_default'),
    readField(product, 'id_category'),
    ...readCategoryIds(product),
  ].filter(Boolean)

  return categoryValues.includes(categoryId)
}

function readCategoryIds(product: ProductSummary) {
  const values: string[] = []
  const associations = product.associations as Record<string, unknown> | undefined

  if (!associations) {
    return values
  }

  const categories = associations.categories as Record<string, unknown> | Record<string, unknown>[] | undefined

  if (Array.isArray(categories)) {
    for (const category of categories) {
      const id = readField(category as ProductSummary, 'id')
      if (id) {
        values.push(id)
      }
    }
  } else if (categories) {
    const id = readField(categories as ProductSummary, 'id')
    if (id) {
      values.push(id)
    }
  }

  return values
}

function readField(source: Record<string, unknown>, key: string) {
  const value = source[key]

  if (Array.isArray(value)) {
    return value.map((item) => readXmlText(item)).filter(Boolean).join(', ')
  }

  return readXmlText(value)
}