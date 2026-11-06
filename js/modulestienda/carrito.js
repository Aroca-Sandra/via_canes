// ================================================================
// PÁGINA DE CARRITO — carrito.js (CON ANIMACIONES INTEGRADAS)
// ================================================================

const CLAVE_STORAGE = 'viaCanesCarrito';
const VALOR_ENVIO_GRATIS = 100000;
const COSTO_ENVIO_BASE = 15000;
let sesionActiva = false;

/* ---------------- UTILIDADES ---------------- */
function obtenerCarrito() {
    try { return JSON.parse(localStorage.getItem(CLAVE_STORAGE)) || []; } 
    catch (error) { return []; }
}

function guardarCarrito(carrito) {
    try {
        localStorage.setItem(CLAVE_STORAGE, JSON.stringify(carrito));
        initCarritoPage();
        if (typeof window.actualizarVistaCarrito === 'function') {
            window.actualizarVistaCarrito();
        }
    } catch (error) { console.error('Error al guardar:', error); }
}

// ✨ FUNCIÓN NOTIFICACIÓN ACTUALIZADA (CON ANIMACIONES ENTER Y EXIT)
function mostrarNotificacion(mensaje, tipo = 'primary') {
    const toastEl = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    
    if (toastEl && toastMsg) {
        toastMsg.textContent = mensaje;
        toastEl.className = `toast align-items-center text-white border-0 bg-${tipo}`;
        
        // ✨ ANIMACIÓN DE ENTRADA (slideInRight + toast-enter)
        toastEl.classList.remove('hiding');
        toastEl.classList.add('show');
        
        const toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3000 });
        toast.show();

        // ✨ ANIMACIÓN DE SALIDA (slideOutRight + toast-exit)
        toastEl.addEventListener('hidden.bs.toast', function handler() {
            toastEl.classList.add('hiding'); // Activa la animación de salida
            setTimeout(() => {
                toastEl.classList.remove('show', 'hiding'); // Limpia clases al terminar
            }, 300); // 300ms coincide con la duración de @keyframes toast-exit
            
            // Remover el listener para evitar acumulación
            toastEl.removeEventListener('hidden.bs.toast', handler);
        }, { once: true });
    } else {
        alert(mensaje); // Fallback por si el toast no existe en el DOM
    }
}

