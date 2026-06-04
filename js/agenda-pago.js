const API = 'http://localhost:3000';
let metodoPago = null;

const paciente = JSON.parse(sessionStorage.getItem('paciente') || '{}');
const servicio = JSON.parse(sessionStorage.getItem('servicio') || '{}');
const fecha = sessionStorage.getItem('fecha');
const hora = sessionStorage.getItem('hora');

function cargarResumen() {
    document.getElementById('resumen').innerHTML = `
        <div class="resumen-titulo">
            <img src="https://api.iconify.design/mdi/clipboard-text-outline.svg?color=%231e3a8a" alt="">
            Resumen de tu cita
        </div>
        <div class="resumen-fila">
            <span class="rf-label"><img src="https://api.iconify.design/mdi/account-outline.svg?color=%23475569" alt="">Paciente</span>
            <span class="rf-valor">${paciente.nombre || '-'}</span>
        </div>
        <div class="resumen-fila">
            <span class="rf-label"><img src="https://api.iconify.design/mdi/tooth-outline.svg?color=%23475569" alt="">Servicio</span>
            <span class="rf-valor">${servicio.nombre || '-'}</span>
        </div>
        <div class="resumen-fila">
            <span class="rf-label"><img src="https://api.iconify.design/mdi/calendar-outline.svg?color=%23475569" alt="">Fecha</span>
            <span class="rf-valor">${fecha || '-'}</span>
        </div>
        <div class="resumen-fila">
            <span class="rf-label"><img src="https://api.iconify.design/mdi/clock-outline.svg?color=%23475569" alt="">Hora</span>
            <span class="rf-valor">${hora || '-'}</span>
        </div>
        <div class="resumen-fila">
            <span class="rf-label"><img src="https://api.iconify.design/mdi/cash.svg?color=%23475569" alt="">Total</span>
            <span class="rf-valor">$${Number(servicio.precio || 0).toLocaleString()} MXN</span>
        </div>
    `;
}

function seleccionarPago(metodo, el) {
    document.querySelectorAll('.metodo-btn').forEach(b => b.classList.remove('seleccionado'));
    el.classList.add('seleccionado');
    metodoPago = metodo;

    const detalle = document.getElementById('detalle-pago');
    const formTarjeta = document.getElementById('form-tarjeta');
    const formSeguro = document.getElementById('form-seguro');

    formTarjeta.style.display = 'none';
    formSeguro.style.display = 'none';

    if (metodo === 'debito' || metodo === 'credito') {
        detalle.style.display = 'block';
        formTarjeta.style.display = 'block';
    } else if (metodo === 'seguro') {
        detalle.style.display = 'block';
        formSeguro.style.display = 'block';
    } else {
        // efectivo: no requiere campos adicionales
        detalle.style.display = 'none';
    }

    document.getElementById('mensaje-error').style.display = 'none';
}

// Auto-formatea el número de tarjeta como XXXX XXXX XXXX XXXX
function formatearTarjeta(input) {
    let val = input.value.replace(/\D/g, '').substring(0, 16);
    input.value = val.replace(/(\d{4})(?=\d)/g, '$1 ');
}

// Auto-formatea la fecha de vencimiento como MM/AA
function formatearVencimiento(input) {
    let val = input.value.replace(/\D/g, '').substring(0, 4);
    if (val.length >= 3) {
        input.value = val.substring(0, 2) + '/' + val.substring(2);
    } else {
        input.value = val;
    }
}

function validarTarjeta() {
    const num = (document.getElementById('num-tarjeta').value || '').replace(/\s/g, '');
    const venc = document.getElementById('vencimiento').value || '';
    const cvv = document.getElementById('cvv').value || '';
    const nombre = (document.getElementById('nombre-tarjeta').value || '').trim();

    if (num.length !== 16 || !/^\d{16}$/.test(num)) {
        return 'El número de tarjeta debe tener exactamente 16 dígitos.';
    }
    if (!/^\d{2}\/\d{2}$/.test(venc)) {
        return 'Ingresa la fecha de vencimiento en formato MM/AA.';
    }
    const [mm, aa] = venc.split('/').map(Number);
    if (mm < 1 || mm > 12) {
        return 'El mes de vencimiento no es válido (01-12).';
    }
    const ahora = new Date();
    const anioVenc = 2000 + aa;
    const mesVenc = mm - 1;
    if (anioVenc < ahora.getFullYear() || (anioVenc === ahora.getFullYear() && mesVenc < ahora.getMonth())) {
        return 'La tarjeta está vencida. Verifica la fecha de vencimiento.';
    }
    if (!/^\d{3}$/.test(cvv)) {
        return 'El CVV debe tener exactamente 3 dígitos.';
    }
    if (!nombre) {
        return 'Ingresa el nombre tal como aparece en la tarjeta.';
    }
    return null;
}

function validarSeguro() {
    const poliza = (document.getElementById('num-poliza').value || '').trim();
    const aseguradora = (document.getElementById('aseguradora').value || '').trim();
    if (!poliza) return 'Ingresa el número de póliza de tu seguro médico.';
    if (!aseguradora) return 'Ingresa el nombre de tu aseguradora.';
    return null;
}

async function confirmar() {
    const error = document.getElementById('mensaje-error');
    error.style.display = 'none';

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

    // Validar campos según el método seleccionado
    if (metodoPago === 'debito' || metodoPago === 'credito') {
        const msg = validarTarjeta();
        if (msg) {
            error.style.display = 'block';
            error.textContent = msg;
            return;
        }
    }

    if (metodoPago === 'seguro') {
        const msg = validarSeguro();
        if (msg) {
            error.style.display = 'block';
            error.textContent = msg;
            return;
        }
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
