const API = 'http://localhost:3000';

function mostrarError(msg) {
    const errorDiv = document.getElementById('mensaje-error');
    const textoError = document.getElementById('texto-error');
    if (textoError) textoError.textContent = msg;
    errorDiv.classList.add('visible');
}

function ocultarError() {
    document.getElementById('mensaje-error').classList.remove('visible');
}

function setBtnCargando(activo) {
    const btn = document.getElementById('btn-entrar');
    if (!btn) return;
    if (activo) {
        btn.classList.add('cargando');
    } else {
        btn.classList.remove('cargando');
    }
}

async function login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    ocultarError();

    if (!email || !password) {
        mostrarError('Ingresa tu email y contraseña.');
        return;
    }

    setBtnCargando(true);

    try {
        const res = await fetch(`${API}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            mostrarError(data.error || 'Credenciales incorrectas.');
            setBtnCargando(false);
            return;
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));

        if (data.usuario.rol === 'admin') {
            window.location.href = 'panel-admin.html';
        } else if (data.usuario.rol === 'recepcionista') {
            window.location.href = 'panel-recepcionista.html';
        } else if (data.usuario.rol === 'doctor') {
            window.location.href = 'panel-doctor.html';
        }
    } catch (e) {
        mostrarError('No se pudo conectar con el servidor.');
        setBtnCargando(false);
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') login();
});
