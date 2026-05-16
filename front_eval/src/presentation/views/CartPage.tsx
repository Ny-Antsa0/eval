import { formatPrice, parsePrice } from '../../core/utils/formatters'
import { useCart } from '../context/CartContext'
import { useUser } from '../context/UserContext'

const CartPage = ({ onRequireLogin }: { onRequireLogin: () => void }) => {
  const {
    items,
    totalAmount,
    totalQuantity,
    isSyncing,
    updateQuantity,
    removeItem,
    placeOrder,
    payOrder,
  } = useCart()
  const { user } = useUser()

  const handleOrder = async () => {
    if (!user || user.isAnonymous) {
      onRequireLogin()
      return
    }

    await placeOrder()
  }

  const handlePay = async () => {
    if (!user || user.isAnonymous) {
      onRequireLogin()
      return
    }

    await payOrder()
  }

  return (
    <main className="cart-shell">
      <section className="cart-header">
        <div>
          <p className="catalog-kicker">Panier</p>
          <h1>Votre selection</h1>
        </div>
        <div className="cart-summary">
          <p>{totalQuantity} article(s)</p>
          <p>Total: {totalAmount}</p>
        </div>
      </section>

      {items.length === 0 ? (
        <p className="catalog-loading">Votre panier est vide.</p>
      ) : (
        <div className="cart-list">
          {items.map((item) => (
            <article className="cart-item" key={item.id}>
              <div className="cart-item-media">
                {item.imageSrc ? (
                  <img
                    src={item.imageSrc}
                    alt={item.name}
                    className="product-image"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="product-image product-image-placeholder">
                    <span>Image indisponible</span>
                  </div>
                )}
              </div>

              <div className="cart-item-info">
                <p className="product-name">{item.name}</p>
                <p className="product-description">Ref: {item.reference}</p>
                <p className="product-description">
                  Prix: {formatPrice(parsePrice(item.price))}
                </p>
              </div>

              <div className="cart-item-actions">
                <label>
                  <span>Quantite</span>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) =>
                      updateQuantity(item.id, Number(event.target.value || 1))
                    }
                  />
                </label>
                <button type="button" className="ghost-button" onClick={() => removeItem(item.id)}>
                  Retirer
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="cart-actions">
        <button type="button" className="add-cart-button" onClick={handleOrder} disabled={isSyncing}>
          Passer commande
        </button>
        <button type="button" className="logout-button" onClick={handlePay} disabled={isSyncing}>
          Payer
        </button>
      </section>
    </main>
  )
}

export default CartPage
