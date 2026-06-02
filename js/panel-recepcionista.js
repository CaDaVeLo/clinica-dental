const API = 'http://localhost:3000';
const token = localStorage.getItem('token');
const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
let citaSeleccionadaId = null;
let todosPacientes = [];
 
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

    ['citas', 'pacientes', 'pagos', 'estadisticas', 'mensajes'].forEach(s => {
        const el = document.getElementById(`seccion-${s}`);
        if (el) el.style.display = 'none';
    });

    const titulos = { citas: 'Citas', pacientes: 'Pacientes', pagos: 'Pagos', estadisticas: 'Estadísticas', mensajes: 'Mensajes de contacto' };
    document.getElementById('titulo-seccion').textContent = titulos[seccion] || seccion;
    document.getElementById(`seccion-${seccion}`).style.display = 'block';

    if (seccion === 'citas') cargarCitas();
    if (seccion === 'pacientes') cargarPacientes();
    if (seccion === 'pagos') cargarPagos();
    if (seccion === 'estadisticas') cargarEstadisticas();
    if (seccion === 'mensajes') cargarMensajes();
}
 
async function cargarCitas() {
    const fecha = document.getElementById('filtro-fecha').value;
    const url = fecha ? `${API}/citas?fecha=${fecha}` : `${API}/citas`;
 
    try {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const citas = await res.json();
        const contenedor = document.getElementById('tabla-citas');
 
        if (!citas.length) {
            contenedor.innerHTML = '<p style="color:#888;">No hay citas.</p>';
            return;
        }
 
        contenedor.innerHTML = `
            <table class="tabla">
                <thead>
                    <tr>
                        <th>Paciente</th>
                        <th>Servicio</th>
                        <th>Doctor</th>
                        <th>Fecha</th>
                        <th>Hora</th>
                        <th>Estado</th>
                        <th>Pago</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${citas.map(c => `
                        <tr>
                            <td>${c.paciente?.nombre || '-'}</td>
                            <td>${c.servicio?.nombre || '-'}</td>
                            <td>${c.doctore?.nombre || '-'}</td>
                            <td>${c.fecha}</td>
                            <td>${c.hora?.slice(0,5)}</td>
                            <td><span class="badge ${c.estado === 'confirmada' ? 'confirmada' : c.estado === 'cancelada' ? 'cancelada' : 'pendiente'}">${c.estado}</span></td>
                            <td>$${Number(c.pago?.monto || 0).toLocaleString()}</td>
                            <td>
                                <button class="btn-tabla" onclick="abrirModalEstado(${c.id})">Estado</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (e) {
        document.getElementById('tabla-citas').innerHTML = '<p style="color:red;">Error al cargar citas.</p>';
    }
}
 
function limpiarFiltro() {
    document.getElementById('filtro-fecha').value = '';
    cargarCitas();
}
 
function abrirModalEstado(id) {
    citaSeleccionadaId = id;
    document.getElementById('modal-estado').style.display = 'flex';
}
 
async function cambiarEstado(estado) {
    try {
        await fetch(`${API}/citas/${citaSeleccionadaId}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ estado })
        });
        cerrarModal('modal-estado');
        cargarCitas();
    } catch (e) {
        alert('Error al cambiar estado.');
    }
}
 
async function cargarPacientes() {
    try {
        const res = await fetch(`${API}/pacientes`, { headers: { Authorization: `Bearer ${token}` } });
        todosPacientes = await res.json();
        renderPacientes(todosPacientes);
    } catch (e) {
        document.getElementById('tabla-pacientes').innerHTML = '<p style="color:red;">Error al cargar pacientes.</p>';
    }
}
 
function renderPacientes(pacientes) {
    const contenedor = document.getElementById('tabla-pacientes');
    if (!pacientes.length) {
        contenedor.innerHTML = '<p style="color:#888;">No hay pacientes registrados.</p>';
        return;
    }
    contenedor.innerHTML = `
        <table class="tabla">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th>CURP</th>
                    <th>Fecha nac.</th>
                </tr>
            </thead>
            <tbody>
                ${pacientes.map(p => `
                    <tr>
                        <td>${p.nombre}</td>
                        <td>${p.email}</td>
                        <td>${p.telefono || '-'}</td>
                        <td>${p.curp}</td>
                        <td>${p.fecha_nac || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}
 
function filtrarPacientes() {
    const q = document.getElementById('buscar-paciente').value.toLowerCase();
    const filtrados = todosPacientes.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.curp.toLowerCase().includes(q)
    );
    renderPacientes(filtrados);
}
 
function abrirModalPaciente() {
    document.getElementById('modal-paciente').style.display = 'flex';
}
 
async function guardarPaciente() {
    const nombre = document.getElementById('p-nombre').value.trim();
    const curp = document.getElementById('p-curp').value.trim();
    const email = document.getElementById('p-email').value.trim();
    const telefono = document.getElementById('p-telefono').value.trim();
    const fecha_nac = document.getElementById('p-fecha-nac').value;
    const direccion = document.getElementById('p-direccion').value.trim();
    const error = document.getElementById('error-paciente');
 
    if (!nombre || !curp || !email) {
        error.style.display = 'block';
        error.textContent = 'Nombre, CURP y email son obligatorios.';
        return;
    }
 
    try {
        const res = await fetch(`${API}/pacientes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ nombre, curp, email, telefono, fecha_nac, direccion })
        });
 
        if (!res.ok) {
            const data = await res.json();
            error.style.display = 'block';
            error.textContent = data.error || 'Error al guardar.';
            return;
        }
 
        cerrarModal('modal-paciente');
        cargarPacientes();
    } catch (e) {
        error.style.display = 'block';
        error.textContent = 'Error al conectar con el servidor.';
    }
}
 
