// ================================================================
// MÓDULO: MOD-SERVICIOS (VÍA CANES ADMIN) - VERSIÓN CORREGIDA
// ================================================================

let serviciosData = [];
let filtroServiciosActual = 'todos';

function normalizarRutaImagen(url) {
    if (!url || url === 'null' || String(url).trim() === '') return null;
    if (url.startsWith('http') || url.startsWith('/') || url.startsWith('../')) {
        return url;
    }
    return '../' + url.replace(/^(\.\.\/)+/, '');
}

// FUNCIONES DE IMAGEN
// ================================================================
// FUNCIONES DE MANEJO DE IMAGEN - DEBEN ESTAR EXACTAMENTE ASÍ
// ================================================================

window.previewServicioImg = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            // Mostrar preview
            document.getElementById('servicioPreview').src = e.target.result;
            document.getElementById('servicioImgPreview').style.display = 'block';
            document.getElementById('servicioImgPlaceholder').style.display = 'none';
            
            // Resetear flag de eliminación
            const flagElim = document.getElementById('servEliminarFotoFlag');
            if (flagElim) flagElim.value = '0';
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.quitarServicioImg = function() {
    // Ocultar preview y mostrar placeholder
    document.getElementById('servicioImgPreview').style.display = 'none';
    document.getElementById('servicioImgPlaceholder').style.display = 'block';
    
    // Limpiar input de archivo
    document.getElementById('servicioImagen').value = '';
    document.getElementById('servicioPreview').src = '';
    
    // Marcar para eliminar si es edición
    const flagElim = document.getElementById('servEliminarFotoFlag');
    if (flagElim && document.getElementById('servIdEdit').value) {
        flagElim.value = '1';
    }
};

// Función para normalizar rutas de imagen
function normalizarRutaImagen(url) {
    if (!url || url === 'null' || String(url).trim() === '') return null;
    if (url.startsWith('http') || url.startsWith('/') || url.startsWith('../')) {
        return url;
    }
    return '../' + url.replace(/^(\.\.\/)+/, '');
}

// CARGA DE DATOS
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

