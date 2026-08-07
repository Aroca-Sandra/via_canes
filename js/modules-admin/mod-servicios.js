// ================================================================
// MÓDULO: MOD-SERVICIOS 
// ================================================================

let serviciosData = [];
let filtroServiciosActual = 'todos';

// ================================================================
// CARGA INICIAL DE DATOS
// ================================================================

async function cargarCategoriasServicio() {
const res = await apiFetch('listar_categorias_servicio', null, 'GET');
const select = document.getElementById('servCategoria');
if (res && res.success && select) {
select.innerHTML = '<option value="">Seleccionar categoría...</option>';
res.data.forEach(c => {
select.innerHTML += `<option value="${c.id_categoria_servicio}">${c.nombre}</option>`;
});
}
}

async function cargarServicios() {
const res = await apiFetch('listar_servicios', null, 'GET');
if (res && res.success && Array.isArray(res.data)) {
serviciosData = res.data;
} else if (Array.isArray(res)) {
serviciosData = res;
} else {
serviciosData = [];
}
renderServicios();
actualizarSelectCitas(serviciosData);
}

function actualizarSelectCitas(servicios) {
const select = document.getElementById('citaServicio') || document.getElementById('citaSelectServicio');
if (!select) return;
select.innerHTML = '<option value="">Selecciona el servicio...</option>';
if (Array.isArray(servicios)) {
servicios.filter(s => s.id_estado_servicio == 1).forEach(s => {
const opt = document.createElement('option');
opt.value = s.id_servicio || '';
opt.textContent = `${s.nombre || 'Servicio'} - $${parseFloat(s.precio || 0).toLocaleString('es-CO')}`;
select.appendChild(opt);
});
}
}

// ================================================================
// FILTRADO Y RENDERIZADO VISUAL
// ================================================================

window.filtrarServicios = function(filtro) {
filtroServiciosActual = filtro;
document.querySelectorAll('#filtroServGroup button').forEach(b => {
const clase = b.getAttribute('data-filtro');
if (clase === 'todos') b.className = b.className.replace(filtro === 'todos' ? 'btn-outline-dark' : 'btn-dark', filtro === 'todos' ? 'btn-dark' : 'btn-outline-dark');
if (clase === 'activos') b.className = b.className.replace(filtro === 'activos' ? 'btn-outline-success' : 'btn-success', filtro === 'activos' ? 'btn-success' : 'btn-outline-success');
if (clase === 'inactivos') b.className = b.className.replace(filtro === 'inactivos' ? 'btn-outline-secondary' : 'btn-secondary', filtro === 'inactivos' ? 'btn-secondary' : 'btn-outline-secondary');
});
renderServicios();
};

function renderServicios() {
const data = Array.isArray(serviciosData) ? serviciosData : [];
let dataFiltrada = data;
if (filtroServiciosActual === 'activos') dataFiltrada = data.filter(s => s.id_estado_servicio == 1);
if (filtroServiciosActual === 'inactivos') dataFiltrada = data.filter(s => s.id_estado_servicio == 2);

const btnTodos = document.querySelector('#filtroServGroup button[data-filtro="todos"] .cnt-t');
if (btnTodos) btnTodos.textContent = data.length;
const btnActivos = document.querySelector('#filtroServGroup button[data-filtro="activos"] .cnt-a');
if (btnActivos) btnActivos.textContent = data.filter(s => s.id_estado_servicio == 1).length;
const btnInactivos = document.querySelector('#filtroServGroup button[data-filtro="inactivos"] .cnt-i');
if (btnInactivos) btnInactivos.textContent = data.filter(s => s.id_estado_servicio == 2).length;

const lista = document.getElementById('listaServicios');
if (!lista) return;

if (!dataFiltrada.length) {
lista.innerHTML = '<p class="text-center text-muted py-4">No hay servicios registrados.</p>';
return;
}

lista.innerHTML = dataFiltrada.map(s => {
const categoria = s.categoria || 'Sin categoría';
const estado = s.estado || (s.id_estado_servicio == 1 ? 'Activo' : 'Inactivo');
const colorEstado = s.id_estado_servicio == 1 ? 'success' : 'secondary';
const duracion = s.duracion ? `<span class="badge bg-light text-dark border"><i class="fa fa-clock me-1"></i>${s.duracion} min</span>` : '';
const precio = parseFloat(s.precio || 0).toLocaleString('es-CO');
return `
<div class="d-flex align-items-center gap-3 p-3 border rounded mb-2 hover-shadow bg-white">
<div class="flex-grow-1">
<h6 class="mb-1 fw-bold text-dark">${s.nombre || 'Servicio'}</h6>
<small class="text-muted d-block mb-2">${s.descripcion || ''}</small>
<div>
<span class="badge bg-info text-dark">${categoria}</span>
<span class="badge bg-${colorEstado}">${estado}</span>
${duracion}
</div>
</div>
<div class="text-end">
<div class="fw-bold text-success fs-5">$${precio}</div>
<small class="text-muted d-block mb-2">Precio ref.</small>
<div class="d-flex gap-2 justify-content-end">
<button class="btn btn-sm btn-outline-primary" onclick="editarServicio(${s.id_servicio})" title="Editar"><i class="fa fa-edit"></i></button>
<button class="btn btn-sm btn-outline-danger" onclick="eliminarServicio(${s.id_servicio})" title="Eliminar"><i class="fa fa-trash"></i></button>
</div>
</div>
</div>
`;
}).join('');
}

