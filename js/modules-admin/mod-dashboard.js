// ================================================================
// MOD-DASHBOARD
// ================================================================
async function cargarDashboard() {
    try {
        const res = await apiFetch('dashboard', null, 'GET');
        if (!res.success) return;
        
        const s = res.stats;
        document.getElementById('statProductos').textContent = s.productos || 0;
        document.getElementById('statServicios').textContent = s.servicios || 0;
        document.getElementById('statStockBajo').textContent = s.stockBajo || 0;
        document.getElementById('statCitas').textContent = s.citas || 0;
        document.getElementById('statPedidos').textContent = s.pedidos || 0;
        document.getElementById('statVentas').textContent = '$' + (parseFloat(s.ventas) || 0).toLocaleString('es-CO');
        document.getElementById('statCarritos').textContent = s.carritos || 0;
        document.getElementById('statResenas').textContent = s.resenas || 0;
        
        const badge = document.getElementById('stockBadge');
        if (s.stockBajo > 0) {
            badge.textContent = s.stockBajo;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
        
        cargarDashStockBajo();
        cargarDashServicios();
        cargarDashCitas();
        cargarDashResenas();
    } catch (e) {
        console.error(e);
    }
}

async function cargarDashStockBajo() {
    const res = await apiFetch('productos_stock_bajo', null, 'GET');
    const cont = document.getElementById('dashStockBajo');
    
    if (!res.success || !res.data.length) {
        cont.innerHTML = '<p class="text-muted text-center small">No hay productos con stock bajo</p>';
        return;
    }
    
    cont.innerHTML = res.data.slice(0, 8).map(p => `
        <div class="d-flex align-items-center gap-2 p-2 border-bottom">
            <img src="${p.imagen_url || '../img/placeholder.png'}" style="width:36px;height:36px;object-fit:cover;border-radius:6px;">
            <div class="flex-grow-1">
                <strong class="small">${p.nombre}</strong>
                <br><small class="text-muted">${p.categoria || ''}</small>
            </div>
            <span class="badge bg-${p.stock == 0 ? 'danger' : 'warning'}">${p.stock} und</span>
        </div>
    `).join('');
}

async function cargarDashServicios() {
    const res = await apiFetch('listar_servicios_admin', null, 'GET');
    const cont = document.getElementById('dashServicios');
    
    if (!res.success || !res.data.length) {
        cont.innerHTML = '<p class="text-muted text-center small">No hay servicios</p>';
        return;
    }
    
    cont.innerHTML = res.data.slice(0, 8).map(s => `
        <div class="d-flex align-items-center gap-2 p-2 border-bottom">
            <div class="flex-grow-1">
                <strong class="small">${s.nombre}</strong>
                <br><small class="text-muted">${s.categoria || ''}</small>
            </div>
            <span class="badge bg-success">$${parseFloat(s.precio).toLocaleString('es-CO')}</span>
            <span class="badge bg-${s.id_estado_servicio == 1 ? 'success' : 'secondary'}">${s.estado}</span>
        </div>
    `).join('');
}

async function cargarDashCitas() {
    const res = await apiFetch('listar_citas', null, 'GET');
    const cont = document.getElementById('dashCitas');
    
    if (!res.success || !res.data.length) {
        cont.innerHTML = '<p class="text-muted text-center small">No hay citas</p>';
        return;
    }
    
    const hoy = new Date().toISOString().split('T')[0];
    const proximas = res.data.filter(c => c.fecha_cita >= hoy && [1, 2].includes(parseInt(c.id_estado_cita))).slice(0, 6);
    
    if (!proximas.length) {
        cont.innerHTML = '<p class="text-muted text-center small">No hay citas próximas</p>';
        return;
    }
    
    cont.innerHTML = proximas.map(c => `
        <div class="d-flex align-items-center gap-2 p-2 border-bottom">
            <div class="text-center" style="min-width:50px;">
                <div class="fw-bold small">${new Date(c.fecha_cita + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</div>
                <small class="text-muted">${c.hora_cita}</small>
            </div>
            <div class="flex-grow-1">
                <strong class="small">${c.nombre_mascota}</strong>
                <br><small class="text-muted">${c.nombres} - ${c.servicio}</small>
            </div>
            <span class="badge bg-${c.id_estado_cita == 1 ? 'warning' : 'info'}">${c.estado}</span>
        </div>
    `).join('');
}

async function cargarDashResenas() {
    const res = await apiFetch('listar_resenas', null, 'GET');
    const cont = document.getElementById('dashResenas');
    
    if (!res.success || !res.data.length) {
        cont.innerHTML = '<p class="text-muted text-center small">No hay reseñas</p>';
        return;
    }
    
    cont.innerHTML = res.data.slice(0, 5).map(r => `
        <div class="p-2 border-bottom">
            <div class="d-flex justify-content-between">
                <strong class="small">${r.producto}</strong>
                <span class="text-warning">${'★'.repeat(r.estrellas)}${'☆'.repeat(5 - r.estrellas)}</span>
            </div>
            <small class="text-muted">${r.nombres} ${r.apellidos} - ${new Date(r.fecha).toLocaleDateString('es-CO')}</small>
            <p class="small mb-0 mt-1">${r.comentario.substring(0, 80)}${r.comentario.length > 80 ? '...' : ''}</p>
        </div>
    `).join('');
}