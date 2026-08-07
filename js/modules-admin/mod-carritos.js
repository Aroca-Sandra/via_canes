// ================================================================
//  MÓDULO 8: CARRITOS DE COMPRAS js/modulesadmin/mod-carritos.js
// ================================================================
async function renderCarritos() {
    try {
        const json = await fetchJSON(`${API_URL}?action=listar_carritos`);
        if (!json.success) return;
        
        const cont = document.getElementById('listaCarritos');
        if (json.data.length === 0) {
            cont.innerHTML = '<p class="text-center text-muted py-4">Sin carritos activos</p>';
            return;
        }
        cont.innerHTML = json.data.map(c => `
            <div class="border rounded-3 p-3 mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div>
                        <h6 class="mb-0"><i class="fa fa-user me-2 text-primary"></i>${c.nombres} ${c.apellidos}</h6>
                        <small class="text-muted">${c.email || '-'}</small>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold text-success fs-5">${formatearMoneda(c.total_carrito)}</div>
                        <small class="text-muted">${c.total_productos} producto(s)</small>
                    </div>
                </div>
                <div class="row g-2 mt-2">
                    ${(c.productos || []).map(p => `
                        <div class="col-6 col-md-3">
                            <div class="border rounded p-2 text-center">
                                <img src="${p.imagen_url || 'https://via.placeholder.com/60'}" class="rounded mb-1" width="50" height="50" style="object-fit:cover;">
                                <div class="small fw-bold">${p.nombre}</div>
                                <div class="text-muted" style="font-size:.7rem;">${p.cantidad} x ${formatearMoneda(p.precio_venta)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="text-end mt-2">
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarCarrito(${c.id_carrito})"><i class="fa fa-trash me-1"></i>Eliminar carrito</button>
                </div>
            </div>
        `).join('');
    } catch (err) { console.error(err); }
}

window.eliminarCarrito = async function(id) {
    if (!confirm('¿Eliminar este carrito?')) return;
    try {
        const formData = new FormData();
        formData.append('action', 'eliminar_carrito');
        formData.append('id_carrito', id);
        const json = await fetchJSON(API_URL, { method: 'POST', body: formData });
        if (json.success) {
            alert('✅ ' + json.message);
            renderCarritos();
        } else alert('❌ ' + json.error);
    } catch (err) { alert('❌ Error: ' + err.message); }
};