// ================================================================
// GUARDAR, EDITAR Y ELIMINAR
// ================================================================

window.limpiarFormServicio = function() {
const form = document.getElementById('formServicio');
if (form) form.reset();
const inputId = document.getElementById('servIdEdit');
if (inputId) inputId.value = '';
};

// FUNCIÓN GLOBAL DE GUARDADO (LIMPIA Y SIN PARÁMETROS DE EVENTO)
window.guardarServicio = async function() {
const form = document.getElementById('formServicio');
if (!form.checkValidity()) {
form.reportValidity();
return;
}

const formData = new FormData();
const idEdit = document.getElementById('servIdEdit').value;

// Solo enviamos id_servicio si estamos editando
if (idEdit) {
formData.append('id_servicio', idEdit);
}

formData.append('nombre', document.getElementById('servNombre').value.trim());

const catVal = document.getElementById('servCategoria').value;
if (catVal) formData.append('id_categoria_servicio', catVal);

formData.append('precio', document.getElementById('servPrecio').value);

const durVal = document.getElementById('servDuracion').value;
if (durVal) formData.append('duracion', durVal);

// Forzar el envío del estado (este es el campo que no se guardaba)
const estadoVal = document.getElementById('servEstado').value || '1';
formData.append('id_estado_servicio', estadoVal);

formData.append('descripcion', document.getElementById('servDesc').value.trim());

try {
const res = await apiFetch('guardar_servicio', formData);

if (res && res.success) {
showToast('✅ ' + (res.message || 'Servicio guardado correctamente.'), 'success');
limpiarFormServicio();
cargarServicios();
} else {
showToast('❌ ' + (res?.error || 'No se pudo guardar el servicio.'), 'danger');
}
} catch (err) {
showToast('❌ Error crítico al guardar.', 'danger');
console.error(err);
}
};

window.editarServicio = function(id) {
const s = serviciosData.find(x => x.id_servicio == id);
if (!s) return;

document.getElementById('servIdEdit').value = s.id_servicio;
document.getElementById('servNombre').value = s.nombre || '';
document.getElementById('servCategoria').value = s.id_categoria_servicio || '';
document.getElementById('servPrecio').value = s.precio || '';
document.getElementById('servDuracion').value = s.duracion || '';
document.getElementById('servEstado').value = s.id_estado_servicio || '1';
document.getElementById('servDesc').value = s.descripcion || '';

window.scrollTo({ top: 0, behavior: 'smooth' });
showToast('Editando servicio...', 'info');
};

window.eliminarServicio = async function(id) {
if (!confirm('¿Estás seguro de que deseas eliminar este servicio?')) return;
const res = await apiFetch('eliminar_servicio', { id_servicio: id });
if (res && res.success) {
showToast('✅ ' + (res.message || 'Servicio eliminado.'), 'success');
cargarServicios();
} else {
showToast('❌ ' + (res?.error || 'No se pudo eliminar.'), 'danger');
}
};

// ================================================================
// DISPARADOR INICIAL
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
cargarCategoriasServicio();
cargarServicios();

// VINCULAR EL FORMULARIO DE MANERA SEGURA (Prevenir recarga de página)
const formServicio = document.getElementById('formServicio');
if (formServicio) {
formServicio.addEventListener('submit', function(e) {
e.preventDefault(); // Evita que la página se recargue
guardarServicio();  // Llama a la función de guardado
});
}
});

