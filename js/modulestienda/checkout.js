/* ═══════════════════════════════════════════════════════════════
   🛒 checkout.js — Vía Canes (QR + WhatsApp + Contra Entrega)
   Flujo: Validar -> Guardar en BD -> Confirmación con QR
          + botón WhatsApp (comprobante / coordinar entrega)
   🆕 Precarga Nombres/Apellidos/Dirección/Celular desde
      sesión PHP + caché local (viaCanesPerfilEnvio)
   ═══════════════════════════════════════════════════════════════ */

/* ─────────── ⚙️ CONFIGURACIÓN ─────────── */
const API_URL        = '../api/panel-usuario_data.php';
const KEY_CARRITO    = 'viaCanesCarrito';
const KEY_PEDIDO_TMP = 'ultimoPedidoViaCanes';

const VALOR_ENVIO_GRATIS = 100000;
const COSTO_ENVIO_BASE   = 15000;   // ⚠️ Sincroniza con tu PHP (allá tienes 10000)

/* 💬 WHATSAPP */
const WHATSAPP_NEGOCIO = '573016540576';
// ✅ Bre-B (5) incluido -> también envía comprobante por WhatsApp
const METODOS_WHATSAPP = [1, 2, 5];   // 1 = Nequi, 2 = Daviplata, 5 = Bre-B
const NOMBRES_METODO   = { 1: 'Nequi', 2: 'Daviplata', 3: 'Contra Entrega', 4: 'Tarjeta', 5: 'Bre-B' };

/* 📲 QRs ESTÁTICOS */
const CONFIG_QR = {
    1: { titulo: 'Escanea para pagar con Nequi',     imagen: '../img/qr-Bre-B.jpeg', numero: 'Nequi: <strong>301 654 0576</strong>' },
    2: { titulo: 'Escanea para pagar con Daviplata', imagen: '../img/qr-Bre-B.jpeg', numero: 'Daviplata: <strong>301 654 0576</strong>' },
    5: { titulo: 'Escanea para pagar con Bre-B',     imagen: '../img/qr-Bre-B.jpeg', numero: 'Llave Bre-B: <strong>@3016540576</strong>' }
};

/* ═══════════════════════════════════════════════
   🆕 💾 CACHÉ DE DATOS DE ENVÍO (localStorage)
   La escribe panel-usuario.js y la API de sesión;
   aquí se LEE para prellenar el formulario al vuelo.
   ═══════════════════════════════════════════════ */
const KEY_PERFIL_ENVIO = 'viaCanesPerfilEnvio';

