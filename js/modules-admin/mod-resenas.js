// ================================================================
//  MÓDULO 7: RESEÑAS 
// ================================================================
let resenasData = [];

document.addEventListener('DOMContentLoaded', () => {
    // Llenar selects
    const selProd = document.getElementById('resenaProducto');
    const selUsu = document.getElementById('resenaUsuario');
    if (selProd) {
        selProd.innerHTML = '<option value="">Seleccionar...</option>';
        cacheSelects.productos.forEach(p => selProd.innerHTML += `<option value="${p.id_producto}">${p.nombre}</option>`);
    }
    if (selUsu) {
        selUsu.innerHTML = '<option value="">Seleccionar...</option>';
        cacheSelects.clientes.forEach(c => selUsu.innerHTML += `<option value="${c.id_usuario}">${c.nombre_completo}</option>`);
    }
    
    document.getElementById('formResena')?.addEventListener('submit', (e) => {
        e.preventDefault();
        guardarResena();
    });
});

async function renderResenas() {
    try {
        const json = await fetchJSON(`${API_URL}?action=listar_resenas`);
        if (!json.success) return;
        resenasData = json.data;
        
        const tbody = document.getElementById('tablaResenas');
        if (json.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">Sin reseñas</td></tr>';
            return;
        }
        tbody.innerHTML = json.data.map(r => `
            <tr>
                <td>${r.id_reseña}</td>
                <td><strong>${r.producto}</strong></td>
                <td><small>${r.nombres} ${r.apellidos}</small></td>
                <td><span class="text-warning">${'★'.repeat(r.estrellas)}${'☆'.repeat(5-r.estrellas)}</span></td>
                <td><small>${r.comentario}</small></td>
                <td><small>${r.fecha || '-'}</small></td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarResena(${r.id_resena})"><i class="fa fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (err) { console.error(err); }
}

window.guardarResena = async function() {
    const formData = new FormData();
    formData.append('action', 'guardar_resena');
    formData.append('id_producto', document.getElementById('resenaProducto').value);
    formData.append('id_usuario', document.getElementById('resenaUsuario').value);
    formData.append('estrellas', document.getElementById('resenaEstrellas').value);
    formData.append('comentario', document.getElementById('resenaComentario').value.trim());
    
    try {
        const json = await fetchJSON(API_URL, { method: 'POST', body: formData });
        if (json.success) {
            alert('✅ ' + json.message);
            document.getElementById('formResena').reset();
            renderResenas();
        } else alert('❌ ' + json.error);
    } catch (err) { alert('❌ Error: ' + err.message); }
};

window.eliminarResena = async function(id) {
    if (!confirm('¿Eliminar esta reseña?')) return;
    try {
        const formData = new FormData();
        formData.append('action', 'eliminar_resena');
        formData.append('id_resena', id);
        const json = await fetchJSON(API_URL, { method: 'POST', body: formData });
        if (json.success) {
            alert('✅ ' + json.message);
            renderResenas();
        } else alert('❌ ' + json.error);
    } catch (err) { alert('❌ Error: ' + err.message); }
};