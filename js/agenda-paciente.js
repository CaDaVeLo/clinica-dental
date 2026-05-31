// ─────────────────────────────────────────────
//  agenda-paciente.js  —  Paso 1: Datos del paciente
//
//  Responsabilidad:
//    - Validar que los campos requeridos no estén vacíos
//    - Guardar los datos en localStorage con store.set('paciente', {...})
//    - Navegar al siguiente paso: agenda-servicio.html
// ─────────────────────────────────────────────
import { store } from './api.js';
 
const inputs = {
    nombre: document.getElementById('input-nombre'),
    curp:   document.getElementById('input-curp'),
    email:  document.getElementById('input-email'),
    tel:    document.getElementById('input-tel'),
};
 
const btnSiguiente = document.querySelector('.btn-siguiente');
 
btnSiguiente.addEventListener('click', (e) => {
    e.preventDefault();
 
    const nombre = inputs.nombre.value.trim();
    const curp   = inputs.curp.value.trim().toUpperCase();
    const email  = inputs.email.value.trim();
    const tel    = inputs.tel.value.trim();
 
    // Validación básica
    if (!nombre || !curp || !email) {
        alert('Por favor completa los campos obligatorios: Nombre, CURP y Correo.');
        return;
    }
 
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('Ingresa un correo electrónico válido.');
        return;
    }
 
    // Guardar en localStorage para usarlo en agenda-pago.html
    store.set('paciente', { nombre, curp, email, telefono: tel });
 
    window.location.href = 'agenda-servicio.html';
});