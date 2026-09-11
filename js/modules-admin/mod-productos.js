// ================================================================
// PANEL ADMINISTRATIVO - MÓDULO INVENTARIO (AJUSTADO A TU BD)
// ================================================================

const API_ADMIN = '../api/panel-admin_data.php';
let productosData = [];

async function apiFetch(action, data = null, method = 'POST') {
    try {
        const url = `${API_ADMIN}?action=${action}`;
        const options = { method };

        if (method === 'GET') {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } else {
            const formData = new FormData();
            formData.append('action', action);
            if (data instanceof FormData) {
                for (let [key, value] of data.entries()) if (key !== 'action') formData.append(key, value);
            } else if (data && typeof data === 'object') {
                for (let key in data) formData.append(key, data[key]);
            }
            options.body = formData;
            const response = await fetch(url, options);
            const text = await response.text();
            try { return JSON.parse(text); } 
            catch (e) { console.error("Respuesta no JSON:", text); throw new Error(`Error del servidor`); }
        }
    } catch (err) {
        console.error(`❌ Error en apiFetch(${action}):`, err);
        return { success: false, error: err.message };
    }
}

function showToast(message, type = 'success') {
    const toastEl = document.getElementById('toast');
    if (!toastEl) { alert(message); return; }
    toastEl.className = `toast align-items-center text-white bg-${type === 'success' ? 'primary' : 'danger'} border-0`;
    const toastMsg = document.getElementById('toastMsg') || toastEl.querySelector('.toast-body');
    if (toastMsg) toastMsg.textContent = message;
    if (window.bootstrap && bootstrap.Toast) new bootstrap.Toast(toastEl).show();
}

async function cargarProductos() {
    try {
        // Cargamos también las especies para validar si es necesario
        const [productos, categorias, estados, proveedores] = await Promise.all([
            apiFetch('listar_productos', null, 'GET'),
            apiFetch('listar_categorias_producto', null, 'GET'),
            apiFetch('listar_estados_producto', null, 'GET'),
            apiFetch('listar_proveedores', null, 'GET')
        ]);

        if (productos.success) {
            productosData = productos.data || [];
        } else {
            throw new Error(productos.error || 'Error al cargar productos');
        }

        llenarSelect('prodCategoria', categorias, 'id_categoria', 'nombre');
        llenarSelect('prodEstado', estados, 'id_estado_producto', 'nombre');
        llenarSelect('prodProveedor', proveedores, 'id_proveedor', 'nombre_empresa');

        renderProductos();
        actualizarDashboard();
    } catch (err) {
        console.error('❌ Error en inicio:', err);
        showToast('❌ Error: ' + err.message, 'danger');
    }
}

function llenarSelect(idElemento, respuestaApi, valKey, textKey) {
    const sel = document.getElementById(idElemento);
    if (!sel || !respuestaApi || !respuestaApi.success) return;
    const options = respuestaApi.data.map(item => `<option value="${item[valKey]}">${item[textKey]}</option>`).join('');
    sel.innerHTML = '<option value="">Seleccionar...</option>' + options;
}

