// js/modulestienda/main.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar cargas
    cargarProductos();
    cargarServicios();
    renderizarCarrito();
    verificarSesionAdmin();

    // 2. Delegación de eventos para botones dinámicos
    document.addEventListener('click', (e) => {
        // Agregar producto al carrito
        if (e.target.closest('.btn-agregar-carrito')) {
            const btn = e.target.closest('.btn-agregar-carrito');
            const item = {
                id: parseInt(btn.dataset.id),
                nombre: btn.dataset.nombre,
                precio: parseFloat(btn.dataset.precio),
                imagen: btn.dataset.imagen,
                tipo: 'producto'
            };
            agregarAlCarrito(item);
        }
        
        // Agendar servicio (Abre WhatsApp con mensaje predeterminado)
        if (e.target.closest('.btn-agendar-servicio')) {
            const btn = e.target.closest('.btn-agendar-servicio');
            const nombreServicio = btn.dataset.nombre || 'el servicio';
            
            // 1. Creamos el mensaje que llegará al WhatsApp de la tienda
            const mensaje = encodeURIComponent(`¡Hola Vía Canes! 👋 Me interesa agendar una cita para: *${nombreServicio}*.`);
            
            // 2. Número de WhatsApp de la tienda 
            const numeroWhatsApp = '573016540576'; 
            
            mostrarToast(`📅 Abriendo WhatsApp para: ${nombreServicio}`);
            
            setTimeout(() => {
                // 3. Abrimos WhatsApp en una nueva pestaña
                window.open(`https://wa.me/${numeroWhatsApp}?text=${mensaje}`, '_blank');
            }, 800);
        }

        // Eliminar del carrito
        if (e.target.closest('.btn-eliminar-carrito')) {
            const btn = e.target.closest('.btn-eliminar-carrito');
            eliminarDelCarrito(parseInt(btn.dataset.id), btn.dataset.tipo);
        }
    });
});

