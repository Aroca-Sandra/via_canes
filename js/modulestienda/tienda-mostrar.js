// ================================================================
// TIENDA-MOSTRAR.JS - MÓDULO DE PROCESAMIENTO Y RENDERIZADO DE CARDS
// ================================================================

const path = window.location.pathname;
const enCarpetaHtml = path.includes('/html/') || path.includes('\\html\\');
const IMG_PREFIX = enCarpetaHtml ? '../img/' : 'img/';
const IMG_DEFAULT = IMG_PREFIX + 'default-product.png';

let listaProductosMapeados = [];

/**
* Recibe el array de datos crudos del backend y renderiza las cards en el DOM.
* @param {Array} datos - Lista de productos o servicios recibidos de la API.
*/
export function procesarYRenderizar(datos) {
const grid = document.getElementById('productGrid');
if (!grid) return;

if (!Array.isArray(datos) || datos.length === 0) {
grid.innerHTML = `<div class="col-12 text-center py-5">
<p class="text-muted"><i class="fa fa-box-open fa-2x mb-2"></i><br>No hay elementos disponibles.</p>
</div>`;
return;
}

listaProductosMapeados = datos.map(p => procesarProducto(p));
grid.innerHTML = listaProductosMapeados.map(p => crearCard(p)).join('');
}

/**
* Normaliza y calcula los valores de un producto o servicio individual.
*/
export function procesarProducto(p) {
// ✅ Detectar automáticamente si es un servicio
const esServicio = Boolean(p.id_servicio) || p.tipo === 'servicio';

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

// ✅ Normalización de Ruta de Imagen (funciona para img.productosperros e img.servicios)
let imgUrl = String(p.imagen_url || p.foto_url || '').trim();
if (imgUrl) {
imgUrl = imgUrl.replace(/^(\.\.\/)+/, ''); // Quita '../' guardado por PHP
if (!imgUrl.startsWith('http') && !imgUrl.startsWith('/')) {
imgUrl = IMG_PREFIX + imgUrl.replace(/^img\//, '');
}
} else {
imgUrl = IMG_DEFAULT;
}

// Sanitización de Textos para HTML
const nombreSeguro = String(p.nombre || (esServicio ? 'Servicio sin nombre' : 'Producto sin nombre'))
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/"/g, '&quot;')
.replace(/'/g, '&#039;');

const descripcionSegura = String(p.descripcion || '')
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/"/g, '&quot;')
.replace(/'/g, '&#039;');

return {
id: Number(p.id_servicio || p.id_producto || p.id || 0),
nombreSeguro,
descripcionSegura,
precioOriginal,
precioFinal: Math.round(precioFinal),
porcentajeVisual,
img: imgUrl,
id_promo: p.id_promo || '',
// ✅ Los servicios no manejan stock físico (se asigna 999 para no marcarlos agotados)
stock: esServicio ? 999 : (Number(p.stock) || 0),
duracion: p.duracion ? Number(p.duracion) : null,
tipo: esServicio ? 'servicio' : 'producto'
};
}

/**
* Genera la plantilla HTML de la Card del producto o servicio.
*/
export function crearCard(p) {
const esServicio = p.tipo === 'servicio';

const badgeDescuento = p.porcentajeVisual > 0
? `<div class="position-absolute top-0 end-0 m-3" style="z-index: 10;">
<span class="badge bg-danger rounded-pill px-3 py-2 fw-bold shadow-sm">-${p.porcentajeVisual}% OFF</span>
</div>`
: '';

const badgeDuracion = (esServicio && p.duracion)
? `<div class="position-absolute top-0 start-0 m-3" style="z-index: 10;">
<span class="badge bg-info text-dark rounded-pill px-3 py-2 fw-bold shadow-sm"><i class="fa fa-clock me-1"></i>${p.duracion} min</span>
</div>`
: '';

const precioTachado = p.precioOriginal > p.precioFinal
? `<span class="text-decoration-line-through text-muted small">$${p.precioOriginal.toLocaleString('es-CO')}</span>`
: '';

const attrPrecioOriginal = p.precioOriginal > p.precioFinal
? `data-precio-original="${p.precioOriginal}"`
: '';

const agotado = !esServicio && Number(p.stock) <= 0;

return `
<div class="col-12 col-sm-6 col-lg-3 mb-4 fade-in">
<div class="card h-100 border-0 shadow-sm product-card position-relative overflow-hidden"
style="border-radius: 16px; transition: transform 0.2s; cursor: pointer;"
onclick="if(!event.target.closest('button')) { const d = this.querySelector('.desc-oculta'); if(d) d.style.display = (d.style.display === 'none' ? 'block' : 'none'); }">

${badgeDuracion}
${badgeDescuento}
<div class="position-relative" style="height: 250px; background-color: #f8f9fa; display: flex; align-items: center; justify-content: center; overflow: hidden;">
<img src="${p.img}"
alt="${p.nombreSeguro}"
class="img-fluid"
style="${esServicio ? 'width: 100%; height: 100%; object-fit: cover;' : 'max-height: 100%; max-width: 100%; object-fit: contain;'}"
onerror="this.onerror=null; this.src='${IMG_DEFAULT}';">
</div>
<div class="card-body d-flex flex-column p-3 text-center">
<h5 class="card-title fw-bold mb-2 text-dark w-100 text-start" style="font-size: 1rem; line-height: 1.3;">
${p.nombreSeguro}
</h5>

<!-- ✅ Descripción oculta por defecto y completa al hacer clic -->
<p class="text-muted small mb-2 w-100 text-start desc-oculta" style="display: none; font-size: 0.82rem; line-height: 1.4;">
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
: (esServicio
? '<i class="fa fa-calendar-check me-2"></i> Agendar / Agregar'
: '<i class="fa fa-shopping-cart me-2"></i> Agregar')}
</button>
</div>
</div>
</div>
</div>`;
}