function renderProductos() {
    const filtro = (document.getElementById('buscarProducto')?.value || '').toLowerCase();
    const filtrados = productosData.filter(p =>
        (p.nombre || '').toLowerCase().includes(filtro) ||
        (p.categoria || '').toLowerCase().includes(filtro) ||
        (p.codigo_barras || '').toString().toLowerCase().includes(filtro)
    );

    const tbody = document.getElementById('tablaProductos');
    if (!tbody) return;

    if (!filtrados.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">No se encontraron productos</td></tr>';
        return;
    }

    tbody.innerHTML = filtrados.map(p => {
        const tienePromo = parseFloat(p.descuento || 0) > 0;
        const precioOriginal = parseFloat(p.precio_venta || 0);
        const precioFinal = tienePromo ? precioOriginal * (1 - p.descuento / 100) : precioOriginal;

        return `
        <tr>
            <td>${p.id_producto}</td>
            <td>
                <img src="${p.imagen_url || '../img/producto-default.png'}" 
                     style="width:40px;height:40px;object-fit:cover;border-radius:4px;" 
                     onerror="this.src='../img/producto-default.png'">
            </td>
            <td>
                <strong>${p.nombre}</strong>
                <span class="badge bg-info ms-1">${p.nombres_especies || 'General'}</span>
                ${tienePromo ? `<span class="badge bg-danger ms-1">-${p.descuento}%</span>` : ''}<br>
                <small class="text-muted">${p.codigo_barras || 'Sin código'}</small>
            </td>
            <td><small>${p.categoria || '-'}</small></td>
            <td>$${parseFloat(p.costo_compra || 0).toLocaleString('es-CO')}</td>
            <td>
                ${tienePromo ? `<del class="text-muted small">$${precioOriginal.toLocaleString('es-CO')}</del><br>` : ''}
                <strong>$${precioFinal.toLocaleString('es-CO')}</strong>
            </td>
            <td>
                <span class="badge bg-${p.stock == 0 ? 'danger' : p.stock <= 5 ? 'warning' : 'success'}">
                    ${p.stock} und
                </span>
            </td>
            <td><span class="badge bg-${p.id_estado_producto == 1 ? 'success' : 'secondary'}">${p.estado || 'Activo'}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editarProducto(${p.id_producto})"><i class="fa fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarProducto(${p.id_producto})"><i class="fa fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

function actualizarDashboard() {
    const totalProductosEl = document.getElementById('dashTotalProductos');
    if (totalProductosEl) {
        const activos = productosData.filter(p => p.id_estado_producto == 1);
        totalProductosEl.textContent = `${activos.length} Productos`;
    }
}

window.verStockMinimo = function() {
    const criticos = productosData.filter(p => p.id_estado_producto == 1 && parseInt(p.stock) <= 5);
    if (!criticos.length) { showToast('✅ Todo el inventario se encuentra con stock óptimo.'); return; }
    const mensaje = criticos.map(p => `• ${p.nombre}: ${p.stock} und`).join('\n');
    alert(`⚠️ ALERTA DE STOCK CRÍTICO (≤ 5 und):\n\n${mensaje}`);
};

// ==========================================
// GUARDAR PRODUCTO (LÓGICA ESPECIES BD)
// ==========================================
window.guardarProducto = async function() {
    const form = document.getElementById('formProducto');
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const formData = new FormData();
    const idEdit = document.getElementById('prodIdEdit').value;
    if (idEdit) formData.append('id_producto', idEdit);

    formData.append('nombre', document.getElementById('prodNombre').value.trim());
    formData.append('id_categoria', document.getElementById('prodCategoria').value);
    formData.append('id_estado_producto', document.getElementById('prodEstado').value || '1');
    formData.append('costo_compra', document.getElementById('prodCosto').value);
    formData.append('precio_venta', document.getElementById('prodPrecio').value);
    formData.append('stock', document.getElementById('prodStock').value || '0');
    formData.append('codigo_barras', document.getElementById('prodCodBarras').value.trim());
    formData.append('id_proveedor', document.getElementById('prodProveedor').value || '');
    formData.append('descripcion', document.getElementById('prodDesc').value.trim());
    
    // ✅ CORRECCIÓN: Enviar exactamente el valor seleccionado sin transformaciones erróneas
    const especieSelect = document.getElementById('prodEspecie');
    if(especieSelect && especieSelect.value) {
        formData.append('id_especie', especieSelect.value); // Si es "3", envía "3". Si es "1,2", envía "1,2".
    }

    const fotoInput = document.getElementById('productoImagen');
    if (fotoInput && fotoInput.files && fotoInput.files[0]) {
        formData.append('imagen_producto', fotoInput.files[0]);
    }

    const res = await apiFetch('guardar_producto', formData);

    if (res && res.success) {
        showToast('✅ Producto guardado correctamente');
        limpiarFormProducto();
        cargarProductos();
    } else {
        showToast('❌ ' + (res ? res.error : 'Error al guardar'), 'danger');
    }
};
// ==========================================
// EDITAR PRODUCTO (RESTAURAR ESPECIES)
// ==========================================
window.editarProducto = function(id) {
    const p = productosData.find(x => x.id_producto == id);
    if (!p) return;

    document.getElementById('prodIdEdit').value = p.id_producto;
    document.getElementById('prodNombre').value = p.nombre || '';
    document.getElementById('prodCategoria').value = p.id_categoria || '';
    document.getElementById('prodEstado').value = p.id_estado_producto || '1';
    document.getElementById('prodCosto').value = p.costo_compra || '';
    document.getElementById('prodPrecio').value = p.precio_venta || '';
    document.getElementById('prodStock').value = p.stock || '0';
    document.getElementById('prodCodBarras').value = p.codigo_barras || '';
    document.getElementById('prodProveedor').value = p.id_proveedor || '';
    document.getElementById('prodDesc').value = p.descripcion || '';

    // ✅ CORRECCIÓN: Lógica de restauración de especies
    const idsEspecies = (p.ids_especies || "").split(',').map(id => id.trim());
    const especiesStr = (p.nombres_especies || "").toLowerCase();
    const selectEspecie = document.getElementById('prodEspecie');
    
    if (selectEspecie) {
        if (idsEspecies.includes('1') && idsEspecies.includes('2')) {
            selectEspecie.value = "1,2"; // Perro y Gato
        } else if (idsEspecies.includes('1') || especiesStr.includes('perro')) {
            selectEspecie.value = "1"; // Perro
        } else if (idsEspecies.includes('2') || especiesStr.includes('gato')) {
            selectEspecie.value = "2"; // Gato
        } else if (idsEspecies.includes('3') || especiesStr.includes('otra')) {
            selectEspecie.value = "3"; // ✅ CORREGIDO: Antes era "4" y no existía en el HTML
        } else {
            selectEspecie.value = ""; // Sin selección
        }
    }

    if (p.imagen_url && p.imagen_url !== 'NULL' && p.imagen_url !== '') {
        document.getElementById('productoPreview').src = p.imagen_url;
        document.getElementById('productoImgPreview').style.display = 'block';
        document.getElementById('productoImgPlaceholder').style.display = 'none';
    } else {
        quitarProductoImg();
    }

    const formContainer = document.getElementById('formProducto');
    if (formContainer) formContainer.scrollIntoView({ behavior: 'smooth' });
};

window.eliminarProducto = async function(id) {
    if (!confirm('¿Estás seguro de "desactivar" este producto?')) return;

    const formData = new FormData();
    formData.append('id_producto', id);
    formData.append('id_estado_producto', 2); // Estado 2 = Inactivo

    const p = productosData.find(x => x.id_producto == id);
    if (p) {
        formData.append('nombre', p.nombre);
        formData.append('id_categoria', p.id_categoria || 1);
        formData.append('costo_compra', p.costo_compra || 0);
        formData.append('precio_venta', p.precio_venta || 0);
        formData.append('stock', p.stock || 0);
        if (p.ids_especies) formData.append('id_especie', p.ids_especies);
    }

    const res = await apiFetch('guardar_producto', formData);
    if (res && res.success) {
        showToast('✅ Producto inhabilitado correctamente');
        cargarProductos();
    } else {
        showToast('❌ Error al desactivar producto', 'danger');
    }
};

window.limpiarFormProducto = function() {
    const form = document.getElementById('formProducto');
    if (form) form.reset();
    document.getElementById('prodIdEdit').value = '';
    quitarProductoImg();
};

window.previewProductoImg = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('productoPreview').src = e.target.result;
            document.getElementById('productoImgPreview').style.display = 'block';
            document.getElementById('productoImgPlaceholder').style.display = 'none';
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.quitarProductoImg = function() {
    const input = document.getElementById('productoImagen');
    if (input) input.value = '';
    document.getElementById('productoPreview').src = '';
    if (document.getElementById('productoImgPreview')) document.getElementById('productoImgPreview').style.display = 'none';
    if (document.getElementById('productoImgPlaceholder')) document.getElementById('productoImgPlaceholder').style.display = 'block';
};

document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
    const buscarInput = document.getElementById('buscarProducto');
    if (buscarInput) buscarInput.addEventListener('keyup', renderProductos);
});