import './styles.css';

const products = [
  {
    id: 1,
    brand: 'Toyota',
    model: 'Corolla Cross XEI',
    year: 2023,
    category: 'SUV',
    price: 28900000,
    installments: '48 cuotas de $ 1.020.000',
    km: '18.500 km',
    transmission: 'Automática',
    fuel: 'Híbrido',
    location: 'Palermo, Buenos Aires',
    badge: 'Oportunidad',
    image: 'photo-1519641471654-76ce0107ad1b',
    color: '#e5e9e9',
  },
  {
    id: 2,
    brand: 'Volkswagen',
    model: 'Taos Comfortline',
    year: 2022,
    category: 'SUV',
    price: 31500000,
    installments: '48 cuotas de $ 1.112.000',
    km: '26.000 km',
    transmission: 'Automática',
    fuel: 'Nafta',
    location: 'Rosario, Santa Fe',
    badge: 'Único dueño',
    image: 'photo-1511919884226-fd3cad34687c',
    color: '#e8e8e6',
  },
  {
    id: 3,
    brand: 'Ford',
    model: 'Ranger XLT 3.2',
    year: 2021,
    category: 'Pick-up',
    price: 34700000,
    installments: '48 cuotas de $ 1.225.000',
    km: '42.000 km',
    transmission: 'Automática',
    fuel: 'Diésel',
    location: 'Córdoba, Córdoba',
    badge: 'Bajó de precio',
    image: 'photo-1551830820-330a71b99659',
    color: '#e8e7e4',
  },
  {
    id: 4,
    brand: 'Honda',
    model: 'Civic Touring 1.5T',
    year: 2022,
    category: 'Sedán',
    price: 26900000,
    installments: '48 cuotas de $ 948.000',
    km: '22.300 km',
    transmission: 'Automática',
    fuel: 'Nafta',
    location: 'Belgrano, Buenos Aires',
    badge: 'Garantía 1 año',
    image: 'photo-1552519507-da3b142c6e3d',
    color: '#e5e7e6',
  },
  {
    id: 5,
    brand: 'Jeep',
    model: 'Renegade Longitude',
    year: 2023,
    category: 'SUV',
    price: 25400000,
    installments: '48 cuotas de $ 895.000',
    km: '12.800 km',
    transmission: 'Automática',
    fuel: 'Nafta',
    location: 'Mendoza, Mendoza',
    badge: 'Como nuevo',
    image: 'photo-1533473359331-0135ef1b58bf',
    color: '#e7e7e2',
  },
  {
    id: 6,
    brand: 'Chevrolet',
    model: 'Tracker Premier 1.2T',
    year: 2022,
    category: 'SUV',
    price: 23800000,
    installments: '48 cuotas de $ 838.000',
    km: '31.000 km',
    transmission: 'Automática',
    fuel: 'Nafta',
    location: 'La Plata, Buenos Aires',
    badge: 'Revisado',
    image: 'photo-1503376780353-7e6692767b70',
    color: '#e7e6e3',
  },
  {
    id: 7,
    brand: 'Nissan',
    model: 'Kicks Exclusive CVT',
    year: 2023,
    category: 'SUV',
    price: 24900000,
    installments: '48 cuotas de $ 877.000',
    km: '16.200 km',
    transmission: 'Automática',
    fuel: 'Nafta',
    location: 'Mar del Plata, Buenos Aires',
    badge: 'Precio especial',
    image: 'photo-1549317661-bd32c8ce0db2',
    color: '#e7e7e5',
  },
  {
    id: 8,
    brand: 'Renault',
    model: 'Duster Iconic 1.3T',
    year: 2022,
    category: 'SUV',
    price: 22100000,
    installments: '48 cuotas de $ 778.000',
    km: '35.700 km',
    transmission: 'Automática',
    fuel: 'Nafta',
    location: 'San Isidro, Buenos Aires',
    badge: 'Financiación',
    image: 'photo-1542362567-b07e54358753',
    color: '#e8e8e6',
  },
];

