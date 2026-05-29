import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Home,
  Loader2,
  LogOut,
  MapPin,
  Minus,
  Phone,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Star,
  Trash2,
  Truck,
  UserPlus,
  WalletCards
} from "lucide-react";
import { API_BASE, request } from "./api";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

function productImageUrl(imageUrl) {
  return imageUrl.startsWith("http") ? imageUrl : `${API_BASE}${imageUrl}`;
}

function initialUser() {
  const raw = localStorage.getItem("cartOneUser");
  return raw ? JSON.parse(raw) : null;
}

function App() {
  const [view, setView] = useState("products");
  const [authMode, setAuthMode] = useState("login");
  const [user, setUser] = useState(initialUser);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState({ products: true, cart: false, action: "" });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);

  const quantityByProduct = useMemo(() => {
    return cart.items.reduce((lookup, item) => {
      lookup[item.product.id] = item.quantity;
      return lookup;
    }, {});
  }, [cart.items]);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (user) loadCart();
    if (!user) setCart({ items: [], total: 0 });
  }, [user]);

  async function loadProducts() {
    setLoading((current) => ({ ...current, products: true }));
    setError("");
    try {
      const data = await request("/products");
      setProducts(data.products);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((current) => ({ ...current, products: false }));
    }
  }

  async function loadCart() {
    setLoading((current) => ({ ...current, cart: true }));
    try {
      const data = await request("/cart");
      setCart(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((current) => ({ ...current, cart: false }));
    }
  }

  async function handleAuth(values) {
    setLoading((current) => ({ ...current, action: authMode }));
    setError("");
    setNotice("");
    try {
      if (authMode === "register") {
        const data = await request("/auth/register", {
          method: "POST",
          body: JSON.stringify(values)
        });
        setNotice(data.message);
        setAuthMode("login");
        return;
      }

      const data = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify(values)
      });
      localStorage.setItem("cartOneToken", data.token);
      localStorage.setItem("cartOneUser", JSON.stringify(data.user));
      setUser(data.user);
      setView("products");
      setNotice(`Welcome back, ${data.user.name}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((current) => ({ ...current, action: "" }));
    }
  }

  function logout() {
    localStorage.removeItem("cartOneToken");
    localStorage.removeItem("cartOneUser");
    setUser(null);
    setView("products");
    setNotice("Logged out successfully.");
    setOrder(null);
  }

  async function addToCart(product) {
    if (!user) {
      setAuthMode("login");
      setView("auth");
      setError("Please login before adding items to your cart.");
      return;
    }

    setLoading((current) => ({ ...current, action: `add-${product.id}` }));
    setError("");
    setNotice("");
    try {
      const data = await request("/cart/add", {
        method: "POST",
        body: JSON.stringify({ productId: product.id, quantity: 1 })
      });
      setCart(data);
      setNotice(`${product.name} added to cart.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((current) => ({ ...current, action: "" }));
    }
  }

  async function updateQuantity(productId, quantity) {
    setLoading((current) => ({ ...current, action: `qty-${productId}` }));
    setError("");
    setNotice("");
    try {
      const data = await request("/cart/update", {
        method: "PATCH",
        body: JSON.stringify({ productId, quantity })
      });
      setCart(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((current) => ({ ...current, action: "" }));
    }
  }

  async function removeItem(productId) {
    setLoading((current) => ({ ...current, action: `remove-${productId}` }));
    setError("");
    setNotice("");
    try {
      const data = await request(`/cart/remove/${productId}`, {
        method: "DELETE"
      });
      setCart(data);
      setNotice("Item removed from cart.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((current) => ({ ...current, action: "" }));
    }
  }

  async function placeOrder() {
    setLoading((current) => ({ ...current, action: "checkout" }));
    setError("");
    setNotice("");
    try {
      const data = await request("/cart/checkout", { method: "POST" });
      setOrder(data.order);
      setCart({ items: [], total: 0 });
      setNotice(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((current) => ({ ...current, action: "" }));
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => setView("products")} type="button">
          <ShoppingBag size={24} />
          <span>Cart One</span>
        </button>

        <nav className="tabs" aria-label="Primary navigation">
          <button className={view === "products" ? "active" : ""} onClick={() => setView("products")} type="button">
            Products
          </button>
          <button className={view === "cart" ? "active" : ""} onClick={() => setView("cart")} type="button">
            Cart
            <span className="pill">{cart.items.length}</span>
          </button>
          <button className={view === "billing" ? "active" : ""} onClick={() => setView("billing")} type="button">
            Billing
          </button>
        </nav>

        <div className="account">
          {user ? (
            <>
              <span>{user.name}</span>
              <button className="icon-button" onClick={logout} type="button" title="Logout">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button className="secondary" onClick={() => setView("auth")} type="button">
              <UserPlus size={18} />
              Login
            </button>
          )}
        </div>
      </header>

      <main className="shell">
        <section className="page-heading">
          <div>
            <p>Shopping Cart</p>
            <h1>{view === "billing" ? "Order summary" : view === "cart" ? "Your cart" : "Everyday desk gear"}</h1>
          </div>
          <div className="summary-chip">
            <ShoppingCart size={18} />
            {currency.format(cart.total)}
          </div>
        </section>

        <Status error={error} notice={notice} />

        {view === "auth" && (
          <AuthCard mode={authMode} loading={loading.action === authMode} onModeChange={setAuthMode} onSubmit={handleAuth} />
        )}

        {view === "products" && (
          <ProductList
            products={products}
            quantityByProduct={quantityByProduct}
            loading={loading}
            onAdd={addToCart}
          />
        )}

        {view === "cart" && (
          <CartView
            cart={cart}
            loading={loading}
            onUpdate={updateQuantity}
            onRemove={removeItem}
            onBilling={() => setView("billing")}
          />
        )}

        {view === "billing" && (
          <BillingView cart={cart} order={order} loading={loading} onPlaceOrder={placeOrder} onShop={() => setView("products")} />
        )}
      </main>
    </div>
  );
}

function Status({ error, notice }) {
  if (!error && !notice) return null;
  return (
    <div className={error ? "status error" : "status success"} role="status">
      {error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
      <span>{error || notice}</span>
    </div>
  );
}

function AuthCard({ mode, loading, onModeChange, onSubmit }) {
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const isRegister = mode === "register";

  function handleChange(event) {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function submit(event) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <section className="auth-panel">
      <div className="auth-card">
        <div>
          <p>{isRegister ? "Create account" : "Welcome back"}</p>
          <h2>{isRegister ? "Register" : "Login"}</h2>
        </div>

        <form onSubmit={submit}>
          {isRegister && (
            <label>
              Name
              <input name="name" value={values.name} onChange={handleChange} placeholder="Tarun Shetty" required />
            </label>
          )}
          <label>
            Email
            <input name="email" type="email" value={values.email} onChange={handleChange} placeholder="you@example.com" required />
          </label>
          <label>
            Password
            <input name="password" type="password" minLength={6} value={values.password} onChange={handleChange} placeholder="At least 6 characters" required />
          </label>
          <button className="primary" type="submit" disabled={loading}>
            {loading && <Loader2 className="spin" size={18} />}
            {isRegister ? "Create account" : "Login"}
          </button>
        </form>

        <button className="link-button" onClick={() => onModeChange(isRegister ? "login" : "register")} type="button">
          {isRegister ? "Already have an account? Login" : "New here? Register"}
        </button>
      </div>
    </section>
  );
}

function ProductList({ products, quantityByProduct, loading, onAdd }) {
  if (loading.products) {
    return <EmptyState icon={<Loader2 className="spin" />} title="Loading products..." body="Fetching the latest catalogue." />;
  }

  if (!products.length) {
    return <EmptyState icon={<ShoppingBag />} title="No products available" body="The catalogue is empty right now." />;
  }

  return (
    <section className="product-grid">
      {products.map((product) => {
        const inCart = quantityByProduct[product.id] || 0;
        const isMaxed = inCart >= product.stock;
        const isBusy = loading.action === `add-${product.id}`;
        return (
          <article className="product-card" key={product.id}>
            <img src={productImageUrl(product.imageUrl)} alt={product.name} />
            <div className="product-copy">
              <div>
                <h2>{product.name}</h2>
                <p>{product.description}</p>
              </div>
              <div className="product-meta">
                <strong>{currency.format(product.price)}</strong>
                <span>{product.stock - inCart} left</span>
              </div>
            </div>
            <button className="primary" type="button" onClick={() => onAdd(product)} disabled={product.stock === 0 || isMaxed || isBusy}>
              {isBusy ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
              {isMaxed ? "Max in cart" : "Add to cart"}
            </button>
          </article>
        );
      })}
    </section>
  );
}

function CartView({ cart, loading, onUpdate, onRemove, onBilling }) {
  if (loading.cart) {
    return <EmptyState icon={<Loader2 className="spin" />} title="Loading cart..." body="Checking your saved items." />;
  }

  if (!cart.items.length) {
    return <EmptyState icon={<ShoppingCart />} title="Your cart is empty" body="Add products to see them here." />;
  }

  return (
    <section className="cart-panel">
      <div className="cart-list">
        {cart.items.map((item) => {
          const isBusy = loading.action === `qty-${item.product.id}` || loading.action === `remove-${item.product.id}`;
          return (
            <article className="cart-row" key={item.product.id}>
              <img src={productImageUrl(item.product.imageUrl)} alt={item.product.name} />
              <div>
                <h2>{item.product.name}</h2>
                <p>{currency.format(item.product.price)} each</p>
              </div>
              <div className="stepper">
                <button type="button" onClick={() => onUpdate(item.product.id, item.quantity - 1)} disabled={isBusy} title="Decrease quantity">
                  <Minus size={16} />
                </button>
                <span>{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => onUpdate(item.product.id, item.quantity + 1)}
                  disabled={isBusy || item.quantity >= item.product.stock}
                  title="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>
              <strong>{currency.format(item.lineTotal)}</strong>
              <button className="icon-button danger" type="button" onClick={() => onRemove(item.product.id)} disabled={isBusy} title="Remove item">
                <Trash2 size={18} />
              </button>
            </article>
          );
        })}
      </div>
      <CartTotal total={cart.total} actionLabel="Go to billing" onAction={onBilling} />
    </section>
  );
}

function BillingView({ cart, order, loading, onPlaceOrder, onShop }) {
  const [delivery, setDelivery] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    pincode: "",
    note: ""
  });
  const [rating, setRating] = useState(0);

  function updateDelivery(event) {
    setDelivery((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function submitOrder(event) {
    event.preventDefault();
    onPlaceOrder();
  }

  if (order) {
    return (
      <section className="order-success">
        <div className="empty-icon">
          <CheckCircle2 />
        </div>
        <h2>Order placed successfully</h2>
        <p>Your order total was {currency.format(order.total)}. Cash on Delivery is selected, so please keep the amount ready when the delivery partner arrives.</p>
        <p className="visit-note">Thank you for shopping with Cart One. Visit again for more desk essentials.</p>
        <div className="rating-box">
          <span>Rate your shopping experience</span>
          <div className="stars" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((value) => (
              <button className={rating >= value ? "star active" : "star"} key={value} onClick={() => setRating(value)} type="button" title={`${value} star`}>
                <Star size={24} />
              </button>
            ))}
          </div>
          {rating > 0 && <small>Thanks for rating us {rating}/5.</small>}
        </div>
        <button className="primary success-action" type="button" onClick={onShop}>
          Shop again
        </button>
      </section>
    );
  }

  if (!cart.items.length) {
    return <EmptyState icon={<WalletCards />} title="Nothing to bill yet" body="Your order summary will appear after you add products." actionLabel="Browse products" onAction={onShop} />;
  }

  return (
    <section className="billing-layout">
      <form className="checkout-form" onSubmit={submitOrder}>
        <section className="checkout-section">
          <div className="section-title">
            <MapPin size={20} />
            <h2>Delivery address</h2>
          </div>
          <div className="form-grid">
            <label>
              Full name
              <input name="name" value={delivery.name} onChange={updateDelivery} placeholder="Enter your name" required />
            </label>
            <label>
              Phone number
              <input name="phone" value={delivery.phone} onChange={updateDelivery} placeholder="10 digit mobile number" pattern="[0-9]{10}" required />
            </label>
            <label className="wide">
              Full address
              <input name="address" value={delivery.address} onChange={updateDelivery} placeholder="House no, street, area" required />
            </label>
            <label>
              City
              <input name="city" value={delivery.city} onChange={updateDelivery} placeholder="City" required />
            </label>
            <label>
              Pincode
              <input name="pincode" value={delivery.pincode} onChange={updateDelivery} placeholder="6 digit pincode" pattern="[0-9]{6}" required />
            </label>
            <label className="wide">
              Delivery note
              <input name="note" value={delivery.note} onChange={updateDelivery} placeholder="Optional landmark or delivery instruction" />
            </label>
          </div>
        </section>

        <section className="checkout-section">
          <div className="section-title">
            <WalletCards size={20} />
            <h2>Payment method</h2>
          </div>
          <div className="payment-card">
            <div className="payment-icon">
              <Truck size={22} />
            </div>
            <div>
              <strong>Cash on Delivery</strong>
              <p>We prefer Cash on Delivery for a smoother and safer delivery experience, so COD is selected automatically.</p>
            </div>
            <span>Selected</span>
          </div>
        </section>

        <button className="primary" type="submit" disabled={loading.action === "checkout"}>
          {loading.action === "checkout" && <Loader2 className="spin" size={18} />}
          Place COD order
        </button>
      </form>

      <aside className="cart-total order-summary">
        <span>Order summary</span>
        <div className="billing-list">
          {cart.items.map((item) => (
            <div className="billing-row" key={item.product.id}>
              <span>{item.product.name}</span>
              <small>{item.quantity} x {currency.format(item.product.price)}</small>
              <strong>{currency.format(item.lineTotal)}</strong>
            </div>
          ))}
        </div>
        <div className="delivery-promise">
          <Home size={18} />
          Delivery to your saved address
        </div>
        <strong>{currency.format(cart.total)}</strong>
      </aside>
    </section>
  );
}

function CartTotal({ total, actionLabel, onAction, busy = false }) {
  return (
    <aside className="cart-total">
      <span>Total</span>
      <strong>{currency.format(total)}</strong>
      <button className="primary" type="button" onClick={onAction} disabled={busy}>
        {busy && <Loader2 className="spin" size={18} />}
        {actionLabel}
      </button>
    </aside>
  );
}

function EmptyState({ icon, title, body, actionLabel, onAction }) {
  return (
    <section className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{body}</p>
      {actionLabel && (
        <button className="primary" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </section>
  );
}

export default App;
