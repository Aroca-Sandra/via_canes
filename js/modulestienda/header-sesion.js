// ================================================================
// HEADER SESIÓN GLOBAL - VERSIÓN UNIVERSAL (RAÍZ Y SUBCARPETAS)
// ================================================================

console.log('🔵 [header-sesion.js] Iniciando...');

// ================================================================
// HEADER SESIÓN GLOBAL - DETECCIÓN PRECISA DE RUTAS
// ================================================================

const CLAVE_USUARIO = 'viaCanesUser';

// ✅ DETECCIÓN PRECISA DE UBICACIÓN
const path = window.location.pathname;
const enCarpetaHtml = path.includes('/html/') || path.includes('\\html\\');
const enRaiz = path.endsWith('/') || path.endsWith('index.html') || !path.includes('/html/');

// Si estamos en html/promociones.html -> RUTA_BASE = '' (archivos en mismo nivel)
// Si estamos en index.html (raíz) -> RUTA_BASE = 'html/' (hay que entrar a la carpeta)
const RUTA_IMAGENES = enCarpetaHtml ? '../img/' : 'img/';
const RUTA_BASE = enCarpetaHtml ? '' : 'html/';

console.log(`📍 [Carrito] En carpeta html: ${enCarpetaHtml} | RUTA_IMAGENES: '${RUTA_IMAGENES}' | RUTA_BASE: '${RUTA_BASE}'`);
function actualizarHeaderSesion(userData) {
    const icono = document.getElementById('icono-cuenta-header');
    const texto = document.getElementById('texto-cuenta-header');
    const dropdownContent = document.getElementById('dropdown-cuenta-header');
    
    if (!dropdownContent) return;

    // Calcular iniciales
    let iniciales = '?';
    if (userData.nombres && userData.apellidos) {
        iniciales = (userData.nombres[0] + userData.apellidos[0]).toUpperCase();
    } else if (userData.nombre) {
        iniciales = userData.nombre[0].toUpperCase();
    } else if (userData.email) {
        iniciales = userData.email[0].toUpperCase();
    }

    // Actualizar Icono
    if (icono) {
        icono.outerHTML = `<span id="icono-cuenta-header" class="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary text-white" style="width:30px; height:30px; font-size:0.75rem; font-weight:700;">${iniciales}</span>`;
    }
    
    // Actualizar Texto
    if (texto) {
        texto.innerHTML = `Mi Cuenta <i class="fa fa-caret-down mini-flecha"></i>`;
    }

    // Actualizar Dropdown
    const nombreUsuario = userData.nombres || userData.nombre || 'Usuario';
    
    // ✅ RUTAS DINÁMICAS SEGÚN UBICACIÓN
    dropdownContent.innerHTML = `
        <div class="dropdown-card">
            <p class="dropdown-welcome" id="dropdown-welcome-msg">¡Hola, ${nombreUsuario}!</p>
            
            <!-- Enlace al Perfil -->
            <a href="${RUTA_BASE}panel-usuario.html" class="btn-iniciar-sesion mb-2 d-block text-center text-decoration-none" 
               style="background-color: var(--primary, #0d6efd); color: white; border-radius: 8px; padding: 8px;">
                <i class="fa fa-user me-2"></i>Mi Perfil
            </a>
            
            <button class="btn-iniciar-sesion w-100 border-0 bg-transparent text-danger fw-bold" id="btn-header-cerrar-sesion" style="cursor:pointer;">
                <i class="fa fa-sign-out-alt me-2"></i>Cerrar Sesión
            </button>
        </div>
    `;

    // Evento cerrar sesión
    document.getElementById('btn-header-cerrar-sesion')?.addEventListener('click', cerrarSesionGlobal);
}

function restaurarHeaderSesion() {
    const contenedor = document.getElementById('contenedor-cuenta-header');
    if (!contenedor) return;

    // ✅ RUTAS DINÁMICAS PARA LOGIN
    contenedor.innerHTML = `
        <a href="#" class="util-item dropdown-toggle" id="btn-cuenta-header">
            <i class="fa fa-user" id="icono-cuenta-header"></i>
            <span id="texto-cuenta-header">Cuenta <i class="fa fa-caret-down mini-flecha"></i></span>
        </a>
        <div class="dropdown-content" id="dropdown-cuenta-header">
            <div class="dropdown-card">
                <p class="dropdown-welcome" id="dropdown-welcome-msg">¡Bienvenido a Vía Canes!</p>
                <a href="${RUTA_BASE}auth.html" class="btn-iniciar-sesion d-block text-center text-decoration-none" 
                   style="background-color: var(--primary, #0d6efd); color: white; border-radius: 8px; padding: 8px;">
                   Iniciar sesión
                </a>
            </div>
        </div>
    `;
}

async function cerrarSesionGlobal() {
    if (!confirm('¿Cerrar sesión?')) return;
    
    // La API está en la raíz, así que necesitamos ajustar la ruta
    const rutaApi = enCarpetaHtml ? '../api/panel-usuario_data.php' : 'api/panel-usuario_data.php';
    
    try {
        await fetch(`${rutaApi}?action=cerrar_sesion`, { method: 'POST' });
    } catch (e) { 
        console.warn('Error al notificar cierre de sesión'); 
    }
    
    localStorage.removeItem(CLAVE_USUARIO);
    restaurarHeaderSesion();
    
    // Redirigir al index principal
    window.location.href = enCarpetaHtml ? '../index.html' : 'index.html';
}

function initHeader() {
    const savedUser = localStorage.getItem(CLAVE_USUARIO);
    if (savedUser) {
        try {
            const userData = JSON.parse(savedUser);
            actualizarHeaderSesion(userData);
        } catch(e) { 
            console.error('Error parseando usuario:', e); 
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeader);
} else {
    initHeader();
}

setTimeout(initHeader, 500);

window.addEventListener('storage', (event) => {
    if (event.key === CLAVE_USUARIO) {
        if (event.newValue === null) {
            restaurarHeaderSesion();
        } else {
            try {
                const userData = JSON.parse(event.newValue);
                actualizarHeaderSesion(userData);
            } catch(e){ 
                console.error('Error en storage event:', e); 
            }
        }
    }
});

window.actualizarHeaderSesion = actualizarHeaderSesion;
window.restaurarHeaderSesion = restaurarHeaderSesion;
window.cerrarSesionGlobal = cerrarSesionGlobal;

console.log('✅ [header-sesion.js] Funciones expuestas globalmente');