import { useMemo } from 'react'
import { getProductLabels } from '../../core/utils/productLabels'
import { readField, readProductDates, readProductName } from '../../core/utils/productReaders'
import { formatPrice, parsePrice } from '../../core/utils/formatters'
import { useProductCatalog } from '../hooks/useProductCatalog'
import { useCart } from '../context/CartContext'

const CatalogPage = () => {
  const {
    filters,
    setFilters,
    categories,
    products,
    rawProducts,
    loading,
    error,
  } = useProductCatalog()
  const { addItem } = useCart()

  const productCount = products.length

  const priceRange = useMemo(() => {
    const prices = rawProducts
      .map((product) => parsePrice(readField(product.info || product.summary, 'price')))
      .filter((value) => value > 0)

    if (prices.length === 0) {
      return { min: 0, max: 0 }
    }

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    }
  }, [rawProducts])

  return (
    <main className="catalog-shell">
      <section className="catalog-hero">
        <div>
          <p className="catalog-kicker">Accueil</p>
          <h1>Catalogue produits</h1>
          <p className="catalog-intro">
            Recherchez un produit, filtrez par categorie et suivez les mises a jour recentes.
          </p>
        </div>

        <div className="catalog-metrics">
          <p className="catalog-count">{productCount} produit(s)</p>
          <p className="catalog-range">
            Prix min: {formatPrice(priceRange.min)} · Prix max: {formatPrice(priceRange.max)}
          </p>
        </div>
      </section>

      <section className="catalog-filters">
        <label className="filter-field">
          <span>Rechercher</span>
          <input
            type="search"
            value={filters.search}
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
            placeholder="Nom du produit"
          />
        </label>

        <label className="filter-field">
          <span>Categorie</span>
          <select
            value={filters.categoryId}
            onChange={(event) => setFilters({ ...filters, categoryId: event.target.value })}
          >
            <option value="all">Toutes les categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span>Prix min</span>
          <input
            type="number"
            min={0}
            value={filters.minPrice}
            onChange={(event) => setFilters({ ...filters, minPrice: event.target.value })}
            placeholder="0"
          />
        </label>

        <label className="filter-field">
          <span>Prix max</span>
          <input
            type="number"
            min={0}
            value={filters.maxPrice}
            onChange={(event) => setFilters({ ...filters, maxPrice: event.target.value })}
            placeholder="500"
          />
        </label>

        <label className="filter-field">
          <span>Trier</span>
          <select
            value={filters.sortBy}
            onChange={(event) =>
              setFilters({
                ...filters,
                sortBy: event.target.value as typeof filters.sortBy,
              })
            }
          >
            <option value="date-desc">Date (recent)</option>
            <option value="date-asc">Date (ancien)</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix decroissant</option>
          </select>
        </label>
      </section>

      {error ? <p className="catalog-loading">{error}</p> : null}
      {loading && rawProducts.length === 0 ? (
        <div className="product-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <article className="product-card skeleton-card" key={`skeleton-${index}`}>
              <div className="product-media skeleton-box" />
              <div className="product-meta">
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
                <div className="skeleton-line" />
              </div>
              <div className="product-actions">
                <div className="skeleton-pill" />
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {!loading && products.length === 0 ? (
        <p className="catalog-loading">Aucun produit ne correspond aux filtres.</p>
      ) : null}

      <section className="product-grid">
        {products.map((product) => {
          const base = product.info || product.summary
          const name = readProductName(base, product.id)
          const description = readField(base, 'description_short') || readField(base, 'description')
          const price = readField(base, 'price')
          const priceValue = parsePrice(price)
          const priceLabel = price ? formatPrice(priceValue) : '0,00 €'
          const reference = readField(base, 'reference')
          const stock = readField(base, 'quantity')
          const imageSrc = product.images[0]?.src
          const labels = getProductLabels(readProductDates(base))

          return (
            <article className="product-card" key={product.id}>
              <div className="product-media">
                {imageSrc ? (
                  <img
                    className="product-image"
                    src={imageSrc}
                    alt={name}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="product-image product-image-placeholder">
                    <span>Image indisponible</span>
                  </div>
                )}
              </div>

              <div className="product-meta">
                <div className="product-header">
                  <p className="product-name">{name}</p>
                  <div className="product-badges">
                    {labels.map((label) => (
                      <span key={`${product.id}-${label}`} className={`badge badge-${label.toLowerCase()}`}>
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="product-description">
                  {description || 'Aucune description disponible.'}
                </p>
                <div className="product-flags">
                  {reference ? <span>Ref: {reference}</span> : null}
                  {price ? <span>Prix: {priceLabel}</span> : null}
                  {stock ? <span>Stock: {stock}</span> : null}
                </div>
              </div>

              <div className="product-actions">
                <button
                  type="button"
                  className="add-cart-button"
                  onClick={() =>
                    addItem({
                      id: product.id,
                      name,
                      reference: reference || product.id,
                      price: priceValue.toFixed(2),
                      quantity: 1,
                      imageSrc,
                    })
                  }
                >
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

export default CatalogPage
