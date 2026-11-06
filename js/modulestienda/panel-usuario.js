const API_URL = '../api/panel-usuario_data.php';
let usuarioActual = null;
let cacheServicios = [];

// ================================================================
// INICIALIZACIÓN
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
cargarDatosUsuario();
cargarListasBase();
configurarEventListeners();
});

// ================================================================
// CARGA DE LISTAS BASE
// ================================================================
async function cargarListasBase() {
try {
await Promise.all([
cargarLocalidades(),
cargarTiposId(),
cargarServicios()
]);
} catch (err) {
console.error('❌ Error cargando listas base:', err);
}
}

/*
* Obtiene las localidades activas y renderiza el `<select>` correspondiente.
* Conserva la selección previa del usuario si ocurre una recarga de interfaz.
* @async
* @returns {Promise<void>}
*/
async function cargarLocalidades() {
try {
const json = await fetchJSON(`${API_URL}?action=localidades`);
const select = document.getElementById('id_localidad'); // Usado en perfil y registro
if (!select) return;

// Guardar selección actual si existe (para no perderla al recargar)
const valActual = select.value;
select.innerHTML = '<option value="" disabled selected>Selecciona tu localidad...</option>';

if (json.success && json.data) {
json.data.forEach(l => {
const opt = document.createElement('option');
opt.value = l.id_localidad;
opt.textContent = l.nombre_localidad;
select.appendChild(opt);
});
if(valActual) select.value = valActual;
}
} catch (err) {
console.error('❌ Error cargando localidades:', err);
}
}

/* Consume el catálogo de tipos de documento de identidad del Backend.
* @async
* @returns {Promise<void>}
*/
async function cargarTiposId() {
try {
const json = await fetchJSON(`${API_URL}?action=tipos_id`);
const select = document.getElementById('id_tipo_id');
if (!select) return;

const valActual = select.value;
select.innerHTML = '<option value="" disabled selected>Selecciona tipo...</option>';

if (json.success && json.data) {
json.data.forEach(t => {
const opt = document.createElement('option');
opt.value = t.id_tipo_id;
opt.textContent = `${t.sigla} - ${t.nombre}`;
select.appendChild(opt);
});
if(valActual) select.value = valActual;
}
} catch (err) {
console.error('❌ Error cargando tipos de ID:', err);
}
}
/*
* Carga los servicios veterinarios / estéticos activos y los mapea en el selector de citas.
* Utiliza un `DocumentFragment` para mitigar el impacto de reflujo (reflow) en el rendimiento del DOM.
* @async
* @returns {Promise<void>}
*/
async function cargarServicios() {
const select = document.getElementById('citaSelectServicio');
if (!select) return;

try {
const json = await fetchJSON(`${API_URL}?action=servicios_activos`);

select.length = 0;
select.add(new Option('Selecciona el servicio...', '', true, true));
select.firstElementChild.disabled = true;

if (json?.success && Array.isArray(json.data)) {
cacheServicios = json.data;
const fragment = document.createDocumentFragment();

json.data.forEach(s => {
const opt = new Option(s.nombre, s.id_servicio);
opt.dataset.precioBase = s.precio || 0;
fragment.appendChild(opt);
});

select.appendChild(fragment);
}
} catch (err) {
console.error('❌ Error cargando servicios:', err);
}
}

// ============================================================================
// CONFIGURACIÓN DE MANEJADORES DE EVENTOS (EVENT LISTENERS)
// ============================================================================

/*
* Registra de forma centralizada todos los escuchadores de eventos del espacio de usuario.
* Controla comportamientos reactivos de formularios, selectores dinámicos y subidas de imágenes.
* @returns {void}
*/
function configurarEventListeners() {
// ------------------------------------------------------------
// 1. Envío de Formularios y Modales
// ------------------------------------------------------------
const formMascota = document.getElementById('formNuevaMascota');
if (formMascota) formMascota.addEventListener('submit', guardarMascota);

const formCita = document.getElementById('formPanelCita');
if (formCita) {
formCita.addEventListener('submit', guardarCita);
const modalCita = document.getElementById('modalNuevaCita');
if (modalCita) modalCita.addEventListener('show.bs.modal', cargarMascotasEnSelectCita);
}

const formPerfil = document.getElementById('form-editar-perfil');
if (formPerfil) formPerfil.addEventListener('submit', guardarPerfil);

// ------------------------------------------------------------
// 2. Control Dinámico de Especies (Manejo de "Otra Especie")
// ------------------------------------------------------------
document.querySelectorAll('input[name="id_especie"]').forEach(radio => {
radio.addEventListener('change', (e) => {
const idEspecie = e.target.value;
const contenedor = document.getElementById('contenedorEspecieDetalle');
if (contenedor) contenedor.classList.toggle('d-none', idEspecie != '3');
cargarRazasDinamicas(idEspecie);
});
});

// ------------------------------------------------------------
// 3. Control Dinámico de Razas (Manejo de "Otra Raza")
// ------------------------------------------------------------
const selectRaza = document.getElementById('razaMascota');
if (selectRaza) {
selectRaza.addEventListener('change', (e) => {
const contenedor = document.getElementById('contenedorRazaDetalle');
const val = parseInt(e.target.value);
// IDs 26, 27, 28 son "Otra raza" según tu BD
if (contenedor) contenedor.classList.toggle('d-none', !(val === 26 || val === 27 || val === 28));
});
}

// ------------------------------------------------------------
// 4. Limpieza de Formularios (Reset de Modal Mascota al cerrar)
// ------------------------------------------------------------
const modalMascota = document.getElementById('modalRegistroMascota');
if (modalMascota) {
modalMascota.addEventListener('hidden.bs.modal', function () {
const form = document.getElementById('formNuevaMascota');
if(form) form.reset();

document.getElementById('mascotaIdEdit').value = '';
document.getElementById('modalTitulo').textContent = '🐾 Nueva Mascota';
document.getElementById('btnGuardarMascota').textContent = 'Guardar Mascota';

document.getElementById('imgPreview').style.display = 'none';
document.getElementById('iconCamera').style.display = 'block';
document.getElementById('mascotaFotoBase64').value = '';

document.getElementById('contenedorEspecieDetalle').classList.add('d-none');
document.getElementById('contenedorRazaDetalle').classList.add('d-none');
});
}

// ------------------------------------------------------------
// 5. Gestión del Avatar / Foto de Perfil (Subida y Eliminación)
// ------------------------------------------------------------
const changePhotoBtn = document.getElementById('changePhotoBtn');
if (changePhotoBtn) changePhotoBtn.addEventListener('click', () => document.getElementById('photoInput').click());

const removePhotoBtn = document.getElementById('removePhotoBtn');
if (removePhotoBtn) {
removePhotoBtn.addEventListener('click', () => {
const avatarImg = document.getElementById('avatarImg');
if (avatarImg && usuarioActual) {
// Consumir API de UI-Avatars como fallback dinámico con iniciales del cliente
const nombreCompleto = encodeURIComponent((usuarioActual.nombres || '') + ' ' + (usuarioActual.apellidos || ''));
avatarImg.src = `https://ui-avatars.com/api/?name=${nombreCompleto}&background=0D8FBF&color=fff`;
}
document.getElementById('photoInput').value = '';
// Marcar flag para eliminar en BD
const flag = document.getElementById('usrEliminarFotoFlag');
if(flag) flag.value = '1';
});
}

const photoInput = document.getElementById('photoInput');
if (photoInput) {
photoInput.addEventListener('change', (e) => {
// Si selecciona nueva foto, desmarcar eliminación
const flag = document.getElementById('usrEliminarFotoFlag');
if(flag) flag.value = '0';

if (e.target.files && e.target.files[0]) {
const file = e.target.files[0];
if (file.size > 2 * 1024 * 1024) {
alert('⚠️ La imagen no puede superar los 2MB');
e.target.value = '';
return;
}
const reader = new FileReader();
reader.onload = (event) => {
document.getElementById('avatarImg').src = event.target.result;
};
reader.readAsDataURL(file);
}
});
}

// ------------------------------------------------------------
// 6. Preferencias de la Interfaz de Usuario (UI)
// ------------------------------------------------------------
['pref-perro', 'pref-gato', 'pref-otros'].forEach(id => {
const btn = document.getElementById(id);
if (btn) btn.addEventListener('click', () => togglePreferencia(btn));
});

// ------------------------------------------------------------
// 7. Despliegue y Control del Dropdown de Usuario
// ------------------------------------------------------------
const userToggle = document.getElementById('userToggle');
const profileDropdown = document.getElementById('profileDropdown');
if (userToggle && profileDropdown) {
userToggle.addEventListener('click', (e) => {
e.stopPropagation();// Evita que el evento 'click' global cierre el menú inmediatamente
profileDropdown.style.display = profileDropdown.style.display === 'block' ? 'none' : 'block';
});
// Escuchador global para colapsar el menú al hacer clic en cualquier área externa
document.addEventListener('click', () => {
if (profileDropdown) profileDropdown.style.display = 'none';
});
}
}
/**
* Conmuta dinámicamente los estilos CSS de Bootstrap para los botones de preferencias animales.
* @param {HTMLButtonElement} btn - El elemento de tipo botón presionado por el usuario.
* @returns {void}
*/
function togglePreferencia(btn) {
btn.classList.toggle('active');
if (btn.classList.contains('active')) {
btn.classList.remove('btn-outline-secondary');
btn.classList.add('btn-primary', 'text-white');
} else {
btn.classList.remove('btn-primary', 'text-white');
btn.classList.add('btn-outline-secondary');
}
}