// ==========================================
// 1. CARGA DE DATOS DESDE LA API
// ==========================================
async function cargarProductos() {
    const grid = document.getElementById('productGrid');
    try {
        const response = await fetch('api/productos_data.php?vista=tienda');
        const result = await response.json();

        if ((result.ok || result.success) && Array.isArray(result.data) && result.data.length > 0) {
            grid.innerHTML = result.data.map(p => {
                const imgSrc = p.imagen_url ? p.imagen_url.replace('../', '') : 'img/default-product.png';
                const alertaStock = p.stock < 5 ? '<span class="badge bg-warning text-dark position-absolute top-0 end-0 m-2">¡Últimas unidades!</span>' : '';
                
                return `
                <div class="col-6 col-md-4 col-lg-3">
                    <div class="card h-100 shadow-sm border-0 product-card">
                        <div class="position-relative">
                            <img src="${imgSrc}" class="card-img-top" alt="${p.nombre}" style="height: 200px; object-fit: cover;">
                            ${alertaStock}
                        </div>
                        <div class="card-body d-flex flex-column">
                            <small class="text-muted text-uppercase" style="font-size: 0.7rem;">${p.categoria}</small>
                            <h6 class="card-title fw-bold mt-1" style="font-size: 0.95rem; line-height: 1.3;">${p.nombre}</h6>
                            <p class="card-text text-muted small flex-grow-1" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                                ${p.descripcion}
                            </p>
                            <div class="d-flex justify-content-between align-items-center mt-3">
                                <span class="fw-bold text-primary fs-5">$${Number(p.precio_venta).toLocaleString('es-CO')}</span>
                                <button class="btn btn-sm btn-primary rounded-pill btn-agregar-carrito" 
                                        data-id="${p.id_producto}" 
                                        data-nombre="${p.nombre}" 
                                        data-precio="${p.precio_venta}" 
                                        data-imagen="${imgSrc}">
                                    <i class="fa fa-cart-plus"></i> Agregar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;
            }).join('');
        } else {
            grid.innerHTML = `<div class="col-12 text-center py-5"><p class="text-muted">No hay productos disponibles en este momento.</p></div>`;
        }
    } catch (error) {
        console.error('Error al cargar productos:', error);
        grid.innerHTML = `<div class="col-12 text-center py-5 text-danger"><p><i class="fa fa-exclamation-triangle"></i> Error al cargar los productos.</p></div>`;
    }
}

async function cargarServicios() {
    const grid = document.getElementById('servicesGrid');
    try {
        const response = await fetch('api/servicios_data.php?vista=tienda');
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
                            <p class="card-text text-muted small flex-grow-1">${s.descripcion ? s.descripcion.substring(0, 80) + '...' : ''}</p>
                            <div class="mt-auto">
                                ${s.duracion ? `<small class="text-muted d-block mb-3"><i class="fa fa-clock"></i> ${s.duracion} min</small>` : ''}
                                
                                <!--  EL PRECIO FUE ELIMINADO DE AQUÍ  -->
                                
                                <!-- ✅ BOTÓN DE WHATSAPP CON DISEÑO VERDE -->
                                <button class="btn-agendar-servicio" 
                                        data-id="${s.id_servicio}" 
                                        data-nombre="${s.nombre}"
                                        style="background-color: #25D366; border: none; color: white; padding: 10px 15px; border-radius: 8px; font-weight: bold; width: 100%; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                    <i class="fa-brands fa-whatsapp" style="font-size: 1.3rem;"></i>
                                    Agenda tu cita
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            grid.innerHTML = `<div class="col-12 text-center py-5"><p class="text-muted">No hay servicios disponibles en este momento.</p></div>`;
        }
    } catch (error) {
        console.error('Error al cargar servicios:', error);
        grid.innerHTML = `<div class="col-12 text-center py-5 text-danger"><p><i class="fa fa-exclamation-triangle"></i> Error al cargar los servicios.</p></div>`;
    }
}

// ==========================================
// 2. LÓGICA DEL CARRITO (LocalStorage)
// ==========================================
function obtenerCarrito() {
    return JSON.parse(localStorage.getItem('viaCanesCarrito')) || [];
}

function guardarCarrito(carrito) {
    localStorage.setItem('viaCanesCarrito', JSON.stringify(carrito));
    renderizarCarrito();
}

function agregarAlCarrito(item) {
    let carrito = obtenerCarrito();
    const existe = carrito.find(i => i.id === item.id && i.tipo === item.tipo);

    if (existe) {
        existe.cantidad += 1;
    } else {
        carrito.push({ ...item, cantidad: 1 });
    }

    guardarCarrito(carrito);
    mostrarToast(`✅ ${item.nombre} agregado al carrito`);
}

function eliminarDelCarrito(id, tipo) {
    let carrito = obtenerCarrito();
    carrito = carrito.filter(i => !(i.id === id && i.tipo === tipo));
    guardarCarrito(carrito);
    mostrarToast('🗑️ Producto eliminado del carrito');
}

function renderizarCarrito() {
    const carrito = obtenerCarrito();
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total');
    const contadorBadge = document.getElementById('contador-carrito');
    const btnCheckout = document.getElementById('btn-checkout');

    // Actualizar contador del header
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    if (totalItems > 0) {
        contadorBadge.textContent = totalItems;
        contadorBadge.style.display = 'block';
        btnCheckout.style.pointerEvents = 'auto';
        btnCheckout.style.opacity = '1';
    } else {
        contadorBadge.style.display = 'none';
        btnCheckout.style.pointerEvents = 'none';
        btnCheckout.style.opacity = '0.6';
    }

    // Renderizar items en el offcanvas
    if (carrito.length === 0) {
        cartItemsContainer.innerHTML = '<p class="text-center text-muted mt-5">Tu carrito está vacío 🐾</p>';
        cartTotalElement.textContent = '$0';
        return;
    }

    let total = 0;
    cartItemsContainer.innerHTML = carrito.map(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        const imgSrc = item.imagen ? item.imagen.replace('../', '') : 'img/default-product.png';
        
        return `
            <div class="d-flex align-items-center mb-3 pb-3 border-bottom">
                <img src="${imgSrc}" class="rounded me-3" style="width: 60px; height: 60px; object-fit: cover;">
                <div class="flex-grow-1">
                    <h6 class="mb-0 small fw-bold">${item.nombre}</h6>
                    <small class="text-muted">$${Number(item.precio).toLocaleString('es-CO')} x ${item.cantidad}</small>
                </div>
                <div class="text-end">
                    <p class="mb-0 fw-bold small">$${subtotal.toLocaleString('es-CO')}</p>
                    <button class="btn btn-sm text-danger p-0 btn-eliminar-carrito" data-id="${item.id}" data-tipo="${item.tipo}">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    cartTotalElement.textContent = `$${total.toLocaleString('es-CO')}`;
}

// ==========================================
// 3. UTILIDADES UI
// ==========================================
function mostrarToast(mensaje) {
    const toastEl = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    toastMsg.textContent = mensaje;
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

function verificarSesionAdmin() {
    const usuario = JSON.parse(localStorage.getItem('viaCanesUsuario'));
    if (usuario && usuario.nombre_rol === 'ADMINISTRADOR') {
        document.getElementById('adminAccessLink').classList.remove('d-none');
    }
}