// ================================================================
// MOD-PROVEEDORES (CORREGIDO: Dirección y Marcas)
// ================================================================
let proveedoresData = [];

async function cargarProveedores() {
    const res = await apiFetch('listar_proveedores', null, 'GET');
    if (!res.success) return showToast(res.error, 'danger');
    
    proveedoresData = res.data || [];
    document.getElementById('provTotal').textContent = proveedoresData.length;
    renderProveedores();
}

function renderProveedores() {
    const buscar = (document.getElementById('buscarProveedor')?.value || '').toLowerCase();
    const filtrados = proveedoresData.filter(p => 
        p.nombre_empresa.toLowerCase().includes(buscar) ||
        (p.nit_cedula || '').toLowerCase().includes(buscar) ||
        (p.contacto_nombre || '').toLowerCase().includes(buscar) ||
        (p.marcas || '').toLowerCase().includes(buscar) // Permite buscar por marca también
    );
    
    const tbody = document.getElementById('tablaProveedores');
    
    if (!filtrados.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No hay proveedores</td></tr>'; // Colspan cambiado a 9
        return;
    }
    
    tbody.innerHTML = filtrados.map(p => `
        <tr>
            <td>${p.id_proveedor}</td>
            <td><strong>${p.nombre_empresa}</strong></td>
            <td>${p.nit_cedula || ''}</td>
            <td>${p.contacto_nombre || ''}</td>
            <td>${p.telefono || ''}</td>
            <td><small>${p.correo || ''}</small></td>
            <!-- NUEVAS COLUMNAS -->
            <td><small>${p.direccion || '-'}</small></td>
            <td><small>${p.marcas || '-'}</small></td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editarProveedor(${p.id_proveedor})">
                    <i class="fa fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarProveedor(${p.id_proveedor})">
                    <i class="fa fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function editarProveedor(id) {
    const p = proveedoresData.find(x => x.id_proveedor == id);
    if (!p) return;
    
    document.getElementById('provIdEdit').value = p.id_proveedor;
    document.getElementById('provEmpresa').value = p.nombre_empresa;
    document.getElementById('provNit').value = p.nit_cedula;
    document.getElementById('provContacto').value = p.contacto_nombre;
    document.getElementById('provTelefono').value = p.telefono;
    document.getElementById('provCorreo').value = p.correo;
    // NUEVOS CAMPOS
    document.getElementById('provDireccion').value = p.direccion || '';
    document.getElementById('provMarcas').value = p.marcas || '';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formProveedor');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            const data = {
                id_proveedor: document.getElementById('provIdEdit').value,
                nombre_empresa: document.getElementById('provEmpresa').value,
                nit_cedula: document.getElementById('provNit').value,
                contacto_nombre: document.getElementById('provContacto').value,
                telefono: document.getElementById('provTelefono').value,
                correo: document.getElementById('provCorreo').value,
                // NUEVOS CAMPOS
                direccion: document.getElementById('provDireccion').value.trim(),
                marcas: document.getElementById('provMarcas').value.trim()
            };
            
            const res = await apiFetch('guardar_proveedor', data);
            
            if (res.success) {
                showToast(res.message);
                limpiarFormProveedor();
                proveedoresData = [];
                cargarProveedores();
            } else {
                showToast(res.error, 'danger');
            }
        });
    }
});

function limpiarFormProveedor() {
    document.getElementById('formProveedor').reset();
    document.getElementById('provIdEdit').value = '';
}

async function eliminarProveedor(id) {
    if (!confirmar('¿Eliminar este proveedor?')) return;
    
    const res = await apiFetch('eliminar_proveedor', { id_proveedor: id });
    
    if (res.success) {
        showToast(res.message);
        proveedoresData = [];
        cargarProveedores();
    } else {
        showToast(res.error, 'danger');
    }
}