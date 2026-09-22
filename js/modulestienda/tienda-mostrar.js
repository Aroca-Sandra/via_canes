// ================================================================
// TIENDA-MOSTRAR.JS - MÓDULO DE PROCESAMIENTO Y RENDERIZADO DE CARDS
// ================================================================

const IMG_DEFAULT = 'img/default-product.png';
let listaProductosMapeados = [];

/**
 * Recibe el array de datos crudos del backend y renderiza las cards en el DOM.
 * @param {Array} datos - Lista de productos recibidos de la API.
 */
export function procesarYRenderizar(datos) {
    const grid = document.getElementById('productGrid');
    
    if (!grid) {
        console.warn('⚠️ No se encontró el contenedor #productGrid en el DOM.');
        return;
    }

    if (!Array.isArray(datos) || datos.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center py-5">
                <p class="text-muted"><i class="fa fa-box-open fa-2x mb-2"></i><br>No hay productos disponibles.</p>
            </div>`;
        return;
    }

    // 1. Procesamos los datos crudos a un formato estándar
    listaProductosMapeados = datos.map(p => procesarProducto(p));

    // 2. Generamos y renderizamos el HTML
    grid.innerHTML = listaProductosMapeados.map(p => crearCard(p)).join('');
}

/**
 * Normaliza y calcula los valores de un producto individual.
 * @param {Object} p - Objeto producto sin procesar.
 * @returns {Object} Objeto normalizado.
 */
export function procesarProducto(p) {
    // 1. Lógica de Precios y Descuentos
    const valorDescuento = Number(p.valor_descuento || p.valor || 0);
    const tipoDescuento = String(p.tipo_descuento || 'fijo').toLowerCase();
    const precioOriginal = Number(p.precio_venta || p.precio || 0);

    let precioFinal = precioOriginal;
    let porcentajeVisual = 0;

    if (p.id_promo) {
        if (tipoDescuento === 'porcentaje') {
            porcentajeVisual = Math.round(valorDescuento);
            precioFinal = precioOriginal * (1 - (valorDescuento / 100));
        } else {
            // Descuento valor fijo
            precioFinal = Math.max(0, precioOriginal - valorDescuento);
            if (precioOriginal > 0) {
                porcentajeVisual = Math.round((valorDescuento / precioOriginal) * 100);
            }
        }
    }

    // 2. Normalización de Ruta de Imagen
    let imgUrl = String(p.imagen_url || p.foto_url || '').trim();

    if (imgUrl) {
        // Limpiamos subidas de directorio repetidas (../)
        imgUrl = imgUrl.replace(/^(\.\.\/)+/, '');

        // Si no es URL absoluta ni relativa desde raíz
        if (!imgUrl.startsWith('http') && !imgUrl.startsWith('/')) {
            imgUrl = 'img/' + imgUrl.replace(/^img\//, '');
        }
    } else {
        imgUrl = IMG_DEFAULT;
    }

    // 3. Sanitización de Textos para HTML
    const nombreSeguro = String(p.nombre || 'Producto sin nombre')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    return {
        id: Number(p.id_producto || p.id || 0),
        nombreSeguro,
        precioOriginal,
        precioFinal: Math.round(precioFinal),
        porcentajeVisual,
        img: imgUrl,
        id_promo: p.id_promo || '',
        stock: Number(p.stock) || 0,
        tipo: 'producto'
    };
}

/**
 * Genera la plantilla HTML de la Card del producto.
 * @param {Object} p - Producto normalizado por procesarProducto.
 * @returns {string} String HTML.
 */
export function crearCard(p) {
    // Badge de descuento
    const badgeDescuento = p.porcentajeVisual > 0
        ? `<div class="position-absolute top-0 end-0 m-3" style="z-index: 10;">
                <span class="badge bg-danger rounded-pill px-3 py-2 fw-bold shadow-sm">-${p.porcentajeVisual}% OFF</span>
            </div>`
        : '';

    // Precio tachado
    const precioTachado = p.precioOriginal > p.precioFinal
        ? `<span class="text-decoration-line-through text-muted small">$${p.precioOriginal.toLocaleString('es-CO')}</span>`
        : '';

    return `
    <div class="col-12 col-sm-6 col-lg-3 mb-4 fade-in">
        <div class="card h-100 border-0 shadow-sm product-card position-relative overflow-hidden" style="border-radius: 16px; transition: transform 0.2s;">
            
            ${badgeDescuento}

            <div class="position-relative" style="height: 250px; background-color: #f8f9fa; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                <img src="${p.img}" 
                     alt="${p.nombreSeguro}" 
                     class="img-fluid" 
                     style="max-height: 100%; max-width: 100%; object-fit: contain;" 
                     onerror="this.onerror=null; this.src='${IMG_DEFAULT}';">
            </div>

            <div class="card-body d-flex flex-column p-3 text-center">
                <h5 class="card-title fw-bold mb-2 text-dark" style="font-size: 1rem; min-height: 2.4em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                    ${p.nombreSeguro}
                </h5>
                
                <div class="mt-auto pt-2">
                    <div class="d-flex justify-content-center align-items-center gap-2 mb-2 flex-wrap">
                        <span class="fw-bold fs-5 text-primary">$${p.precioFinal.toLocaleString('es-CO')}</span>
                        ${precioTachado}
                    </div>
                    
                    <button class="btn btn-primary w-100 rounded-pill py-2 fw-bold btn-agregar-carrito"
                        data-id="${p.id}"
                        data-nombre="${p.nombreSeguro}"
                        data-precio="${p.precioFinal}"
                        data-imagen="${p.img}" 
                        data-stock="${p.stock}"
                        data-tipo="${p.tipo}">
                        <i class="fa fa-shopping-cart me-2"></i> Agregar
                    </button>
                </div>
            </div>
        </div>
    </div>`;
}
/**
 * Inicializa los eventos de los botones "Agregar al Carrito"
 * Se debe llamar después de renderizar las cards.
 */
export function inicializarEventosCarrito() {
    // Usamos delegación de eventos en el grid para capturar clicks dinámicos
    const grid = document.getElementById('productGrid');
    
    if (!grid) return;

    grid.addEventListener('click', (e) => {
        // Buscamos si se hizo click en un botón o dentro de él (icono)
        const btn = e.target.closest('.btn-agregar-carrito');
        
        if (btn) {
            e.preventDefault();
            
            // Extraemos los datos del botón
            const id = parseInt(btn.dataset.id);
            const nombre = btn.dataset.nombre;
            const precio = parseFloat(btn.dataset.precio);
            const imagen = btn.dataset.imagen;
            const stock = parseInt(btn.dataset.stock);
            const tipo = btn.dataset.tipo || 'producto';

            if (id && !isNaN(precio)) {
                // Llamamos a la función GLOBAL definida en main.js
                if (typeof window.agregarAlCarrito === 'function') {
                    window.agregarAlCarrito({
                        id: id,
                        nombre: nombre,
                        precio: precio,
                        imagen: imagen,
                        stock: stock,
                        tipo: tipo
                    });
                } else {
                    console.error("❌ Error: La función window.agregarAlCarrito no está disponible. Verifica que main.js cargue antes.");
                }
            }
        }
    });
}