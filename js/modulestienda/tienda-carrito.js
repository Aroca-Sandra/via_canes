// carrito.js - Tienda (Cliente)
let carritoData = { id_carrito: null, items: [] };

// ==================== INICIALIZACIÓN ====================
document.addEventListener("DOMContentLoaded", () => {
    cargarCarrito();
    
    document.getElementById("btn-confirmar-vaciar")?.addEventListener("click", vaciarCarrito);
    document.getElementById("btn-finalizar")?.addEventListener("click", finalizarPedido);
});

// ==================== CARGAR CARRITO DESDE BD ====================
async function cargarCarrito() {
    try {
        const response = await fetch('carritos_data.php?action=obtener');
        const data = await response.json();
        
        if (data.success) {
            carritoData.id_carrito = data.id_carrito;
            carritoData.items = data.items;
            renderizarCarrito();
            actualizarContadorBurbuja();
        }
    } catch (error) {
        console.error('Error al cargar carrito:', error);
    }
}

// ==================== AGREGAR AL CARRITO ====================
window.agregarAlCarrito = async function(id_producto, nombre, precio, imagen = "") {
    try {
        const formData = new FormData();
        formData.append('action', 'agregar');
        formData.append('id_producto', id_producto);
        formData.append('cantidad', 1);

        const response = await fetch('carritos_data.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            showToast(`🐾 ¡${nombre} agregado al carrito!`, 'success');
            await cargarCarrito();
        }
    } catch (error) {
        console.error('Error al agregar:', error);
        showToast('Error al agregar producto', 'error');
    }
};

// ==================== RENDERIZAR CARRITO ====================
function renderizarCarrito() {
    const contenedor = document.getElementById("lista-productos-carrito");
    const vacio = document.getElementById("carrito-compras-vacio");
    const subtotalEl = document.getElementById("subtotal");
    const ivaEl = document.getElementById("iva");
    const totalEl = document.getElementById("total");
    const envioBarra = document.getElementById("envio-barra");
    const envioMsj = document.getElementById("envio-msj");

    if (!contenedor) return;
    contenedor.innerHTML = "";

    if (!carritoData.items || carritoData.items.length === 0) {
        if (vacio) vacio.classList.remove("d-none");
        resetearTotalesUI();
        return;
    }

    if (vacio) vacio.classList.add("d-none");

    let totalAcumulado = 0;

    carritoData.items.forEach((prod) => {
        totalAcumulado += parseFloat(prod.subtotal);
        
        contenedor.innerHTML += `
            <div class="card mb-3 p-3 shadow-sm border-0 rounded-4">
                <div class="row align-items-center g-0">
                    <div class="col-3 text-center">
                        <img src="${prod.imagen_url || '../img/placeholder.png'}" alt="${prod.nombre}" class="img-fluid rounded" style="max-height: 90px; object-fit: contain;">
                    </div>
                    <div class="col-9 ps-3">
                        <div class="d-flex justify-content-between align-items-start">
                            <h6 class="mb-1 fw-bold text-dark">${prod.nombre}</h6>
                            <button class="btn btn-link text-secondary p-0 border-0" onclick="eliminarProducto(${prod.id_detalle})">
                                <i class="fa-solid fa-trash-can fs-5"></i>
                            </button>
                        </div>
                        <p class="mb-2 text-muted small">$${parseFloat(prod.precio_unitario).toLocaleString()} / Unidad</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="d-flex align-items-center rounded-3 overflow-hidden shadow-sm" style="background-color: #e3f2fd; height: 38px;">
                                <button class="btn btn-sm border-0 px-3 h-100 text-primary fw-bold fs-5" onclick="cambiarCantidad(${prod.id_detalle}, ${prod.cantidad - 1})">−</button>
                                <div class="bg-white d-flex align-items-center justify-content-center fw-bold text-primary" style="width: 45px; height: 100%;">
                                    ${prod.cantidad}
                                </div>
                                <button class="btn btn-sm border-0 px-3 h-100 text-primary fw-bold fs-5" onclick="cambiarCantidad(${prod.id_detalle}, ${prod.cantidad + 1})">+</button>
                            </div>
                            <div class="fw-bold fs-5 text-dark">$${parseFloat(prod.subtotal).toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            </div>`;
    });

    // CÁLCULOS (IVA 19% incluido en el precio)
    const valorNeto = totalAcumulado / 1.19;
    const valorIva = totalAcumulado - valorNeto;

    if (subtotalEl) subtotalEl.innerText = `$ ${Math.round(valorNeto).toLocaleString()}`;
    if (ivaEl) ivaEl.innerText = `$ ${Math.round(valorIva).toLocaleString()}`;
    if (totalEl) totalEl.innerText = `$ ${Math.round(totalAcumulado).toLocaleString()}`;

    // BARRA DE ENVÍO GRATIS
    const ENVIO_GRATIS = 60000;
    if (envioBarra && envioMsj) {
        const porcentaje = Math.min((totalAcumulado / ENVIO_GRATIS) * 100, 100);
        envioBarra.style.width = `${porcentaje}%`;

        if (totalAcumulado >= ENVIO_GRATIS) {
            envioMsj.innerHTML = `<span class="text-success fw-bold">¡Felicidades! Tienes envío gratis 🚀</span>`;
            envioBarra.className = "progress-bar bg-success";
        } else {
            const faltante = ENVIO_GRATIS - totalAcumulado;
            envioMsj.innerText = `Te faltan $${Math.round(faltante).toLocaleString()} para el envío gratis`;
            envioBarra.className = "progress-bar bg-primary";
        }
    }
}

