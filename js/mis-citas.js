const API = 'http://localhost:3000';
let citaActual = null;
let citaResenaId = null;
let citasCache = [];
let ordenCitas = 'desc'; // desc = más reciente primero, asc = más antigua primero

function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function buscar() {
    const query = document.getElementById('input-buscar').value.trim();
    const resultado = document.getElementById('resultado');

    if (!query) {
        resultado.innerHTML = '<p style="color:red;">Ingresa tu email o CURP.</p>';
        return;
    }

    resultado.innerHTML = '<p>Buscando...</p>';
    document.getElementById('info-pasos').style.display = 'none';

    try {
        const res = await fetch(`${API}/pacientes/buscar/${encodeURIComponent(query)}`);

        if (!res.ok) {
            resultado.innerHTML = '<p style="color:#888;">No se encontraron citas con ese dato.</p>';
            return;
        }

        const data = await res.json();
        citasCache = data.citas;

        if (!citasCache.length) {
            resultado.innerHTML = '<p style="color:#888;">No tienes citas registradas.</p>';
            return;
        }

        renderCitas();
    } catch (e) {
        resultado.innerHTML = '<p style="color:red;">Error al conectar con el servidor.</p>';
    }
}

function renderCitas() {
    const resultado = document.getElementById('resultado');

    const sorted = [...citasCache].sort((a, b) =>
        ordenCitas === 'desc' ? b.id - a.id : a.id - b.id
    );

    const barraOrden = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
            <span class="conteo-citas">${sorted.length} cita(s) encontrada(s)</span>
            <div style="display:flex; gap:8px;">
                <button onclick="cambiarOrden('desc')"
                    style="padding:7px 14px; border-radius:8px; border:1.5px solid ${ordenCitas === 'desc' ? '#2563eb' : '#e5e7eb'}; background:${ordenCitas === 'desc' ? '#eff6ff' : '#fff'}; color:${ordenCitas === 'desc' ? '#2563eb' : '#6b7280'}; font-size:12.5px; font-weight:600; cursor:pointer;">
                    ↓ Más reciente
                </button>
                <button onclick="cambiarOrden('asc')"
                    style="padding:7px 14px; border-radius:8px; border:1.5px solid ${ordenCitas === 'asc' ? '#2563eb' : '#e5e7eb'}; background:${ordenCitas === 'asc' ? '#eff6ff' : '#fff'}; color:${ordenCitas === 'asc' ? '#2563eb' : '#6b7280'}; font-size:12.5px; font-weight:600; cursor:pointer;">
                    ↑ Más antigua
                </button>
            </div>
        </div>
    `;

    const tarjetas = sorted.map(c => {
        const puedeCancelar = puedeModificar(c.fecha, c.hora);
        const cancelada = c.estado === 'cancelada';
        const completada = c.estado === 'completada';
        const tieneResena = !!c.resena;
        return `
            <div class="cita-card" id="cita-${c.id}">
                <div class="cita-header">
                    <h3>${esc(c.servicio?.nombre) || 'Servicio'}</h3>
                    <span class="badge ${c.estado === 'confirmada' ? 'confirmada' : c.estado === 'cancelada' ? 'cancelada' : 'pendiente'}">${esc(c.estado)}</span>
                </div>
                <p class="cita-info">
                    ${esc(c.fecha)} &nbsp; ${esc(c.hora?.slice(0, 5))} &nbsp;
                    ${esc(c.doctore?.nombre)} &nbsp;
                    $${Number(c.servicio?.precio || 0).toLocaleString()} MXN
                </p>
                ${!cancelada && !completada ? `
                <div class="cita-acciones">
                    <button class="btn-reprogramar" onclick="abrirReprogramar(${c.id}, '${c.fecha}', '${c.hora}', ${c.servicio_id})" ${!puedeCancelar ? 'disabled title="Menos de 24 horas para la cita"' : ''}>Reprogramar</button>
                    <button class="btn-cancelar" onclick="cancelar(${c.id}, '${c.fecha}', '${c.hora}')" ${!puedeCancelar ? 'disabled title="Menos de 24 horas para la cita"' : ''}>Cancelar</button>
                </div>` : ''}
                ${completada ? `
                <div class="cita-acciones">
                    ${tieneResena
                        ? `<span class="resena-enviada">&#10003; Reseña enviada — ${'★'.repeat(c.resena.estrellas)}${'☆'.repeat(5 - c.resena.estrellas)}</span>`
                        : `<button class="btn-resena" onclick="abrirResena(${c.id}, '${esc(c.servicio?.nombre)}')">Dejar reseña</button>`
                    }
                </div>` : ''}
            </div>
        `;
    }).join('');

    resultado.innerHTML = barraOrden + tarjetas;
}

function cambiarOrden(orden) {
    ordenCitas = orden;
    renderCitas();
}

function puedeModificar(fecha, hora) {
    const ahora = new Date();
    const fechaHora = new Date(`${fecha}T${hora}`);
    return (fechaHora - ahora) > 24 * 60 * 60 * 1000;
}

async function cancelar(id, fecha, hora) {
    if (!puedeModificar(fecha, hora)) {
        alert('Solo puedes cancelar con al menos 1 día de anticipación.');
        return;
    }
    if (!confirm('¿Seguro que quieres cancelar esta cita?')) return;

    try {
        const res = await fetch(`${API}/citas/${id}/paciente`, { method: 'DELETE' });
        const data = await res.json();

        if (!res.ok) {
            alert(data.error || 'No se pudo cancelar la cita.');
            return;
        }

        // Actualizar la caché local y volver a renderizar
        const idx = citasCache.findIndex(c => c.id === id);
        if (idx !== -1) citasCache[idx] = { ...citasCache[idx], estado: 'cancelada' };
        renderCitas();
    } catch (e) {
        alert('Error al conectar con el servidor.');
    }
}

