// panel-usuario.js - VERSIÓN COMPLETA Y CORREGIDA
const API_URL = '../api/panel-usuario_data.php';
let usuarioActual = null;
let cacheServicios = []; // ✅ Cache de servicios para WhatsApp

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

/**
 * ✅ Carga las localidades desde la BD
 */
async function cargarLocalidades() {
    try {
        const json = await fetchJSON(`${API_URL}?action=localidades`);
        const select = document.getElementById('id_localidad');
        if (!select) return;
        
        select.innerHTML = '<option value="" disabled selected>Selecciona tu localidad...</option>';
        
        if (json.success && json.data) {
            json.data.forEach(l => {
                const opt = document.createElement('option');
                opt.value = l.id_localidad;
                opt.textContent = l.nombre_localidad;
                select.appendChild(opt);
            });
        }
    } catch (err) {
        console.error('❌ Error cargando localidades:', err);
    }
}

/**
 * ✅ Carga los tipos de identificación desde la BD
 */
async function cargarTiposId() {
    try {
        const json = await fetchJSON(`${API_URL}?action=tipos_id`);
        const select = document.getElementById('id_tipo_id');
        if (!select) return;
        
        select.innerHTML = '<option value="" disabled selected>Selecciona tipo...</option>';
        
        if (json.success && json.data) {
            json.data.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id_tipo_id;
                opt.textContent = `${t.sigla} - ${t.nombre}`;
                select.appendChild(opt);
            });
        }
    } catch (err) {
        console.error('❌ Error cargando tipos de ID:', err);
    }
}

