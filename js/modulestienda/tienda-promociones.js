// ================================================================
// MÓDULO: PROMOCIONES — Página pública de ofertas tienda-promocione.js
// ================================================================
(() => {
document.addEventListener('DOMContentLoaded', () => {
const contenedor = document.getElementById('productGrid');
if (!contenedor) return;

const API_URL = '../api/promociones_data.php';
const IMG_DEFAULT = '../img/producto-default.jpg';

async function cargarPromociones() {
try {
contenedor.innerHTML = `
<div class="col-12 text-center py-5">
<div class="spinner-border text-primary" role="status"></div>
<p class="mt-2 text-muted">Cargando las mejores ofertas...</p>
</div>`;

const res = await fetch(`${API_URL}?accion=listar_activas`);
if (!res.ok) throw new Error(`Error HTTP: ${res.status} ${res.statusText}`);

const json = await res.json();
if (json.error) throw new Error(json.error);

const data = json.data || json.promociones || json.result || [];

if (!Array.isArray(data) || data.length === 0) {
contenedor.innerHTML = `
<div class="col-12 text-center py-5">
<i class="fa fa-tags fa-3x text-muted mb-3"></i>
<h4>No hay promociones activas</h4>
<p class="text-muted">Vuelve pronto para ver nuestras ofertas especiales.</p>
</div>`;
return;
}

procesarYRenderizar(data);

} catch (err) {
console.error('❌ Error crítico cargando promociones:', err);
contenedor.innerHTML = `
<div class="col-12 text-center text-danger py-5">
<i class="fa fa-exclamation-triangle fa-3x mb-3"></i>
<h5>No pudimos cargar las ofertas</h5>
<p class="small">${err.message}</p>
<button onclick="location.reload()" class="btn btn-outline-primary btn-sm mt-2">Reintentar</button>
</div>`;
}
}

function procesarYRenderizar(datos) {
const listaProductosMapeados = datos.map(p => procesarProducto(p));
contenedor.innerHTML = listaProductosMapeados.map(p => crearCard(p)).join('');

// Configuramos los listeners usando delegación de eventos
configurarBotonesCarrito();
}

function procesarProducto(p) {
const valorDescuento = Number(p.valor_descuento || p.valor || 0);
const tipoDescuento = (p.tipo_descuento || 'fijo').toString().toLowerCase();
const precioOriginal = Number(p.precio_venta || p.precio || 0);

let precioFinal = precioOriginal;
let porcentajeVisual = 0;

if (tipoDescuento === 'porcentaje') {
porcentajeVisual = valorDescuento;
precioFinal = precioOriginal * (1 - (valorDescuento / 100));
} else {
precioFinal = Math.max(0, precioOriginal - valorDescuento);
if (precioOriginal > 0) {
porcentajeVisual = Math.round(((valorDescuento / precioOriginal) * 100));
}
}

// 🖼️ LÓGICA DE IMAGEN MEJORADA
let imgUrl = p.imagen_url || p.foto_url || p.imagen || p.url_imagen || '';

if (imgUrl && imgUrl.trim() !== '') {
imgUrl = imgUrl.trim();
if (!imgUrl.startsWith('http://') && !imgUrl.startsWith('https://')) {
imgUrl = imgUrl.replace(/^(\.|\/)+/, '');
imgUrl = '../img/' + imgUrl.replace(/^img\//i, '');
}
} else {
imgUrl = IMG_DEFAULT;
}

const nombreSeguro = String(p.nombre || 'Producto sin nombre').replace(/"/g, '&quot;');

return {
id: Number(p.id_producto || p.id || 0),
nombreSeguro: nombreSeguro,
precioOriginal: precioOriginal,
precioFinal: Math.round(precioFinal),
porcentajeVisual: porcentajeVisual,
img: imgUrl,
stock: p.stock || 0,
tipo: 'producto'
};
}

function crearCard(p, index) {
const badgeDescuento = p.porcentajeVisual > 0
? `<div class="position-absolute top-0 end-0 m-3" style="z-index: 10;">
<span class="badge bg-danger rounded-pill px-3 py-2 fw-bold shadow-sm">-${p.porcentajeVisual}% OFF</span>
</div>`
: '';

const precioTachado = p.precioOriginal > p.precioFinal
? `<span class="text-decoration-line-through text-muted small">$${p.precioOriginal.toLocaleString('es-CO')}</span>`
: '';

// ✨ CAMBIO AQUÍ: Limpiamos los puntos '../' solo para el atributo data-imagen
// Así el carrito recibe la ruta correcta relativa a la raíz 'img/producto.png'
const imgParaCarrito = p.img.replace(/^\.\.\//, '');
const delay = index * 100; // Efecto cascada en la animación

return `
<div class="col-12 col-sm-6 col-lg-3 mb-4 fade-in">
<div class="card h-100 border-0 shadow-sm product-card position-relative overflow-hidden" style="border-radius: 16px; transition: transform 0.2s;">
${badgeDescuento}
<div class="position-relative" style="height: 250px; background-color: #f8f9fa; display: flex; align-items: center; justify-content: center; overflow: hidden;">
<img src="${p.img}"
alt="${p.nombreSeguro}"
class="img-fluid"
style="max-height: 100%; max-width: 100%; object-fit: contain;"
onerror="console.warn('⚠️ Imagen no encontrada, ruta intentada:', this.src); this.onerror=null; this.src='${IMG_DEFAULT}';">
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
data-imagen="${imgParaCarrito}"
data-stock="${p.stock}"
data-tipo="producto">
<i class="fa fa-shopping-cart me-2"></i> Agregar
</button>
</div>
</div>
</div>
</div>`;
}

function configurarBotonesCarrito() {
contenedor.removeEventListener('click', manejarClickCarrito);
contenedor.addEventListener('click', manejarClickCarrito);
}

function manejarClickCarrito(e) {
const btn = e.target.closest('.btn-agregar-carrito');
if (!btn) return;

e.preventDefault();
e.stopPropagation();

if (btn.disabled) return;
btn.disabled = true;

const producto = {
id: Number(btn.getAttribute('data-id')),
nombre: btn.getAttribute('data-nombre'),
precio: Number(btn.getAttribute('data-precio')),
imagen: btn.getAttribute('data-imagen'),
cantidad: 1,
stock: Number(btn.getAttribute('data-stock')),
tipo: btn.getAttribute('data-tipo') || 'producto'
};

if (typeof window.agregarAlCarrito === 'function') {
try {
window.agregarAlCarrito(producto);

if (typeof window.actualizarVistaCarrito === 'function') {
window.actualizarVistaCarrito();
} else if (typeof window.renderCart === 'function') {
window.renderCart();
}

const originalHTML = btn.innerHTML;
btn.innerHTML = '<i class="fa fa-check"></i> Agregado';
btn.classList.remove('btn-primary');
btn.classList.add('btn-success');

setTimeout(() => {
btn.innerHTML = originalHTML;
btn.classList.remove('btn-success');
btn.classList.add('btn-primary');
btn.disabled = false;
}, 1500);

} catch (error) {
console.error("Error al ejecutar agregarAlCarrito:", error);
alert("Error al agregar al carrito.");
btn.disabled = false;
}
} else {
console.error("❌ CRÍTICO: 'agregarAlCarrito' no definida en window. Revisa tu archivo JS principal.");
alert("Error de sistema: Función de carrito no encontrada.");
btn.disabled = false;
}
}
cargarPromociones();
});
})();

