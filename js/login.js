const API = 'http://localhost:3000';
 
async function login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const error = document.getElementById('mensaje-error');
 
    if (!email || !password) {
        error.style.display = 'block';
        error.textContent = 'Ingresa tu email y contraseña.';
        return;
    }
 
    try {
        const res = await fetch(`${API}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
 
        const data = await res.json();
 
        if (!res.ok) {
            error.style.display = 'block';
            error.textContent = data.error || 'Credenciales incorrectas.';
            return;
        }
 
        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
 
        if (data.usuario.rol === 'recepcionista') {
            window.location.href = 'panel-recepcionista.html';
        } else if (data.usuario.rol === 'doctor') {
            window.location.href = 'panel-doctor.html';
        }
    } catch (e) {
        error.style.display = 'block';
        error.textContent = 'No se pudo conectar con el servidor.';
    }
}
 
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') login();
});