// ============================================================================
// SISTEMA DE NAVEGACIÓN ENTRE VISTAS (SPA SINGLE-PAGE APPLICATION)
// ============================================================================
/** @global Exposición a nivel de ventana para disparar la vista del Tablero Principal */
window.mostrarPanel = () => { cambiarVista('view-dashboard'); cargarDashboard(); };
/** @global Exposición a nivel de ventana para disparar la vista del Catálogo de Mascotas */
window.mostrarMascotas = () => { cambiarVista('view-mascotas'); cargarMascotas(); };
/** @global Exposición a nivel de ventana para disparar la vista del Historial de Citas */
window.mostrarCitas = () => { cambiarVista('view-citas'); cargarCitas(); };
/** @global Exposición a nivel de ventana para disparar la vista del Historial de Pedidos */
window.mostrarPedidos = () => { cambiarVista('view-pedidos'); cargarPedidos(); };
/** @global Exposición a nivel de ventana para disparar la vista de Edición del Perfil */
window.mostrarEditarPerfil = () => { cambiarVista('view-edit-profile'); cargarPerfil(); };

/**
* Oculta de forma masiva los contenedores de vistas y expone reactivamente la sección requerida.
* Reinicia la barra de desplazamiento horizontal y vertical superior de forma fluida.
* @param {string} idVista - El ID del elemento del DOM (`<div id="view-...">`) que se desea renderizar.
* @returns {void}
*/
function cambiarVista(idVista) {
document.querySelectorAll('main > div[id^="view-"]').forEach(v => v.classList.add('d-none'));
const vista = document.getElementById(idVista);
if (vista) vista.classList.remove('d-none');
const dropdown = document.getElementById('profileDropdown');
if (dropdown) dropdown.style.display = 'none';
window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// UTILERÍAS / HELPER DE COMUNICACIÓN ASÍNCRONA (FETCH API)
// ============================================================================

/**
* Cliente de red optimizado para el consumo y parsing robusto de payloads JSON.
* Valida la integridad del flujo devuelto y mapea de forma precisa excepciones de red (Timeout, HTTP Status erróneos).
* @async
* @param {string} url - Ruta física u origen del Endpoint a consumir.
* @param {Object} [options={}] - Objeto de configuración nativo para la API de Fetch (Cabeceras, método, cuerpo).
* @throws {Error} Excepción con descripción detallada en caso de que la respuesta no sea JSON, falle la red o retorne HTTP Status error.
* @returns {Promise<Object>} Promesa que resuelve con el objeto JSON decodificado del servidor.
*/
async function fetchJSON(url, options = {}) {
try {
const response = await fetch(url, options);
const text = await response.text();
let json;
try { json = JSON.parse(text); }
catch (parseErr) {
console.error('📥 Respuesta NO-JSON:', text.substring(0, 200));
throw new Error('El servidor devolvió una respuesta inválida.');
}
if (!response.ok) throw new Error(json.error || json.message || `Error HTTP ${response.status}`);
return json;
} catch (err) {
if (err.name === 'TypeError' && err.message.includes('fetch')) {
throw new Error('No se pudo conectar con el servidor.');
}
throw err;
}
}

// ============================================================================
// GESTIÓN DE DATOS DE USUARIO
// ============================================================================

/**
* Consulta del lado del servidor los parámetros del cliente en sesión activa.
* @async
* @returns {Promise<void>}
*/
async function cargarDatosUsuario() {
try {
const json = await fetchJSON(`${API_URL}?action=datos_usuario`);
if (json.success && json.data) {
usuarioActual = json.data;
renderizarUsuarioEnUI(json.data);
cargarDashboard();
}
} catch (err) { console.error('❌ Error cargando usuario:', err); }
}


/**
* Mapea e inyecta la información del perfil del usuario en múltiples contenedores del DOM.
* Utiliza fallback dinámico mediante UI-Avatars en caso de no existir un archivo de imagen guardado.
* @param {Object} u - Objeto de datos con los atributos del usuario.
* @param {string} u.nombres - Nombre del cliente.
* @param {string} u.apellidos - Apellidos del cliente.
* @param {string|null} u.foto_usuario - Ruta de la imagen de perfil guardada.
* @param {string} u.email - Dirección de correo electrónico.
* @param {string|null} u.celular - Número telefónico de contacto.
* @param {string|null} u.direccion - Dirección residencial asignada.
* @param {string|number} u.id_tipo_id - ID indexado del tipo de identificación.
* @param {string|null} u.tipo_id_sigla - Sigla precalculada del tipo de identificación (Ej: 'CC').
* @param {string|number} u.numero_documento - Número del documento de identidad.
* @returns {void}
*/
function renderizarUsuarioEnUI(u) {
if (!u) return;
const nombreCompleto = `${u.nombres} ${u.apellidos}`;
const avatarUrl = u.foto_usuario ||
`https://ui-avatars.com/api/?name=${encodeURIComponent(u.nombres)}+${encodeURIComponent(u.apellidos)}&background=0D8FBF&color=fff`;

// Helpers locales inline para mitigar código repetitivo y optimizar lecturas del DOM
const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
const setSrc = (id, val) => { const el = document.getElementById(id); if (el) el.src = val; };

set('headerUserName', u.nombres);
setSrc('headerAvatar', avatarUrl);
set('dropdownUserName', nombreCompleto);
set('dropdownEmail', u.email);
setSrc('dropdownAvatar', avatarUrl);
set('welcomeUserName', u.nombres);
setSrc('sidebarAvatar', avatarUrl);
set('sidebarUserName', nombreCompleto);
set('sidebarEmail', u.email || '-');
set('sidebarPhone', u.celular || '-');
set('sidebarAddress', u.direccion || '-');

const sidebarDocument = document.getElementById('sidebarDocument');
if (sidebarDocument) {
const tipoDoc = u.tipo_id_sigla || (u.id_tipo_id == 1 ? 'CC' : (u.id_tipo_id == 2 ? 'TI' : 'Doc'));
sidebarDocument.textContent = `${tipoDoc} ${u.numero_documento}`;
}
}

// ============================================================================
// GESTIÓN DEL DASHBOARD (TABLERO PRINCIPAL)
// ============================================================================

/**
* Consulta y renderiza las métricas rápidas del usuario: Mascota principal registrada
* y el estado con la fecha de la próxima cita agendada.
* @async
* @returns {Promise<void>}
*/
async function cargarDashboard() {
try {
const jsonDash = await fetchJSON(`${API_URL}?action=dashboard`);
if (jsonDash.success) {
// Intentar precargar la mascota principal (primer elemento del índice del cliente)
const jsonM = await fetchJSON(`${API_URL}?action=mascotas`);
if (jsonM.success && jsonM.data.length > 0) {
const m = jsonM.data[0];
const el1 = document.getElementById('dashNombreMascota');
const el2 = document.getElementById('dashDetalleMascota');
if (el1) el1.textContent = m.nombre_mascota;
if (el2) el2.textContent = `${m.especie || 'Mascota'} • ${m.edad_mascota || '?'} • ${m.raza || ''}`;
}

const contCitas = document.getElementById('dash-contenedor-citas');
if (contCitas) {
contCitas.innerHTML = '';
if (jsonDash.proximaCita) {
const c = jsonDash.proximaCita;
// Formatear fecha nativa según la localización regional de Colombia ('es-CO')
const fecha = new Date(c.fecha_cita).toLocaleDateString('es-CO', {day:'2-digit', month:'2-digit'});
const badgeClass = c.id_estado_cita == 1 ? 'bg-warning text-dark' : 'bg-success text-white';
contCitas.innerHTML = `
<div class="p-2 rounded-3 mb-2 bg-light border">
<span class="small fw-bold d-block text-secondary">${fecha} - ${c.servicio}</span>
<span class="badge ${badgeClass} text-white rounded-pill px-2 py-1 mt-1" style="font-size:0.7rem;">${c.estado}</span>
</div>`;
} else {
contCitas.innerHTML = '<p class="small text-muted text-center mb-0">Sin citas próximas</p>';
}
}
}
} catch (err) { console.error('❌ Error dashboard:', err); }
}

// ================================================================
//  GESTIÓN DEL MÓDULO DE MASCOTAS
// ================================================================
/**Inicializa y limpia el contenedor de visualización de tarjetas de mascotas.
• @async
• @returns {Promise}
*/
async function cargarMascotas() {
const contenedor = document.getElementById('contenedor-mascotas');
if (!contenedor) return;

try {
const json = await fetchJSON(`${API_URL}?action=mascotas`);
if (!json.success) throw new Error(json.error || 'Error al cargar mascotas');

contenedor.innerHTML = '';

// ------------------------------------------------------------
// Construcción Dinámica: Tarjeta de Anclaje para Añadir Mascota
// ------------------------------------------------------------
const addCard = document.createElement('div');
addCard.className = 'col-md-6 col-lg-4 tarjeta-agregar';
addCard.innerHTML = `
<div class="card border-0 h-100 shadow-sm rounded-4 overflow-hidden d-flex align-items-center justify-content-center text-center"
style="min-height: 320px; cursor: pointer; border: 2px dashed #0D8FBF !important; background: #f8f9fa;"
onclick="abrirModalNuevaMascota()">
<div class="card-body d-flex flex-column align-items-center justify-content-center">
<div class="rounded-circle d-flex align-items-center justify-content-center mb-3"
style="width: 70px; height: 70px; background: rgba(13, 143, 191, 0.1); color: #0D8FBF;">
<i class="fa fa-plus fa-2x"></i>
</div>
<h5 class="fw-bold text-dark">Añadir nueva mascota</h5>
<p class="text-muted small mb-0">Registra un nuevo compañero</p>
</div>
</div>
`;
contenedor.appendChild(addCard);

// Renderizado del mensaje de estado vacío si la colección de datos no tiene registros
if (!json.data || json.data.length === 0) {
const emptyMsg = document.createElement('div');
emptyMsg.className = 'col-12 text-center text-muted mt-4';
emptyMsg.innerHTML = `<p class="mb-0"><i class="fa fa-paw me-1"></i> Aún no tienes mascotas registradas.</p>`;
contenedor.appendChild(emptyMsg);
return;
}
// ------------------------------------------------------------
// Renderizado e Inyección Dinámica del Catálogo de Mascotas
// ------------------------------------------------------------
json.data.forEach(m => {
const col = document.createElement('div');
col.className = 'col-md-6 col-lg-4 tarjeta-mascota';
// Consumo estático de iniciales con UI-Avatars como fallback visual de la fotografía
const avatarUrl = m.foto_mascota ||
`https://ui-avatars.com/api/?name=${encodeURIComponent(m.nombre_mascota)}&background=ffd000&color=000&size=200`;

col.innerHTML = `
<div class="card border-0 h-100 shadow-sm rounded-4 overflow-hidden">
<img src="${avatarUrl}" class="card-img-top" style="height:200px;object-fit:cover;"
onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(m.nombre_mascota)}&background=ffd000&color=000&size=200'">
<div class="card-body text-center">
<h5 class="fw-bold text-dark">${m.nombre_mascota}</h5>
<p class="text-muted small mb-2">${m.especie || ''} • ${m.raza || ''}</p>
<div class="d-flex justify-content-around small text-muted mb-3">
<div><i class="fa fa-venus-mars me-1"></i>${m.sexo_mascota || 'N/A'}</div>
<div><i class="fa fa-weight-scale me-1"></i>${m.peso_mascota || '?'} kg</div>
<div><i class="fa fa-cake-candles me-1"></i>${m.edad_mascota || '?'}</div>
</div>
<div class="d-flex gap-2">
<button class="btn btn-outline-dark btn-sm rounded-pill flex-fill fw-bold" onclick="editarMascota(${m.id_mascota})">
<i class="fa fa-edit"></i> Editar
</button>
<button class="btn btn-outline-danger btn-sm rounded-pill" onclick="eliminarMascota(${m.id_mascota}, '${(m.nombre_mascota||'').replace(/'/g, "\\'")}')">
<i class="fa fa-trash"></i>
</button>
</div>
</div>
</div>`;
contenedor.appendChild(col);
});
} catch (err) {
console.error('❌ Error:', err);
contenedor.innerHTML = `<div class="col-12 text-center py-5"><p class="text-danger">Error: ${err.message}</p></div>`;
}
}
/**
* Prepara el DOM, resetea el formulario nativo e inicializa la ventana modal
* de Bootstrap para el registro de una nueva mascota.
* @global
* @async
* @returns {Promise<void>}
*/
window.abrirModalNuevaMascota = async function() {
const form = document.getElementById('formNuevaMascota');
if (form) form.reset();

document.getElementById('mascotaIdEdit').value = '';
document.getElementById('modalTitulo').textContent = '🐾 Registrar Mascota';
document.getElementById('btnGuardarMascota').textContent = 'Guardar Mascota';

document.getElementById('imgPreview').style.display = 'none';
document.getElementById('iconCamera').style.display = 'block';

// Seleccionar la especie 'Perro' de forma predeterminada y disparar sus razas correspondientes
const primerRadio = document.querySelector('input[name="id_especie"]');
if (primerRadio) {
primerRadio.checked = true;
await cargarRazasDinamicas(primerRadio.value);
}

new bootstrap.Modal(document.getElementById('modalRegistroMascota')).show();
}

/**
* Consulta y renderiza de forma reactiva las razas asociadas a una especie animal seleccionada.
* @async
* @param {string|number} idEspecie - ID numérico indexado de la especie (Ej: 1 para Caninos).
* @returns {Promise<void>}
*/
async function cargarRazasDinamicas(idEspecie) {
if (!idEspecie) return;
try {
const json = await fetchJSON(`${API_URL}?action=razas&id_especie=${idEspecie}`);
const select = document.getElementById('razaMascota');
if (!select) return;

select.innerHTML = '<option value="" selected disabled>Selecciona una raza...</option>';

if (json.success && json.data) {
json.data.forEach(r => {
select.innerHTML += `<option value="${r.id_raza}">${r.nombre}</option>`;
});
}
} catch (err) {
console.error('❌ Error razas:', err);
}
}

/**
* Procesa, valida y compila los parámetros del formulario en una instancia multidimensional
* de tipo FormData para su transmisión asíncrona hacia el Backend (soporta archivos binarios de imágenes).
* @async
* @param {SubmitEvent} e - Evento de envío del formulario interceptado.
* @returns {Promise<void>}
*/
async function guardarMascota(e) {
e.preventDefault();
const form = e.target;

const idMascota = document.getElementById('mascotaIdEdit').value;
const esEdicion = idMascota !== '' && idMascota !== null;

const formData = new FormData();
formData.append('action', 'guardar_mascota');
formData.append('nombre_mascota', document.getElementById('nombreMascota').value.trim());

const radioEspecie = document.querySelector('input[name="id_especie"]:checked');
if (!radioEspecie) { alert('⚠️ Selecciona una especie'); return; }
formData.append('id_especie', radioEspecie.value);

const razaVal = document.getElementById('razaMascota').value;
if (!razaVal) { alert('⚠️ Selecciona una raza'); return; }
formData.append('id_raza', razaVal);

formData.append('id_sexoMascota', document.getElementById('mascotaSelectSexo').value);
formData.append('peso_mascota', document.getElementById('mascotaInputPeso').value);
formData.append('edad_mascota', document.getElementById('mascotaInputEdad').value.trim());
formData.append('color_mascota', document.getElementById('mascotaInputColor').value.trim());
formData.append('observaciones_mascota', document.getElementById('mascotaInputObservaciones').value.trim());

// Captura opcional de especificaciones de texto para campos personalizados de "Otros"
const espDet = document.getElementById('especie_detalle');
const razDet = document.getElementById('raza_detalle');
if (espDet && espDet.value.trim()) formData.append('especie_detalle', espDet.value.trim());
if (razDet && razDet.value.trim()) formData.append('raza_detalle', razDet.value.trim());

if (esEdicion) formData.append('id_mascota', idMascota);

// Inserción del archivo binario BLOB de la fotografía si se adjuntó en el control de archivos
const fotoInput = document.getElementById('inputFoto');
if (fotoInput && fotoInput.files && fotoInput.files[0]) {
formData.append('foto_mascota', fotoInput.files[0]);
}

try {
const json = await fetchJSON(API_URL, { method: 'POST', body: formData });
if (json.success) {
alert(esEdicion ? '✅ Mascota actualizada' : '✅ Mascota registrada');
bootstrap.Modal.getInstance(document.getElementById('modalRegistroMascota')).hide();
form.reset();
// Reajustar estados visuales de la vista previa de imagen en el componente
document.getElementById('imgPreview').style.display = 'none';
document.getElementById('iconCamera').style.display = 'block';
cargarMascotas();
cargarDashboard();
} else {
alert('❌ Error: ' + (json.error || 'Desconocido'));
}
} catch (err) {
alert('❌ Error: ' + err.message);
}
}

/**
* Consulta la colección completa de mascotas en memoria asíncrona, filtra el ID especificado
* e inyecta de forma reactiva sus atributos en los campos correspondientes de la ventana modal para su edición.
* @global
* @async
* @param {string|number} id - ID indexado de la mascota que se desea modificar.
* @returns {Promise<void>}
*/
window.editarMascota = async function(id) {
try {
const json = await fetchJSON(`${API_URL}?action=mascotas`);
if (json.success) {
const m = json.data.find(x => x.id_mascota == id);
if (m) {
// 1. Configuración de estados y textos base de la ventana modal
document.getElementById('mascotaIdEdit').value = m.id_mascota;
document.getElementById('modalTitulo').textContent = '✏️ Editar Mascota';
document.getElementById('btnGuardarMascota').textContent = 'Actualizar Mascota';

document.getElementById('nombreMascota').value = m.nombre_mascota || '';

// 2. Conmutación dinámica del selector de Especie y carga del catálogo de razas asociado
const radio = document.querySelector(`input[name="id_especie"][value="${m.id_especie}"]`);
if (radio) {
radio.checked = true;
await cargarRazasDinamicas(m.id_especie); // Cargar razas de esa especie
}
// 3. Mapeo de campos de texto y controles select nativos
document.getElementById('razaMascota').value = m.id_raza || '';
document.getElementById('mascotaSelectSexo').value = m.id_sexoMascota || '';
document.getElementById('mascotaInputPeso').value = m.peso_mascota || '';
document.getElementById('mascotaInputEdad').value = m.edad_mascota || '';
document.getElementById('mascotaInputColor').value = m.color_mascota || '';
document.getElementById('mascotaInputObservaciones').value = m.observaciones_mascota || '';

// 4. Lógica reactiva para campos personalizados ("Otra Especie")
const contEsp = document.getElementById('contenedorEspecieDetalle');
const inputEsp = document.getElementById('especie_detalle');
if (parseInt(m.id_especie) === 3) {
if(contEsp) contEsp.classList.remove('d-none');
if(inputEsp) { inputEsp.value = m.especie_detalle || ''; inputEsp.required = true; }
} else {
if(contEsp) contEsp.classList.add('d-none');
if(inputEsp) { inputEsp.value = ''; inputEsp.required = false; }
}

// 5. Lógica reactiva para campos personalizados ("Otra Raza")
const contRaza = document.getElementById('contenedorRazaDetalle');
const inputRaza = document.getElementById('raza_detalle');
const razaId = parseInt(m.id_raza);
if (razaId === 26 || razaId === 27 || razaId === 28) { // Mapeos de "Otra Raza" en la BD
if(contRaza) contRaza.classList.remove('d-none');
if(inputRaza) { inputRaza.value = m.raza_detalle || ''; inputRaza.required = true; }
} else {
if(contRaza) contRaza.classList.add('d-none');
if(inputRaza) { inputRaza.value = ''; inputRaza.required = false; }
}

// 6. Tratamiento y visualización del archivo / ruta binaria de la fotografía
if (m.foto_mascota) {
document.getElementById('imgPreview').src = m.foto_mascota;
document.getElementById('imgPreview').style.display = 'block';
document.getElementById('iconCamera').style.display = 'none';
} else {
document.getElementById('imgPreview').style.display = 'none';
document.getElementById('iconCamera').style.display = 'block';
}

new bootstrap.Modal(document.getElementById('modalRegistroMascota')).show();
}
}
} catch (err) { console.error('❌ Error:', err); }
};

/**
* Envía una solicitud POST encapsulada en FormData al servidor para marcar como eliminada
* una mascota de la base de datos, solicitando confirmación previa al usuario.
* @global
* @async
* @param {string|number} id - ID indexado del registro de la mascota.
* @param {string} nombre - Nombre asignado a la mascota para el mensaje de confirmación.
* @returns {Promise<void>}
*/
window.eliminarMascota = async function(id, nombre) {
if (!confirm(`¿Eliminar a "${nombre}"?`)) return;
try {
const formData = new FormData();
formData.append('action', 'eliminar_mascota');
formData.append('id_mascota', id);
const json = await fetchJSON(API_URL, { method: 'POST', body: formData });
if (json.success) {
alert('✅ Mascota eliminada');
cargarMascotas();
cargarDashboard();
}
} catch (err) { alert('❌ Error: ' + err.message); }
};

// ============================================================================
// GESTIÓN DEL MÓDULO DE CITAS (AGENDAMIENTO Y RESERVAS)
// ============================================================================

/**
* Consulta las mascotas aptas para citas del usuario actual e inyecta dinámicamente las opciones
* dentro del selector del formulario de reserva médica / estética.
* @async
* @returns {Promise<void>}
*/
async function cargarMascotasEnSelectCita() {
try {
const json = await fetchJSON(`${API_URL}?action=mascotas_cita`);
const select = document.getElementById('citaSelectMascota');
if (!select) return;

select.innerHTML = '<option value="" selected disabled>Selecciona tu mascota...</option>';

if (json.success && json.data.length > 0) {
json.data.forEach(m => {
select.innerHTML += `<option value="${m.id_mascota}">${m.nombre_mascota}</option>`;
});
} else {
select.innerHTML += '<option value="" disabled>No tienes mascotas registradas</option>';
}
// Ejecución en cadena para restringir las fechas del calendario a periodos vigentes
bloquearFechasPasadas();
} catch (err) { console.error('❌ Error cargando mascotas:', err); }
}

/**
* Extrae la fecha actual del sistema en formato ISO estándar de corto alcance (YYYY-MM-DD)
* y la inyecta como valor mínimo permitido en el atributo del calendario nativo (`<input type="date">`).
* @returns {void}
*/
function bloquearFechasPasadas() {
const inputFecha = document.getElementById('citaInputFecha');
if (inputFecha) {
const hoy = new Date().toISOString().split('T')[0];
inputFecha.setAttribute('min', hoy);
}
}

/**
* Obtiene el historial global de citas médicas del cliente, procesa sus marcas de tiempo
* locales, evalúa sus códigos de estado e inyecta los elementos en forma de filas dentro de la tabla de UI.
* @async
* @returns {Promise<void>}
*/
async function cargarCitas() {
try {
const json = await fetchJSON(`${API_URL}?action=citas`);
if (!json.success) return;

const tbody = document.getElementById('tabla-citas-cuerpo');
if (!tbody) return;

tbody.innerHTML = '';

// Validación y renderizado de estado de historial vacío
if (json.data.length === 0) {
tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted"><i class="fa fa-calendar-xmark fa-2x d-block mb-2"></i>Sin citas registradas</td></tr>';
return;
}

json.data.forEach(c => {
// Mitigación de desfase horario forzando la marca literal con una T00:00:00 fija
const fecha = new Date(c.fecha_cita + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
const horaFormateada = formatearHora(c.hora_cita);

// Asignación de clases semánticas de Bootstrap en función del ID indexado del estado
let cls = 'bg-secondary text-white';
if (c.id_estado_cita == 1) cls = 'bg-warning text-dark';
else if (c.id_estado_cita == 2) cls = 'bg-success text-white';
else if (c.id_estado_cita == 3) cls = 'bg-danger text-white';
else if (c.id_estado_cita == 4) cls = 'bg-info text-white';

// Renderizado del disparador de cancelación únicamente si el estado de la cita se encuentra 'Pendiente'
const btnCancelar = c.id_estado_cita == 1 ? `
<button class="btn btn-sm btn-outline-danger rounded-pill px-2" onclick="cancelarCita(${c.id_cita})">
<i class="fa fa-times"></i>
</button>` : '<span class="text-muted">—</span>';

tbody.innerHTML += `
<tr>
<td class="px-4 fw-bold text-primary">#${c.id_cita}</td>
<td><i class="fa fa-paw me-2 text-primary"></i>${c.nombre_mascota || 'N/A'}</td>
<td>${c.servicio || 'N/A'}</td>
<td>${fecha}<br><small class="text-muted"><i class="fa fa-clock me-1"></i>${horaFormateada}</small></td>
<td class="text-center"><span class="badge ${cls} rounded-pill px-3 py-1">${c.estado || 'N/A'}</span></td>
<td class="text-end px-4">${btnCancelar}</td>
</tr>`;
});
} catch (err) { console.error('❌ Error cargando citas:', err); }
}

/**
• Valida los parámetros del formulario de citas en el cliente e inicia el flujo de empaquetado
• de datos para el envío hacia el Backend.
• @async
• @param {SubmitEvent} e - Evento de envío interceptado por el formulario.
• @returns {Promise}
*/
async function guardarCita(e) {
e.preventDefault();

const idMascota = document.getElementById('citaSelectMascota').value;
const idServicio = document.getElementById('citaSelectServicio').value;
const fecha = document.getElementById('citaInputFecha').value;
const hora = document.getElementById('citaSelectHora').value;
const notas = document.getElementById('citaInputNotas').value.trim();

if (!idMascota || !idServicio || !fecha || !hora) {
alert('⚠️ Por favor completa todos los campos obligatorios');
return;
}

// ------------------------------------------------------------
// Construcción y Empaquetado del Payload del Formulario (FormData)
// ------------------------------------------------------------
const formData = new FormData();
formData.append('action', 'guardar_cita');
formData.append('id_mascota', idMascota);
formData.append('id_servicio', idServicio);
formData.append('fecha_cita', fecha);
formData.append('hora_cita', hora);
formData.append('notas', notas);

// Deshabilitar control interactivo para mitigar peticiones duplicadas (Debounce en UI)
const btnSubmit = e.target.querySelector('button[type="submit"]');
const textoOriginal = btnSubmit ? btnSubmit.innerHTML : '';
if (btnSubmit) {
btnSubmit.disabled = true;
btnSubmit.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i>Agendando...';
}

try {
const json = await fetchJSON(API_URL, { method: 'POST', body: formData });


if (json.success) {
const modal = bootstrap.Modal.getInstance(document.getElementById('modalNuevaCita'));
if (modal) modal.hide();
e.target.reset();

// Actualizaciones concurrentes en la SPA para asegurar la consistencia de datos
await Promise.all([cargarCitas(), cargarDashboard()]);
// Notificación reactiva asíncrona hacia el canal de atención por WhatsApp
await enviarCitaWhatsApp(idMascota, idServicio, fecha, hora, notas);
alert('✅ Cita agendada correctamente');
} else {
alert('❌ Error: ' + (json.error || 'Desconocido'));
}
} catch (err) {
alert('❌ Error al agendar: ' + err.message);
} finally {
// Restauración obligatoria del estado del control interactivo
if (btnSubmit) {
btnSubmit.disabled = false;
btnSubmit.innerHTML = textoOriginal;
}
}
}


/**
* Compila los parámetros y formatea una cadena de texto codificada para su redirección externa
* a la API pública de WhatsApp (Click-to-Chat) con la plantilla de confirmación de reserva.
* @async
* @param {string|number} idMascota - Identificador de la mascota asociada.
* @param {string|number} idServicio - ID indexado del servicio veterinario/estético solicitado.
* @param {string} fecha - Cadena de fecha nativa proveniente del control de formulario (YYYY-MM-DD).
* @param {string} hora - Cadena horaria nativa proveniente del control de formulario (HH:MM).
* @param {string} notas - Comentarios, especificaciones o detalles complementarios provistos por el cliente.
* @returns {Promise<void>}
*/
async function enviarCitaWhatsApp(idMascota, idServicio, fecha, hora, notas) {
try {
// Buscar nombre mascota en caché o pedirlo
let nombreMascota = 'Mascota';

// Extracción del catálogo en caché local para mitigar peticiones cíclicas a la API
let nombreServicio = 'Servicio';
const servicioCache = cacheServicios.find(s => s.id_servicio == idServicio);
if (servicioCache) nombreServicio = servicioCache.nombre;

// Normalización regional de fechas (Localización: Colombia 'es-CO')
const fechaFormateada = new Date(fecha + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const horaFormateada = formatearHora(hora);

/* Número telefónico corporativo con código internacional de país */
const nroTelefono = "573016540576";

// Construcción paramétrica estructurada del texto codificado para la pasarela URL
const mensaje = `*NUEVA CITA - VÍA CANES* 🐾%0A` +
`----------------------------%0A` +
`*👤 Cliente:* ${usuarioActual?.nombres || ''} ${usuarioActual?.apellidos || ''}%0A` +
`*📱 Tel:* ${usuarioActual?.celular || 'N/A'}%0A` +
`*🐶 Mascota ID:* ${idMascota}%0A` +
`*✨ Servicio:* ${nombreServicio}%0A` +
`*📅 Fecha:* ${fechaFormateada}%0A` +
`*⏰ Hora:* ${horaFormateada}%0A` +
`*⚠️ Notas:* ${notas || 'Ninguna'}`;

window.open(`https://api.whatsapp.com/send?phone=${nroTelefono}&text=${mensaje}`, '_blank');

} catch (err) { console.error('❌ Error WhatsApp:', err); }
}

/**
* Envía una instrucción POST encapsulada en FormData para conmutar el estado de una cita
* a cancelado en la persistencia de datos del servidor, previa confirmación de seguridad.
id - ID incremental de la reservación (Cita) a modificar.
*/
window.cancelarCita = async function(id) {
if (!confirm('¿Estás seguro de cancelar esta cita?')) return;
try {
const formData = new FormData();
formData.append('action', 'cancelar_cita');
formData.append('id_cita', id);
const json = await fetchJSON(API_URL, { method: 'POST', body: formData });
if (json.success) {
alert('✅ Cita cancelada');
await Promise.all([cargarCitas(), cargarDashboard()]);
} else { alert('❌ Error: ' + json.error); }
} catch (err) { alert('❌ Error: ' + err.message); }
};
/**
* Helper de formateo cronológico: Transforma cadenas de tiempo militares (24h)
* a un formato amigable estándar de 12 horas con indicador AM/PM.
* @param {string} horaStr - Cadena cruda de tiempo extraída del DOM (Ej: "14:30").
* @returns {string} Cadena estructurada y formateada (Ej: "2:30 PM").
*/
function formatearHora(horaStr) {
if (!horaStr) return '';
const partes = horaStr.split(':');
const h = parseInt(partes[0], 10);
const m = partes[1] || '00';
const ampm = h >= 12 ? 'PM' : 'AM';
return `${h % 12 || 12}:${m} ${ampm}`;
}

// ================================================================
// GESTIÓN DEL MÓDULO DE PEDIDOS (HISTORIAL DE COMPRAS)
// ================================================================
/**
* Obtiene el listado transaccional del cliente e inyecta dinámicamente las filas
* dentro de la tabla del módulo de compras.
* @async
* @returns {Promise<void>}
*/
async function cargarPedidos() {
try {
const json = await fetchJSON(`${API_URL}?action=pedidos`);
if (json.success) {
const tbody = document.getElementById('tabla-pedidos-cuerpo');
if (!tbody) return;
tbody.innerHTML = '';
if (json.data.length === 0) {
tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Sin pedidos</td></tr>';
return;
}
json.data.forEach(p => {
const fecha = new Date(p.fecha).toLocaleDateString('es-CO');
// Mapeo adaptativo e iterativo para agrupar cadenas de productos secundarios
const productos = p.detalles?.length > 0 ? p.detalles.map(d => d.nombre).join(', ') : 'Ver detalle';
tbody.innerHTML += `
<tr>
<td class="px-4 fw-bold text-primary">#${p.id_pedido}</td>
<td>${fecha}</td>
<td>${productos}</td>
<td class="text-end fw-bold">$${Number(p.total || 0).toLocaleString('es-CO')}</td>
<td class="text-center"><span class="badge bg-info text-white rounded-pill px-3 py-1">${p.estado || 'N/A'}</span></td>
<td class="text-end px-4"><button class="btn btn-sm btn-dark rounded-pill text-white btn-ver-pedido" data-id-pedido="${p.id_pedido}" title="Ver detalle">Ver</button></td>
</tr>`;
});
}
} catch (err) { console.error('❌ Error:', err); }
}

// ================================================================
// GESTIÓN Y EDICIÓN DEL PERFIL DE USUARIO
// ================================================================

async function cargarPerfil() {
if (!usuarioActual) await cargarDatosUsuario();
const u = usuarioActual;
if (!u) return;

const avatarImg = document.getElementById('avatarImg');
if (avatarImg) {
avatarImg.src = u.foto_usuario ||
`https://ui-avatars.com/api/?name=${encodeURIComponent(u.nombres)}+${encodeURIComponent(u.apellidos)}&background=0D8FBF&color=fff&size=200`;
}

// Helper ágil inline de inyección de valores para mitigar redundancia sintáctica en el DOM
const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };

setVal('id_tipo_id', u.id_tipo_id || 1);
setVal('nuevoDocumento', u.numero_documento);
setVal('nuevoNombre', u.nombres);
setVal('nuevoApellido', u.apellidos);
setVal('nuevoCorreo', u.email);
setVal('nuevoTelefono', u.celular);
setVal('id_localidad', u.id_localidad || ''); // Dejar vacío si no tiene
setVal('nuevoDireccion', u.direccion);
setVal('newPassword', '');
setVal('confirmPassword', '');

// Restablecimiento de flags lógicas de borrado
const flag = document.getElementById('usrEliminarFotoFlag');
if(flag) flag.value = '0';

const photoInput = document.getElementById('photoInput');
if (photoInput) photoInput.value = '';
}

/**
* Valida de forma estructurada los requerimientos del lado del cliente (campos vacíos, longitud
* mínima y cotejo de llaves criptográficas) antes de despachar el bloque de datos hacia el Backend.
* @async
* @param {SubmitEvent} e - Evento interceptado del envío de formulario.
* @returns {Promise<void>}
*/
async function guardarPerfil(e) {

e.preventDefault();

// Arreglo indexado para validaciones de presencia obligatoria de datos
const requiredIds = ['id_tipo_id', 'nuevoDocumento', 'nuevoNombre', 'nuevoApellido', 'nuevoCorreo', 'nuevoTelefono', 'id_localidad'];
for (let id of requiredIds) {
const el = document.getElementById(id);
if (!el || !el.value.trim()) {
alert(`⚠️ El campo ${id.replace('nuevo','').replace('id_','')} es obligatorio`);
if(el) el.focus();
return;
}
}

const pass = document.getElementById('newPassword').value;
const confPass = document.getElementById('confirmPassword').value;

if (pass && pass !== confPass) { alert('❌ Las contraseñas no coinciden'); return; }
if (pass && pass.length < 6) { alert('❌ La contraseña debe tener mínimo 6 caracteres'); return; }

// ------------------------------------------------------------
// Construcción y Compactación multidimensional de datos del perfil
// ------------------------------------------------------------
const formData = new FormData();
formData.append('action', 'actualizar_perfil');
formData.append('id_tipo_id', document.getElementById('id_tipo_id').value);
formData.append('numero_documento', document.getElementById('nuevoDocumento').value.trim());
formData.append('nombres', document.getElementById('nuevoNombre').value.trim());
formData.append('apellidos', document.getElementById('nuevoApellido').value.trim());
formData.append('email', document.getElementById('nuevoCorreo').value.trim());
formData.append('celular', document.getElementById('nuevoTelefono').value.trim());
formData.append('id_localidad', document.getElementById('id_localidad').value);
formData.append('direccion', document.getElementById('nuevoDireccion').value.trim());

if (pass) formData.append('nueva_contrasena', pass);

const photoInput = document.getElementById('photoInput');
if (photoInput && photoInput.files && photoInput.files[0]) {
formData.append('foto_usuario', photoInput.files[0]);
}

const flagInput = document.getElementById('usrEliminarFotoFlag');
if (flagInput && flagInput.value === '1') {
formData.append('eliminar_foto', '1');
}

const saveBtn = document.getElementById('saveBtn');
const textoOriginal = saveBtn ? saveBtn.innerHTML : '';
if (saveBtn) {
saveBtn.disabled = true;
saveBtn.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i> Guardando...';
}

try {
const json = await fetchJSON(API_URL, { method: 'POST', body: formData });
if (json.success) {
alert('✅ Perfil actualizado correctamente');
await cargarDatosUsuario(); // Recargar datos globales
cargarPerfil(); // Refrescar inputs
} else {
alert('❌ Error: ' + (json.error || json.message || 'Desconocido'));
}
} catch (err) {
console.error('❌ Error completo:', err);
alert('❌ Error al guardar: ' + err.message);
} finally {
if (saveBtn) {
saveBtn.disabled = false;
saveBtn.innerHTML = textoOriginal;
}
}
}

// ================================================================
// UTILIDADES
// ================================================================
window.previsualizarImagen = function(input) {
if (input.files && input.files[0]) {
const reader = new FileReader();
reader.onload = (e) => {
const img = document.getElementById('imgPreview');
if (img) { img.src = e.target.result; img.style.display = 'block'; }
const icon = document.getElementById('iconCamera');
if (icon) icon.style.display = 'none';
};
reader.readAsDataURL(input.files[0]);
}
};

window.togglePassword = function(inputId, iconId) {
const input = document.getElementById(inputId);
const icon = document.getElementById(iconId);
if (!input || !icon) return;
if (input.type === 'password') {
input.type = 'text';
icon.classList.replace('fa-eye', 'fa-eye-slash');
} else {
input.type = 'password';
icon.classList.replace('fa-eye-slash', 'fa-eye');
}
};

window.cerrarSesion = async function() {
if (!confirm('¿Cerrar sesión?')) return;

// Detectar ruta para volver al inicio correctamente
const path = window.location.pathname;
const enCarpetaHtml = path.includes('/html/') || path.includes('\\html\\');
const RUTA_DESTINO = enCarpetaHtml ? '../index.html' : 'index.html';

try {
// Llamada al API para cerrar sesión en el servidor
const apiPath = enCarpetaHtml ? '../api/panel-usuario_data.php' : 'api/panel-usuario_data.php';
await fetch(`${apiPath}?action=cerrar_sesion`, { method: 'POST' });
} catch (err) {
console.error('Error cerrando sesión:', err);
}


localStorage.removeItem('viaCanesUser');

// Redirigir al inicio
window.location.href = RUTA_DESTINO;
};

// ============================================================================
// 🐾 ANEXO — MODAL DE DETALLE DE PEDIDO (Vía Canes)
// ----------------------------------------------------------------------------
// Funciones agregadas para abrir el modal "Ver detalle" desde el historial
// de pedidos. No duplica funciones que ya existían arriba (fetchJSON,
// cargarDatosUsuario, renderizarUsuarioEnUI, guardarPerfil, cerrarSesion).
// ============================================================================

// WhatsApp de negocio (mismo que usa el módulo de citas)
const WHATSAPP_NEGOCIO_DETALLE = "573016540576";

// Nombres legibles de los métodos de pago conocidos en la BD.
const NOMBRES_METODO_DETALLE = { 1:'Nequi', 2:'Daviplata', 3:'Contra Entrega', 4:'Tarjeta', 5:'Bre-B' };

/* Caché en memoria de los pedidos listados por cargarPedidos().
   Si el usuario abre "Ver" de un pedido ya cargado, evitamos un viaje
   extra al servidor (el detalle viene dentro de la respuesta de `pedidos`
   en la clave `detalles`). */
let cachePedidosUsuario = [];
window.cachePedidosUsuario = cachePedidosUsuario;

/* ─────────── 🧰 UTILIDADES (propias del módulo de detalle) ─────────── */

function formatearCOP(valor) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(parseFloat(valor) || 0);
}

/* Devuelve la clase de Bootstrap para el badge según el estado del pedido. */
function claseEstado(estado = '') {
    const e = String(estado).toLowerCase();
    if (e.includes('entreg'))   return 'success';
    if (e.includes('enviad'))   return 'info';
    if (e.includes('pagad') || e.includes('confirmad') || e.includes('aprobad')) return 'primary';
    if (e.includes('prepar'))   return 'warning';
    if (e.includes('cancel'))   return 'danger';
    return 'secondary';
}

function formatearFechaPedido(valor) {
    if (!valor) return '—';
    try {
        const d = new Date(String(valor).replace(' ', 'T'));
        if (isNaN(d)) return String(valor);
        return d.toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' })
             + ' · ' + d.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });
    } catch { return String(valor); }
}

