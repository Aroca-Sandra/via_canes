/* ==========================================
   LÓGICA UNIFICADA DEL CARRITO (Vía Canes)
   Incluye Modo Demo si falla el Backend
   ========================================== */

let carritoData = { 
    id_carrito: null, 
    items: [] 
};

// ==================== INICIALIZACIÓN ====================
document.addEventListener("DOMContentLoaded", () => {
    cargarCarrito();
    
    // Listeners botones estáticos
    document.getElementById("btn-confirmar-vaciar")?.addEventListener("click", vaciarCarrito);
    document.getElementById("btn-finalizar")?.addEventListener("click", finalizarPedido);

    // Refrescar al abrir el menú lateral
    const offcanvasEl = document.getElementById('carritoLateral');
    if (offcanvasEl) {
        offcanvasEl.addEventListener('shown.bs.offcanvas', renderizarCarrito);
    }

    // Delegación de eventos para botones dinámicos (+, -, eliminar)
    document.body.addEventListener('click', function(e) {
        const btnSumar = e.target.closest('.btn-sumar');
        const btnRestar = e.target.closest('.btn-restar');
        const btnEliminar = e.target.closest('.btn-eliminar');

        if (btnSumar) {
            const id = btnSumar.dataset.id;
            const item = carritoData.items.find(i => i.id_detalle == id);
            if (item) cambiarCantidad(id, item.cantidad + 1);
        } 
        else if (btnRestar) {
            const id = btnRestar.dataset.id;
            const item = carritoData.items.find(i => i.id_detalle == id);
            if (item && item.cantidad > 1) {
                cambiarCantidad(id, item.cantidad - 1);
            } else if (item) {
                eliminarProducto(id);
            }
        } 
        else if (btnEliminar) {
            eliminarProducto(btnEliminar.dataset.id);
        }
    });
});

// ==================== CARGAR DATOS ====================
async function cargarCarrito() {
    try {
        // Intenta conectar con el backend
        const response = await fetch('carritos_data.php?action=obtener');
        
        if (!response.ok) throw new Error("Backend no disponible");
        
        const data = await response.json();
        
        if (data.success) {
            carritoData.id_carrito = data.id_carrito;
            carritoData.items = data.items;
        } else {
            throw new Error("Respuesta inválida del servidor");
        }
    } catch (error) {
        console.warn("⚠️ Backend no detectado. Activando MODO DEMO para pruebas visuales.");
        activarModoDemo();
    }
    
    renderizarCarrito();
}

// ==================== MODO DEMO (FALLBACK) ====================
function activarModoDemo() {
    // Simula un carrito con datos si no hay PHP conectado
    carritoData.id_carrito = 999;
    carritoData.items = [
        {
            id_detalle: 101,
            nombre: "Croquetas Premium Perro Adulto",
            precio_unitario: 45000,
            cantidad: 1,
            subtotal: 45000,
            imagen_url: "../img/p-perro.png" // Asegúrate que esta imagen exista o usa una URL externa
        },
        {
            id_detalle: 102,
            nombre: "Juguete Hueso de Goma",
            precio_unitario: 12000,
            cantidad: 2,
            subtotal: 24000,
            imagen_url: "../img/p-gato.png"
        }
    ];
}

