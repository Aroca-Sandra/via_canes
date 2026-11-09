// ================================================================

// MÓDULO: MOD-USUARIOS (VÍA CANES ADMIN)
// ================================================================

let usuariosData = [];

// 1. CARGAR DATOS AUXILIARES (Selects Dinámicos)
async function cargarDatosAuxiliaresUsuarios() {
    console.log("🔄 Cargando listas desplegables...");
    
    // A. Tipos de Identificación
    try {
        const resTipos = await apiFetch('listar_tipos_documento', null, 'GET');
        const selectTipo = document.getElementById('usrTipoId');
        
        if (resTipos && resTipos.success && selectTipo) {
            selectTipo.innerHTML = '<option value="">Seleccionar...</option>';
            resTipos.data.forEach(t => {
                selectTipo.innerHTML += `<option value="${t.id_tipo_id}">${t.sigla}  (${t.nombre || t.nombre_tipo_id})</option>`;
            });
            console.log(`✅ Tipos ID cargados: ${resTipos.data.length}`);
        }
    } catch (e) { console.error("Error cargando tipos ID:", e); }

    // B. Roles
    try {
        const resRoles = await apiFetch('listar_roles', null, 'GET');
        const selectRol = document.getElementById('usrRol');
        
        if (resRoles && resRoles.success && selectRol) {
            selectRol.innerHTML = '<option value="">Seleccionar...</option>';
            resRoles.data.forEach(r => {
                // Sincronizado con tu clave SQL: r.nombre o r.nombre_rol
                selectRol.innerHTML += `<option value="${r.id_rol}">${r.nombre || r.nombre_rol}</option>`;
            });
            console.log(`✅ Roles cargados: ${resRoles.data.length}`);
        }
    } catch (e) { console.error("Error cargando roles:", e); }

    // C. Localidades
    try {
        const resLoc = await apiFetch('listar_localidades', null, 'GET');
        const selectLoc = document.getElementById('usrLocalidad');
        
        if (resLoc && resLoc.success && selectLoc) {
            selectLoc.innerHTML = '<option value="">Seleccionar...</option>';
            resLoc.data.forEach(l => {
                // Sincronizado con tu clave SQL: l.nombre o l.nombre_localidad
                selectLoc.innerHTML += `<option value="${l.id_localidad}">${l.nombre || l.nombre_localidad}</option>`;
            });
            console.log(`✅ Localidades cargadas: ${resLoc.data.length}`);
        }
    } catch (e) { console.error("Error cargando localidades:", e); }
}

// 2. CARGAR LISTA DE USUARIOS
async function cargarUsuarios() {
    const res = await apiFetch('listar_usuarios', null, 'GET');
    if (res && res.success && Array.isArray(res.data)) {
        usuariosData = res.data;
    } else {
        usuariosData = [];
    }
    renderTablaUsuarios();
}

// 3. RENDERIZAR TABLA GESTIONADA
function renderTablaUsuarios() {
    const tbody = document.getElementById('tablaUsuarios');
    if (!tbody) return;

    if (!usuariosData.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">No hay usuarios registrados.</td></tr>';
        return;
    }

    tbody.innerHTML = usuariosData.map(u => {
        let fotoHtml = `<div class="d-flex align-items-center justify-content-center bg-light rounded-circle text-secondary fw-bold" style="width:40px;height:40px;">${u.nombres ? u.nombres.charAt(0) : 'U'}</div>`;
        if (u.foto_usuario && u.foto_usuario !== 'null' && String(u.foto_usuario).trim() !== '') {
            fotoHtml = `<img src="${u.foto_usuario}" class="rounded-circle object-fit-cover" width="40" height="40">`;
        }

        return `
        <tr>
            <td>${u.id_usuario}</td>
            <td class="text-center">${fotoHtml}</td>
            <td><span class="badge bg-secondary me-1">${u.tipo_doc || '-'}</span> ${u.numero_documento}</td>
            <td class="fw-bold">${u.nombres} ${u.apellidos}</td>
            <td>${u.email}</td>
            <td>${u.celular || '-'}</td>
            <td><span class="badge bg-info text-dark">${u.nombre_rol || '-'}</span></td>
            <td>${u.nombre_localidad || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editarUsuario(${u.id_usuario})"><i class="fa fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarUsuario(${u.id_usuario})"><i class="fa fa-trash"></i></button>
            </td>
        </tr>
        `;
    }).join('');
}

