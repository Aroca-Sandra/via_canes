// ================================================================
// MOD-MASCOTAS.JS (VERSIÓN INDEPENDIENTE Y CORREGIDA)
// ================================================================
let mascotasData = [];

document.addEventListener('DOMContentLoaded', () => {
    // Cargamos los datos directamente sin depender de la caché global de main.js
    inicializarSelectsMascotas();
    
    // Listeners para cascada Especie -> Raza
    const selEspecie = document.getElementById('masEspecie');
    if(selEspecie) selEspecie.addEventListener('change', (e) => 
        cargarRazas(e.target.value, 'masRaza', 'contEspecieDetalle', 'masEspecieDetalle', 'contRazaDetalle'));
    
    const selRaza = document.getElementById('masRaza');
    if(selRaza) selRaza.addEventListener('change', (e) => 
        toggleRazaDetalle(e.target, 'contRazaDetalle'));
});

/**
 * Función auxiliar local para llenar un select dado un array de objetos
 */
function llenarSelectLocal(idSelect, datos, campoValor, campoTexto, placeholder) {
    const sel = document.getElementById(idSelect);
    if (!sel) return;

    sel.innerHTML = `<option value="">${placeholder}</option>`;
    
    if (Array.isArray(datos)) {
        datos.forEach(item => {
            // Usamos optional chaining (?) por si el item viene vacío
            const val = item[campoValor] || '';
            const txt = item[campoTexto] || 'Sin nombre';
            
            const option = document.createElement('option');
            option.value = val;
            option.textContent = txt;
            sel.appendChild(option);
        });
    }
}

async function inicializarSelectsMascotas() {
    try {
        // Hacemos las 3 peticiones necesarias en paralelo
        const [clientes, especies, sexos] = await Promise.all([
            apiFetch('listar_clientes', null, 'GET'),
            apiFetch('listar_especies', null, 'GET'),
            apiFetch('listar_sexos_mascota', null, 'GET')
        ]);
        
        // 1. Llenar Dueños (Clientes)
        if (clientes.success) {
            llenarSelectLocal('masDueno', clientes.data, 'id_usuario', 'nombre_completo', 'Seleccionar dueño...');
        } else {
            console.warn('No se pudieron cargar los clientes:', clientes.error);
        }

        // 2. Llenar Especies
        if (especies.success) {
            llenarSelectLocal('masEspecie', especies.data, 'id_especie', 'nombre', 'Seleccionar especie...');
            // También llenamos el del mini-formulario si existe
            llenarSelectLocal('miniMasEspecie', especies.data, 'id_especie', 'nombre', 'Seleccionar...');
        }

        // 3. Llenar Sexos
        if (sexos.success) {
            llenarSelectLocal('masSexo', sexos.data, 'id_sexoMascota', 'sexo_mascota', 'Seleccionar sexo...');
            // También llenamos el del mini-formulario si existe
            llenarSelectLocal('miniMasSexo', sexos.data, 'id_sexoMascota', 'sexo_mascota', 'Seleccionar...');
        }

    } catch (err) {
        console.error('Error crítico inicializando selects de mascotas:', err);
        showToast('Error al cargar listas desplegables', 'danger');
    }
}

async function cargarRazas(idEspecie, selectRazaId, contDetalleId, inputDetalleId, contRazaDetalleId) {
    const selectRaza = document.getElementById(selectRazaId);
    const contDetalle = document.getElementById(contDetalleId);
    const contRazaDetalle = document.getElementById(contRazaDetalleId);

    // Mostrar campo "Otra especie" si el ID de especie es 3 (ajustar según tu BD)
    if (contDetalle) contDetalle.style.display = idEspecie == 3 ? 'block' : 'none';
    
    if (!idEspecie) {
        if(selectRaza) selectRaza.innerHTML = '<option value="">Primero seleccione especie</option>';
        return;
    }
    
    try {
        const json = await apiFetch('listar_razas', { id_especie: idEspecie }, 'GET');
        if(selectRaza) {
            selectRaza.innerHTML = '<option value="">Seleccionar raza...</option>';
            if (json.success) {
                json.data.forEach(r => {
                    selectRaza.innerHTML += `<option value="${r.id_raza}">${r.nombre}</option>`;
                });
            }
        }
    } catch (err) { 
        console.error('Error cargando razas:', err); 
    }
    
    // Ocultar detalle de raza al cambiar de especie
    if (contRazaDetalle) contRazaDetalle.style.display = 'none';
}

function toggleRazaDetalle(selectElement, contId) {
    const cont = document.getElementById(contId);
    if (cont && selectElement) {
        const selectedText = selectElement.options[selectElement.selectedIndex].text;
        // Si la raza seleccionada contiene "Otra", mostramos el input de texto
        cont.style.display = selectedText.toLowerCase().includes('otra') ? 'block' : 'none';
    }
}

