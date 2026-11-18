import { procesarYRenderizar } from './tienda-mostrar.js';

// ================================================================
// MAIN.JS - LÓGICA PRINCIPAL DEL PANEL DE LA TIENDA (VÍA CANES)
// ================================================================

const path = window.location.pathname;
const enCarpetaHtml = path.includes('/html/') || path.includes('\\html\\');
const RUTA_API = enCarpetaHtml ? '../api/' : 'api/';

document.addEventListener('DOMContentLoaded', () => {
    // ✅ 1. DETECCIÓN INMEDIATA DE LA PÁGINA
    const currentPath = window.location.pathname;
    const esPaginaPromociones = currentPath.includes('promociones.html');

    if (esPaginaPromociones) {
        console.log('🚀 Modo Promociones activado');
        // Detener cualquier otra carga
        if (typeof cargarPromocionesTienda === 'function') {
            cargarPromocionesTienda();
        }
        // Ocultar forzadamente otras secciones por seguridad
        const seccionProductos = document.querySelector('.productos');
        if (seccionProductos) seccionProductos.style.display = 'none';
        const seccionServicios = document.getElementById('servicesGrid')?.closest('section');
        if (seccionServicios) seccionServicios.style.display = 'none';
    } else {
        // ✅ 2. Lógica normal para index.html y otras vistas
        const urlParams = new URLSearchParams(window.location.search);
        const filtros = { tipo: urlParams.get('tipo'), valor: urlParams.get('valor') };
        
        cargarProductos(filtros);
        if (filtros.tipo !== 'especie' && filtros.tipo !== 'categoria') {
            cargarServicios(filtros);
        } else {
            const servicesParent = document.getElementById('servicesGrid')?.parentElement;
            if (servicesParent) servicesParent.style.display = 'none';
        }
    }

    // 3. CARGAS GLOBALES (Siempre se ejecutan)
    renderizarCarrito();
    verificarSesionAdmin();

    // 4. DELEGACIÓN DE EVENTOS (Click en botones)
    document.addEventListener('click', (e) => {
        if (e.target.closest('.btn-agregar-carrito')) {
            e.preventDefault();
            const btn = e.target.closest('.btn-agregar-carrito');
            const item = {
                id: parseInt(btn.dataset.id),
                nombre: btn.dataset.nombre,
                precio: parseFloat(btn.dataset.precio),
                // ✅ Esto asegura que el precio original viaje al carrito
                precioOriginal: parseFloat(btn.dataset.precioOriginal) || parseFloat(btn.dataset.precio) || null,
                imagen: btn.dataset.imagen,
                tipo: btn.dataset.tipo || 'producto',
                stock: parseInt(btn.dataset.stock) || 999
            };
            if (item.id > 0 && item.precio >= 0 && item.nombre !== 'undefined') {
                window.agregarAlCarrito(item);
            } else {
                console.error('❌ Datos inválidos:', item);
                mostrarToast('Error: Producto no válido', 'danger');
            }
        }

        if (e.target.closest('.btn-agendar-servicio')) {
            e.preventDefault();
            const btn = e.target.closest('.btn-agendar-servicio');
            const nombreServicio = btn.dataset.nombre || 'el servicio';
            const mensaje = encodeURIComponent(`¡Hola Vía Canes! 👋 Me interesa agendar una cita para: *${nombreServicio}*.`);
            const numeroWhatsApp = '573016540576';

            mostrarToast(`📅 Abriendo WhatsApp para: ${nombreServicio}`, 'info');
            setTimeout(() => {
                window.open(`https://wa.me/${numeroWhatsApp}?text=${mensaje}`, '_blank');
            }, 800);
        }

        if (e.target.closest('.btn-eliminar-carrito')) {
            e.preventDefault();
            const btn = e.target.closest('.btn-eliminar-carrito');
            window.eliminarDelCarrito(parseInt(btn.dataset.id), btn.dataset.tipo);
        }

        if (e.target.closest('.btn-cantidad')) {
            e.preventDefault();
            const btn = e.target.closest('.btn-cantidad');
            const accion = btn.dataset.accion;
            const id = parseInt(btn.dataset.id);
            const tipo = btn.dataset.tipo;
            window.cambiarCantidadCarrito(id, tipo, accion);
        }
    });
});