function leerCacheEnvio() {
    try {
        const raw = localStorage.getItem(KEY_PERFIL_ENVIO);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

function escribirCacheEnvio(u) {
    if (!u) return;
    try {
        localStorage.setItem(KEY_PERFIL_ENVIO, JSON.stringify({
            nombres:   u.nombres   || '',
            apellidos: u.apellidos || '',
            celular:   u.celular   || '',
            direccion: u.direccion || '',
            actualizado: new Date().toISOString()
        }));
    } catch (e) { console.warn('No se pudo guardar la caché de envío:', e); }
}

/* Solo rellena campos VACÍOS: nunca pisa lo que el usuario ya escribió */
function prellenarFormularioEnvio(datos = {}) {
    const campos = [
        ['checkNombres',   datos.nombres],
        ['checkApellidos', datos.apellidos],
        ['checkDireccion', datos.direccion],
        ['checkCelular',   datos.celular]
    ];
    campos.forEach(([id, valor]) => {
        const el = document.getElementById(id);
        if (el && valor && !el.value.trim()) el.value = valor;
    });
}

/* ─────────── 📦 ESTADO GLOBAL ─────────── */
let carrito           = [];
let datosUsuario      = null;
let subtotalProductos = 0;
let ahorroPromociones = 0;
let valorEnvio        = 0;
let totalPagar        = 0;

let metodoActivo        = 5;   // Bre-B por defecto (coincide con el HTML)
let sesionBloqueada     = false;
let metodoPedidoFinal   = null;
let urlWhatsAppGuardada = null;

/* ═══════════════════════════════════════════════
   💰 PRECIOS E IMÁGENES
   ═══════════════════════════════════════════════ */
function resolverPrecios(item) {
    const precio = parseFloat(item.precio) || 0;
    const camposOferta = ['precioPromo', 'precio_promo', 'precioOferta', 'oferta', 'special_price', 'precioDescuento'];
    const camposOriginal = ['precioOriginal', 'precio_original', 'precioAnterior', 'regular_price'];

    for (const campo of camposOferta) {
        const val = parseFloat(item[campo]);
        if (!isNaN(val) && val > 0 && val < precio) return { original: precio, final: val, tieneDescuento: true };
    }
    for (const campo of camposOriginal) {
        const val = parseFloat(item[campo]);
        if (precio > 0 && !isNaN(val) && val > precio) return { original: val, final: precio, tieneDescuento: true };
    }
    return { original: precio, final: precio, tieneDescuento: false };
}

function normalizarUrlImagen(url) {
    if (!url) return '../img/default-product.png';
    let imgUrl = url;
    if (!imgUrl.startsWith('http') && !imgUrl.startsWith('/')) {
        imgUrl = '../' + imgUrl.replace(/^(\.\.\/)+/, '');
    }
    return imgUrl;
}

/* ─────────── 🧰 UI & MENSAJES ─────────── */
function formatearCOP(valor) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(valor);
}

function toast(msg, esError = true) {
    const el = document.getElementById('toastCheckout');
    const cuerpo = document.getElementById('toastCheckoutMsg');
    if (!el || !cuerpo) { alert(msg); return; }

    el.classList.toggle('bg-danger', esError);
    el.classList.toggle('bg-success', !esError);
    cuerpo.textContent = msg;

    if (typeof bootstrap !== 'undefined') {
        bootstrap.Toast.getOrCreateInstance(el, { delay: 4500 }).show();
    } else {
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 4500);
    }
}

const BTN_HTML = '<i class="fa fa-lock me-2"></i>Confirmar y Pagar';
function bloquearBtn(btn) {
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando...';
}
function restaurarBtn(btn) {
    if (!btn) return;
    btn.disabled = false;
    btn.innerHTML = BTN_HTML;
}

/* ═══════════════════════════════════════════════
   💬 WHATSAPP — Mensaje inteligente (CON CELULAR)
   ═══════════════════════════════════════════════ */
function construirMensajeWhatsApp(idPedido = null) {
    const nombreMetodo = NOMBRES_METODO[metodoActivo] || 'transferencia';
    const esContraEntrega = (metodoActivo === 3);

    const lineas = esContraEntrega
        ? ['Hola Vía Canes 🐾 Acabo de realizar un pedido *CONTRA ENTREGA*. Quiero coordinar la entrega.']
        : ['Hola Vía Canes 🐾 Acabo de realizar un pedido en la web. Adjunto el comprobante de pago.'];

    if (idPedido) lineas.push(`*📌 Número de Pedido: #${idPedido}*`);

    const celularInput = document.getElementById('checkCelular');
    const numeroCelular = celularInput ? celularInput.value.trim() : 'No especificado';
    lineas.push(`📱 *Celular:* ${numeroCelular}`);

    lineas.push('');
    lineas.push('🛒 *Detalle:*');
    carrito.forEach(item => {
        const cant = parseInt(item.cantidad) || 1;
        const precios = resolverPrecios(item);
        const nombre = String(item.nombre || item.nombre_producto || 'Producto').substring(0, 45);
        lineas.push(`• ${nombre} x${cant} — ${formatearCOP(precios.final * cant)}`);
    });

    lineas.push('');
    lineas.push(`Subtotal: ${formatearCOP(subtotalProductos)}`);
    lineas.push(`Envío: ${valorEnvio === 0 ? 'Gratis' : formatearCOP(valorEnvio)}`);
    lineas.push(`*💰 TOTAL A PAGAR (${nombreMetodo}): ${formatearCOP(totalPagar)}*`);

    /* 🆕 Nombre desde el FORMULARIO (por si el usuario lo editó),
          con fallback a los datos de sesión */
    const nombresForm   = document.getElementById('checkNombres')?.value.trim()   || '';
    const apellidosForm = document.getElementById('checkApellidos')?.value.trim() || '';
    const nombreFinal = `${nombresForm} ${apellidosForm}`.trim()
        || (datosUsuario ? `${datosUsuario.nombres || ''} ${datosUsuario.apellidos || ''}`.trim() : '');
    if (nombreFinal) lineas.push(`👤 Nombre: ${nombreFinal}`);

    const direccionInput = document.getElementById('checkDireccion');
    if (direccionInput && direccionInput.value.trim()) lineas.push(`📍 Dirección: ${direccionInput.value.trim()}`);

    const notasInput = document.getElementById('checkNotas');
    if (notasInput && notasInput.value.trim()) lineas.push(`📝 Notas: ${notasInput.value.trim()}`);

    return lineas.join('\n');
}

