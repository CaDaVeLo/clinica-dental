const API = 'http://localhost:3000';
const token = localStorage.getItem('token');
const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
let citaNotasId = null;
let pacienteExpedienteId = null;

function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
 
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

    ['hoy', 'horario', 'presupuestos'].forEach(s => {
        const el = document.getElementById(`seccion-${s}`);
        if (el) el.style.display = 'none';
    });

    const titulos = { hoy: 'Citas de hoy', horario: 'Mi horario', presupuestos: 'Presupuestos' };
    document.getElementById('titulo-seccion').textContent = titulos[seccion] || seccion;
    document.getElementById(`seccion-${seccion}`).style.display = 'block';

    if (seccion === 'hoy') cargarCitasHoy();
    if (seccion === 'horario') cargarHorario();
    if (seccion === 'presupuestos') cargarPresupuestos();
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
                    <h3>${esc(c.paciente?.nombre) || 'Paciente'}</h3>
                    <span class="badge ${c.estado === 'confirmada' ? 'confirmada' : 'pendiente'}">${esc(c.estado)}</span>
                </div>
                <p class="cita-info">
                    ${esc(c.hora?.slice(0,5))} &nbsp;·&nbsp; ${esc(c.servicio?.nombre)} &nbsp;·&nbsp; $${Number(c.servicio?.precio || 0).toLocaleString()} MXN
                </p>
                ${c.notas ? `<p style="font-size:13px; color:#555; margin-bottom:10px; background:#f9fafb; padding:8px 12px; border-radius:6px;">${esc(c.notas)}</p>` : ''}
                <div class="cita-acciones">
                    <button class="btn-reprogramar" onclick="abrirExpediente(${c.paciente_id}, '${esc(c.paciente?.nombre).replace(/'/g, '&#39;')}')">Ver expediente</button>
                    <button class="btn-reprogramar" onclick="abrirNotas(${c.id})">Agregar notas</button>
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

    ['exp-alergias', 'exp-enfermedades', 'exp-medicamentos', 'exp-antecedentes', 'exp-notas'].forEach(id => {
        document.getElementById(id).value = '';
    });

    initOdontograma({});

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
            initOdontograma(exp.odontograma || {});
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
                notas_generales: document.getElementById('exp-notas').value,
                odontograma: leerOdontograma()
            })
        });
        if (!res.ok) throw new Error();
        cerrarModal('modal-expediente');
    } catch (e) {
        error.style.display = 'block';
        error.textContent = 'Error al guardar el expediente.';
    }
}
 