// 4. PREPARAR MODAL PARA NUEVO USUARIO
window.prepararModalUsuarioNormal = function() {
    limpiarFormularioUsuario();
    document.getElementById('modalUsuarioTitulo').textContent = "Registro de Usuario";
};

// 5. LIMPIAR FORMULARIO
function limpiarFormularioUsuario() {
    const form = document.getElementById('formUsuario');
    if (form) form.reset();
    
    const inputId = document.querySelector('#formUsuario input[name="id_usuario"]');
    if(inputId) inputId.value = '';

    const imgPreview = document.getElementById('usrFotoPreview');
    if(imgPreview) {
        imgPreview.src = '';
        imgPreview.classList.add('d-none');
    }
    
    resetearEstadoFoto();
}

// 6. EDITAR USUARIO (CON ASIGNACIÓN DIRECTA)
window.editarUsuario = function(id) {
    const u = usuariosData.find(x => x.id_usuario == id);
    if (!u) {
        console.error("Usuario no encontrado:", id);
        return;
    }

    console.log("Editando usuario:", u);

    document.getElementById('modalUsuarioTitulo').textContent = "Editar Usuario";

    const inputId = document.querySelector('#formUsuario input[name="id_usuario"]');
    if(inputId) inputId.value = u.id_usuario;

    // Asignación directa e inmediata para elementos <select>
    if (u.id_tipo_id) document.getElementById('usrTipoId').value = u.id_tipo_id;
    if (u.id_rol) document.getElementById('usrRol').value = u.id_rol;
    if (u.id_localidad) document.getElementById('usrLocalidad').value = u.id_localidad;

    // Inputs de texto estándar
    document.getElementById('usrDoc').value = u.numero_documento || '';
    document.getElementById('usrNombres').value = u.nombres || '';
    document.getElementById('usrApellidos').value = u.apellidos || '';
    document.getElementById('usrEmail').value = u.email || '';
    document.getElementById('usrCelular').value = u.celular || '';
    document.getElementById('usrDireccion').value = u.direccion || '';

    // Contraseña vacía por seguridad al editar
    document.getElementById('usrContrasena').value = '';

    // Manejo visual de la Foto
    const imgPreview = document.getElementById('usrFotoPreview');
    const contEliminar = document.getElementById('contEliminarFoto');
    const inputFoto = document.getElementById('usrFoto');

    resetearEstadoFoto();

    if (u.foto_usuario && u.foto_usuario !== 'null' && String(u.foto_usuario).trim() !== '') {
        if(imgPreview) {
            imgPreview.src = u.foto_usuario;
            imgPreview.classList.remove('d-none');
        }
        if(contEliminar) contEliminar.classList.remove('d-none');
        if(inputFoto) inputFoto.disabled = false;
    } else {
        if(imgPreview) imgPreview.classList.add('d-none');
        if(contEliminar) contEliminar.classList.add('d-none');
    }

    // Abrir Modal de Bootstrap
    const modalEl = document.getElementById('modalUsuario');
    let modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
};

// 7. GUARDAR USUARIO (CONSOLIDADO ASÍNCRONO)
window.guardarUsuario = async function() {
    const form = document.getElementById('formUsuario');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = new FormData(form);
    const idEdit = document.querySelector('#formUsuario input[name="id_usuario"]').value;

    // Si es edición y no modificó contraseña, la removemos para no pisarla en la BD
    if (idEdit && !document.getElementById('usrContrasena').value) {
        formData.delete('contrasena');
        formData.delete('nueva_contrasena');
    }

    // ✅ CORRECCIÓN: Siempre enviamos 'guardar_usuario'. 
    // El PHP ya sabe si es edición o nuevo gracias a que 'id_usuario' viene en el FormData.
    formData.append('action', 'guardar_usuario');

      try {
        // ✅ CORRECCIÓN: Llamamos a la API con la acción unificada 'guardar_usuario'
        const res = await apiFetch('guardar_usuario', formData, 'POST');

        if (res && res.success) {
            showToast('✅ ' + (res.message || 'Usuario guardado correctamente'), 'success');
            
            const modalEl = document.getElementById('modalUsuario');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();
            
            cargarUsuarios();
            if (typeof actualizarSelectsClientes === 'function') {
                await actualizarSelectsClientes();
            }
        } else {
            showToast('❌ ' + (res ? res.error : 'Fallo de respuesta'), 'danger');
        }
    } catch (err) {
        console.error("Error al procesar guardado:", err);
        showToast('❌ Error de comunicación con la API', 'danger');
    }
};