async function renderMascotas() {
    try {
        const json = await apiFetch('listar_mascotas', null, 'GET');
        if (!json.success) return;
        mascotasData = json.data;
        
        const filtro = document.getElementById('buscarMascota').value.toLowerCase();
        const filtradas = json.data.filter(m =>
            (m.nombre_mascota || '').toLowerCase().includes(filtro) ||
            ((m.nombres || '') + ' ' + (m.apellidos || '')).toLowerCase().includes(filtro) ||
            (m.especie || '').toLowerCase().includes(filtro) ||
            (m.raza || '').toLowerCase().includes(filtro)
        );
        
        const tbody = document.getElementById('tablaMascotas');
        if (!tbody) return;

        if (filtradas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-4">No se encontraron mascotas</td></tr>';
            return;
        }

        tbody.innerHTML = filtradas.map(m => `
            <tr>
                <td>${m.id_mascota}</td>
                <td>
                    <img src="${m.foto_mascota || 'https://ui-avatars.com/api/?name='+encodeURIComponent(m.nombre_mascota || 'M')+'&background=ffd000&color=000'}"
                    class="rounded-circle border" width="40" height="40" style="object-fit:cover;">
                </td>
                <td><strong>${m.nombre_mascota}</strong></td>
                <td>${m.especie || '-'} ${m.especie_detalle ? '<small class="text-muted">('+m.especie_detalle+')</small>' : ''}</td>
                <td>${m.raza || '-'} ${m.raza_detalle ? '<small class="text-muted">('+m.raza_detalle+')</small>' : ''}</td>
                <td>${m.sexo_mascota || '-'}</td>
                <td>${m.edad_mascota || '-'}</td>
                <td>${m.peso_mascota ? m.peso_mascota + ' kg' : '-'}</td>
                <td><small>${m.nombres || ''} ${m.apellidos || ''}</small></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editarMascota(${m.id_mascota})" title="Editar"><i class="fa fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarMascota(${m.id_mascota},'${(m.nombre_mascota||'').replace(/'/g,"\\'")}')" title="Eliminar"><i class="fa fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (err) { console.error(err); }
}

// --- FUNCIONES DE IMAGEN ---
window.previewMascotaImg = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('mascotaPreview').src = e.target.result;
            document.getElementById('mascotaImgPreview').style.display = 'block';
            document.getElementById('mascotaImgPlaceholder').style.display = 'none';
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.quitarMascotaImg = function() {
    document.getElementById('mascotaImgPreview').style.display = 'none';
    document.getElementById('mascotaImgPlaceholder').style.display = 'block';
    document.getElementById('mascotaImagen').value = '';
    document.getElementById('mascotaPreview').src = '';
};

// --- GESTIÓN DEL FORMULARIO ---

window.prepararNuevaMascota = function() {
    limpiarFormMascota();
    showToast('✅ Formulario listo para nueva mascota', 'success');
    const formCard = document.getElementById('formMascota')?.closest('.sketch-card');
    if(formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.limpiarFormMascota = function() {
    document.getElementById('formMascota').reset();
    document.getElementById('masIdEdit').value = '';
    quitarMascotaImg();
    document.getElementById('contEspecieDetalle').style.display = 'none';
    document.getElementById('contRazaDetalle').style.display = 'none';
    
    const razaSelect = document.getElementById('masRaza');
    if(razaSelect) razaSelect.innerHTML = '<option value="">Primero seleccione especie</option>';
};

// --- GUARDAR / ACTUALIZAR ---
window.guardarMascota = async function() {
    const idEdit = document.getElementById('masIdEdit').value;
    const idDueno = document.getElementById('masDueno').value;
    const nombre = document.getElementById('masNombre').value.trim();
    const especie = document.getElementById('masEspecie').value;

    if (!idDueno || !nombre || !especie) {
        return showToast('⚠️ Dueño, Nombre y Especie son obligatorios', 'danger');
    }

    const formData = new FormData();
    // No necesitamos appendear 'action' aquí porque apiFetch lo hace automáticamente si pasamos un objeto/FormData
    
    if (idEdit) formData.append('id_mascota', idEdit);
    
    formData.append('id_usuario', idDueno);
    formData.append('nombre_mascota', nombre);
    formData.append('id_especie', especie);
    formData.append('id_raza', document.getElementById('masRaza').value || '');
    formData.append('id_sexoMascota', document.getElementById('masSexo').value || '');
    formData.append('peso_mascota', document.getElementById('masPeso').value || '');
    formData.append('edad_mascota', document.getElementById('masEdad').value.trim());
    formData.append('color_mascota', document.getElementById('masColor').value.trim());
    formData.append('observaciones_mascota', document.getElementById('masObservaciones').value.trim());
    formData.append('especie_detalle', document.getElementById('masEspecieDetalle').value.trim());
    formData.append('raza_detalle', document.getElementById('masRazaDetalle').value.trim());
    
    const fotoInput = document.getElementById('mascotaImagen');
    if (fotoInput.files && fotoInput.files[0]) {
        formData.append('foto_mascota', fotoInput.files[0]);
    }
    
    try {
        const res = await apiFetch('guardar_mascota_admin', formData);
        
        if (res.success) {
            showToast(res.message || '✅ Mascota guardada correctamente');
            limpiarFormMascota();
            renderMascotas();
        } else {
            showToast(res.error || '❌ Error al guardar la mascota', 'danger');
        }
    } catch (err) { 
        showToast('❌ Error de conexión al guardar', 'danger');
    }
};

// --- EDITAR ---
window.editarMascota = function(id) {
    const m = mascotasData.find(x => x.id_mascota == id);
    if (!m) return;
    
    document.getElementById('masIdEdit').value = m.id_mascota;
    document.getElementById('masDueno').value = m.id_usuario;
    document.getElementById('masNombre').value = m.nombre_mascota;
    
    // 1. Setear Especie
    const selEspecie = document.getElementById('masEspecie');
    selEspecie.value = m.id_especie;
    
    // 2. Cargar Razas basadas en esa especie y luego seleccionar la raza
    cargarRazas(m.id_especie, 'masRaza', 'contEspecieDetalle', 'masEspecieDetalle', 'contRazaDetalle').then(() => {
        const selectRaza = document.getElementById('masRaza');
        if(selectRaza) {
            selectRaza.value = m.id_raza || '';
            
            const selectedOption = selectRaza.options[selectRaza.selectedIndex];
            if (selectedOption && selectedOption.text.toLowerCase().includes('otra')) {
                document.getElementById('contRazaDetalle').style.display = 'block';
            }
        }
    });
    
    if (m.id_especie == 3) { 
        document.getElementById('contEspecieDetalle').style.display = 'block';
        document.getElementById('masEspecieDetalle').value = m.especie_detalle || '';
    }
    
    document.getElementById('masSexo').value = m.id_sexoMascota || '';
    document.getElementById('masPeso').value = m.peso_mascota || '';
    document.getElementById('masEdad').value = m.edad_mascota || '';
    document.getElementById('masColor').value = m.color_mascota || '';
    document.getElementById('masObservaciones').value = m.observaciones_mascota || '';
    document.getElementById('masRazaDetalle').value = m.raza_detalle || '';
    
    if (m.foto_mascota) {
        document.getElementById('mascotaPreview').src = m.foto_mascota;
        document.getElementById('mascotaImgPreview').style.display = 'block';
        document.getElementById('mascotaImgPlaceholder').style.display = 'none';
    } else {
        quitarMascotaImg();
    }
    
    const formCard = document.getElementById('formMascota')?.closest('.sketch-card');
    if(formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    showToast('Editando a ' + m.nombre_mascota, 'info');
};

// --- ELIMINAR ---
window.eliminarMascota = async function(id, nombre) {
    if (!confirm(`¿Estás seguro de eliminar a "${nombre}"?`)) return;
    try {
        const res = await apiFetch('eliminar_mascota_admin', { id_mascota: id });
        if (res.success) {
            showToast(res.message || 'Mascota eliminada');
            renderMascotas();
        } else {
            showToast(res.error || 'Error al eliminar', 'danger');
        }
    } catch (err) { 
        showToast('Error de conexión', 'danger'); 
    }
};

// --- MINI FORMULARIO (PARA CITAS) ---
window.toggleMiniFormMascota = function() {
    const form = document.getElementById('miniFormMascota');
    if(form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
};

window.guardarMascotaRapida = async function() {
    const idUsuario = document.getElementById('citaCliente')?.value;
    if (!idUsuario) { 
        return showToast('⚠️ Selecciona un cliente primero', 'warning'); 
    }
    
    const nombre = document.getElementById('miniMasNombre').value.trim();
    const especie = document.getElementById('miniMasEspecie').value;
    const raza = document.getElementById('miniMasRaza').value;
    const sexo = document.getElementById('miniMasSexo').value;
    
    if (!nombre || !especie || !raza || !sexo) {
        return showToast('⚠️ Completa los campos obligatorios (*)', 'warning');
    }
    
    const formData = new FormData();
    formData.append('id_usuario', idUsuario);
    formData.append('nombre_mascota', nombre);
    formData.append('id_especie', especie);
    formData.append('id_raza', raza);
    formData.append('id_sexoMascota', sexo);
    formData.append('peso_mascota', document.getElementById('miniMasPeso').value || '');
    formData.append('edad_mascota', document.getElementById('miniMasEdad').value.trim());
    formData.append('color_mascota', document.getElementById('miniMasColor').value.trim());
    formData.append('observaciones_mascota', document.getElementById('miniMasObs').value.trim());
    formData.append('especie_detalle', document.getElementById('miniMasEspDetalle').value.trim());
    formData.append('raza_detalle', document.getElementById('miniMasRazaDetalle').value.trim());
    
    try {
        const res = await apiFetch('guardar_mascota_admin', formData);
        if (res.success) {
            showToast('✅ Mascota registrada rápidamente');
            if (typeof cargarMascotasDelCliente === 'function') {
                await cargarMascotasDelCliente(idUsuario); 
            }
            toggleMiniFormMascota();
            // Limpiar campos mini
            ['miniMasNombre','miniMasPeso','miniMasEdad','miniMasColor','miniMasObs','miniMasEspDetalle','miniMasRazaDetalle'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
        } else {
            showToast(res.error || '❌ Error al guardar', 'danger');
        }
    } catch (err) { 
        showToast('❌ Error de conexión', 'danger'); 
    }
};