// ==================== ACCIONES ====================
window.cambiarCantidad = async function(id_detalle, nueva_cantidad) {
    if (nueva_cantidad < 1) {
        eliminarProducto(id_detalle);
        return;
    }

    try {
        const formData = new FormData();
        formData.append('action', 'actualizar');
        formData.append('id_detalle', id_detalle);
        formData.append('cantidad', nueva_cantidad);

        const response = await fetch('carritos_data.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            await cargarCarrito();
        }
    } catch (error) {
        console.error('Error al actualizar:', error);
    }
};

window.eliminarProducto = async function(id_detalle) {
    if (!confirm("¿Quieres quitar este producto del carrito? 🐾")) return;

    try {
        const formData = new FormData();
        formData.append('action', 'eliminar');
        formData.append('id_detalle', id_detalle);

        const response = await fetch('carritos_data.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            showToast('🗑️ Producto eliminado', 'info');
            await cargarCarrito();
        }
    } catch (error) {
        console.error('Error al eliminar:', error);
    }
};

async function vaciarCarrito() {
    if (!confirm("¿Vaciar el carrito de tu mascota? 🐾")) return;

    try {
        const formData = new FormData();
        formData.append('action', 'vaciar');

        const response = await fetch('carritos_data.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            showToast('🗑️ Carrito vaciado', 'info');
            await cargarCarrito();
        }
    } catch (error) {
        console.error('Error al vaciar:', error);
    }
}

function finalizarPedido() {
    if (!carritoData.items || carritoData.items.length === 0) {
        showToast("Tu carrito está vacío. ¡Agrega algo para tu mascota! 🐶", 'warning');
        return;
    }
    alert("¡Pedido confirmado! Redirigiendo al pago...");
    // Aquí iría la lógica para crear el pedido en la BD
}

// ==================== UTILIDADES ====================
function actualizarContadorBurbuja() {
    const badge = document.getElementById("contador-carrito");
    if (!badge) return;
    const totalItems = carritoData.items.reduce((acc, p) => acc + parseInt(p.cantidad), 0);
    badge.textContent = totalItems;
    badge.style.display = totalItems > 0 ? "inline-block" : "none";
}

function resetearTotalesUI() {
    ["subtotal", "iva", "total"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = "$ 0";
    });
    const barra = document.getElementById("envio-barra");
    if (barra) barra.style.width = "0%";
    actualizarContadorBurbuja();
}

function showToast(msg, type = 'info') {
    // Implementa tu sistema de notificaciones o usa alert temporalmente
    alert(msg);
}