// ==================== RENDERIZADO VISUAL ====================
function renderizarCarrito() {
    const items = carritoData.items;
    const totalItems = items.reduce((sum, item) => sum + parseInt(item.cantidad), 0);
    
    // 1. Contador Header
    const badge = document.getElementById('contador-carrito');
    if (badge) {
        badge.textContent = totalItems;
        badge.style.display = totalItems > 0 ? 'inline-block' : 'none';
    }

    // 2. Lista Principal (Página Carrito)
    const listaPrincipal = document.getElementById('lista-productos-carrito');
    const msgVacio = document.getElementById('carrito-compras-vacio');
    
    if (listaPrincipal) {
        if (items.length === 0) {
            listaPrincipal.innerHTML = '';
            if(msgVacio) msgVacio.classList.remove('d-none');
        } else {
            if(msgVacio) msgVacio.classList.add('d-none');
            
            listaPrincipal.innerHTML = items.map(prod => `
                <div class="card mb-3 border-0 shadow-sm">
                    <div class="row g-0 align-items-center p-2">
                        <div class="col-3 text-center">
                            <img src="${prod.imagen_url || 'https://via.placeholder.com/100'}" class="img-fluid rounded" style="max-height: 80px;">
                        </div>
                        <div class="col-9">
                            <div class="d-flex justify-content-between">
                                <h6 class="fw-bold mb-1">${prod.nombre}</h6>
                                <button class="btn btn-sm text-danger btn-eliminar" data-id="${prod.id_detalle}"><i class="fa fa-trash"></i></button>
                            </div>
                            <small class="text-muted">$${parseFloat(prod.precio_unitario).toLocaleString()} c/u</small>
                            <div class="d-flex justify-content-between align-items-center mt-2">
                                <div class="input-group input-group-sm" style="width: 100px;">
                                    <button class="btn btn-outline-secondary btn-restar" data-id="${prod.id_detalle}">-</button>
                                    <input type="text" class="form-control text-center p-0" value="${prod.cantidad}" readonly style="height: 30px;">
                                    <button class="btn btn-outline-secondary btn-sumar" data-id="${prod.id_detalle}">+</button>
                                </div>
                                <span class="fw-bold">$${parseFloat(prod.subtotal).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    // 3. Offcanvas (Menú Lateral) - Actualiza ambos contenedores posibles
    ['cart-items', 'lista-productos-flotante'].forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            if (items.length === 0) {
                container.innerHTML = '<p class="text-center text-muted mt-5">Tu carrito está vacío 🐾</p>';
            } else {
                container.innerHTML = items.map(prod => `
                    <div class="d-flex align-items-center mb-3 pb-2 border-bottom">
                        <img src="${prod.imagen_url || 'https://via.placeholder.com/60'}" width="50" height="50" class="rounded me-3" style="object-fit:cover">
                        <div class="flex-grow-1">
                            <h6 class="mb-0 small fw-bold">${prod.nombre}</h6>
                            <small class="text-muted">${prod.cantidad} x $${parseFloat(prod.precio_unitario).toLocaleString()}</small>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                             <button class="btn btn-sm btn-outline-secondary py-0 px-2 btn-restar" data-id="${prod.id_detalle}">-</button>
                             <span class="small fw-bold">${prod.cantidad}</span>
                             <button class="btn btn-sm btn-outline-secondary py-0 px-2 btn-sumar" data-id="${prod.id_detalle}">+</button>
                        </div>
                    </div>
                `).join('');
            }
        }
    });

    // 4. Cálculos Totales
    let totalAcumulado = items.reduce((acc, item) => acc + parseFloat(item.subtotal), 0);
    let neto = totalAcumulado / 1.19;
    let iva = totalAcumulado - neto;

    updateText('subtotal', `$${Math.round(neto).toLocaleString()}`);
    updateText('iva', `$${Math.round(iva).toLocaleString()}`);
    updateText('total', `$${Math.round(totalAcumulado).toLocaleString()}`);
    updateText('total-flotante', `$${Math.round(totalAcumulado).toLocaleString()}`);
    updateText('cart-total', `$${Math.round(totalAcumulado).toLocaleString()}`);

    // 5. Barra Envío Gratis
    const meta = 60000;
    const barra = document.getElementById('envio-barra');
    const msj = document.getElementById('envio-msj');
    
    if (barra && msj) {
        if (items.length === 0) {
            barra.style.width = '0%';
            msj.textContent = '¡Añade productos para envío gratis!';
        } else if (totalAcumulado >= meta) {
            barra.style.width = '100%';
            msj.innerHTML = '<span class="text-success fw-bold">¡Envío GRATIS desbloqueado! 🚀</span>';
        } else {
            let pct = (totalAcumulado / meta) * 100;
            barra.style.width = `${pct}%`;
            msj.textContent = `Te faltan $${(meta - totalAcumulado).toLocaleString()} para envío gratis`;
        }
    }

    // 6. Botones Checkout
    const btnCheck = document.getElementById('btn-checkout');
    const btnFin = document.getElementById('btn-finalizar');
    if(btnCheck) btnCheck.style.opacity = items.length ? '1' : '0.5';
    if(btnFin) btnFin.disabled = items.length === 0;
}

// Helper simple para actualizar texto
function updateText(id, val) {
    const el = document.getElementById(id);
    if(el) el.textContent = val;
}

// ==================== ACCIONES ====================

window.agregarAlCarrito = async function(id, nombre, precio, img) {
    // Simulación visual inmediata
    mostrarToast(`🐾 ${nombre} agregado`, 'success');
    
    // En un entorno real, aquí harías el fetch POST al PHP
    // Por ahora, agregamos al array local para probar
    let existente = carritoData.items.find(i => i.id_detalle == id);
    if(existente) {
        existente.cantidad++;
        existente.subtotal = existente.cantidad * existente.precio_unitario;
    } else {
        carritoData.items.push({
            id_detalle: id,
            nombre: nombre,
            precio_unitario: precio,
            cantidad: 1,
            subtotal: precio,
            imagen_url: img
        });
    }
    renderizarCarrito();
};

async function cambiarCantidad(id, nuevaCantidad) {
    // Aquí iría el fetch POST 'action=actualizar'
    const item = carritoData.items.find(i => i.id_detalle == id);
    if(item) {
        item.cantidad = nuevaCantidad;
        item.subtotal = item.cantidad * item.precio_unitario;
        renderizarCarrito();
    }
}

async function eliminarProducto(id) {
    if(!confirm("¿Eliminar producto?")) return;
    // Aquí iría el fetch POST 'action=eliminar'
    carritoData.items = carritoData.items.filter(i => i.id_detalle != id);
    renderizarCarrito();
}

async function vaciarCarrito() {
    if(!confirm("¿Vaciar todo el carrito?")) return;
    // Aquí iría el fetch POST 'action=vaciar'
    carritoData.items = [];
    renderizarCarrito();
}

function finalizarPedido() {
    if(carritoData.items.length === 0) return;
    alert("Redirigiendo a pasarela de pago...");
}

function mostrarToast(msg, type) {
    const t = document.getElementById('toast');
    const m = document.getElementById('toastMsg');
    if(t && m) {
        m.textContent = msg;
        t.className = `toast align-items-center text-white bg-${type || 'primary'} border-0 show`;
        setTimeout(() => t.classList.remove('show'), 3000);
    }
}