/* Lee el primer campo que exista en el objeto (tolera id_pedido / id,
   fecha / fecha_pedido, items / detalles, etc.). */
function tomar(obj, claves) {
    for (const c of claves) {
        if (obj && obj[c] !== undefined && obj[c] !== null && obj[c] !== '') return obj[c];
    }
    return null;
}

/* Extrae los items de un pedido tolerando tanto 'items' como 'detalles'
   (la acción original `pedidos` del PHP devuelve `detalles`, mientras que
   `detalle_pedido` devuelve `items`). */
function extraerItems(pedido) {
    if (!pedido) return null;
    let items = tomar(pedido, ['items', 'detalles', 'productos', 'detalle', 'lineas']);
    if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch { items = null; }
    }
    return Array.isArray(items) && items.length ? items : null;
}

/* ─────────── 📦 OBTENER EL DETALLE DEL SERVIDOR ─────────── */

/* Llama a la nueva acción `detalle_pedido` del PHP. Reutiliza `fetchJSON`
   (ya definido arriba) para los parseos robustos y manejo de errores. */
async function pedirDetalleAlServidor(idPedido) {
    try {
        const json = await fetchJSON(`${API_URL}?action=detalle_pedido&id_pedido=${encodeURIComponent(idPedido)}`);
        return (json && json.success && json.data) ? json.data : null;
    } catch (err) {
        console.error('❌ Error pidiendo detalle del pedido:', err);
        return null;
    }
}

