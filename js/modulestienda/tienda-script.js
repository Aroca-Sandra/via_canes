// ================================================================
// TIENDA - CARGA DE PRODUCTOS DESDE LA API
// ================================================================

// URL base de la API (ajusta según tu estructura)
const API_URL = '../api/api.php'; // o la ruta que uses en tu backend

// Función para hacer peticiones a la API
async function apiFetchTienda(accion, data = null, method = 'POST') {
    try {
        const options = {
            method: method,
        };
        
        if (method === 'POST' && data) {
            if (data instanceof FormData) {
                options.body = data;
            } else {
                options.headers = { 'Content-Type': 'application/json' };
                options.body = JSON.stringify(data);
            }
        } else if (method === 'GET' && data) {
            const params = new URLSearchParams(data).toString();
            return await fetch(`${API_URL}?action=${accion}&${params}`).then(r => r.json());
        }
        
        const response = await fetch(`${API_URL}?action=${accion}`, options);
        return await response.json();
    } catch (error) {
        console.error('Error en API:', error);
        return { success: false, error: 'Error de conexión' };
    }
}

// Cargar productos destacados en la tienda
async function cargarProductosTienda() {
    const res = await apiFetchTienda('listar_productos', null, 'GET');
    
    if (res.success && res.data) {
        // Filtrar solo productos activos y con stock
        const productosDestacados = res.data.filter(p => 
            p.id_estado_producto == 1 && p.stock > 0
        ).slice(0, 8); // Mostrar máximo 8 productos destacados
        
        renderProductosTienda(productosDestacados);
    } else {
        document.getElementById('productGrid').innerHTML = 
            '<div class="col-12 text-center text-muted py-5"><i class="fa fa-box-open fa-3x mb-3 d-block opacity-50"></i><p>No hay productos disponibles en este momento</p></div>';
    }
}

