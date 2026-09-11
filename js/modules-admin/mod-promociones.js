// ================================================================
// MÓDULO: PROMOCIONES — Panel Administrativo (mod-promociones.js)
// ================================================================

const MarketingMod = (() => {
    const $ = s => document.querySelector(s);

    // ---- Referencias DOM ----
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
    const btnCancelar   = $('#btnCancelarEdicion');
    const btnGuardarTxt = $('#btnGuardarPromoTexto');

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

    const spin = (btn, txt) => {
        if (!btn) return () => {};
        const h = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = txt;
        return () => { btn.disabled = false; btn.innerHTML = h; };
    };

    const fmtFecha = s => s
        ? new Date(s + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
        : '—';

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
            console.log("Imagen marcada para eliminación en servidor");
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
            if (campoInicio.value && campoFin.value && campoFin.value < campoInicio.value) {
                showToast('Fecha fin anterior a inicio', 'danger');
                procesando = false; return;
            }

            const formData = new FormData(form);
            const accion = campoIdEdit.value ? 'actualizar' : 'guardar';

            const btnSubmit = form.querySelector('button[type="submit"]');
            const restore = spin(btnSubmit, '<i class="fa fa-spinner fa-spin"></i> Guardando...');

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

        // --- Vinculación ---
        if (btnVincular && asigPromo && asigProducto) {
            const check = () => {
                btnVincular.disabled = !(asigPromo?.value && asigProducto?.value);
            };

            asigPromo?.addEventListener('change', () => {
                check();
                asigPromo.value
                    ? renderVinculados(asigPromo.value)
                    : (listaProdPromo && (listaProdPromo.innerHTML = ''));
            });
            asigProducto?.addEventListener('change', check);

            btnVincular.addEventListener('click', async () => {
                const idP = asigPromo.value, idR = asigProducto.value;
                if (!idP || !idR) {
                    showToast('Seleccione ambos', 'warning');
                    return;
                }

                const restore = spin(btnVincular, '<i class="fa fa-spinner fa-spin me-1"></i>Vinculando...');
                try {
                    const res = await apiFetch('asignar_producto', fd({ id_promo: idP, id_producto: idR }));
                    restore();

                    if (res.success) {
                        showToast(res.message || 'Vinculado', 'success');
                        asigProducto.value = '';
                        check();
                        await cargarPromocionesAdmin();
                        renderVinculados(idP);
                    } else {
                        showToast(res.error || 'Error al vincular', 'danger');
                    }
                } catch(e) {
                    restore();
                    showToast('Error de conexión', 'danger');
                }
            });
        }

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
                        <div class="text-muted" style="font-size:.7rem;">${esc((p.descripcion || '').substring(0, 35))}${(p.descripcion || '').length > 35 ? '...' : ''}</div>
                    </td>
                    <td class="small fw-bold" style="color:var(--accent,#e5a00d);">${p.valor}${p.tipo_descuento === 'porcentaje' ? '%' : ''}</td>
                    <td class="small text-capitalize">${p.tipo_descuento}</td>
                    <td class="small">${fmtFecha(p.fecha_inicio)}</td>
                    <td class="small">${fmtFecha(p.fecha_fin)}</td>
                    <td class="small text-muted">${fmtFecha(p.fecha_creacion)}</td>
                    <td><span class="badge rounded-pill ${p.id_estado_promocion == 1 ? 'bg-success' : 'bg-secondary'}" style="font-size:.7rem;">
                        <i class="fa fa-circle" style="font-size:.45rem;${p.id_estado_promocion == 1 ? '' : 'opacity:.4'}"></i> ${p.id_estado_promocion == 1 ? 'Activo' : 'Inactivo'}
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
        const prods = promosData.find(p => String(p.id_promo) === String(idPromo))?.productos;
        if (!prods?.length) {
            listaProdPromo.innerHTML = '<p class="text-muted small mb-0">Sin productos vinculados.</p>';
            return;
        }

        listaProdPromo.innerHTML = prods.map(pr => `
            <div class="d-flex align-items-center justify-content-between py-2 border-bottom small">
                <div>
                    <span class="fw-bold">${esc(pr.producto_nombre)}</span>
                    <span class="text-muted ms-2">$${Number(pr.precio_venta).toLocaleString('es-CO')}</span>
                </div>
                <button class="btn btn-sm text-danger p-0" onclick="MarketingMod.desvincular(${idPromo}, ${pr.id_producto})" title="Desvincular">
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

        btnGuardarTxt.textContent = 'Actualizar Promoción';
        if (btnCancelar) btnCancelar.style.display = 'block';
        campoTipo?.dispatchEvent(new Event('change'));
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ---- Eliminar ----
    async function eliminarPromo(id) {
        if (!confirm('¿Eliminar esta promoción y sus vinculaciones?')) return;
        try {
            // CORRECCIÓN: Se cambió 'eliminar' por 'eliminar_promocion' para coincidir con el PHP
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
        if (btnGuardarTxt) btnGuardarTxt.textContent = 'Guardar Promoción';
        campoTipo?.dispatchEvent(new Event('change'));
    }

    // ---- Llenar select ----
    function llenarSelectPromos(promos) {
        if (!asigPromo) return;
        const act = (Array.isArray(promos) ? promos : []).filter(p => p.id_estado_promocion == 1);
        asigPromo.innerHTML = '<option value="" disabled selected>Selecciona una promoción</option>'
            + act.map(p => `<option value="${p.id_promo}">${esc(p.nombre)}</option>`).join('');
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

// ---- Cargar promociones (Global para uso externo si es necesario) ----
async function cargarPromocionesAdmin() {
    try {
        if (typeof apiFetch !== 'function') {
            console.error("❌ apiFetch no está definida");
            return;
        }

        const res = await apiFetch('listar_promociones', null, 'GET');

        if (res.success) {
            MarketingMod.renderTabla(res.data);
            MarketingMod.llenarSelectPromos(res.data);

            if (typeof llenarSelect === 'function') {
                const resProd = await apiFetch('listar_productos', null, 'GET');
                if (resProd.success) llenarSelect('asigProducto', resProd.data, 'Selecciona un producto');
            }
        } else {
            console.error("Error al cargar promos:", res.error);
        }
    } catch (err) {
        console.error('Error cargarPromocionesAdmin:', err);
    }
}