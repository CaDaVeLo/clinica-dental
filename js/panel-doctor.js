const API = 'http://localhost:3000';
const token = localStorage.getItem('token');
const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
let citaNotasId = null;
let pacienteExpedienteId = null;
 
if (!token) window.location.href = 'login.html';
 
document.getElementById('nombre-usuario').textContent = usuario.nombre || '';
 
function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = 'login.html';
}
 
function mostrarSeccion(seccion, link) {
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('activo'));
    link.classList.add('activo');
 
    document.getElementById('seccion-hoy').style.display = 'none';
    document.getElementById('seccion-horario').style.display = 'none';
 
    const titulos = { hoy: 'Citas de hoy', horario: 'Mi horario' };
    document.getElementById('titulo-seccion').textContent = titulos[seccion];
    document.getElementById(`seccion-${seccion}`).style.display = 'block';
 
    if (seccion === 'hoy') cargarCitasHoy();
    if (seccion === 'horario') cargarHorario();
}
 
async function cargarCitasHoy() {
    const hoy = new Date().toISOString().slice(0, 10);
    try {
        const res = await fetch(`${API}/citas?fecha=${hoy}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const citas = await res.json();
        const contenedor = document.getElementById('lista-citas-hoy');
 
        if (!citas.length) {
            contenedor.innerHTML = '<p style="color:#888;">No tienes citas hoy.</p>';
            return;
        }
 
        contenedor.innerHTML = citas.map(c => `
            <div class="cita-card">
                <div class="cita-header">
                    <h3>${c.paciente?.nombre || 'Paciente'}</h3>
                    <span class="badge ${c.estado === 'confirmada' ? 'confirmada' : 'pendiente'}">${c.estado}</span>
                </div>
                <p class="cita-info">
                    ${c.hora?.slice(0,5)} &nbsp;·&nbsp; ${c.servicio?.nombre || '-'} &nbsp;·&nbsp; $${Number(c.servicio?.precio || 0).toLocaleString()} MXN
                </p>
                ${c.notas ? `<p style="font-size:13px; color:#555; margin-bottom:10px; background:#f9fafb; padding:8px 12px; border-radius:6px;">${c.notas}</p>` : ''}
                <div class="cita-acciones">
                    <button class="btn-reprogramar" onclick="abrirExpediente(${c.paciente_id}, '${c.paciente?.nombre}')">Ver expediente</button>
                    <button class="btn-reprogramar" onclick="abrirNotas(${c.id}, '${(c.notas || '').replace(/'/g, "\\'")}')">Agregar notas</button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        document.getElementById('lista-citas-hoy').innerHTML = '<p style="color:red;">Error al cargar citas.</p>';
    }
}
 
async function cargarHorario() {
    if (!usuario.doctor_id) {
        document.getElementById('tabla-horario').innerHTML = '<p style="color:#888;">No tienes horario asignado.</p>';
        return;
    }
    try {
        const res = await fetch(`${API}/doctores/${usuario.doctor_id}/horarios`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const horarios = await res.json();
        const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
        const contenedor = document.getElementById('tabla-horario');
 
        if (!horarios.length) {
            contenedor.innerHTML = '<p style="color:#888;">No tienes horarios registrados.</p>';
            return;
        }
 
        contenedor.innerHTML = `
            <table class="tabla">
                <thead>
                    <tr><th>Día</th><th>Hora inicio</th><th>Hora fin</th></tr>
                </thead>
                <tbody>
                    ${horarios.map(h => `
                        <tr>
                            <td>${dias[h.dia_semana]}</td>
                            <td>${h.hora_inicio?.slice(0,5)}</td>
                            <td>${h.hora_fin?.slice(0,5)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (e) {
        document.getElementById('tabla-horario').innerHTML = '<p style="color:red;">Error al cargar horario.</p>';
    }
}
 
async function abrirExpediente(paciente_id, nombre) {
    pacienteExpedienteId = paciente_id;
    document.getElementById('titulo-expediente').textContent = `Expediente - ${nombre}`;
 
    document.getElementById('exp-alergias').value = '';
    document.getElementById('exp-enfermedades').value = '';
    document.getElementById('exp-medicamentos').value = '';
    document.getElementById('exp-antecedentes').value = '';
    document.getElementById('exp-notas').value = '';
 
    try {
        const res = await fetch(`${API}/expedientes/${paciente_id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            const exp = await res.json();
            document.getElementById('exp-alergias').value = exp.alergias || '';
            document.getElementById('exp-enfermedades').value = exp.enfermedades || '';
            document.getElementById('exp-medicamentos').value = exp.medicamentos || '';
            document.getElementById('exp-antecedentes').value = exp.antecedentes || '';
            document.getElementById('exp-notas').value = exp.notas_generales || '';
        }
    } catch (e) {}
 
    document.getElementById('modal-expediente').style.display = 'flex';
}
 
async function guardarExpediente() {
    const error = document.getElementById('error-expediente');
    try {
        const res = await fetch(`${API}/expedientes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                paciente_id: pacienteExpedienteId,
                alergias: document.getElementById('exp-alergias').value,
                enfermedades: document.getElementById('exp-enfermedades').value,
                medicamentos: document.getElementById('exp-medicamentos').value,
                antecedentes: document.getElementById('exp-antecedentes').value,
                notas_generales: document.getElementById('exp-notas').value
            })
        });
        if (!res.ok) throw new Error();
        cerrarModal('modal-expediente');
    } catch (e) {
        error.style.display = 'block';
        error.textContent = 'Error al guardar el expediente.';
    }
}
 
function abrirNotas(cita_id, notas) {
    citaNotasId = cita_id;
    document.getElementById('notas-cita').value = notas;
    document.getElementById('modal-notas').style.display = 'flex';
}
 
async function guardarNotas() {
    try {
        await fetch(`${API}/citas/${citaNotasId}/notas`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ notas: document.getElementById('notas-cita').value })
        });
        cerrarModal('modal-notas');
        cargarCitasHoy();
    } catch (e) {
        alert('Error al guardar notas.');
    }
}
 
function cerrarModal(id) {
    document.getElementById(id).style.display = 'none';
}
 
cargarCitasHoy();