function abrirReprogramar(id, fecha, hora, servicio_id) {
    if (!puedeModificar(fecha, hora)) {
        alert('Solo puedes reprogramar con al menos 1 día de anticipación.');
        return;
    }
    citaActual = { id, servicio_id };
    document.getElementById('rep-fecha').value = '';
    document.getElementById('rep-slots').innerHTML = '';
    document.getElementById('rep-slot-sel').value = '';
    document.getElementById('rep-doctor-sel').value = '';

    // Bloquear domingos en el input de fecha del modal
    const inputFecha = document.getElementById('rep-fecha');
    inputFecha.min = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    document.getElementById('modal-reprogramar').style.display = 'flex';
}

async function buscarSlots() {
    const fecha = document.getElementById('rep-fecha').value;
    if (!fecha || !citaActual) return;

    // Validar que no sea domingo
    const diaSemana = new Date(fecha + 'T12:00:00').getDay();
    if (diaSemana === 0) {
        document.getElementById('rep-slots').innerHTML = '<p style="font-size:13px; color:#ef4444;">Los domingos no hay atención. Por favor elige otro día.</p>';
        return;
    }

    document.getElementById('rep-slots').innerHTML = '<p style="font-size:13px; color:#888;">Buscando horarios...</p>';

    try {
        const res = await fetch(`${API}/disponibilidad?fecha=${fecha}&servicio_id=${citaActual.servicio_id}`);
        const slots = await res.json();
        const disponibles = slots.filter(s => s.disponible);

        if (!disponibles.length) {
            document.getElementById('rep-slots').innerHTML = '<p style="font-size:13px; color:#888;">No hay horarios disponibles ese día.</p>';
            return;
        }

        document.getElementById('rep-slots').innerHTML = `
            <p style="font-size:13px; font-weight:600; margin-bottom:8px;">Horarios disponibles:</p>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
                ${disponibles.map(s => `
                    <button class="slot-btn" onclick="seleccionarSlot('${s.hora}', ${s.doctor_id}, this)"
                        style="padding:8px 14px; border:1px solid #d1d5db; border-radius:8px; background:white; cursor:pointer; font-size:13px;">
                        ${s.hora} — ${s.doctor}
                    </button>
                `).join('')}
            </div>
        `;
    } catch (e) {
        document.getElementById('rep-slots').innerHTML = '<p style="color:red; font-size:13px;">Error al buscar horarios.</p>';
    }
}

function seleccionarSlot(hora, doctor_id, btn) {
    document.querySelectorAll('.slot-btn').forEach(b => b.style.background = 'white');
    btn.style.background = '#eff6ff';
    btn.style.borderColor = '#3b82f6';
    document.getElementById('rep-slot-sel').value = hora;
    document.getElementById('rep-doctor-sel').value = doctor_id;
}

async function confirmarReprogramar() {
    const fecha = document.getElementById('rep-fecha').value;
    const hora = document.getElementById('rep-slot-sel').value;
    const doctor_id = document.getElementById('rep-doctor-sel').value;

    if (!fecha || !hora || !doctor_id) {
        alert('Selecciona una fecha y un horario disponible.');
        return;
    }

    try {
        const res = await fetch(`${API}/citas/${citaActual.id}/reprogramar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fecha, hora, doctor_id: parseInt(doctor_id) })
        });
        const data = await res.json();

        if (!res.ok) {
            alert(data.error || 'No se pudo reprogramar.');
            return;
        }

        cerrarReprogramar();
        buscar();
    } catch (e) {
        alert('Error al conectar con el servidor.');
    }
}

function cerrarReprogramar() {
    document.getElementById('modal-reprogramar').style.display = 'none';
    citaActual = null;
}

function abrirResena(citaId, servicioNombre) {
    citaResenaId = citaId;
    document.getElementById('resena-servicio-nombre').textContent = servicioNombre;
    document.querySelectorAll('#estrellas-input input').forEach(r => r.checked = false);
    document.getElementById('resena-comentario').value = '';
    document.getElementById('resena-error').style.display = 'none';
    document.getElementById('modal-resena').style.display = 'flex';
}

function cerrarResena() {
    document.getElementById('modal-resena').style.display = 'none';
    citaResenaId = null;
}

async function enviarResena() {
    const estrellas = document.querySelector('#estrellas-input input:checked')?.value;
    const comentario = document.getElementById('resena-comentario').value.trim();
    const errDiv = document.getElementById('resena-error');
    errDiv.style.display = 'none';

    if (!estrellas) {
        errDiv.style.display = 'block';
        errDiv.textContent = 'Selecciona una calificación.';
        return;
    }

    const btn = document.getElementById('btn-enviar-resena');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
        const res = await fetch(`${API}/resenas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cita_id: citaResenaId, estrellas: parseInt(estrellas), comentario })
        });
        const data = await res.json();

        if (!res.ok) {
            errDiv.style.display = 'block';
            errDiv.textContent = data.error || 'Error al enviar la reseña.';
            return;
        }

        cerrarResena();
        buscar();
    } catch (e) {
        errDiv.style.display = 'block';
        errDiv.textContent = 'Error al conectar con el servidor.';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Enviar reseña';
    }
}

document.getElementById('input-buscar').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') buscar();
});
