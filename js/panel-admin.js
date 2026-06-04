const API = 'http://localhost:3000';
const token = localStorage.getItem('token');
const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

if (!token || usuario.rol !== 'admin') window.location.href = 'login.html';

document.getElementById('nombre-usuario').textContent = usuario.nombre || '';

function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = 'login.html';
}

function cerrarModal(id) {
    document.getElementById(id).style.display = 'none';
}

function mostrarSeccion(seccion, link) {
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('activo'));
    link.classList.add('activo');

    ['resumen','doctores','horarios','servicios','usuarios'].forEach(s => {
        const el = document.getElementById(`seccion-${s}`);
        if (el) el.style.display = 'none';
    });

    const titulos = { resumen:'Resumen', doctores:'Doctores', horarios:'Horarios', servicios:'Servicios', usuarios:'Usuarios' };
    document.getElementById('titulo-seccion').textContent = titulos[seccion] || seccion;
    document.getElementById(`seccion-${seccion}`).style.display = 'block';

    if (seccion === 'resumen')   cargarResumen();
    if (seccion === 'doctores')  cargarDoctores();
    if (seccion === 'horarios')  { cargarDoctoresEnSelects(); cargarHorarios(); }
    if (seccion === 'servicios') cargarServicios();
    if (seccion === 'usuarios')  cargarUsuarios();
}

// ══════════════════════════════════════════
// RESUMEN
// ══════════════════════════════════════════

