// js/modulestienda/app-state.js

const CLAVE_CARRITO = 'viaCanesCarrito';
const CLAVE_USUARIO = 'viaCanesUser';

// --- GESTIÓN DEL CARRITO (Centralizada) ---
export function obtenerCarrito() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_CARRITO)) || [];
    } catch { 
        return []; 
    }
}

export function guardarCarrito(carrito) {
    localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
    actualizarContadorHeader(); // Actualiza el numerito rojo del header
}

export function agregarAlCarrito(producto) {
    let carrito = obtenerCarrito();
    const existe = carrito.find(p => p.id === producto.id && p.tipo === producto.tipo);
    
    if (existe) {
        existe.cantidad += parseInt(producto.cantidad) || 1;
    } else {
        carrito.push({ ...producto, cantidad: parseInt(producto.cantidad) || 1 });
    }
    
    guardarCarrito(carrito);
    mostrarToast('Producto agregado al carrito 🐾', 'success');
}

// --- GESTIÓN DE SESIÓN (Centralizada) ---
export function verificarSesion() {
    const user = localStorage.getItem(CLAVE_USUARIO);
    return user ? JSON.parse(user) : null;
}

export function cerrarSesion() {
    localStorage.removeItem(CLAVE_USUARIO);
    // Detecta automáticamente si estamos en carpeta html o raíz para redirigir bien
    const path = window.location.pathname;
    const enCarpeta = path.includes('/html/') || path.includes('\\html\\');
    window.location.href = enCarpeta ? '../index.html' : 'index.html';
}

export function requireAuth(redirectUrl = 'auth.html') {
    if (!verificarSesion()) {
        window.location.href = redirectUrl;
    }
}

// --- ACTUALIZACIÓN DE UI GLOBAL (Header) ---
export function initGlobalUI() {
    actualizarContadorHeader();
    actualizarMenuUsuario();
}

function actualizarContadorHeader() {
    const carrito = obtenerCarrito();
    const totalItems = carrito.reduce((acc, item) => acc + (parseInt(item.cantidad) || 0), 0);
    
    // ✅ CORRECCIÓN: Incluye #contador-carrito que es el ID que usas en tus HTML
    const badges = document.querySelectorAll('.cart-badge, #contador-carrito, #cart-count'); 
    badges.forEach(badge => {
        badge.textContent = totalItems;
        badge.style.display = totalItems > 0 ? 'inline-block' : 'none';
        
        // Pequeña animación pop-in si el número cambia
        if (totalItems > 0) {
            badge.classList.remove('popIn');
            void badge.offsetWidth; 
            badge.classList.add('popIn');
        }
    });
}

function actualizarMenuUsuario() {
    const user = verificarSesion();
    const accountLink = document.querySelector('.utility-icons a[href*="auth.html"] span');
    const accountIcon = document.querySelector('.utility-icons a[href*="auth.html"] i');
    
    if (user && accountLink) {
        // Si hay usuario, cambiamos el texto "Cuenta" por su nombre
        accountLink.textContent = user.nombres ? user.nombres.split(' ')[0] : 'Mi Cuenta';
        
        // Cambiar enlace al panel (ajusta la ruta si es necesario)
        const path = window.location.pathname;
        const enCarpeta = path.includes('/html/') || path.includes('\\html\\');
        const rutaPanel = enCarpeta ? 'panel-usuario.html' : 'html/panel-usuario.html';
        
        document.querySelector('.utility-icons a[href*="auth.html"]').href = rutaPanel;
        if(accountIcon) accountIcon.className = 'fa fa-user-check text-success';
    }
}

function mostrarToast(msg, tipo = 'success') {
    const toastEl = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    
    if(toastEl && toastMsg) {
        toastMsg.textContent = msg;
        toastEl.className = `toast align-items-center text-white border-0 bg-${tipo} show`;
        
        const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
        toast.show();
    } else {
        console.log(`[${tipo.toUpperCase()}] ${msg}`); 
    }
}

// ================================================================
// ✅ EXPORTACIÓN GLOBAL (CRUCIAL PARA LA COMPATIBILIDAD)
// Esto permite que main.js, carrito.js y el HTML usen estas funciones
// sin necesidad de importarlas, evitando errores de "función no definida".
// ================================================================
window.obtenerCarrito = obtenerCarrito;
window.guardarCarrito = guardarCarrito;
window.agregarAlCarrito = agregarAlCarrito;
window.verificarSesion = verificarSesion;
window.cerrarSesion = cerrarSesion;
window.requireAuth = requireAuth;
window.initGlobalUI = initGlobalUI;
window.mostrarToast = mostrarToast;

// Inicializar al cargar si el DOM ya está listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalUI);
} else {
    initGlobalUI();
}