import {procesarYRenderizar} from './tienda-mostrar.js';

// ================================================================
// MAIN.JS - LÓGICA PRINCIPAL DEL PANEL DE LA TIENDA
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. LEER FILTROS DE LA URL
    const urlParams = new URLSearchParams(window.location.search);
    const filtros = {
        tipo: urlParams.get('tipo'),
        valor: urlParams.get('valor')
    };

    //console.log('🐾 Vía Canes - Cargando tienda con filtros:', filtros);

    // 2. Inicializar cargas
    cargarProductos(filtros);
    
    // Solo cargar servicios si no hay filtro de especie
    if (filtros.tipo !== 'especie') {
        cargarServicios(filtros);
    } else {
        document.getElementById('servicesGrid').parentElement.style.display = 'none';
    }
    
    renderizarCarrito();
    verificarSesionAdmin();
    cargarPromocionesTienda();

    // 3. Delegación de eventos
    document.addEventListener('click', (e) => {
        if (e.target.closest('.btn-agregar-carrito')) {
            e.preventDefault();
            const btn = e.target.closest('.btn-agregar-carrito');
            const item = {
                id: parseInt(btn.dataset.id),
                nombre: btn.dataset.nombre,
                precio: parseFloat(btn.dataset.precio),
                imagen: btn.dataset.imagen,
                tipo: 'producto',
                stock: parseInt(btn.dataset.stock) || 999
            };
            if (item.id > 0 && item.precio >= 0 && item.nombre !== 'undefined') {
        agregarAlCarrito(item);
    } else {
        console.error('❌ Datos inválidos:', item);
        alert('Error: Producto no válido');
    }

        }

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

        if (e.target.closest('.btn-eliminar-carrito')) {
            e.preventDefault();
            const btn = e.target.closest('.btn-eliminar-carrito');
            eliminarDelCarrito(parseInt(btn.dataset.id), btn.dataset.tipo);
        }

        // Nuevos botones de cantidad
        if (e.target.closest('.btn-cantidad')) {
            e.preventDefault();
            const btn = e.target.closest('.btn-cantidad');
            const accion = btn.dataset.accion;
            const id = parseInt(btn.dataset.id);
            const tipo = btn.dataset.tipo;
            
            if (accion === 'sumar') {
                const item = obtenerCarrito().find(i => i.id === id && i.tipo === tipo);
                if (item && item.cantidad < item.stock) {
                    item.cantidad += 1;
                    guardarCarrito(obtenerCarrito());
                } else {
                    mostrarToast('⚠️ Stock máximo alcanzado');
                }
            } else if (accion === 'restar') {
                const carrito = obtenerCarrito();
                const item = carrito.find(i => i.id === id && i.tipo === tipo);
                if (item) {
                    if (item.cantidad > 1) {
                        item.cantidad -= 1;
                        guardarCarrito(carrito);
                    } else {
                        eliminarDelCarrito(id, tipo);
                    }
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

    if (!grid) {
        console.error('❌ Elemento productGrid no encontrado');
        return;
    }

    let apiUrl = 'api/productos_data.php?vista=tienda';
    if (filtros.tipo && filtros.valor) {
        apiUrl += `&tipo=${encodeURIComponent(filtros.tipo)}&valor=${encodeURIComponent(filtros.valor)}`;
        if (sectionTitle) sectionTitle.innerHTML = `Productos: ${filtros.valor} 🐾`;
    }

    console.log('🔄 Cargando productos desde:', apiUrl);

    try {
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseText = await response.text();
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ La respuesta no es JSON válido:', responseText);
            throw new Error('La API devolvió HTML o texto no válido.');
        }

        if ((result.ok || result.success) && Array.isArray(result.data) && result.data.length > 0) {
            console.log(`📦 Mostrando ${result.data.length} productos`);
            
            // Mostrar banner dinámico
            mostrarBannerCategoria(filtros, result.data.length);
            procesarYRenderizar(result.data);
            /*grid.innerHTML = result.data.map(p => {
                const imgSrc = p.imagen_url ? p.imagen_url.replace('../', '') : 'img/default-product.png';
                const sinStock = parseInt(p.stock) <= 0;
                const stockActual = parseInt(p.stock) || 0;

                return `
                <div class="col-6 col-md-4 col-lg-3">
                    <div class="card h-100 shadow-sm border-0 product-card">
                        <img src="${imgSrc}" class="card-img-top" alt="${p.nombre}" 
                             style="height: 180px; object-fit: cover;"
                             onerror="this.onerror=null; this.src='img/default-product.png'">
                        <div class="card-body d-flex flex-column text-center">
                            <h6 class="card-title fw-bold">${p.nombre}</h6>
                            ${p.especies ? `<small class="text-muted">${p.especies}</small>` : ''}
                            <p class="card-text text-muted small flex-grow-1 my-2">
                                ${p.descripcion ? p.descripcion.substring(0, 80) + (p.descripcion.length > 80 ? '...' : '') : 'Sin descripción'}
                            </p>
                            <div class="mt-auto">
                                <h5 class="text-primary fw-bold mb-2">
                                    $${Number(p.precio_venta).toLocaleString('es-CO')}
                                </h5>
                                ${!sinStock && stockActual <= 10 ? `<small class="text-warning d-block mb-2">⚠️ Solo ${stockActual} disponibles</small>` : ''}
                                ${sinStock
                                    ? `<button class="btn btn-secondary w-100" disabled>Sin stock</button>`
                                    : `<button class="btn btn-primary w-100 btn-agregar-carrito"
                                                data-id="${p.id_producto}"
                                                data-nombre="${p.nombre}"
                                                data-precio="${p.precio_venta}"
                                                data-imagen="${imgSrc}"
                                                data-stock="${stockActual}">
                                            <i class="fa fa-cart-plus me-1"></i> Agregar al carrito
                                       </button>`
                                }
                            </div>
                        </div>
                    </div>
                </div>
                `;
            }).join('');*/
        } else {
            mostrarBannerCategoria(filtros, 0);
            console.warn('⚠️ No hay productos disponibles');
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
// 2. CARGA DE SERVICIOS (MODIFICADO: SIN PRECIO NI DURACIÓN)
// ==========================================
async function cargarServicios(filtros = {}) {
    const grid = document.getElementById('servicesGrid');
    if (!grid) {
        console.warn('⚠️ Elemento servicesGrid no encontrado');
        return;
    }

    let apiUrl = 'api/productos_data.php?vista=servicios';
    if (filtros.tipo === 'categoria' && filtros.valor === 'Servicios') {
        apiUrl += `&tipo=${encodeURIComponent(filtros.tipo)}&valor=${encodeURIComponent(filtros.valor)}`;
    }

    console.log('🔄 Cargando servicios desde:', apiUrl);

    try {
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseText = await response.text();
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ La respuesta de servicios no es JSON válido:', responseText);
            throw new Error('La API devolvió HTML o texto no válido.');
        }

        if ((result.ok || result.success) && Array.isArray(result.data) && result.data.length > 0) {
            console.log(`📦 Mostrando ${result.data.length} servicios`);
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
                                    <i class="fa-brands fa-whatsapp" style="font-size: 1.3rem;"></i>
                                    Agenda tu cita
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            console.warn('⚠️ No hay servicios disponibles');
            grid.innerHTML = `<div class="col-12 text-center py-5">
                <p class="text-muted"><i class="fa fa-calendar-times fa-2x mb-2"></i><br>No hay servicios disponibles.</p>
            </div>`;
        }
    } catch (error) {
        console.error('❌ Error al cargar servicios:', error);
        grid.innerHTML = `<div class="col-12 text-center py-5 text-danger">
            <p><i class="fa fa-exclamation-triangle fa-2x mb-2"></i><br>
            <strong>Error al cargar servicios</strong></p>
            <p class="small mt-2">${error.message}</p>
        </div>`;
    }
}

/**/



// ==========================================
// 3. LÓGICA DEL CARRITO
// ==========================================
function obtenerCarrito() {
    try {
        return JSON.parse(localStorage.getItem('viaCanesCarrito')) || [];
    } catch (error) {
        console.error('Error al leer carrito:', error);
        return [];
    }
}

function guardarCarrito(carrito) {
    try {
        localStorage.setItem('viaCanesCarrito', JSON.stringify(carrito));
        renderizarCarrito();
        console.log('💾 Carrito guardado:', carrito);
    } catch (error) {
        console.error('Error al guardar carrito:', error);
        mostrarToast('❌ Error al guardar en el carrito');
    }
}

function agregarAlCarrito(item) {
    let carrito = obtenerCarrito();
    const existe = carrito.find(i => i.id === item.id && i.tipo === item.tipo);

    if (existe) {
        if (existe.cantidad < item.stock) {
            existe.cantidad += 1;
            console.log(`📈 Producto existente, cantidad: ${existe.cantidad}`);
        } else {
            mostrarToast('⚠️ Stock máximo alcanzado');
            return;
        }
    } else {
        carrito.push({ ...item, cantidad: 1 });
        console.log('➕ Nuevo producto agregado al carrito');
    }

    guardarCarrito(carrito);
    mostrarToast(`✅ ${item.nombre} agregado al carrito`);
}

function eliminarDelCarrito(id, tipo) {
    let carrito = obtenerCarrito();
    const cantidadAntes = carrito.length;
    carrito = carrito.filter(i => !(i.id === id && i.tipo === tipo));
    
    if (carrito.length < cantidadAntes) {
        console.log('🗑️ Producto eliminado del carrito');
        guardarCarrito(carrito);
        mostrarToast('🗑️ Producto eliminado del carrito');
    }
}

function renderizarCarrito() {
    const carrito = obtenerCarrito();
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total');
    const contadorBadge = document.getElementById('contador-carrito');
    const btnCheckout = document.getElementById('btn-checkout');

    if (!cartItemsContainer) return;

    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    
    if (totalItems > 0) {
        if (contadorBadge) {
            contadorBadge.textContent = totalItems;
            contadorBadge.style.display = 'block';
        }
        if (btnCheckout) {
            btnCheckout.style.pointerEvents = 'auto';
            btnCheckout.style.opacity = '1';
        }
    } else {
        if (contadorBadge) contadorBadge.style.display = 'none';
        if (btnCheckout) {
            btnCheckout.style.pointerEvents = 'none';
            btnCheckout.style.opacity = '0.6';
        }
    }

    if (carrito.length === 0) {
        cartItemsContainer.innerHTML = '<p class="text-center text-muted mt-5">Tu carrito está vacío 🐾</p>';
        if (cartTotalElement) cartTotalElement.textContent = '$0';
        return;
    }

    let total = 0;
    cartItemsContainer.innerHTML = carrito.map(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        const imgSrc = item.imagen ? item.imagen.replace('../', '') : 'img/default-product.png';

        return `
            <div class="d-flex align-items-center mb-3 pb-3 border-bottom">
                <img src="${imgSrc}" class="rounded me-3" style="width: 60px; height: 60px; object-fit: cover;"
                     onerror="this.onerror=null; this.src='img/default-product.png'">
                <div class="flex-grow-1">
                    <h6 class="mb-0 small fw-bold">${item.nombre}</h6>
                    <small class="text-muted">$${Number(item.precio).toLocaleString('es-CO')}</small>
                    <div class="d-flex align-items-center gap-2 mt-1">
                        <button class="btn btn-sm btn-outline-secondary p-0 btn-cantidad" 
                                data-id="${item.id}" data-tipo="${item.tipo}" data-accion="restar"
                                style="width: 24px; height: 24px; line-height: 1;">
                            <i class="fa fa-minus" style="font-size: 10px;"></i>
                        </button>
                        <span class="fw-bold small">${item.cantidad}</span>
                        <button class="btn btn-sm btn-outline-secondary p-0 btn-cantidad" 
                                data-id="${item.id}" data-tipo="${item.tipo}" data-accion="sumar"
                                style="width: 24px; height: 24px; line-height: 1;">
                            <i class="fa fa-plus" style="font-size: 10px;"></i>
                        </button>
                    </div>
                </div>
                <div class="text-end">
                    <p class="mb-0 fw-bold small">$${subtotal.toLocaleString('es-CO')}</p>
                    <button class="btn btn-sm text-danger p-0 btn-eliminar-carrito"
                            data-id="${item.id}" data-tipo="${item.tipo}" title="Eliminar">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    if (cartTotalElement) {
        cartTotalElement.textContent = `$${total.toLocaleString('es-CO')}`;
    }
}

// ==========================================
// 4. UTILIDADES UI
// ==========================================
function mostrarToast(mensaje) {
    const toastEl = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    
    if (!toastEl || !toastMsg) {
        console.warn('⚠️ Toast no disponible:', mensaje);
        return;
    }
    
    toastMsg.textContent = mensaje;
    
    try {
        const toast = new bootstrap.Toast(toastEl, {
            delay: 3000
        });
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
            console.log('👤 Usuario administrador detectado');
        }
    } catch (error) {
        console.error('Error al verificar sesión:', error);
    }
}

// ==========================================
// 5. BANNER DINÁMICO
// ==========================================
function mostrarBannerCategoria(filtros, totalProductos) {
    const banner = document.getElementById('categoryBanner');
    const hero = document.querySelector('.hero'); // 👈 Seleccionamos el banner principal
    if (!banner) return;

    const categoriasConfig = {
        'Perros': {
            class: 'banner-perros',
            badge: '🐕 Mundo Canino',
            title: 'Todo para tu Perro',
            description: 'Encuentra los mejores productos, alimentos premium y accesorios para mantener feliz y saludable a tu mejor amigo.'
        },
        'Gatos': {
            class: 'banner-gatos',
            badge: '🐱 Universo Felino',
            title: 'El Mundo de los Gatos',
            description: 'Productos selectos para consentir a tu felino. Arena, alimentos, juguetes y todo lo que tu michi necesita.'
        },
        'Otra Especie': {
            class: 'banner-otros',
            badge: '🐾 Mascotas Exóticas',
            title: 'Para Otras Especies',
            description: 'Cuidamos de todos tus compañeros: conejos, hámsters, aves, reptiles y más.'
        },
        'Higiene': {
            class: 'banner-higiene',
            badge: '✨ Cuidado Personal',
            title: 'Higiene y Estética',
            description: 'Productos de aseo, shampoos, cepillos y artículos de belleza para tu mascota.'
        },
        'Salud': {
            class: 'banner-salud',
            badge: '💊 Bienestar Animal',
            title: 'Salud y Medicina',
            description: 'Vitaminas, suplementos y productos medicinales de calidad profesional.'
        },
        'Servicios': {
            class: 'banner-servicios',
            badge: '🛎️ Servicios Premium',
            title: 'Nuestros Servicios',
            description: 'Baño, estética, paseos, guardería y más. Servicios profesionales.'
        },
        'Citas': {
            class: 'banner-citas',
            badge: '📅 Agenda Fácil',
            title: 'Agenda tu Cita',
            description: 'Reserva los servicios para tu mascota de manera rápida y sencilla.'
        }
    };

    if (filtros.tipo && filtros.valor && categoriasConfig[filtros.valor]) {
        const config = categoriasConfig[filtros.valor];
        
        banner.className = 'category-banner';
        banner.classList.add(config.class);
        
        document.getElementById('bannerBadge').textContent = config.badge;
        document.getElementById('bannerTitle').textContent = config.title;
        document.getElementById('bannerDescription').textContent = config.description;
        document.getElementById('bannerProductCount').textContent = `${totalProductos} productos`;
        
        banner.style.display = 'flex';
        banner.classList.add('active');
        
        // 👇 OCULTAR el banner principal del index cuando hay categoría activa
        if (hero) hero.style.display = 'none';
    } else {
        banner.style.display = 'none';
        // 👇 MOSTRAR de nuevo el banner principal cuando NO hay categoría
        if (hero) hero.style.display = '';
    }
}
// ==========================================
// CARGA DE PROMOCIONES (VERSIÓN SEGURA)
// ==========================================
async function cargarPromocionesTienda() {
    // 1. Identificar el contenedor correcto
    const grid = document.getElementById('productGrid'); 
    
    // Si no estamos en la página de promociones, no hacemos nada para no dañar otras páginas
    if (!grid || !document.querySelector('.banner-ofertas')) return;

    try {
        // 2. Llamar a la API con la ruta corregida
        const response = await fetch('../api/promociones_data.php?accion=listar_activas');
        
        if (!response.ok) throw new Error('Error en la conexión con la API');
        
        const result = await response.json();

        // 3. Limpiar el spinner de carga
        grid.innerHTML = '';

        if (result.ok && Array.isArray(result.data) && result.data.length > 0) {
            
            // 4. Generar las tarjetas
            result.data.forEach(p => {
                // Calcular descuento
                let precioFinal = p.precio_venta;
                let etiquetaDesc = '';
                
                if (p.tipo_descuento === 'porcentaje') {
                    precioFinal = p.precio_venta * (1 - (p.valor_descuento / 100));
                    etiquetaDesc = `-${Math.round(p.valor_descuento)}%`;
                } else {
                    precioFinal = p.precio_venta - p.valor_descuento;
                    etiquetaDesc = `-$${Number(p.valor_descuento).toLocaleString('es-CO')}`;
                }

                // Ajustar imagen
                const imgSrc = p.imagen_url ? p.imagen_url.replace('../', '') : 'img/default-product.png';

                // Crear el HTML de la columna (col) para mantener el diseño Bootstrap
                const col = document.createElement('div');
                col.className = 'col-6 col-md-4 col-lg-3';
                
                col.innerHTML = `
                    <div class="card h-100 shadow-sm border-0 product-card promo-card position-relative">
                        <!-- Etiqueta de oferta -->
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
            grid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <p class="text-muted">No hay promociones activas en este momento 🐾</p>
                </div>`;
        }
    } catch (error) {
        console.error('Error cargando promos:', error);
        // No borramos el grid si falla, solo mostramos un mensaje pequeño para no dañar la UI
        grid.innerHTML = `<div class="col-12 text-center text-danger">Error al cargar ofertas.</div>`;
    }
}
// Función unificada para WhatsApp
function irWhatsApp(origen) {
    const numero = "573016540576"; // Tu número real
    const mensaje = encodeURIComponent(`Hola Vía Canes! Necesito ayuda (Origen: ${origen})`);
    window.open(`https://wa.me/${numero}?text=${mensaje}`, '_blank');
}

// Lógica para mostrar/ocultar botón flotante al hacer scroll
window.onscroll = function() {
    const waBtn = document.getElementById("waBtn");
    if (waBtn) { // ✅ VALIDAR QUE EXISTA EL ELEMENTO
        if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
            waBtn.style.display = "flex";
        } else {
            waBtn.style.display = "none";
        }
    }
};