async function cargarResumen() {
    const contenedor = document.getElementById('contenido-resumen');
    contenedor.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;color:#94a3b8;font-size:14px;margin-bottom:24px;">
            <div class="spinner-sm"></div> Cargando datos...
        </div>`;
    try {
        const [resDoctores, resServicios, resUsuarios, resCitas] = await Promise.all([
            fetch(`${API}/doctores?todos=true`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API}/servicios`,            { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API}/usuarios`,             { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API}/citas`,                { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const doctores  = await resDoctores.json();
        const servicios = await resServicios.json();
        const usuarios  = await resUsuarios.json();
        const citas     = resCitas.ok ? await resCitas.json() : [];

        const hoy = new Date().toISOString().slice(0, 10);
        const doctoresActivos  = Array.isArray(doctores)  ? doctores.filter(x => x.activo !== false).length : 0;
        const serviciosActivos = Array.isArray(servicios) ? servicios.filter(x => x.activo !== false).length : 0;
        const totalUsuarios    = Array.isArray(usuarios)  ? usuarios.length : 0;
        const totalCitas       = Array.isArray(citas)     ? citas.length : 0;
        const citasHoy         = Array.isArray(citas)     ? citas.filter(c => c.fecha === hoy).length : 0;
        const citasPendientes  = Array.isArray(citas)     ? citas.filter(c => c.estado === 'pendiente').length : 0;
        const citasConfirmadas = Array.isArray(citas)     ? citas.filter(c => c.estado === 'confirmada').length : 0;
        const citasCanceladas  = Array.isArray(citas)     ? citas.filter(c => c.estado === 'cancelada').length : 0;

        const citasProximas = Array.isArray(citas)
            ? citas.filter(c => c.fecha >= hoy && (c.estado === 'pendiente' || c.estado === 'confirmada'))
                   .slice(0, 5)
            : [];

        const fechaFormateada = new Date().toLocaleDateString('es-MX', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

        contenedor.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:22px;flex-wrap:wrap;gap:8px;">
                <p style="font-size:13px;color:#64748b;margin:0;">
                    <i class="fa-regular fa-calendar" style="margin-right:5px;"></i>${fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1)}
                </p>
                <span style="background:#eff6ff;color:#2563eb;font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;">
                    Panel activo
                </span>
            </div>

            <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:12px;">
                Entidades del sistema
            </p>
            <div class="admin-grid" style="margin-bottom:20px;">
                <div class="admin-stat" style="border-left:4px solid #2563eb;">
                    <div class="admin-stat-icon" style="color:#2563eb;"><i class="fa-solid fa-user-doctor"></i></div>
                    <p>Doctores activos</p>
                    <p>${doctoresActivos}</p>
                    <p class="admin-stat-sub">de ${Array.isArray(doctores) ? doctores.length : 0} registrados</p>
                </div>
                <div class="admin-stat" style="border-left:4px solid #0891b2;">
                    <div class="admin-stat-icon" style="color:#0891b2;"><i class="fa-solid fa-tooth"></i></div>
                    <p>Servicios activos</p>
                    <p>${serviciosActivos}</p>
                    <p class="admin-stat-sub">de ${Array.isArray(servicios) ? servicios.length : 0} registrados</p>
                </div>
                <div class="admin-stat" style="border-left:4px solid #7c3aed;">
                    <div class="admin-stat-icon" style="color:#7c3aed;"><i class="fa-solid fa-users"></i></div>
                    <p>Usuarios del sistema</p>
                    <p>${totalUsuarios}</p>
                    <p class="admin-stat-sub">admins, doctores, recepcionistas</p>
                </div>
                <div class="admin-stat" style="border-left:4px solid #0f172a;">
                    <div class="admin-stat-icon" style="color:#0f172a;"><i class="fa-solid fa-clipboard-list"></i></div>
                    <p>Total de citas</p>
                    <p>${totalCitas}</p>
                    <p class="admin-stat-sub">historial completo</p>
                </div>
            </div>

            <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:12px;">
                Estado de citas
            </p>
            <div class="admin-grid" style="margin-bottom:28px;">
                <div class="admin-stat" style="border-left:4px solid #2563eb;">
                    <div class="admin-stat-icon" style="color:#2563eb;"><i class="fa-solid fa-calendar-days"></i></div>
                    <p>Citas hoy</p>
                    <p style="color:#2563eb;">${citasHoy}</p>
                    <p class="admin-stat-sub">programadas para hoy</p>
                </div>
                <div class="admin-stat" style="border-left:4px solid #d97706;">
                    <div class="admin-stat-icon" style="color:#d97706;"><i class="fa-solid fa-hourglass-half"></i></div>
                    <p>Pendientes</p>
                    <p style="color:#d97706;">${citasPendientes}</p>
                    <p class="admin-stat-sub">por confirmar</p>
                </div>
                <div class="admin-stat" style="border-left:4px solid #16a34a;">
                    <div class="admin-stat-icon" style="color:#16a34a;"><i class="fa-solid fa-circle-check"></i></div>
                    <p>Confirmadas</p>
                    <p style="color:#16a34a;">${citasConfirmadas}</p>
                    <p class="admin-stat-sub">listas para atención</p>
                </div>
                <div class="admin-stat" style="border-left:4px solid #dc2626;">
                    <div class="admin-stat-icon" style="color:#dc2626;"><i class="fa-solid fa-circle-xmark"></i></div>
                    <p>Canceladas</p>
                    <p style="color:#dc2626;">${citasCanceladas}</p>
                    <p class="admin-stat-sub">del total histórico</p>
                </div>
            </div>

            ${citasProximas.length ? `
            <div style="background:#fff;border-radius:14px;padding:22px 24px;box-shadow:0 1px 6px rgba(0,0,0,.07);margin-bottom:24px;">
                <p style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:16px;"><i class="fa-solid fa-thumbtack" style="margin-right:7px;color:#2563eb;"></i>Próximas citas</p>
                <div style="display:flex;flex-direction:column;gap:10px;">
                    ${citasProximas.map(c => {
                        const estadoColor = c.estado === 'confirmada' ? '#16a34a' : '#d97706';
                        const estadoBg   = c.estado === 'confirmada' ? '#dcfce7' : '#fef3c7';
                        return `
                        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;gap:10px;flex-wrap:wrap;">
                            <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                                <div style="width:36px;height:36px;border-radius:50%;background:#eff6ff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;color:#2563eb;"><i class="fa-solid fa-circle-user"></i></div>
                                <div>
                                    <p style="margin:0;font-size:14px;font-weight:600;color:#0f172a;">${esc(c.paciente?.nombre || '—')}</p>
                                    <p style="margin:0;font-size:12px;color:#64748b;">${esc(c.servicio?.nombre || '—')} · Dr. ${esc(c.doctor?.nombre || '—')}</p>
                                </div>
                            </div>
                            <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
                                <span style="font-size:13px;color:#475569;">${c.fecha} · ${(c.hora||'').slice(0,5)}</span>
                                <span style="background:${estadoBg};color:${estadoColor};font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;">
                                    ${c.estado}
                                </span>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>` : ''}

            <div style="background:#fff;border-radius:14px;padding:22px 24px;box-shadow:0 1px 6px rgba(0,0,0,.07);">
                <p style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:16px;"><i class="fa-solid fa-bolt" style="margin-right:7px;color:#d97706;"></i>Accesos rápidos</p>
                <div style="display:flex;flex-wrap:wrap;gap:12px;">
                    <button class="btn-acceso-rapido" onclick="document.querySelector('[onclick*=doctores]').click()"><i class="fa-solid fa-user-doctor"></i> Doctores</button>
                    <button class="btn-acceso-rapido" onclick="document.querySelector('[onclick*=horarios]').click()"><i class="fa-solid fa-clock"></i> Horarios</button>
                    <button class="btn-acceso-rapido" onclick="document.querySelector('[onclick*=servicios]').click()"><i class="fa-solid fa-tooth"></i> Servicios</button>
                    <button class="btn-acceso-rapido" onclick="document.querySelector('[onclick*=usuarios]').click()"><i class="fa-solid fa-users"></i> Usuarios</button>
                </div>
            </div>
        `;
    } catch (e) {
        contenedor.innerHTML = '<p style="color:red;">Error al cargar resumen.</p>';
    }
}

// ══════════════════════════════════════════
// CONFIRMAR ELIMINACIÓN (modal reutilizable)
// ══════════════════════════════════════════

let pendienteEliminar = { tipo: null, id: null };

function abrirConfirmEliminar(tipo, id, nombre) {
    pendienteEliminar = { tipo, id };

    const mensajes = {
        servicio: `¿Eliminar permanentemente el servicio <strong>"${esc(nombre)}"</strong>?<br>
                   Solo es posible si no tiene citas registradas. Si el servicio tiene citas, desactívalo en su lugar.`,
        doctor:   `¿Eliminar permanentemente al doctor <strong>"${esc(nombre)}"</strong>?<br>
                   Solo es posible si no tiene citas registradas. Sus horarios también serán eliminados.`,
        horario:  `¿Eliminar permanentemente este bloque de horario?<br>
                   Los pacientes no podrán agendar en este horario.`,
        usuario:  `¿Eliminar permanentemente al usuario <strong>"${esc(nombre)}"</strong>?<br>
                   Esta acción no se puede deshacer.`
    };

    document.getElementById('confirmar-eliminar-mensaje').innerHTML = `
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px;margin-bottom:16px;color:#991b1b;font-size:14px;line-height:1.6;">
            <i class="fa-solid fa-triangle-exclamation" style="margin-right:6px;"></i>${mensajes[tipo] || '¿Confirmar eliminación?'}
        </div>
    `;
    document.getElementById('confirmar-password-admin').value = '';
    document.getElementById('error-confirmar-eliminar').style.display = 'none';
    document.getElementById('modal-confirmar-eliminar').style.display = 'flex';
}

async function ejecutarEliminar() {
    const passwordAdmin = document.getElementById('confirmar-password-admin').value;
    const errDiv = document.getElementById('error-confirmar-eliminar');
    errDiv.style.display = 'none';

    if (!passwordAdmin) {
        errDiv.style.display = 'block';
        errDiv.textContent = 'La contraseña de administrador es obligatoria.';
        return;
    }

    const endpoints = {
        servicio: `${API}/servicios/${pendienteEliminar.id}`,
        doctor:   `${API}/doctores/${pendienteEliminar.id}`,
        horario:  `${API}/horarios/${pendienteEliminar.id}`,
        usuario:  `${API}/usuarios/${pendienteEliminar.id}`
    };

    const url = endpoints[pendienteEliminar.tipo];
    if (!url) return;

    const btn = document.getElementById('btn-ejecutar-eliminar');
    btn.disabled = true;
    btn.textContent = 'Eliminando...';

    try {
        const res = await fetch(url, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ passwordAdmin })
        });
        const d = await res.json();
        if (!res.ok) {
            errDiv.style.display = 'block';
            errDiv.textContent = d.error || 'Error al eliminar.';
            return;
        }
        cerrarModal('modal-confirmar-eliminar');
        if (pendienteEliminar.tipo === 'servicio') cargarServicios();
        if (pendienteEliminar.tipo === 'doctor')   cargarDoctores();
        if (pendienteEliminar.tipo === 'horario')  cargarHorarios();
        if (pendienteEliminar.tipo === 'usuario')  cargarUsuarios();
    } catch (e) {
        errDiv.style.display = 'block';
        errDiv.textContent = 'Error al conectar con el servidor.';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Eliminar permanentemente';
    }
}

