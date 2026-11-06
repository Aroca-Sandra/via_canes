// ================================================================
//  MÓDULO 7: RESEÑAS 
// ================================================================

// 🔧 CORRECCIÓN: Definir API_URL si no existe globalmente (compatibilidad con main.js)
const API_URL_RES = typeof API !== 'undefined' ? API : '../api/panel-admin_data.php';
// Si fetchJSON no está disponible (porque depende de main.js), creamos una fallback
const fetchResenas = async (url, options = {}) => {
    try {
        const res = await fetch(url, options);
        return await res.json();
    } catch (err) {
        console.error('Error en fetchResenas:', err);
        return { success: false, error: err.message };
    }
};

let resenasData = [];

document.addEventListener('DOMContentLoaded', () => {
    // 🔧 CORRECCIÓN: Verificar que existan los datos en caché antes de usarlos
    if (typeof cacheSelects === 'undefined' || !cacheSelects.productos || !cacheSelects.clientes) {
        console.warn("⚠️ Cache de selects no cargada aún. Intentando recargar...");
        // Opcional: Podrías llamar a cargarSelectsGlobales() aquí si fuera necesario
        return; 
    }

    // Llenar selects
    const selProd = document.getElementById('resenaProducto');
    const selUsu = document.getElementById('resenaUsuario');
    
    if (selProd && cacheSelects.productos) {
        selProd.innerHTML = '<option value="">Seleccionar...</option>';
        cacheSelects.productos.forEach(p => selProd.innerHTML += `<option value="${p.id_producto}">${p.nombre}</option>`);
    }
    
    if (selUsu && cacheSelects.clientes) {
        selUsu.innerHTML = '<option value="">Seleccionar...</option>';
        cacheSelects.clientes.forEach(c => selUsu.innerHTML += `<option value="${c.id_usuario}">${c.nombre_completo}</option>`);
    }
    
    const formResena = document.getElementById('formResena');
    if (formResena) {
        formResena.addEventListener('submit', (e) => {
            e.preventDefault();
            guardarResena();
        });
    }
});

async function renderResenas() {
    try {
        // 🔧 CORRECCIÓN: Usar la función local o la global apiFetch si está disponible
        const json = typeof apiFetch === 'function' 
            ? await apiFetch('listar_resenas', null, 'GET') 
            : await fetchResenas(`${API_URL_RES}?action=listar_resenas`);

        if (!json.success) return;
        resenasData = json.data;
        
        const tbody = document.getElementById('tablaResenas');
        if (!tbody) return;

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
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarResena(${r.id_reseña})"><i class="fa fa-trash"></i></button>
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
        // 🔧 CORRECCIÓN: Usar apiFetch si existe, sino fetch local
        const json = typeof apiFetch === 'function'
            ? await apiFetch('guardar_resena', formData)
            : await fetchResenas(API_URL_RES, { method: 'POST', body: formData });

        if (json.success) {
            showToast(json.message, 'success'); // Usar showToast global si existe
            document.getElementById('formResena').reset();
            renderResenas();
        } else {
            showToast(json.error, 'danger');
        }
    } catch (err) { 
        alert('❌ Error: ' + err.message); 
    }
};

window.eliminarResena = async function(id) {
    if (!confirm('¿Eliminar esta reseña?')) return;
    try {
        const formData = new FormData();
        formData.append('action', 'eliminar_resena');
        formData.append('id_resena', id);
        
        const json = typeof apiFetch === 'function'
            ? await apiFetch('eliminar_resena', formData)
            : await fetchResenas(API_URL_RES, { method: 'POST', body: formData });

        if (json.success) {
            showToast(json.message, 'success');
            renderResenas();
        } else {
            showToast(json.error, 'danger');
        }
    } catch (err) { 
        alert('❌ Error: ' + err.message); 
    }
};