// ================================================================
// MOD-PEDIDOS
// ================================================================
let pedidosData = [];

async function cargarPedidos() {
    const res = await apiFetch('listar_pedidos_admin', null, 'GET');
    if (!res.success) return showToast(res.error, 'danger');
    
    pedidosData = res.data || [];
    renderPedidos();
}

function renderPedidos() {
    const tbody = document.getElementById('tablaPedidos');
    
    if (!pedidosData.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay pedidos</td></tr>';
        return;
    }
    
    tbody.innerHTML = pedidosData.map(p => `
        <tr>
            <td>${p.id_pedido}</td>
            <td>${new Date(p.fecha + 'T12:00:00').toLocaleDateString('es-CO')}</td>
            <td>${p.nombres} ${p.apellidos}</td>
            <td><strong>$${parseFloat(p.total).toLocaleString('es-CO')}</strong></td>
            <td>
                <select class="form-select form-select-sm" onchange="cambiarEstadoPedido(${p.id_pedido}, this.value)" style="width:auto;font-size:.75rem;">
                    <option value="1" ${p.id_estado_pedido == 1 ? 'selected' : ''}>Pendiente</option>
                    <option value="2" ${p.id_estado_pedido == 2 ? 'selected' : ''}>En proceso</option>
                    <option value="3" ${p.id_estado_pedido == 3 ? 'selected' : ''}>Enviado</option>
                    <option value="4" ${p.id_estado_pedido == 4 ? 'selected' : ''}>Cancelado</option>
                    <option value="5" ${p.id_estado_pedido == 5 ? 'selected' : ''}>Entregado</option>
                </select>
            </td>
            <td>${p.pago ? (p.pago.metodo_pago || '-') : '-'}</td>
            <td>
                <span class="badge bg-${p.pago && p.pago.id_estado_pago == 2 ? 'success' : 'warning'}">
                    ${p.pago ? (p.pago.estado_pago || 'Pendiente') : 'Sin pago'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-info" onclick="verDetallePedido(${p.id_pedido})">
                    <i class="fa fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function cambiarEstadoPedido(id, estado) {
    const res = await apiFetch('actualizar_estado_pedido', { id_pedido: id, id_estado_pedido: estado });
    
    if (res.success) {
        showToast('Estado actualizado');
        pedidosData = [];
        cargarPedidos();
    } else {
        showToast(res.error, 'danger');
    }
}

async function verDetallePedido(id) {
    const p = pedidosData.find(x => x.id_pedido == id);
    if (!p) return;
    
    const body = document.getElementById('detallePedidoBody');
    body.innerHTML = `
        <div class="mb-3">
            <h6 class="fw-bold">Cliente: ${p.nombres} ${p.apellidos}</h6>
            <small class="text-muted">Fecha: ${new Date(p.fecha + 'T12:00:00').toLocaleDateString('es-CO')}</small>
        </div>
        <h6 class="fw-bold">Productos:</h6>
        <div class="table-responsive">
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Cant.</th>
                        <th>Precio</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${(p.detalles || []).map(d => `
                        <tr>
                            <td>
                                <img src="${d.imagen_url || '../img/placeholder.png'}" 
                                     style="width:30px;height:30px;object-fit:cover;border-radius:4px;" 
                                     class="me-2">
                                ${d.nombre}
                            </td>
                            <td>${d.cantidad}</td>
                            <td>$${parseFloat(d.precio_unitario).toLocaleString('es-CO')}</td>
                            <td>$${parseFloat(d.subtotal).toLocaleString('es-CO')}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <th colspan="3" class="text-end">Total:</th>
                        <th>$${parseFloat(p.total).toLocaleString('es-CO')}</th>
                    </tr>
                </tfoot>
            </table>
        </div>
        ${p.pago ? `
            <div class="mt-3 p-2 bg-light rounded">
                <strong>Método de pago:</strong> ${p.pago.metodo_pago || '-'}<br>
                <strong>Estado:</strong> 
                <span class="badge bg-${p.pago.id_estado_pago == 2 ? 'success' : 'warning'}">
                    ${p.pago.estado_pago || '-'}
                </span>
            </div>
        ` : ''}
    `;
    
    new bootstrap.Modal(document.getElementById('modalDetallePedido')).show();
}