// ══════════════════════════════════════════
// DOCTORES
// ══════════════════════════════════════════

let doctorEditandoId = null;
let todosDoctores = [];

async function cargarDoctores() {
    try {
        const res = await fetch(`${API}/doctores?todos=true`, { headers: { Authorization: `Bearer ${token}` } });
        todosDoctores = await res.json();
        renderTablaDoctores();
    } catch (e) {
        document.getElementById('tabla-doctores').innerHTML = '<p style="color:red;">Error al cargar doctores.</p>';
    }
}

function renderTablaDoctores() {
    const contenedor = document.getElementById('tabla-doctores');
    if (!todosDoctores.length) {
        contenedor.innerHTML = '<p style="color:#888;">No hay doctores registrados.</p>';
        return;
    }
    contenedor.innerHTML = `
        <table class="tabla">
            <thead><tr>
                <th>Nombre</th><th>Especialidad</th><th>Email</th>
                <th>Teléfono</th><th>Estado</th><th>Acciones</th>
            </tr></thead>
            <tbody>
                ${todosDoctores.map(d => `
                    <tr>
                        <td>${esc(d.nombre)}</td>
                        <td>${esc(d.especialidad) || '—'}</td>
                        <td>${esc(d.email) || '—'}</td>
                        <td>${esc(d.telefono) || '—'}</td>
                        <td>
                            <span class="badge ${d.activo ? 'confirmada' : 'inactivo'}">
                                ${d.activo ? 'Activo' : 'Inactivo'}
                            </span>
                        </td>
                        <td style="display:flex; gap:6px; flex-wrap:wrap;">
                            <button class="btn-tabla" onclick="abrirModalDoctor(${d.id})">Editar</button>
                            <button class="toggle-activo ${d.activo ? 'on' : 'off'}"
                                onclick="toggleDoctor(${d.id}, ${d.activo})">
                                ${d.activo ? 'Desactivar' : 'Activar'}
                            </button>
                            <button class="btn-peligro" onclick="abrirConfirmEliminar('doctor', ${d.id}, '${esc(d.nombre)}')">Eliminar</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function abrirModalDoctor(id) {
    doctorEditandoId = id || null;
    document.getElementById('modal-doctor-titulo').textContent = id ? 'Editar doctor' : 'Nuevo doctor';
    document.getElementById('error-doctor').style.display = 'none';

    if (id) {
        const d = todosDoctores.find(x => x.id === id);
        if (d) {
            document.getElementById('doc-nombre').value = d.nombre || '';
            document.getElementById('doc-especialidad').value = d.especialidad || '';
            document.getElementById('doc-email').value = d.email || '';
            document.getElementById('doc-telefono').value = d.telefono || '';
        }
    } else {
        ['doc-nombre','doc-especialidad','doc-email','doc-telefono'].forEach(id => {
            document.getElementById(id).value = '';
        });
    }
    document.getElementById('modal-doctor').style.display = 'flex';
}

async function guardarDoctor() {
    const nombre      = document.getElementById('doc-nombre').value.trim();
    const especialidad = document.getElementById('doc-especialidad').value.trim();
    const email       = document.getElementById('doc-email').value.trim();
    const telefono    = document.getElementById('doc-telefono').value.trim();
    const errDiv      = document.getElementById('error-doctor');
    errDiv.style.display = 'none';

    if (!nombre) {
        errDiv.style.display = 'block';
        errDiv.textContent = 'El nombre es obligatorio.';
        return;
    }

    const body = { nombre, especialidad, email, telefono };
    const url    = doctorEditandoId ? `${API}/doctores/${doctorEditandoId}` : `${API}/doctores`;
    const method = doctorEditandoId ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const d = await res.json();
            errDiv.style.display = 'block';
            errDiv.textContent = d.error || 'Error al guardar.';
            return;
        }
        cerrarModal('modal-doctor');
        cargarDoctores();
    } catch (e) {
        errDiv.style.display = 'block';
        errDiv.textContent = 'Error al conectar con el servidor.';
    }
}

