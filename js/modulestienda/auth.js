// js/auth.js

// --- FUNCIONES DE UI ---
function showForm(formName) { //oculta o muestra los formularios (Login, Registro, Recuperación) según lo que el usuario presione.
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));

    if (formName === 'login') {
        document.getElementById('loginForm').classList.add('active');
        document.querySelectorAll('.auth-tab')[0].classList.add('active');
    } else if (formName === 'register') {
        document.getElementById('RegisterForm').classList.add('active');
        document.querySelectorAll('.auth-tab')[1].classList.add('active');
    } else if (formName === 'recover') {
        document.getElementById('RecoverForm').classList.add('active');
    } else if (formName === 'reset') {
        // ✨ SOLUCIÓN: Limpiamos los campos del formulario de restablecer para que no se quede nada pegado
        if (document.getElementById('resetToken')) document.getElementById('resetToken').value = '';
        if (document.getElementById('resetPassword')) {
            const newPasswordInput = document.getElementById('resetPassword');
            newPasswordInput.value = '';
            newPasswordInput.type = 'password'; // Asegura que empiece oculto
        }
        
        // Si tenías algún ícono de ojo en este formulario, reiniciamos el ícono a "ojo cerrado" usando tu selector real
        const resetEyeIcon = document.querySelector('#resetForm .auth-pw-toggle i');
        if (resetEyeIcon) {
            resetEyeIcon.classList.remove('fa-eye-slash');
            resetEyeIcon.classList.add('fa-eye');
        }

        document.getElementById('resetForm').classList.add('active');
    }
}

function togglePassword(btn) { //cambia el tipo de input de password a text para que el usuario pueda ver u ocultar lo que escribe al dar clic en el ícono del ojo (fa-eye).
    const input = btn.previousElementSibling;
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

function showMessage(type, text) {
    const errorDiv = document.getElementById('authError');
    const successDiv = document.getElementById('authSuccess');
    
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';

    if (type === 'error') {
        errorDiv.innerText = text;
        errorDiv.style.display = 'block';
    } else {
        successDiv.innerText = text;
        successDiv.style.display = 'block';
    }
}

function toggleLoader(show) {
    document.getElementById('loader').style.display = show ? 'flex' : 'none';
}

// Función auxiliar para procesar respuestas del servidor
async function processResponse(res) {
    const data = await res.json();
    
    // Verificar si la respuesta HTTP fue exitosa (2xx)
    if (!res.ok) {
        throw new Error(data.message || 'Error del servidor');
    }
    
    return data;
}

// Medidor de fuerza de contraseña
document.getElementById('regPassword')?.addEventListener('input', function(e) {
    const val = e.target.value;
    let strength = 0;
    if (val.length >= 6) strength++;
    if (val.length >= 10) strength++;
    if (/[A-Z]/.test(val) && /[0-9]/.test(val)) strength++;
    if (/[^A-Za-z0-9]/.test(val)) strength++;

    const bars = [document.getElementById('pwBar1'), document.getElementById('pwBar2'), document.getElementById('pwBar3'), document.getElementById('pwBar4')];
    const colors = ['#ff4d4d', '#ffaa00', '#00cc66', '#007bff'];
    const hints = ['Muy débil', 'Débil', 'Buena', 'Fuerte'];

    bars.forEach((bar, i) => {
        bar.style.backgroundColor = i < strength ? colors[strength-1] : '#e0e0e0';
    });
    document.getElementById('pwHint').innerText = val.length > 0 ? hints[strength-1] || '' : '';
});


// --- FUNCIONES DE PETICIONES AL BACKEND ---

async function handleLogin(e) {
    if (e) e.preventDefault(); 
    toggleLoader(true);
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch('../api/auth-controller.php', {  
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', email, password })
        });
        
        const data = await processResponse(res);
        
        if (data.success) {
            showMessage('success', data.message);
            setTimeout(() => window.location.href = data.redirect, 1000);
        }
    } catch (err) {
        showMessage('error', err.message || 'Error de conexión con el servidor.');
    } finally {
        toggleLoader(false);
    }
}

// Función auxiliar para validar la complejidad de la contraseña
function validarPasswordCompleja(password) {
    // Al menos: 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial
    const regex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;
    return regex.test(password);
}

async function handleRegister(e) {
    if (e) e.preventDefault(); 
    toggleLoader(true);
    const nombres = document.getElementById('regNames').value;
    const apellidos = document.getElementById('regLastnames').value;
    const celular = document.getElementById('regPhone').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const terms = document.getElementById('regTerms').checked;

    if (!terms) {
        showMessage('error', 'Debes aceptar los términos y condiciones.');
        toggleLoader(false);
        return;
    }
    // NUEVA VALIDACIÓN EN REGISTRO
    if (!validarPasswordCompleja(password)) {
        showMessage('error', 'La contraseña debe tener al menos 6 caracteres, incluyendo una mayúscula, una minúscula, un número y un carácter especial.');
        toggleLoader(false);
        return;
    }

    try {
        const res = await fetch('../api/auth-controller.php', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'register', nombres, apellidos, celular, email, password })
        });
        
        const data = await processResponse(res);
        
        if (data.success) {
            showMessage('success', data.message + " Ya puedes iniciar sesión.");
            setTimeout(() => showForm('login'), 2000);
        }
    } catch (err) {
        showMessage('error', err.message || 'Error de conexión con el servidor.');
    } finally {
        toggleLoader(false);
    }
}

async function handleRecover(e) {
    if (e) e.preventDefault(); 
    toggleLoader(true);
    const email = document.getElementById('recovery-email').value;

    try {
        const res = await fetch('../api/auth-controller.php', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'recover', email })
        });
        
        const data = await processResponse(res);
        
        if (data.success) {
            showMessage('success', data.message + ` (Tu código de prueba es: ${data.debug_token})`);
            // ✨ SOLUCIÓN: Cambié de 3000ms a 1000ms (1 segundo) para que la pestaña no se demore tanto en cambiar
            setTimeout(() => showForm('reset'), 1000);
        }
    } catch (err) {
        showMessage('error', err.message || 'Error de conexión con el servidor.');
    } finally {
        toggleLoader(false);
    }
}

async function handleReset(e) {
    if (e) e.preventDefault(); 
    toggleLoader(true);
    const token = document.getElementById('resetToken').value;
    const password = document.getElementById('resetPassword').value;

    // ✨ CORRECCIÓN: Restablecemos la validación del lado de la UI para evitar peticiones innecesarias
    if (!validarPasswordCompleja(password)) {
        showMessage('error', 'La nueva contraseña debe tener al menos 6 caracteres, incluyendo una mayúscula, una minúscula, un número y un carácter especial.');
        toggleLoader(false);
        return;
    }

    try {
        const res = await fetch('../api/auth-controller.php', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'reset', 
                token: token, 
                password: password,     // Mapeado como password
                newPassword: password   // Mapeado como newPassword por compatibilidad estricta con el backend
            })
        });
        
        const data = await processResponse(res);
        
        if (data.success) {
            showMessage('success', data.message + " Inicia sesión con tu nueva clave.");
            setTimeout(() => showForm('login'), 2000);
        }
    } catch (err) {
        showMessage('error', err.message || 'Error de conexión con el servidor.');
    } finally {
        toggleLoader(false);
    }
}