function escaparHtml(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function resolverPrecios(item) {
    const precio = parseFloat(item.precio) || 0;
    const camposOferta = ['precioPromo', 'precio_promo', 'precioOferta', 'precio_oferta', 'oferta', 'special_price', 'precioDescuento', 'precio_descuento', 'precioEspecial', 'precio_especial', 'precioFinal', 'precio_final', 'salePrice', 'precioSale'];
    const camposOriginal = ['precioOriginal', 'precio_original', 'precioAnterior', 'precio_anterior', 'precioRegular', 'precio_regular', 'precioNormal', 'precio_normal', 'precioLista', 'precio_lista', 'precioAntes', 'precio_antes', 'oldPrice', 'precioOld', 'precio_tachado', 'precioTachado'];

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
    let imgUrl = url || '';
    if (imgUrl && !imgUrl.startsWith('http') && !imgUrl.startsWith('/')) {
        imgUrl = '../' + imgUrl.replace(/^(\.\.\/)+/, '');
    }
    return imgUrl;
}

function asegurarEstilos() {
    if (document.getElementById('estilos-carrito-pagina')) return;
    const style = document.createElement('style');
    style.id = 'estilos-carrito-pagina';
    style.textContent = `
        .btn-cantidad-input::-webkit-outer-spin-button,
        .btn-cantidad-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .btn-cantidad-input { -moz-appearance: textfield; }
    `;
    document.head.appendChild(style);
}

/* ---------------- RENDER PRINCIPAL ---------------- */
function initCarritoPage() {
    asegurarEstilos();
    const listaProductos = document.getElementById('lista-productos-carrito');
    if (!listaProductos) return;

    const contenedorVacio = document.getElementById('carrito-compras-vacio');
    const subtotalTexto   = document.getElementById('subtotal-texto');
    const subtotalElement = document.getElementById('subtotal');
    const envioElement    = document.getElementById('envio');
    const totalElement    = document.getElementById('total');
    const envioMsj        = document.getElementById('envio-msj');
    const envioBarra      = document.getElementById('envio-barra');

    const carrito = obtenerCarrito();

    if (carrito.length === 0) {
        listaProductos.innerHTML = '';
        if (contenedorVacio) contenedorVacio.classList.remove('d-none');
        if (subtotalTexto)   subtotalTexto.textContent = 'Subtotal (0 artículos)';
        if (subtotalElement) subtotalElement.textContent = '$0';
        if (envioElement)    envioElement.textContent = '$0';
        if (totalElement)    totalElement.textContent = '$0';
        if (envioBarra)      envioBarra.style.width = '0%';
        if (envioMsj)        envioMsj.innerHTML = '¡Añade productos para envío gratis!';
        return;
    }

    if (contenedorVacio) contenedorVacio.classList.add('d-none');

    let totalFinal = 0;
    let cantidadArticulos = 0;

    listaProductos.innerHTML = carrito.map(item => {
        const cantidad = parseInt(item.cantidad) || 1;
        const stock = parseInt(item.stock) || 999;
        const precios = resolverPrecios(item);
        const precioOriginalUnitario = precios.original;
        const precioFinalUnitario = precios.final;
        const tieneDescuento = precios.tieneDescuento;
        const subtotalItem = precioFinalUnitario * cantidad;
        
        cantidadArticulos += cantidad;
        totalFinal += subtotalItem;

        const imgUrl = normalizarUrlImagen(item.imagen);
        const nombreSeguro = escaparHtml(item.nombre);

        return `
        <div class="cart-item-container mb-3 p-3 border rounded-3 bg-white shadow-sm">
            <div class="row align-items-center">
                <div class="col-4 col-sm-3 col-md-2 text-center">
                    <img src="${imgUrl}" alt="${nombreSeguro}" class="img-fluid rounded-3" style="height: 90px; width: 90px; object-fit: cover;" onerror="this.onerror=null; this.src='../img/default-product.png'">
                </div>
                <div class="col-8 col-sm-9 col-md-5">
                    <h6 class="mb-1 fw-semibold text-dark" style="font-size: 1rem;">${nombreSeguro}</h6>
                    <div class="d-flex align-items-center gap-2 mb-1">
                        <span class="text-muted small">Precio unitario: 
                            ${tieneDescuento ? `<span class="text-decoration-line-through me-1">$${precioOriginalUnitario.toLocaleString('es-CO')}</span>` : ''}
                            <strong>$${precioFinalUnitario.toLocaleString('es-CO')}</strong>
                        </span>
                    </div>
                    <div class="text-muted small mb-2">Cantidad: <strong>${cantidad}</strong></div>
                </div>
                <div class="col-7 col-sm-6 col-md-3 text-center mt-3 mt-md-0">
                    <div class="btn-group" role="group">
                        <button type="button" class="btn btn-outline-secondary btn-sm btn-control-checkout" data-id="${item.id}" data-tipo="${item.tipo}" data-accion="restar"><i class="fa fa-minus" style="font-size:.7rem;"></i></button>
                        <input type="number" class="form-control form-control-sm btn-cantidad-input" data-id="${item.id}" data-tipo="${item.tipo}" value="${cantidad}" min="1" max="${stock}" style="width:54px; text-align:center; font-weight:600; border-left:0; border-right:0;">
                        <button type="button" class="btn btn-outline-secondary btn-sm btn-control-checkout" data-id="${item.id}" data-tipo="${item.tipo}" data-accion="sumar"><i class="fa fa-plus" style="font-size:.7rem;"></i></button>
                    </div>
                </div>
                <div class="col-5 col-sm-6 col-md-2 text-md-end text-center mt-3 mt-md-0 d-flex flex-column align-items-end justify-content-center h-100">
                    <div class="mb-2">
                        <span class="d-block text-muted small" style="font-size: 0.75rem;">Precio</span>
                        <span class="fw-bold text-dark" style="font-size: 1.35rem;">$${subtotalItem.toLocaleString('es-CO')}</span>
                    </div>
                    <button class="btn btn-link btn-eliminar-checkout text-danger p-0 mt-1" data-id="${item.id}" data-tipo="${item.tipo}" title="Eliminar"><i class="fa fa-trash me-1"></i> Eliminar</button>
                </div>
            </div>
        </div>`;
    }).join('');

    const subtotalMostrar = totalFinal;
    const costoEnvio = subtotalMostrar >= VALOR_ENVIO_GRATIS ? 0 : COSTO_ENVIO_BASE;
    const totalPagar = subtotalMostrar + costoEnvio;
    const plural = cantidadArticulos === 1 ? 'artículo' : 'artículos';

    if (subtotalTexto)   subtotalTexto.textContent = `Subtotal (${cantidadArticulos} ${plural})`;
    if (subtotalElement) subtotalElement.textContent = `$${subtotalMostrar.toLocaleString('es-CO')}`;
    if (envioElement) {
        if (costoEnvio === 0) {
            envioElement.textContent = '¡Gratis!';
            envioElement.classList.add('text-success');
            envioElement.classList.remove('text-dark');
        } else {
            envioElement.textContent = `$${costoEnvio.toLocaleString('es-CO')}`;
        }
    }
    if (totalElement) totalElement.textContent = `$${totalPagar.toLocaleString('es-CO')}`;

    if (envioBarra && envioMsj) {
        const porcentaje = Math.min((subtotalMostrar / VALOR_ENVIO_GRATIS) * 100, 100);
        envioBarra.style.width = `${porcentaje}%`;
        if (costoEnvio === 0) {
            envioMsj.innerHTML = ' ¡Felicidades! Tienes <strong>envío gratis</strong>';
            envioBarra.className = 'progress-bar bg-success';
        } else {
            const faltante = VALOR_ENVIO_GRATIS - subtotalMostrar;
            envioMsj.innerHTML = `Te faltan <strong>$${faltante.toLocaleString('es-CO')}</strong> para el envío gratis`;
            envioBarra.className = 'progress-bar bg-warning';
        }
    }
    asignarEventosBotones();
}

/* ---------------- EVENTOS ---------------- */
function asignarEventosBotones() {
    const contenedor = document.getElementById('lista-productos-carrito');
    if (!contenedor || contenedor.dataset.eventosActivos === 'true') return;
    contenedor.dataset.eventosActivos = 'true';

    contenedor.addEventListener('click', (e) => {
        const btnControl = e.target.closest('.btn-control-checkout');
        if (btnControl) {
            ejecutarCambioCantidad(parseInt(btnControl.dataset.id), btnControl.dataset.tipo, btnControl.dataset.accion);
            return;
        }
        const btnEliminar = e.target.closest('.btn-eliminar-checkout');
        if (btnEliminar) {
            ejecutarEliminacion(parseInt(btnEliminar.dataset.id), btnEliminar.dataset.tipo);
        }
    });

    contenedor.addEventListener('focusout', (e) => {
        if (e.target.classList.contains('btn-cantidad-input')) {
            actualizarCantidadDirecta(parseInt(e.target.dataset.id), e.target.dataset.tipo, parseInt(e.target.value));
        }
    });
    
    contenedor.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.classList.contains('btn-cantidad-input')) {
            e.preventDefault();
            e.target.blur();
        }
    });
}