// Renderizar productos en la tienda
function renderProductosTienda(productos) {
    const grid = document.getElementById('productGrid');
    
    if (!productos || productos.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center text-muted py-5"><p>No hay productos disponibles</p></div>';
        return;
    }
    
    grid.innerHTML = productos.map(p => {
        const precio = parseFloat(p.precio_venta || 0).toLocaleString('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        });
        
        const imagen = p.imagen_url || 'img/placeholder.png';
        const descuento = p.descuento ? `<span class="badge bg-danger position-absolute top-0 end-0 m-2">-${p.descuento}%</span>` : '';
        
        return `
            <div class="col-6 col-md-4 col-lg-3">
                <div class="product-card h-100 shadow-sm border-0 rounded-4 overflow-hidden position-relative">
                    ${descuento}
                    <div class="product-img-container position-relative overflow-hidden" style="height: 200px; background: #f8f9fa;">
                        <img src="${imagen}" 
                             alt="${p.nombre}" 
                             class="w-100 h-100"
                             style="object-fit: cover; transition: transform 0.3s;"
                             onmouseover="this.style.transform='scale(1.05)'"
                             onmouseout="this.style.transform='scale(1)'"
                             onerror="this.src='img/placeholder.png'">
                    </div>
                    <div class="card-body d-flex flex-column p-3">
                        <small class="text-muted text-uppercase" style="font-size: 0.7rem;">${p.categoria || 'Producto'}</small>
                        <h6 class="fw-bold mb-2 mt-1" style="font-size: 0.95rem; line-height: 1.3;">${p.nombre}</h6>
                        <p class="text-muted small mb-3 flex-grow-1" style="font-size: 0.8rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                            ${p.descripcion || 'Producto de alta calidad para tu mascota'}
                        </p>
                        <div class="d-flex justify-content-between align-items-center mt-auto">
                            <div>
                                <div class="fw-bold text-primary fs-5">${precio}</div>
                                <small class="text-success"><i class="fa fa-check-circle"></i> Disponible</small>
                            </div>
                            <button class="btn btn-primary rounded-circle d-flex align-items-center justify-content-center" 
                                    style="width: 42px; height: 42px;"
                                    onclick="agregarAlCarrito(${p.id_producto}, '${p.nombre.replace(/'/g, "\\'")}', ${p.precio_venta}, '${imagen}')"
                                    title="Agregar al carrito">
                                <i class="fa fa-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Función para agregar al carrito (ya debes tenerla o adaptarla)
function agregarAlCarrito(id, nombre, precio, imagen) {
    let carrito = JSON.parse(localStorage.getItem('vc_carrito') || '[]');
    
    const existente = carrito.find(item => item.id == id);
    if (existente) {
        existente.cantidad++;
    } else {
        carrito.push({
            id: id,
            nombre: nombre,
            precio: parseFloat(precio),
            imagen: imagen,
            cantidad: 1
        });
    }
    
    localStorage.setItem('vc_carrito', JSON.stringify(carrito));
    actualizarContadorCarrito();
    mostrarToast(`✅ ${nombre} agregado al carrito`);
}

// Actualizar contador del carrito
function actualizarContadorCarrito() {
    const carrito = JSON.parse(localStorage.getItem('vc_carrito') || '[]');
    const total = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const badge = document.getElementById('contador-carrito');
    
    if (badge) {
        if (total > 0) {
            badge.textContent = total;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Mostrar notificación toast
function mostrarToast(mensaje) {
    const toastEl = document.getElementById('toast');
    if (toastEl) {
        document.getElementById('toastMsg').textContent = mensaje;
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    }
}

// Cargar servicios en la tienda
async function cargarServiciosTienda() {
    const res = await apiFetchTienda('listar_servicios', null, 'GET');
    
    if (res.success && res.data) {
        const serviciosActivos = res.data.filter(s => s.id_estado == 1).slice(0, 6);
        renderServiciosTienda(serviciosActivos);
    }
}

function renderServiciosTienda(servicios) {
    const grid = document.getElementById('servicesGrid');
    if (!grid) return;
    
    if (!servicios || servicios.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center text-muted py-4"><p>No hay servicios disponibles</p></div>';
        return;
    }
    
    grid.innerHTML = servicios.map(s => {
        const precio = parseFloat(s.precio_referencia || 0).toLocaleString('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        });
        
        const iconos = {
            'baño': 'fa-bath',
            'corte': 'fa-cut',
            'veterinario': 'fa-stethoscope',
            'default': 'fa-concierge-bell'
        };
        
        const icono = iconos[s.nombre.toLowerCase().split(' ')[0]] || iconos.default;
        
        return `
            <div class="col-6 col-md-4 col-lg-2">
                <div class="service-card p-3 rounded-4 shadow-sm h-100 border-0" style="background: linear-gradient(135deg, #f8f9fa, #ffffff);">
                    <div class="mb-3">
                        <div class="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10" style="width: 60px; height: 60px;">
                            <i class="fa ${icono} fa-2x text-primary"></i>
                        </div>
                    </div>
                    <h6 class="fw-bold mb-2" style="font-size: 0.9rem;">${s.nombre}</h6>
                    <p class="text-muted small mb-3" style="font-size: 0.75rem; min-height: 40px;">
                        ${s.descripcion || 'Servicio profesional'}
                    </p>
                    <div class="text-primary fw-bold mb-3">${precio}</div>
                    <a href="html/citas.html" class="btn btn-sm btn-outline-primary rounded-pill w-100">
                        Agendar
                    </a>
                </div>
            </div>
        `;
    }).join('');
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    cargarProductosTienda();
    cargarServiciosTienda();
    actualizarContadorCarrito();
    
    // Cargar carrito lateral si existe
    cargarCarritoLateral();
});

// Cargar items del carrito lateral
function cargarCarritoLateral() {
    const carrito = JSON.parse(localStorage.getItem('vc_carrito') || '[]');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const btnCheckout = document.getElementById('btn-checkout');
    
    if (!cartItems) return;
    
    if (carrito.length === 0) {
        cartItems.innerHTML = '<p class="text-center text-muted mt-5">Tu carrito está vacío 🐾</p>';
        if (cartTotal) cartTotal.textContent = '$0';
        if (btnCheckout) {
            btnCheckout.style.pointerEvents = 'none';
            btnCheckout.style.opacity = '0.6';
        }
        return;
    }
    
    let total = 0;
    cartItems.innerHTML = carrito.map(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        
        return `
            <div class="d-flex gap-3 mb-3 p-2 border-bottom">
                <img src="${item.imagen}" alt="${item.nombre}" 
                     style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;"
                     onerror="this.src='img/placeholder.png'">
                <div class="flex-grow-1">
                    <h6 class="mb-1 fw-bold" style="font-size: 0.85rem;">${item.nombre}</h6>
                    <small class="text-muted">$${item.precio.toLocaleString('es-CO')} x ${item.cantidad}</small>
                    <div class="d-flex align-items-center gap-2 mt-2">
                        <button class="btn btn-sm btn-outline-secondary py-0 px-2" onclick="cambiarCantidad(${item.id}, -1)">-</button>
                        <span class="fw-bold">${item.cantidad}</span>
                        <button class="btn btn-sm btn-outline-secondary py-0 px-2" onclick="cambiarCantidad(${item.id}, 1)">+</button>
                        <button class="btn btn-sm btn-outline-danger py-0 px-2 ms-auto" onclick="eliminarDelCarrito(${item.id})">
                            <i class="fa fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    if (cartTotal) {
        cartTotal.textContent = total.toLocaleString('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        });
    }
    
    if (btnCheckout) {
        btnCheckout.style.pointerEvents = 'auto';
        btnCheckout.style.opacity = '1';
    }
}

// Cambiar cantidad en el carrito
function cambiarCantidad(id, delta) {
    let carrito = JSON.parse(localStorage.getItem('vc_carrito') || '[]');
    const item = carrito.find(i => i.id == id);
    
    if (item) {
        item.cantidad += delta;
        if (item.cantidad <= 0) {
            carrito = carrito.filter(i => i.id != id);
        }
    }
    
    localStorage.setItem('vc_carrito', JSON.stringify(carrito));
    actualizarContadorCarrito();
    cargarCarritoLateral();
}

// Eliminar item del carrito
function eliminarDelCarrito(id) {
    let carrito = JSON.parse(localStorage.getItem('vc_carrito') || '[]');
    carrito = carrito.filter(i => i.id != id);
    localStorage.setItem('vc_carrito', JSON.stringify(carrito));
    actualizarContadorCarrito();
    cargarCarritoLateral();
}