const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});
const icon = (name, size = 20) => {
  const paths = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="4"/>',
    cart: '<path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L22 8H6"/><circle cx="10" cy="21" r="1"/><circle cx="18" cy="21" r="1"/>',
    pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>',
    arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
    close: '<path d="m18 6-12 12M6 6l12 12"/>',
    minus: '<path d="M5 12h14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    truck: '<path d="M10 17h4V5H2v12h3"/><path d="M14 9h4l4 4v4h-3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};

const state = {
  category: 'Todos',
  query: '',
  sort: 'relevant',
  cart: new Map(),
  favorites: new Set(),
  user: null,
};

document.querySelector('#app').innerHTML = `
  <div class="top-strip">
    <div class="top-strip-inner">
      <span class="location">${icon('pin', 16)} Envío gratis a todo el país</span>
      <nav aria-label="Información">
        <a href="#beneficios">Cómo funciona</a>
        <a href="#beneficios">Vender mi auto</a>
        <a href="#beneficios">Ayuda</a>
      </nav>
    </div>
  </div>
  <header class="site-header">
    <div class="header-main">
      <a class="brand" href="#" aria-label="Ruta, inicio"><span class="brand-mark">r</span><span>ruta<span class="brand-dot">.</span></span></a>
      <form class="search-form" role="search">
        <input id="search-input" type="search" placeholder="Buscá por marca, modelo o versión..." aria-label="Buscar vehículos" />
        <button type="submit" aria-label="Buscar">${icon('search')}</button>
      </form>
      <div class="header-actions">
        <button class="header-action account-action" id="account-button">${icon('user')}<span id="account-label">Ingresá</span></button>
        <button class="header-action cart-action" id="cart-button" aria-label="Abrir carrito">${icon('cart')}<span>Carrito</span><b id="cart-count" class="cart-count">0</b></button>
      </div>
    </div>
    <div class="header-sub">
      <button class="mobile-category-button" id="mobile-category-button">${icon('menu')} Categorías</button>
      <nav class="category-nav" aria-label="Categorías de vehículos">
        <button class="category-link active" data-category="Todos">Todos los autos</button>
        <button class="category-link" data-category="SUV">SUV</button>
        <button class="category-link" data-category="Sedán">Sedanes</button>
        <button class="category-link" data-category="Pick-up">Pick-ups</button>
        <button class="category-link" data-category="Eléctrico">Eléctricos</button>
      </nav>
      <span class="safe-note">${icon('shield', 16)} Compra protegida</span>
    </div>
  </header>

  <main>
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-content">
        <span class="eyebrow"><span class="eyebrow-dot"></span> TU PRÓXIMO AUTO ESTÁ ACÁ</span>
        <h1 id="hero-title">Encontrá el auto<br />que <em>va con vos.</em></h1>
        <p>Elegí entre cientos de autos revisados, con precios claros y financiación a tu medida.</p>
        <a class="hero-cta" href="#catalogo">Explorar autos ${icon('arrow', 18)}</a>
        <div class="hero-proof"><span class="proof-avatars"><i>J</i><i>M</i><i>L</i></span><span><b>+2.400 personas</b> encontraron su auto</span></div>
      </div>
      <div class="hero-art" role="img" aria-label="Auto moderno en la ruta">
        <div class="hero-circle"></div>
        <div class="hero-road"></div>
        <img src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=85" alt="" />
        <div class="hero-float-card"><span class="float-icon">${icon('check', 17)}</span><span><b>Revisado por expertos</b><small>Listo para salir a la ruta</small></span></div>
        <div class="hero-sticker">TU PRÓXIMA<br />AVENTURA<br /><b>EMPIEZA ACÁ</b></div>
      </div>
      <div class="hero-bottom">
        <span>${icon('shield', 17)} Autos verificados</span><i></i><span>${icon('truck', 18)} Entrega a domicilio</span><i></i><span>${icon('check', 17)} Garantía incluida</span>
      </div>
    </section>

    <section class="catalog-section" id="catalogo">
      <div class="catalog-heading">
        <div><span class="section-kicker">SELECCIÓN RUTA</span><h2>Autos para cada camino</h2><p>Encontrá el tuyo entre nuestros elegidos de la semana.</p></div>
        <label class="sort-control">Ordenar por
          <select id="sort-select" aria-label="Ordenar vehículos">
            <option value="relevant">Recomendados</option>
            <option value="price-asc">Menor precio</option>
            <option value="price-desc">Mayor precio</option>
            <option value="year">Más nuevos</option>
          </select>
        </label>
      </div>
      <div class="catalog-layout">
        <aside class="filters" id="filters" aria-label="Filtros">
          <div class="filter-heading"><h3>Filtrar por</h3><button id="clear-filters">Limpiar</button></div>
          <div class="filter-group"><h4>Tipo de vehículo</h4>
            <label class="filter-option"><input type="radio" name="category" value="Todos" checked /><span>Todos los autos</span><small>${products.length}</small></label>
            <label class="filter-option"><input type="radio" name="category" value="SUV" /><span>SUV</span><small>6</small></label>
            <label class="filter-option"><input type="radio" name="category" value="Sedán" /><span>Sedanes</span><small>1</small></label>
            <label class="filter-option"><input type="radio" name="category" value="Pick-up" /><span>Pick-ups</span><small>1</small></label>
          </div>
          <div class="filter-group price-filter"><h4>Precio</h4>
            <div class="price-range"><span><small>Desde</small><b>$ 20 M</b></span><span class="range-separator">—</span><span><small>Hasta</small><b>$ 35 M</b></span></div>
            <div class="range-track"><span></span><i></i><i></i></div>
            <small class="filter-hint">Precios en pesos argentinos</small>
          </div>
          <div class="filter-group"><h4>Año</h4>
            <label class="filter-option"><input type="checkbox" checked disabled /><span>2021 — 2024</span><small>8</small></label>
          </div>
          <div class="filter-promo"><span class="promo-icon">${icon('shield', 20)}</span><b>Comprá con tranquilidad</b><p>Todos nuestros vehículos tienen revisión mecánica de 120 puntos.</p><a href="#beneficios">Conocé más ${icon('arrow', 14)}</a></div>
        </aside>
        <div class="catalog-main">
          <div class="active-filters"><span id="results-count">8 autos encontrados</span><button class="filter-chip" id="active-category" hidden>Todos <span>×</span></button></div>
          <div class="product-grid" id="product-grid" aria-live="polite"></div>
          <div class="catalog-end"><span class="end-line"></span><span>Estás al día con los mejores autos</span><span class="end-line"></span></div>
        </div>
      </div>
    </section>

    <section class="benefits" id="beneficios">
      <div class="benefits-intro"><span class="section-kicker">MANEJÁ TRANQUILO</span><h2>Tu compra, sin vueltas.</h2><p>Te acompañamos de la búsqueda a la primera salida.</p></div>
      <article class="benefit-card"><span>${icon('shield', 22)}</span><h3>Autos inspeccionados</h3><p>Revisamos cada detalle con un control mecánico de 120 puntos.</p></article>
      <article class="benefit-card"><span>${icon('check', 22)}</span><h3>Compra protegida</h3><p>Tu dinero está seguro hasta que recibís las llaves.</p></article>
      <article class="benefit-card"><span>${icon('truck', 22)}</span><h3>Te lo llevamos</h3><p>Recibí el auto en tu casa, estés donde estés.</p></article>
    </section>
  </main>
  <footer class="site-footer"><a class="brand footer-brand" href="#"><span class="brand-mark">r</span><span>ruta<span class="brand-dot">.</span></span></a><span>Encontrá tu camino. © 2025 Ruta Autos</span><a href="#catalogo">Volver arriba ↑</a></footer>

  <div class="overlay" id="overlay" hidden></div>
  <aside class="cart-drawer" id="cart-drawer" aria-label="Tu carrito" aria-hidden="true">
    <div class="drawer-header"><div><span class="section-kicker">TU SELECCIÓN</span><h2>Mi carrito <span id="drawer-count">(0)</span></h2></div><button class="icon-button" id="close-cart" aria-label="Cerrar carrito">${icon('close')}</button></div>
    <div class="cart-items" id="cart-items"></div>
    <div class="cart-empty" id="cart-empty"><span class="empty-cart-icon">${icon('cart', 30)}</span><h3>Tu carrito está esperando</h3><p>Sumá ese auto que te robó una mirada.</p><button class="text-button" id="continue-shopping">Seguir explorando ${icon('arrow', 16)}</button></div>
    <div class="cart-summary" id="cart-summary" hidden><div class="summary-row"><span>Subtotal</span><b id="cart-subtotal"></b></div><div class="summary-row shipping"><span>${icon('truck', 17)} Envío a domicilio</span><b>Gratis</b></div><p>El precio final se confirma con un asesor.</p><button class="primary-button checkout-button" id="checkout-button">Continuar compra ${icon('arrow', 18)}</button><div class="protected-note">${icon('shield', 16)} Compra protegida y segura</div></div>
  </aside>

  <dialog class="auth-dialog" id="auth-dialog" aria-labelledby="auth-title">
    <button class="icon-button auth-close" id="close-auth" aria-label="Cerrar">${icon('close')}</button>
    <div class="auth-mark">${icon('user', 25)}</div>
    <span class="section-kicker">QUÉ BUENO VERTE</span>
    <h2 id="auth-title">Ingresá a tu cuenta</h2>
    <p class="auth-intro">Iniciá sesión para continuar con tu compra.</p>
    <form id="login-form">
      <label for="email-input">Correo electrónico</label>
      <input id="email-input" type="email" placeholder="tu@email.com" autocomplete="username" required />
      <label for="password-input">Contraseña</label>
      <input id="password-input" type="password" placeholder="Ingresá tu contraseña" autocomplete="current-password" required />
      <p class="login-error" id="login-error" role="alert"></p>
      <button class="primary-button login-submit" type="submit">Ingresar ${icon('arrow', 18)}</button>
    </form>
    <div class="demo-account"><b>Cuenta de prueba</b><span>demo@ruta.com <button type="button" class="copy-demo" data-value="demo@ruta.com" aria-label="Usar correo de prueba">${icon('check', 14)}</button></span><span>ruta123 <button type="button" class="copy-demo" data-value="ruta123" aria-label="Usar contraseña de prueba">${icon('check', 14)}</button></span></div>
    <p class="auth-disclaimer">Acceso de demostración. No se conecta a un servidor.</p>
  </dialog>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>
`;

const productGrid = document.querySelector('#product-grid');
const overlay = document.querySelector('#overlay');
const cartDrawer = document.querySelector('#cart-drawer');
const authDialog = document.querySelector('#auth-dialog');
let toastTimer;

function formatPrice(price) {
  return currency.format(price).replace(/\u00a0/g, ' ');
}

function imageUrl(id) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=82`;
}

function getVisibleProducts() {
  let visible = products.filter((product) => {
    const matchesCategory = state.category === 'Todos' || product.category === state.category;
    const haystack = `${product.brand} ${product.model} ${product.category} ${product.year}`.toLowerCase();
    return matchesCategory && haystack.includes(state.query.toLowerCase());
  });
  if (state.sort === 'price-asc') visible = visible.sort((a, b) => a.price - b.price);
  if (state.sort === 'price-desc') visible = visible.sort((a, b) => b.price - a.price);
  if (state.sort === 'year') visible = visible.sort((a, b) => b.year - a.year);
  return visible;
}

function renderProducts() {
  const visible = getVisibleProducts();
  document.querySelector('#results-count').textContent = `${visible.length} ${visible.length === 1 ? 'auto encontrado' : 'autos encontrados'}`;
  const chip = document.querySelector('#active-category');
  chip.hidden = state.category === 'Todos';
  chip.innerHTML = `${state.category} <span>×</span>`;
  productGrid.innerHTML = visible.length ? visible.map((product) => `
    <article class="product-card">
      <div class="product-image" style="--image-bg:${product.color}">
        <img src="${imageUrl(product.image)}" alt="${product.brand} ${product.model} ${product.year}" loading="lazy" />
        <span class="product-badge">${product.badge}</span>
        <button class="favorite-button ${state.favorites.has(product.id) ? 'is-favorite' : ''}" data-favorite="${product.id}" aria-label="${state.favorites.has(product.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}">${icon('heart', 19)}</button>
      </div>
      <div class="product-info">
        <span class="product-year">${product.year} <i></i> ${product.km}</span>
        <h3>${product.brand} ${product.model}</h3>
        <div class="spec-list"><span>${product.transmission}</span><i></i><span>${product.fuel}</span></div>
        <div class="price-block"><strong>${formatPrice(product.price)}</strong><span>${product.installments}</span></div>
        <div class="product-location">${icon('pin', 14)} ${product.location}</div>
        <div class="product-actions">
          <button class="add-cart-button" data-add="${product.id}" aria-label="Agregar ${product.brand} ${product.model} al carrito">${icon('cart', 18)}</button>
          <button class="buy-button" data-buy="${product.id}">Comprar ahora ${icon('arrow', 16)}</button>
        </div>
      </div>
    </article>
  `).join('') : `<div class="no-results"><span>${icon('search', 28)}</span><h3>No encontramos ese auto</h3><p>Probá con otra marca o modelo.</p><button class="text-button" id="reset-search">Ver todos los autos ${icon('arrow', 16)}</button></div>`;
}

function cartQuantity() {
  return [...state.cart.values()].reduce((total, item) => total + item.quantity, 0);
}

function renderCart() {
  const count = cartQuantity();
  document.querySelector('#cart-count').textContent = count;
  document.querySelector('#drawer-count').textContent = `(${count})`;
  document.querySelector('#cart-empty').hidden = count > 0;
  document.querySelector('#cart-summary').hidden = count === 0;
  document.querySelector('#cart-items').innerHTML = [...state.cart.values()].map(({ product, quantity }) => `
    <article class="cart-item">
      <img src="${imageUrl(product.image)}" alt="" />
      <div class="cart-item-info"><span>${product.brand}</span><h3>${product.model}</h3><b>${formatPrice(product.price)}</b>
        <div class="quantity-control"><button data-quantity="${product.id}" data-change="-1" aria-label="Quitar una unidad">${icon('minus', 15)}</button><span>${quantity}</span><button data-quantity="${product.id}" data-change="1" aria-label="Agregar una unidad">${icon('plus', 15)}</button></div>
      </div>
      <button class="remove-item" data-remove="${product.id}" aria-label="Quitar ${product.model} del carrito">${icon('close', 17)}</button>
    </article>
  `).join('');
  const subtotal = [...state.cart.values()].reduce((total, item) => total + item.product.price * item.quantity, 0);
  document.querySelector('#cart-subtotal').textContent = formatPrice(subtotal);
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 2800);
}

function openCart() {
  renderCart();
  overlay.hidden = false;
  cartDrawer.classList.add('is-open');
  cartDrawer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
}

function closeCart() {
  cartDrawer.classList.remove('is-open');
  cartDrawer.setAttribute('aria-hidden', 'true');
  if (authDialog.open) return;
  overlay.hidden = true;
  document.body.classList.remove('no-scroll');
}

function addToCart(product, shouldCheckout = false) {
  const existing = state.cart.get(product.id);
  state.cart.set(product.id, { product, quantity: (existing?.quantity ?? 0) + 1 });
  renderCart();
  if (shouldCheckout) {
    closeCart();
    requestCheckout();
  } else {
    showToast(`${product.brand} ${product.model} se agregó al carrito`);
  }
}

function requestCheckout() {
  if (state.cart.size === 0) return;
  if (!state.user) {
    overlay.hidden = false;
    document.body.classList.add('no-scroll');
    authDialog.showModal();
    document.querySelector('#login-error').textContent = '';
    document.querySelector('#email-input').focus();
    return;
  }
  state.cart.clear();
  renderCart();
  closeCart();
  showToast(`¡Listo, ${state.user.name}! Tu solicitud de compra quedó registrada.`);
}

function setCategory(category) {
  state.category = category;
  document.querySelectorAll('.category-link').forEach((button) => button.classList.toggle('active', button.dataset.category === category));
  document.querySelectorAll('input[name="category"]').forEach((input) => { input.checked = input.value === category; });
  renderProducts();
}

document.querySelector('.search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  state.query = document.querySelector('#search-input').value.trim();
  renderProducts();
  document.querySelector('#catalogo').scrollIntoView({ behavior: 'smooth' });
});
document.querySelector('#search-input').addEventListener('input', (event) => {
  state.query = event.target.value.trim();
  renderProducts();
});
document.querySelectorAll('.category-link').forEach((button) => button.addEventListener('click', () => setCategory(button.dataset.category)));
document.querySelectorAll('input[name="category"]').forEach((input) => input.addEventListener('change', () => setCategory(input.value)));
document.querySelector('#sort-select').addEventListener('change', (event) => {
  state.sort = event.target.value;
  renderProducts();
});
document.querySelector('#clear-filters').addEventListener('click', () => {
  setCategory('Todos');
  state.query = '';
  document.querySelector('#search-input').value = '';
  document.querySelector('#sort-select').value = 'relevant';
  state.sort = 'relevant';
});
document.querySelector('#active-category').addEventListener('click', () => setCategory('Todos'));
document.querySelector('#mobile-category-button').addEventListener('click', () => document.querySelector('#filters').classList.toggle('filters-open'));
document.querySelector('#product-grid').addEventListener('click', (event) => {
  const favorite = event.target.closest('[data-favorite]');
  if (favorite) {
    const id = Number(favorite.dataset.favorite);
    state.favorites.has(id) ? state.favorites.delete(id) : state.favorites.add(id);
    renderProducts();
    return;
  }
  const addButton = event.target.closest('[data-add]');
  const buyButton = event.target.closest('[data-buy]');
  if (addButton) addToCart(products.find((product) => product.id === Number(addButton.dataset.add)));
  if (buyButton) addToCart(products.find((product) => product.id === Number(buyButton.dataset.buy)), true);
  if (event.target.closest('#reset-search')) {
    state.query = '';
    document.querySelector('#search-input').value = '';
    renderProducts();
  }
});
document.querySelector('#cart-button').addEventListener('click', openCart);
document.querySelector('#close-cart').addEventListener('click', closeCart);
document.querySelector('#continue-shopping').addEventListener('click', closeCart);
document.querySelector('#checkout-button').addEventListener('click', requestCheckout);
document.querySelector('#cart-items').addEventListener('click', (event) => {
  const remove = event.target.closest('[data-remove]');
  if (remove) state.cart.delete(Number(remove.dataset.remove));
  const quantity = event.target.closest('[data-quantity]');
  if (quantity) {
    const id = Number(quantity.dataset.quantity);
    const item = state.cart.get(id);
    const next = item.quantity + Number(quantity.dataset.change);
    if (next < 1) state.cart.delete(id);
    else state.cart.set(id, { ...item, quantity: next });
  }
  renderCart();
});
document.querySelector('#account-button').addEventListener('click', () => {
  if (state.user) {
    state.user = null;
    document.querySelector('#account-label').textContent = 'Ingresá';
    showToast('Cerraste sesión.');
  } else {
    overlay.hidden = false;
    document.body.classList.add('no-scroll');
    authDialog.showModal();
    document.querySelector('#login-error').textContent = '';
    document.querySelector('#email-input').focus();
  }
});
document.querySelector('#login-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const email = document.querySelector('#email-input').value.trim().toLowerCase();
  const password = document.querySelector('#password-input').value;
  if (email !== 'demo@ruta.com' || password !== 'ruta123') {
    document.querySelector('#login-error').textContent = 'El correo o la contraseña no son correctos. Probá con la cuenta de demostración.';
    return;
  }
  state.user = { name: 'Alex', email };
  document.querySelector('#account-label').textContent = 'Hola, Alex';
  authDialog.close();
  overlay.hidden = true;
  document.body.classList.remove('no-scroll');
  showToast('¡Hola, Alex! Ya podés continuar con tu compra.');
  if (state.cart.size) requestCheckout();
});
document.querySelector('#close-auth').addEventListener('click', () => {
  authDialog.close();
  if (!cartDrawer.classList.contains('is-open')) {
    overlay.hidden = true;
    document.body.classList.remove('no-scroll');
  }
});
document.querySelectorAll('.copy-demo').forEach((button) => button.addEventListener('click', () => {
  const field = button.dataset.value.includes('@') ? '#email-input' : '#password-input';
  document.querySelector(field).value = button.dataset.value;
  showToast(button.dataset.value.includes('@') ? 'Correo de prueba listo' : 'Contraseña de prueba lista');
}));
overlay.addEventListener('click', () => {
  if (authDialog.open) authDialog.close();
  closeCart();
});
authDialog.addEventListener('click', (event) => {
  if (event.target === authDialog) authDialog.close();
});
authDialog.addEventListener('close', () => {
  if (!cartDrawer.classList.contains('is-open')) {
    overlay.hidden = true;
    document.body.classList.remove('no-scroll');
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && cartDrawer.classList.contains('is-open')) closeCart();
});

renderProducts();
renderCart();
