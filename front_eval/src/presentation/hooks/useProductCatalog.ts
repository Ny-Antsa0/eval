import { useEffect, useMemo, useState } from 'react'
import type { CatalogFilters } from '../../core/models/filters'
import type { CategoryOption, EnrichedProduct, ProductSummary } from '../../core/models/product'
import { filterAndSortProducts } from '../../core/use-cases/filterCatalog'
import { listCategories, listProducts } from '../../data/repositories/ProductRepository'
import { loadProductImages } from '../../services/imageProduit'
import { loadProductInfo } from '../../services/infoProduit'
import { readXmlText } from '../../core/utils/xml'

const DEFAULT_FILTERS: CatalogFilters = {
  search: '',
  categoryId: 'all',
  minPrice: '',
  maxPrice: '',
  sortBy: 'date-desc',
}

export const useProductCatalog = () => {
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_FILTERS)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [products, setProducts] = useState<EnrichedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isActive = true

    const run = async () => {
      setLoading(true)

      try {
        const [productList, categoryList] = await Promise.all([
          listProducts(),
          listCategories(),
        ])

        if (!isActive) {
          return
        }

        setCategories(categoryList)

        const orderedProducts: EnrichedProduct[] = []

        for (const product of productList) {
          const id = readXmlText((product as ProductSummary).id)
          if (!id) {
            continue
          }

          const [info, images] = await Promise.all([
            loadProductInfo(id),
            loadProductImages(id),
          ])

          orderedProducts.push({ id, summary: product, info, images })

          if (isActive) {
            setProducts([...orderedProducts])
          }
        }

        if (isActive) {
          setError('')
        }
      } catch (err) {
        if (isActive) {
          setError('Erreur lors du chargement du catalogue.')
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    run()

    return () => {
      isActive = false
    }
  }, [])

  const visibleProducts = useMemo(() => {
    return filterAndSortProducts(products, filters)
  }, [products, filters])

  return {
    filters,
    setFilters,
    categories,
    products: visibleProducts,
    rawProducts: products,
    loading,
    error,
  }
}