async function toggleDoctor(id, activo) {
    try {
        await fetch(`${API}/doctores/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ activo: !activo })
        });
        cargarDoctores();
    } catch (e) { alert('Error al cambiar estado del doctor.'); }
}

// ══════════════════════════════════════════
// HORARIOS
// ══════════════════════════════════════════

async function cargarDoctoresEnSelects() {
    try {
        const res = await fetch(`${API}/doctores`, { headers: { Authorization: `Bearer ${token}` } });
        const doctores = await res.json();

        const selectFiltro = document.getElementById('filtro-doctor-horario');
        const selectModal  = document.getElementById('hor-doctor');
        const selectUsrDoc = document.getElementById('usr-doctor-id');

        const opFiltro = '<option value="">Todos los doctores</option>' +
            doctores.map(d => `<option value="${d.id}">${esc(d.nombre)}</option>`).join('');
        const opModal  = doctores.map(d => `<option value="${d.id}">${esc(d.nombre)}</option>`).join('');
        const opUsrDoc = '<option value="">— Sin vincular —</option>' +
            doctores.map(d => `<option value="${d.id}">${esc(d.nombre)}</option>`).join('');

        selectFiltro.innerHTML = opFiltro;
        selectModal.innerHTML  = opModal;
        selectUsrDoc.innerHTML = opUsrDoc;
    } catch (e) { /* ignore */ }
}

async function cargarHorarios() {
    try {
        const res = await fetch(`${API}/horarios`, { headers: { Authorization: `Bearer ${token}` } });
        let horarios = await res.json();

        const filtroDoctor = document.getElementById('filtro-doctor-horario')?.value;
        if (filtroDoctor) horarios = horarios.filter(h => String(h.doctor_id) === filtroDoctor);

        const contenedor = document.getElementById('tabla-horarios');
        if (!horarios.length) {
            contenedor.innerHTML = '<p style="color:#888;">No hay horarios registrados.</p>';
            return;
        }

        contenedor.innerHTML = `
            <table class="tabla">
                <thead><tr>
                    <th>Doctor</th><th>Día</th><th>Hora inicio</th>
                    <th>Hora fin</th><th>Estado</th><th>Acciones</th>
                </tr></thead>
                <tbody>
                    ${horarios.map(h => `
                        <tr>
                            <td>${esc(h.doctore?.nombre || h.doctor?.nombre)}</td>
                            <td>${DIAS[h.dia_semana] || h.dia_semana}</td>
                            <td>${esc(h.hora_inicio?.slice(0,5))}</td>
                            <td>${esc(h.hora_fin?.slice(0,5))}</td>
                            <td><span class="badge ${h.activo ? 'confirmada' : 'inactivo'}">${h.activo ? 'Activo' : 'Inactivo'}</span></td>
                            <td>
                                <button class="btn-peligro" onclick="abrirConfirmEliminar('horario', ${h.id}, '')">Eliminar</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (e) {
        document.getElementById('tabla-horarios').innerHTML = '<p style="color:red;">Error al cargar horarios.</p>';
    }
}

function abrirModalHorario() {
    document.getElementById('hor-inicio').value = '';
    document.getElementById('hor-fin').value = '';
    document.getElementById('error-horario').style.display = 'none';
    document.getElementById('modal-horario').style.display = 'flex';
}

async function guardarHorario() {
    const doctor_id  = document.getElementById('hor-doctor').value;
    const dia_semana = document.getElementById('hor-dia').value;
    const hora_inicio = document.getElementById('hor-inicio').value;
    const hora_fin    = document.getElementById('hor-fin').value;
    const errDiv      = document.getElementById('error-horario');
    errDiv.style.display = 'none';

    if (!doctor_id || !hora_inicio || !hora_fin) {
        errDiv.style.display = 'block';
        errDiv.textContent = 'Completa todos los campos.';
        return;
    }
    if (hora_fin <= hora_inicio) {
        errDiv.style.display = 'block';
        errDiv.textContent = 'La hora de fin debe ser posterior a la de inicio.';
        return;
    }

    try {
        const res = await fetch(`${API}/horarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ doctor_id: parseInt(doctor_id), dia_semana: parseInt(dia_semana), hora_inicio, hora_fin })
        });
        if (!res.ok) {
            const d = await res.json();
            errDiv.style.display = 'block';
            errDiv.textContent = d.error || 'Error al guardar.';
            return;
        }
        cerrarModal('modal-horario');
        cargarHorarios();
    } catch (e) {
        errDiv.style.display = 'block';
        errDiv.textContent = 'Error al conectar con el servidor.';
    }
}