function actualizarPanelWhatsApp() {
    const panel = document.getElementById('panel-pago-whatsapp');
    if (!panel) return;

    const esDigital = METODOS_WHATSAPP.includes(metodoActivo);
    const esContraEntrega = (metodoActivo === 3);
    const texto = panel.querySelector('p');

    if (esDigital || esContraEntrega) {
        panel.classList.remove('d-none');
        if (texto) {
            texto.innerHTML = esContraEntrega
                    ? '<i class="fa fa-info-circle text-primary"></i> Al confirmar, se abrirá WhatsApp para coordinar la entrega de tu pedido.'
    : '<i class="fa fa-info-circle text-primary"></i> Al confirmar, verás el código QR para pagar y el botón para enviar tu comprobante por WhatsApp.';
        }
    } else {
        panel.classList.add('d-none');
    }
}

function actualizarEstadoBotonConfirmar() {
    const btn = document.getElementById('btnConfirmarPedido');
    if (!btn) return;
    btn.disabled = sesionBloqueada;
}

/* ═══════════════════════════════════════════════
   📲 QR + AVISO según método de pago
   ═══════════════════════════════════════════════ */
function actualizarQrSegunMetodo(metodoId) {
    const contenedor = document.getElementById('contenedor-pago-final');
    if (!contenedor) return;

    const titulo      = document.getElementById('titulo-qr-pago');
    const subtitulo   = document.getElementById('subtitulo-qr-pago');
    const boxEstatico = document.getElementById('qr-estatico-box');
    const imgReal     = document.getElementById('img-qr-real');
    const boxDinamico = document.getElementById('qr-dinamico-box');
    const numero      = document.getElementById('texto-numero-pago');
    const alertaTexto = document.getElementById('alert-estado-texto');

    boxEstatico?.classList.add('d-none');
    boxDinamico?.classList.add('d-none');

    const config = CONFIG_QR[metodoId];

    // Sin QR: Contra Entrega (3), Tarjeta (4) o método desconocido
    if (!config) {
        contenedor.classList.add('d-none');
        if (alertaTexto) {
            alertaTexto.textContent = metodoId === 3
                ? 'Tu pedido quedó guardado 🐾 Usa el botón verde de WhatsApp para coordinar la entrega: pagas en efectivo al recibirla.'
                : 'Tu pedido quedó guardado 🐾 Pronto nos contactaremos contigo para continuar con el proceso.';
        }
        return;
    }

    // Con QR: Nequi, Daviplata o Bre-B
    contenedor.classList.remove('d-none');
    boxEstatico.classList.remove('d-none');
    if (imgReal) imgReal.src = config.imagen;
    if (titulo) titulo.textContent = config.titulo;
    if (numero) numero.innerHTML = config.numero;
    if (subtitulo) subtitulo.style.display = 'block';

    if (alertaTexto) {
        alertaTexto.textContent = 'Último paso: paga escaneando el QR con tu app y envía el comprobante por WhatsApp (botón verde). Con eso despachamos tu pedido 🐾';
    }
}

function configurarPagoWhatsApp() {
    const radioActivo = document.querySelector('input[name="metodoPago"]:checked');
    metodoActivo = radioActivo ? parseInt(radioActivo.value) : 5;

    actualizarQrSegunMetodo(metodoActivo);
    actualizarPanelWhatsApp();

    document.querySelectorAll('input[name="metodoPago"]').forEach(radio => {
        radio.addEventListener('change', () => {
            metodoActivo = parseInt(radio.value);
            actualizarQrSegunMetodo(metodoActivo);
            actualizarPanelWhatsApp();
        });
    });
}

