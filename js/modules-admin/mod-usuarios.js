// ================================================================
//  MÓDULO 1:MOD-USUARIOS 
// ================================================================

function obtenerIniciales(nombres, apellidos) {
    const n = nombres ? nombres.trim().charAt(0).toUpperCase() : '';
    const a = apellidos ? apellidos.trim().charAt(0).toUpperCase() : '';
    return n + a || '?';
}

function colorAvatar(id) {
    const colores = ['#16607d','#047857','#b91c1c','#6d28d9','#9a3412','#0f766e','#0369a1','#92400e','#dc2626','#7c3aed'];
    return colores[id % colores.length];
}

let usrPreviewMode = 'iniciales'; 
let urlFotoOriginal = null; // Guarda la ruta de la foto que viene de la BD

async function cargarUsuarios() {
    const res = await apiFetch('listar_usuarios', null, 'GET');
    const tbody = document.getElementById('tablaUsuarios');
    
    if (!res.success) return showToast(res.error, 'danger');
    
    if (!res.data.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No hay usuarios</td></tr>';
        return;
    }
    
    tbody.innerHTML = res.data.map(u => {
        let avatarHtml = '';
        if (u.foto_usuario) {
            avatarHtml = `<img src="${u.foto_usuario}" style="width:36px;height:36px;object-fit:cover;border-radius:50%;">`;
        } else {
            const ini = obtenerIniciales(u.nombres, u.apellidos);
            const col = colorAvatar(u.id_usuario);
            avatarHtml = `<div style="width:36px;height:36px;border-radius:50%;background:${col};color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:bold;">${ini}</div>`;
        }

        return `
        <tr>
            <td>${u.id_usuario}</td>
            <td>${avatarHtml}</td>
            <td><small>${u.tipo_doc || ''} ${u.numero_documento}</small></td>
            <td>${u.nombres} ${u.apellidos}</td>
            <td><small>${u.email || ''}</small></td>
            <td><small>${u.celular || ''}</small></td>
            <td><span class="badge bg-${u.id_rol == 1 ? 'danger' : 'primary'}">${u.nombre_rol || ''}</span></td>
            <td><small>${u.nombre_localidad || '-'}</small></td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editarUsuario(${u.id_usuario})" title="Editar"><i class="fa fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarUsuario(${u.id_usuario})" title="Eliminar"><i class="fa fa-trash"></i></button>
            </td>
        </tr>
    `}).join('');
}

function prepararModalUsuarioNormal() {
    document.getElementById('modalUsuarioTitulo').textContent = 'Registro de Usuario';
    document.getElementById('formUsuario').reset();
    document.querySelector('input[name="id_usuario"]').value = '';
    document.getElementById('usrContrasena').placeholder = 'Contraseña obligatoria';
    document.getElementById('usrContrasena').required = true;
    
    urlFotoOriginal = null;
    usrPreviewMode = 'iniciales';
    
    // Reiniciar el input oculto a 0 (NO eliminar)
    const flagInput = document.getElementById('usrEliminarFotoFlag');
    if (flagInput) flagInput.value = '0';
    
    // 🔧 CORREGIDO: Usar classList en lugar de style.display
    const contEliminar = document.getElementById('contEliminarFoto');
    if (contEliminar) contEliminar.classList.add('d-none');
    
    mostrarInicialesPreview();
}

function mostrarInicialesPreview() {
    if (usrPreviewMode !== 'iniciales') return;
    
    const nombres = document.getElementById('usrNombres').value.trim();
    const apellidos = document.getElementById('usrApellidos').value.trim();
    const idUsuario = document.querySelector('input[name="id_usuario"]').value || '1';
    const ini = obtenerIniciales(nombres, apellidos);
    const col = colorAvatar(idUsuario);
    
    const preview = document.getElementById('usrFotoPreview');
    preview.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="${col}" width="100" height="100" rx="50"/><text fill="%23fff" font-size="40" font-weight="bold" x="50" y="55" text-anchor="middle" dominant-baseline="middle">${ini}</text></svg>`)}`;
    preview.classList.remove('d-none');
}