async function abrirNotas(cita_id) {
    citaNotasId = cita_id;
    document.getElementById('notas-cita').value = '';
    try {
        const res = await fetch(`${API}/citas/${cita_id}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
            const cita = await res.json();
            document.getElementById('notas-cita').value = cita.notas || '';
        }
    } catch (e) {}
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

// ---------- ODONTOGRAMA ----------

const ESTADOS_DIENTE = ['sano', 'caries', 'obturado', 'extraido', 'corona', 'implante'];
const COLORES_DIENTE = {
    sano: '#f9fafb',
    caries: '#d97706',
    obturado: '#3b82f6',
    extraido: '#6b7280',
    corona: '#f59e0b',
    implante: '#7c3aed'
};
const DIENTES_SUPERIOR = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
const DIENTES_INFERIOR = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

let odontogramaData = {};

function initOdontograma(data) {
    odontogramaData = { ...data };
    renderFila('fila-superior', DIENTES_SUPERIOR);
    renderFila('fila-inferior', DIENTES_INFERIOR);
}

function renderFila(contenedorId, dientes) {
    const contenedor = document.getElementById(contenedorId);
    contenedor.innerHTML = dientes.map(num => {
        const estado = odontogramaData[num] || 'sano';
        const color = COLORES_DIENTE[estado];
        const textColor = ['caries','obturado','extraido','corona','implante'].includes(estado) ? 'white' : '#374151';
        return `
            <div onclick="toggleDiente(${num})" title="${num} — ${estado}"
                style="width:28px; height:32px; border:1px solid #d1d5db; border-radius:4px;
                    background:${color}; cursor:pointer; display:flex; align-items:center;
                    justify-content:center; font-size:9px; color:${textColor}; font-weight:600;
                    transition:all .15s;" id="diente-${num}">
                ${estado === 'extraido' ? '✕' : num}
            </div>
        `;
    }).join('');
}

function toggleDiente(num) {
    const actual = odontogramaData[num] || 'sano';
    const idx = ESTADOS_DIENTE.indexOf(actual);
    const siguiente = ESTADOS_DIENTE[(idx + 1) % ESTADOS_DIENTE.length];
    odontogramaData[num] = siguiente;

    const el = document.getElementById(`diente-${num}`);
    if (el) {
        const color = COLORES_DIENTE[siguiente];
        const textColor = ['caries','obturado','extraido','corona','implante'].includes(siguiente) ? 'white' : '#374151';
        el.style.background = color;
        el.style.color = textColor;
        el.textContent = siguiente === 'extraido' ? '✕' : num;
        el.title = `${num} — ${siguiente}`;
    }
}

function leerOdontograma() {
    return { ...odontogramaData };
}

// ---------- PRESUPUESTOS ----------

let serviciosDisponibles = [];

async function cargarPresupuestos() {
    try {
        const res = await fetch(`${API}/presupuestos`, { headers: { Authorization: `Bearer ${token}` } });
        const lista = await res.json();
        const contenedor = document.getElementById('lista-presupuestos');

        if (!lista.length) {
            contenedor.innerHTML = '<p style="color:#888;">No hay presupuestos generados.</p>';
            return;
        }

        const badgeEstado = e => e === 'aceptado' ? 'confirmada' : e === 'rechazado' ? 'cancelada' : 'pendiente';

        contenedor.innerHTML = `
            <table class="tabla">
                <thead>
                    <tr>
                        <th>Paciente</th><th>Total</th><th>Descuento</th>
                        <th>Estado</th><th>Fecha</th><th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${lista.map(p => `
                        <tr>
                            <td>${esc(p.paciente?.nombre)}</td>
                            <td>$${Number(p.total).toLocaleString()} MXN</td>
                            <td>${p.descuento_porcentaje > 0 ? esc(p.descuento_porcentaje) + '%' : '-'}</td>
                            <td><span class="badge ${badgeEstado(p.estado)}">${esc(p.estado)}</span></td>
                            <td>${esc(p.creado_en?.slice(0,10))}</td>
                            <td>
                                <button class="btn-tabla" onclick="cambiarEstadoPresupuesto(${p.id}, 'aceptado')">Aceptado</button>
                                <button class="btn-tabla" onclick="cambiarEstadoPresupuesto(${p.id}, 'rechazado')">Rechazado</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (e) {
        document.getElementById('lista-presupuestos').innerHTML = '<p style="color:red;">Error al cargar presupuestos.</p>';
    }
}

async function abrirModalPresupuesto() {
    try {
        const [resPacientes, resServicios] = await Promise.all([
            fetch(`${API}/pacientes`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API}/servicios`)
        ]);
        const pacientes = await resPacientes.json();
        serviciosDisponibles = await resServicios.json();

        document.getElementById('pres-paciente').innerHTML =
            '<option value="">-- Seleccionar paciente --</option>' +
            pacientes.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');

        document.getElementById('pres-descuento').value = 0;
        document.getElementById('pres-notas').value = '';

        document.getElementById('pres-servicios-lista').innerHTML = serviciosDisponibles.map(s => `
            <label style="display:flex; align-items:center; gap:10px; font-size:14px; cursor:pointer;">
                <input type="checkbox" value="${s.id}" data-precio="${s.precio}" data-nombre="${s.nombre}"
                    onchange="calcularTotalPresupuesto()" style="width:16px; height:16px;">
                <span>${s.nombre}</span>
                <span style="color:#6b7280; margin-left:auto;">$${Number(s.precio).toLocaleString()}</span>
            </label>
        `).join('');

        calcularTotalPresupuesto();
        document.getElementById('modal-presupuesto').style.display = 'flex';
    } catch (e) {
        alert('Error al cargar datos para el presupuesto.');
    }
}

function calcularTotalPresupuesto() {
    const checks = document.querySelectorAll('#pres-servicios-lista input[type=checkbox]:checked');
    const descuento = parseInt(document.getElementById('pres-descuento').value) || 0;
    const subtotal = Array.from(checks).reduce((sum, c) => sum + Number(c.dataset.precio), 0);
    const descVal = subtotal * descuento / 100;
    const total = subtotal - descVal;

    document.getElementById('pres-subtotal').textContent = '$' + subtotal.toLocaleString();
    document.getElementById('pres-desc-val').textContent = '-$' + descVal.toLocaleString();
    document.getElementById('pres-total').textContent = '$' + total.toLocaleString();
}

async function guardarPresupuesto() {
    const paciente_id = document.getElementById('pres-paciente').value;
    if (!paciente_id) { alert('Selecciona un paciente.'); return; }

    const checks = document.querySelectorAll('#pres-servicios-lista input[type=checkbox]:checked');
    if (!checks.length) { alert('Selecciona al menos un servicio.'); return; }

    const descuento_porcentaje = parseInt(document.getElementById('pres-descuento').value) || 0;
    const items = Array.from(checks).map(c => ({ nombre: c.dataset.nombre, precio: Number(c.dataset.precio) }));
    const subtotal = items.reduce((s, i) => s + i.precio, 0);
    const total = subtotal * (1 - descuento_porcentaje / 100);

    try {
        const res = await fetch(`${API}/presupuestos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                paciente_id: parseInt(paciente_id),
                doctor_id: usuario.doctor_id,
                items, total, descuento_porcentaje,
                notas: document.getElementById('pres-notas').value
            })
        });
        if (!res.ok) { alert('Error al guardar presupuesto.'); return; }
        cerrarModal('modal-presupuesto');
        cargarPresupuestos();
    } catch (e) {
        alert('Error al conectar con el servidor.');
    }
}

async function cambiarEstadoPresupuesto(id, estado) {
    try {
        await fetch(`${API}/presupuestos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ estado })
        });
        cargarPresupuestos();
    } catch (e) {
        alert('Error al actualizar presupuesto.');
    }
}

cargarCitasHoy();