/* ─────────── 🚀 INICIO ─────────── */
function init() {
    try {
        carrito = JSON.parse(localStorage.getItem(KEY_CARRITO)) || [];
        if (!Array.isArray(carrito)) carrito = [];
    } catch (e) {
        console.error('Carrito corrupto:', e);
        carrito = [];
    }

    const pedidoGuardado = sessionStorage.getItem(KEY_PEDIDO_TMP);

    // Refresh post-compra: revivir confirmación con su QR y su botón de WhatsApp
    if (carrito.length === 0 && pedidoGuardado) {
        try {
            const { id, datos, whatsapp, metodo } = JSON.parse(pedidoGuardado);
            urlWhatsAppGuardada = whatsapp || null;
            metodoPedidoFinal   = metodo   || null;
            mostrarConfirmacion(id, datos);
        } catch (e) {
            window.location.replace('carrito.html');
        }
        return;
    }

    if (carrito.length === 0) {
        window.location.replace('carrito.html');
        return;
    }

    configurarPagoWhatsApp();
    renderizarResumen();
    verificarSesion();

    const formCheckout = document.getElementById('formCheckout');
    if (formCheckout) formCheckout.addEventListener('submit', manejarSubmit);
}

/* ─────────── 🔐 SESIÓN ─────────── */
async function verificarSesion() {
    /* 🆕 PASO 0: precarga instantánea desde la caché local.
       El formulario se ve lleno de una vez, sin esperar la red. */
    const cache = leerCacheEnvio();
    if (cache) prellenarFormularioEnvio(cache);

    const savedUser = localStorage.getItem('viaCanesUser');
    if (savedUser) {
        try {
            datosUsuario = JSON.parse(savedUser);
            prellenarFormularioEnvio(datosUsuario);   // 🆕 también precarga con esto
        } catch (e) {}
    }

    try {
        const res = await fetch(`${API_URL}?action=datos_usuario`, { credentials: 'same-origin' });
        const data = await res.json();

        if (res.ok && data.success && data.data) {
            datosUsuario = data.data;   // PHP manda sobre localStorage

            /* 🆕 Refresca la caché y rellena SOLO los campos que sigan vacíos
               (nunca pisa lo que el usuario editó mientras cargaba) */
            escribirCacheEnvio(data.data);
            prellenarFormularioEnvio(data.data);
            return true;
        }

        datosUsuario = null;
        sesionBloqueada = true;
        localStorage.removeItem('viaCanesUser');

    } catch (e) {
        console.error('Error de red verificando sesión:', e);
    }

    const alertBox = document.getElementById('alert-no-session');
    if (alertBox && !datosUsuario) alertBox.classList.remove('d-none');
    actualizarEstadoBotonConfirmar();
    return false;
}

