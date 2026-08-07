// ================================================================
// MÓDULO 4: MOD-CITAS
// ================================================================
let citasData = [];
let filtroCitasActual = 'hoy';

async function cargarCitas() {
    // 🔧 CORREGIDO: Solo cargar citas, no clientes ni servicios (ya están en caché)
    const res = await apiFetch('listar_citas', null, 'GET');
    if (res.success) {
        citasData = res.data || [];
        renderCitas();
    } else {
        showToast(res.error, 'danger');
    }
}

// 🔧 NUEVO: Cargar selects de citas solo una vez
async function inicializarSelectsCitas() {
    const [clientes, servicios] = await Promise.all([
        apiFetch('listar_clientes', null, 'GET'),
        apiFetch('listar_servicios', null, 'GET')
    ]);
    
    if (clientes.success) {
        const sel = document.getElementById('citaCliente');
        if (sel) {
            sel.innerHTML = '<option value="">Seleccionar...</option>' +
                clientes.data.map(c => `<option value="${c.id_usuario}">${c.nombre_completo}</option>`).join('');
        }
    }
    
    if (servicios.success) {
        llenarSelect('citaServicio', servicios.data, 'Seleccionar...');
    }
}

function filtrarCitas(filtro, btn) {
    filtroCitasActual = filtro;
    document.querySelectorAll('#mod-citas .btn-group button').forEach(b => {
        b.className = b.className.replace(/btn-(dark|primary|warning|info|success|secondary)/g, 'btn-outline-$1');
    });
    if (btn) {
        const claseActual = btn.className.match(/btn-outline-(\w+)/);
        if (claseActual) {
            btn.className = btn.className.replace(`btn-outline-${claseActual[1]}`, `btn-${claseActual[1]}`);
        }
    }
    renderCitas();
}

function renderCitas() {
    let data = citasData;
    const hoy = new Date().toISOString().split('T')[0];
    
    // 🔧 CORREGIDO: Filtros según la BD (3=Cancelada, 4=Completada)
    switch (filtroCitasActual) {
        case 'hoy': data = data.filter(c => c.fecha_cita === hoy); break;
        case 'pendientes': data = data.filter(c => c.id_estado_cita == 1); break;
        case 'confirmadas': data = data.filter(c => c.id_estado_cita == 2); break;
        case 'canceladas': data = data.filter(c => c.id_estado_cita == 3); break; // 🔧 CORREGIDO
        case 'completadas': data = data.filter(c => c.id_estado_cita == 4); break; // 🔧 CORREGIDO
    }
    
    const tbody = document.getElementById('tablaCitas');
    
    if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No hay citas</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(c => {
        // 🔧 NUEVO: Colores para estados
        const colores = {
            1: 'warning',   // Pendiente
            2: 'info',      // Confirmada
            3: 'danger',    // Cancelada
            4: 'success'    // Completada
        };
        const color = colores[c.id_estado_cita] || 'secondary';
        
        // 🔧 NUEVO: Formatear fecha correctamente
        const fecha = new Date(c.fecha_cita + 'T12:00:00');
        const fechaStr = fecha.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        return `
        <tr>
            <td><strong>#${c.id_cita}</strong></td>
            <td>${fechaStr}</td>
            <td><strong>${c.hora_cita}</strong></td>
            <td><small>${c.nombres} ${c.apellidos}</small></td>
            <td><small>${c.nombre_mascota || '-'}</small></td>
            <td><small>${c.servicio || '-'}</small></td>
            <td>
                <select class="form-select form-select-sm" onchange="cambiarEstadoCita(${c.id_cita}, this.value)" style="width:auto;font-size:.75rem;">
                    <option value="1" ${c.id_estado_cita == 1 ? 'selected' : ''}>Pendiente</option>
                    <option value="2" ${c.id_estado_cita == 2 ? 'selected' : ''}>Confirmada</option>
                    <option value="3" ${c.id_estado_cita == 3 ? 'selected' : ''}>Cancelada</option>
                    <option value="4" ${c.id_estado_cita == 4 ? 'selected' : ''}>Completada</option>
                </select>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarCita(${c.id_cita})" title="Eliminar">
                    <i class="fa fa-trash"></i>
                </button>
            </td>
        </tr>
    `}).join('');
}

