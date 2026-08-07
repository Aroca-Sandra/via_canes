// ================================================================
//  MÓDULO 6:  MOD-PROMOCIONES
// ================================================================
let promosData = [];

async function cargarPromociones() {
    const [promos, prods] = await Promise.all([
        apiFetch('listar_promociones', null, 'GET'),
        apiFetch('listar_productos', null, 'GET')
    ]);
    
    if (promos.success) promosData = promos.data || [];
    if (prods.success) llenarSelect('asigProducto', prods.data, 'Seleccionar...');
    
    const selPromo = document.getElementById('asigPromo');
    if (selPromo && promos.success) {
        selPromo.innerHTML = '<option value="">Seleccionar...</option>' +
            promos.data.map(p => `<option value="${p.id_promo}">${p.nombre}</option>`).join('');
    }
    
    renderPromociones();
}

function renderPromociones() {
    const tbody = document.getElementById('tablaPromos');
    
    if (!promosData.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay promociones</td></tr>';
        return;
    }
    
    tbody.innerHTML = promosData.map(p => `
        <tr>
            <td>${p.id_promo}</td>
            <td>
                <strong>${p.nombre}</strong>
                <br><small class="text-muted">${(p.descripcion || '').substring(0, 40)}${p.descripcion && p.descripcion.length > 40 ? '...' : ''}</small>
            </td>
            <td>${p.tipo_descuento == 'porcentaje' ? p.valor + '%' : '$' + parseFloat(p.valor).toLocaleString('es-CO')}</td>
            <td><span class="badge bg-info">${p.tipo_descuento}</span></td>
            <td>${new Date(p.fecha_inicio + 'T12:00:00').toLocaleDateString('es-CO')}</td>
            <td>${new Date(p.fecha_fin + 'T12:00:00').toLocaleDateString('es-CO')}</td>
            <td>
                <span class="badge bg-${p.id_estado_promocion == 1 ? 'success' : 'secondary'}">
                    ${p.estado_nombre || ''}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarPromo(${p.id_promo})">
                    <i class="fa fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    renderProductosPromo();
}

function renderProductosPromo() {
    const cont = document.getElementById('listaProdPromo');
    const idPromo = document.getElementById('asigPromo').value;
    
    if (!idPromo) {
        cont.innerHTML = '';
        return;
    }
    
    const promo = promosData.find(p => p.id_promo == idPromo);
    if (!promo || !promo.productos || !promo.productos.length) {
        cont.innerHTML = '<small class="text-muted">Sin productos vinculados</small>';
        return;
    }
    
    cont.innerHTML = promo.productos.map(pp => `
        <div class="d-flex align-items-center gap-2 p-2 border rounded mb-1">
            <span class="flex-grow-1 small">${pp.producto_nombre}</span>
            <button class="btn btn-sm btn-outline-danger" onclick="desvincularProductoPromo(${pp.id_producto_promocion})">
                <i class="fa fa-times"></i>
            </button>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formPromo');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            const data = {
                id_promo: '',
                nombre: document.getElementById('promoNombre').value,
                descripcion: document.getElementById('promoDesc').value,
                valor: document.getElementById('promoValor').value,
                tipo_descuento: document.getElementById('promoTipo').value,
                fecha_inicio: document.getElementById('promoInicio').value,
                fecha_fin: document.getElementById('promoFin').value,
                id_estado_promocion: 1
            };
            
            const res = await apiFetch('guardar_promocion', data);
            
            if (res.success) {
                showToast(res.message);
                form.reset();
                promosData = [];
                cargarPromociones();
            } else {
                showToast(res.error, 'danger');
            }
        });
    }
    
    const selPromo = document.getElementById('asigPromo');
    if (selPromo) {
        selPromo.addEventListener('change', renderProductosPromo);
    }
});

async function asignarProductoPromo() {
    const idPromo = document.getElementById('asigPromo').value;
    const idProd = document.getElementById('asigProducto').value;
    
    if (!idPromo || !idProd) {
        showToast('Selecciona promoción y producto', 'warning');
        return;
    }
    
    const res = await apiFetch('asignar_producto_promo', { id_promo: idPromo, id_producto: idProd });
    
    if (res.success) {
        showToast(res.message);
        promosData = [];
        cargarPromociones();
    } else {
        showToast(res.error, 'danger');
    }
}

async function desvincularProductoPromo(id) {
    if (!confirmar('¿Desvincular producto?')) return;
    
    const res = await apiFetch('desvincular_producto_promo', { id_producto_promocion: id });
    
    if (res.success) {
        showToast(res.message);
        promosData = [];
        cargarPromociones();
    } else {
        showToast(res.error, 'danger');
    }
}

async function eliminarPromo(id) {
    if (!confirmar('¿Eliminar esta promoción?')) return;
    
    const res = await apiFetch('eliminar_promocion', { id_promo: id });
    
    if (res.success) {
        showToast(res.message);
        promosData = [];
        cargarPromociones();
    } else {
        showToast(res.error, 'danger');
    }
}