/*
 * Frontend de Ruta (Vite + JavaScript).
 * Solo se ocupa de la interaccion con el usuario: todos los datos vienen de
 * la API (/api/...) y todas las modificaciones se envian a la API.
 *
 * Rutas (hash):
 *   #/          catalogo
 *   #/compras   mis compras y ventas (con sesion)
 *   #/vender    publicar y gestionar vehiculos (VENDEDOR / ADMIN)
 *   #/panel     reportes y bandeja del asesor (ASESOR / ADMIN)
 */
import './styles.css';
import { api, ApiError, session, toQuery } from './api.js';

/* ============================== utilidades ============================== */

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('es-CL');
const money = (value) => (value === null || value === undefined ? '—' : clp.format(value));
const km = (value) => `${num.format(value)} km`;
const date = (value) => (value ? new Date(value).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** Escapa texto antes de insertarlo como HTML (evita XSS con datos de la BD). */
const h = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const TRANSMISION = { MANUAL: 'Manual', AUTOMATICA: 'Automática', CVT: 'CVT', OTRA: 'Otra' };
const ESTADO_LABEL = {
  DISPONIBLE: 'Disponible', RESERVADO: 'Reservado', VENDIDO: 'Vendido', PAUSADO: 'Pausado',
  PENDIENTE: 'Pendiente', PAGADA: 'Pagada', RECHAZADA: 'Rechazada', CANCELADA: 'Cancelada', VENCIDA: 'Vencida',
  AUTORIZADO: 'Autorizado', RECHAZADO: 'Rechazado', PROGRAMADA: 'Programada', EN_TRANSITO: 'En tránsito',
  ENTREGADA: 'Entregada', FALLIDA: 'Fallida'
};
const ESTADO_TONO = {
  DISPONIBLE: 'ok', PAGADA: 'ok', AUTORIZADO: 'ok', ENTREGADA: 'ok',
  RESERVADO: 'warn', PENDIENTE: 'warn', PROGRAMADA: 'warn', EN_TRANSITO: 'warn',
  VENDIDO: 'info', PAUSADO: 'mute',
  CANCELADA: 'bad', RECHAZADA: 'bad', RECHAZADO: 'bad', VENCIDA: 'bad', FALLIDA: 'bad'
};
const pill = (estado) => (estado ? `<span class="pill pill-${ESTADO_TONO[estado] ?? 'mute'}">${h(ESTADO_LABEL[estado] ?? estado)}</span>` : '—');

const icon = (name, size = 20) => {
  const paths = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="4"/>',
    cart: '<path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L22 8H6"/><circle cx="10" cy="21" r="1"/><circle cx="18" cy="21" r="1"/>',
    pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    back: '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
    close: '<path d="m18 6-12 12M6 6l12 12"/>',
    truck: '<path d="M10 17h4V5H2v12h3"/><path d="M14 9h4l4 4v4h-3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15v3M12 10v8M17 6v12"/>',
    receipt: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2Z"/><path d="M9 8h6M9 12h6"/>'
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};

/* ================================ estado ================================ */

const PAGE_SIZE = 9;
const state = {
  filtros: null,
  query: { q: '', categoriaId: '', marcaId: '', precioMin: '', precioMax: '', anioMin: '', anioMax: '', transmision: '', orden: 'recientes', pagina: 1 },
  resultado: null,
  carrito: [],
  perfil: null
};

const user = () => session.user;
const hasRole = (...roles) => roles.includes(user()?.rol);

/* ============================ estructura base ============================ */

document.querySelector('#app').innerHTML = `
  <div class="top-strip">
    <div class="top-strip-inner">
      <span class="location">${icon('truck', 16)} Despacho a todo Chile</span>
      <nav aria-label="Información">
        <a href="#/">Catálogo</a>
        <a href="#/vender">Vender mi auto</a>
        <a href="#beneficios">Cómo funciona</a>
      </nav>
    </div>
  </div>
  <header class="site-header">
    <div class="header-main">
      <a class="brand" href="#/" aria-label="Ruta, inicio"><span class="brand-mark">r</span><span>ruta<span class="brand-dot">.</span></span></a>
      <form class="search-form" role="search" id="search-form">
        <input id="search-input" type="search" maxlength="60" placeholder="Busca por marca, modelo o versión..." aria-label="Buscar vehículos" />
        <button type="submit" aria-label="Buscar">${icon('search')}</button>
      </form>
      <div class="header-actions">
        <div class="account-wrap">
          <button class="header-action account-action" id="account-button" aria-haspopup="menu">${icon('user')}<span id="account-label">Ingresa</span></button>
          <div class="account-menu" id="account-menu" role="menu" hidden></div>
        </div>
        <button class="header-action cart-action" id="cart-button" aria-label="Abrir carrito">${icon('cart')}<span>Carrito</span><b id="cart-count" class="cart-count">0</b></button>
      </div>
    </div>
    <div class="header-sub">
      <button class="mobile-category-button" id="mobile-category-button">${icon('menu')} Filtros</button>
      <nav class="category-nav" id="category-nav" aria-label="Categorías de vehículos"></nav>
      <span class="safe-note">${icon('shield', 16)} Compra protegida</span>
    </div>
  </header>

  <main>
    <div id="page-catalogo">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-content">
          <span class="eyebrow"><span class="eyebrow-dot"></span> TU PRÓXIMO AUTO ESTÁ ACÁ</span>
          <h1 id="hero-title">Encuentra el auto<br />que <em>va contigo.</em></h1>
          <p>Autos usados revisados, con precio claro, historial de precios y financiamiento en cuotas.</p>
          <a class="hero-cta" href="#catalogo">Explorar autos ${icon('arrow', 18)}</a>
          <div class="hero-proof"><span class="proof-avatars"><i>J</i><i>M</i><i>L</i></span><span id="hero-proof"><b>Autos verificados</b> en todo Chile</span></div>
        </div>
        <div class="hero-art" role="img" aria-label="Auto moderno en la ruta">
          <div class="hero-circle"></div>
          <div class="hero-road"></div>
          <img src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=85" alt="" />
          <div class="hero-float-card"><span class="float-icon">${icon('check', 17)}</span><span><b>Revisado por expertos</b><small>Listo para salir a la ruta</small></span></div>
          <div class="hero-sticker">TU PRÓXIMA<br />AVENTURA<br /><b>EMPIEZA ACÁ</b></div>
        </div>
        <div class="hero-bottom">
          <span>${icon('shield', 17)} Autos verificados</span><i></i><span>${icon('truck', 18)} Entrega a domicilio</span><i></i><span>${icon('check', 17)} Historial de precios</span>
        </div>
      </section>

      <section class="catalog-section" id="catalogo">
        <div class="catalog-heading">
          <div><span class="section-kicker">SELECCIÓN RUTA</span><h2>Autos para cada camino</h2><p>Datos en vivo desde la base de datos.</p></div>
          <label class="sort-control">Ordenar por
            <select id="sort-select" aria-label="Ordenar vehículos">
              <option value="recientes">Más recientes</option>
              <option value="precio_asc">Menor precio</option>
              <option value="precio_desc">Mayor precio</option>
              <option value="anio">Más nuevos</option>
              <option value="km">Menos kilómetros</option>
            </select>
          </label>
        </div>
        <div class="catalog-layout">
          <aside class="filters" id="filters" aria-label="Filtros">
            <form id="filters-form">
              <div class="filter-heading"><h3>Filtrar por</h3><button type="button" id="clear-filters">Limpiar</button></div>
              <div class="filter-group"><h4>Tipo de vehículo</h4><div id="category-filters"></div></div>
              <div class="filter-group"><h4>Marca</h4>
                <select class="field-input" name="marcaId" id="brand-filter"><option value="">Todas las marcas</option></select>
              </div>
              <div class="filter-group"><h4>Precio (CLP)</h4>
                <div class="range-inputs">
                  <input class="field-input" name="precioMin" type="number" min="0" step="500000" placeholder="Desde" />
                  <input class="field-input" name="precioMax" type="number" min="0" step="500000" placeholder="Hasta" />
                </div>
                <small class="filter-hint" id="price-hint"></small>
              </div>
              <div class="filter-group"><h4>Año</h4>
                <div class="range-inputs">
                  <input class="field-input" name="anioMin" type="number" min="1950" max="2100" placeholder="Desde" />
                  <input class="field-input" name="anioMax" type="number" min="1950" max="2100" placeholder="Hasta" />
                </div>
              </div>
              <div class="filter-group"><h4>Transmisión</h4>
                <select class="field-input" name="transmision">
                  <option value="">Todas</option><option value="AUTOMATICA">Automática</option><option value="MANUAL">Manual</option><option value="CVT">CVT</option>
                </select>
              </div>
              <button class="primary-button filter-apply" type="submit">Aplicar filtros</button>
              <p class="form-error" id="filters-error" role="alert"></p>
            </form>
            <div class="filter-promo"><span class="promo-icon">${icon('shield', 20)}</span><b>Compra con tranquilidad</b><p>Cada auto muestra su última revisión técnica y su historial de precios.</p></div>
          </aside>
          <div class="catalog-main">
            <div class="active-filters"><span id="results-count">Cargando autos...</span></div>
            <div class="product-grid" id="product-grid" aria-live="polite"></div>
            <nav class="pagination" id="pagination" aria-label="Paginación"></nav>
          </div>
        </div>
      </section>

      <section class="benefits" id="beneficios">
        <div class="benefits-intro"><span class="section-kicker">MANEJA TRANQUILO</span><h2>Tu compra, sin vueltas.</h2><p>Así funciona comprar en Ruta.</p></div>
        <article class="benefit-card"><span>${icon('cart', 22)}</span><h3>1. Reserva</h3><p>Al iniciar la compra el auto queda reservado para ti y sale del catálogo.</p></article>
        <article class="benefit-card"><span>${icon('receipt', 22)}</span><h3>2. Paga</h3><p>Al contado o en cuotas. Tu pago queda registrado con su orden de compra.</p></article>
        <article class="benefit-card"><span>${icon('truck', 22)}</span><h3>3. Recibe</h3><p>Programamos la entrega a la dirección que elijas.</p></article>
      </section>
    </div>

    <div id="page-app" class="app-page" hidden></div>
  </main>
  <footer class="site-footer"><a class="brand footer-brand" href="#/"><span class="brand-mark">r</span><span>ruta<span class="brand-dot">.</span></span></a><span>Proyecto Taller de Bases de Datos · Ruta Autos</span><a href="#/">Volver al catálogo ↑</a></footer>

  <div class="overlay" id="overlay" hidden></div>
  <aside class="cart-drawer" id="cart-drawer" aria-label="Tu carrito" aria-hidden="true">
    <div class="drawer-header"><div><span class="section-kicker">TU SELECCIÓN</span><h2>Mi carrito <span id="drawer-count">(0)</span></h2></div><button class="icon-button" data-action="close-cart" aria-label="Cerrar carrito">${icon('close')}</button></div>
    <div class="cart-items" id="cart-items"></div>
    <div class="cart-empty" id="cart-empty"><span class="empty-cart-icon">${icon('cart', 30)}</span><h3 id="cart-empty-title">Tu carrito está esperando</h3><p id="cart-empty-text">Agrega ese auto que te robó una mirada.</p><button class="text-button" data-action="close-cart">Seguir explorando ${icon('arrow', 16)}</button></div>
    <div class="cart-summary" id="cart-summary" hidden><div class="summary-row"><span>Total referencial</span><b id="cart-subtotal"></b></div><p>Cada auto es único y se compra por separado: usa “Comprar” en el que quieras.</p></div>
  </aside>

  <dialog class="modal" id="modal"><button class="icon-button modal-close" data-action="close-modal" aria-label="Cerrar">${icon('close')}</button><div id="modal-body"></div></dialog>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
`;

const $ = (selector) => document.querySelector(selector);
const modal = $('#modal');
let toastTimer;

function toast(message, tone = 'ok') {
  const element = $('#toast');
  element.textContent = message;
  element.dataset.tone = tone;
  element.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('visible'), 3400);
}

