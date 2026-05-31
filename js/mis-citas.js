// ─────────────────────────────────────────────
//  mis-citas.js  —  Ver, cancelar y reprogramar citas
//
//  Responsabilidad:
//    - GET /pacientes/buscar/:query  (email o CURP)
//    - Renderizar las citas del paciente encontrado
//    - Cancelar: DELETE /citas/:id
//    - Reprogramar: abre un mini-formulario inline y llama
//      PUT /citas/:id/reprogramar con { fecha, hora, doctor_id }
//
//  HTML necesario en mis-citas.html:
//    <input id="buscador-input" type="text" placeholder="Tu@email.com ó CURP" />
//    <button id="btn-buscar">Buscar</button>
//    <p id="conteo-citas"></p>
//    <div id="lista-citas"></div>
//    <p id="error-busqueda" class="error" style="display:none"></p>
// ─────────────────────────────────────────────
import { API } from './api.js';

const input         = document.getElementById('buscador-input');
const btnBuscar     = document.getElementById('btn-buscar');
const conteo        = document.getElementById('conteo-citas');
const listaCitas    = document.getElementById('lista-citas');
const errorBusqueda = document.getElementById('error-busqueda');

// ── Colores por estado ───────────────────────
const BADGE_CLASS = {
    confirmada:  'confirmada',
    pendiente:   'pendiente',
    cancelada:   'cancelada',
    completada:  'completada'
};

// ─────────────────────────────────────────────
//  Buscar citas del paciente
// ─────────────────────────────────────────────
async function buscarCitas() {
    const query = input.value.trim();
    if (!query) { alert('Ingresa tu email o CURP.'); return; }

    errorBusqueda.style.display = 'none';
    listaCitas.innerHTML        = '<p>Buscando…</p>';
    conteo.textContent          = '';

    try {
        const res = await fetch(`${API}/pacientes/buscar/${encodeURIComponent(query)}`);

        if (res.status === 404) {
            throw new Error('Paciente no encontrado. Verifica tu email o CURP.');
        }
        if (!res.ok) throw new Error('Error del servidor.');

        const { citas } = await res.json();
        renderCitas(citas);

    } catch (err) {
        listaCitas.innerHTML        = '';
        errorBusqueda.textContent   = err.message;
        errorBusqueda.style.display = 'block';
    }
}

// ─────────────────────────────────────────────
//  Renderizar tarjetas de citas
// ─────────────────────────────────────────────
function renderCitas(citas) {
    conteo.textContent  = `${citas.length} cita${citas.length !== 1 ? 's' : ''} encontrada${citas.length !== 1 ? 's' : ''}`;
    listaCitas.innerHTML = '';

    if (!citas.length) {
        listaCitas.innerHTML = '<p>No tienes citas registradas.</p>';
        return;
    }

    citas.forEach(c => {
        const card = document.createElement('div');
        card.className   = 'cita-card';
        card.dataset.id  = c.id;

        const esCancelable = ['pendiente', 'confirmada'].includes(c.estado);
        const precio       = c.servicio?.precio
            ? `$${Number(c.servicio.precio).toLocaleString('es-MX')} MXN`
            : '';

        card.innerHTML = `
            <div class="cita-header">
                <h3>${c.servicio?.nombre ?? 'Servicio'}</h3>
                <span class="badge ${BADGE_CLASS[c.estado] ?? ''}">${c.estado}</span>
            </div>
            <p class="cita-info">
                ${c.fecha} &nbsp;·&nbsp; ${c.hora.slice(0, 5)}
                &nbsp;·&nbsp; ${c.doctor?.nombre ?? '—'}
                &nbsp;·&nbsp; ${precio}
            </p>
            ${esCancelable ? `
            <div class="cita-acciones">
                <button class="btn-reprogramar" data-id="${c.id}" data-doctor="${c.doctor_id}">Reprogramar</button>
                <button class="btn-cancelar"    data-id="${c.id}">Cancelar</button>
            </div>
            <div class="form-reprogramar" id="repro-${c.id}" style="display:none">
                <label>Nueva fecha</label>
                <input type="date" class="repro-fecha" min="${new Date().toISOString().split('T')[0]}">
                <label>Nueva hora (HH:MM)</label>
                <input type="time" class="repro-hora">
                <button class="btn-guardar-repro" data-id="${c.id}" data-doctor="${c.doctor_id}">Guardar cambio</button>
                <button class="btn-cancelar-repro" data-id="${c.id}">Cancelar</button>
            </div>` : ''}`;

        listaCitas.appendChild(card);
    });

    agregarListeners();
}

// ─────────────────────────────────────────────
//  Listeners de cancelar y reprogramar
// ─────────────────────────────────────────────
function agregarListeners() {

    // ── Cancelar cita ────────────────────────
    document.querySelectorAll('.btn-cancelar').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('¿Seguro que deseas cancelar esta cita?')) return;
            const id = btn.dataset.id;

            try {
                const res = await fetch(`${API}/citas/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error();
                btn.closest('.cita-card').querySelector('.badge').textContent = 'cancelada';
                btn.closest('.cita-card').querySelector('.badge').className   = 'badge cancelada';
                btn.closest('.cita-acciones').remove();
            } catch {
                alert('No se pudo cancelar la cita. Inténtalo de nuevo.');
            }
        });
    });

    // ── Mostrar / ocultar formulario de reprogramación ──
    document.querySelectorAll('.btn-reprogramar').forEach(btn => {
        btn.addEventListener('click', () => {
            const form = document.getElementById(`repro-${btn.dataset.id}`);
            form.style.display = form.style.display === 'none' ? 'block' : 'none';
        });
    });

    // ── Ocultar formulario ───────────────────
    document.querySelectorAll('.btn-cancelar-repro').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById(`repro-${btn.dataset.id}`).style.display = 'none';
        });
    });

    // ── Guardar reprogramación ───────────────
    document.querySelectorAll('.btn-guardar-repro').forEach(btn => {
        btn.addEventListener('click', async () => {
            const form      = document.getElementById(`repro-${btn.dataset.id}`);
            const nuevaFecha = form.querySelector('.repro-fecha').value;
            const nuevaHora  = form.querySelector('.repro-hora').value;
            const doctorId   = btn.dataset.doctor;

            if (!nuevaFecha || !nuevaHora) {
                alert('Ingresa la nueva fecha y hora.');
                return;
            }

            try {
                const res = await fetch(`${API}/citas/${btn.dataset.id}/reprogramar`, {
                    method:  'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ fecha: nuevaFecha, hora: nuevaHora + ':00', doctor_id: Number(doctorId) })
                });

                if (res.status === 409) throw new Error('Ese horario ya está ocupado.');
                if (!res.ok) throw new Error('Error al reprogramar.');

                alert('Cita reprogramada correctamente.');
                buscarCitas();     // refrescar la lista
            } catch (err) {
                alert(err.message);
            }
        });
    });
}

// ── Eventos ──────────────────────────────────
btnBuscar.addEventListener('click', buscarCitas);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') buscarCitas(); });