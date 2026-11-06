// ================================================================
// MOD-PEDIDOS — Vía Canes (Panel Administrativo)
// Versión corregida: FIX "Invalid Date" en la columna FECHA.
// ================================================================
//
// 🔧 BUG CORREGIDO:
//   Antes se hacía:  new Date(p.fecha + 'T12:00:00')
//   Pero MySQL devuelve p.fecha como "2024-01-15 10:30:00" (con ESPACIO),
//   y al concatenar 'T12:00:00' quedaba "2024-01-15 10:30:00T12:00:00"
//   → fecha inválida → "Invalid Date".
//
//   Ahora se usa la función `formatearFecha()` que normaliza cualquier
//   formato (datetime con espacio, ISO con T, o solo fecha YYYY-MM-DD).
// ================================================================

let pedidosData = [];

// ────────────────────────────────────────────────────────────────────────
// 📅 UTILIDAD DE FECHA — normaliza cualquier formato que devuelva MySQL
// ────────────────────────────────────────────────────────────────────────
function formatearFecha(fecha) {
    if (!fecha) return '—';

    let str = String(fecha).trim();

    // Caso 1: "2024-01-15 10:30:00" (datetime MySQL con espacio) → reemplazar espacio por "T"
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) {
        str = str.replace(' ', 'T');
    }
    // Caso 2: "2024-01-15" (solo fecha) → añadir T12:00:00 para evitar desfase de zona horaria
    else if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        str = str + 'T12:00:00';
    }
    // Caso 3: ya viene ISO con "T" → se deja tal cual

    const d = new Date(str);

    // Si no se pudo parsear, devolver el string original como fallback
    if (isNaN(d.getTime())) return String(fecha);

    return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Versión extendida con hora, para el modal de detalle
function formatearFechaHora(fecha) {
    if (!fecha) return '—';
    let str = String(fecha).trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) {
        str = str.replace(' ', 'T');
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        str = str + 'T12:00:00';
    }
    const d = new Date(str);
    if (isNaN(d.getTime())) return String(fecha);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
         + ' · ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

// ────────────────────────────────────────────────────────────────────────
// 📦 CARGAR LISTADO DE PEDIDOS
// ────────────────────────────────────────────────────────────────────────
async function cargarPedidos() {
    const res = await apiFetch('listar_pedidos_admin', null, 'GET');
    if (!res.success) return showToast(res.error || 'Error al cargar pedidos', 'danger');

    pedidosData = res.data || [];
    renderPedidos();
}

function renderPedidos() {
    const tbody = document.getElementById('tablaPedidos');
    if (!tbody) return;

    if (!pedidosData.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4"><i class="fa fa-inbox fa-2x d-block mb-2 opacity-25"></i>No hay pedidos</td></tr>';
        return;
    }

    tbody.innerHTML = pedidosData.map(p => `
        <tr>
            <td class="fw-bold text-primary">#${p.id_pedido}</td>
            <td>${formatearFecha(p.fecha)}</td>
            <td>${p.nombres || ''} ${p.apellidos || ''}</td>
            <td><strong>$${parseFloat(p.total || 0).toLocaleString('es-CO')}</strong></td>
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
                <button class="btn btn-sm btn-outline-info" onclick="verDetallePedido(${p.id_pedido})" title="Ver detalle">
                    <i class="fa fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// ────────────────────────────────────────────────────────────────────────
// 🔄 CAMBIAR ESTADO DEL PEDIDO
//    (conecta con el sistema de notificaciones: avisa al usuario)
// ────────────────────────────────────────────────────────────────────────
async function cambiarEstadoPedido(id, estado) {
    const res = await apiFetch('actualizar_estado_pedido', { id_pedido: id, id_estado_pedido: estado });

    if (res.success) {
        const estados = { 1: 'Pendiente', 2: 'En proceso', 3: 'Enviado', 4: 'Cancelado', 5: 'Entregado' };
        showToast(`Pedido #${id} → ${estados[estado] || 'actualizado'}`, 'success');

        // Recargar sin perder la posición del scroll
        await cargarPedidos();
    } else {
        showToast(res.error || 'Error al actualizar', 'danger');
        // Revertir el select en la UI si falló
        cargarPedidos();
    }
}

