// ================================================================
// CONFIGURACIÓN - AJUSTA ESTA RUTA AL NOMBRE REAL DE TU PHP
// ================================================================
const API_ADMIN = '../api/panel-admin_data.php';

// ================================================================
// FUNCIÓN API FETCH
// ================================================================
async function apiFetch(action, data = null, method = 'POST') {
try {
const url = `${API_ADMIN}?action=${action}`;
const options = { method };

if (method === 'GET') {
const response = await fetch(url);
if (!response.ok) throw new Error(`HTTP ${response.status}`);
return await response.json();
} else {
// POST: siempre usar FormData para compatibilidad
const formData = new FormData();
formData.append('action', action);

if (data instanceof FormData) {
// Si ya es FormData, copiar todos los campos
for (let [key, value] of data.entries()) {
formData.append(key, value);
}
} else if (data && typeof data === 'object') {
// Si es objeto, convertir a FormData
for (let key in data) {
formData.append(key, data[key]);
}
}

options.body = formData;
const response = await fetch(API_ADMIN, options);
if (!response.ok) throw new Error(`HTTP ${response.status}`);
return await response.json();
}
} catch (err) {
console.error(`❌ Error en apiFetch(${action}):`, err);
return { success: false, error: err.message };
}
}

// ================================================================
// UTILIDADES
// ================================================================
function showToast(message, type = 'success') {
const toastEl = document.getElementById('toast');
if (!toastEl) {
console.log(`[${type}] ${message}`);
return;
}
toastEl.className = `toast align-items-center text-white bg-${type === 'success' ? 'primary' : 'danger'} border-0`;
const toast = new bootstrap.Toast(toastEl);
document.getElementById('toastMsg').textContent = message;
toast.show();
}

function confirmar(mensaje) {
return confirm(mensaje);
}

// ================================================================
// MÓDULO DE PRODUCTOS
// ================================================================
let productosData = [];

async function cargarProductos() {
console.log('🔄 Cargando productos desde:', API_ADMIN);

try {
// Cargar todo en paralelo
const [productos, categorias, estados, proveedores] = await Promise.all([
apiFetch('listar_productos', null, 'GET'),
apiFetch('listar_categorias_producto', null, 'GET'),
apiFetch('listar_estados_producto', null, 'GET'),
apiFetch('listar_proveedores', null, 'GET')
]);

console.log('📦 Respuesta productos:', productos);

if (productos.success) {
productosData = productos.data || [];
} else {
throw new Error(productos.error || 'Error al cargar productos');
}

// Llenar selects
if (categorias.success) {
const sel = document.getElementById('prodCategoria');
if (sel) {
sel.innerHTML = '<option value="">Seleccionar...</option>' +
categorias.data.map(c => `<option value="${c.id_categoria}">${c.nombre}</option>`).join('');
}
}

if (estados.success) {
const sel = document.getElementById('prodEstado');
if (sel) {
sel.innerHTML = '<option value="">Seleccionar...</option>' +
estados.data.map(e => `<option value="${e.id_estado_producto}">${e.nombre}</option>`).join('');
}
}

if (proveedores.success) {
const sel = document.getElementById('prodProveedor');
if (sel) {
sel.innerHTML = '<option value="">Seleccionar...</option>' +
proveedores.data.map(p => `<option value="${p.id_proveedor}">${p.nombre_empresa}</option>`).join('');
}
}

renderProductos();
} catch (err) {
console.error('❌ Error cargando productos:', err);
showToast('❌ Error: ' + err.message, 'danger');
}
}

function renderProductos() {
const filtro = (document.getElementById('buscarProducto')?.value || '').toLowerCase();
const filtrados = productosData.filter(p =>
(p.nombre || '').toLowerCase().includes(filtro) ||
(p.categoria || '').toLowerCase().includes(filtro) ||
(p.codigo_barras || '').toLowerCase().includes(filtro)
);

const tbody = document.getElementById('tablaProductos');
if (!tbody) {
console.warn('⚠️ No se encontró #tablaProductos en el DOM');
return;
}

if (!filtrados.length) {
tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">No hay productos</td></tr>';
return;
}

tbody.innerHTML = filtrados.map(p => `
<tr>
<td>${p.id_producto}</td>
<td><img src="${p.imagen_url || '../img/placeholder.png'}" style="width:40px;height:40px;object-fit:cover;border-radius:8px;" onerror="this.src='../img/placeholder.png'"></td>
<td><strong>${p.nombre}</strong><br><small class="text-muted">${p.codigo_barras || '-'}</small></td>
<td><small>${p.categoria || '-'}</small></td>
<td>$${parseFloat(p.costo_compra || 0).toLocaleString('es-CO')}</td>
<td><strong>$${parseFloat(p.precio_venta || 0).toLocaleString('es-CO')}</strong></td>
<td>
<span class="badge bg-${p.stock == 0 ? 'danger' : p.stock <= 5 ? 'warning' : 'success'}">
${p.stock} und
</span>
</td>
<td><span class="badge bg-${p.id_estado_producto == 1 ? 'success' : 'secondary'}">${p.estado || '-'}</span></td>
<td>
<button class="btn btn-sm btn-outline-primary" onclick="editarProducto(${p.id_producto})" title="Editar">
<i class="fa fa-edit"></i>
</button>
<button class="btn btn-sm btn-outline-danger" onclick="eliminarProducto(${p.id_producto})" title="Eliminar">
<i class="fa fa-trash"></i>
</button>
</td>
</tr>
`).join('');
}