/* ─────────── 📦 RESUMEN DE COMPRA ─────────── */
function renderizarResumen() {
    const cont = document.getElementById('checkout-items');
    if (!cont) return;
    cont.innerHTML = '';

    subtotalProductos = 0;
    ahorroPromociones = 0;

    if (carrito.length === 0) {
        cont.innerHTML = '<p class="text-center small text-muted">Tu carrito está vacío.</p>';
        return;
    }

    let htmlItems = '';

    carrito.forEach((item, index) => {
        try {
            const cantidad = parseInt(item.cantidad) || 1;
            const precios = resolverPrecios(item);
            const precioUnitario = precios.final;
            const precioOriginal = precios.original;
            const tieneDescuento = precios.tieneDescuento;

            const subtotalItem = precioUnitario * cantidad;
            subtotalProductos += subtotalItem;
            if (tieneDescuento) ahorroPromociones += (precioOriginal - precioUnitario) * cantidad;

            const imgUrl = normalizarUrlImagen(item.imagen);
            const nombreProducto = item.nombre || item.nombre_producto || 'Producto sin nombre';

            htmlItems += `
                <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                    <div class="d-flex align-items-center gap-2">
                        <img src="${imgUrl}" width="45" height="45" style="object-fit:cover;" class="rounded-3" alt="${nombreProducto}" onerror="this.src='../img/default-product.png'">
                        <div>
                            <h6 class="mb-0 small fw-bold text-truncate" style="max-width:150px;">${nombreProducto}</h6>
                            <small class="text-muted">Cant: ${cantidad} x ${formatearCOP(precioUnitario)}</small>
                            ${tieneDescuento ? `<br><small class="text-success"><i class="fa fa-tag me-1"></i>Ahorras ${formatearCOP((precioOriginal - precioUnitario) * cantidad)}</small>` : ''}
                        </div>
                    </div>
                    <span class="fw-bold small">${formatearCOP(subtotalItem)}</span>
                </div>
            `;
        } catch (error) {
            console.error(`Error renderizando producto ${index}:`, error, item);
        }
    });

    cont.innerHTML = htmlItems;

    valorEnvio = subtotalProductos >= VALOR_ENVIO_GRATIS ? 0 : COSTO_ENVIO_BASE;
    totalPagar = subtotalProductos + valorEnvio;

    document.getElementById('subtotal-productos').textContent = formatearCOP(subtotalProductos);

    const envioEl = document.getElementById('envio-cost');
    if (envioEl) {
        if (valorEnvio === 0) {
            envioEl.textContent = 'Gratis';
            envioEl.className = 'fw-bold text-success';
        } else {
            envioEl.textContent = formatearCOP(valorEnvio);
            envioEl.className = 'fw-bold';
        }
    }

    document.getElementById('checkout-total').textContent = formatearCOP(totalPagar);

    const rowDescuento = document.getElementById('row-descuento');
    const descuentoEl = document.getElementById('descuento');
    if (rowDescuento && descuentoEl) {
        if (ahorroPromociones > 0) {
            rowDescuento.style.display = 'flex';
            descuentoEl.textContent = '-' + formatearCOP(ahorroPromociones);
        } else {
            rowDescuento.style.display = 'none';
        }
    }

    actualizarPanelWhatsApp();
    actualizarEstadoBotonConfirmar();
}