// ────────────────────────────────────────────────────────────────────────
// 👁 VER DETALLE DEL PEDIDO
//    Si el pedido ya trajo `detalles` desde listar_pedidos_admin, se usan.
//    Si no, hace fetch al endpoint `ver_pedido_admin` para obtenerlos.
// ────────────────────────────────────────────────────────────────────────
async function verDetallePedido(id) {
    const p = pedidosData.find(x => x.id_pedido == id);
    if (!p) {
        showToast('Pedido no encontrado', 'danger');
        return;
    }

    const body = document.getElementById('detallePedidoBody');
    if (!body) return;

    // Mostrar spinner mientras carga
    body.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary"></div>
            <p class="mt-2 mb-0 small text-muted">Cargando detalle...</p>
        </div>`;

    const modalEl = document.getElementById('modalDetallePedido');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();

    // Si el pedido no trae detalles desde el listado, pedirlos al servidor
    let pedido = { ...p };
    if (!pedido.detalles || !pedido.detalles.length) {
        try {
            const res = await apiFetch('ver_pedido_admin', { id_pedido: id }, 'GET');
            if (res.success && res.data) {
                pedido = { ...pedido, ...res.data };
            }
        } catch (err) {
            console.warn('No se pudo cargar el detalle del pedido:', err);
        }
    }

    // Renderizar el detalle
    const detalles = pedido.detalles || [];

    body.innerHTML = `
        <div class="mb-3">
            <h6 class="fw-bold">Pedido #${pedido.id_pedido} — ${pedido.nombres || ''} ${pedido.apellidos || ''}</h6>
            <small class="text-muted">
                <i class="fa fa-calendar me-1"></i>${formatearFechaHora(pedido.fecha)}
            </small>
        </div>

        ${pedido.direccion_envio ? `
            <div class="mb-3 p-2 bg-light rounded small">
                <i class="fa fa-location-dot me-1 text-primary"></i>
                <strong>Dirección de envío:</strong> ${pedido.direccion_envio}
            </div>` : ''}

        <h6 class="fw-bold mb-2">Productos (${detalles.length}):</h6>
        ${detalles.length ? `
            <div class="table-responsive">
                <table class="table table-sm align-middle mb-0">
                    <thead class="table-light">
                        <tr>
                            <th>Producto</th>
                            <th class="text-center">Cant.</th>
                            <th class="text-end">Precio</th>
                            <th class="text-end">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${detalles.map(d => `
                            <tr>
                                <td>
                                    <img src="${d.imagen_url || '../img/placeholder.png'}"
                                         style="width:32px;height:32px;object-fit:cover;border-radius:4px;"
                                         class="me-2"
                                         onerror="this.src='../img/placeholder.png'">
                                    ${d.nombre || 'Producto'}
                                </td>
                                <td class="text-center">${d.cantidad || 0}</td>
                                <td class="text-end">$${parseFloat(d.precio_unitario || 0).toLocaleString('es-CO')}</td>
                                <td class="text-end fw-bold">$${parseFloat(d.subtotal || 0).toLocaleString('es-CO')}</td>
                            </tr>`).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <th colspan="3" class="text-end">Total:</th>
                            <th class="text-end text-primary">$${parseFloat(pedido.total || 0).toLocaleString('es-CO')}</th>
                        </tr>
                    </tfoot>
                </table>
            </div>` : '<div class="alert alert-light border small mb-0">No hay productos registrados para este pedido.</div>'}

        ${pedido.pago ? `
            <div class="mt-3 p-3 bg-light rounded">
                <h6 class="fw-bold mb-2"><i class="fa fa-credit-card me-1 text-primary"></i>Pago</h6>
                <div class="d-flex justify-content-between small mb-1">
                    <span class="text-muted">Método:</span>
                    <strong>${pedido.pago.metodo_pago || '-'}</strong>
                </div>
                <div class="d-flex justify-content-between small">
                    <span class="text-muted">Estado:</span>
                    <span class="badge bg-${pedido.pago.id_estado_pago == 2 ? 'success' : 'warning'}">
                        ${pedido.pago.estado_pago || 'Pendiente'}
                    </span>
                </div>
            </div>` : ''}
    `;
}
