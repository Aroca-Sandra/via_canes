// ================================================================
// MOD-MASCOTAS.JS (CORREGIDO Y MEJORADO)
// ================================================================
let mascotasData = [];

document.addEventListener('DOMContentLoaded', () => {
    // Cargar selects usando la caché global o el respaldo
    if (typeof cacheSelects !== 'undefined' && cacheSelects.especies) {
        llenarSelect('masEspecie', cacheSelects.especies, 'id_especie', 'nombre', 'Seleccionar...');
        llenarSelect('masSexo', cacheSelects.sexos, 'id_sexoMascota', 'sexo_mascota', 'Seleccionar...');
        llenarSelect('masDueno', cacheSelects.clientes, 'id_usuario', 'nombre_completo', 'Seleccionar dueño...');
        llenarSelect('miniMasEspecie', cacheSelects.especies, 'id_especie', 'nombre', 'Seleccionar...');
        llenarSelect('miniMasSexo', cacheSelects.sexos, 'id_sexoMascota', 'sexo_mascota', 'Seleccionar...');
    } else {
        inicializarSelectsMascotas();
    }

    // Listeners especie -> raza
    document.getElementById('masEspecie')?.addEventListener('change', (e) => 
        cargarRazas(e.target.value, 'masRaza', 'contEspecieDetalle', 'masEspecieDetalle', 'contRazaDetalle'));
    
    document.getElementById('masRaza')?.addEventListener('change', (e) => 
        toggleRazaDetalle(e.target, 'contRazaDetalle'));
    
    document.getElementById('miniMasEspecie')?.addEventListener('change', (e) => 
        cargarRazas(e.target.value, 'miniMasRaza', 'miniContEspDetalle', 'miniMasEspDetalle', 'miniContRazaDetalle'));
    
    document.getElementById('miniMasRaza')?.addEventListener('change', (e) => 
        toggleRazaDetalle(e.target, 'miniContRazaDetalle'));
});

async function inicializarSelectsMascotas() {
    try {
        const [clientes, especies, sexos] = await Promise.all([
            apiFetch('listar_clientes', null, 'GET'),
            apiFetch('listar_especies', null, 'GET'),
            apiFetch('listar_sexos_mascota', null, 'GET')
        ]);
        
        if (clientes.success) {
            const sel = document.getElementById('masDueno');
            if (sel) {
                sel.innerHTML = '<option value="">Seleccionar dueño...</option>';
                clientes.data.forEach(c => sel.innerHTML += `<option value="${c.id_usuario}">${c.nombre_completo}</option>`);
            }
        }
        if (especies.success) {
            ['masEspecie', 'miniMasEspecie'].forEach(id => {
                const sel = document.getElementById(id);
                if (sel) {
                    sel.innerHTML = '<option value="">Seleccionar...</option>';
                    especies.data.forEach(e => sel.innerHTML += `<option value="${e.id_especie}">${e.nombre}</option>`);
                }
            });
        }
        if (sexos.success) {
            ['masSexo', 'miniMasSexo'].forEach(id => {
                const sel = document.getElementById(id);
                if (sel) {
                    sel.innerHTML = '<option value="">Seleccionar...</option>';
                    sexos.data.forEach(s => sel.innerHTML += `<option value="${s.id_sexoMascota}">${s.sexo_mascota}</option>`);
                }
            });
        }
    } catch (err) {
        console.error('Error inicializando selects:', err);
    }
}

async function cargarRazas(idEspecie, selectRazaId, contDetalleId, inputDetalleId, contRazaDetalleId) {
    const selectRaza = document.getElementById(selectRazaId);
    const contDetalle = document.getElementById(contDetalleId);
    const contRazaDetalle = document.getElementById(contRazaDetalleId);

    if (contDetalle) contDetalle.style.display = idEspecie == 3 ? 'block' : 'none';
    
    if (!idEspecie) {
        selectRaza.innerHTML = '<option value="">Primero especie</option>';
        return;
    }
    
    try {
        const json = await apiFetch('listar_razas', { id_especie: idEspecie }, 'GET');
        selectRaza.innerHTML = '<option value="">Seleccionar...</option>';
        if (json.success) {
            json.data.forEach(r => {
                selectRaza.innerHTML += `<option value="${r.id_raza}">${r.nombre}</option>`;
            });
        }
    } catch (err) { 
        console.error('Error cargando razas:', err); 
    }
    
    if (contRazaDetalle) contRazaDetalle.style.display = 'none';
}