/* ─────────── 💳 SUBMIT → Digital: QR + botón | Contra Entrega: abre WhatsApp ─────────── */
async function manejarSubmit(e) {
    e.preventDefault();

    const btn = document.getElementById('btnConfirmarPedido');

    /* 🆕 Nombres y apellidos del formulario */
    const nombres   = document.getElementById('checkNombres')?.value.trim()   || '';
    const apellidos = document.getElementById('checkApellidos')?.value.trim() || '';
    const celular   = document.getElementById('checkCelular')?.value.trim()   || '';
    const direccion = document.getElementById('checkDireccion')?.value.trim() || '';
    const notas     = document.getElementById('checkNotas')?.value.trim()     || '';
    const metodoPagoInput = document.querySelector('input[name="metodoPago"]:checked');
    const metodoPago = metodoPagoInput ? metodoPagoInput.value : null;

    if (!datosUsuario) {
        toast('Tu sesión expiró. Por favor inicia sesión nuevamente.', true);
        document.getElementById('alert-no-session')?.classList.remove('d-none');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }
    /* 🆕 Validación de nombres y apellidos */
    if (!nombres)   { toast('Por favor, ingresa tus nombres.', true);   document.getElementById('checkNombres')?.focus();   return; }
    if (!apellidos) { toast('Por favor, ingresa tus apellidos.', true); document.getElementById('checkApellidos')?.focus(); return; }
    if (!celular)   { toast('Por favor, ingresa tu número de celular.', true); document.getElementById('checkCelular')?.focus(); return; }
    if (!direccion) { toast('Ingresa tu dirección de envío.', true); document.getElementById('checkDireccion')?.focus(); return; }
    if (!metodoPago) { toast('Selecciona un método de pago.', true); return; }
    if (carrito.length === 0) { window.location.replace('carrito.html'); return; }

    if (parseInt(metodoPago) === 3) {
        const confirmar = confirm("Has seleccionado Pago Contra Entrega.\n\nEl repartidor llevará tu pedido y pagarás en efectivo al recibirlo.\n\nSe abrirá WhatsApp para coordinar la entrega. ¿Deseas continuar?");
        if (!confirmar) return;
    }

    bloquearBtn(btn);

    try {
        let subtotalCalc = 0;
        const itemsParaBackend = carrito.map(item => {
            const precios = resolverPrecios(item);
            const cantidad = parseInt(item.cantidad) || 1;
            subtotalCalc += precios.final * cantidad;
            return {
                id_producto: item.id_producto || item.id,
                cantidad: cantidad,
                precio_unitario: precios.final
            };
        });

        const costoEnvioCalc = subtotalCalc >= VALOR_ENVIO_GRATIS ? 0 : COSTO_ENVIO_BASE;
        const totalPagarCalc = subtotalCalc + costoEnvioCalc;

        const notasCompletas = [notas, `Celular de contacto: ${celular}`].filter(Boolean).join(' | ');

        const fd = new FormData();
        fd.append('action', 'crear_pedido');
        fd.append('items', JSON.stringify(itemsParaBackend));
        fd.append('nombres', nombres);        // 🆕
        fd.append('apellidos', apellidos);    // 🆕
        fd.append('direccion_envio', direccion);
        fd.append('notas', notasCompletas);
        fd.append('id_metodo_pago', metodoPago);
        fd.append('subtotal', subtotalCalc);
        fd.append('costo_envio', costoEnvioCalc);
        fd.append('total', totalPagarCalc);

        const res = await fetch(API_URL, { method: 'POST', body: fd, credentials: 'same-origin' });

        const texto = await res.text();
        let data;
        try { data = JSON.parse(texto); }
        catch { throw new Error('Respuesta inválida del servidor.'); }

        if (res.ok && data.success) {
            const idPedido = data.id_pedido || '—';

            metodoPedidoFinal = parseInt(metodoPago);

            /* ══════════ FLUJO SEGÚN MÉTODO DE PAGO ══════════
               Digital (Nequi/Daviplata/Bre-B): NO abre WhatsApp.
               Contra Entrega (3): SÍ abre WhatsApp inmediatamente. */
            urlWhatsAppGuardada = null;
            if (METODOS_WHATSAPP.includes(metodoPedidoFinal) || metodoPedidoFinal === 3) {
                urlWhatsAppGuardada = `https://wa.me/${WHATSAPP_NEGOCIO}?text=${encodeURIComponent(construirMensajeWhatsApp(idPedido))}`;
            }

            // 🆕 SOLO CONTRA ENTREGA: apertura inmediata de WhatsApp
            if (metodoPedidoFinal === 3 && urlWhatsAppGuardada) {
                const ventana = window.open(urlWhatsAppGuardada, '_blank', 'noopener');
                if (!ventana) {
                    toast('Usa el botón verde para coordinar tu entrega por WhatsApp.', false);
                }
            }

            /* 🆕 Guarda lo último que escribió el usuario -> próximas compras
               se prellenan al instante aunque la sesión tarde en responder */
            escribirCacheEnvio({ nombres, apellidos, celular, direccion });

            localStorage.removeItem(KEY_CARRITO);
            window.dispatchEvent(new Event('carrito-actualizado'));

            mostrarConfirmacion(idPedido, {
                nombre:    `${nombres} ${apellidos}`.trim() || (datosUsuario && datosUsuario.nombres) || 'Cliente',   // 🆕
                direccion: direccion,
                celular:   celular,
                subtotal:  subtotalCalc,
                envio:     costoEnvioCalc,
                total:     totalPagarCalc
            });

        } else {
            restaurarBtn(btn);
            toast(data.message || data.error || 'No se pudo crear el pedido.', true);
        }

    } catch (err) {
        console.error('Error en checkout:', err);
        restaurarBtn(btn);
        toast(err.message || 'Error de conexión. Intenta de nuevo.', true);
    }
}

/* ─────────── ✅ VISTA DE CONFIRMACIÓN ─────────── */
function marcarPasoFinal() {
    const paso2 = document.getElementById('paso-2');
    if (paso2) {
        paso2.innerHTML = '<i class="fa fa-check"></i>';
        paso2.classList.remove('paso-activo');
        paso2.classList.add('paso-completado');
    }
    const paso3 = document.getElementById('paso-3');
    if (paso3) {
        paso3.innerHTML = '<i class="fa fa-check"></i>';
        paso3.classList.remove('paso-pendiente');
        paso3.classList.add('paso-activo');
    }
    const texto3 = document.getElementById('texto-paso-3');
    if (texto3) {
        texto3.classList.remove('text-muted');
        texto3.classList.add('paso-texto-activo');
    }
}