function showError(error) {
  toast(error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.', 'bad');
  if (!(error instanceof ApiError)) console.error(error);
}

function openModal(html, { wide = false } = {}) {
  $('#modal-body').innerHTML = html;
  modal.classList.toggle('modal-wide', wide);
  if (!modal.open) modal.showModal();
  modal.querySelector('input, select, textarea')?.focus();
}

function closeModal() {
  if (modal.open) modal.close();
}

/** Deshabilita el boton mientras corre la peticion (evita doble envio). */
async function withBusy(button, task) {
  if (button) { button.disabled = true; button.dataset.busy = 'true'; }
  try { return await task(); } finally {
    if (button) { button.disabled = false; delete button.dataset.busy; }
  }
}

/* ============================ sesion y cuenta ============================ */

session.onUnauthorized(() => {
  session.clear();
  state.carrito = [];
  renderAccount();
  renderCartCount();
  toast('Tu sesión expiró. Vuelve a ingresar.', 'bad');
});

function renderAccount() {
  const u = user();
  $('#account-label').textContent = u ? `Hola, ${u.nombre}` : 'Ingresa';
  const links = [];
  if (u) {
    links.push(`<a role="menuitem" href="#/compras">${icon('receipt', 16)} Mis compras</a>`);
    if (hasRole('VENDEDOR', 'ADMIN')) links.push(`<a role="menuitem" href="#/vender">${icon('tag', 16)} Mis publicaciones</a>`);
    if (hasRole('ASESOR', 'ADMIN')) links.push(`<a role="menuitem" href="#/panel">${icon('chart', 16)} Panel</a>`);
    links.push(`<button role="menuitem" data-action="logout">${icon('back', 16)} Cerrar sesión</button>`);
  }
  $('#account-menu').innerHTML = u
    ? `<div class="account-menu-head"><b>${h(u.nombre)} ${h(u.apellido)}</b><small>${h(u.email)} · ${h(u.rol)}</small></div>${links.join('')}`
    : '';
}

const DEMO_ACCOUNTS = [
  ['demo@ruta.cl', 'Cliente'], ['vendedor@ruta.cl', 'Vendedor'], ['asesor@ruta.cl', 'Asesor'], ['admin@ruta.cl', 'Admin']
];

function openAuth(mode = 'login', message = '') {
  const login = mode === 'login';
  openModal(`
    <div class="auth-mark">${icon('user', 25)}</div>
    <span class="section-kicker">${login ? 'QUÉ BUENO VERTE' : 'CREA TU CUENTA'}</span>
    <h2>${login ? 'Ingresa a tu cuenta' : 'Regístrate en Ruta'}</h2>
    ${message ? `<p class="auth-intro">${h(message)}</p>` : ''}
    <div class="tabs" role="tablist">
      <button role="tab" class="tab ${login ? 'active' : ''}" data-action="auth-mode" data-mode="login">Ingresar</button>
      <button role="tab" class="tab ${login ? '' : 'active'}" data-action="auth-mode" data-mode="registro">Crear cuenta</button>
    </div>
    ${login ? `
      <form id="login-form" class="stack-form" novalidate>
        <label>Correo electrónico<input class="field-input" name="email" type="email" autocomplete="username" required maxlength="120" /></label>
        <label>Contraseña<input class="field-input" name="password" type="password" autocomplete="current-password" required maxlength="100" /></label>
        <p class="form-error" role="alert"></p>
        <button class="primary-button" type="submit">Ingresar ${icon('arrow', 18)}</button>
      </form>
      <div class="demo-account"><b>Cuentas de prueba (contraseña: ruta123)</b>
        ${DEMO_ACCOUNTS.map(([email, rol]) => `<button type="button" class="demo-chip" data-action="fill-demo" data-email="${email}">${rol} · ${email}</button>`).join('')}
      </div>` : `
      <form id="register-form" class="stack-form" novalidate>
        <div class="form-row">
          <label>Nombre<input class="field-input" name="nombre" required maxlength="60" /></label>
          <label>Apellido<input class="field-input" name="apellido" required maxlength="60" /></label>
        </div>
        <label>Correo electrónico<input class="field-input" name="email" type="email" required maxlength="120" /></label>
        <div class="form-row">
          <label>RUT (opcional)<input class="field-input" name="rut" placeholder="12345678-9" maxlength="12" /></label>
          <label>Quiero<select class="field-input" name="rol"><option value="CLIENTE">Comprar</option><option value="VENDEDOR">Comprar y vender</option></select></label>
        </div>
        <label>Contraseña (mínimo 6 caracteres)<input class="field-input" name="password" type="password" minlength="6" required maxlength="100" autocomplete="new-password" /></label>
        <p class="form-error" role="alert"></p>
        <button class="primary-button" type="submit">Crear cuenta ${icon('arrow', 18)}</button>
      </form>`}
  `);
}

async function afterLogin(data) {
  session.save(data);
  closeModal();
  renderAccount();
  await loadCart();
  toast(`¡Hola, ${data.usuario.nombre}!`);
  route();
}

/* ================================ catalogo ================================ */

async function loadFilters() {
  state.filtros = await api('/catalogo/filtros');
  const { categorias, marcas, rangos } = state.filtros;

  $('#category-nav').innerHTML = [
    `<button class="category-link" data-action="category" data-id="">Todos los autos</button>`,
    ...categorias.map((c) => `<button class="category-link" data-action="category" data-id="${c.CategoriaId}">${h(c.Nombre)}</button>`)
  ].join('');

  $('#category-filters').innerHTML = [
    `<label class="filter-option"><input type="radio" name="categoriaId" value="" checked /><span>Todos</span><small>${rangos.TotalDisponibles}</small></label>`,
    ...categorias.map((c) => `<label class="filter-option"><input type="radio" name="categoriaId" value="${c.CategoriaId}" /><span>${h(c.Nombre)}</span><small>${c.Disponibles}</small></label>`)
  ].join('');

  $('#brand-filter').innerHTML = `<option value="">Todas las marcas</option>${marcas.map((m) => `<option value="${m.MarcaId}">${h(m.Nombre)} (${m.Disponibles})</option>`).join('')}`;
  if (rangos.PrecioMin) $('#price-hint').textContent = `Entre ${money(rangos.PrecioMin)} y ${money(rangos.PrecioMax)}`;
  $('#hero-proof').innerHTML = `<b>${rangos.TotalDisponibles} autos</b> disponibles hoy`;
  syncFilterControls();
}

function syncFilterControls() {
  const q = state.query;
  const form = $('#filters-form');
  form.querySelectorAll('input[name="categoriaId"]').forEach((input) => { input.checked = input.value === String(q.categoriaId); });
  for (const name of ['marcaId', 'precioMin', 'precioMax', 'anioMin', 'anioMax', 'transmision']) form.elements[name].value = q[name];
  document.querySelectorAll('.category-link').forEach((b) => b.classList.toggle('active', b.dataset.id === String(q.categoriaId)));
  $('#sort-select').value = q.orden;
}

let searchSeq = 0;
async function loadVehicles() {
  const seq = ++searchSeq;
  const grid = $('#product-grid');
  grid.setAttribute('aria-busy', 'true');
  try {
    const resultado = await api(`/vehiculos${toQuery({ ...state.query, tamanoPagina: PAGE_SIZE })}`);
    if (seq !== searchSeq) return; // llego tarde una respuesta antigua
    state.resultado = resultado;
    $('#filters-error').textContent = '';
    renderVehicles();
  } catch (error) {
    if (seq !== searchSeq) return;
    if (error.status === 400) {
      $('#filters-error').textContent = error.message;
    } else {
      grid.innerHTML = `<div class="no-results"><span>${icon('search', 28)}</span><h3>No pudimos cargar el catálogo</h3><p>${h(error.message)}</p><button class="text-button" data-action="retry">Reintentar ${icon('arrow', 16)}</button></div>`;
      $('#results-count').textContent = '';
    }
  } finally {
    grid.removeAttribute('aria-busy');
  }
}

function badgeFor(v) {
  if (v.BajoDePrecio) return 'Bajó de precio';
  if (v.EsOportunidad) return 'Oportunidad';
  if (v.DuenosAnteriores === 1) return 'Único dueño';
  if (v.RevisionTecnicaOk) return 'Revisado';
  return '';
}

function renderVehicles() {
  const { vehiculos, total, pagina } = state.resultado;
  $('#results-count').textContent = `${total} ${total === 1 ? 'auto encontrado' : 'autos encontrados'}`;
  const inCart = new Set(state.carrito.map((i) => i.ProductoId));

  $('#product-grid').innerHTML = vehiculos.length ? vehiculos.map((v) => {
    const badge = badgeFor(v);
    const own = user()?.id === v.UsuarioVendedorId;
    return `
    <article class="product-card">
      <button class="product-image" data-action="detail" data-id="${v.ProductoId}" aria-label="Ver detalle de ${h(v.Marca)} ${h(v.Modelo)}">
        <img src="${h(v.ImagenPrincipal ?? '')}" alt="" loading="lazy" />
        ${badge ? `<span class="product-badge">${badge}</span>` : ''}
      </button>
      <div class="product-info">
        <span class="product-year">${v.Anio} <i></i> ${km(v.Kilometraje)}</span>
        <h3><button class="link-button" data-action="detail" data-id="${v.ProductoId}">${h(v.Marca)} ${h(v.Modelo)}</button></h3>
        <div class="spec-list"><span>${h(v.Version ?? v.Categoria)}</span><i></i><span>${TRANSMISION[v.Transmision] ?? h(v.Transmision)}</span><i></i><span>${h(v.Combustible)}</span></div>
        <div class="price-block"><strong>${money(v.Precio)}</strong>${v.BajoDePrecio ? `<s>${money(v.PrecioAnterior)}</s>` : ''}<span>${v.CuotasReferencia ? `${v.CuotasReferencia} cuotas de ${money(v.CuotaReferencia)}` : 'Al contado'}</span></div>
        <div class="product-location">${icon('pin', 14)} ${h(v.Ciudad)}, ${h(v.Provincia)}</div>
        <div class="product-actions">
          ${own ? '<span class="own-note">Es tu publicación</span>' : `
          <button class="add-cart-button ${inCart.has(v.ProductoId) ? 'is-in-cart' : ''}" data-action="add-cart" data-id="${v.ProductoId}" aria-label="${inCart.has(v.ProductoId) ? 'Ya está en tu carrito' : `Agregar ${h(v.Marca)} ${h(v.Modelo)} al carrito`}">${icon(inCart.has(v.ProductoId) ? 'check' : 'cart', 18)}</button>
          <button class="buy-button" data-action="buy" data-id="${v.ProductoId}">Comprar ${icon('arrow', 16)}</button>`}
        </div>
      </div>
    </article>`;
  }).join('') : `<div class="no-results"><span>${icon('search', 28)}</span><h3>No encontramos ese auto</h3><p>Prueba con otra marca, modelo o quita algún filtro.</p><button class="text-button" data-action="clear-filters">Ver todos los autos ${icon('arrow', 16)}</button></div>`;

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  $('#pagination').innerHTML = pages > 1 ? `
    <button class="page-button" data-action="page" data-page="${pagina - 1}" ${pagina <= 1 ? 'disabled' : ''}>${icon('back', 16)} Anterior</button>
    <span>Página ${pagina} de ${pages}</span>
    <button class="page-button" data-action="page" data-page="${pagina + 1}" ${pagina >= pages ? 'disabled' : ''}>Siguiente ${icon('arrow', 16)}</button>` : '';
}

function updateQuery(changes) {
  Object.assign(state.query, changes, { pagina: changes.pagina ?? 1 });
  syncFilterControls();
  loadVehicles();
}

async function openDetail(id) {
  openModal('<div class="modal-loading">Cargando vehículo...</div>', { wide: true });
  try {
    const v = await api(`/vehiculos/${id}`);
    const own = user()?.id === v.UsuarioVendedorId;
    const available = v.Estado === 'DISPONIBLE';
    const lastReview = v.revisiones[0];
    openModal(`
      <div class="detail">
        <div class="detail-gallery">
          <img id="detail-main" src="${h(v.imagenes[0]?.UrlImagen ?? v.ImagenPrincipal ?? '')}" alt="${h(v.Marca)} ${h(v.Modelo)}" />
          ${v.imagenes.length > 1 ? `<div class="thumbs">${v.imagenes.map((img) => `<button data-action="thumb" data-src="${h(img.UrlImagen)}"><img src="${h(img.UrlImagen)}" alt="" /></button>`).join('')}</div>` : ''}
        </div>
        <div class="detail-info">
          <span class="section-kicker">${h(v.Categoria)} · ${v.Anio}</span>
          <h2>${h(v.Marca)} ${h(v.Modelo)}</h2>
          <p class="detail-version">${h(v.Version ?? '')}</p>
          <div class="detail-price"><strong>${money(v.Precio)}</strong>${v.BajoDePrecio ? `<s>${money(v.PrecioAnterior)}</s><span class="pill pill-ok">Bajó de precio</span>` : ''}${v.EsOportunidad ? '<span class="pill pill-info">Bajo el promedio de su categoría</span>' : ''}</div>
          ${available ? '' : `<p class="notice">Este vehículo está ${h((ESTADO_LABEL[v.Estado] ?? v.Estado).toLowerCase())} y no se puede comprar.</p>`}
          <div class="detail-actions">
            ${own ? '<span class="own-note">Es tu publicación</span>' : available ? `
              <button class="secondary-button" data-action="add-cart" data-id="${v.ProductoId}">${icon('cart', 18)} Agregar al carrito</button>
              <button class="primary-button" data-action="buy" data-id="${v.ProductoId}">Comprar ${icon('arrow', 18)}</button>` : ''}
          </div>
          <dl class="spec-grid">
            <div><dt>Kilometraje</dt><dd>${km(v.Kilometraje)}</dd></div>
            <div><dt>Transmisión</dt><dd>${TRANSMISION[v.Transmision] ?? h(v.Transmision)}</dd></div>
            <div><dt>Combustible</dt><dd>${h(v.Combustible)}</dd></div>
            <div><dt>Color</dt><dd>${h(v.Color ?? '—')}</dd></div>
            <div><dt>Ubicación</dt><dd>${h(v.Ciudad)}, ${h(v.Provincia)}</dd></div>
            <div><dt>Dueños anteriores</dt><dd>${v.DuenosAnteriores ?? '—'}</dd></div>
            <div><dt>Vendedor</dt><dd>${h(v.Vendedor)}</dd></div>
            <div><dt>Publicado</dt><dd>${date(v.FechaPublicacion)}</dd></div>
          </dl>
        </div>
      </div>
      ${v.Descripcion ? `<p class="detail-description">${h(v.Descripcion)}</p>` : ''}
      <div class="detail-sections">
        <section>
          <h3>Revisión técnica</h3>
          ${lastReview ? `<ul class="check-list">
            <li class="${lastReview.TieneChoques ? 'bad' : 'ok'}">${lastReview.TieneChoques ? `Registra daños: ${h(lastReview.DetalleDanos ?? '')}` : 'Sin choques registrados'}</li>
            <li class="${lastReview.PapelesAlDia ? 'ok' : 'bad'}">${lastReview.PapelesAlDia ? 'Papeles al día' : 'Papeles pendientes'}</li>
            <li class="${lastReview.RevisionTecnicaOk ? 'ok' : 'bad'}">${lastReview.RevisionTecnicaOk ? 'Revisión técnica vigente' : 'Revisión técnica no vigente'}</li>
          </ul><small class="muted">Revisado el ${date(lastReview.FechaRevision)}${lastReview.Observaciones ? ` · ${h(lastReview.Observaciones)}` : ''}</small>` : '<p class="muted">Aún no tiene revisión registrada.</p>'}
        </section>
        <section>
          <h3>Historial de precio</h3>
          ${v.historialPrecios.length ? `<ul class="history-list">${v.historialPrecios.map((p) => `<li><span>${date(p.FechaCambio)}</span><span>${money(p.PrecioAnterior)} → <b>${money(p.PrecioNuevo)}</b></span></li>`).join('')}</ul>` : '<p class="muted">El precio no ha cambiado desde su publicación.</p>'}
        </section>
      </div>
      ${v.planes.length ? `<section class="detail-plans"><h3>Simula tu financiamiento</h3>
        <div class="table-wrap"><table class="data-table"><thead><tr><th>Plan</th><th>Tasa mensual</th><th>Cuota</th><th>Total financiado</th></tr></thead>
        <tbody>${v.planes.map((p) => `<tr><td>${h(p.Nombre)}</td><td>${(p.TasaMensual * 100).toFixed(2)}%</td><td><b>${money(p.Cuota)}</b></td><td>${money(p.TotalFinanciado)}</td></tr>`).join('')}</tbody></table></div></section>` : ''}
    `, { wide: true });
  } catch (error) {
    closeModal();
    showError(error);
  }
}

/* ================================ carrito ================================ */

async function loadCart() {
  if (!user()) { state.carrito = []; renderCartCount(); return; }
  try {
    state.carrito = await api('/carrito');
  } catch (error) {
    state.carrito = [];
    if (error.status !== 401) showError(error);
  }
  renderCartCount();
}

function renderCartCount() {
  $('#cart-count').textContent = state.carrito.length;
}

function renderCart() {
  const items = state.carrito;
  $('#drawer-count').textContent = `(${items.length})`;
  $('#cart-empty').hidden = items.length > 0;
  $('#cart-summary').hidden = items.length === 0;
  $('#cart-empty-title').textContent = user() ? 'Tu carrito está esperando' : 'Ingresa para usar tu carrito';
  $('#cart-empty-text').textContent = user() ? 'Agrega ese auto que te robó una mirada.' : 'Tu carrito se guarda en tu cuenta.';
  $('#cart-items').innerHTML = items.map((item) => `
    <article class="cart-item">
      <img src="${h(item.ImagenPrincipal ?? '')}" alt="" />
      <div class="cart-item-info"><span>${h(item.Marca)} · ${item.Anio}</span><h3>${h(item.Modelo)}</h3><b>${money(item.Precio)}</b>
        <button class="text-button small" data-action="buy" data-id="${item.ProductoId}">Comprar ${icon('arrow', 14)}</button>
      </div>
      <button class="remove-item" data-action="remove-cart" data-id="${item.ProductoId}" aria-label="Quitar ${h(item.Modelo)} del carrito">${icon('close', 17)}</button>
    </article>`).join('');
  $('#cart-subtotal').textContent = money(items.reduce((sum, item) => sum + item.Precio, 0));
}

function openCart() {
  renderCart();
  $('#overlay').hidden = false;
  $('#cart-drawer').classList.add('is-open');
  $('#cart-drawer').setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
}

function closeCart() {
  $('#cart-drawer').classList.remove('is-open');
  $('#cart-drawer').setAttribute('aria-hidden', 'true');
  $('#overlay').hidden = true;
  document.body.classList.remove('no-scroll');
}

async function addToCart(id, button) {
  if (!user()) return openAuth('login', 'Ingresa para guardar autos en tu carrito.');
  await withBusy(button, async () => {
    try {
      state.carrito = await api('/carrito', { method: 'POST', body: { productoId: Number(id) } });
      renderCartCount();
      if (state.resultado) renderVehicles();
      toast('Auto agregado a tu carrito.');
    } catch (error) { showError(error); }
  });
}

async function removeFromCart(id) {
  try {
    state.carrito = await api(`/carrito/${id}`, { method: 'DELETE' });
    renderCart();
    renderCartCount();
    if (state.resultado) renderVehicles();
  } catch (error) { showError(error); }
}

/* ================================ compra ================================ */

async function openCheckout(id) {
  if (!user()) return openAuth('login', 'Ingresa para continuar con tu compra.');
  closeCart();
  openModal('<div class="modal-loading">Preparando tu compra...</div>');
  try {
    const [v, perfil] = await Promise.all([api(`/vehiculos/${id}`), state.perfil ?? api('/auth/perfil')]);
    state.perfil = perfil;
    const ubicaciones = state.filtros?.ubicaciones ?? [];
    openModal(`
      <span class="section-kicker">INICIAR COMPRA</span>
      <h2>${h(v.Marca)} ${h(v.Modelo)} ${v.Anio}</h2>
      <div class="checkout-summary"><img src="${h(v.ImagenPrincipal ?? '')}" alt="" /><div><b>${money(v.Precio)}</b><small>${km(v.Kilometraje)} · ${h(v.Ciudad)}</small><small>El precio queda fijo al iniciar la compra.</small></div></div>
      <form id="checkout-form" class="stack-form" data-id="${v.ProductoId}" novalidate>
        <fieldset class="plan-options"><legend>Forma de pago</legend>
          <label class="plan-option"><input type="radio" name="planId" value="" checked /><span><b>Al contado</b><small>${money(v.Precio)}</small></span></label>
          ${v.planes.map((p) => `<label class="plan-option"><input type="radio" name="planId" value="${p.PlanId}" /><span><b>${p.CantidadCuotas} cuotas de ${money(p.Cuota)}</b><small>${h(p.Nombre)} · ${(p.TasaMensual * 100).toFixed(2)}% mensual</small></span></label>`).join('')}
        </fieldset>
        <label>Dirección de entrega<input class="field-input" name="direccionEntrega" required minlength="5" maxlength="250" value="${h(perfil.direccion ?? '')}" placeholder="Calle, número, comuna" /></label>
        <label>Ciudad de destino<select class="field-input" name="ubicacionDestinoId"><option value="">Selecciona una ciudad</option>${ubicaciones.map((u) => `<option value="${u.UbicacionId}">${h(u.Ciudad)}, ${h(u.Provincia)}</option>`).join('')}</select></label>
        <p class="form-error" role="alert"></p>
        <button class="primary-button" type="submit">Reservar y continuar ${icon('arrow', 18)}</button>
        <p class="muted small">Al confirmar, el auto queda reservado para ti. Luego podrás pagar desde “Mis compras”.</p>
      </form>
    `);
  } catch (error) {
    closeModal();
    showError(error);
  }
}

function openPayment(transaccion) {
  openModal(`
    <span class="section-kicker">PAGAR COMPRA #${transaccion.TransaccionId}</span>
    <h2>${h(transaccion.Marca)} ${h(transaccion.Modelo)}</h2>
    <div class="checkout-summary"><img src="${h(transaccion.ImagenPrincipal ?? '')}" alt="" /><div><b>${money(transaccion.Monto)}</b><small>${transaccion.PlanNombre ? `${h(transaccion.PlanNombre)} · cuota ${money(transaccion.CuotaMensual)}` : 'Pago al contado'}</small><small>Intentos previos: ${transaccion.IntentosPago}</small></div></div>
    <form id="payment-form" class="stack-form" data-id="${transaccion.TransaccionId}">
      <label>Medio de pago<select class="field-input" name="tipoPago"><option value="CREDITO">Tarjeta de crédito</option><option value="DEBITO">Tarjeta de débito</option><option value="TRANSFERENCIA">Transferencia</option></select></label>
      <label class="check-row"><input type="checkbox" name="simularRechazo" /> Simular rechazo de la pasarela (demo)</label>
      <p class="muted small">Pasarela simulada. Al tercer rechazo la compra se anula y el auto vuelve al catálogo.</p>
      <p class="form-error" role="alert"></p>
      <button class="primary-button" type="submit">Pagar ${money(transaccion.Monto)}</button>
    </form>
  `);
}

/* ============================== paginas app ============================== */

const page = () => $('#page-app');

function requireLogin(message) {
  if (user()) return true;
  page().innerHTML = `<div class="empty-state"><h2>Necesitas iniciar sesión</h2><p>${h(message)}</p><button class="primary-button" data-action="login">Ingresar</button></div>`;
  return false;
}

function pageHeader(kicker, title, text) {
  return `<a class="back-link" href="#/">${icon('back', 16)} Volver al catálogo</a><div class="page-head"><span class="section-kicker">${kicker}</span><h1>${title}</h1>${text ? `<p>${text}</p>` : ''}</div>`;
}

async function renderCompras() {
  if (!requireLogin('Ingresa para ver tus compras.')) return;
  page().innerHTML = `${pageHeader('TU CUENTA', 'Mis compras y ventas')}<div class="modal-loading">Cargando...</div>`;
  try {
    const lista = await api('/transacciones');
    const compras = lista.filter((t) => t.Rol === 'COMPRA');
    const ventas = lista.filter((t) => t.Rol === 'VENTA');
    window.__transacciones = new Map(lista.map((t) => [t.TransaccionId, t]));
    const card = (t, comoComprador) => `
      <article class="tx-card">
        <img src="${h(t.ImagenPrincipal ?? '')}" alt="" />
        <div class="tx-main">
          <div class="tx-title"><h3>${h(t.Marca)} ${h(t.Modelo)} ${t.Anio}</h3>${pill(t.Estado)}</div>
          <p class="muted">Compra #${t.TransaccionId} · ${date(t.Fecha)} · ${comoComprador ? `Vendedor: ${h(t.Vendedor)}` : `Comprador: ${h(t.Comprador)}`}${t.Asesor ? ` · Asesor: ${h(t.Asesor)}` : ''}</p>
          <dl class="tx-facts">
            <div><dt>Monto</dt><dd>${money(t.Monto)}</dd></div>
            <div><dt>Forma de pago</dt><dd>${t.PlanNombre ? `${t.CantidadCuotas} × ${money(t.CuotaMensual)}` : 'Contado'}</dd></div>
            <div><dt>Pago</dt><dd>${t.UltimoEstadoPago ? pill(t.UltimoEstadoPago) : 'Sin intentos'}${t.IntentosPago > 1 ? ` <small>(${t.IntentosPago} intentos)</small>` : ''}</dd></div>
            <div><dt>Entrega</dt><dd>${pill(t.EstadoLogistica)}${t.FechaProgramada && t.EstadoLogistica !== 'CANCELADA' ? ` <small>${date(t.FechaProgramada)}</small>` : ''}</dd></div>
          </dl>
          ${t.Estado === 'PENDIENTE' ? `<div class="tx-actions">
            ${comoComprador ? `<button class="primary-button small" data-action="pay" data-id="${t.TransaccionId}">Pagar</button>` : ''}
            <button class="secondary-button small" data-action="cancel-tx" data-id="${t.TransaccionId}">Cancelar compra</button>
            ${t.HorasDesdeCreacion >= 48 ? `<span class="muted small">Reservada hace ${t.HorasDesdeCreacion} h (vence a las 72 h)</span>` : ''}
          </div>` : ''}
        </div>
      </article>`;
    page().innerHTML = `${pageHeader('TU CUENTA', 'Mis compras y ventas', 'El estado de cada compra, su pago y su entrega, directo desde la base de datos.')}
      <section class="page-section"><h2>Compras <small>(${compras.length})</small></h2>
        ${compras.length ? compras.map((t) => card(t, true)).join('') : '<p class="muted">Aún no tienes compras. <a class="inline-link" href="#/">Explora el catálogo</a>.</p>'}
      </section>
      ${ventas.length ? `<section class="page-section"><h2>Ventas <small>(${ventas.length})</small></h2>${ventas.map((t) => card(t, false)).join('')}</section>` : ''}`;
  } catch (error) {
    page().innerHTML = `${pageHeader('TU CUENTA', 'Mis compras y ventas')}<p class="form-error">${h(error.message)}</p>`;
  }
}

async function renderVender() {
  if (!requireLogin('Ingresa con una cuenta de vendedor para publicar.')) return;
  if (!hasRole('VENDEDOR', 'ADMIN')) {
    page().innerHTML = `${pageHeader('VENDE TU AUTO', 'Publicar un vehículo')}<div class="empty-state"><h2>Tu cuenta es de comprador</h2><p>Crea una cuenta de tipo “Comprar y vender” para publicar autos. Para la demo usa vendedor@ruta.cl.</p></div>`;
    return;
  }
  page().innerHTML = `${pageHeader('VENDE TU AUTO', 'Mis publicaciones')}<div class="modal-loading">Cargando...</div>`;
  try {
    const [vehiculos] = await Promise.all([api('/vendedor/vehiculos'), state.filtros ? null : loadFilters()]);
    const { categorias, ubicaciones, todasLasMarcas } = state.filtros;
    const year = new Date().getFullYear();
    window.__misVehiculos = new Map(vehiculos.map((v) => [v.ProductoId, v]));
    page().innerHTML = `${pageHeader('VENDE TU AUTO', 'Mis publicaciones', 'Publica autos, ajusta su precio y pausa publicaciones.')}
      <section class="page-section">
        <h2>Mis vehículos <small>(${vehiculos.length})</small></h2>
        ${vehiculos.length ? `<div class="table-wrap"><table class="data-table">
          <thead><tr><th>Vehículo</th><th>Precio</th><th>Estado</th><th title="Días publicado">Días</th><th title="Personas que lo tienen en el carrito">En carritos</th><th>Cambios de precio</th><th>Compras</th><th></th></tr></thead>
          <tbody>${vehiculos.map((v) => `<tr>
            <td><div class="cell-vehicle"><img src="${h(v.ImagenPrincipal ?? '')}" alt="" /><span><b>${h(v.Marca)} ${h(v.Modelo)}</b><small>${v.Anio} · ${h(v.Patente)}</small></span></div></td>
            <td>${money(v.Precio)}${v.PrecioPromedioCategoria ? `<small class="muted block">Prom. categoría ${money(v.PrecioPromedioCategoria)}</small>` : ''}</td>
            <td>${pill(v.Estado)}</td><td>${v.DiasPublicado}</td><td>${v.EnCarritos}</td><td>${v.CambiosPrecio}</td><td>${v.Transacciones}</td>
            <td class="cell-actions">${['DISPONIBLE', 'PAUSADO'].includes(v.Estado) ? `
              <button class="text-button small" data-action="edit-price" data-id="${v.ProductoId}">Cambiar precio</button>
              <button class="text-button small" data-action="toggle-state" data-id="${v.ProductoId}" data-estado="${v.Estado === 'DISPONIBLE' ? 'PAUSADO' : 'DISPONIBLE'}">${v.Estado === 'DISPONIBLE' ? 'Pausar' : 'Reactivar'}</button>` : '<span class="muted small">Sin acciones</span>'}
            </td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Todavía no publicas autos.</p>'}
      </section>
      <section class="page-section">
        <h2>Publicar un vehículo</h2>
        <form id="publish-form" class="grid-form" novalidate>
          <label>Marca<select class="field-input" name="marcaId" required><option value="">Selecciona</option>${todasLasMarcas.map((m) => `<option value="${m.MarcaId}">${h(m.Nombre)}</option>`).join('')}</select></label>
          <label>Modelo<input class="field-input" name="modelo" required maxlength="60" placeholder="Corolla" /></label>
          <label>Versión<input class="field-input" name="version" maxlength="60" placeholder="XEI 2.0" /></label>
          <label>Categoría<select class="field-input" name="categoriaId" required><option value="">Selecciona</option>${categorias.map((c) => `<option value="${c.CategoriaId}">${h(c.Nombre)}</option>`).join('')}</select></label>
          <label>Año<input class="field-input" name="anio" type="number" required min="1950" max="${year + 1}" placeholder="${year - 2}" /></label>
          <label>Patente<input class="field-input" name="patente" required maxlength="10" placeholder="ABCD12" /></label>
          <label>Kilometraje<input class="field-input" name="kilometraje" type="number" required min="0" step="100" /></label>
          <label>Transmisión<select class="field-input" name="transmision" required><option value="AUTOMATICA">Automática</option><option value="MANUAL">Manual</option><option value="CVT">CVT</option><option value="OTRA">Otra</option></select></label>
          <label>Combustible<select class="field-input" name="combustible" required><option>Bencina</option><option>Diésel</option><option>Híbrido</option><option>Eléctrico</option></select></label>
          <label>Precio (CLP)<input class="field-input" name="precio" type="number" required min="500000" step="10000" /></label>
          <label>Color<input class="field-input" name="color" maxlength="30" /></label>
          <label>Ubicación<select class="field-input" name="ubicacionId" required><option value="">Selecciona</option>${ubicaciones.map((u) => `<option value="${u.UbicacionId}">${h(u.Ciudad)}, ${h(u.Provincia)}</option>`).join('')}</select></label>
          <label>Dueños anteriores<input class="field-input" name="duenosAnteriores" type="number" min="0" max="20" /></label>
          <label class="span-2">URL de la foto (https)<input class="field-input" name="urlImagen" type="url" maxlength="500" placeholder="https://..." /></label>
          <label class="span-3">Motivo de venta<input class="field-input" name="motivoVenta" maxlength="500" /></label>
          <label class="span-3">Descripción<textarea class="field-input" name="descripcion" rows="3" maxlength="2000"></textarea></label>
          <p class="form-error span-3" role="alert"></p>
          <div class="span-3"><button class="primary-button" type="submit">Publicar vehículo ${icon('arrow', 18)}</button></div>
        </form>
      </section>`;
  } catch (error) {
    page().innerHTML = `${pageHeader('VENDE TU AUTO', 'Mis publicaciones')}<p class="form-error">${h(error.message)}</p>`;
  }
}

async function renderPanel() {
  if (!requireLogin('Ingresa con una cuenta de asesor o administrador.')) return;
  if (!hasRole('ASESOR', 'ADMIN')) {
    page().innerHTML = `${pageHeader('PANEL', 'Panel de gestión')}<div class="empty-state"><h2>Sin acceso</h2><p>Esta sección es para asesores y administradores.</p></div>`;
    return;
  }
  page().innerHTML = `${pageHeader('PANEL', 'Panel de gestión')}<div class="modal-loading">Cargando...</div>`;
  try {
    const [panel, pendientes] = await Promise.all([api('/reportes/panel'), api('/transacciones/pendientes')]);
    const r = panel.resumen;
    const kpi = (label, value, note = '') => `<div class="kpi"><span>${label}</span><b>${value}</b>${note ? `<small>${note}</small>` : ''}</div>`;
    const maxMonto = Math.max(1, ...panel.ventasPorMarca.map((m) => m.MontoVendido));
    page().innerHTML = `${pageHeader('PANEL', 'Panel de gestión', 'Indicadores calculados en SQL Server con vistas, agrupaciones y subconsultas.')}
      <div class="kpi-grid">
        ${kpi('Autos disponibles', num.format(r.VehiculosDisponibles), `${r.VehiculosReservados} reservados`)}
        ${kpi('Compras pendientes', num.format(r.TransaccionesPendientes), r.PendientesVencidas ? `${r.PendientesVencidas} con más de 72 h` : 'Ninguna vencida')}
        ${kpi('Ventas pagadas', num.format(r.Ventas), money(r.MontoVendido))}
        ${kpi('Días promedio de venta', r.DiasPromedioVenta ?? '—', 'desde la publicación')}
        ${kpi('Pagos rechazados', `${r.PorcentajePagosRechazados ?? 0}%`, 'del total de intentos')}
      </div>
      <section class="page-section">
        <h2>Bandeja de compras pendientes <small>(${pendientes.length})</small></h2>
        ${pendientes.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Vehículo</th><th>Comprador</th><th>Monto</th><th>Antigüedad</th><th>Pagos</th><th>Asesor</th><th></th></tr></thead><tbody>
          ${pendientes.map((t) => `<tr class="${t.PorVencer ? 'row-alert' : ''}"><td>${t.TransaccionId}</td><td><b>${h(t.Marca)} ${h(t.Modelo)}</b><small class="muted block">${t.Anio} · ${h(t.Patente)}</small></td>
            <td>${h(t.Comprador)}<small class="muted block">${h(t.EmailComprador)}</small></td><td>${money(t.Monto)}</td>
            <td>${t.HorasDesdeCreacion} h ${t.PorVencer ? '<span class="pill pill-bad">Vencida</span>' : ''}</td>
            <td>${t.IntentosPago}${t.UltimoEstadoPago ? ` · ${pill(t.UltimoEstadoPago)}` : ''}</td>
            <td>${t.Asesor ? h(t.Asesor) : '<span class="muted">Sin asignar</span>'}</td>
            <td class="cell-actions">${hasRole('ASESOR') && !t.AsesorUsuarioId ? `<button class="text-button small" data-action="take-tx" data-id="${t.TransaccionId}">Tomar</button>` : ''}
              ${hasRole('ADMIN') || t.AsesorUsuarioId === user().id ? `<button class="text-button small" data-action="cancel-tx" data-id="${t.TransaccionId}">Cancelar</button>` : ''}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="muted">No hay compras pendientes.</p>'}
      </section>
      <section class="page-section">
        <h2>Ventas por marca</h2>
        <div class="table-wrap"><table class="data-table"><thead><tr><th>Marca</th><th>Publicados</th><th>Disponibles</th><th>Reservados</th><th>Vendidos</th><th>Monto vendido</th><th>Precio promedio publicado</th></tr></thead><tbody>
          ${panel.ventasPorMarca.map((m) => `<tr><td><b>${h(m.Marca)}</b></td><td>${m.VehiculosPublicados}</td><td>${m.Disponibles}</td><td>${m.Reservados}</td><td>${m.Vendidos}</td>
            <td><div class="bar-cell"><span class="bar" style="width:${Math.round((m.MontoVendido / maxMonto) * 100)}%"></span><span>${money(m.MontoVendido)}</span></div></td><td>${money(m.PrecioPromedioPublicado)}</td></tr>`).join('')}
        </tbody></table></div>
      </section>
      <div class="two-col">
        <section class="page-section">
          <h2>Demanda por categoría</h2>
          <div class="table-wrap"><table class="data-table"><thead><tr><th>Categoría</th><th>Disponibles</th><th>En carritos</th><th>Compras</th><th>Precio prom.</th></tr></thead><tbody>
            ${panel.demandaPorCategoria.map((c) => `<tr><td>${h(c.Categoria)}</td><td>${c.Disponibles}</td><td>${c.EnCarritos}</td><td>${c.Transacciones}</td><td>${money(c.PrecioPromedio)}</td></tr>`).join('')}
          </tbody></table></div>
        </section>
        <section class="page-section">
          <h2>Sin movimiento (+${panel.diasSinMovimiento} días)</h2>
          ${panel.sinMovimiento.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Vehículo</th><th>Precio</th><th>Días</th></tr></thead><tbody>
            ${panel.sinMovimiento.map((v) => `<tr><td>${h(v.Marca)} ${h(v.Modelo)} ${v.Anio}<small class="muted block">${h(v.Vendedor)}</small></td><td>${money(v.Precio)}</td><td>${v.DiasPublicado}</td></tr>`).join('')}
          </tbody></table></div>` : '<p class="muted">Todos los autos han tenido movimiento.</p>'}
        </section>
      </div>`;
  } catch (error) {
    page().innerHTML = `${pageHeader('PANEL', 'Panel de gestión')}<p class="form-error">${h(error.message)}</p>`;
  }
}

/* ================================ router ================================ */

const routes = { '#/compras': renderCompras, '#/vender': renderVender, '#/panel': renderPanel };

function route() {
  const hash = location.hash;
  const render = routes[hash];
  $('#page-catalogo').hidden = Boolean(render);
  page().hidden = !render;
  $('#account-menu').hidden = true;
  if (render) {
    window.scrollTo({ top: 0 });
    render();
  } else if (state.resultado) {
    renderVehicles();
  }
}

/* ================================ eventos ================================ */

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setFormError(form, message) {
  const element = form.querySelector('.form-error');
  if (element) element.textContent = message;
}

const actions = {
  'close-modal': closeModal,
  'close-cart': closeCart,
  login: () => openAuth('login'),
  'auth-mode': (el) => openAuth(el.dataset.mode),
  'fill-demo': (el) => {
    const form = $('#login-form');
    form.elements.email.value = el.dataset.email;
    form.elements.password.value = 'ruta123';
    form.querySelector('button[type="submit"]').focus();
  },
  logout: () => {
    session.clear();
    state.carrito = [];
    state.perfil = null;
    renderAccount();
    renderCartCount();
    toast('Cerraste sesión.');
    location.hash = '#/';
    route();
  },
  category: (el) => {
    updateQuery({ categoriaId: el.dataset.id });
    $('#catalogo').scrollIntoView({ behavior: 'smooth' });
  },
  'clear-filters': () => {
    $('#search-input').value = '';
    updateQuery({ q: '', categoriaId: '', marcaId: '', precioMin: '', precioMax: '', anioMin: '', anioMax: '', transmision: '', orden: 'recientes' });
  },
  page: (el) => {
    updateQuery({ pagina: Number(el.dataset.page) });
    $('#catalogo').scrollIntoView({ behavior: 'smooth' });
  },
  retry: () => (state.filtros ? loadVehicles() : loadFilters().then(loadVehicles).catch(showError)),
  detail: (el) => openDetail(el.dataset.id),
  thumb: (el) => { $('#detail-main').src = el.dataset.src; },
  'add-cart': (el) => addToCart(el.dataset.id, el),
  'remove-cart': (el) => removeFromCart(el.dataset.id),
  buy: (el) => openCheckout(el.dataset.id),
  pay: (el) => openPayment(window.__transacciones.get(Number(el.dataset.id))),
  'cancel-tx': async (el) => {
    if (!confirmInline(el, '¿Seguro? Toca de nuevo para cancelar')) return;
    await withBusy(el, async () => {
      try {
        await api(`/transacciones/${el.dataset.id}/cancelar`, { method: 'POST' });
        toast('Compra cancelada. El auto volvió al catálogo.');
        route();
      } catch (error) { showError(error); }
    });
  },
  'take-tx': async (el) => {
    await withBusy(el, async () => {
      try {
        await api(`/transacciones/${el.dataset.id}/asesor`, { method: 'POST' });
        toast('Tomaste la compra.');
        renderPanel();
      } catch (error) { showError(error); }
    });
  },
  'edit-price': (el) => {
    const v = window.__misVehiculos.get(Number(el.dataset.id));
    openModal(`
      <span class="section-kicker">CAMBIAR PRECIO</span><h2>${h(v.Marca)} ${h(v.Modelo)} ${v.Anio}</h2>
      <p class="muted">Precio actual: <b>${money(v.Precio)}</b>. El cambio queda en el historial y, si es una rebaja, el auto muestra “Bajó de precio”.</p>
      <form id="price-form" class="stack-form" data-id="${v.ProductoId}">
        <label>Nuevo precio (CLP)<input class="field-input" name="precio" type="number" min="500000" step="10000" required value="${v.Precio}" /></label>
        <p class="form-error" role="alert"></p>
        <button class="primary-button" type="submit">Guardar precio</button>
      </form>`);
  },
  'toggle-state': async (el) => {
    await withBusy(el, async () => {
      try {
        await api(`/vendedor/vehiculos/${el.dataset.id}/estado`, { method: 'PATCH', body: { estado: el.dataset.estado } });
        toast(el.dataset.estado === 'PAUSADO' ? 'Publicación pausada.' : 'Publicación reactivada.');
        renderVender();
      } catch (error) { showError(error); }
    });
  }
};

/** Confirmacion en dos toques sin usar window.confirm. */
function confirmInline(button, text) {
  if (button.dataset.confirming === 'true') return true;
  button.dataset.confirming = 'true';
  const original = button.textContent;
  button.textContent = text;
  setTimeout(() => { button.dataset.confirming = 'false'; button.textContent = original; }, 3000);
  return false;
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (target && actions[target.dataset.action]) {
    event.preventDefault();
    actions[target.dataset.action](target);
    return;
  }
  if (!event.target.closest('.account-wrap')) $('#account-menu').hidden = true;
});

const forms = {
  'login-form': async (form) => {
    const { email, password } = formData(form);
    if (!email || !password) return setFormError(form, 'Ingresa tu correo y contraseña.');
    await afterLogin(await api('/auth/login', { method: 'POST', body: { email, password } }));
  },
  'register-form': async (form) => {
    const data = formData(form);
    if (!data.nombre || !data.apellido || !data.email) return setFormError(form, 'Completa nombre, apellido y correo.');
    if ((data.password ?? '').length < 6) return setFormError(form, 'La contraseña debe tener al menos 6 caracteres.');
    await afterLogin(await api('/auth/registro', { method: 'POST', body: data }));
  },
  'filters-form': async (form) => {
    const data = formData(form);
    for (const pair of [['precioMin', 'precioMax'], ['anioMin', 'anioMax']]) {
      const [min, max] = pair.map((k) => data[k]);
      if (min && max && Number(min) > Number(max)) return setFormError(form, 'El valor “desde” no puede ser mayor que “hasta”.');
    }
    setFormError(form, '');
    updateQuery({ ...data, categoriaId: data.categoriaId ?? '' });
    $('#filters').classList.remove('filters-open');
  },
  'search-form': async () => {
    updateQuery({ q: $('#search-input').value.trim() });
    if (location.hash && location.hash !== '#/' && location.hash !== '#catalogo') location.hash = '#/';
    $('#catalogo').scrollIntoView({ behavior: 'smooth' });
  },
  'checkout-form': async (form) => {
    const data = formData(form);
    if ((data.direccionEntrega ?? '').trim().length < 5) return setFormError(form, 'Ingresa una dirección de entrega (mínimo 5 caracteres).');
    const transaccion = await api('/transacciones', {
      method: 'POST',
      body: {
        productoId: Number(form.dataset.id),
        planId: data.planId ? Number(data.planId) : null,
        direccionEntrega: data.direccionEntrega,
        ubicacionDestinoId: data.ubicacionDestinoId ? Number(data.ubicacionDestinoId) : null
      }
    });
    closeModal();
    await loadCart();
    toast(`Auto reservado. Compra #${transaccion.TransaccionId} creada.`);
    loadVehicles();
    location.hash = '#/compras';
  },
  'payment-form': async (form) => {
    const pago = await api(`/transacciones/${form.dataset.id}/pagos`, {
      method: 'POST',
      body: { tipoPago: form.elements.tipoPago.value, simularRechazo: form.elements.simularRechazo.checked }
    });
    closeModal();
    if (pago.EstadoPago === 'AUTORIZADO') toast(`Pago autorizado (código ${pago.CodigoAutorizacion}). ¡El auto es tuyo!`);
    else if (pago.EstadoTransaccion === 'RECHAZADA') toast('Pago rechazado por tercera vez: la compra se anuló.', 'bad');
    else toast('La pasarela rechazó el pago. Puedes intentarlo de nuevo.', 'bad');
    renderCompras();
  },
  'price-form': async (form) => {
    const precio = Number(form.elements.precio.value);
    if (!precio || precio < 500000) return setFormError(form, 'El precio debe ser de al menos $500.000.');
    await api(`/vendedor/vehiculos/${form.dataset.id}/precio`, { method: 'PATCH', body: { precio } });
    closeModal();
    toast('Precio actualizado y registrado en el historial.');
    renderVender();
  },
  'publish-form': async (form) => {
    const d = formData(form);
    const required = { marcaId: 'la marca', modelo: 'el modelo', categoriaId: 'la categoría', anio: 'el año', patente: 'la patente', kilometraje: 'el kilometraje', precio: 'el precio', ubicacionId: 'la ubicación' };
    const missing = Object.entries(required).find(([key]) => !d[key]);
    if (missing) return setFormError(form, `Falta ${missing[1]}.`);
    const nuevo = await api('/vendedor/vehiculos', {
      method: 'POST',
      body: {
        ...d,
        marcaId: Number(d.marcaId), categoriaId: Number(d.categoriaId), ubicacionId: Number(d.ubicacionId),
        anio: Number(d.anio), kilometraje: Number(d.kilometraje), precio: Number(d.precio),
        duenosAnteriores: d.duenosAnteriores === '' ? null : Number(d.duenosAnteriores)
      }
    });
    toast(`Publicaste ${nuevo.Marca} ${nuevo.Modelo} (patente ${nuevo.Patente}).`);
    loadFilters().then(loadVehicles);
    renderVender();
  }
};

document.addEventListener('submit', async (event) => {
  const form = event.target;
  const handler = forms[form.id];
  if (!handler) return;
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  await withBusy(button, async () => {
    try {
      await handler(form);
    } catch (error) {
      if (form.querySelector('.form-error')) setFormError(form, error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.');
      else showError(error);
    }
  });
});

let searchTimer;
$('#search-input').addEventListener('input', (event) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => updateQuery({ q: event.target.value.trim() }), 350);
});
$('#sort-select').addEventListener('change', (event) => updateQuery({ orden: event.target.value }));
$('#filters-form').addEventListener('change', (event) => {
  if (event.target.name === 'categoriaId') updateQuery({ categoriaId: event.target.value });
  if (event.target.name === 'marcaId' || event.target.name === 'transmision') updateQuery({ [event.target.name]: event.target.value });
});
$('#clear-filters').addEventListener('click', () => actions['clear-filters']());
$('#mobile-category-button').addEventListener('click', () => $('#filters').classList.toggle('filters-open'));
$('#cart-button').addEventListener('click', openCart);
$('#overlay').addEventListener('click', closeCart);
$('#account-button').addEventListener('click', () => {
  if (!user()) return openAuth('login');
  $('#account-menu').hidden = !$('#account-menu').hidden;
});
modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && $('#cart-drawer').classList.contains('is-open')) closeCart();
});
window.addEventListener('hashchange', route);

/* ================================ inicio ================================ */

renderAccount();
route();
loadFilters()
  .then(loadVehicles)
  .catch((error) => {
    $('#results-count').textContent = '';
    $('#product-grid').innerHTML = `<div class="no-results"><span>${icon('search', 28)}</span><h3>No pudimos conectar con la API</h3><p>${h(error.message)}</p><button class="text-button" data-action="retry">Reintentar ${icon('arrow', 16)}</button></div>`;
  });
loadCart();