function toggleRazaDetalle(selectElement, contId) {
    const cont = document.getElementById(contId);
    if (cont && selectElement) {
        const selectedText = selectElement.options[selectElement.selectedIndex].text;
        cont.style.display = selectedText.includes('Otra') ? 'block' : 'none';
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
            (m.nombres + ' ' + m.apellidos || '').toLowerCase().includes(filtro) ||
            (m.especie || '').toLowerCase().includes(filtro) ||
            (m.raza || '').toLowerCase().includes(filtro)
        );
        
        const tbody = document.getElementById('tablaMascotas');
        if (filtradas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-4">Sin mascotas</td></tr>';
            return;
        }
        tbody.innerHTML = filtradas.map(m => `
            <tr>
                <td>${m.id_mascota}</td>
                <td><img src="${m.foto_mascota || 'https://ui-avatars.com/api/?name='+encodeURIComponent(m.nombre_mascota)+'&background=ffd000&color=000'}"
                    class="rounded-circle" width="35" height="35" style="object-fit:cover;"></td>
                <td><strong>${m.nombre_mascota}</strong></td>
                <td>${m.especie || ''}${m.especie_detalle ? ' ('+m.especie_detalle+')' : ''}</td>
                <td>${m.raza || ''}${m.raza_detalle ? ' ('+m.raza_detalle+')' : ''}</td>
                <td>${m.sexo_mascota || '-'}</td>
                <td>${m.edad_mascota || '-'}</td>
                <td>${m.peso_mascota || '-'} kg</td>
                <td><small>${m.nombres} ${m.apellidos}</small></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editarMascota(${m.id_mascota})"><i class="fa fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarMascota(${m.id_mascota},'${(m.nombre_mascota||'').replace(/'/g,"\\'")}')" ><i class="fa fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (err) { console.error(err); }
}

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

// Botón "Nueva Mascota" en la tabla
window.prepararNuevaMascota = function() {
    // 🔧 MOVIDO AQUÍ: Se ejecuta primero que todo para asegurar que aparezca
    showToast('✅ Formulario listo para registrar una nueva mascota', 'success'); 
    limpiarFormMascota();
    document.getElementById('formMascota').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

window.limpiarFormMascota = function() {
    document.getElementById('formMascota').reset();
    document.getElementById('masIdEdit').value = '';
    quitarMascotaImg();
    document.getElementById('contEspecieDetalle').style.display = 'none';
    document.getElementById('contRazaDetalle').style.display = 'none';
    
    const razaSelect = document.getElementById('masRaza');
    if(razaSelect) razaSelect.innerHTML = '<option value="">Primero especie</option>';
};

// FUNCIÓN PRINCIPAL PARA GUARDAR
window.guardarMascota = async function() {
    const idEdit = document.getElementById('masIdEdit').value;
    const idDueno = document.getElementById('masDueno').value;
    const nombre = document.getElementById('masNombre').value.trim();
    const especie = document.getElementById('masEspecie').value;

    // Validación estricta
    if (!idDueno || !nombre || !especie) {
        return showToast('⚠️ Dueño, Nombre y Especie son obligatorios', 'danger');
    }

    const formData = new FormData();
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
        // Usamos apiFetch que es el estándar del panel
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

window.editarMascota = function(id) {
    const m = mascotasData.find(x => x.id_mascota == id);
    if (!m) return;
    
    document.getElementById('masIdEdit').value = m.id_mascota;
    document.getElementById('masDueno').value = m.id_usuario;
    document.getElementById('masNombre').value = m.nombre_mascota;
    document.getElementById('masEspecie').value = m.id_especie;
    
    cargarRazas(m.id_especie, 'masRaza', 'contEspecieDetalle', 'masEspecieDetalle', 'contRazaDetalle').then(() => {
        const selectRaza = document.getElementById('masRaza');
        selectRaza.value = m.id_raza || '';
        
        const selectedText = selectRaza.options[selectRaza.selectedIndex].text;
        if (selectedText.includes('Otra')) {
            document.getElementById('contRazaDetalle').style.display = 'block';
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
    
    document.getElementById('formMascota').scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast('Editando a ' + m.nombre_mascota, 'info');
};

window.eliminarMascota = async function(id, nombre) {
    if (!confirmar(`¿Eliminar a "${nombre}"?`)) return;
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

window.toggleMiniFormMascota = function() {
    const form = document.getElementById('miniFormMascota');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
};

window.guardarMascotaRapida = async function() {
    const idUsuario = document.getElementById('citaCliente').value;
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
            showToast('✅ Mascota registrada');
            const nuevoId = res.id;
            if (typeof cargarMascotasDelCliente === 'function') {
                await cargarMascotasDelCliente(idUsuario); 
            }
            document.getElementById('citaMascota').value = nuevoId;
            toggleMiniFormMascota();
            
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