/* ---------------- ACCIONES CARRITO ---------------- */
function actualizarCantidadDirecta(id, tipo, nuevaCantidad) {
    const carrito = obtenerCarrito();
    const idx = carrito.findIndex(i => parseInt(i.id) === id && i.tipo === tipo);
    if (idx === -1) return;
    const stock = parseInt(carrito[idx].stock) || 999;
    if (isNaN(nuevaCantidad) || nuevaCantidad < 1) { mostrarNotificacion('Mínimo 1', 'warning'); initCarritoPage(); return; }
    if (nuevaCantidad > stock) { mostrarNotificacion(`Stock máx: ${stock}`, 'warning'); initCarritoPage(); return; }
    carrito[idx].cantidad = nuevaCantidad;
    guardarCarrito(carrito);
}

function ejecutarCambioCantidad(id, tipo, accion) {
    const carrito = obtenerCarrito();
    const idx = carrito.findIndex(i => parseInt(i.id) === id && i.tipo === tipo);
    if (idx === -1) return;
    const stock = parseInt(carrito[idx].stock) || 999;
    
    if (accion === 'sumar') {
        if (carrito[idx].cantidad < stock) carrito[idx].cantidad++;
        else mostrarNotificacion('Stock máximo alcanzado', 'warning');
    } else if (accion === 'restar') {
        if (carrito[idx].cantidad > 1) carrito[idx].cantidad--;
        else { if(confirm('¿Quitar producto?')) ejecutarEliminacion(id, tipo); return; }
    }
    guardarCarrito(carrito);
}