// ══════════════════════════════════════════
// SERVICIOS
// ══════════════════════════════════════════

let servicioEditandoId = null;
let todosServicios = [];

async function cargarServicios() {
    try {
        const res = await fetch(`${API}/servicios`, { headers: { Authorization: `Bearer ${token}` } });
        todosServicios = await res.json();
        renderTablaServicios();
    } catch (e) {
        document.getElementById('tabla-servicios').innerHTML = '<p style="color:red;">Error al cargar servicios.</p>';
    }
}

function renderTablaServicios() {
    const contenedor = document.getElementById('tabla-servicios');
    if (!todosServicios.length) {
        contenedor.innerHTML = '<p style="color:#888;">No hay servicios registrados.</p>';
        return;
    }
    contenedor.innerHTML = `
        <table class="tabla">
            <thead><tr>
                <th>Ícono</th><th>Nombre</th><th>Categoría</th>
                <th>Duración</th><th>Precio</th><th>Estado</th><th>Acciones</th>
            </tr></thead>
            <tbody>
                ${todosServicios.map(s => `
                    <tr>
                        <td style="font-size:20px;">${esc(s.icono) || '—'}</td>
                        <td>${esc(s.nombre)}</td>
                        <td>${esc(s.categoria) || '—'}</td>
                        <td>${s.duracion_min} min</td>
                        <td style="font-weight:700;">$${Number(s.precio).toLocaleString()} MXN</td>
                        <td>
                            <span class="badge ${s.activo ? 'confirmada' : 'inactivo'}">
                                ${s.activo ? 'Activo' : 'Inactivo'}
                            </span>
                        </td>
                        <td style="display:flex; gap:6px; flex-wrap:wrap;">
                            <button class="btn-tabla" onclick="abrirModalServicio(${s.id})">Editar</button>
                            <button class="toggle-activo ${s.activo ? 'on' : 'off'}"
                                onclick="toggleServicio(${s.id}, ${s.activo})">
                                ${s.activo ? 'Desactivar' : 'Activar'}
                            </button>
                            <button class="btn-peligro" onclick="abrirConfirmEliminar('servicio', ${s.id}, '${esc(s.nombre)}')">Eliminar</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function abrirModalServicio(id) {
    servicioEditandoId = id || null;
    document.getElementById('modal-servicio-titulo').textContent = id ? 'Editar servicio' : 'Nuevo servicio';
    document.getElementById('error-servicio').style.display = 'none';

    if (id) {
        const s = todosServicios.find(x => x.id === id);
        if (s) {
            document.getElementById('srv-nombre').value      = s.nombre || '';
            document.getElementById('srv-descripcion').value = s.descripcion || '';
            document.getElementById('srv-categoria').value   = s.categoria || '';
            document.getElementById('srv-duracion').value    = s.duracion_min || '';
            document.getElementById('srv-precio').value      = s.precio || '';
            document.getElementById('srv-icono').value       = s.icono || '';
        }
    } else {
        ['srv-nombre','srv-descripcion','srv-categoria','srv-duracion','srv-precio','srv-icono']
            .forEach(id => { document.getElementById(id).value = ''; });
    }
    document.getElementById('modal-servicio').style.display = 'flex';
}

async function guardarServicio() {
    const nombre      = document.getElementById('srv-nombre').value.trim();
    const descripcion = document.getElementById('srv-descripcion').value.trim();
    const categoria   = document.getElementById('srv-categoria').value.trim();
    const duracion_min = parseInt(document.getElementById('srv-duracion').value);
    const precio      = parseFloat(document.getElementById('srv-precio').value);
    const icono       = document.getElementById('srv-icono').value.trim();
    const errDiv      = document.getElementById('error-servicio');
    errDiv.style.display = 'none';

    if (!nombre || !duracion_min || isNaN(precio) || precio < 0) {
        errDiv.style.display = 'block';
        errDiv.textContent = 'Nombre, duración y precio son obligatorios.';
        return;
    }

    const body = { nombre, descripcion, categoria, duracion_min, precio, icono };

    if (servicioEditandoId) {
        try {
            const res = await fetch(`${API}/servicios/${servicioEditandoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                const d = await res.json();
                errDiv.style.display = 'block';
                errDiv.textContent = d.error || 'Error al editar.';
                return;
            }
        } catch (e) {
            errDiv.style.display = 'block';
            errDiv.textContent = 'Error al conectar con el servidor.';
            return;
        }
    } else {
        try {
            const res = await fetch(`${API}/servicios`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                const d = await res.json();
                errDiv.style.display = 'block';
                errDiv.textContent = d.error || 'Error al crear.';
                return;
            }
        } catch (e) {
            errDiv.style.display = 'block';
            errDiv.textContent = 'Error al conectar con el servidor.';
            return;
        }
    }

    cerrarModal('modal-servicio');
    cargarServicios();
}

async function toggleServicio(id, activo) {
    try {
        await fetch(`${API}/servicios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ activo: !activo })
        });
        cargarServicios();
    } catch (e) { alert('Error al cambiar estado del servicio.'); }
}

