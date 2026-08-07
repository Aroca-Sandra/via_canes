// ================================================================
// MAIN.JS - LÓGICA PRINCIPAL DEL PANEL ADMIN
// ================================================================
const API = '../api/panel-admin_data.php';

//  compatibilidad con mod-mascotas.js
const API_URL = API;

async function fetchJSON(url, options = {}) {
try {
const res = await fetch(url, options);
return await res.json();
} catch (err) {
console.error('Error en fetchJSON:', err);
return { success: false, error: err.message };
}
}

// 🔧 Caché global de selects (usada por mod-mascotas.js y mod-citas)
let cacheSelects = {};

// Cambiar entre módulos
function cambiarModulo(mod) {
document.querySelectorAll('.mod-section').forEach(s => s.classList.remove('active'));
document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

const section = document.getElementById('mod-' + mod);
const navItem = document.querySelector(`.nav-item[data-mod="${mod}"]`);

if (section) section.classList.add('active');
if (navItem) navItem.classList.add('active');

const titles = {
dashboard: 'Dashboard', usuarios: 'Usuarios y Roles', mascotas: 'Mascotas',
inventario: 'Productos', servicios: 'Servicios', proveedores: 'Proveedores',
compras: 'Compras', citas: 'Citas', carritos: 'Carritos', ventas: 'Pedidos',
marketing: 'Promociones', resenas: 'Reseñas'
};

//  Iconos dinámicos para el topbar
const icons = {
dashboard: 'fa-chart-pie', usuarios: 'fa-users', mascotas: 'fa-paw',
inventario: 'fa-boxes-stacked', servicios: 'fa-concierge-bell', proveedores: 'fa-truck',
compras: 'fa-file-invoice-dollar', citas: 'fa-calendar-check', carritos: 'fa-cart-shopping',
ventas: 'fa-receipt', marketing: 'fa-bullhorn', resenas: 'fa-star'
};

document.getElementById('topbarTitle').innerHTML =
`<i class="fa ${icons[mod] || 'fa-circle'} me-2 text-primary"></i>${titles[mod] || mod}`;

document.getElementById('sidebar').classList.remove('open');
cargarDatosModulo(mod);
}

function cargarDatosModulo(mod) {
switch(mod) {
case 'dashboard': if(typeof cargarDashboard === 'function') cargarDashboard(); break;
case 'usuarios': if(typeof cargarUsuarios === 'function') cargarUsuarios(); break;
case 'mascotas': if(typeof renderMascotas === 'function') renderMascotas(); break;
case 'inventario': if(typeof cargarProductos === 'function') cargarProductos(); break;
case 'servicios': if(typeof cargarServicios === 'function') cargarServicios(); break;
case 'proveedores': if(typeof cargarProveedores === 'function') cargarProveedores(); break;
case 'compras': if(typeof cargarCompras === 'function') cargarCompras(); break;
case 'citas': if(typeof cargarCitas === 'function') cargarCitas(); break;
case 'carritos': if(typeof cargarCarritos === 'function') cargarCarritos(); break;
case 'ventas': if(typeof cargarPedidos === 'function') cargarPedidos(); break;
case 'marketing': if(typeof cargarPromociones === 'function') cargarPromociones(); break;
case 'resenas': if(typeof cargarResenas === 'function') cargarResenas(); break;
}
}

async function apiFetch(action, data = null, method = 'POST') {
try {
const options = { method, headers: {} };
if (method === 'GET') {
const params = new URLSearchParams({ action, ...(data || {}) }).toString();
const res = await fetch(`${API}?${params}`);
return await res.json();
} else {
if (data instanceof FormData) {
data.append('action', action);
options.body = data;
} else {
const formData = new FormData();
formData.append('action', action);
if (data) for (let key in data) formData.append(key, data[key]);
options.body = formData;
}
const res = await fetch(API, options);
return await res.json();
}
} catch (err) {
console.error('Error en API:', err);
showToast('Error de conexión', 'danger');
return { success: false, error: err.message };
}
}

function showToast(msg, type = 'success') {
const toast = document.createElement('div');
toast.className = `alert alert-${type} position-fixed shadow`;
toast.style.cssText = 'top:80px;right:20px;z-index:9999;min-width:280px;animation:slideIn .3s;';
toast.innerHTML = `<i class="fa fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'} me-2"></i>${msg}`;
document.body.appendChild(toast);
setTimeout(() => {
toast.style.opacity = '0';
setTimeout(() => toast.remove(), 300);
}, 3000);
}

function confirmar(msg) { return confirm(msg); }

function cerrarSesion() {
if (confirmar('¿Cerrar sesión?')) {
apiFetch('cerrar_sesion').then(() => window.location.href = '../index.html');
}
}

//  Carga de clientes y demás selects
async function cargarSelectsGlobales() {
try {
const [roles, localidades, tiposDoc, especies, sexos, clientes] = await Promise.all([
apiFetch('listar_roles', null, 'GET'),
apiFetch('listar_localidades', null, 'GET'),
apiFetch('listar_tipos_documento', null, 'GET'),
apiFetch('listar_especies', null, 'GET'),
apiFetch('listar_sexos_mascota', null, 'GET'),
apiFetch('listar_clientes', null, 'GET')
]);

if (roles.success) llenarSelect('usrRol', roles.data, 'Seleccionar rol...');
if (localidades.success) llenarSelect('usrLocalidad', localidades.data, 'Seleccionar localidad...');
if (tiposDoc.success) llenarSelect('usrTipoId', tiposDoc.data, 'Seleccionar...');

if (especies.success) {
llenarSelect('masEspecie', especies.data, 'Seleccionar...');
llenarSelect('miniMasEspecie', especies.data, 'Seleccionar...');
cacheSelects.especies = especies.data;
}
if (sexos.success) {
llenarSelect('masSexo', sexos.data, 'Seleccionar...');
llenarSelect('miniMasSexo', sexos.data, 'Seleccionar...');
cacheSelects.sexos = sexos.data;
}
if (clientes.success) {
llenarSelect('masDueno', clientes.data, 'Seleccionar dueño...');
cacheSelects.clientes = clientes.data;
}
} catch (e) {
console.error('Error cargando selects:', e);
}
}

//  Llenar selects de manera inteligente
function llenarSelect(id, data, placeholder = 'Seleccionar...') {
const sel = document.getElementById(id);
if (!sel) return;
sel.innerHTML = `<option value="">${placeholder}</option>`;

data.forEach(item => {
// Lógica inteligente para encontrar el Value (ID)
const val = item.id || item.id_rol || item.id_localidad || item.id_tipo_id ||
item.id_especie || item.id_sexoMascota || item.id_servicio ||
item.id_usuario || item.id_producto || item.id_promo ||
item.id_proveedor || item.id_categoria || item.id_estado_producto ||
item.id_categoria_servicio || item.id_estado_pedido ||
item.id_estado_promocion || item.id_estado_cita || '';

// Lógica inteligente para encontrar el Texto (Nombre)
const txt = item.nombre || item.nombre_rol || item.nombre_localidad ||
item.nombre_completo || item.nombre_producto || item.nombre_servicio ||
item.sexo_mascota || item.empresa || item.sigla || item.descripcion ||
item.numero_documento || `Opción ${val}`; // Fallback

const option = document.createElement('option');
option.value = val;
option.textContent = txt;
sel.appendChild(option);
});
}

// ================================================================
//  INICIALIZACIÓN AL CARGAR LA PÁGINA
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
// 1. Cargar los selects del sistema
cargarSelectsGlobales();

// 2. Iniciar en el Dashboard por defecto
cambiarModulo('dashboard');
});

