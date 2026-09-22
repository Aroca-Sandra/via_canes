import { procesarYRenderizar } from './tienda-mostrar.js';

// ================================================================
// MAIN.JS - LÓGICA PRINCIPAL DEL PANEL DE LA TIENDA (VÍA CANES)
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. LEER FILTROS DE LA URL
    const urlParams = new URLSearchParams(window.location.search);
    const filtros = {
        tipo: urlParams.get('tipo'),
        valor: urlParams.get('valor')
    };

    // 2. INICIALIZAR CARGAS
    cargarProductos(filtros);
    
    // Solo cargar servicios si no hay filtro de especie
    if (filtros.tipo !== 'especie') {
        cargarServicios(filtros);
    } else {
        const servicesParent = document.getElementById('servicesGrid')?.parentElement;
        if (servicesParent) servicesParent.style.display = 'none';
    }
    
    renderizarCarrito();
    verificarSesionAdmin();
    cargarPromocionesTienda();

    // 3. DELEGACIÓN ÚNICA DE EVENTOS (CLICK)
    document.addEventListener('click', (e) => {
        // Agregar al carrito
        if (e.target.closest('.btn-agregar-carrito')) {
            e.preventDefault();
            const btn = e.target.closest('.btn-agregar-carrito');
            const item = {
                id: parseInt(btn.dataset.id),
                nombre: btn.dataset.nombre,
                precio: parseFloat(btn.dataset.precio),
                imagen: btn.dataset.imagen,
                tipo: btn.dataset.tipo || 'producto',
                stock: parseInt(btn.dataset.stock) || 999
            };
            if (item.id > 0 && item.precio >= 0 && item.nombre !== 'undefined') {
                agregarAlCarrito(item);
            } else {
                console.error('❌ Datos inválidos:', item);
                alert('Error: Producto no válido');
            }
        }

        // Agendar por WhatsApp
        if (e.target.closest('.btn-agendar-servicio')) {
            e.preventDefault();
            const btn = e.target.closest('.btn-agendar-servicio');
            const nombreServicio = btn.dataset.nombre || 'el servicio';
            const mensaje = encodeURIComponent(`¡Hola Vía Canes! 👋 Me interesa agendar una cita para: *${nombreServicio}*.`);
            const numeroWhatsApp = '573016540576';

            mostrarToast(`📅 Abriendo WhatsApp para: ${nombreServicio}`);
            setTimeout(() => {
                window.open(`https://wa.me/${numeroWhatsApp}?text=${mensaje}`, '_blank');
            }, 800);
        }

        // Eliminar del carrito
        if (e.target.closest('.btn-eliminar-carrito')) {
            e.preventDefault();
            const btn = e.target.closest('.btn-eliminar-carrito');
            eliminarDelCarrito(parseInt(btn.dataset.id), btn.dataset.tipo);
        }

        // Modificar cantidad (+ / -)
        if (e.target.closest('.btn-cantidad')) {
            e.preventDefault();
            const btn = e.target.closest('.btn-cantidad');
            const accion = btn.dataset.accion;
            const id = parseInt(btn.dataset.id);
            const tipo = btn.dataset.tipo;
            
            let carrito = obtenerCarrito();
            const item = carrito.find(i => parseInt(i.id) === id && i.tipo === tipo);
            
            if (!item) return;

            if (accion === 'sumar') {
                if (item.cantidad < item.stock) {
                    item.cantidad += 1;
                    guardarCarrito(carrito);
                } else {
                    if (typeof mostrarToast === 'function') mostrarToast('⚠️ Stock máximo alcanzado', 'warning');
                }
            } else if (accion === 'restar') {
                if (item.cantidad > 1) {
                    item.cantidad -= 1;
                    guardarCarrito(carrito);
                } else {
                    eliminarDelCarrito(id, tipo);
                }
            }
        }
    });
});