// ══════════════════════════════════════════
// USUARIOS
// ══════════════════════════════════════════

let usuarioEditandoId = null;
let usuarioPasswordId = null;
let todosUsuarios = [];

async function cargarUsuarios() {
    try {
        const res = await fetch(`${API}/usuarios`, { headers: { Authorization: `Bearer ${token}` } });
        todosUsuarios = await res.json();
        renderTablaUsuarios();
    } catch (e) {
        document.getElementById('tabla-usuarios').innerHTML = '<p style="color:red;">Error al cargar usuarios.</p>';
    }
}

function renderTablaUsuarios() {
    const contenedor = document.getElementById('tabla-usuarios');
    if (!todosUsuarios.length) {
        contenedor.innerHTML = '<p style="color:#888;">No hay usuarios registrados.</p>';
        return;
    }

    const rolBadge = rol => {
        if (rol === 'admin') return 'badge admin';
        if (rol === 'doctor') return 'badge doctor-rol';
        return 'badge recepcionista-rol';
    };

    contenedor.innerHTML = `
        <table class="tabla">
            <thead><tr>
                <th>Nombre</th><th>Email</th><th>Rol</th><th>Acciones</th>
            </tr></thead>
            <tbody>
                ${todosUsuarios.map(u => `
                    <tr>
                        <td>${esc(u.nombre)}</td>
                        <td>${esc(u.email)}</td>
                        <td><span class="${rolBadge(u.rol)}">${esc(u.rol)}</span></td>
                        <td style="display:flex; gap:6px; flex-wrap:wrap;">
                            <button class="btn-tabla" onclick="abrirModalUsuario(${u.id})">Editar</button>
                            <button class="btn-warning" onclick="abrirCambiarPassword(${u.id}, '${esc(u.nombre)}')">Contraseña</button>
                            ${u.rol !== 'admin' ? `<button class="btn-peligro" onclick="abrirConfirmEliminar('usuario', ${u.id}, '${esc(u.nombre)}')">Eliminar</button>` : ''}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function toggleCampoDoctor() {
    const rol = document.getElementById('usr-rol').value;
    document.getElementById('campo-doctor-vinculo').style.display = rol === 'doctor' ? 'flex' : 'none';
}

function abrirModalUsuario(id) {
    usuarioEditandoId = id || null;
    document.getElementById('modal-usuario-titulo').textContent = id ? 'Editar usuario' : 'Nuevo usuario';
    document.getElementById('error-usuario').style.display = 'none';
    document.getElementById('campo-password').style.display = id ? 'none' : 'flex';

    if (id) {
        const u = todosUsuarios.find(x => x.id === id);
        if (u) {
            document.getElementById('usr-nombre').value = u.nombre || '';
            document.getElementById('usr-email').value  = u.email || '';
            document.getElementById('usr-rol').value    = u.rol || 'recepcionista';
            document.getElementById('usr-doctor-id').value = u.doctor_id || '';
        }
    } else {
        ['usr-nombre','usr-email','usr-password'].forEach(id => { document.getElementById(id).value = ''; });
        document.getElementById('usr-rol').value = 'recepcionista';
    }

    toggleCampoDoctor();
    cargarDoctoresEnSelects();
    document.getElementById('modal-usuario').style.display = 'flex';
}

async function guardarUsuario() {
    const nombre    = document.getElementById('usr-nombre').value.trim();
    const email     = document.getElementById('usr-email').value.trim();
    const password  = document.getElementById('usr-password').value;
    const rol       = document.getElementById('usr-rol').value;
    const doctor_id = document.getElementById('usr-doctor-id').value || null;
    const errDiv    = document.getElementById('error-usuario');
    errDiv.style.display = 'none';

    if (!nombre || !email || !rol) {
        errDiv.style.display = 'block';
        errDiv.textContent = 'Nombre, email y rol son obligatorios.';
        return;
    }

    try {
        let res;
        if (usuarioEditandoId) {
            res = await fetch(`${API}/usuarios/${usuarioEditandoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ nombre, email, rol, doctor_id })
            });
        } else {
            if (!password || password.length < 6) {
                errDiv.style.display = 'block';
                errDiv.textContent = 'La contraseña debe tener al menos 6 caracteres.';
                return;
            }
            res = await fetch(`${API}/usuarios/admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ nombre, email, password, rol, doctor_id })
            });
        }

        if (!res.ok) {
            const d = await res.json();
            errDiv.style.display = 'block';
            errDiv.textContent = d.error || 'Error al guardar.';
            return;
        }

        cerrarModal('modal-usuario');
        cargarUsuarios();
    } catch (e) {
        errDiv.style.display = 'block';
        errDiv.textContent = 'Error al conectar con el servidor.';
    }
}

function abrirCambiarPassword(id, nombre) {
    usuarioPasswordId = id;
    document.getElementById('pass-usuario-nombre').textContent = `Usuario: ${nombre}`;
    document.getElementById('nueva-password').value = '';
    document.getElementById('error-password').style.display = 'none';
    document.getElementById('modal-password').style.display = 'flex';
}

async function guardarPassword() {
    const password = document.getElementById('nueva-password').value;
    const errDiv   = document.getElementById('error-password');
    errDiv.style.display = 'none';

    if (!password || password.length < 6) {
        errDiv.style.display = 'block';
        errDiv.textContent = 'La contraseña debe tener al menos 6 caracteres.';
        return;
    }

    try {
        const res = await fetch(`${API}/usuarios/${usuarioPasswordId}/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ password })
        });

        if (!res.ok) {
            const d = await res.json();
            errDiv.style.display = 'block';
            errDiv.textContent = d.error || 'Error al cambiar contraseña.';
            return;
        }

        cerrarModal('modal-password');
        alert('Contraseña actualizada correctamente.');
    } catch (e) {
        errDiv.style.display = 'block';
        errDiv.textContent = 'Error al conectar con el servidor.';
    }
}

// Carga inicial
cargarResumen();
