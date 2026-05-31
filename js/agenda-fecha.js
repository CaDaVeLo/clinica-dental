// ─────────────────────────────────────────────
//  agenda-fecha.js  —  Paso 3: Fecha y hora
//
//  Responsabilidad:
//    - Renderizar un calendario dinámico del mes actual
//    - Al hacer clic en un día, consultar GET /disponibilidad?fecha=&servicio_id=
//    - Mostrar los slots devueltos por la API (disponible / ocupado)
//    - Guardar el slot elegido: store.set('slot', {...})
//    - Navegar al siguiente paso: agenda-pago.html
//
//  HTML necesario en agenda-fecha.html:
//    <button id="prev-mes">‹</button>
//    <span id="mes-label"></span>
//    <button id="next-mes">›</button>
//    <div class="cal-dias" id="cal-dias"></div>
//    <div class="horarios-grid" id="horarios-grid"></div>
//    <a class="btn-atras"  href="agenda-servicio.html">Atrás</a>
//    <button class="btn-siguiente">Siguiente: Pago</button>
// ─────────────────────────────────────────────
import { API, store } from './api.js';

// ── Estado del calendario ────────────────────
const servicio  = store.get('servicio');
let   hoy       = new Date();
let   anio      = hoy.getFullYear();
let   mes       = hoy.getMonth();          // 0-indexed
let   fechaElegida   = null;
let   slotElegido    = null;

// ── Referencias al DOM ───────────────────────
const mesLabel    = document.getElementById('mes-label');
const calDias     = document.getElementById('cal-dias');
const horariosGrid = document.getElementById('horarios-grid');
const btnSiguiente = document.querySelector('.btn-siguiente');
const btnPrev      = document.getElementById('prev-mes');
const btnNext      = document.getElementById('next-mes');

// ── Nombres de meses en español ──────────────
const MESES = ['enero','febrero','marzo','abril','mayo','junio',
               'julio','agosto','septiembre','octubre','noviembre','diciembre'];

// ─────────────────────────────────────────────
//  Renderiza el calendario del mes actual
// ─────────────────────────────────────────────
function renderCalendario() {
    mesLabel.textContent = `${MESES[mes]} ${anio}`;
    calDias.innerHTML    = '';

    const primerDia  = new Date(anio, mes, 1).getDay(); // 0=dom
    const diasMes    = new Date(anio, mes + 1, 0).getDate();
    // Ajustar para semana lunes-domingo (0→6, 1→0, 2→1, …)
    const offset     = (primerDia + 6) % 7;

    // Celdas vacías al inicio
    for (let i = 0; i < offset; i++) {
        calDias.appendChild(document.createElement('span'));
    }

    for (let d = 1; d <= diasMes; d++) {
        const span = document.createElement('span');
        span.textContent = d;

        const fechaStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const esPasado = new Date(fechaStr) < new Date(hoy.toDateString());

        if (esPasado) {
            span.classList.add('pasado');
        } else {
            span.classList.add('disponible');
            span.addEventListener('click', () => seleccionarFecha(span, fechaStr));
        }

        if (fechaElegida === fechaStr) span.classList.add('seleccionado');

        calDias.appendChild(span);
    }
}

// ─────────────────────────────────────────────
//  Selecciona un día y carga los slots de la API
// ─────────────────────────────────────────────
async function seleccionarFecha(spanEl, fechaStr) {
    document.querySelectorAll('.cal-dias .seleccionado').forEach(el => el.classList.remove('seleccionado'));
    spanEl.classList.add('seleccionado');
    fechaElegida = fechaStr;
    slotElegido  = null;
    btnSiguiente.disabled = true;

    await cargarSlots(fechaStr);
}

async function cargarSlots(fecha) {
    if (!servicio) {
        horariosGrid.innerHTML = '<p class="error">Vuelve al paso anterior y elige un servicio.</p>';
        return;
    }

    horariosGrid.innerHTML = '<p>Cargando horarios...</p>';

    try {
        const res   = await fetch(`${API}/disponibilidad?fecha=${fecha}&servicio_id=${servicio.id}`);
        const slots = await res.json();

        if (!slots.length) {
            horariosGrid.innerHTML = '<p>Sin horarios disponibles para este día.</p>';
            return;
        }

        horariosGrid.innerHTML = '';

        slots.forEach(slot => {
            const btn = document.createElement('div');
            btn.className    = `horario-btn ${slot.disponible ? '' : 'ocupado'}`;
            btn.textContent  = slot.hora;
            btn.title        = `Dr. ${slot.doctor}`;

            if (slot.disponible) {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.horario-btn').forEach(b => b.classList.remove('seleccionado'));
                    btn.classList.add('seleccionado');
                    slotElegido = {
                        fecha,
                        hora:      slot.hora,
                        doctor_id: slot.doctor_id,
                        doctor:    slot.doctor
                    };
                    btnSiguiente.disabled = false;
                });
            }

            horariosGrid.appendChild(btn);
        });
    } catch (err) {
        horariosGrid.innerHTML = `<p class="error">Error cargando horarios: ${err.message}</p>`;
    }
}

// ─────────────────────────────────────────────
//  Navegación del calendario (mes anterior / siguiente)
// ─────────────────────────────────────────────
btnPrev.addEventListener('click', () => {
    mes--;
    if (mes < 0) { mes = 11; anio--; }
    renderCalendario();
});

btnNext.addEventListener('click', () => {
    mes++;
    if (mes > 11) { mes = 0; anio++; }
    renderCalendario();
});

// ─────────────────────────────────────────────
//  Confirmar selección y avanzar
// ─────────────────────────────────────────────
btnSiguiente.addEventListener('click', (e) => {
    e.preventDefault();
    if (!slotElegido) { alert('Selecciona un horario disponible.'); return; }
    store.set('slot', slotElegido);
    window.location.href = 'agenda-pago.html';
});

// ── Inicializar ──────────────────────────────
renderCalendario();