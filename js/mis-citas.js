const API = 'http://localhost:3000';
let citaActual = null;

async function buscar() {
    const query = document.getElementById('input-buscar').value.trim();
    const resultado = document.getElementById('resultado');

    if (!query) {
        resultado.innerHTML = '<p style="color:red;">Ingresa tu email o CURP.</p>';
        return;
    }

    resultado.innerHTML = '<p>Buscando...</p>';

    try {
        const res = await fetch(`${API}/pacientes/buscar/${encodeURIComponent(query)}`);

        if (!res.ok) {
            resultado.innerHTML = '<p style="color:#888;">No se encontraron citas con ese dato.</p>';
            return;
        }

        const data = await res.json();
        const citas = data.citas;

        if (!citas.length) {
            resultado.innerHTML = '<p style="color:#888;">No tienes citas registradas.</p>';
            return;
        }

        resultado.innerHTML = `<p class="conteo-citas">${citas.length} cita(s) encontrada(s)</p>` +
            citas.map(c => {
                const puedeCancelar = puedeModificar(c.fecha, c.hora);
                const cancelada = ['cancelada', 'completada'].includes(c.estado);
                return `
                <div class="cita-card" id="cita-${c.id}">
                    <div class="cita-header">
                        <h3>${c.servicio?.nombre || 'Servicio'}</h3>
                        <span class="badge ${c.estado === 'confirmada' ? 'confirmada' : c.estado === 'cancelada' ? 'cancelada' : 'pendiente'}">${c.estado}</span>
                    </div>
                    <p class="cita-info">
                        ${c.fecha} &nbsp; ${c.hora?.slice(0, 5)} &nbsp;
                        ${c.doctore?.nombre || ''} &nbsp;
                        $${Number(c.servicio?.precio || 0).toLocaleString()} MXN
                    </p>
                    ${!cancelada ? `
                    <div class="cita-acciones">
                        <button class="btn-reprogramar" onclick="abrirReprogramar(${c.id}, '${c.fecha}', '${c.hora}', ${c.servicio_id})" ${!puedeCancelar ? 'disabled title="Menos de 2 horas para la cita"' : ''}>Reprogramar</button>
                        <button class="btn-cancelar" onclick="cancelar(${c.id}, '${c.fecha}', '${c.hora}')" ${!puedeCancelar ? 'disabled title="Menos de 2 horas para la cita"' : ''}>Cancelar</button>
                    </div>` : ''}
                </div>
            `}).join('');
    } catch (e) {
        resultado.innerHTML = '<p style="color:red;">Error al conectar con el servidor.</p>';
    }
}

function puedeModificar(fecha, hora) {
    const ahora = new Date();
    const fechaHora = new Date(`${fecha}T${hora}`);
    return (fechaHora - ahora) > 2 * 60 * 60 * 1000;
}

async function cancelar(id, fecha, hora) {
    if (!puedeModificar(fecha, hora)) {
        alert('Solo puedes cancelar con al menos 2 horas de anticipación.');
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

        const card = document.getElementById(`cita-${id}`);
        if (card) {
            card.querySelector('.cita-header .badge').textContent = 'cancelada';
            card.querySelector('.cita-header .badge').className = 'badge cancelada';
            card.querySelector('.cita-acciones')?.remove();
        }
    } catch (e) {
        alert('Error al conectar con el servidor.');
    }
}

function abrirReprogramar(id, fecha, hora, servicio_id) {
    if (!puedeModificar(fecha, hora)) {
        alert('Solo puedes reprogramar con al menos 2 horas de anticipación.');
        return;
    }
    citaActual = { id, servicio_id };
    document.getElementById('rep-fecha').value = '';
    document.getElementById('rep-slots').innerHTML = '';
    document.getElementById('rep-slot-sel').value = '';
    document.getElementById('rep-doctor-sel').value = '';
    document.getElementById('modal-reprogramar').style.display = 'flex';
}

async function buscarSlots() {
    const fecha = document.getElementById('rep-fecha').value;
    if (!fecha || !citaActual) return;

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

document.getElementById('input-buscar').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') buscar();
});