/**
 * ✅ Carga los servicios activos desde la BD (Sin mostrar precio en el texto)
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
        // 1. Creamos la opción solo con el nombre del servicio
        const opt = new Option(s.nombre, s.id_servicio);
        
        // 2. Guardamos el precio base oculto por si lo necesitas después
        opt.dataset.precioBase = s.precio || 0; 
        
        fragment.appendChild(opt);
      });
      
      select.appendChild(fragment);
    }
  } catch (err) {
    console.error('❌ Error cargando servicios:', err);
  }
}


// ================================================================
// EVENT LISTENERS
// ================================================================
function configurarEventListeners() {
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

    // Cambio de Especie
    document.querySelectorAll('input[name="id_especie"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const idEspecie = e.target.value;
            const contenedor = document.getElementById('contenedorEspecieDetalle');
            if (contenedor) contenedor.classList.toggle('d-none', idEspecie != '3');
            cargarRazasDinamicas(idEspecie);
        });
    });

    // Cambio de Raza
    const selectRaza = document.getElementById('razaMascota');
    if (selectRaza) {
        selectRaza.addEventListener('change', (e) => {
            const contenedor = document.getElementById('contenedorRazaDetalle');
            const val = parseInt(e.target.value);
            if (contenedor) contenedor.classList.toggle('d-none', !(val === 26 || val === 27 || val === 28));
        });
    }

    // Al cerrar el modal → resetear
    const modalMascota = document.getElementById('modalRegistroMascota');
    if (modalMascota) {
        modalMascota.addEventListener('hidden.bs.modal', function () {
            document.getElementById('formNuevaMascota').reset();
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

    // Foto perfil - botón cambiar
    const changePhotoBtn = document.getElementById('changePhotoBtn');
    if (changePhotoBtn) changePhotoBtn.addEventListener('click', () => document.getElementById('photoInput').click());

    // Foto perfil - botón eliminar
    const removePhotoBtn = document.getElementById('removePhotoBtn');
    if (removePhotoBtn) {
        removePhotoBtn.addEventListener('click', () => {
            const avatarImg = document.getElementById('avatarImg');
            if (avatarImg && usuarioActual) {
                avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(usuarioActual.nombres)}+${encodeURIComponent(usuarioActual.apellidos)}&background=0D8FBF&color=fff`;
            }
            document.getElementById('photoInput').value = '';
        });
    }

    // Foto perfil - preview
    const photoInput = document.getElementById('photoInput');
    if (photoInput) {
        photoInput.addEventListener('change', (e) => {
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

    // Preferencias
    ['pref-perro', 'pref-gato', 'pref-otros'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', () => togglePreferencia(btn));
    });

    // Dropdown perfil
    const userToggle = document.getElementById('userToggle');
    const profileDropdown = document.getElementById('profileDropdown');
    if (userToggle && profileDropdown) {
        userToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.style.display = profileDropdown.style.display === 'block' ? 'none' : 'block';
        });
        document.addEventListener('click', () => {
            if (profileDropdown) profileDropdown.style.display = 'none';
        });
    }
}

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

// ================================================================
// NAVEGACIÓN
// ================================================================
window.mostrarPanel = () => { cambiarVista('view-dashboard'); cargarDashboard(); };
window.mostrarMascotas = () => { cambiarVista('view-mascotas'); cargarMascotas(); };
window.mostrarCitas = () => { cambiarVista('view-citas'); cargarCitas(); };
window.mostrarPedidos = () => { cambiarVista('view-pedidos'); cargarPedidos(); };
window.mostrarEditarPerfil = () => { cambiarVista('view-edit-profile'); cargarPerfil(); };

function cambiarVista(idVista) {
    document.querySelectorAll('main > div[id^="view-"]').forEach(v => v.classList.add('d-none'));
    const vista = document.getElementById(idVista);
    if (vista) vista.classList.remove('d-none');
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) dropdown.style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ================================================================
// HELPER FETCH
// ================================================================
async function fetchJSON(url, options = {}) {
    try {
        const response = await fetch(url, options);
        const text = await response.text();
        let json;
        try { json = JSON.parse(text); } 
        catch (parseErr) {
            console.error('📥 Respuesta NO-JSON:', text);
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

// ================================================================
// USUARIO
// ================================================================
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

function renderizarUsuarioEnUI(u) {
    if (!u) return;
    const nombreCompleto = `${u.nombres} ${u.apellidos}`;
    const avatarUrl = u.foto_usuario || 
        `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nombres)}+${encodeURIComponent(u.apellidos)}&background=0D8FBF&color=fff`;

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

// ================================================================
// DASHBOARD
// ================================================================
async function cargarDashboard() {
    try {
        const jsonDash = await fetchJSON(`${API_URL}?action=dashboard`);
        if (jsonDash.success) {
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
// MASCOTAS
// ================================================================
async function cargarMascotas() {
    const contenedor = document.getElementById('contenedor-mascotas');
    if (!contenedor) return;
    
    try {
        const json = await fetchJSON(`${API_URL}?action=mascotas`);
        if (!json.success) {
            throw new Error(json.error || 'Error al cargar mascotas');
        }
        
        // ✅ Limpiar TODO el contenedor
        contenedor.innerHTML = '';

        // 1️⃣ SIEMPRE pintamos la tarjeta de "Añadir nueva mascota" primero
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

        // 2️⃣ Si NO hay mascotas, mostramos un mensaje sutil debajo de la tarjeta de añadir
        if (!json.data || json.data.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'col-12 text-center text-muted mt-4';
            emptyMsg.innerHTML = `<p class="mb-0"><i class="fa fa-paw me-1"></i> Aún no tienes mascotas registradas. ¡Agrega la primera!</p>`;
            contenedor.appendChild(emptyMsg);
            return;
        }

        // 3️⃣ Si SÍ hay mascotas, las pintamos después de la tarjeta de añadir
        json.data.forEach(m => {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4 tarjeta-mascota';
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
        contenedor.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fa fa-exclamation-triangle fa-3x text-danger mb-3 d-block"></i>
                <p class="text-danger mb-0">Error al cargar mascotas: ${err.message}</p>
            </div>`;
    }
}

// 🆕 NUEVA FUNCIÓN: Prepara el modal para una mascota nueva y carga las razas por defecto
window.abrirModalNuevaMascota = async function() {
    const form = document.getElementById('formMascota'); // Asegúrate de que tu form tenga un ID
    if (form) form.reset();
    
    document.getElementById('mascotaIdEdit').value = '';
    document.getElementById('modalTitulo').textContent = '🐾 Registrar Mascota';
    document.getElementById('btnGuardarMascota').textContent = 'Guardar Mascota';

    document.getElementById('imgPreview').style.display = 'none';
    document.getElementById('iconCamera').style.display = 'block';
    
    // Marcar la primera especie (Perro) por defecto si existe
    const primerRadio = document.querySelector('input[name="id_especie"]');
    if (primerRadio) {
        primerRadio.checked = true;
        // Cargar las razas de esa especie inmediatamente
        await cargarRazasDinamicas(primerRadio.value);
    }

    new bootstrap.Modal(document.getElementById('modalRegistroMascota')).show();
}

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

async function guardarMascota(e) {
    e.preventDefault();
    const form = e.target;
    
    const idMascota = document.getElementById('mascotaIdEdit').value;
    const esEdicion = idMascota !== '' && idMascota !== null;

    const formData = new FormData();
    formData.append('action', 'guardar_mascota');
    
    formData.append('nombre_mascota', document.getElementById('nombreMascota').value.trim());
    
    // ✅ CORREGIDO: Validar que haya seleccionado una especie
    const radioEspecie = document.querySelector('input[name="id_especie"]:checked');
    if (!radioEspecie) {
        alert('⚠️ Por favor selecciona una especie');
        return;
    }
    formData.append('id_especie', radioEspecie.value);
    
    // Validar que haya seleccionado una raza
    const razaVal = document.getElementById('razaMascota').value;
    if (!razaVal) {
        alert('⚠️ Por favor selecciona una raza');
        return;
    }
    formData.append('id_raza', razaVal);
    
    formData.append('id_sexoMascota', document.getElementById('mascotaSelectSexo').value);
    formData.append('peso_mascota', document.getElementById('mascotaInputPeso').value);
    formData.append('edad_mascota', document.getElementById('mascotaInputEdad').value.trim());
    formData.append('color_mascota', document.getElementById('mascotaInputColor').value.trim());
    formData.append('observaciones_mascota', document.getElementById('mascotaInputObservaciones').value.trim());
    
    const espDet = document.getElementById('especie_detalle');
    const razDet = document.getElementById('raza_detalle');
    if (espDet && espDet.value.trim()) formData.append('especie_detalle', espDet.value.trim());
    if (razDet && razDet.value.trim()) formData.append('raza_detalle', razDet.value.trim());
    
    if (esEdicion) formData.append('id_mascota', idMascota);
    
    const fotoInput = document.getElementById('inputFoto');
    if (fotoInput.files && fotoInput.files[0]) {
        formData.append('foto_mascota', fotoInput.files[0]);
    }

    try {
        const json = await fetchJSON(API_URL, { method: 'POST', body: formData });
        if (json.success) {
            alert(esEdicion ? '✅ Mascota actualizada' : '✅ Mascota registrada');
            bootstrap.Modal.getInstance(document.getElementById('modalRegistroMascota')).hide();
            form.reset();
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

window.editarMascota = async function(id) {
    try {
        const json = await fetchJSON(`${API_URL}?action=mascotas`);
        if (json.success) {
            const m = json.data.find(x => x.id_mascota == id);
            if (m) {
                document.getElementById('mascotaIdEdit').value = m.id_mascota;
                document.getElementById('modalTitulo').textContent = '✏️ Editar Mascota';
                document.getElementById('btnGuardarMascota').textContent = 'Actualizar Mascota';

                document.getElementById('nombreMascota').value = m.nombre_mascota || '';
                const radio = document.querySelector(`input[name="id_especie"][value="${m.id_especie}"]`);
                if (radio) radio.checked = true;
                
                await cargarRazasDinamicas(m.id_especie);
                document.getElementById('razaMascota').value = m.id_raza || '';
                
                document.getElementById('mascotaSelectSexo').value = m.id_sexoMascota || '';
                document.getElementById('mascotaInputPeso').value = m.peso_mascota || '';
                document.getElementById('mascotaInputEdad').value = m.edad_mascota || '';
                document.getElementById('mascotaInputColor').value = m.color_mascota || '';
                document.getElementById('mascotaInputObservaciones').value = m.observaciones_mascota || '';
                
                if (parseInt(m.id_especie) === 3) {
                    document.getElementById('contenedorEspecieDetalle').classList.remove('d-none');
                    document.getElementById('especie_detalle').value = m.especie_detalle || '';
                    document.getElementById('especie_detalle').required = true;
                } else {
                    document.getElementById('contenedorEspecieDetalle').classList.add('d-none');
                    document.getElementById('especie_detalle').value = '';
                    document.getElementById('especie_detalle').required = false;
                }

                const razaId = parseInt(m.id_raza);
                if (razaId === 26 || razaId === 27 || razaId === 28) {
                    document.getElementById('contenedorRazaDetalle').classList.remove('d-none');
                    document.getElementById('raza_detalle').value = m.raza_detalle || '';
                    document.getElementById('raza_detalle').required = true;
                } else {
                    document.getElementById('contenedorRazaDetalle').classList.add('d-none');
                    document.getElementById('raza_detalle').value = '';
                    document.getElementById('raza_detalle').required = false;
                }
                
                if (m.foto_mascota) {
                    document.getElementById('imgPreview').src = m.foto_mascota;
                    document.getElementById('imgPreview').style.display = 'block';
                    document.getElementById('iconCamera').style.display = 'none';
                    document.getElementById('mascotaFotoBase64').value = m.foto_mascota;
                } else {
                    document.getElementById('imgPreview').src = '';
                    document.getElementById('imgPreview').style.display = 'none';
                    document.getElementById('iconCamera').style.display = 'block';
                    document.getElementById('mascotaFotoBase64').value = '';
                }
                
                new bootstrap.Modal(document.getElementById('modalRegistroMascota')).show();
            }
        }
    } catch (err) { console.error('❌ Error:', err); }
};

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

// 🆕 IMPORTANTE: Agregar evento change a los radios de especie para que carguen las razas dinámicamente al registrarlo
document.addEventListener('DOMContentLoaded', () => {
    const radiosEspecie = document.querySelectorAll('input[name="id_especie"]');
    radiosEspecie.forEach(radio => {
        radio.addEventListener('change', function() {
            cargarRazasDinamicas(this.value);
        });
    });
});

// ================================================================
// CITAS
// ================================================================
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
        bloquearFechasPasadas();
        
    } catch (err) { 
        console.error('❌ Error cargando mascotas:', err); 
    }
}

function bloquearFechasPasadas() {
    const inputFecha = document.getElementById('citaInputFecha');
    if (inputFecha) {
        const hoy = new Date().toISOString().split('T')[0];
        inputFecha.setAttribute('min', hoy);
    }
}

async function cargarCitas() {
    try {
        const json = await fetchJSON(`${API_URL}?action=citas`);
        if (!json.success) return;
        
        const tbody = document.getElementById('tabla-citas-cuerpo');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (json.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted"><i class="fa fa-calendar-xmark fa-2x d-block mb-2"></i>Sin citas registradas</td></tr>';
            return;
        }
        
        json.data.forEach(c => {
            const fecha = new Date(c.fecha_cita + 'T00:00:00').toLocaleDateString('es-CO', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            const horaFormateada = formatearHora(c.hora_cita);
            
            let cls = 'bg-secondary text-white';
            if (c.id_estado_cita == 1) cls = 'bg-warning text-dark';
            else if (c.id_estado_cita == 2) cls = 'bg-success text-white';
            else if (c.id_estado_cita == 3) cls = 'bg-danger text-white';
            else if (c.id_estado_cita == 4) cls = 'bg-info text-white';
            
            const btnCancelar = c.id_estado_cita == 1 ? `
                <button class="btn btn-sm btn-outline-danger rounded-pill px-2" 
                        onclick="cancelarCita(${c.id_cita})" 
                        title="Cancelar cita">
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
    } catch (err) { 
        console.error('❌ Error cargando citas:', err); 
    }
}

async function guardarCita(e) {
    e.preventDefault();
    
    const idMascota = document.getElementById('citaSelectMascota').value;
    const idServicio = document.getElementById('citaSelectServicio').value;
    const fecha = document.getElementById('citaInputFecha').value;
    const hora = document.getElementById('citaSelectHora').value;
    const notas = document.getElementById('citaInputNotas').value.trim();
    
    if (!idMascota) { alert('⚠️ Selecciona una mascota'); return; }
    if (!idServicio) { alert('⚠️ Selecciona un servicio'); return; }
    if (!fecha) { alert('⚠️ Selecciona una fecha'); return; }
    if (!hora) { alert('⚠️ Selecciona una hora'); return; }
    
    const formData = new FormData();
    formData.append('action', 'guardar_cita');
    formData.append('id_mascota', idMascota);
    formData.append('id_servicio', idServicio);
    formData.append('fecha_cita', fecha);
    formData.append('hora_cita', hora);
    formData.append('notas', notas);
    
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
            
            const form = document.getElementById('formPanelCita');
            if (form) form.reset();
            
            await Promise.all([cargarCitas(), cargarDashboard()]);
            await enviarCitaWhatsApp(idMascota, idServicio, fecha, hora, notas);
            
            alert('✅ Cita agendada correctamente');
        } else {
            alert('❌ Error: ' + (json.error || 'Desconocido'));
        }
    } catch (err) {
        alert('❌ Error al agendar: ' + err.message);
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = textoOriginal;
        }
    }
}

async function enviarCitaWhatsApp(idMascota, idServicio, fecha, hora, notas) {
    try {
        const jsonMascotas = await fetchJSON(`${API_URL}?action=mascotas`);
        const mascota = jsonMascotas.data.find(m => m.id_mascota == idMascota);
        
        if (!mascota) {
            console.warn('No se encontró la mascota para WhatsApp');
            return;
        }
        
        const usuario = usuarioActual || {};
        
        let nombreServicio = 'Servicio';
        if (cacheServicios.length > 0) {
            const servicio = cacheServicios.find(s => s.id_servicio == idServicio);
            if (servicio) nombreServicio = servicio.nombre;
        } else {
            try {
                const jsonServ = await fetchJSON(`${API_URL}?action=servicios_activos`);
                if (jsonServ.success) {
                    cacheServicios = jsonServ.data;
                    const servicio = cacheServicios.find(s => s.id_servicio == idServicio);
                    if (servicio) nombreServicio = servicio.nombre;
                }
            } catch (e) {
                console.warn('No se pudo cargar servicios para WhatsApp');
            }
        }
        
        const fechaFormateada = new Date(fecha + 'T00:00:00').toLocaleDateString('es-CO', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const horaFormateada = formatearHora(hora);
        const nroTelefono = "573016540576";
        
        const mensaje = 
`*NUEVA CITA - VÍA CANES* 🐾%0A` +
`----------------------------%0A` +
`*👤 Cliente:* ${usuario.nombres || ''} ${usuario.apellidos || ''}%0A` +
`*📱 Tel:* ${usuario.celular || 'N/A'}%0A` +
`*🐶 Mascota:* ${mascota.nombre_mascota}%0A` +
`*📋 Especie:* ${mascota.especie || 'N/A'} • ${mascota.raza || 'Sin raza'}%0A` +
`*✨ Servicio:* ${nombreServicio}%0A` +
`*📅 Fecha:* ${fechaFormateada}%0A` +
`*⏰ Hora:* ${horaFormateada}%0A` +
`*⚠️ Notas:* ${notas || 'Ninguna'}%0A` +
`----------------------------%0A` +
`_Enviado desde el panel de usuario_`;

        const url = `https://api.whatsapp.com/send?phone=${nroTelefono}&text=${mensaje}`;
        window.open(url, '_blank');
        
    } catch (err) {
        console.error('❌ Error enviando WhatsApp:', err);
    }
}

window.cancelarCita = async function(id) {
    if (!confirm('¿Estás seguro de cancelar esta cita?')) return;
    
    try {
        const formData = new FormData();
        formData.append('action', 'cancelar_cita');
        formData.append('id_cita', id);
        
        const json = await fetchJSON(API_URL, { method: 'POST', body: formData });
        
        if (json.success) {
            alert('✅ Cita cancelada correctamente');
            await Promise.all([cargarCitas(), cargarDashboard()]);
        } else {
            alert('❌ Error: ' + (json.error || 'Desconocido'));
        }
    } catch (err) { 
        alert('❌ Error al cancelar: ' + err.message); 
    }
};

function formatearHora(horaStr) {
    if (!horaStr || typeof horaStr !== 'string') return '';
    
    try {
        const partes = horaStr.split(':');
        if (partes.length < 2) return horaStr;
        
        const h = parseInt(partes[0], 10);
        const m = partes[1] || '00';
        
        if (isNaN(h) || h < 0 || h > 23) return horaStr;
        
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hora12 = h % 12 || 12;
        return `${hora12}:${m} ${ampm}`;
    } catch (err) {
        console.warn('Error formateando hora:', horaStr);
        return horaStr;
    }
}

// ================================================================
// PEDIDOS
// ================================================================
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
                const productos = p.detalles?.length > 0 ? p.detalles.map(d => d.nombre).join(', ') : 'N/A';
                tbody.innerHTML += `
                    <tr>
                        <td class="px-4 fw-bold text-primary">#${p.id_pedido}</td>
                        <td>${fecha}</td>
                        <td>${productos}</td>
                        <td class="text-end fw-bold">$${Number(p.total || 0).toLocaleString('es-CO')}</td>
                        <td class="text-center"><span class="badge bg-info text-white rounded-pill px-3 py-1">${p.estado || 'N/A'}</span></td>
                        <td class="text-end px-4"><button class="btn btn-sm btn-dark rounded-pill text-white">Ver</button></td>
                    </tr>`;
            });
        }
    } catch (err) { console.error('❌ Error:', err); }
}

// ================================================================
// EDITAR PERFIL 
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

    const setVal = (id, val) => { 
        const el = document.getElementById(id); 
        if (el) {
            el.value = val || '';
        }
    };
    
    // ✅ CORREGIDO: Asegurar que id_tipo_id tenga un valor válido (default 1 si viene null)
    setVal('id_tipo_id', u.id_tipo_id || 1);
    setVal('nuevoDocumento', u.numero_documento);
    setVal('nuevoNombre', u.nombres);
    setVal('nuevoApellido', u.apellidos);
    setVal('nuevoCorreo', u.email);
    setVal('nuevoTelefono', u.celular);
    setVal('id_localidad', u.id_localidad || 1);
    setVal('nuevoDireccion', u.direccion);
    setVal('newPassword', '');
    setVal('confirmPassword', '');
    
    const photoInput = document.getElementById('photoInput');
    if (photoInput) photoInput.value = '';
}

async function guardarPerfil(e) {
    e.preventDefault();
    
    // ✅ NUEVO: Validar campos obligatorios antes de enviar
    const idTipoId = document.getElementById('id_tipo_id').value;
    if (!idTipoId) {
        alert('⚠️ Selecciona un tipo de identificación');
        document.getElementById('id_tipo_id').focus();
        return;
    }
    
    const nuevoDocumento = document.getElementById('nuevoDocumento').value.trim();
    if (!nuevoDocumento) {
        alert('⚠️ El número de documento es obligatorio');
        document.getElementById('nuevoDocumento').focus();
        return;
    }
    
    const nuevoNombre = document.getElementById('nuevoNombre').value.trim();
    if (!nuevoNombre) {
        alert('⚠️ El nombre es obligatorio');
        document.getElementById('nuevoNombre').focus();
        return;
    }
    
    const nuevoApellido = document.getElementById('nuevoApellido').value.trim();
    if (!nuevoApellido) {
        alert('⚠️ El apellido es obligatorio');
        document.getElementById('nuevoApellido').focus();
        return;
    }
    
    const nuevoCorreo = document.getElementById('nuevoCorreo').value.trim();
    if (!nuevoCorreo) {
        alert('⚠️ El correo es obligatorio');
        document.getElementById('nuevoCorreo').focus();
        return;
    }
    
    // ✅ NUEVO: Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(nuevoCorreo)) {
        alert('⚠️ El formato del correo no es válido');
        document.getElementById('nuevoCorreo').focus();
        return;
    }
    
    const nuevoTelefono = document.getElementById('nuevoTelefono').value.trim();
    if (!nuevoTelefono) {
        alert('⚠️ El teléfono es obligatorio');
        document.getElementById('nuevoTelefono').focus();
        return;
    }
    
    // ✅ NUEVO: Validar formato de celular (mínimo 10 dígitos, solo números)
    const telLimpio = nuevoTelefono.replace(/\D/g, '');
    if (telLimpio.length < 7) {
        alert('⚠️ El teléfono debe tener al menos 10 dígitos');
        document.getElementById('nuevoTelefono').focus();
        return;
    }
    
    const idLocalidad = document.getElementById('id_localidad').value;
    if (!idLocalidad) {
        alert('⚠️ Selecciona una localidad');
        document.getElementById('id_localidad').focus();
        return;
    }
    
    const pass = document.getElementById('newPassword').value;
    const confPass = document.getElementById('confirmPassword').value;
    
    if (pass && pass !== confPass) { 
        alert('❌ Las contraseñas no coinciden'); 
        document.getElementById('confirmPassword').focus();
        return; 
    }
    if (pass && pass.length < 6) { 
        alert('❌ La contraseña debe tener mínimo 6 caracteres'); 
        document.getElementById('newPassword').focus();
        return; 
    }

    const formData = new FormData();
    formData.append('action', 'actualizar_perfil');
    formData.append('id_tipo_id', idTipoId);
    formData.append('numero_documento', nuevoDocumento);
    formData.append('nombres', nuevoNombre);
    formData.append('apellidos', nuevoApellido);
    formData.append('email', nuevoCorreo);
    formData.append('celular', nuevoTelefono);
    formData.append('id_localidad', idLocalidad);
    formData.append('direccion', document.getElementById('nuevoDireccion').value.trim());
    
    if (pass) {
        formData.append('nueva_contrasena', pass);
    }

    const photoInput = document.getElementById('photoInput');
    if (photoInput.files && photoInput.files[0]) {
        formData.append('foto_usuario', photoInput.files[0]);
    }
        // 🗑️ NUEVO: Enviar la orden de eliminar foto si el usuario marcó la opción
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
            await cargarDatosUsuario();
            cargarPerfil();
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
document.addEventListener('DOMContentLoaded', function() {
    const removePhotoBtn = document.getElementById('removePhotoBtn');
    const flagInput = document.getElementById('usrEliminarFotoFlag');
    const avatarImg = document.getElementById('avatarImg');
    const photoInput = document.getElementById('photoInput');

    if (removePhotoBtn) {
        removePhotoBtn.addEventListener('click', function() {
            if (!confirm('¿Estás seguro de quitar tu foto de perfil? Se eliminará al guardar los cambios.')) return;
            
            // 1. Activar la orden de eliminación
            if (flagInput) flagInput.value = '1';
            
            // 2. Leer el nombre y apellido de los inputs del formulario
            const nombre = document.getElementById('nuevoNombre')?.value || '';
            const apellido = document.getElementById('nuevoApellido')?.value || '';
            
            // 3. Generar las iniciales (ej: "Carlos Mendoza" -> "Carlos+Mendoza")
            const nombreCompleto = encodeURIComponent(nombre + ' ' + apellido);
            
            // 4. Cambiar la imagen visual a las iniciales
            if (avatarImg) {
                avatarImg.src = `https://ui-avatars.com/api/?name=${nombreCompleto}&background=0D8FBF&color=fff&size=200`;
            }
            
            // 5. Limpiar el input de archivo por si habían seleccionado una foto nueva
            if (photoInput) photoInput.value = '';
        });
    }

    // Si el usuario selecciona una foto nueva, cancelamos la orden de eliminar
    if (photoInput) {
        photoInput.addEventListener('change', function() {
            if (flagInput) flagInput.value = '0';
        });
    }
});
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
    try { await fetch(`${API_URL}?action=cerrar_sesion`, { method: 'POST' }); } 
    catch (err) { console.error('Error cerrando sesión:', err); }
    window.location.href = '/via_canes/html/auth.html';
};