/* ─────────── 🎨 RENDERIZAR EL MODAL ─────────── */

function renderizarDetalle(pedido, items, idPedido) {
    const cuerpo = document.getElementById('detCuerpo');
    const btnWA  = document.getElementById('detBtnWhatsApp');
    if (!cuerpo) return;

    if (!pedido && !items) {
        cuerpo.innerHTML = '<div class="alert alert-warning mb-0"><i class="fa fa-triangle-exclamation me-2"></i>No se pudo cargar el detalle del pedido. Verifica tu conexión e inténtalo de nuevo.</div>';
        return;
    }

    const estado    = String(tomar(pedido, ['estado', 'estado_pedido', 'status']) || 'Pendiente');
    const fecha     = tomar(pedido, ['fecha_pedido', 'fecha', 'creado_en', 'fecha_creacion']);
    const metodo    = tomar(pedido, ['id_metodo_pago', 'metodo_pago', 'id_metodo']);
    const metodoTxt = NOMBRES_METODO_DETALLE[parseInt(metodo)] ||
                      tomar(pedido, ['metodo_nombre', 'nombre_metodo', 'metodo_pago']) || '—';
    const direccion = tomar(pedido, ['direccion_envio', 'direccion', 'envio_direccion']) || '—';
    const total     = parseFloat(tomar(pedido, ['total', 'total_pedido', 'valor_total']) || 0);
    const envio     = parseFloat(tomar(pedido, ['costo_envio', 'envio', 'valor_envio']) || 0);
    const subtotal  = parseFloat(tomar(pedido, ['subtotal', 'subtotal_productos']) || 0);

    let filas = '';
    let sumaItems = 0;
    (items || []).forEach(it => {
        const nombre = String(tomar(it, ['nombre', 'nombre_producto', 'producto']) || 'Producto');
        const cant   = parseInt(tomar(it, ['cantidad', 'cant', 'qty']) || 1);
        const precio = parseFloat(tomar(it, ['precio_unitario', 'precio', 'precio_final']) || 0);
        sumaItems += precio * cant;
        filas += `
            <tr>
                <td class="small">${nombre}</td>
                <td class="text-center small">${cant}</td>
                <td class="text-end small">${formatearCOP(precio)}</td>
                <td class="text-end small fw-bold">${formatearCOP(precio * cant)}</td>
            </tr>`;
    });

    cuerpo.innerHTML = `
        <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
            <span class="badge bg-${claseEstado(estado)} fs-6">${estado.toUpperCase()}</span>
            <small class="text-muted"><i class="fa fa-calendar me-1"></i>${formatearFechaPedido(fecha)}</small>
        </div>

        <div class="row g-3 mb-3">
            <div class="col-md-6">
                <div class="border rounded-3 p-3 h-100">
                    <h6 class="small fw-bold text-uppercase text-muted mb-2"><i class="fa fa-credit-card me-1"></i>Pago</h6>
                    <p class="mb-0 small">${metodoTxt}</p>
                </div>
            </div>
            <div class="col-md-6">
                <div class="border rounded-3 p-3 h-100">
                    <h6 class="small fw-bold text-uppercase text-muted mb-2"><i class="fa fa-location-dot me-1"></i>Envío</h6>
                    <p class="mb-0 small">${direccion}</p>
                </div>
            </div>
        </div>

        <h6 class="small fw-bold text-uppercase text-muted mb-2"><i class="fa fa-box me-1"></i>Productos</h6>
        ${filas ? `
        <div class="table-responsive mb-3">
            <table class="table table-sm align-middle">
                <thead class="table-light">
                    <tr>
                        <th class="small">Producto</th>
                        <th class="small text-center">Cant.</th>
                        <th class="small text-end">Precio</th>
                        <th class="small text-end">Subtotal</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>` : '<div class="alert alert-light border small mb-3">El desglose de productos no está disponible para este pedido.</div>'}

        <div class="border rounded-3 p-3 bg-light">
            <div class="d-flex justify-content-between small mb-1">
                <span>Subtotal</span><span>${formatearCOP(subtotal > 0 ? subtotal : sumaItems)}</span>
            </div>
            <div class="d-flex justify-content-between small mb-2">
                <span>Envío</span><span>${envio === 0 ? 'Gratis' : formatearCOP(envio)}</span>
            </div>
            <div class="d-flex justify-content-between fw-bold border-top pt-2">
                <span>Total</span><span>${formatearCOP(total || (sumaItems + envio))}</span>
            </div>
        </div>
    `;

    if (btnWA) {
        btnWA.classList.remove('d-none');
        btnWA.href = `https://wa.me/${WHATSAPP_NEGOCIO_DETALLE}?text=${encodeURIComponent('Hola Vía Canes 🐾 Quiero consultar mi pedido #' + idPedido)}`;
    }
}