// 8. ELIMINAR USUARIO
// 8. ELIMINAR USUARIO EN LA BD
window.eliminarUsuario = async function(id) {
    if (!confirm('¿Eliminar este usuario permanentemente?')) return;
    
    const formData = new FormData();
    formData.append('action', 'eliminar_usuario');
    formData.append('id_usuario', id);

    const res = await apiFetch('eliminar_usuario', formData);
    if (res && res.success) {
        showToast('✅ Usuario eliminado', 'success');
        cargarUsuarios();
    } else {
        showToast('❌ ' + (res?.error || 'No se pudo eliminar'), 'danger');
    }
};

// ================================================================
// FUNCIONES PARA LA GESTIÓN DE LA FOTO (Sincronizado con tu HTML)
// ================================================================

// Ejecuta cuando el usuario selecciona un archivo nuevo en el input file
function manejarCambioFoto(event) {
    const input = event.target;
    const imgPreview = document.getElementById('usrFotoPreview');
    const contEliminar = document.getElementById('contEliminarFoto');

    if (input.files && input.files[0]) {
        const reader = new FileReader();

        reader.onload = function(e) {
            if (imgPreview) {
                imgPreview.src = e.target.result;      // Asigna la nueva imagen base64
                imgPreview.classList.remove('d-none'); // La muestra en pantalla
                imgPreview.style.opacity = '1';        // Asegura opacidad completa
            }
            if (contEliminar) {
                contEliminar.classList.remove('d-none'); // Muestra el contenedor del botón borrar
            }
            
            // Si el usuario sube una nueva foto, cancelamos cualquier intento de borrado anterior
            document.getElementById('usrEliminarFotoFlag').value = '0';
            document.getElementById('eliminacionPendiente').classList.add('d-none');
            document.getElementById('btnMarcarEliminar').classList.remove('d-none');
        };

        reader.readAsDataURL(input.files[0]); // Lee el archivo local
    }
}

// Acción al presionar "Eliminar foto"
window.marcarEliminarFoto = function() {
    // 1. Activamos la bandera que se envía al PHP
    document.getElementById('usrEliminarFotoFlag').value = '1';
    
    // 2. Mostramos el banner amarillo de "Pendiente eliminar" y ocultamos el botón de la basura
    document.getElementById('eliminacionPendiente').classList.remove('d-none');
    document.getElementById('btnMarcarEliminar').classList.add('d-none');
    
    // 3. Opacamos la foto vieja para dar el efecto visual de "marcada para borrado"
    const imgPreview = document.getElementById('usrFotoPreview');
    if (imgPreview) {
        imgPreview.style.opacity = '0.3'; 
    }
};

// Acción al presionar "Deshacer" en el banner amarillo
window.cancelarEliminarFoto = function() {
    // 1. Apagamos la bandera para que no se borre en la base de datos
    document.getElementById('usrEliminarFotoFlag').value = '0';
    
    // 2. Ocultamos el banner amarillo y devolvemos el botón de eliminar
    document.getElementById('eliminacionPendiente').classList.add('d-none');
    document.getElementById('btnMarcarEliminar').classList.remove('d-none');
    
    // 3. Devolvemos la claridad completa a la imagen
    const imgPreview = document.getElementById('usrFotoPreview');
    if (imgPreview) {
        imgPreview.style.opacity = '1';
    }
};

// Limpia todo el entorno de la foto al cerrar, abrir o resetear el formulario
function resetearEstadoFoto() {
    document.getElementById('usrEliminarFotoFlag').value = '0';
    
    const elPendiente = document.getElementById('eliminacionPendiente');
    const btnMarcar = document.getElementById('btnMarcarEliminar');
    const inputFoto = document.getElementById('usrFoto');
    const imgPreview = document.getElementById('usrFotoPreview');
    
    if (elPendiente) elPendiente.classList.add('d-none');
    if (btnMarcar) btnMarcar.classList.remove('d-none');
    if (imgPreview) {
        imgPreview.style.opacity = '1';
        imgPreview.src = '';
        imgPreview.classList.add('d-none');
    }
    if (inputFoto) {
        inputFoto.value = ''; // Limpia el rastro de archivos en memoria del input file
    }
}

// INICIALIZACIÓN DEL MÓDULO
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Inicializando módulo usuarios...");
    cargarDatosAuxiliaresUsuarios(); 
    cargarUsuarios();

    // Escucha de manera activa cuándo cambia el input file
    const inputFoto = document.getElementById('usrFoto');
    if (inputFoto) {
        inputFoto.addEventListener('change', manejarCambioFoto);
    }
});