function marcarEliminarFoto() {
    if (!confirmar('¿Estás seguro de quitar esta foto? Se eliminará al guardar los cambios.')) return;
    
    // Cambiamos el input oculto a 1 (SÍ eliminar)
    document.getElementById('usrEliminarFotoFlag').value = '1';
    
    usrPreviewMode = 'iniciales';
    mostrarInicialesPreview(); // Mostramos las iniciales
    
    // Cambiar la interfaz
    document.getElementById('btnMarcarEliminar').classList.add('d-none');
    document.getElementById('eliminacionPendiente').classList.remove('d-none');
}

function cancelarEliminarFoto() {
    // Volvemos el input oculto a 0 (NO eliminar)
    document.getElementById('usrEliminarFotoFlag').value = '0';
    
    usrPreviewMode = 'foto';
    const preview = document.getElementById('usrFotoPreview');
    preview.src = urlFotoOriginal;
    preview.classList.remove('d-none');
    
    // Restaurar botones
    document.getElementById('btnMarcarEliminar').classList.remove('d-none');
    document.getElementById('eliminacionPendiente').classList.add('d-none');
}

async function editarUsuario(id) {
    const res = await apiFetch('listar_usuarios', null, 'GET');
    if (!res.success) return;
    
    const u = res.data.find(x => x.id_usuario == id);
    if (!u) return;
    
    document.getElementById('modalUsuarioTitulo').textContent = 'Editar Usuario';
    document.querySelector('input[name="id_usuario"]').value = u.id_usuario;
    document.getElementById('usrTipoId').value = u.id_tipo_id;
    document.getElementById('usrDoc').value = u.numero_documento;
    document.getElementById('usrNombres').value = u.nombres;
    document.getElementById('usrApellidos').value = u.apellidos;
    document.getElementById('usrEmail').value = u.email;
    document.getElementById('usrCelular').value = u.celular;
    document.getElementById('usrRol').value = u.id_rol;
    document.getElementById('usrLocalidad').value = u.id_localidad || '';
    document.getElementById('usrDireccion').value = u.direccion || '';
    
    document.getElementById('usrContrasena').value = '';
    document.getElementById('usrContrasena').placeholder = 'Dejar vacío si no cambia';
    document.getElementById('usrContrasena').required = false;

        const fotoInput = document.getElementById('usrFoto');
    if (fotoInput) fotoInput.value = ''; 
    
    const preview = document.getElementById('usrFotoPreview');
    const contEliminar = document.getElementById('contEliminarFoto');

    // Reiniciar el flag a 0 por si se había marcado antes
    const flagInput = document.getElementById('usrEliminarFotoFlag');
    if (flagInput) flagInput.value = '0';

    if (u.foto_usuario) {
        urlFotoOriginal = u.foto_usuario;
        usrPreviewMode = 'foto';
        preview.src = u.foto_usuario;
        preview.classList.remove('d-none');
        
        // 🔧 CORREGIDO: Usar classList.remove para vencer al d-none de Bootstrap
        contEliminar.classList.remove('d-none');
        document.getElementById('btnMarcarEliminar').classList.remove('d-none');
        document.getElementById('eliminacionPendiente').classList.add('d-none');
    } else {
        urlFotoOriginal = null;
        usrPreviewMode = 'iniciales';
        contEliminar.classList.add('d-none');
        mostrarInicialesPreview();
    }
    
    new bootstrap.Modal(document.getElementById('modalUsuario')).show();
}

async function guardarUsuario(event) {
    // 🆕 EVITAR QUE EL FORMULARIO RECARGUE LA PÁGINA
    if (event) event.preventDefault();

    const form = document.getElementById('formUsuario');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formData = new FormData();
    formData.append('id_usuario', document.querySelector('input[name="id_usuario"]').value);
    formData.append('id_tipo_id', document.getElementById('usrTipoId').value);
    formData.append('numero_documento', document.getElementById('usrDoc').value.trim());
    formData.append('nombres', document.getElementById('usrNombres').value.trim());
    formData.append('apellidos', document.getElementById('usrApellidos').value.trim());
    formData.append('email', document.getElementById('usrEmail').value.trim());
    formData.append('celular', document.getElementById('usrCelular').value.trim());
    formData.append('id_rol', document.getElementById('usrRol').value);
    formData.append('id_localidad', document.getElementById('usrLocalidad').value);
    formData.append('direccion', document.getElementById('usrDireccion').value.trim());
    
    const contrasena = document.getElementById('usrContrasena').value;
    if (contrasena) formData.append('nueva_contrasena', contrasena);
    
    const foto = document.getElementById('usrFoto').files[0];
    if (foto) {
        formData.append('foto_usuario', foto);
    }
    
    // 🔧 CLAVE: Leemos el input oculto para saber si el usuario marcó eliminar
    const flagInput = document.getElementById('usrEliminarFotoFlag');
    if (flagInput && flagInput.value === '1') {
        formData.append('eliminar_foto', '1');
    }
    
    const res = await apiFetch('guardar_usuario', formData);
    
    if (res.success) {
        showToast(res.message);
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalUsuario')).hide();
        cargarUsuarios();
        await actualizarSelectsClientes();
    } else {
        showToast(res.error, 'danger');
    }
}