async function cambiarEstadoCita(id, estado) {
    const res = await apiFetch('actualizar_estado_cita', { id_cita: id, id_estado_cita: estado });
    
    if (res.success) {
        showToast('✅ Estado actualizado');
        // 🔧 CORREGIDO: Actualizar solo el array local, no recargar todo
        const cita = citasData.find(c => c.id_cita == id);
        if (cita) cita.id_estado_cita = estado;
        renderCitas();
    } else {
        showToast(res.error, 'danger');
    }
}

async function eliminarCita(id) {
    if (!confirmar('¿Eliminar esta cita?')) return;
    
    const res = await apiFetch('eliminar_cita_admin', { id_cita: id });
    
    if (res.success) {
        showToast('✅ ' + res.message);
        // 🔧 CORREGIDO: Eliminar solo del array local
        citasData = citasData.filter(c => c.id_cita != id);
        renderCitas();
    } else {
        showToast(res.error, 'danger');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 🔧 NUEVO: Inicializar selects de citas
    inicializarSelectsCitas();
    
    // Listener para cargar mascotas al cambiar cliente
    const selCliente = document.getElementById('citaCliente');
    if (selCliente) {
        selCliente.addEventListener('change', async function() {
            const selMas = document.getElementById('citaMascota');
            if (!this.value) {
                selMas.innerHTML = '<option value="">Primero seleccione cliente</option>';
                return;
            }
            
            await cargarMascotasDelCliente(this.value);
        });
    }
    
    // Listener del formulario de cita
    const formCita = document.getElementById('formCita');
    if (formCita) {
        formCita.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // 🔧 NUEVO: Validar fecha
            const fecha = document.getElementById('citaFecha').value;
            const hoy = new Date().toISOString().split('T')[0];
            if (fecha < hoy) {
                showToast('⚠️ La fecha no puede ser pasada', 'warning');
                return;
            }
            
            if (!formCita.checkValidity()) {
                formCita.reportValidity();
                return;
            }
            
            const data = {
                id_usuario: document.getElementById('citaCliente').value,
                id_mascota: document.getElementById('citaMascota').value,
                id_servicio: document.getElementById('citaServicio').value,
                fecha: fecha,
                hora: document.getElementById('citaHora').value,
                notas: document.getElementById('citaNotas').value,
                id_estado_cita: 1
            };
            
            const res = await apiFetch('guardar_cita_admin', data);
            
            if (res.success) {
                showToast('✅ ' + res.message);
                formCita.reset();
                // 🔧 NUEVO: Limpiar select de mascotas
                document.getElementById('citaMascota').innerHTML = '<option value="">Primero seleccione cliente</option>';
                citasData = [];
                cargarCitas();
            } else {
                showToast('❌ ' + res.error, 'danger');
            }
        });
    }
});

// 🔧 NUEVO: Función para cargar mascotas del cliente (reutilizable)
async function cargarMascotasDelCliente(idUsuario) {
    const selMas = document.getElementById('citaMascota');
    if (!idUsuario) {
        selMas.innerHTML = '<option value="">Primero seleccione cliente</option>';
        return;
    }
    
    const res = await apiFetch('listar_mascotas_por_cliente', { id_usuario: idUsuario }, 'GET');
    if (res.success) {
        selMas.innerHTML = '<option value="">Seleccionar...</option>' +
            res.data.map(m => `<option value="${m.id_mascota}">${m.nombre_mascota}</option>`).join('');
    }
}

// 🔧 CORREGIDO: Abrir modal de usuario y actualizar select después
function abrirModalUsuarioDesdeCita() {
    prepararModalUsuarioNormal();
    const modal = new bootstrap.Modal(document.getElementById('modalUsuario'));
    
    // 🔧 NUEVO: Listener para actualizar selects cuando se cierra el modal
    document.getElementById('modalUsuario').addEventListener('hidden.bs.modal', async function handler() {
        // Actualizar selects de clientes
        await actualizarSelectsClientes();
        // Restaurar el cliente seleccionado si existe
        const clienteSeleccionado = document.getElementById('citaCliente').value;
        if (clienteSeleccionado) {
            document.getElementById('citaCliente').value = clienteSeleccionado;
        }
        // Remover el listener para que no se ejecute múltiples veces
        this.removeEventListener('hidden.bs.modal', handler);
    }, { once: true });
    
    modal.show();
}

// 🔧 ELIMINADO: toggleMiniFormMascota() y guardarMascotaRapida() 
// Ya están en mod-mascotas.js y son reutilizables