function ejecutarEliminacion(id, tipo) {
    let carrito = obtenerCarrito();
    carrito = carrito.filter(i => !(parseInt(i.id) === id && i.tipo === tipo));
    mostrarNotificacion('Producto eliminado', 'danger');
    guardarCarrito(carrito);
}

/* ---------------- INICIALIZACIÓN ---------------- */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🛒 carrito.js: DOMContentLoaded');
    initCarritoPage();

    // 1. Verificar sesión al cargar
    const savedUser = localStorage.getItem('viaCanesUser');
    if (savedUser) {
        try {
            const userData = JSON.parse(savedUser);
            sesionActiva = true;
            console.log('✅ carrito.js: Sesión activa encontrada:', userData);
            if (typeof window.actualizarHeaderSesion === 'function') {
                window.actualizarHeaderSesion(userData);
                console.log('✅ carrito.js: Header actualizado via window.actualizarHeaderSesion');
            } else {
                console.warn('⚠️ window.actualizarHeaderSesion no está disponible');
            }
        } catch(e) { console.error('❌ Error parseando usuario:', e); }
    } else {
        console.log('️ carrito.js: No hay sesión activa');
    }

    // 2. Botón Vaciar Carrito
    const btnVaciar = document.getElementById('btn-confirmar-vaciar');
    if (btnVaciar) {
        btnVaciar.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('¿Vaciar carrito?')) {
                guardarCarrito([]);
                mostrarNotificacion('Carrito vaciado', 'info');
            }
        });
    }

    // 3. Botón Finalizar Compra
    const btnFinalizar = document.getElementById('btn-finalizar');
    if (btnFinalizar) {
        btnFinalizar.addEventListener('click', (e) => {
            e.preventDefault();
            const carrito = obtenerCarrito();
            if (carrito.length === 0) { mostrarNotificacion('Carrito vacío', 'warning'); return; }
            
            if (!sesionActiva) {
                const modalElement = document.getElementById('modalAuthInSitu');
                if (modalElement) {
                    new bootstrap.Modal(modalElement).show();
                } else {
                    window.location.href = 'auth.html';
                }
            } else {
                window.location.href = 'checkout.html';
            }
        });
    }

    // 4. Modal Login/Registro Tabs
    const btnTabLogin = document.getElementById('btnTabLogin');
    const btnTabRegistro = document.getElementById('btnTabRegistro');
    const wrapperLogin = document.getElementById('wrapper-login-insitu');
    const wrapperRegistro = document.getElementById('wrapper-registro-insitu');

    if (btnTabLogin && btnTabRegistro) {
        btnTabLogin.addEventListener('click', () => {
            btnTabLogin.classList.add('btn-primary', 'text-white'); 
            btnTabLogin.classList.remove('text-secondary');
            btnTabRegistro.classList.remove('btn-primary', 'text-white'); 
            btnTabRegistro.classList.add('text-secondary');
            wrapperLogin.classList.remove('d-none'); 
            wrapperRegistro.classList.add('d-none');
        });
        btnTabRegistro.addEventListener('click', () => {
            btnTabRegistro.classList.add('btn-primary', 'text-white'); 
            btnTabRegistro.classList.remove('text-secondary');
            btnTabLogin.classList.remove('btn-primary', 'text-white'); 
            btnTabLogin.classList.add('text-secondary');
            wrapperRegistro.classList.remove('d-none'); 
            wrapperLogin.classList.add('d-none');
        });
    }

    // ✨ Submit Login CON EFECTO SHAKE
    const formLogin = document.getElementById('formLoginInSitu');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('authEmail');
            const passwordInput = document.getElementById('authPassword');
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            
            let hayError = false;

            // ✨ VALIDACIÓN CON ANIMACIÓN SHAKE
            if (!email) {
                emailInput.classList.add('shake', 'input-error');
                setTimeout(() => emailInput.classList.remove('shake', 'input-error'), 500);
                hayError = true;
            }
            if (!password) {
                passwordInput.classList.add('shake', 'input-error');
                setTimeout(() => passwordInput.classList.remove('shake', 'input-error'), 500);
                hayError = true;
            }

            if (hayError) {
                mostrarNotificacion('Por favor completa todos los campos', 'danger');
                return;
            }

            mostrarNotificacion('Verificando...', 'info');
            
            try {
                const res = await fetch('../api/auth-controller.php', {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'login', email, password })
                });
                const data = await res.json();
                
                if (res.ok && data.success) {
                    sesionActiva = true;
                    const userData = data.usuario || data.user || { email };
                    localStorage.setItem('viaCanesUser', JSON.stringify(userData));
                    
                    console.log('✅ Login exitoso, actualizando header...');
                    if (typeof window.actualizarHeaderSesion === 'function') {
                        window.actualizarHeaderSesion(userData);
                    }
                    
                    const modal = bootstrap.Modal.getInstance(document.getElementById('modalAuthInSitu'));
                    if (modal) modal.hide();
                    
                    mostrarNotificacion('¡Bienvenido de vuelta! 🐾', 'success');
                    setTimeout(() => window.location.href = 'checkout.html', 1000);
                } else {
                    mostrarNotificacion(data.message || 'Credenciales incorrectas', 'danger');
                }
            } catch (err) { 
                mostrarNotificacion('Error de conexión con el servidor', 'danger'); 
                console.error('❌ Error login:', err);
            }
        });
    }

    // ✨ Submit Registro CON EFECTO SHAKE
    const formReg = document.getElementById('formRegistroInSitu');
    if (formReg) {
        formReg.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const inputs = {
                nombres: document.getElementById('regNombres'),
                apellidos: document.getElementById('regApellidos'),
                celular: document.getElementById('regCelular'),
                email: document.getElementById('regEmail'),
                password: document.getElementById('regPassword')
            };
            
            let hayError = false;

            // ✨ VALIDACIÓN CON ANIMACIÓN SHAKE PARA CADA CAMPO
            for (const [key, input] of Object.entries(inputs)) {
                if (!input.value.trim()) {
                    input.classList.add('shake', 'input-error');
                    setTimeout(() => input.classList.remove('shake', 'input-error'), 500);
                    hayError = true;
                }
            }

            if (hayError) {
                mostrarNotificacion('Por favor completa todos los campos del formulario', 'danger');
                return;
            }
            
            const datosRegistro = {
                action: 'register',
                nombres: inputs.nombres.value.trim(),
                apellidos: inputs.apellidos.value.trim(),
                celular: inputs.celular.value.trim(),
                email: inputs.email.value.trim(),
                password: inputs.password.value.trim()
            };

            try {
                const res = await fetch('../api/auth-controller.php', {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datosRegistro)
                });
                const data = await res.json();
                
                if (res.ok && data.success) {
                    sesionActiva = true;
                    const userData = data.usuario || { email: datosRegistro.email, nombres: datosRegistro.nombres };
                    localStorage.setItem('viaCanesUser', JSON.stringify(userData));
                    
                    console.log('✅ Registro exitoso, actualizando header...');
                    if (typeof window.actualizarHeaderSesion === 'function') {
                        window.actualizarHeaderSesion(userData);
                    }

                    const modal = bootstrap.Modal.getInstance(document.getElementById('modalAuthInSitu'));
                    if (modal) modal.hide();
                    
                    mostrarNotificacion('¡Cuenta creada exitosamente! 🎉', 'success');
                    setTimeout(() => window.location.href = 'checkout.html', 1500);
                } else {
                    mostrarNotificacion(data.message || 'Error al registrar', 'danger');
                }
            } catch (err) { 
                mostrarNotificacion('Error de conexión', 'danger');
                console.error('❌ Error registro:', err);
            }
        });
    }

    // 5. ESCUCHADOR DE CAMBIOS EN localStorage (sincronización entre pestañas)
    window.addEventListener('storage', (event) => {
        if (event.key === 'viaCanesUser') {
            if (event.newValue === null) {
                sesionActiva = false;
                console.log('🔄 Sesión cerrada desde otra pestaña');
                if (typeof window.restaurarHeaderSesion === 'function') {
                    window.restaurarHeaderSesion();
                }
            } else {
                try {
                    const userData = JSON.parse(event.newValue);
                    sesionActiva = true;
                    console.log('🔄 Sesión actualizada desde otra pestaña:', userData);
                    if (typeof window.actualizarHeaderSesion === 'function') {
                        window.actualizarHeaderSesion(userData);
                    }
                } catch(e){ console.error(' Error en storage event:', e); }
            }
        }
    });
});

// Exponer funciones del carrito
window.viaCanesCarrito = { initCarritoPage, guardarCarrito, obtenerCarrito };