async function cargarPagos() {
    try {
        const res = await fetch(`${API}/pagos`, { headers: { Authorization: `Bearer ${token}` } });
        const pagos = await res.json();
        const contenedor = document.getElementById('tabla-pagos');
 
        if (!pagos.length) {
            contenedor.innerHTML = '<p style="color:#888;">No hay pagos registrados.</p>';
            return;
        }
 
        contenedor.innerHTML = `
            <table class="tabla">
                <thead>
                    <tr>
                        <th>Paciente</th>
                        <th>Servicio</th>
                        <th>Monto</th>
                        <th>Descuento</th>
                        <th>Método</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${pagos.map(p => `
                        <tr>
                            <td>${p.cita?.paciente?.nombre || '-'}</td>
                            <td>${p.cita?.servicio?.nombre || '-'}</td>
                            <td>$${Number(p.monto).toLocaleString()} MXN</td>
                            <td>${p.descuento_porcentaje > 0 ? p.descuento_porcentaje + '% — ' + (p.descuento_concepto || '') : '-'}</td>
                            <td>${p.metodo || '-'}</td>
                            <td><span class="badge ${p.estado === 'pagado' ? 'confirmada' : 'pendiente'}">${p.estado}</span></td>
                            <td>${p.creado_en?.slice(0,10) || '-'}</td>
                            <td>
                                <button class="btn-tabla" onclick="abrirDescuento(${p.id})">Descuento</button>
                                ${p.estado !== 'pagado' ? '<button class="btn-tabla" onclick="marcarPagado(' + p.id + ')">Marcar pagado</button>' : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (e) {
        document.getElementById('tabla-pagos').innerHTML = '<p style="color:red;">Error al cargar pagos.</p>';
    }
}
 
function cerrarModal(id) {
    document.getElementById(id).style.display = 'none';
}

// ---------- DESCUENTOS ----------
let pagoDescuentoId = null;

function abrirDescuento(pagoId) {
    pagoDescuentoId = pagoId;
    document.getElementById('desc-porcentaje').value = 0;
    document.getElementById('desc-concepto').value = '';
    document.getElementById('modal-descuento').style.display = 'flex';
}

async function confirmarDescuento() {
    const descuento_porcentaje = parseInt(document.getElementById('desc-porcentaje').value) || 0;
    const descuento_concepto = document.getElementById('desc-concepto').value.trim();
    try {
        const res = await fetch(`${API}/pagos/${pagoDescuentoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ descuento_porcentaje, descuento_concepto })
        });
        if (!res.ok) { alert('Error al aplicar descuento.'); return; }
        cerrarModal('modal-descuento');
        cargarPagos();
    } catch (e) {
        alert('Error al conectar con el servidor.');
    }
}

async function marcarPagado(pagoId) {
    try {
        await fetch(`${API}/pagos/${pagoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ estado: 'pagado' })
        });
        cargarPagos();
    } catch (e) {
        alert('Error al marcar como pagado.');
    }
}

// ---------- ESTADÍSTICAS ----------

