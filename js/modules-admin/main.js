// ================================================================
// MAIN.JS - LÓGICA PRINCIPAL DEL PANEL ADMINISTRATIVO
// ================================================================

const API = '../api/panel-admin_data.php';

// Compatibilidad con mod-mascotas.js
const API_URL = API;

// ================================================================
// FETCH GENÉRICO (usado internamente si se necesita)
// ================================================================
async function fetchJSON(url, options = {}) {
    try {
        const res = await fetch(url, options);
        return await res.json();
    } catch (err) {
        console.error('Error en fetchJSON:', err);
        return { success: false, error: err.message };
    }
}

// ================================================================
// CACHÉ GLOBAL DE SELECTS
// ================================================================
let cacheSelects = {};

// ================================================================
// TOASTS CON LÍMITE (máximo 3 visibles)
// ================================================================
let toastCount = 0;
const MAX_TOASTS = 3;

function showToast(msg, type = 'success') {
    // Eliminar el más viejo si hay demasiados
    const existing = document.querySelectorAll('.admin-toast');
    if (existing.length >= MAX_TOASTS) {
        existing[0].remove();
    }

    const icons = {
        success: 'check-circle',
        danger: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `alert alert-${type} admin-toast position-fixed shadow`;
    toast.style.cssText = 'top:80px;right:20px;z-index:9999;min-width:280px;max-width:400px;animation:slideIn .3s;transition:opacity .3s;';
    toast.innerHTML = `<i class="fa fa-${icons[type] || 'info-circle'} me-2"></i>${msg}`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ================================================================
// CAMBIAR ENTRE MÓDULOS DEL SIDEBAR
// ================================================================
function cambiarModulo(mod) {
    // Ocultar todas las secciones y desactivar nav items
    document.querySelectorAll('.mod-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Activar la sección y el nav item correspondientes
    const section = document.getElementById('mod-' + mod);
    const navItem = document.querySelector(`.nav-item[data-mod="${mod}"]`);

    if (section) section.classList.add('active');
    if (navItem) navItem.classList.add('active');

    // Títulos del topbar
    const titles = {
        dashboard: 'Dashboard',
        usuarios: 'Usuarios y Roles',
        mascotas: 'Mascotas',
        inventario: 'Productos',
        servicios: 'Servicios',
        proveedores: 'Proveedores',
        compras: 'Compras',
        citas: 'Citas',
        carritos: 'Carritos',
        ventas: 'Pedidos',
        marketing: 'Promociones',
        resenas: 'Reseñas'
    };

    const icons = {
        dashboard: 'fa-chart-pie',
        usuarios: 'fa-users',
        mascotas: 'fa-paw',
        inventario: 'fa-boxes-stacked',
        servicios: 'fa-concierge-bell',
        proveedores: 'fa-truck',
        compras: 'fa-file-invoice-dollar',
        citas: 'fa-calendar-check',
        carritos: 'fa-cart-shopping',
        ventas: 'fa-receipt',
        marketing: 'fa-bullhorn',
        resenas: 'fa-star'
    };

    document.getElementById('topbarTitle').innerHTML =
        `<i class="fa ${icons[mod] || 'fa-circle'} me-2 text-primary"></i>${titles[mod] || mod}`;

    // Cerrar sidebar en móvil
    document.getElementById('sidebar').classList.remove('open');

    // Cargar datos del módulo
    cargarDatosModulo(mod);
}

// ================================================================
// ROUTER DE MÓDULOS — dispara la función de carga de cada uno
// ================================================================
function cargarDatosModulo(mod) {
    switch (mod) {
        case 'dashboard':  if (typeof cargarDashboard  === 'function') cargarDashboard();  break;
        case 'usuarios':   if (typeof cargarUsuarios   === 'function') cargarUsuarios();   break;
        case 'mascotas':   if (typeof renderMascotas   === 'function') renderMascotas();   break;
        case 'inventario': if (typeof cargarProductos  === 'function') cargarProductos();  break;
        case 'servicios':  if (typeof cargarServicios  === 'function') cargarServicios();  break;
        case 'proveedores':if (typeof cargarProveedores === 'function') cargarProveedores(); break;
        case 'compras':    if (typeof cargarCompras    === 'function') cargarCompras();    break;
        case 'citas':      if (typeof cargarCitas      === 'function') cargarCitas();      break;
        case 'carritos':   if (typeof cargarCarritos   === 'function') cargarCarritos();   break;
        case 'ventas':     if (typeof cargarPedidos    === 'function') cargarPedidos();    break;
        case 'marketing':  cargarPromociones();  break; // ← Siempre disponible (definida abajo)
        case 'resenas':    if (typeof cargarResenas    === 'function') cargarResenas();    break;
    }
}

// ================================================================
// COMUNICACIÓN CON LA API
// ================================================================
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
                if (data) {
                    for (let key in data) {
                        formData.append(key, data[key]);
                    }
                }
                options.body = formData;
            }
            const res = await fetch(API, options);
            return await res.json();
        }
    } catch (err) {
        console.error('Error en API:', err);
        showToast('Error de conexión con el servidor', 'danger');
        return { success: false, error: err.message };
    }
}