// ==========================================
// 1. CARGA DE PRODUCTOS
// ==========================================
async function cargarProductos(filtros = {}) {
    const grid = document.getElementById('productGrid');
    const seccionProductos = document.querySelector('.productos');
    const seccionServicios = document.getElementById('servicesGrid')?.closest('section');
    const sectionTitle = document.querySelector('.productos h3');

    if (!grid) return;

    if (filtros.valor === 'Servicios') {
        if (seccionProductos) seccionProductos.style.display = 'none';
        if (seccionServicios) seccionServicios.style.display = 'block';
        mostrarBannerCategoria(filtros, 0);
        return;
    }

    if (seccionProductos) seccionProductos.style.display = 'block';

    const ocultarServiciosEn = ['Higiene', 'Salud', 'Perros', 'Gatos', 'Otra Especie'];
    if (seccionServicios) {
        seccionServicios.style.display = ocultarServiciosEn.includes(filtros.valor) ? 'none' : 'block';
    }

    let apiUrl = `${RUTA_API}productos_data.php?vista=tienda`;
    if (filtros.tipo && filtros.valor) {
        apiUrl += `&tipo=${encodeURIComponent(filtros.tipo)}&valor=${encodeURIComponent(filtros.valor)}`;
        if (sectionTitle) sectionTitle.innerHTML = `Productos: ${filtros.valor} 🐾`;
    }

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

        const result = await response.json();

        if ((result.ok || result.success) && Array.isArray(result.data) && result.data.length > 0) {
            mostrarBannerCategoria(filtros, result.data.length);
            procesarYRenderizar(result.data);
        } else {
            mostrarBannerCategoria(filtros, 0);
            grid.innerHTML = `<div class="col-12 text-center py-5">
                <p class="text-muted"><i class="fa fa-box-open fa-2x mb-2"></i><br>No hay productos disponibles.</p>
            </div>`;
        }
    } catch (error) {
        mostrarBannerCategoria(filtros, 0);
        console.error('❌ Error al cargar productos:', error);
        grid.innerHTML = `<div class="col-12 text-center py-5 text-danger">
            <p><i class="fa fa-exclamation-triangle fa-2x mb-2"></i><br>
            <strong>Error al cargar productos</strong></p>
            <p class="small mt-2">${error.message}</p>
        </div>`;
    }
}