/* ─────────── 🚀 ABRIR EL MODAL DE DETALLE ─────────── */

async function abrirDetallePedido(idPedido) {
    const modalEl = document.getElementById('modalDetallePedido');
    if (!modalEl) {
        console.error('[Vía Canes] Falta el HTML del modal #modalDetallePedido en panel-usuario.html');
        alert('⚠️ No se encontró el modal de detalle. Revisa el HTML.');
        return;
    }

    const cuerpo = document.getElementById('detCuerpo');
    const numEl  = document.getElementById('detNumPedido');
    const btnWA  = document.getElementById('detBtnWhatsApp');

    if (numEl) numEl.textContent = '#' + idPedido;
    if (cuerpo) cuerpo.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-secondary"></div><p class="mt-2 mb-0 small text-muted">Cargando detalle...</p></div>';
    if (btnWA) btnWA.classList.add('d-none');

    bootstrap.Modal.getOrCreateInstance(modalEl).show();

    /* 1º: ¿El pedido ya está en caché (de cargarPedidos())? */
    let pedido = (window.cachePedidosUsuario || []).find(p =>
        String(tomar(p, ['id_pedido', 'id', 'numero_pedido'])) === String(idPedido)
    ) || null;

    let items = extraerItems(pedido);

    /* 2º: Si no trae items (porque `pedidos` devuelve `detalles` y existe, lo anterior
       ya funcionó; si aún así no hay, pedimos el detalle completo al servidor). */
    if (!items) {
        const detalle = await pedirDetalleAlServidor(idPedido);
        if (detalle) {
            pedido = { ...(pedido || {}), ...detalle };
            items = extraerItems(pedido);
        }
    }

    renderizarDetalle(pedido, items, idPedido);
}