// FILTRADO Y RENDERIZADO
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

        const imgUrlNormalizada = normalizarRutaImagen(s.imagen_url);
        
        const imgHtml = imgUrlNormalizada
            ? `<img src="${imgUrlNormalizada}" alt="${s.nombre || 'Servicio'}" 
                   style="width: 65px; height: 65px; object-fit: cover; border-radius: 10px; border: 1px solid #dee2e6;" 
                   onerror="this.outerHTML='<div class=\\'d-flex align-items-center justify-content-center bg-light border text-muted\\' style=\\'width:65px; height:65px; border-radius:10px;\\'><i class=\\'fa fa-concierge-bell fa-lg\\'></i></div>'">`
            : `<div class="d-flex align-items-center justify-content-center bg-light border text-muted" style="width: 65px; height: 65px; border-radius: 10px;"><i class="fa fa-concierge-bell fa-lg"></i></div>`;

        return `
        <div class="d-flex align-items-center gap-3 p-3 border rounded mb-2 hover-shadow bg-white">
            ${imgHtml}
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
                    <button type="button" class="btn btn-sm btn-outline-primary" onclick="editarServicio(${s.id_servicio})" title="Editar"><i class="fa fa-edit"></i></button>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="eliminarServicio(${s.id_servicio})" title="Eliminar"><i class="fa fa-trash"></i></button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// GUARDAR, EDITAR Y ELIMINAR
window.limpiarFormServicio = function() {
    const form = document.getElementById('formServicio');
    if (form) form.reset();
    const inputId = document.getElementById('servIdEdit');
    if (inputId) inputId.value = '';

    const flagElim = document.getElementById('servEliminarFotoFlag');
    if (flagElim) flagElim.value = '0';
    if (document.getElementById('servicioImgPreview')) document.getElementById('servicioImgPreview').style.display = 'none';
    if (document.getElementById('servicioImgPlaceholder')) document.getElementById('servicioImgPlaceholder').style.display = 'block';
    if (document.getElementById('servicioImagen')) document.getElementById('servicioImagen').value = '';
    if (document.getElementById('servicioPreview')) document.getElementById('servicioPreview').src = '';
};

window.guardarServicio = async function() {
    const form = document.getElementById('formServicio');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = new FormData();
    const idEdit = document.getElementById('servIdEdit').value;

    // ✅ CORRECCIÓN: Siempre usamos 'guardar_servicio', el PHP detecta si es edición por el ID
    formData.append('action', 'guardar_servicio');
    
    if (idEdit) {
        formData.append('id_servicio', idEdit);
    }

    formData.append('nombre', document.getElementById('servNombre').value.trim());
    
    const catVal = document.getElementById('servCategoria').value;
    if (catVal) formData.append('id_categoria_servicio', catVal);
    
    formData.append('precio', document.getElementById('servPrecio').value);
    
    const durVal = document.getElementById('servDuracion').value;
    if (durVal) formData.append('duracion', durVal);
    
    formData.append('id_estado_servicio', document.getElementById('servEstado').value);
    formData.append('descripcion', document.getElementById('servDesc').value.trim());
    
    const flagElim = document.getElementById('servEliminarFotoFlag');
    formData.append('eliminar_foto', flagElim ? flagElim.value : '0');
    
    const inputImg = document.getElementById('servicioImagen');
    if (inputImg && inputImg.files && inputImg.files[0]) {
        formData.append('imagen_servicio', inputImg.files[0]);
    }

    try {
        const res = await apiFetch('guardar_servicio', formData, 'POST');
        
        if (res && res.success) {
            if (typeof mostrarToast === 'function') {
                mostrarToast(res.message || 'Servicio guardado correctamente', 'success');
            } else {
                alert(res.message || 'Servicio guardado correctamente');
            }
            
            limpiarFormServicio();
            await cargarServicios();
        } else {
            const msgError = (res && res.error) ? res.error : 'Error al guardar el servicio';
            if (typeof mostrarToast === 'function') {
                mostrarToast(msgError, 'danger');
            } else {
                alert(msgError);
            }
        }
    } catch (err) {
        console.error("Error en guardarServicio:", err);
        if (typeof mostrarToast === 'function') {
            mostrarToast('Error de conexión con el servidor', 'danger');
        } else {
            alert('Error de conexión con el servidor');
        }
    }
};

window.editarServicio = function(id) {
    const s = serviciosData.find(item => item.id_servicio == id);
    if (!s) {
        console.error("❌ No se encontró el servicio con ID:", id);
        return;
    }
    
    // Llenar campos del formulario
    document.getElementById('servIdEdit').value = s.id_servicio;
    document.getElementById('servNombre').value = s.nombre || '';
    document.getElementById('servCategoria').value = s.id_categoria_servicio || '';
    document.getElementById('servPrecio').value = s.precio || '';
    document.getElementById('servDuracion').value = s.duracion || '';
    document.getElementById('servEstado').value = s.id_estado_servicio || 1;
    document.getElementById('servDesc').value = s.descripcion || '';
    
    // Resetear flag
    const flagElim = document.getElementById('servEliminarFotoFlag');
    if (flagElim) flagElim.value = '0';
    
    // Limpiar input de imagen
    if (document.getElementById('servicioImagen')) {
        document.getElementById('servicioImagen').value = '';
    }
    
    // ✅ MOSTRAR IMAGEN EXISTENTE SI LA TIENE
    const imgUrlNormalizada = normalizarRutaImagen(s.imagen_url);
    
    if (imgUrlNormalizada) {
        console.log("✅ Mostrando imagen:", imgUrlNormalizada);
        document.getElementById('servicioPreview').src = imgUrlNormalizada;
        document.getElementById('servicioImgPreview').style.display = 'block';
        document.getElementById('servicioImgPlaceholder').style.display = 'none';
    } else {
        console.log("ℹ️ Sin imagen para este servicio");
        document.getElementById('servicioPreview').src = '';
        document.getElementById('servicioImgPreview').style.display = 'none';
        document.getElementById('servicioImgPlaceholder').style.display = 'block';
    }
    
    // Scroll al formulario
    const formCard = document.getElementById('formServicio')?.closest('.sketch-card');
    if (formCard) {
        formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window.eliminarServicio = async function(id) {
    if (!confirm('¿Estás seguro de eliminar este servicio? Esta acción no se puede deshacer.')) return;
    
    const formData = new FormData();
    formData.append('action', 'eliminar_servicio');
    formData.append('id_servicio', id);
    
    try {
        const res = await apiFetch('eliminar_servicio', formData, 'POST');
        
        if (res && res.success) {
            if (typeof mostrarToast === 'function') {
                mostrarToast(res.message || 'Servicio eliminado', 'success');
            } else {
                alert(res.message || 'Servicio eliminado');
            }
            await cargarServicios();
        } else {
            const msgError = (res && res.error) ? res.error : 'No se pudo eliminar el servicio';
            if (typeof mostrarToast === 'function') {
                mostrarToast(msgError, 'danger');
            } else {
                alert(msgError);
            }
        }
    } catch (err) {
        console.error("Error al eliminar:", err);
        if (typeof mostrarToast === 'function') {
            mostrarToast('Error de conexión', 'danger');
        } else {
            alert('Error de conexión');
        }
    }
};

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    console.log("Inicializando módulo de servicios...");
    
    cargarCategoriasServicio();
    cargarServicios();
    
    const formServ = document.getElementById('formServicio');
    if (formServ) {
        formServ.addEventListener('submit', (e) => {
            e.preventDefault();
            guardarServicio();
        });
    } else {
        console.error("No se encontró el formulario con id 'formServicio'");
    }
});