// ==========================================
// 2. CARGA DE SERVICIOS
// ==========================================
async function cargarServicios(filtros = {}) {
    const grid = document.getElementById('servicesGrid');
    const seccionServicios = grid?.closest('section');
    if (!grid) return;

    const categoriasSoloProductos = ['Higiene', 'Salud', 'Perros', 'Gatos', 'Otra Especie'];
    if (filtros.valor && categoriasSoloProductos.includes(filtros.valor)) {
        if (seccionServicios) seccionServicios.style.display = 'none';
        return;
    }

    if (seccionServicios) seccionServicios.style.display = 'block';

    const imgPrefix = enCarpetaHtml ? '../img/' : 'img/';
    const imgDefault = imgPrefix + 'default-product.png';

    let apiUrl = `${RUTA_API}productos_data.php?vista=servicios`;
    if (filtros.tipo === 'categoria' && filtros.valor === 'Servicios') {
        apiUrl += `&tipo=${encodeURIComponent(filtros.tipo)}&valor=${encodeURIComponent(filtros.valor)}`;
    }

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const result = await response.json();

        if ((result.ok || result.success) && Array.isArray(result.data) && result.data.length > 0) {
            grid.innerHTML = result.data.map(s => {
                let src = String(s.imagen_url || '').trim();
                if (src) {
                    src = src.replace(/^(\.\.\/)+/, '');
                    if (!src.startsWith('http') && !src.startsWith('/')) {
                        if (src.startsWith('img/')) src = src.substring(4);
                        src = imgPrefix + src;
                    }
                } else {
                    src = imgDefault;
                }

                return `
                <div class="col-6 col-md-4 col-lg-3">
                    <div class="card h-100 shadow-sm border-0 service-card overflow-hidden">
                        <div class="mb-3" style="height: 180px; overflow: hidden; border-radius: 12px; background: #f8f9fa;">
                            <img src="${src}" alt="${s.nombre}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='${imgDefault}'">
                        </div>
                        <div class="card-body d-flex flex-column text-center p-3">
                            <h6 class="card-title fw-bold mb-2">${s.nombre}</h6>
                            <p class="card-text text-muted small flex-grow-1 mb-3" style="font-size: 0.8rem; line-height: 1.4;">
                                ${s.descripcion ? s.descripcion.substring(0, 90) + (s.descripcion.length > 90 ? '...' : '') : 'Servicio profesional especializado'}
                            </p>
                            <div class="mt-auto">
                                <button class="btn-agendar-servicio w-100 btn btn-success btn-sm py-2"
                                    data-id="${s.id_servicio}" data-nombre="${s.nombre}"
                                    style="background-color: #25D366; border: none; color: white; border-radius: 8px; font-weight: bold; cursor: pointer;">
                                    <i class="fa-brands fa-whatsapp me-2"></i>Agenda tu cita
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;
            }).join('');
        } else {
            grid.innerHTML = `<div class="col-12 text-center py-5">
                <p class="text-muted"><i class="fa fa-calendar-times fa-2x mb-2"></i><br>No hay servicios disponibles.</p>
            </div>`;
        }
    } catch (error) {
        console.error('❌ Error al cargar servicios:', error);
        grid.innerHTML = `<div class="col-12 text-center py-5 text-danger">
            <p><i class="fa fa-exclamation-triangle fa-2x mb-2"></i><br><strong>Error al cargar servicios</strong></p>
            <p class="small mt-2">${error.message}</p>
        </div>`;
    }
}

// ==========================================
// LÓGICA DEL CARRITO
// ==========================================
const CLAVE_STORAGE = 'viaCanesCarrito';

if (!document.getElementById('style-main-effects')) {
    const styleGlobal = document.createElement('style');
    styleGlobal.id = 'style-main-effects';
    styleGlobal.innerHTML = `
    .card-verde-activo { border: 2px solid #198754 !important; background-color: #f0fff4 !important; transform: scale(1.02); box-shadow: 0 0 15px rgba(25, 135, 84, 0.4) !important; transition: all 0.3s ease; z-index: 10; }
    .popIn { animation: popInAnim 0.3s ease-out; }
    @keyframes popInAnim { 0% { transform: scale(0.5); } 70% { transform: scale(1.2); } 100% { transform: scale(1); } }`;
    document.head.appendChild(styleGlobal);
}

function obtenerCarrito() {
    try { return JSON.parse(localStorage.getItem(CLAVE_STORAGE)) || []; } 
    catch (error) { return []; }
}

function guardarCarrito(carrito) {
    try {
        localStorage.setItem(CLAVE_STORAGE, JSON.stringify(carrito));
        renderizarCarrito();
        actualizarContadorGlobal();
    } catch (error) { console.error('Error al guardar carrito:', error); }
}

window.agregarAlCarrito = function(item) {
    const id = parseInt(item.id);
    const tipo = item.tipo || 'producto';
    const nombre = item.nombre || 'Producto sin nombre';
    const precio = parseFloat(item.precio) || 0;
    const precioOriginal = parseFloat(item.precioOriginal) || null;
    const imagen = item.imagen || 'img/default-product.png';
    const stock = parseInt(item.stock) || 999;

    if (!id || precio < 0) { mostrarToast('⚠️ Error al procesar el producto', 'warning'); return; }

    let carrito = obtenerCarrito();
    const existeIndex = carrito.findIndex(i => parseInt(i.id) === id && i.tipo === tipo);
    let mensajeExito = `✅ ${nombre} agregado`;

    if (existeIndex !== -1) {
        if (carrito[existeIndex].cantidad < stock) {
            carrito[existeIndex].cantidad += 1;
            mensajeExito = `✅ +1 ${nombre}`;
        } else {
            mostrarToast('⚠️ Stock máximo alcanzado', 'warning');
            return;
        }
    } else {
        const productoConPromo = { id, tipo, nombre, precio, cantidad: 1, imagen, stock };
        if (precioOriginal && precioOriginal > precio) productoConPromo.precioOriginal = precioOriginal;
        carrito.push(productoConPromo);
    }

    guardarCarrito(carrito);
    mostrarToast(mensajeExito, 'success');
    
    // Efecto visual
    const botones = document.querySelectorAll(`button[data-id="${id}"], .btn-agregar-carrito[data-id="${id}"]`);
    botones.forEach(btn => {
        const card = btn.closest('.card') || btn.closest('.col-12');
        if (card) {
            card.classList.add('card-verde-activo');
            const htmlOriginal = btn.innerHTML;
            btn.innerHTML = '<i class="fa fa-check"></i> Agregado';
            btn.classList.add('btn-success');
            btn.disabled = true;
            setTimeout(() => {
                card.classList.remove('card-verde-activo');
                btn.innerHTML = htmlOriginal;
                btn.classList.remove('btn-success');
                btn.disabled = false;
            }, 1500);
        }
    });
};

window.eliminarDelCarrito = function(id, tipo) {
    let carrito = obtenerCarrito();
    const nuevoCarrito = carrito.filter(i => !(parseInt(i.id) === id && i.tipo === tipo));
    if (nuevoCarrito.length !== carrito.length) {
        guardarCarrito(nuevoCarrito);
        mostrarToast('🗑️ Producto eliminado', 'info');
    }
};

window.cambiarCantidadCarrito = function(id, tipo, accion) {
    let carrito = obtenerCarrito();
    const index = carrito.findIndex(i => parseInt(i.id) === id && i.tipo === tipo);
    if (index === -1) return;
    const item = carrito[index];

    if (accion === 'sumar') {
        if (item.cantidad < item.stock) item.cantidad++;
        else mostrarToast('⚠️ Límite de stock', 'warning');
    } else if (accion === 'restar') {
        if (item.cantidad > 1) item.cantidad--;
        else { if(confirm("¿Quitar este producto del carrito?")) { window.eliminarDelCarrito(id, tipo); return; } }
    }
    guardarCarrito(carrito);
};

function renderizarCarrito() {
    const carrito = obtenerCarrito();
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total');
    if (!cartItemsContainer) return;

    let total = 0;
    const esHtml = window.location.pathname.includes('/html/');
    const prefijoRuta = esHtml ? '../' : '';

    if (carrito.length === 0) {
        cartItemsContainer.innerHTML = `<div class="text-center py-4"><i class="fa fa-shopping-basket fa-3x text-muted mb-3"></i><p class="text-muted">Tu carrito está vacío </p><a href="${prefijoRuta}index.html" class="btn btn-sm btn-outline-primary">Ir a la tienda</a></div>`;
        if (cartTotalElement) cartTotalElement.textContent = '$0';
        actualizarContadorGlobal(0);
        configurarBotonContinuar(0, esHtml);
        return;
    }

    cartItemsContainer.innerHTML = carrito.map(item => {
        const precioActual = parseFloat(item.precio) || 0;
        const precioOriginal = parseFloat(item.precioOriginal) || null;
        const cantidadSegura = parseInt(item.cantidad) || 1;
        const stock = parseInt(item.stock) || 999;
        const subtotal = precioActual * cantidadSegura;
        total += subtotal;
        const tienePromo = precioOriginal && precioOriginal > precioActual;

        let imgSrc = item.imagen || '';
        if (!imgSrc || imgSrc === 'null' || imgSrc === 'undefined') {
            imgSrc = 'img/default-product.png';
        } else {
            imgSrc = imgSrc.replace(/^(\.\.\/)+/, '');
            if (!imgSrc.startsWith('http') && !imgSrc.startsWith('/')) {
                if (!imgSrc.startsWith('img/')) imgSrc = 'img/' + imgSrc;
            }
        }

        const srcFinal = prefijoRuta + imgSrc;
        const fallbackFinal = prefijoRuta + 'img/default-product.png';

        return `
        <div class="cart-item-container mb-3 pb-3 border-bottom">
            <div class="row align-items-start">
                <div class="col-3">
                    <img src="${srcFinal}" class="img-fluid rounded" style="max-height: 100px; object-fit: contain;" onerror="this.onerror=null; this.src='${fallbackFinal}'" alt="${item.nombre}">
                </div>
                <div class="col-6">
                    <h6 class="mb-2 fw-bold" style="font-size: 0.95rem; line-height: 1.3;">${item.nombre}</h6>
                    <div class="d-flex align-items-center gap-2 mb-2">
                        <span class="text-primary fw-bold" style="font-size: 1.25rem;">$${precioActual.toLocaleString('es-CO')}</span>
                        ${tienePromo ? `<span class="text-muted text-decoration-line-through" style="font-size: 1rem;">$${precioOriginal.toLocaleString('es-CO')}</span>` : ''}
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-outline-secondary btn-sm btn-cantidad" data-id="${item.id}" data-tipo="${item.tipo}" data-accion="restar" style="padding: 0.25rem 0.5rem;"><i class="fa fa-minus" style="font-size: 0.6rem;"></i></button>
                            <input type="number" class="form-control form-control-sm btn-cantidad-input" data-id="${item.id}" data-tipo="${item.tipo}" value="${cantidadSegura}" min="1" max="${stock}" style="width: 50px; text-align: center; font-weight: bold; padding: 0.25rem; border-left: 0; border-right: 0;">
                            <button type="button" class="btn btn-outline-secondary btn-sm btn-cantidad" data-id="${item.id}" data-tipo="${item.tipo}" data-accion="sumar" style="padding: 0.25rem 0.5rem;"><i class="fa fa-plus" style="font-size: 0.6rem;"></i></button>
                        </div>
                    </div>
                </div>
                <div class="col-3 text-end">
                    <p class="mb-2 fw-bold text-dark" style="font-size: 1.1rem;">$${subtotal.toLocaleString('es-CO')}</p>
                    <button class="btn btn-eliminar-carrito btn-link text-danger p-0" data-id="${item.id}" data-tipo="${item.tipo}" title="Eliminar producto" style="font-size: 1.4rem;"><i class="fa fa-trash"></i></button>
                </div>
            </div>
        </div>`;
    }).join('');

    if (cartTotalElement) cartTotalElement.textContent = `$${total.toLocaleString('es-CO')}`;
    actualizarContadorGlobal(carrito.reduce((sum, item) => sum + item.cantidad, 0));
    configurarBotonContinuar(carrito.reduce((sum, item) => sum + item.cantidad, 0), esHtml);
}

function actualizarContadorGlobal(cantidadForzada = null) {
    const badge = document.getElementById('contador-carrito');
    if (!badge) return;
    let totalItems = cantidadForzada;
    if (totalItems === null) {
        const carrito = obtenerCarrito();
        totalItems = carrito.reduce((sum, item) => sum + (parseInt(item.cantidad) || 0), 0);
    }
    badge.textContent = totalItems;
    badge.style.display = totalItems > 0 ? 'inline-block' : 'none';
    if (totalItems > 0) {
        badge.classList.remove('popIn');
        void badge.offsetWidth;
        badge.classList.add('popIn');
        setTimeout(() => { badge.classList.remove('popIn'); }, 300);
    }
}

function configurarBotonContinuar(totalItems, esHtml) {
    const btnCheckout = document.getElementById('btn-checkout');
    if (btnCheckout) {
        const rutaDestino = esHtml ? 'carrito.html' : 'html/carrito.html';
        btnCheckout.setAttribute('href', rutaDestino);
        if (totalItems > 0) {
            btnCheckout.style.pointerEvents = 'auto';
            btnCheckout.style.opacity = '1';
            btnCheckout.classList.remove('disabled');
        } else {
            btnCheckout.style.pointerEvents = 'none';
            btnCheckout.style.opacity = '0.6';
            btnCheckout.classList.add('disabled');
        }
    }
}

window.actualizarVistaCarrito = renderizarCarrito;
window.renderCart = renderizarCarrito;

function mostrarToast(mensaje, tipo = 'success') {
    const toastEl = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    if (!toastEl || !toastMsg) return;
    toastMsg.textContent = mensaje;
    toastEl.className = `toast align-items-center text-white border-0 bg-${tipo}`;
    toastEl.classList.remove('hiding');
    toastEl.classList.add('show');
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', function handler() {
        toastEl.classList.add('hiding');
        setTimeout(() => { toastEl.classList.remove('show', 'hiding'); }, 300);
        toastEl.removeEventListener('hidden.bs.toast', handler);
    }, { once: true });
}

function verificarSesionAdmin() {
    try {
        const usuario = JSON.parse(localStorage.getItem('viaCanesUsuario') || localStorage.getItem('viaCanesUser') || 'null');
        const adminLink = document.getElementById('adminAccessLink');
        if (usuario && (usuario.nombre_rol === 'ADMINISTRADOR' || usuario.rol === 'ADMIN') && adminLink) {
            adminLink.classList.remove('d-none');
        }
    } catch (error) { console.error('Error al verificar sesión:', error); }
}

function mostrarBannerCategoria(filtros, totalProductos) {
    const banner = document.getElementById('categoryBanner');
    const hero = document.querySelector('.hero');
    if (!banner) return;
    const categoriasConfig = {
        'Perros': { class: 'banner-perros', badge: '🐕 Mundo Canino', title: 'Todo para tu Perro', description: 'Encuentra los mejores productos, alimentos premium y accesorios para mantener feliz y saludable a tu mejor amigo.' },
        'Gatos': { class: 'banner-gatos', badge: '🐱 Universo Felino', title: 'El Mundo de los Gatos', description: 'Productos selectos para consentir a tu felino. Arena, alimentos, juguetes y todo lo que tu michi necesita.' },
        'Otra Especie': { class: 'banner-otros', badge: '🐾 Mascotas Exóticas', title: 'Para Otras Especies', description: 'Cuidamos de todos tus compañeros: conejos, hámsters, aves, reptiles y más.' },
        'Higiene': { class: 'banner-higiene', badge: '✨ Cuidado Personal', title: 'Higiene y Estética', description: 'Productos de aseo, shampoos, cepillos y artículos de belleza para tu mascota.' },
        'Salud': { class: 'banner-salud', badge: '💊 Bienestar Animal', title: 'Salud y Medicina', description: 'Vitaminas, suplementos y productos medicinales de calidad profesional.' },
        'Servicios': { class: 'banner-servicios', badge: '🛎️ Servicios Premium', title: 'Nuestros Servicios', description: 'Baño, estética, paseos, guardería y más. Servicios profesionales.' },
        'Citas': { class: 'banner-citas', badge: '📅 Agenda Fácil', title: 'Agenda tu Cita', description: 'Reserva los servicios para tu mascota de manera rápida y sencilla.' }
    };
    if (filtros.tipo && filtros.valor && categoriasConfig[filtros.valor]) {
        const config = categoriasConfig[filtros.valor];
        banner.className = 'category-banner ' + config.class;
        document.getElementById('bannerBadge').textContent = config.badge;
        document.getElementById('bannerTitle').textContent = config.title;
        document.getElementById('bannerDescription').textContent = config.description;
        document.getElementById('bannerProductCount').textContent = `${totalProductos} productos`;
        banner.style.display = 'flex';
        banner.classList.add('active');
        if (hero) hero.style.display = 'none';
    } else {
        banner.style.display = 'none';
        if (hero) hero.style.display = '';
    }
}

// ==========================================
// 5. PROMOCIONES (CORREGIDO)
// ==========================================
// ==========================================
// 5. PROMOCIONES (USA LA MISMA CARD QUE LOS PRODUCTOS NORMALES)
// ==========================================
async function cargarPromocionesTienda() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    try {
        const response = await fetch(`${RUTA_API}productos_data.php?vista=promociones`);
        if (!response.ok) throw new Error('Error en la conexión con la API');

        const result = await response.json();

        if ((result.ok || result.success) && Array.isArray(result.data) && result.data.length > 0) {
            // ✅ AQUÍ ESTÁ LA MAGIA: Usa la misma función que las tarjetas normales
            // Esto garantiza que promociones.html se vea EXACTAMENTE igual que index.html
            procesarYRenderizar(result.data);
        } else {
            grid.innerHTML = `<div class="col-12 text-center py-5">
                <p class="text-muted"><i class="fa fa-tag fa-2x mb-2"></i><br>No hay promociones activas en este momento 🐾</p>
            </div>`;
        }
    } catch (error) {
        console.error('Error cargando promos:', error);
        grid.innerHTML = `<div class="col-12 text-center py-5 text-danger">
            <i class="fa fa-exclamation-triangle fa-2x mb-2"></i><br>
            <strong>Error al cargar las ofertas.</strong><br>
            <small class="text-muted">${error.message}</small>
        </div>`;
    }
}
window.onscroll = function() {
    const waBtn = document.getElementById("waBtn");
    if (waBtn) {
        if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
            waBtn.style.display = "flex";
        } else {
            waBtn.style.display = "none";
        }
    }
};

window.procesarYRenderizar = procesarYRenderizar;
document.dispatchEvent(new CustomEvent('viaCanesReady'));