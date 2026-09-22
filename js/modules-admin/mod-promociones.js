// ================================================================
// MÓDULO: PROMOCIONES — Panel Administrativo
// ================================================================

const MarketingMod = (() => {
    const $ = s => document.querySelector(s);

    // ---- Referencias DOM (Actualizadas según tu HTML) ----
    const form          = $('#formPromo');
    const fileInput     = $('#promoImagen');
    const previewWrap   = $('#promoImgPreview');
    const previewImg    = $('#promoPreview'); 
    const placeholder   = $('#promoImgPlaceholder');
    const flagEliminar  = $('#promoEliminarFotoFlag'); 

    const campoTipo     = $('#promoTipo');
    const campoValor    = $('#promoValor');
    const campoInicio   = $('#promoInicio');
    const campoFin      = $('#promoFin');
    const campoIdEdit   = $('#promoIdEdit');
    
    // Botones del formulario
    const btnSubmit     = $('#btnGuardarPromo'); // ID correcto del HTML
    const btnSubmitTxt  = $('#btnGuardarPromoTexto'); // Span dentro del botón
    const btnCancelar   = $('#btnCancelarEdicion');

    // Elementos de Vinculación
    const asigPromo     = $('#asigPromo');
    const asigProducto  = $('#asigProducto');
    const btnVincular   = $('#btnVincularProd');

    const tablaBody     = $('#tablaPromos');
    const emptyState    = $('#promoEmptyState');
    const contadorBadge = $('#contadorPromos');
    const listaProdPromo= $('#listaProdPromo');

    let promosData   = [];
    let procesando   = false;

    // ---- Utilidades ----
    const esc = s => {
        if (!s) return '';
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    };

    const fd = data => {
        const f = new FormData();
        Object.entries(data).forEach(([k, v]) => f.append(k, v));
        return f;
    };

    // Función Spinner mejorada para manejar el botón y el texto interno
    const spin = (btn, txtOriginal, loadingText) => {
        if (!btn) return () => {};
        const span = btn.querySelector('span') || btn; // Busca el span o usa el botón
        const originalHTML = btn.innerHTML;
        
        btn.disabled = true;
        btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> ${loadingText}`;
        
        return () => { 
            btn.disabled = false; 
            btn.innerHTML = originalHTML; 
        };
    };

    const fmtFecha = s => s
        ? new Date(s + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
        : '—';

    const showToast = (msg, type) => {
        if(typeof window.showToast === 'function') {
            window.showToast(msg, type);
        } else {
            alert(`${type.toUpperCase()}: ${msg}`);
        }
    };

    // ---- Lógica de Imagen Centralizada ----
    function actualizarEstadoImagen(mostrarPreview, src = '') {
        if (previewWrap) previewWrap.style.display = mostrarPreview ? 'block' : 'none';
        if (placeholder) placeholder.style.display = mostrarPreview ? 'none' : 'block';
        if (previewImg && src) previewImg.src = src;

        if (flagEliminar) {
            flagEliminar.value = mostrarPreview ? '0' : '1';
        }
    }

    function manejarCambioImagen(e) {
        const f = e.target.files[0];
        if (!f) return;

        if (f.size > 2 * 1024 * 1024) {
            showToast('La imagen es muy pesada (Máx 2 MB)', 'danger');
            fileInput.value = '';
            actualizarEstadoImagen(false);
            return;
        }

        if (flagEliminar) flagEliminar.value = '0';

        const r = new FileReader();
        r.onload = ev => {
            actualizarEstadoImagen(true, ev.target.result);
        };
        r.readAsDataURL(f);
    }

    // ---- Init ----
    function init() {
        console.log("✅ MarketingMod inicializado");
        if (!form) {
            console.error("❌ No se encontró #formPromo");
            return;
        }

        // --- Eventos de Imagen ---
        $('#btnSeleccionarImg')?.addEventListener('click', () => fileInput.click());
        fileInput?.addEventListener('change', manejarCambioImagen);

        $('#btnQuitarImg')?.addEventListener('click', () => {
            fileInput.value = '';
            actualizarEstadoImagen(false);
        });

        // --- Tipo → placeholder y max ---
        campoTipo?.addEventListener('change', () => {
            if (campoTipo.value === 'porcentaje') {
                campoValor.max = 100;
                campoValor.placeholder = 'Ej: 15';
            } else {
                campoValor.removeAttribute('max');
                campoValor.placeholder = 'Ej: 5000';
            }
        });

        // --- Fechas ---
        campoInicio?.addEventListener('change', () => {
            if (campoInicio.value && campoFin) {
                campoFin.setAttribute('min', campoInicio.value);
                if (campoFin.value && campoFin.value < campoInicio.value) {
                    campoFin.value = '';
                    campoFin.classList.add('is-invalid');
                } else {
                    campoFin.classList.remove('is-invalid');
                }
            }
        });

        campoFin?.addEventListener('change', () => {
            if (campoInicio && campoInicio.value) {
                campoFin.classList.toggle('is-invalid', !!(campoFin.value && campoFin.value < campoInicio.value));
            }
        });

        // ==============================
        // SUBMIT FORMULARIO
        // ==============================
        form?.addEventListener('submit', async e => {
            e.preventDefault();

            if (procesando) return;
            procesando = true;

            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                showToast('Completa todos los campos obligatorios.', 'warning');
                procesando = false;
                return;
            }

            if (campoTipo.value === 'porcentaje' && parseFloat(campoValor.value) > 100) {
                showToast('Máximo 100%', 'danger');
                procesando = false; return;
            }
            
            // Validación básica de fechas
            if (campoInicio.value && campoFin.value && campoFin.value < campoInicio.value) {
                showToast('La fecha fin no puede ser anterior a la inicio', 'danger');
                procesando = false; return;
            }

            const formData = new FormData(form);
            const accion = campoIdEdit.value ? 'actualizar' : 'guardar';

            // Usamos btnSubmit (el botón entero) para el spinner
            const restore = spin(btnSubmit, btnSubmit.innerHTML, 'Guardando...');

            try {
                const res = await apiFetch(accion, formData);
                form.classList.remove('was-validated');

                if (res.success) {
                    showToast(res.message || 'Guardado exitosamente', 'success');
                    resetForm();
                    cargarPromocionesAdmin();
                } else {
                    showToast(res.error || 'Error al guardar', 'danger');
                }
            } catch (error) {
                console.error("💥 Error:", error);
                showToast('Error de conexión', 'danger');
            } finally {
                restore();
                procesando = false;
            }
        });

        btnCancelar?.addEventListener('click', resetForm);

        // ==========================================
        // LÓGICA DE VINCULACIÓN (CORREGIDA)
        // ==========================================
        if (btnVincular && asigPromo && asigProducto) {
            
            const checkVincularBtn = () => {
                const promoVal = asigPromo?.value;
                const prodVal = asigProducto?.value;
                const isValid = promoVal && prodVal;
                
                btnVincular.disabled = !isValid;
                // Feedback visual
                if(isValid) {
                    btnVincular.classList.remove('btn-secondary');
                    btnVincular.classList.add('btn-info'); // O btn-success según tu gusto
                } else {
                    btnVincular.classList.remove('btn-info');
                    btnVincular.classList.add('btn-secondary');
                }
            };

            asigPromo?.addEventListener('change', () => {
                checkVincularBtn();
                const idP = asigPromo.value;
                if (idP) {
                    renderVinculados(idP);
                } else {
                    if (listaProdPromo) listaProdPromo.innerHTML = '';
                }
            });

            asigProducto?.addEventListener('change', checkVincularBtn);

            btnVincular.addEventListener('click', async () => {
                const idP = asigPromo.value;
                const idR = asigProducto.value;

                if (!idP || !idR) {
                    showToast('Seleccione promoción y producto', 'warning');
                    return;
                }

                const restore = spin(btnVincular, btnVincular.innerHTML, 'Vinculando...');
                
                try {
                    const res = await apiFetch('asignar_producto', fd({ id_promo: idP, id_producto: idR }));
                    restore();

                    if (res.success) {
                        showToast(res.message || 'Producto vinculado correctamente', 'success');
                        
                        // Limpiar selección de producto
                        asigProducto.value = ''; 
                        checkVincularBtn();
                        
                        // Recargar datos para actualizar la lista interna
                        await cargarPromocionesAdmin();
                        
                        // Refrescar vista de vinculados
                        renderVinculados(idP);
                    } else {
                        showToast(res.error || 'Error al vincular', 'danger');
                    }
                } catch(e) {
                    restore();
                    console.error(e);
                    showToast('Error de conexión al vincular', 'danger');
                }
            });
        }

        // Carga inicial
        cargarPromocionesAdmin();
    }

    // ---- Render tabla ----
    function renderTabla(promos) {
        promosData = Array.isArray(promos) ? promos : [];
        $('#promoLoadingRow')?.remove();

        if (!promosData.length) {
            if (emptyState) emptyState.style.display = 'block';
            if (contadorBadge) contadorBadge.style.display = 'none';
            if (tablaBody) tablaBody.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-4">No hay promociones registradas</td></tr>';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        if (contadorBadge) {
            contadorBadge.style.display = 'inline-block';
            contadorBadge.textContent = promosData.length;
        }

        if (tablaBody) {
            tablaBody.innerHTML = promosData.map(p => `
                <tr>
                    <td class="small text-muted">${p.id_promo}</td>
                    <td>${p.foto_url
                        ? `<img src="../${p.foto_url}" alt="${esc(p.nombre)}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;cursor:pointer;" onclick="MarketingMod.verImagen('${p.foto_url}')">`
                        : '<i class="fa fa-image text-muted"></i>'}</td>
                    <td>
                        <div class="fw-bold small">${esc(p.nombre)}</div>
                    </td>
                    <td class="small fw-bold">${p.valor}${p.tipo_descuento === 'porcentaje' ? '%' : ''}</td>
                    <td class="small text-capitalize">${p.tipo_descuento}</td>
                    <td class="small">${fmtFecha(p.fecha_inicio)}</td>
                    <td class="small">${fmtFecha(p.fecha_fin)}</td>
                    <td class="small text-muted">${fmtFecha(p.fecha_creacion)}</td>
                    <td><span class="badge rounded-pill ${p.id_estado_promocion == 1 ? 'bg-success' : 'bg-secondary'}" style="font-size:.7rem;">
                        ${p.id_estado_promocion == 1 ? 'Activo' : 'Inactivo'}
                    </span></td>
                    <td class="text-nowrap">
                        <button class="btn btn-sm btn-outline-primary p-1" onclick="MarketingMod.editarPromo(${p.id_promo})" title="Editar"><i class="fa fa-pen fa-xs"></i></button>
                        <button class="btn btn-sm btn-outline-danger p-1 ms-1" onclick="MarketingMod.eliminarPromo(${p.id_promo})" title="Eliminar"><i class="fa fa-trash fa-xs"></i></button>
                    </td>
                </tr>`).join('');
        }
    }

    // ---- Render vinculados ----
    function renderVinculados(idPromo) {
        if (!listaProdPromo) return;
        
        const promoEncontrada = promosData.find(p => String(p.id_promo) === String(idPromo));
        const prods = promoEncontrada?.productos;

        if (!prods || prods.length === 0) {
            listaProdPromo.innerHTML = '<p class="text-muted small mb-0 text-center py-2">Sin productos vinculados.</p>';
            return;
        }

        listaProdPromo.innerHTML = `<div class="small fw-bold mb-2 text-info">Productos vinculados:</div>` + 
            prods.map(pr => `
            <div class="d-flex align-items-center justify-content-between py-2 border-bottom small bg-light px-2 mb-1 rounded">
                <div>
                    <span class="fw-bold text-dark">${esc(pr.producto_nombre)}</span>
                </div>
                <button class="btn btn-sm text-danger p-0 ps-2" onclick="MarketingMod.desvincular(${idPromo}, ${pr.id_producto})" title="Desvincular">
                    <i class="fa fa-times-circle"></i>
                </button>
            </div>`).join('');
    }

    // ---- Editar ----
    function editarPromo(id) {
        const p = promosData.find(x => String(x.id_promo) === String(id));
        if (!p) { showToast('No encontrada', 'danger'); return; }

        campoIdEdit.value = p.id_promo;
        $('#promoNombre').value = p.nombre;
        $('#promoDesc').value = p.descripcion || '';
        campoValor.value = p.valor;
        campoTipo.value = p.tipo_descuento;
        campoInicio.value = p.fecha_inicio || '';
        campoFin.value = p.fecha_fin || '';
        $('#promoEstado').value = p.id_estado_promocion;

        if (flagEliminar) flagEliminar.value = '0';

        if (p.foto_url) {
            actualizarEstadoImagen(true, '../' + p.foto_url);
        } else {
            actualizarEstadoImagen(false);
            fileInput.value = '';
        }

        btnSubmitTxt.textContent = 'Actualizar Promoción';
        if (btnCancelar) btnCancelar.style.display = 'block';
        campoTipo?.dispatchEvent(new Event('change'));
        
        // Scroll suave hacia el formulario
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ---- Eliminar ----
    async function eliminarPromo(id) {
        if (!confirm('¿Eliminar esta promoción y sus vinculaciones?')) return;
        try {
            const res = await apiFetch('eliminar_promocion', fd({ id_promo: id }));
            if (res.success) {
                showToast(res.message || 'Eliminada', 'success');
                cargarPromocionesAdmin();
            } else {
                showToast(res.error || 'Error al eliminar', 'danger');
            }
        } catch(e) {
            showToast('Error de conexión', 'danger');
        }
    }

    // ---- Desvincular ----
    async function desvincular(idPromo, idProducto) {
        if (!confirm('¿Desvincular este producto?')) return;
        try {
            const res = await apiFetch('desasignar_producto', fd({ id_promo: idPromo, id_producto: idProducto }));
            if (res.success) {
                showToast(res.message || 'Desvinculado', 'success');
                await cargarPromocionesAdmin();
                renderVinculados(idPromo);
            } else {
                showToast(res.error || 'Error al desvincular', 'danger');
            }
        } catch(e) {
            showToast('Error de conexión', 'danger');
        }
    }

    // ---- Ver imagen ----
    function verImagen(ruta) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
        overlay.innerHTML = `<img src="../${ruta}" style="max-width:85vw;max-height:85vh;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.5)">`;
        overlay.onclick = () => overlay.remove();
        document.body.appendChild(overlay);
    }

    // ---- Reset ----
    function resetForm() {
        form?.reset();
        form?.classList.remove('was-validated');

        fileInput.value = '';
        actualizarEstadoImagen(false);
        if(flagEliminar) flagEliminar.value = '0';

        campoIdEdit.value = '';
        if (btnCancelar) btnCancelar.style.display = 'none';
        if (btnSubmitTxt) btnSubmitTxt.textContent = 'Guardar Promoción';
        campoTipo?.dispatchEvent(new Event('change'));
    }

    // ---- Llenar select de Promociones (Interno) ----
    function llenarSelectPromos(promos) {
        if (!asigPromo) return;
        const act = (Array.isArray(promos) ? promos : []).filter(p => p.id_estado_promocion == 1);
        
        // Guardar selección actual si existe para no perderla al recargar
        const currentVal = asigPromo.value;

        asigPromo.innerHTML = '<option value="" disabled selected>Selecciona una promoción</option>'
            + act.map(p => `<option value="${p.id_promo}">${esc(p.nombre)}</option>`).join('');
        
        if(currentVal && act.find(p => String(p.id_promo) === String(currentVal))) {
            asigPromo.value = currentVal;
        }
    }

    // ---- API pública ----
    return {
        init,
        renderTabla,
        editarPromo,
        eliminarPromo,
        desvincular,
        verImagen,
        resetForm,
        llenarSelectPromos
    };
})();

document.addEventListener('DOMContentLoaded', () => MarketingMod.init());

// ---- Cargar promociones (Global) ----
async function cargarPromocionesAdmin() {
    try {
        if (typeof apiFetch !== 'function') {
            console.error("❌ apiFetch no está definida.");
            return;
        }

        // 1. Cargar Promociones
        const res = await apiFetch('listar_promociones', null, 'GET');

        if (res.success) {
            MarketingMod.renderTabla(res.data);
            MarketingMod.llenarSelectPromos(res.data);

            // 2. Cargar Productos (CORRECCIÓN IMPORTANTE)
            // Antes fallaba porque 'llenarSelect' no existía. Ahora lo hacemos manual aquí.
            const resProd = await apiFetch('listar_productos', null, 'GET');
            const selectProd = document.getElementById('asigProducto');
            
            if (resProd.success && selectProd) {
                // Guardar selección actual
                const currentProdVal = selectProd.value;
                
                selectProd.innerHTML = '<option value="" disabled selected>Selecciona un producto</option>'
                    + resProd.data.map(p => `<option value="${p.id_producto}">${esc(p.nombre_producto || p.nombre)}</option>`).join('');
                
                // Restaurar selección si es válida
                if(currentProdVal && resProd.data.find(p => String(p.id_producto) === String(currentProdVal))) {
                    selectProd.value = currentProdVal;
                }
            }
        } else {
            console.error("Error al cargar promos:", res.error);
        }
    } catch (err) {
        console.error('Error cargarPromocionesAdmin:', err);
    }
}