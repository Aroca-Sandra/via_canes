// ================================================================
// TIENDA-MOSTRAR.JS - MÓDULO DE PROCESAMIENTO Y RENDERIZADO DE CARDS
// ================================================================

// ✅ CORRECCIÓN DE RUTAS: Detecta automáticamente si estamos en /html/ o en la raíz
const path = window.location.pathname;
const enCarpetaHtml = path.includes('/html/') || path.includes('\\html\\');
const IMG_PREFIX = enCarpetaHtml ? '../img/' : 'img/';
const IMG_DEFAULT = IMG_PREFIX + 'default-product.png';

let listaProductosMapeados = [];

/**
 * Recibe el array de datos crudos del backend y renderiza las cards en el DOM.
 * @param {Array} datos - Lista de productos recibidos de la API.
 */
export function procesarYRenderizar(datos) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    if (!Array.isArray(datos) || datos.length === 0) {
        grid.innerHTML = `<div class="col-12 text-center py-5">
            <p class="text-muted"><i class="fa fa-box-open fa-2x mb-2"></i><br>No hay productos disponibles.</p>
        </div>`;
        return;
    }

    // Mapeamos y renderizamos en un solo paso limpio
    listaProductosMapeados = datos.map(p => procesarProducto(p));
    grid.innerHTML = listaProductosMapeados.map(p => crearCard(p)).join('');
}

/**
 * Normaliza y calcula los valores de un producto individual.
 */
export function procesarProducto(p) {
    const valorDescuento = Number(p.valor_descuento || p.valor || 0);
    const tipoDescuento = String(p.tipo_descuento || 'fijo').toLowerCase();
    const precioOriginal = Number(p.precio_venta || p.precio || 0);

    let precioFinal = precioOriginal;
    let porcentajeVisual = 0;

    if (p.id_promo || valorDescuento > 0) {
        if (tipoDescuento === 'porcentaje') {
            porcentajeVisual = Math.round(valorDescuento);
            precioFinal = precioOriginal * (1 - (valorDescuento / 100));
        } else {
            precioFinal = Math.max(0, precioOriginal - valorDescuento);
            if (precioOriginal > 0) {
                porcentajeVisual = Math.round((valorDescuento / precioOriginal) * 100);
            }
        }
    }

    // Normalización de Ruta de Imagen (Robusta para cualquier carpeta)
    let imgUrl = String(p.imagen_url || p.foto_url || '').trim();
    if (imgUrl) {
        imgUrl = imgUrl.replace(/^(\.\.\/)+/, ''); // Limpiamos prefijos viejos
        if (!imgUrl.startsWith('http') && !imgUrl.startsWith('/')) {
            imgUrl = IMG_PREFIX + imgUrl.replace(/^img\//, '');
        }
    } else {
        imgUrl = IMG_DEFAULT;
    }

    // Sanitización de Textos para HTML (Prevención de errores por comillas)
    const nombreSeguro = String(p.nombre || 'Producto sin nombre')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    // ✅ 1. AQUÍ AGREGAMOS Y LIMPIAMOS LA DESCRIPCIÓN
    const descripcionSegura = String(p.descripcion || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    return {
        id: Number(p.id_producto || p.id || 0),
        nombreSeguro,
        descripcionSegura, // ✅ 2. AQUÍ LA ENVIAMOS A LA TARJETA
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
 */
export function crearCard(p) {
    const badgeDescuento = p.porcentajeVisual > 0
        ? `<div class="position-absolute top-0 end-0 m-3" style="z-index: 10;">
                <span class="badge bg-danger rounded-pill px-3 py-2 fw-bold shadow-sm">-${p.porcentajeVisual}% OFF</span>
           </div>`
        : '';

    const precioTachado = p.precioOriginal > p.precioFinal
        ? `<span class="text-decoration-line-through text-muted small">$${p.precioOriginal.toLocaleString('es-CO')}</span>`
        : '';

    // Solo los productos EN PROMO llevan el atributo del precio original
    const attrPrecioOriginal = p.precioOriginal > p.precioFinal
        ? `data-precio-original="${p.precioOriginal}"`
        : '';

    // Botón deshabilitado visualmente si no hay stock
    const agotado = Number(p.stock) <= 0;

    return `
    <div class="col-12 col-sm-6 col-lg-3 mb-4 fade-in">
        <div class="card h-100 border-0 shadow-sm product-card position-relative overflow-hidden" style="border-radius: 16px; transition: transform 0.2s;">
            ${badgeDescuento}
            <div class="position-relative" style="height: 250px; background-color: #f8f9fa; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                <img src="${p.img}" alt="${p.nombreSeguro}" class="img-fluid" style="max-height: 100%; max-width: 100%; object-fit: contain;" onerror="this.onerror=null; this.src='${IMG_DEFAULT}';">
            </div>
            <div class="card-body d-flex flex-column p-3 text-center">
                <h5 class="card-title fw-bold mb-1 text-dark" style="font-size: 1rem; min-height: 2.4em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                    ${p.nombreSeguro}
                </h5>

                <!-- ✅ 3. AQUÍ SE DIBUJA LA DESCRIPCIÓN DEBAJO DEL TÍTULO -->
<p class="text-muted small mb-2 w-100 text-start" style="font-size: 0.82rem; line-height: 1.4;">
    ${p.descripcionSegura}
</p>

                <div class="mt-auto pt-2">
                    <div class="d-flex justify-content-center align-items-center gap-2 mb-2 flex-wrap">
                        <span class="fw-bold fs-5 text-primary">$${p.precioFinal.toLocaleString('es-CO')}</span>
                        ${precioTachado}
                    </div>

                    <button class="btn btn-add w-100 btn-agregar-carrito"
                        data-id="${p.id}"
                        data-nombre="${p.nombreSeguro}"
                        data-precio="${p.precioFinal}"
                        ${attrPrecioOriginal}
                        data-imagen="${p.img}"
                        data-stock="${p.stock}"
                        data-tipo="${p.tipo}"
                        ${agotado ? 'disabled style="opacity:.5; cursor:not-allowed;"' : ''}>
                        ${agotado
                            ? '<i class="fa fa-ban me-2"></i> Agotado'
                            : '<i class="fa fa-shopping-cart me-2"></i> Agregar'}
                    </button>
                </div>
            </div>
        </div>
    </div>`;
}