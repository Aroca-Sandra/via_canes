// ================================================================
// MÓDULO 4: COMPRAS (CON N° FACTURA Y AUTO-SAVE)
// ================================================================
let comprasData = [];
let autoSaveTimer = null;
const AUTO_SAVE_DELAY = 3000; // 3 segundos

window.cargarCompras = async function() {
    console.log("🔵 Iniciando cargarCompras...");
    
    const tbody = document.getElementById('tablaCompras');
    const selProv = document.getElementById('compraProveedor');
    const selProd = document.getElementById('compraProducto');
    const btnGuardar = document.getElementById('btnGuardarCompra');

    if (!tbody || !selProv || !selProd || !btnGuardar) {
        console.error("❌ Faltan elementos HTML esenciales");
        return;
    }

    try {
        const resCompras = await apiFetch('listar_compras', null, 'GET');
        const resProv = await apiFetch('listar_proveedores', null, 'GET');
        const resProd = await apiFetch('listar_productos', null, 'GET');

        if (resCompras.success) {
            comprasData = resCompras.data || [];
        } else {
            comprasData = [];
        }

        // Llenar Proveedores
        selProv.innerHTML = '<option value="">Seleccionar...</option>';
        if (resProv.success) {
            resProv.data.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id_proveedor;
                opt.textContent = p.nombre_empresa;
                selProv.appendChild(opt);
            });
        }

        // Llenar Productos
        selProd.innerHTML = '<option value="">Seleccionar...</option>';
        if (resProd.success) {
            resProd.data.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id_producto;
                opt.textContent = p.nombre;
                selProd.appendChild(opt);
            });
        }

        // Poner fecha de hoy
        const inputFecha = document.getElementById('compraFecha');
        if (inputFecha && !inputFecha.value) {
            inputFecha.value = new Date().toISOString().split('T')[0];
        }

        const badge = document.getElementById('comprasTotalBadge');
        if (badge) badge.textContent = comprasData.length + ' compras';

        renderCompras();

        // Configurar botón guardar
        const newBtn = btnGuardar.cloneNode(true);
        btnGuardar.parentNode.replaceChild(newBtn, btnGuardar);
        newBtn.addEventListener('click', () => guardarCompra(false));

        // 🆕 Configurar Auto-save en los campos (3 segundos) - INCLUYENDO FACTURA
        ['compraProveedor', 'compraFactura', 'compraProducto', 'compraCantidad', 'compraCosto', 'compraFecha'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', iniciarAutoSave);
                el.addEventListener('change', iniciarAutoSave);
            }
        });

    } catch (error) {
        console.error("🚨 ERROR FATAL EN CARGAR COMPRAS:", error);
    }
};

function iniciarAutoSave() {
    clearTimeout(autoSaveTimer);
    const indicador = document.getElementById('comprasEstadoIndicador');
    if (indicador) indicador.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i> Guardando en 3s...';
    
    // true = es autoguardado
    autoSaveTimer = setTimeout(() => guardarCompra(true), AUTO_SAVE_DELAY); 
}

async function guardarCompra(isAutoSave = false) {
    const idEdit = document.getElementById('compraIdEdit')?.value || null;
    const prov = document.getElementById('compraProveedor')?.value;
    const factura = document.getElementById('compraFactura')?.value.trim() || '';
    const prod = document.getElementById('compraProducto')?.value;
    const cant = document.getElementById('compraCantidad')?.value;
    const costo = document.getElementById('compraCosto')?.value;
    const fecha = document.getElementById('compraFecha')?.value;

    // Si es autoguardado y faltan campos, no hacemos nada (no molestamos al usuario)
    if (isAutoSave && (!prov || !prod || !cant || !costo || !fecha)) return;

    if (!prov || !prod || !cant || !costo || !fecha) {
        showToast('⚠️ Todos los campos con * son obligatorios', 'warning');
        return;
    }

    const data = {
        id_proveedor: prov,
        numero_factura: factura,
        id_producto: prod,
        cantidad: cant,
        costo_unitario: costo,
        fecha: fecha
    };
    
    if (idEdit) data.id_compra = idEdit;

    const btnGuardar = document.getElementById('btnGuardarCompra');
    if(btnGuardar && !isAutoSave) {
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i> Guardando...';
    }

    const indicador = document.getElementById('comprasEstadoIndicador');
    if (indicador && isAutoSave) indicador.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i> Guardando...';

    try {
        const res = await apiFetch('guardar_compra', data);
        
        if (res.success) {
            if (!isAutoSave) showToast('✅ Compra guardada y stock actualizado');
            if (indicador) indicador.innerHTML = '<i class="fa fa-check text-success me-1"></i> Guardado';
            limpiarFormCompra();
            cargarCompras(); 
        } else {
            showToast('❌ Error: ' + res.error, 'danger');
            if (indicador) indicador.innerHTML = '<i class="fa fa-times text-danger me-1"></i> Error al guardar';
        }
    } catch (err) {
        console.error("Error al guardar:", err);
        showToast('❌ Error crítico del servidor. Revisa la consola (F12)', 'danger');
        if (indicador) indicador.innerHTML = '<i class="fa fa-times text-danger me-1"></i> Error';
    }

    if(btnGuardar) {
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = '<i class="fa fa-bolt me-1"></i> Guardar Compra';
    }
}

function renderCompras() {
    const tbody = document.getElementById('tablaCompras');
    if (!tbody) return;
    
    if (!comprasData.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">No hay compras</td></tr>';
        return;
    }
    
    tbody.innerHTML = comprasData.map(c => {
        let fechaStr = c.fecha ? c.fecha.split(' ')[0] : '';
        const costoU = parseFloat(c.costo_unitario || 0);
        const cant = parseInt(c.cantidad || 0);
        const total = costoU * cant;
        return `<tr>
            <td>${c.id_compra}</td>
            <td>${fechaStr}</td>
            <td>${c.proveedor || ''}</td>
            <td>${c.numero_factura || '-'}</td>
            <td>${c.producto || ''}</td>
            <td>${cant}</td>
            <td>$${costoU.toLocaleString('es-CO')}</td>
            <td><strong>$${total.toLocaleString('es-CO')}</strong></td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editarCompra(${c.id_compra})"><i class="fa fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarCompra(${c.id_compra})"><i class="fa fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

window.editarCompra = function(id) {
    const c = comprasData.find(x => x.id_compra == id);
    if (!c) return;
    document.getElementById('compraIdEdit').value = c.id_compra;
    document.getElementById('compraProveedor').value = c.id_proveedor;
    document.getElementById('compraFactura').value = c.numero_factura || '';
    document.getElementById('compraProducto').value = c.id_producto;
    document.getElementById('compraCantidad').value = c.cantidad;
    document.getElementById('compraCosto').value = c.costo_unitario;
    if (c.fecha) document.getElementById('compraFecha').value = c.fecha.split(' ')[0];
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.limpiarFormCompra = function() {
    const form = document.getElementById('formCompra');
    if (form) form.reset();
    const idEdit = document.getElementById('compraIdEdit');
    if (idEdit) idEdit.value = '';
    const inputFecha = document.getElementById('compraFecha');
    if (inputFecha) inputFecha.value = new Date().toISOString().split('T')[0];
};

window.eliminarCompra = async function(id) {
    if (!confirm('¿Eliminar? Se revertirá el stock.')) return;
    const res = await apiFetch('eliminar_compra', { id_compra: id });
    if (res.success) {
        showToast(res.message || 'Eliminada');
        limpiarFormCompra();
        cargarCompras();
    } else {
        showToast(res.error || 'Error', 'danger');
    }
};