// ================================================================
// FUNCIONES GLOBALES
// ================================================================
window.previewProductoImg = function(input) {
if (input.files && input.files[0]) {
const reader = new FileReader();
reader.onload = (e) => {
document.getElementById('productoPreview').src = e.target.result;
document.getElementById('productoImgPreview').style.display = 'block';
document.getElementById('productoImgPlaceholder').style.display = 'none';
};
reader.readAsDataURL(input.files[0]);
}
};

window.quitarProductoImg = function() {
document.getElementById('productoImgPreview').style.display = 'none';
document.getElementById('productoImgPlaceholder').style.display = 'block';
document.getElementById('productoImagen').value = '';
document.getElementById('productoPreview').src = '';
};

window.limpiarFormProducto = function() {
document.getElementById('formProducto').reset();
document.getElementById('prodIdEdit').value = '';
quitarProductoImg();
};

window.guardarProducto = async function() {
const form = document.getElementById('formProducto');
if (!form.checkValidity()) {
form.reportValidity();
return;
}

const formData = new FormData();
const idEdit = document.getElementById('prodIdEdit').value;
if (idEdit) formData.append('id_producto', idEdit);

formData.append('nombre', document.getElementById('prodNombre').value.trim());
formData.append('id_categoria', document.getElementById('prodCategoria').value);
formData.append('id_estado_producto', document.getElementById('prodEstado').value || '1');
formData.append('costo_compra', document.getElementById('prodCosto').value);
formData.append('precio_venta', document.getElementById('prodPrecio').value);
formData.append('stock', document.getElementById('prodStock').value || '0');
formData.append('codigo_barras', document.getElementById('prodCodBarras').value.trim());
formData.append('id_proveedor', document.getElementById('prodProveedor').value);
formData.append('descripcion', document.getElementById('prodDesc').value.trim());

const fotoInput = document.getElementById('productoImagen');
if (fotoInput.files && fotoInput.files[0]) {
formData.append('imagen_producto', fotoInput.files[0]);
}

const res = await apiFetch('guardar_producto', formData);

if (res.success) {
showToast('✅ ' + res.message);
limpiarFormProducto();
cargarProductos();
} else {
showToast('❌ ' + res.error, 'danger');
}
};

window.editarProducto = function(id) {
const p = productosData.find(x => x.id_producto == id);
if (!p) return;

document.getElementById('prodIdEdit').value = p.id_producto;
document.getElementById('prodNombre').value = p.nombre;
document.getElementById('prodCategoria').value = p.id_categoria || '';
document.getElementById('prodEstado').value = p.id_estado_producto || '';
document.getElementById('prodCosto').value = p.costo_compra || '';
document.getElementById('prodPrecio').value = p.precio_venta || '';
document.getElementById('prodStock').value = p.stock || '0';
document.getElementById('prodCodBarras').value = p.codigo_barras || '';
document.getElementById('prodProveedor').value = p.id_proveedor || '';
document.getElementById('prodDesc').value = p.descripcion || '';

if (p.imagen_url) {
document.getElementById('productoPreview').src = p.imagen_url;
document.getElementById('productoImgPreview').style.display = 'block';
document.getElementById('productoImgPlaceholder').style.display = 'none';
}

window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.eliminarProducto = async function(id) {
// Cambiamos el mensaje para que el administrador sepa que no se borrará para siempre
if (!confirmar('¿Estás seguro de "eliminar" este producto?\n\nNota: Se marcará como INACTIVO para conservar el historial de ventas, pero ya no se mostrará en la tienda.')) return;

// Hacemos un envío a guardar_producto, pero forzamos el estado a 2 (Inactivo)
const formData = new FormData();
formData.append('id_producto', id);
formData.append('id_estado_producto', 2); // 2 = Inactivo

// Enviamos los datos mínimos requeridos por tu PHP para no romper la BD
const p = productosData.find(x => x.id_producto == id);
if (p) {
formData.append('nombre', p.nombre);
formData.append('id_categoria', p.id_categoria || 1);
formData.append('costo_compra', p.costo_compra || 0);
formData.append('precio_venta', p.precio_venta || 0);
formData.append('stock', p.stock || 0);
formData.append('id_proveedor', p.id_proveedor || '');
formData.append('descripcion', p.descripcion || '');
formData.append('codigo_barras', p.codigo_barras || '');
}

const res = await apiFetch('guardar_producto', formData);

if (res.success) {
showToast('✅ Producto marcado como inactivo. Ya no será visible en la tienda.');
cargarProductos();
} else {
showToast('❌ ' + res.error, 'danger');
}
};

// ================================================================
// INICIALIZACIÓN AL CARGAR LA PÁGINA
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
console.log('✅ mod-productos.js cargado');
console.log('📡 API_ADMIN:', API_ADMIN);
cargarProductos();
});