/* 🔑 Delegación global: el botón "Ver" funciona aunque la tabla se re-renderice. */
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-ver-pedido, [data-accion="ver-pedido"]');
    if (!btn) return;
    e.preventDefault();
    const id = btn.dataset.idPedido || btn.dataset.id;
    if (id) abrirDetallePedido(id);
});

/* 🔑 Shims globales: para que onclick="verDetallePedido(23)" del HTML viejo siga funcionando. */
window.verDetallePedido   = abrirDetallePedido;
window.abrirDetallePedido = abrirDetallePedido;

/* 🔄 Hook en cargarPedidos() para poblar la caché sin tocar el código original.
   Interceptamos la función original y la envolvemos para conservar los datos
   en window.cachePedidosUsuario (que ya usa abrirDetallePedido). */
(function () {
    if (typeof window._cargarPedidosOriginal !== 'function' &&
        typeof window.cargarPedidos === 'function') {
        window._cargarPedidosOriginal = window.cargarPedidos;
        window.cargarPedidos = async function () {
            try {
                const json = await fetchJSON(`${API_URL}?action=pedidos`);
                if (json && json.success && Array.isArray(json.data)) {
                    window.cachePedidosUsuario = json.data;
                }
                // Llamar a la original para que haga el render como siempre
                return window._cargarPedidosOriginal();
            } catch (err) {
                return window._cargarPedidosOriginal();
            }
        };
    }
})();