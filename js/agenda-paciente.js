function siguiente() {
    const nombre = document.getElementById('nombre').value.trim();
    const curp = document.getElementById('curp').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const error = document.getElementById('mensaje-error');
 
    if (!nombre || !curp || !email) {
        error.style.display = 'block';
        error.textContent = 'Por favor llena todos los campos obligatorios.';
        return;
    }
 
    sessionStorage.setItem('paciente', JSON.stringify({ nombre, curp, email, telefono }));
    window.location.href = 'agenda-servicio.html';
}
 