/* ✅ El botón SIEMPRE se gestiona aquí.
   - Bre-B/Nequi/Daviplata -> "Enviar comprobante de pago por WhatsApp"
   - Contra Entrega        -> "Coordinar mi entrega por WhatsApp"
   - Tarjeta               -> se OCULTA */
function agregarBotonWhatsApp() {
    const btn = document.getElementById('btn-wa-confirmacion');
    if (!btn) return;

    if (!urlWhatsAppGuardada) {
        btn.classList.add('d-none');
        return;
    }

    btn.classList.remove('d-none');
    btn.href = urlWhatsAppGuardada;
    btn.innerHTML = (metodoPedidoFinal === 3)
        ? '<i class="fa-brands fa-whatsapp fa-lg"></i> Coordinar mi entrega por WhatsApp'
        : '<i class="fa-brands fa-whatsapp fa-lg"></i> Enviar comprobante de pago por WhatsApp';
}

function mostrarConfirmacion(idPedido, datos) {
    const vistaCheckout = document.getElementById('vista-checkout');
    const pantallaConfirmacion = document.getElementById('pantalla-confirmacion');

    if (vistaCheckout) vistaCheckout.classList.add('d-none');
    if (pantallaConfirmacion) pantallaConfirmacion.classList.remove('d-none');

    marcarPasoFinal();

    const elNumero = document.getElementById('conf-numero-pedido');
    if (elNumero) elNumero.textContent = '#' + idPedido;

    const elNombre = document.getElementById('conf-nombre');
    if (elNombre) elNombre.textContent = datos.nombre || 'Cliente';

    const elDir = document.getElementById('conf-direccion');
    if (elDir) elDir.textContent = datos.direccion || '-';

    const elSub = document.getElementById('conf-subtotal');
    if (elSub) elSub.textContent = formatearCOP(datos.subtotal);

    const elEnvio = document.getElementById('conf-envio');
    if (elEnvio) elEnvio.textContent = (datos.envio === 0 || datos.envio === '0') ? 'Gratis' : formatearCOP(datos.envio);

    const elTotal = document.getElementById('conf-total');
    if (elTotal) elTotal.textContent = formatearCOP(datos.total);

    // ✅ QR y aviso según el método con el que se pagó de verdad
    actualizarQrSegunMetodo(metodoPedidoFinal);

    sessionStorage.setItem(KEY_PEDIDO_TMP, JSON.stringify({
        id: idPedido,
        datos: datos,
        whatsapp: urlWhatsAppGuardada,
        metodo: metodoPedidoFinal
    }));

    agregarBotonWhatsApp();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ─────────── 🚀 ARRANQUE ─────────── */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
// Función que se ejecuta al hacer clic en "Finalizar Compra"
async function procesarCheckout() {
    // 1. ✅ Capturar correctamente el método de pago seleccionado
    const metodoPagoRadio = document.querySelector('input[name="metodo_pago"]:checked');
    
    if (!metodoPagoRadio) {
        alert("Por favor, selecciona un método de pago (Nequi, Daviplata, Contraentrega, etc.)");
        return;
    }

    const id_metodo_pago = metodoPagoRadio.value; // Ej: "1", "2", "3", "4"

    // 2. Preparar los datos (Ejemplo usando FormData)
    const formData = new FormData();
    formData.append('action', 'crear_pedido');
    formData.append('direccion_envio', document.getElementById('direccion').value);
    formData.append('notas', document.getElementById('notas').value || '');
    formData.append('id_metodo_pago', id_metodo_pago); // ✅ Aquí se envía al backend
    
    // Asumiendo que tienes un array 'carrito' con los productos
    formData.append('items', JSON.stringify(carrito)); 
    formData.append('subtotal', totalSubtotal);
    formData.append('costo_envio', costoEnvio);
    formData.append('total', totalFinal);

    // 3. Enviar a la API
    try {
        const response = await fetch('../api/panel-usuario_data.php', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert("¡Pedido realizado con éxito!");
            // Limpiar carrito, redirigir, etc.
            window.location.href = 'confirmacion.html?id=' + result.id_pedido;
        } else {
            alert("Error: " + result.error);
        }
    } catch (error) {
        console.error("Error de red:", error);
        alert("Hubo un error de conexión con el servidor.");
    }
}