async function eliminarUsuario(id) {
    if (!confirmar('¿Eliminar este usuario permanentemente?')) return;
    const res = await apiFetch('eliminar_usuario', { id_usuario: id });
    if (res.success) {
        showToast(res.message);
        cargarUsuarios();
        await actualizarSelectsClientes();
    } else {
        showToast(res.error, 'danger');
    }
}

async function actualizarSelectsClientes() {
    const res = await apiFetch('listar_clientes', null, 'GET');
    if (res.success) {
        cacheSelects.clientes = res.data;
        if (document.getElementById('masDueno')) llenarSelect('masDueno', res.data, 'Seleccionar dueño...');
        if (document.getElementById('citaCliente')) llenarSelect('citaCliente', res.data, 'Seleccionar cliente...');
    }
}

// ================================================================
// INICIALIZACIÓN
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
    const fotoInput = document.getElementById('usrFoto');
    if (fotoInput) {
        fotoInput.addEventListener('change', function() {
            const file = this.files[0];
            const preview = document.getElementById('usrFotoPreview');
            const contEliminar = document.getElementById('contEliminarFoto');
            
            if (file) {
                const reader = new FileReader();
                reader.onload = e => {
                    usrPreviewMode = 'foto'; 
                    // Si sube una nueva, cancelamos la eliminación
                    const flagInput = document.getElementById('usrEliminarFotoFlag');
                    if (flagInput) flagInput.value = '0';
                    
                    preview.src = e.target.result;
                    preview.classList.remove('d-none');
                    if (contEliminar) contEliminar.classList.add('d-none'); 
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // 🔧 NUEVO: Inyectar Input Oculto y Botones
    const formUsuario = document.getElementById('formUsuario');
    const contFoto = document.getElementById('usrFotoPreview') ? document.getElementById('usrFotoPreview').parentElement : null;

    if (formUsuario && !document.getElementById('usrEliminarFotoFlag')) {
        // 1. Inyectar input oculto DENTRO del formulario
        formUsuario.insertAdjacentHTML('afterbegin', `<input type="hidden" id="usrEliminarFotoFlag" name="eliminar_foto" value="0">`);
    }

    if (contFoto && !document.getElementById('contEliminarFoto')) {
        // 2. Inyectar botones de UI
        contFoto.insertAdjacentHTML('beforeend', `
            <div id="contEliminarFoto" class="mt-2 d-none text-center">
                <button type="button" id="btnMarcarEliminar" class="btn btn-sm btn-outline-danger" onclick="marcarEliminarFoto()">
                    <i class="fa fa-trash-alt me-1"></i>Eliminar foto
                </button>
                <div id="eliminacionPendiente" class="alert alert-warning py-1 px-2 mt-2 small d-none d-flex justify-content-between align-items-center">
                    <span><i class="fa fa-exclamation-triangle me-1"></i>Pendiente eliminar</span>
                    <button type="button" class="btn btn-sm btn-link text-primary p-0" onclick="cancelarEliminarFoto()">Deshacer</button>
                </div>
            </div>
        `);
    }

    // Actualizar las iniciales en tiempo real
    const inputNombres = document.getElementById('usrNombres');
    const inputApellidos = document.getElementById('usrApellidos');
    if(inputNombres) inputNombres.addEventListener('input', mostrarInicialesPreview);
    if(inputApellidos) inputApellidos.addEventListener('input', mostrarInicialesPreview);
});