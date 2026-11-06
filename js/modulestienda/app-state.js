// js/modulestienda/app-state.js

const CLAVE_CARRITO = 'viaCanesCarrito';
const CLAVE_USUARIO = 'viaCanesUser';

// --- GESTIÓN DEL CARRITO (Centralizada) ---
export function obtenerCarrito() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_CARRITO)) || [];
    } catch { return []; }
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
    mostrarToast('Producto agregado al carrito 🐾');
}

// --- GESTIÓN DE SESIÓN (Centralizada) ---
export function verificarSesion() {
    const user = localStorage.getItem(CLAVE_USUARIO);
    return user ? JSON.parse(user) : null;
}

export function cerrarSesion() {
    localStorage.removeItem(CLAVE_USUARIO);
    window.location.href = '../index.html';
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
    const totalItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);
    
    // Busca cualquier elemento con ID o clase que sirva para mostrar el contador
    // Nota: Deberás agregar <span id="cart-count">0</span> en tu HTML del header cerca del icono del carrito
    const badges = document.querySelectorAll('.cart-badge, #cart-count'); 
    badges.forEach(badge => {
        badge.textContent = totalItems;
        badge.style.display = totalItems > 0 ? 'inline-block' : 'none';
    });
}

function actualizarMenuUsuario() {
    const user = verificarSesion();
    const accountLink = document.querySelector('.utility-icons a[href*="auth.html"] span');
    const accountIcon = document.querySelector('.utility-icons a[href*="auth.html"] i');
    
    if (user && accountLink) {
        // Si hay usuario, cambiamos el texto "Cuenta" por su nombre
        accountLink.textContent = user.nombres ? user.nombres.split(' ')[0] : 'Mi Cuenta';
        // Opcional: Cambiar enlace al panel
        document.querySelector('.utility-icons a[href*="auth.html"]').href = 'panel-usuario.html';
        if(accountIcon) accountIcon.className = 'fa fa-user-check text-success';
    }
}

function mostrarToast(msg) {
    // Reutilizamos tu lógica de toast si existe, o usamos alert simple por ahora
    const toastEl = document.getElementById('toast');
    if(toastEl) {
        document.getElementById('toastMsg').textContent = msg;
        new bootstrap.Toast(toastEl).show();
    } else {
        console.log(msg); 
    }
}