// ================================================================
// UTILIDADES
// ================================================================
function confirmar(msg) {
    return confirm(msg);
}

function cerrarSesion() {
    if (confirmar('¿Cerrar sesión?')) {
        apiFetch('cerrar_sesion').then(() => {
            window.location.href = '../index.html';
        });
    }
}

// ================================================================
// CARGA DE SELECTS GLOBALES
// ================================================================
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

        if (roles.success)       llenarSelect('usrRol', roles.data, 'Seleccionar rol...');
        if (localidades.success) llenarSelect('usrLocalidad', localidades.data, 'Seleccionar localidad...');
        if (tiposDoc.success)    llenarSelect('usrTipoId', tiposDoc.data, 'Seleccionar...');

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
        console.error('Error cargando selects globales:', e);
    }
}

// ================================================================
// LLENAR SELECTS — detección inteligente de campos
// ================================================================
function llenarSelect(id, data, placeholder = 'Seleccionar...') {
    const sel = document.getElementById(id);
    if (!sel || !Array.isArray(data)) return;

    // Guardar valor seleccionado antes de reconstruir
    const valorPrevio = sel.value;

    sel.innerHTML = `<option value="">${placeholder}</option>`;

    data.forEach(item => {
        // Detectar campo ID automáticamente
        const val = item.id
            || item.id_rol
            || item.id_localidad
            || item.id_tipo_id
            || item.id_especie
            || item.id_sexoMascota
            || item.id_servicio
            || item.id_usuario
            || item.id_producto
            || item.id_prom                    // ← CORREGIDO: era id_promo
            || item.id_proveedor
            || item.id_categoria
            || item.id_estado_producto
            || item.id_categoria_servicio
            || item.id_estado_pedido
            || item.id_estado_promocion
            || item.id_estado_cita
            || '';

        // Detectar campo Nombre automáticamente
        const txt = item.nombre
            || item.nombre_rol
            || item.nombre_localidad
            || item.nombre_completo
            || item.nombre_producto
            || item.nombre_servicio
            || item.sexo_mascota
            || item.empresa
            || item.sigla
            || item.descripcion
            || item.numero_documento
            || `Opción ${val}`;

        const option = document.createElement('option');
        option.value = val;
        option.textContent = txt;
        sel.appendChild(option);
    });

    // Restaurar selección previa si sigue existiendo
    if (valorPrevio) {
        sel.value = valorPrevio;
    }
}

// ================================================================
// CARGAR PROMOCIONES (MÓDULO MARKETING)
// Llama a la API, llena la tabla y los selects de vinculación
// ================================================================
async function cargarPromociones() {
    // Inicializar el módulo MarketingMod si existe
    if (typeof MarketingMod !== 'undefined' && typeof MarketingMod.init === 'function') {
        MarketingMod.init();
    }

    // Cargar tabla de promociones
    const res = await apiFetch('listar_promociones', null, 'GET');

    if (res.success && Array.isArray(res.data)) {
        // Renderizar tabla a través de MarketingMod si existe
        if (typeof MarketingMod !== 'undefined' && typeof MarketingMod.renderTabla === 'function') {
            MarketingMod.renderTabla(res.data);
        }

        // Llenar select de promociones para vincular productos
        if (typeof MarketingMod !== 'undefined' && typeof MarketingMod.llenarSelectPromos === 'function') {
            MarketingMod.llenarSelectPromos(res.data);
        }
    } else {
        // Mostrar error en la tabla
        if (typeof MarketingMod !== 'undefined' && typeof MarketingMod.renderTabla === 'function') {
            MarketingMod.renderTabla([]);
        }
        if (res.error) {
            showToast('Error al cargar promociones: ' + res.error, 'danger');
        }
    }

    // Cargar select de productos disponibles para vincular
    const productosRes = await apiFetch('listar_productos', null, 'GET');
    if (productosRes.success && Array.isArray(productosRes.data)) {
        const selProductos = document.getElementById('asigProducto');
        if (selProductos) {
            selProductos.innerHTML = '<option value="" disabled selected>Selecciona un producto</option>';
            productosRes.data.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id_producto;
                opt.textContent = p.nombre_producto || p.nombre;
                selProductos.appendChild(opt);
            });
        }
    }
}

// ================================================================
// INICIALIZACIÓN
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar selects del sistema
    cargarSelectsGlobales();

    // 2. Iniciar en el Dashboard por defecto
    cambiarModulo('dashboard');
});