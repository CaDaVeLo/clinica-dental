const API = 'http://localhost:3000';
let metodoPago = null;
 
const paciente = JSON.parse(sessionStorage.getItem('paciente') || '{}');
const servicio = JSON.parse(sessionStorage.getItem('servicio') || '{}');
const fecha = sessionStorage.getItem('fecha');
const hora = sessionStorage.getItem('hora');
 
function cargarResumen() {
    document.getElementById('resumen').innerHTML = `
        <h4>Resumen de tu cita</h4>
        <div class="resumen-fila"><span>Paciente</span><span>${paciente.nombre || '-'}</span></div>
        <div class="resumen-fila"><span>Servicio</span><span>${servicio.nombre || '-'}</span></div>
        <div class="resumen-fila"><span>Fecha</span><span>${fecha || '-'}</span></div>
        <div class="resumen-fila"><span>Hora</span><span>${hora || '-'}</span></div>
        <div class="resumen-fila"><span>Total</span><span>$${Number(servicio.precio || 0).toLocaleString()} MXN</span></div>
    `;
}
 
function seleccionarPago(metodo, el) {
    document.querySelectorAll('.metodo-btn').forEach(b => b.classList.remove('seleccionado'));
    el.classList.add('seleccionado');
    metodoPago = metodo;
}
 
async function confirmar() {
    const error = document.getElementById('mensaje-error');
 
    if (!metodoPago) {
        error.style.display = 'block';
        error.textContent = 'Selecciona un método de pago.';
        return;
    }
 
    if (!paciente.curp || !servicio.id || !fecha || !hora) {
        error.style.display = 'block';
        error.textContent = 'Faltan datos. Regresa al inicio del formulario.';
        return;
    }
 
    const doctor_id = sessionStorage.getItem('doctor_id');
 
    const body = {
        paciente,
        servicio_id: Number(servicio.id),
        doctor_id: doctor_id ? parseInt(doctor_id) : null,
        fecha,
        hora,
        metodo_pago: metodoPago
    };
 
    try {
        const res = await fetch(`${API}/citas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
 
        const data = await res.json();
 
        if (!res.ok) {
            error.style.display = 'block';
            error.textContent = data.error || 'Error al crear la cita.';
            return;
        }
 
        sessionStorage.clear();
        window.location.href = 'mis-citas.html';
    } catch (e) {
        error.style.display = 'block';
        error.textContent = 'No se pudo conectar con el servidor.';
    }
}
 
cargarResumen();