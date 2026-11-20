// ================================================================
// MÓDULO 4: COMPRAS (SIN AUTO-SAVE - GUARDADO MANUAL)
// ================================================================
let comprasData = [];
let productosCache = []; 

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
        // Cargar datos en paralelo
        const [resCompras, resProv, resProd] = await Promise.all([
            apiFetch('listar_compras', null, 'GET'),
            apiFetch('listar_proveedores', null, 'GET'),
            apiFetch('listar_productos', null, 'GET')
        ]);

        if (resCompras.success) {
            comprasData = resCompras.data || [];
        } else {
            comprasData = [];
        }

        // Actualizar cache de productos
        if (resProd.success) {
            productosCache = resProd.data || [];
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
        llenarSelectProductos();

        // Poner fecha de hoy si está vacío
        const inputFecha = document.getElementById('compraFecha');
        if (inputFecha && !inputFecha.value) {
            inputFecha.value = new Date().toISOString().split('T')[0];
        }

        const badge = document.getElementById('comprasTotalBadge');
        if (badge) badge.textContent = comprasData.length + ' compras';

        renderCompras();

        // ✅ Configurar SOLO el botón guardar manual (sin auto-save)
        const newBtn = btnGuardar.cloneNode(true);
        btnGuardar.parentNode.replaceChild(newBtn, btnGuardar);
        newBtn.addEventListener('click', () => guardarCompra());

        // ✅ Configurar listeners para el formulario de nuevo producto
        configurarFormularioNuevoProducto();

    } catch (error) {
        console.error("🚨 ERROR FATAL EN CARGAR COMPRAS:", error);
    }
};

function llenarSelectProductos() {
    const selProd = document.getElementById('compraProducto');
    if (!selProd) return;
    
    const valorActual = selProd.value;
    selProd.innerHTML = '<option value="">Seleccionar producto...</option>';
    
    productosCache.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id_producto;
        opt.textContent = `${p.nombre} - Stock: ${p.stock}`;
        selProd.appendChild(opt);
    });

    if (valorActual) selProd.value = valorActual;
}

function configurarFormularioNuevoProducto() {
    const btnNuevo = document.querySelector('[onclick="mostrarFormNuevoProducto()"]');
    if (btnNuevo) {
        btnNuevo.addEventListener('click', async () => {
            mostrarFormNuevoProducto();
            await cargarCategoriasNuevoProducto();
        });
    }
}

// ✅ Guardado 100% manual al hacer clic en el botón
async function guardarCompra() {
    const idEdit = document.getElementById('compraIdEdit')?.value || null;
    const prov = document.getElementById('compraProveedor')?.value;
    const factura = document.getElementById('compraFactura')?.value.trim() || '';
    const prod = document.getElementById('compraProducto')?.value;
    const cant = document.getElementById('compraCantidad')?.value;
    const costo = document.getElementById('compraCosto')?.value;
    const fecha = document.getElementById('compraFecha')?.value;

    // Validación estricta de campos obligatorios
    if (!prov || !prod || !cant || !costo || !fecha) {
        showToast('⚠️ Todos los campos son obligatorios', 'warning');
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
    if(btnGuardar) {
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i> Guardando...';
    }

    try {
        const res = await apiFetch('guardar_compra', data);
        
        if (res.success) {
            showToast('✅ Compra guardada y stock actualizado', 'success');
            limpiarFormCompra();
            cargarCompras(); 
        } else {
            showToast('❌ Error: ' + res.error, 'danger');
        }
    } catch (err) {
        console.error("Error al guardar:", err);
        showToast('❌ Error crítico del servidor', 'danger');
    } finally {
        if(btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = '<i class="fa fa-bolt me-1"></i> Guardar Compra';
        }
    }
}

// ✅ FUNCIONES PARA CREAR PRODUCTO NUEVO DESDE COMPRAS
window.mostrarFormNuevoProducto = function() {
    const container = document.getElementById('formNuevoProductoContainer');
    if (container) {
        container.style.display = 'block';
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        document.getElementById('nuevoProdNombre').focus();
    }
};

window.ocultarFormNuevoProducto = function() {
    const container = document.getElementById('formNuevoProductoContainer');
    if (container) container.style.display = 'none';
    const form = document.getElementById('formProductoNuevo');
    if (form) form.reset();
};

async function cargarCategoriasNuevoProducto() {
    const select = document.getElementById('nuevoProdCategoria');
    if (!select) {
        console.error('❌ No existe el select nuevoProdCategoria');
        return;
    }

    console.log('🔄 Cargando categorías para nuevo producto...');

    try {
        // Intentar con el endpoint listar_categorias
        let res = await apiFetch('listar_categorias', null, 'GET');
        
        // Si falla, intentar con listar_categorias_producto
        if (!res.success) {
            console.warn('⚠️ listar_categorias falló, intentando listar_categorias_producto...');
            res = await apiFetch('listar_categorias_producto', null, 'GET');
        }

        // Si falla, intentar con listar_categorias_servicio
        if (!res.success) {
            console.warn('⚠️ listar_categorias_producto falló, intentando listar_categorias_servicio...');
            res = await apiFetch('listar_categorias_servicio', null, 'GET');
        }

        if (res.success && res.data && res.data.length > 0) {
            select.innerHTML = '<option value="">Seleccionar categoría...</option>';
            res.data.forEach(c => {
                const id = c.id_categoria || c.id_categoria_producto || c.id_categoria_servicio;
                const nombre = c.nombre || c.nombre_categoria;
                if (id && nombre) {
                    select.innerHTML += `<option value="${id}">${nombre}</option>`;
                }
            });
            console.log(`✅ ${res.data.length} categorías cargadas`);
        } else {
            console.warn('⚠️ No se encontraron categorías en la API');
            select.innerHTML = '<option value="">No hay categorías disponibles</option>';
            
            // Fallback: categorías hardcodeadas
            select.innerHTML += `
                <option value="1">Alimentación</option>
                <option value="2">Accesorios</option>
                <option value="3">Higiene</option>
                <option value="4">Salud</option>
                <option value="5">Juguetes</option>
            `;
        }
    } catch (error) {
        console.error('🚨 Error cargando categorías:', error);
        select.innerHTML = '<option value="">Error al cargar categorías</option>';
    }
}

function renderCompras() {
    const tbody = document.getElementById('tablaCompras');
    if (!tbody) return;
    
    if (!comprasData.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">No hay compras registradas</td></tr>';
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
    if (!confirm('¿Eliminar esta compra? Se revertirá el stock automáticamente.')) return;
    const res = await apiFetch('eliminar_compra', { id_compra: id });
    if (res.success) {
        showToast(res.message || 'Compra eliminada', 'success');
        limpiarFormCompra();
        cargarCompras();
    } else {
        showToast(res.error || 'Error al eliminar', 'danger');
    }
};