// ─────────────────────────────────────────────
//  agenda-pago.js  —  Paso 4: Método de pago y confirmación
//
//  Responsabilidad:
//    - Leer paciente, servicio y slot de localStorage
//    - Rellenar el resumen de la cita en pantalla
//    - Capturar el método de pago elegido
//    - Al confirmar, hacer POST /citas con todos los datos
//    - Si hay éxito → limpiar localStorage y redirigir a mis-citas.html
//    - Si hay error → mostrar el mensaje devuelto por la API
//
//  HTML necesario en agenda-pago.html:
//    <div class="metodos-pago">
//      <div class="metodo-btn seleccionado">Efectivo</div>
//      <div class="metodo-btn">Débito</div>
//      <div class="metodo-btn">Crédito</div>
//      <div class="metodo-btn">Seguro</div>
//    </div>
//    <span data-campo="paciente"></span>
//    <span data-campo="servicio"></span>
//    <span data-campo="fecha"></span>
//    <span data-campo="hora"></span>
//    <span data-campo="doctor"></span>
//    <span data-campo="pago"></span>
//    <span data-campo="total"></span>
//    <button class="btn-confirmar">Confirmar cita</button>
//    <p id="error-msg" class="error" style="display:none"></p>
// ─────────────────────────────────────────────
import { API, store } from './api.js';

// ── Leer datos del flujo ─────────────────────
const paciente = store.get('paciente');
const servicio = store.get('servicio');
const slot     = store.get('slot');

// Redirigir si alguien entra directo sin pasar por los pasos anteriores
if (!paciente || !servicio || !slot) {
    alert('Faltan datos del proceso de agendado. Comencemos de nuevo.');
    window.location.href = 'agenda-paciente.html';
}

// ── Rellenar resumen ─────────────────────────
const campo = (nombre) => document.querySelector(`[data-campo="${nombre}"]`);

campo('paciente').textContent = paciente.nombre;
campo('servicio').textContent = servicio.nombre;
campo('fecha').textContent    = slot.fecha;
campo('hora').textContent     = slot.hora;
campo('doctor').textContent   = slot.doctor ?? '—';
campo('total').textContent    = `$${Number(servicio.precio).toLocaleString('es-MX')} MXN`;

// ── Selección de método de pago ──────────────
let metodoPago = 'efectivo';   // valor por defecto (primer btn)

document.querySelectorAll('.metodo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.metodo-btn').forEach(b => b.classList.remove('seleccionado'));
        btn.classList.add('seleccionado');
        metodoPago = btn.textContent.toLowerCase().trim();
        campo('pago').textContent = btn.textContent;
    });
});

// Mostrar el método por defecto en el resumen
const btnDefault = document.querySelector('.metodo-btn.seleccionado');
if (btnDefault) campo('pago').textContent = btnDefault.textContent;

// ── Confirmar y enviar a la API ──────────────
const btnConfirmar = document.querySelector('.btn-confirmar');
const errorMsg     = document.getElementById('error-msg');

btnConfirmar.addEventListener('click', async () => {
    btnConfirmar.disabled    = true;
    btnConfirmar.textContent = 'Enviando…';
    errorMsg.style.display   = 'none';

    const body = {
        paciente,              // el endpoint usa findOrCreate con curp
        servicio_id: servicio.id,
        doctor_id:   slot.doctor_id,
        fecha:       slot.fecha,
        hora:        slot.hora,
        metodo_pago: metodoPago
    };

    try {
        const res = await fetch(`${API}/citas`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error ?? 'Error desconocido del servidor');
        }

        // ✅ Éxito: limpiar el flujo y redirigir
        store.clear();
        window.location.href = 'mis-citas.html';

    } catch (err) {
        errorMsg.textContent   = `Error: ${err.message}`;
        errorMsg.style.display = 'block';
        btnConfirmar.disabled    = false;
        btnConfirmar.textContent = 'Confirmar cita';
    }
});