async function cargarEstadisticas() {
    const contenedor = document.getElementById('contenido-estadisticas');
    try {
        const res = await fetch(`${API}/estadisticas`, { headers: { Authorization: `Bearer ${token}` } });
        const d = await res.json();
        const fmt = n => '$' + Number(n || 0).toLocaleString('es-MX') + ' MXN';

        contenedor.innerHTML = `
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px; margin-bottom:28px;">
                ${[
                    ['Citas hoy', d.citas.hoy, '#111'],
                    ['Citas esta semana', d.citas.semana, '#111'],
                    ['Citas este mes', d.citas.mes, '#111'],
                    ['Ingresos hoy', fmt(d.ingresos.hoy), '#16a34a'],
                    ['Ingresos esta semana', fmt(d.ingresos.semana), '#16a34a'],
                    ['Ingresos este mes', fmt(d.ingresos.mes), '#16a34a']
                ].map(([label, val, color]) => `
                    <div style="background:white; border-radius:12px; padding:20px; box-shadow:0 1px 4px rgba(0,0,0,.06);">
                        <p style="font-size:13px; color:#6b7280; margin-bottom:4px;">${label}</p>
                        <p style="font-size:24px; font-weight:700; color:${color};">${val}</p>
                    </div>
                `).join('')}
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
                <div style="background:white; border-radius:12px; padding:20px; box-shadow:0 1px 4px rgba(0,0,0,.06);">
                    <p style="font-size:15px; font-weight:600; margin-bottom:14px;">Citas por estado</p>
                    ${d.porEstado.map(e => `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <span class="badge ${e.estado === 'confirmada' ? 'confirmada' : e.estado === 'cancelada' ? 'cancelada' : 'pendiente'}">${e.estado}</span>
                            <span style="font-weight:600;">${e.total}</span>
                        </div>
                    `).join('')}
                </div>
                <div style="background:white; border-radius:12px; padding:20px; box-shadow:0 1px 4px rgba(0,0,0,.06);">
                    <p style="font-size:15px; font-weight:600; margin-bottom:14px;">Servicios más solicitados</p>
                    ${d.serviciosTop.map((s, i) => `
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                            <span style="font-size:14px; color:#374151;">${i + 1}. ${s.nombre}</span>
                            <span style="font-weight:600; color:#3b82f6;">${s.total} citas</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div style="margin-top:20px; text-align:right;">
                <button class="btn-outline-azul" onclick="enviarRecordatorioManual()">Enviar recordatorios de mañana</button>
            </div>
        `;
    } catch (e) {
        contenedor.innerHTML = '<p style="color:red;">Error al cargar estadísticas.</p>';
    }
}

async function cargarMensajes() {
    const contenedor = document.getElementById('tabla-mensajes');
    try {
        const res = await fetch(`${API}/mensajes`, { headers: { Authorization: `Bearer ${token}` } });
        const mensajes = await res.json();

        if (!mensajes.length) {
            contenedor.innerHTML = '<p style="color:#888;">No hay mensajes de contacto.</p>';
            return;
        }

        contenedor.innerHTML = `
            <table class="tabla">
                <thead>
                    <tr>
                        <th>Nombre</th><th>Email</th><th>Teléfono</th>
                        <th>Asunto</th><th>Mensaje</th><th>Fecha</th><th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${mensajes.map(m => `
                        <tr style="${m.leido ? '' : 'font-weight:600; background:#eff6ff;'}">
                            <td>${m.nombre}</td>
                            <td>${m.email}</td>
                            <td>${m.telefono || '-'}</td>
                            <td>${m.asunto || '-'}</td>
                            <td style="max-width:220px; white-space:pre-wrap; word-break:break-word;">${m.mensaje}</td>
                            <td>${m.creado_en?.slice(0, 10) || '-'}</td>
                            <td style="display:flex; flex-direction:column; gap:6px;">
                                <button class="btn-tabla" onclick="abrirRespuesta(${m.id}, '${m.nombre.replace(/'/g, "\\'")}', '${m.email}')">Responder</button>
                                ${!m.leido ? `<button class="btn-tabla" onclick="marcarLeido(${m.id})">Marcar leído</button>` : '<span style="color:#6b7280; font-size:12px;">Leído</span>'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (e) {
        contenedor.innerHTML = '<p style="color:red;">Error al cargar mensajes.</p>';
    }
}

async function marcarLeido(id) {
    try {
        await fetch(`${API}/mensajes/${id}/leido`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` }
        });
        cargarMensajes();
    } catch (e) {
        alert('Error al marcar el mensaje.');
    }
}

let mensajeRespuestaId = null;

function abrirRespuesta(id, nombre, email) {
    mensajeRespuestaId = id;
    document.getElementById('resp-destinatario').textContent = `Para: ${nombre} <${email}>`;
    document.getElementById('resp-texto').value = '';
    document.getElementById('resp-error').style.display = 'none';
    document.getElementById('modal-respuesta').style.display = 'flex';
}

async function enviarRespuesta() {
    const respuesta = document.getElementById('resp-texto').value.trim();
    const errDiv = document.getElementById('resp-error');
    errDiv.style.display = 'none';

    if (!respuesta) {
        errDiv.style.display = 'block';
        errDiv.textContent = 'Escribe una respuesta antes de enviar.';
        return;
    }

    const btn = document.getElementById('btn-enviar-resp');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
        const res = await fetch(`${API}/mensajes/${mensajeRespuestaId}/responder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ respuesta })
        });
        const data = await res.json();

        if (!res.ok) {
            errDiv.style.display = 'block';
            errDiv.textContent = data.error || 'Error al enviar el correo.';
            return;
        }

        cerrarModal('modal-respuesta');
        cargarMensajes();
    } catch (e) {
        errDiv.style.display = 'block';
        errDiv.textContent = 'No se pudo conectar con el servidor.';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Enviar por email';
    }
}

async function enviarRecordatorioManual() {
    try {
        const res = await fetch(`${API}/recordatorios/enviar`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        alert(data.mensaje);
    } catch (e) {
        alert('Error al enviar recordatorios.');
    }
}

cargarCitas();