// ================================================================
// GESTIÓN DE LA PÁGINA COMPLETA DE CARRITO - CARRITO.JS (CORREGIDO)
// ================================================================

const CLAVE_STORAGE = 'viaCanesCarrito';
const VALOR_ENVIO_GRATIS = 100000; 

function obtenerCarrito() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_STORAGE)) || [];
    } catch (error) {
        console.error('Error al leer el carrito:', error);
        return [];
    }
}

function guardarCarrito(carrito) {
    try {
        localStorage.setItem(CLAVE_STORAGE, JSON.stringify(carrito));
        initCarritoPage(); 
        if (typeof window.actualizarVistaCarrito === 'function') {
            window.actualizarVistaCarrito();
        }
    } catch (error) {
        console.error('Error al guardar el carrito:', error);
    }
}

// INICIALIZAR Y RENDERIZAR LA INTERFAZ
function initCarritoPage() {
    const carrito = obtenerCarrito();
    const listaProductos = document.getElementById('lista-productos-carrito');
    const contenedorVacio = document.getElementById('carrito-compras-vacio');
    
    const subtotalElement = document.getElementById('subtotal');
    const ivaElement = document.getElementById('iva');
    const totalElement = document.getElementById('total');
    
    const envioMsj = document.getElementById('envio-msj');
    const envioBarra = document.getElementById('envio-barra');

    if (!listaProductos) return; 

    if (carrito.length === 0) {
        listaProductos.innerHTML = '';
        if (contenedorVacio) contenedorVacio.classList.remove('d-none');
        if (subtotalElement) subtotalElement.textContent = '\$0';
        if (ivaElement) ivaElement.textContent = '\$0';
        if (totalElement) totalElement.textContent = '\$0';
        if (envioBarra) envioBarra.style.width = '0%';
        if (envioMsj) envioMsj.innerHTML = '¡Añade productos para envío gratis!';
        return;
    }

    if (contenedorVacio) contenedorVacio.classList.add('d-none');

    let netoSubtotal = 0;

    // Generar las filas de productos utilizando atributos 'data-' seguros
    listaProductos.innerHTML = carrito.map(item => {
        const precio = parseFloat(item.precio) || 0;
        const cantidad = parseInt(item.cantidad) || 1;
        const subtotalItem = precio * cantidad;
        netoSubtotal += subtotalItem;

        let imgUrl = item.imagen || '';
        if (!imgUrl.startsWith('http') && !imgUrl.startsWith('/')) {
            imgUrl = imgUrl.replace(/^(\.\.\/)+/, ''); 
            imgUrl = '../' + imgUrl; 
        }

        return `
            <div class="card card-body mb-3 shadow-sm border-0 rounded-4 d-flex flex-row align-items-center gap-3">
                <img src="${imgUrl}" alt="${item.nombre}" class="rounded-3" style="width: 80px; height: 80px; object-fit: cover;"
                     onerror="this.onerror=null; this.src='../img/default-product.png'">
                
                <div class="flex-grow-1">
                    <h5 class="fw-bold mb-1 fs-6">${item.nombre}</h5>
                    <p class="text-muted small mb-0">$${precio.toLocaleString('es-CO')} c/u</p>
                    
                    <div class="d-flex align-items-center gap-2 mt-2">
                        <button class="btn btn-sm btn-outline-secondary rounded-circle px-2 py-0 btn-control-checkout" 
                                data-id="${item.id}" data-tipo="${item.tipo}" data-accion="restar">-</button>
                        <span class="fw-bold fs-6">${cantidad}</span>
                        <button class="btn btn-sm btn-outline-secondary rounded-circle px-2 py-0 btn-control-checkout" 
                                data-id="${item.id}" data-tipo="${item.tipo}" data-accion="sumar">+</button>
                    </div>
                </div>
                
                <div class="text-end">
                    <p class="fw-bold text-dark mb-2">$${subtotalItem.toLocaleString('es-CO')}</p>
                    <button class="btn btn-sm btn-outline-danger border-0 rounded-circle btn-eliminar-checkout" 
                            data-id="${item.id}" data-tipo="${item.tipo}">
                        <i class="fa fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // OPERACIÓN MATEMÁTICA
    const precioSubtotalNeto = Math.round(netoSubtotal / 1.19);
    const precioIva = netoSubtotal - precioSubtotalNeto;

    if (subtotalElement) subtotalElement.textContent = `$${precioSubtotalNeto.toLocaleString('es-CO')}`;
    if (ivaElement) ivaElement.textContent = `$${precioIva.toLocaleString('es-CO')}`;
    if (totalElement) totalElement.textContent = `$${netoSubtotal.toLocaleString('es-CO')}`;

    if (envioBarra && envioMsj) {
        const porcentaje = Math.min((netoSubtotal / VALOR_ENVIO_GRATIS) * 100, 100);
        envioBarra.style.width = `${porcentaje}%`;

        if (netoSubtotal >= VALOR_ENVIO_GRATIS) {
            envioMsj.innerHTML = '🎉 ¡Felicidades! Tienes **Envío Gratis**';
        } else {
            const faltante = VALOR_ENVIO_GRATIS - netoSubtotal;
            envioMsj.innerHTML = `Te faltan **$${faltante.toLocaleString('es-CO')}** para el envío gratis`;
        }
    }

    asignarEventosBotones();
}

// CAPTURA AUTOMÁTICA DE CLICS
function asignarEventosBotones() {
    // Escuchar botones de + y -
    document.querySelectorAll('.btn-control-checkout').forEach(boton => {
        boton.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.getAttribute('data-id'));
            const tipo = e.currentTarget.getAttribute('data-tipo');
            const accion = e.currentTarget.getAttribute('data-accion');
            ejecutarCambioCantidad(id, tipo, accion);
        });
    });

    // Escuchar botones de eliminar (basurero)
    document.querySelectorAll('.btn-eliminar-checkout').forEach(boton => {
        boton.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.getAttribute('data-id'));
            const tipo = e.currentTarget.getAttribute('data-tipo');
            ejecutarEliminacion(id, tipo);
        });
    });
}

function ejecutarCambioCantidad(id, tipo, accion) {
    let carrito = obtenerCarrito();
    const idx = carrito.findIndex(i => parseInt(i.id) === id && i.tipo === tipo);
    if (idx === -1) return;

    if (accion === 'sumar') {
        if (carrito[idx].cantidad < (carrito[idx].stock || 999)) {
            carrito[idx].cantidad++;
        }
    } else if (accion === 'restar') {
        if (carrito[idx].cantidad > 1) {
            carrito[idx].cantidad--;
        } else {
            if(confirm("¿Quitar este producto del carrito? 🐾")) {
                ejecutarEliminacion(id, tipo);
                return;
            }
        }
    }
    guardarCarrito(carrito);
}

function ejecutarEliminacion(id, tipo) {
    let carrito = obtenerCarrito();
    carrito = carrito.filter(i => !(parseInt(i.id) === id && i.tipo === tipo));
    guardarCarrito(carrito);
}

// INICIALIZACIÓN DE LA PÁGINA
document.addEventListener('DOMContentLoaded', () => {
    initCarritoPage();

    // Buscar el botón vaciar buscando tanto por ID como por el texto "Vaciar mi carrito"
    let btnVaciar = document.getElementById('btn-confirmar-vaciar') || document.getElementById('vaciar-carrito');
    
    if (!btnVaciar) {
        // Si no lo encuentra, busca cualquier botón rojo abajo de la tarjeta que contenga la palabra Vaciar
        const botones = document.querySelectorAll('button, a');
        botones.forEach(b => {
            if(b.textContent.toLowerCase().includes('vaciar')) {
                btnVaciar = b;
            }
        });
    }

    if (btnVaciar) {
        btnVaciar.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('¿Estás seguro de que deseas vaciar por completo tu carrito? 🐾')) {
                guardarCarrito([]);
            }
        });
    }

    const btnFinalizar = document.getElementById('btn-finalizar') || document.querySelector('.btn-primary');
    if (btnFinalizar && btnFinalizar.textContent.includes('Comenzar')) {
        btnFinalizar.addEventListener('click', (e) => {
            e.preventDefault();
            const carrito = obtenerCarrito();
            if (carrito.length === 0) return;
            alert('¡Pedido procesado con éxito! Nos comunicaremos contigo para coordinar la entrega. 🐶');
            guardarCarrito([]);
        });
    }
});
