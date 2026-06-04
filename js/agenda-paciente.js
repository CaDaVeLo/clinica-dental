function siguiente() {
    const nombre = document.getElementById('nombre').value.trim();
    const curpRaw = document.getElementById('curp').value.trim();
    const curp = curpRaw.toUpperCase();
    const email = document.getElementById('email').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const error = document.getElementById('mensaje-error');
    error.style.display = 'none';

    if (!nombre || !curp || !email) {
        error.style.display = 'block';
        error.textContent = 'Por favor llena todos los campos obligatorios.';
        return;
    }

    // CURP: exactamente 18 caracteres alfanuméricos (formato oficial mexicano)
    if (!/^[A-Z]{4}\d{6}[HM][A-Z]{2}[A-Z\d]{3}[A-Z\d]\d$/.test(curp)) {
        error.style.display = 'block';
        error.textContent = 'La CURP debe tener 18 caracteres con el formato oficial (ej. VELC901215HSLRCS04).';
        return;
    }

    // Correo electrónico con formato válido
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        error.style.display = 'block';
        error.textContent = 'Ingresa un correo electrónico válido (ej. correo@gmail.com).';
        return;
    }

    // Teléfono: opcional, pero si se escribe debe tener exactamente 10 dígitos
    if (telefono && !/^\d{10}$/.test(telefono)) {
        error.style.display = 'block';
        error.textContent = 'El teléfono debe tener exactamente 10 dígitos numéricos.';
        return;
    }

    sessionStorage.setItem('paciente', JSON.stringify({ nombre, curp, email, telefono }));
    window.location.href = 'agenda-servicio.html';
}