// ==========================================
// 1. CARGA DE PRODUCTOS
// ==========================================
async function cargarProductos(filtros = {}) {
    const grid = document.getElementById('productGrid');
    const sectionTitle = document.querySelector('.productos h3');

    if (!grid) return;

    let apiUrl = 'api/productos_data.php?vista=tienda';
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
    if (!grid) return;

    let apiUrl = 'api/productos_data.php?vista=servicios';
    if (filtros.tipo === 'categoria' && filtros.valor === 'Servicios') {
        apiUrl += `&tipo=${encodeURIComponent(filtros.tipo)}&valor=${encodeURIComponent(filtros.valor)}`;
    }

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

        const result = await response.json();

        if ((result.ok || result.success) && Array.isArray(result.data) && result.data.length > 0) {
            grid.innerHTML = result.data.map(s => `
                <div class="col-6 col-md-4 col-lg-3">
                    <div class="card h-100 shadow-sm border-0 service-card">
                        <div class="card-body d-flex flex-column text-center">
                            <div class="mb-3 text-primary">
                                <i class="fa fa-paw fa-3x"></i>
                            </div>
                            <h6 class="card-title fw-bold">${s.nombre}</h6>
                            <p class="card-text text-muted small flex-grow-1">
                                ${s.descripcion ? s.descripcion.substring(0, 80) + '...' : 'Servicio profesional'}
                            </p>
                            <div class="mt-auto">                              
                                <button class="btn-agendar-servicio"
                                        data-id="${s.id_servicio}"
                                        data-nombre="${s.nombre}"
                                        style="background-color: #25D366; border: none; color: white; padding: 10px 15px; border-radius: 8px; font-weight: bold; width: 100%; cursor: pointer;">
                                    <i class="fa-brands fa-whatsapp style="font-size: 1.3rem;"></i>
                                    Agenda tu cita
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
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

// ================================================================
// LÓGICA DEL CARRITO - MAIN.JS (SOLUCIÓN DE RUTAS Y CHECKOUT)
// ================================================================

const CLAVE_STORAGE = 'viaCanesCarrito';

// 1. OBTENER CARRITO
function obtenerCarrito() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_STORAGE)) || [];
    } catch (error) {
        console.error('Error al leer carrito:', error);
        return [];
    }
}

// 2. GUARDAR CARRITO
function guardarCarrito(carrito) {
    try {
        localStorage.setItem(CLAVE_STORAGE, JSON.stringify(carrito));
        renderizarCarrito(); // Actualiza la vista visual
        actualizarContadorGlobal(); // Actualiza la burbuja roja
    } catch (error) {
        console.error('Error al guardar carrito:', error);
    }
}

// 3. AGREGAR AL CARRITO (EXPOSICIÓN GLOBAL)
window.agregarAlCarrito = function(item) {
    const id = parseInt(item.id);
    const tipo = item.tipo || 'producto';
    const nombre = item.nombre || 'Producto sin nombre';
    const precio = parseFloat(item.precio) || 0;
    const imagen = item.imagen || 'img/default-product.png';
    const stock = parseInt(item.stock) || 999;

    if (!id || precio < 0) {
        if (typeof mostrarToast === 'function') mostrarToast('⚠️ Error al procesar el producto', 'warning');
        return;
    }

    let carrito = obtenerCarrito();
    const existeIndex = carrito.findIndex(i => parseInt(i.id) === id && i.tipo === tipo);

    if (existeIndex !== -1) {
        if (carrito[existeIndex].cantidad < stock) {
            carrito[existeIndex].cantidad += 1;
            if (typeof mostrarToast === 'function') mostrarToast(`✅ +1 ${nombre}`, 'success');
        } else {
            if (typeof mostrarToast === 'function') mostrarToast('⚠️ Stock máximo alcanzado', 'warning');
            return;
        }
    } else {
        carrito.push({ id, tipo, nombre, precio, cantidad: 1, imagen, stock });
        if (typeof mostrarToast === 'function') mostrarToast(`✅ ${nombre} agregado`, 'success');
    }

    guardarCarrito(carrito);
};

// 4. ELIMINAR PRODUCTO (EXPOSICIÓN GLOBAL)
window.eliminarDelCarrito = function(id, tipo) {
    let carrito = obtenerCarrito();
    const idNumerico = parseInt(id);
    
    const nuevoCarrito = carrito.filter(i => !(parseInt(i.id) === idNumerico && i.tipo === tipo));
    
    if (nuevoCarrito.length !== carrito.length) {
        guardarCarrito(nuevoCarrito);
        if (typeof mostrarToast === 'function') mostrarToast('🗑️ Producto eliminado', 'info');
    }
};

// 5. CAMBIAR CANTIDAD (+ / -) (EXPOSICIÓN GLOBAL)
window.cambiarCantidadCarrito = function(id, tipo, accion) {
    let carrito = obtenerCarrito();
    const idNumerico = parseInt(id);
    const index = carrito.findIndex(i => parseInt(i.id) === idNumerico && i.tipo === tipo);

    if (index === -1) return;

    const item = carrito[index];

    if (accion === 'sumar') {
        if (item.cantidad < item.stock) {
            item.cantidad++;
        } else {
            if (typeof mostrarToast === 'warning') mostrarToast('⚠️ Límite de stock', 'warning');
        }
    } else if (accion === 'restar') {
        if (item.cantidad > 1) {
            item.cantidad--;
        } else {
            if(confirm("¿Quitar este producto del carrito?")) {
                window.eliminarDelCarrito(id, tipo);
                return; 
            }
        }
    }

    guardarCarrito(carrito);
};

// 6. RENDERIZAR CARRITO VISUAL
function renderizarCarrito() {
    const carrito = obtenerCarrito();
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total');
    
    if (!cartItemsContainer) return;

    let total = 0;

    // ✨ DETECCIÓN DINÁMICA DE ENTORNO
    const esPromociones = window.location.pathname.includes('promociones');
    const prefijoRuta = esPromociones ? '../' : '';

    if (carrito.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="text-center py-4">
                <i class="fa fa-shopping-basket fa-3x text-muted mb-3"></i>
                <p class="text-muted">Tu carrito está vacío 🐾</p>
                <a href="${prefijoRuta}index.html" class="btn btn-sm btn-outline-primary">Ir a la tienda</a>
            </div>`;
        if (cartTotalElement) cartTotalElement.textContent = '\$0';
        actualizarContadorGlobal(0);
        configurarBotonContinuar(0, esPromociones); // Actualiza el botón de checkout vacío
        return;
    }

    cartItemsContainer.innerHTML = carrito.map(item => {
        const precioSeguro = parseFloat(item.precio) || 0;
        const cantidadSegura = parseInt(item.cantidad) || 1;
        const subtotal = precioSeguro * cantidadSegura;
        total += subtotal;

        let imgSrc = item.imagen || '';
        if (!imgSrc || imgSrc === 'null' || imgSrc === 'undefined') {
            imgSrc = 'img/default-product.png';
        } else if (!imgSrc.startsWith('http') && !imgSrc.startsWith('/')) {
             imgSrc = imgSrc.replace(/^(\.\.\/)+/, ''); 
             if(!imgSrc.startsWith('img/')) imgSrc = 'img/' + imgSrc;
        }

        const srcFinal = prefijoRuta + imgSrc;
        const fallbackFinal = prefijoRuta + 'img/default-product.png';

        return `
            <div class="d-flex align-items-center mb-3 pb-3 border-bottom">
                <img src="${srcFinal}" class="rounded me-3" style="width: 60px; height: 60px; object-fit: cover;"
                     onerror="this.onerror=null; this.src='${fallbackFinal}'">
                <div class="flex-grow-1">
                    <h6 class="mb-0 small fw-bold">${item.nombre}</h6>
                    <small class="text-muted">$${precioSeguro.toLocaleString('es-CO')}</small>
                    
                    <div class="d-flex align-items-center gap-2 mt-1">
                        <button class="btn btn-sm btn-outline-secondary p-0" 
                                onclick="window.cambiarCantidadCarrito(${item.id}, '${item.tipo}', 'restar')"
                                style="width: 24px; height: 24px; line-height: 1;">
                            <i class="fa fa-minus" style="font-size: 10px;"></i>
                        </button>
                        
                        <span class="fw-bold small">${cantidadSegura}</span>
                        
                        <button class="btn btn-sm btn-outline-secondary p-0" 
                                onclick="window.cambiarCantidadCarrito(${item.id}, '${item.tipo}', 'sumar')"
                                style="width: 24px; height: 24px; line-height: 1;">
                            <i class="fa fa-plus" style="font-size: 10px;"></i>
                        </button>
                    </div>
                </div>
                <div class="text-end">
                    <p class="mb-0 fw-bold small">$${subtotal.toLocaleString('es-CO')}</p>
                    <button class="btn btn-sm text-danger p-0"
                            onclick="window.eliminarDelCarrito(${item.id}, '${item.tipo}')" title="Eliminar">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    if (cartTotalElement) {
        cartTotalElement.textContent = `$${total.toLocaleString('es-CO')}`;
    }
    
    const totalCantidad = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    actualizarContadorGlobal(totalCantidad);
    configurarBotonContinuar(totalCantidad, esPromociones); // ✨ Configura el botón con la ruta dinámica
}

// 7. ACTUALIZAR CONTADOR GLOBAL
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
}

/// Habilitar/Deshabilitar botón de checkout si existe
function configurarBotonContinuar(totalItems, esPromociones) {
    const btnCheckout = document.getElementById('btn-checkout');
    if (btnCheckout) {
        // ✨ CORRECCIÓN DE RUTA: Ajusta el href dinámicamente si estás en promociones
        const prefijoRuta = esPromociones ? '../' : '';
        btnCheckout.setAttribute('href', `${prefijoRuta}html/carrito.html`);

        // Tu lógica original de estilos intacta 🐾
        if (totalItems > 0) {
            btnCheckout.style.pointerEvents = 'auto';
            btnCheckout.style.opacity = '1';
        } else {
            btnCheckout.style.pointerEvents = 'none';
            btnCheckout.style.opacity = '0.6';
        }
    }
}


// Exponer funciones globalmente
window.actualizarVistaCarrito = renderizarCarrito;
window.renderCart = renderizarCarrito;

// Auto-ejecución inicial al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    renderizarCarrito();
});


// ==========================================
// 4. UTILIDADES UI Y ADMINISTRACIÓN
// ==========================================
function mostrarToast(mensaje) {
    const toastEl = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    
    if (!toastEl || !toastMsg) return;
    
    toastMsg.textContent = mensaje;
    
    try {
        const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
        toast.show();
    } catch (error) {
        console.error('Error al mostrar toast:', error);
    }
}

function verificarSesionAdmin() {
    try {
        const usuario = JSON.parse(localStorage.getItem('viaCanesUsuario') || 'null');
        const adminLink = document.getElementById('adminAccessLink');
        
        if (usuario && usuario.nombre_rol === 'ADMINISTRADOR' && adminLink) {
            adminLink.classList.remove('d-none');
        }
    } catch (error) {
        console.error('Error al verificar sesión:', error);
    }
}

// ==========================================
// 5. BANNER DINÁMICO & PROMOCIONES
// ==========================================
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

async function cargarPromocionesTienda() {
    const grid = document.getElementById('productGrid'); 
    if (!grid || !document.querySelector('.banner-ofertas')) return;

    try {
        const response = await fetch('api/promociones_data.php?accion=listar_activas');
        if (!response.ok) throw new Error('Error en la conexión con la API');
        
        const result = await response.json();
        grid.innerHTML = '';

        if (result.ok && Array.isArray(result.data) && result.data.length > 0) {
            result.data.forEach(p => {
                let precioFinal = p.precio_venta;
                let etiquetaDesc = '';
                
                if (p.tipo_descuento === 'porcentaje') {
                    precioFinal = p.precio_venta * (1 - (p.valor_descuento / 100));
                    etiquetaDesc = `-${Math.round(p.valor_descuento)}%`;
                } else {
                    precioFinal = p.precio_venta - p.valor_descuento;
                    etiquetaDesc = `-$${Number(p.valor_descuento).toLocaleString('es-CO')}`;
                }

                const imgSrc = p.imagen_url ? p.imagen_url.replace('../', '') : 'img/default-product.png';
                const col = document.createElement('div');
                col.className = 'col-6 col-md-4 col-lg-3';
                
                col.innerHTML = `
                    <div class="card h-100 shadow-sm border-0 product-card promo-card position-relative">
                        <span class="promo-badge">${etiquetaDesc} OFF</span>
                        <img src="${imgSrc}" class="card-img-top" alt="${p.nombre}" 
                             style="height: 180px; object-fit: cover;"
                             onerror="this.src='img/default-product.png'">
                             
                        <div class="card-body d-flex flex-column text-center">
                            <h6 class="card-title fw-bold">${p.nombre}</h6>
                            <p class="card-text text-muted small flex-grow-1 my-2">
                                ${p.descripcion ? p.descripcion.substring(0, 60) + '...' : 'Oferta especial'}
                            </p>
                            
                            <div class="mt-auto">
                                <div class="mb-2">
                                    <span class="old-price">$${Number(p.precio_venta).toLocaleString('es-CO')}</span>
                                    <br>
                                    <span class="new-price">$${Math.round(precioFinal).toLocaleString('es-CO')}</span>
                                </div>
                                
                                <button class="btn btn-primary w-100 btn-agregar-carrito"
                                        data-id="${p.id_producto}"
                                        data-nombre="${p.nombre}"
                                        data-precio="${Math.round(precioFinal)}"
                                        data-imagen="${imgSrc}"
                                        data-stock="999"
                                        data-tipo="producto">
                                    <i class="fa fa-cart-plus me-1"></i> Agregar
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                grid.appendChild(col);
            });
        } else {
            grid.innerHTML = `<div class="col-12 text-center py-5">
                <p class="text-muted">No hay promociones activas en este momento 🐾</p>
            </div>`;
        }
    } catch (error) {
        console.error('Error cargando promos:', error);
        grid.innerHTML = `<div class="col-12 text-center text-danger">Error al cargar ofertas.</div>`;
    }
}

// ==========================================
// 6. EVENTOS AUXILIARES
// ==========================================
function irWhatsApp(origen) {
    const numero = "573016540576";
    const mensaje = encodeURIComponent(`Hola Vía Canes! Necesito ayuda (Origen: ${origen})`);
    window.open(`https://wa.me/${numero}?text=${mensaje}`, '_blank');
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
// ==========================================
// EXPORTACIÓN GLOBAL (CRÍTICO PARA INTEGRACIÓN)
// ==========================================
// Hacemos que las funciones estén disponibles en window para otros scripts
// y para depuración en consola.

window.procesarYRenderizar = procesarYRenderizar;
window.agregarAlCarrito = agregarAlCarrito;
window.eliminarDelCarrito = eliminarDelCarrito;
window.obtenerCarrito = obtenerCarrito;
window.guardarCarrito = guardarCarrito;
window.renderizarCarrito = renderizarCarrito;

// Disparamos evento personalizado para avisar que el sistema está listo
document.dispatchEvent(new CustomEvent('viaCanesReady'))