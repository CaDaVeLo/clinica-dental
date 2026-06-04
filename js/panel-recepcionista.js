const API = 'http://localhost:3000';
const token = localStorage.getItem('token');
const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
let citaSeleccionadaId = null;
let todosPacientes = [];
let citasData = [];
let todasLasCitas = [];
let tabCitas = 'proximas';
let ordenCitas = 'desc';

function fechaHoyStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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

    ['citas', 'pacientes', 'pagos', 'estadisticas', 'mensajes', 'resenas'].forEach(s => {
        const el = document.getElementById(`seccion-${s}`);
        if (el) el.style.display = 'none';
    });

    const titulos = { citas: 'Citas', pacientes: 'Pacientes', pagos: 'Pagos', estadisticas: 'Estadísticas', mensajes: 'Mensajes de contacto', resenas: 'Reseñas de pacientes' };
    document.getElementById('titulo-seccion').textContent = titulos[seccion] || seccion;
    document.getElementById(`seccion-${seccion}`).style.display = 'block';

    if (seccion === 'citas') cargarCitas();
    if (seccion === 'pacientes') cargarPacientes();
    if (seccion === 'pagos') cargarPagos();
    if (seccion === 'estadisticas') cargarEstadisticas();
    if (seccion === 'mensajes') cargarMensajes();
    if (seccion === 'resenas') cargarResenas();
}

function aplicarFiltro() {
    const fecha = document.getElementById('filtro-fecha').value;
    if (!fecha) { alert('Selecciona una fecha para filtrar.'); return; }
    const [anio, mes, dia] = fecha.split('-');
    document.getElementById('badge-fecha').textContent = `${dia}/${mes}/${anio}`;
    document.getElementById('badge-filtro').style.display = 'inline-flex';
    renderCitasPorTab(fecha);
}

function limpiarFiltro() {
    document.getElementById('filtro-fecha').value = '';
    document.getElementById('badge-filtro').style.display = 'none';
    renderCitasPorTab();
}

function cambiarOrdenCitas(orden) {
    ordenCitas = orden;
    const btnDesc = document.getElementById('btn-orden-desc');
    const btnAsc  = document.getElementById('btn-orden-asc');
    if (btnDesc && btnAsc) {
        const on  = 'border:1.5px solid #2563eb; background:#eff6ff; color:#2563eb;';
        const off = 'border:1.5px solid #e5e7eb; background:#fff; color:#6b7280;';
        btnDesc.style.cssText = `height:40px; padding:0 16px; font-size:13px; font-weight:600; border-radius:8px; cursor:pointer; ${orden === 'desc' ? on : off}`;
        btnAsc.style.cssText  = `height:40px; padding:0 16px; font-size:13px; font-weight:600; border-radius:8px; cursor:pointer; ${orden === 'asc'  ? on : off}`;
    }
    renderCitasPorTab(document.getElementById('filtro-fecha').value || undefined);
}

function renderTabsCitas(nProximas, nPasadas, nCanceladas) {
    const tabs = [
        { key: 'proximas',   label: 'Próximas',   count: nProximas,   icon: 'fa-calendar-check' },
        { key: 'pasadas',    label: 'Historial',   count: nPasadas,    icon: 'fa-clock-rotate-left' },
        { key: 'canceladas', label: 'Canceladas',  count: nCanceladas, icon: 'fa-ban' }
    ];
    document.getElementById('tabs-citas').innerHTML = tabs.map(t => {
        const activo = tabCitas === t.key;
        return `<button onclick="cambiarTabCitas('${t.key}')"
            style="display:flex;align-items:center;gap:7px;padding:10px 18px;font-size:13px;font-weight:600;
                   border:none;background:none;cursor:pointer;white-space:nowrap;
                   border-bottom:${activo ? '3px solid #2563eb' : '3px solid transparent'};
                   color:${activo ? '#2563eb' : '#6b7280'};margin-bottom:-2px;transition:color .15s;">
            <i class="fa-solid ${t.icon}"></i>${t.label}
            <span style="font-size:11px;font-weight:700;padding:1px 8px;border-radius:20px;
                         background:${activo ? '#eff6ff' : '#f3f4f6'};
                         color:${activo ? '#2563eb' : '#94a3b8'};">${t.count}</span>
        </button>`;
    }).join('');
}

function cambiarTabCitas(tab) {
    tabCitas = tab;
    const filtros = document.getElementById('filtros-citas');
    if (filtros) filtros.style.display = tab === 'proximas' ? 'flex' : 'none';
    if (tab !== 'proximas') document.getElementById('badge-filtro').style.display = 'none';

    const hoy = fechaHoyStr();
    renderTabsCitas(
        todasLasCitas.filter(c => ['pendiente','confirmada'].includes(c.estado) && c.fecha >= hoy).length,
        todasLasCitas.filter(c => c.estado !== 'cancelada' && (c.fecha < hoy || c.estado === 'completada')).length,
        todasLasCitas.filter(c => c.estado === 'cancelada').length
    );
    renderCitasPorTab();
}

function renderCitasPorTab(fechaFiltro) {
    const hoy = fechaHoyStr();
    let filtradas;

    if (tabCitas === 'proximas') {
        filtradas = todasLasCitas.filter(c => ['pendiente','confirmada'].includes(c.estado) && c.fecha >= hoy);
        if (fechaFiltro) filtradas = filtradas.filter(c => c.fecha === fechaFiltro);
    } else if (tabCitas === 'pasadas') {
        filtradas = todasLasCitas.filter(c => c.estado !== 'cancelada' && (c.fecha < hoy || c.estado === 'completada'));
    } else {
        filtradas = todasLasCitas.filter(c => c.estado === 'cancelada');
    }

    citasData = filtradas;

    if (!filtradas.length) {
        const vacios = { proximas: 'No hay citas próximas.', pasadas: 'No hay citas en el historial.', canceladas: 'No hay citas canceladas.' };
        document.getElementById('tabla-citas').innerHTML = `
            <div style="text-align:center;padding:40px 20px;color:#94a3b8;">
                <i class="fa-solid fa-calendar-xmark" style="font-size:32px;margin-bottom:12px;display:block;"></i>
                <p style="font-size:14px;margin:0;">${vacios[tabCitas]}</p>
            </div>`;
        return;
    }
    renderTablaCitas(filtradas);
}

async function cargarCitas() {
    try {
        const res = await fetch(`${API}/citas`, { headers: { Authorization: `Bearer ${token}` } });
        todasLasCitas = await res.json();

        const hoy = fechaHoyStr();
        renderTabsCitas(
            todasLasCitas.filter(c => ['pendiente','confirmada'].includes(c.estado) && c.fecha >= hoy).length,
            todasLasCitas.filter(c => c.estado !== 'cancelada' && (c.fecha < hoy || c.estado === 'completada')).length,
            todasLasCitas.filter(c => c.estado === 'cancelada').length
        );
        renderCitasPorTab();
    } catch (e) {
        document.getElementById('tabla-citas').innerHTML = '<p style="color:red;">Error al cargar citas.</p>';
    }
}

function badgeEstado(estado) {
    if (estado === 'confirmada')  return 'confirmada';
    if (estado === 'cancelada')   return 'cancelada';
    if (estado === 'completada')  return 'confirmada';
    return 'pendiente';
}

function renderTablaCitas(citas) {
    const sorted = [...citas].sort((a, b) => {
        const fa = `${a.fecha}T${a.hora || '00:00:00'}`;
        const fb = `${b.fecha}T${b.hora || '00:00:00'}`;
        return ordenCitas === 'desc' ? fb.localeCompare(fa) : fa.localeCompare(fb);
    });

    document.getElementById('tabla-citas').innerHTML = `
        <table class="tabla">
            <thead><tr>
                <th>Paciente</th><th>Servicio</th><th>Doctor</th>
                <th>Fecha</th><th>Hora</th><th>Estado</th><th>Pago</th><th>Acciones</th>
            </tr></thead>
            <tbody>
                ${sorted.map(c => `
                    <tr>
                        <td><strong>${esc(c.paciente?.nombre)}</strong></td>
                        <td>${esc(c.servicio?.nombre)}</td>
                        <td>${esc(c.doctore?.nombre) || '—'}</td>
                        <td>${esc(c.fecha)}</td>
                        <td>${esc(c.hora?.slice(0,5))}</td>
                        <td><span class="badge ${badgeEstado(c.estado)}">${esc(c.estado)}</span></td>
                        <td>$${Number(c.pago?.monto || 0).toLocaleString()}</td>
                        <td style="display:flex;gap:6px;flex-wrap:wrap;">
                            <button class="btn-tabla" onclick="abrirModalEstado(${c.id})">Estado</button>
                            ${c.estado === 'cancelada'
                                ? `<button onclick="eliminarCita(${c.id})"
                                    style="display:inline-flex;align-items:center;gap:5px;background:#fff;color:#dc2626;
                                           border:1.5px solid #fca5a5;border-radius:7px;padding:5px 11px;
                                           font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;"
                                    onmouseover="this.style.background='#fef2f2';this.style.borderColor='#f87171';"
                                    onmouseout="this.style.background='#fff';this.style.borderColor='#fca5a5';">
                                    <i class="fa-solid fa-trash-can" style="font-size:11px;"></i> Eliminar
                                  </button>`
                                : ''}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

let citaEliminarId = null;

function eliminarCita(id) {
    citaEliminarId = id;
    const btn = document.getElementById('btn-confirmar-eliminar-cita');
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Eliminar';
    document.getElementById('modal-eliminar-cita').style.display = 'flex';
}

async function confirmarEliminarCita() {
    if (!citaEliminarId) return;
    const btn = document.getElementById('btn-confirmar-eliminar-cita');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Eliminando...';
    try {
        const res = await fetch(`${API}/citas/${citaEliminarId}/eliminar`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        const d = await res.json();
        if (!res.ok) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Eliminar';
            alert(d.error || 'No se pudo eliminar la cita.');
            return;
        }
        cerrarModal('modal-eliminar-cita');
        cargarCitas();
    } catch (e) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Eliminar';
        alert('Error al conectar con el servidor.');
    }
}

function abrirModalEstado(id) {
    citaSeleccionadaId = id;
    document.getElementById('modal-estado').style.display = 'flex';
}

async function cambiarEstado(estado) {
    try {
        const res = await fetch(`${API}/citas/${citaSeleccionadaId}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ estado })
        });
        if (!res.ok) { alert('Error al cambiar estado.'); return; }
        cerrarModal('modal-estado');
        await cargarCitas();
        // Si se canceló, cambiar automáticamente al tab de canceladas
        if (estado === 'cancelada') cambiarTabCitas('canceladas');
    } catch (e) {
        alert('Error al cambiar estado.');
    }
}

async function cargarPacientes() {
    try {
        const res = await fetch(`${API}/pacientes`, { headers: { Authorization: `Bearer ${token}` } });
        todosPacientes = await res.json();

        // Rellenar fecha_nac desde CURP para pacientes que no la tengan
        const sinFecha = todosPacientes.filter(p => !p.fecha_nac && p.curp);
        await Promise.all(sinFecha.map(async p => {
            const fecha = derivarFechaDeCurp(p.curp);
            if (!fecha) return;
            try {
                await fetch(`${API}/pacientes/${p.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ fecha_nac: fecha })
                });
                p.fecha_nac = fecha; // actualizar copia local
            } catch (_) { /* omitir si falla */ }
        }));

        renderPacientes(todosPacientes);
    } catch (e) {
        document.getElementById('tabla-pacientes').innerHTML = '<p style="color:red;">Error al cargar pacientes.</p>';
    }
}

function calcularEdad(fechaNac) {
    if (!fechaNac) return null;
    const hoy = new Date();
    const nac = new Date(fechaNac + 'T12:00:00');
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
}

function formatFechaNac(fechaNac) {
    if (!fechaNac) return '—';
    const [y, m, d] = fechaNac.split('-');
    return `${d}/${m}/${y}`;
}

function derivarFechaDeCurp(curp) {
    if (!curp || curp.length < 10) return null;
    const yy = parseInt(curp.slice(4, 6));
    const mm = curp.slice(6, 8);
    const dd = curp.slice(8, 10);
    if (isNaN(yy) || !/^\d{2}$/.test(mm) || !/^\d{2}$/.test(dd)) return null;
    const yyActual = new Date().getFullYear() % 100;
    const year = yy <= yyActual ? 2000 + yy : 1900 + yy;
    const fecha = `${year}-${mm}-${dd}`;
    const d = new Date(fecha + 'T12:00:00');
    if (isNaN(d.getTime()) || d > new Date()) return null;
    return fecha;
}

function autoFechaDeCurp() {
    const curp  = document.getElementById('p-curp').value.trim().toUpperCase();
    const lbl   = document.getElementById('lbl-curp-auto');
    const campo = document.getElementById('p-fecha-nac');
    const fecha = derivarFechaDeCurp(curp);
    if (fecha) {
        campo.value = fecha;
        lbl.style.display = 'inline';
    } else {
        lbl.style.display = 'none';
    }
}

function renderPacientes(pacientes) {
    const contenedor = document.getElementById('tabla-pacientes');
    if (!pacientes.length) {
        contenedor.innerHTML = `
            <div style="text-align:center;padding:48px 20px;color:#94a3b8;">
                <i class="fa-solid fa-users" style="font-size:36px;margin-bottom:12px;display:block;"></i>
                <p style="font-size:15px;margin:0;">No hay pacientes registrados.</p>
            </div>`;
        return;
    }
    contenedor.innerHTML = `
        <table class="tabla">
            <thead>
                <tr>
                    <th>Paciente</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th>CURP</th>
                    <th>Fecha nac.</th>
                    <th>Edad</th>
                </tr>
            </thead>
            <tbody>
                ${pacientes.map(p => {
                    const edad = calcularEdad(p.fecha_nac);
                    return `
                    <tr>
                        <td>
                            <div style="display:flex;align-items:center;gap:10px;">
                                <div style="width:32px;height:32px;border-radius:50%;background:#eff6ff;display:flex;align-items:center;justify-content:center;color:#2563eb;flex-shrink:0;">
                                    <i class="fa-solid fa-circle-user" style="font-size:16px;"></i>
                                </div>
                                <span style="font-weight:600;color:#0f172a;">${esc(p.nombre)}</span>
                            </div>
                        </td>
                        <td style="color:#475569;">${esc(p.email)}</td>
                        <td>${esc(p.telefono) || '—'}</td>
                        <td>
                            <span style="font-family:monospace;font-size:12px;background:#f1f5f9;padding:2px 7px;border-radius:4px;letter-spacing:.04em;">
                                ${esc(p.curp)}
                            </span>
                        </td>
                        <td>${formatFechaNac(p.fecha_nac)}</td>
                        <td>
                            ${edad !== null
                                ? `<span style="background:#dcfce7;color:#16a34a;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;">${edad} años</span>`
                                : '<span style="color:#94a3b8;">—</span>'}
                        </td>
                    </tr>`;
                }).join('')}
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
    ['p-nombre','p-curp','p-email','p-telefono','p-direccion'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('p-fecha-nac').value = '';
    document.getElementById('lbl-curp-auto').style.display = 'none';
    document.getElementById('error-paciente').style.display = 'none';
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

let todosPagos = [];
let tabPagos   = 'pendiente';
let pendienteAccionPago = null;

function abrirConfirmPago({ iconClass, iconColor, bgColor, borderColor, btnColor, titulo, desc, accion }) {
    pendienteAccionPago = accion;
    document.getElementById('cap-icono').innerHTML = `
        <div style="width:64px;height:64px;border-radius:50%;background:${bgColor};border:2px solid ${borderColor};
                    display:flex;align-items:center;justify-content:center;margin:auto;">
            <i class="fa-solid ${iconClass}" style="font-size:24px;color:${iconColor};"></i>
        </div>`;
    document.getElementById('cap-titulo').textContent = titulo;
    document.getElementById('cap-desc').innerHTML = desc;
    const btn = document.getElementById('cap-btn');
    btn.style.background = btnColor;
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid ${iconClass}"></i> Confirmar`;
    document.getElementById('modal-confirmar-accion-pago').style.display = 'flex';
}

async function ejecutarAccionPago() {
    if (!pendienteAccionPago) return;
    const btn = document.getElementById('cap-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';
    try {
        await pendienteAccionPago();
        cerrarModal('modal-confirmar-accion-pago');
    } catch (e) {
        alert('Error al procesar la acción.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Confirmar';
    }
}

async function cargarPagos() {
    try {
        const res = await fetch(`${API}/pagos`, { headers: { Authorization: `Bearer ${token}` } });
        todosPagos = await res.json();
        renderTabsPagos();
        renderPagosPorTab();
    } catch (e) {
        document.getElementById('tabla-pagos').innerHTML = '<p style="color:red;">Error al cargar pagos.</p>';
    }
}

function renderTabsPagos() {
    const nPendiente = todosPagos.filter(p => p.estado !== 'pagado').length;
    const nPagado    = todosPagos.filter(p => p.estado === 'pagado').length;
    const tabs = [
        { key: 'pendiente', label: 'Pendientes', count: nPendiente, icon: 'fa-clock' },
        { key: 'pagado',    label: 'Pagados',    count: nPagado,    icon: 'fa-circle-check' }
    ];
    document.getElementById('tabs-pagos').innerHTML = tabs.map(t => {
        const activo = tabPagos === t.key;
        return `<button onclick="cambiarTabPagos('${t.key}')"
            style="display:flex;align-items:center;gap:7px;padding:10px 18px;font-size:13px;font-weight:600;
                   border:none;background:none;cursor:pointer;white-space:nowrap;
                   border-bottom:${activo ? '3px solid #2563eb' : '3px solid transparent'};
                   color:${activo ? '#2563eb' : '#6b7280'};margin-bottom:-2px;transition:color .15s;">
            <i class="fa-solid ${t.icon}"></i>${t.label}
            <span style="font-size:11px;font-weight:700;padding:1px 8px;border-radius:20px;
                         background:${activo ? '#eff6ff' : '#f3f4f6'};
                         color:${activo ? '#2563eb' : '#94a3b8'};">${t.count}</span>
        </button>`;
    }).join('');
}

function cambiarTabPagos(tab) {
    tabPagos = tab;
    renderTabsPagos();
    renderPagosPorTab();
}

function filtrarPagos() {
    renderPagosPorTab();
}

function renderPagosPorTab() {
    const q = (document.getElementById('buscar-pago')?.value || '').toLowerCase();
    let lista = todosPagos.filter(p => tabPagos === 'pagado' ? p.estado === 'pagado' : p.estado !== 'pagado');
    if (q) lista = lista.filter(p =>
        p.cita?.paciente?.nombre?.toLowerCase().includes(q) ||
        p.cita?.servicio?.nombre?.toLowerCase().includes(q)
    );
    renderTablaPagos(lista);
}

function renderTablaPagos(pagos) {
    const contenedor = document.getElementById('tabla-pagos');
    if (!pagos.length) {
        contenedor.innerHTML = `
            <div style="text-align:center;padding:40px 20px;color:#94a3b8;">
                <i class="fa-solid fa-money-bill-wave" style="font-size:32px;margin-bottom:12px;display:block;"></i>
                <p style="font-size:14px;margin:0;">${tabPagos === 'pagado' ? 'No hay pagos completados.' : 'No hay pagos pendientes.'}</p>
            </div>`;
        return;
    }

    const btnEstilo = (color, borderColor, hoverBg) =>
        `display:inline-flex;align-items:center;gap:5px;background:#fff;color:${color};
         border:1.5px solid ${borderColor};border-radius:7px;padding:5px 11px;
         font-size:12px;font-weight:600;cursor:pointer;transition:background .15s;`;

    contenedor.innerHTML = `
        <table class="tabla">
            <thead><tr>
                <th>Paciente</th><th>Servicio</th><th>Monto</th>
                <th>Descuento</th><th>Método</th><th>Estado</th><th>Fecha</th><th>Acciones</th>
            </tr></thead>
            <tbody>
                ${pagos.map(p => `
                    <tr>
                        <td><strong>${esc(p.cita?.paciente?.nombre)}</strong></td>
                        <td>${esc(p.cita?.servicio?.nombre)}</td>
                        <td style="font-weight:700;color:#0f172a;">$${Number(p.monto).toLocaleString('es-MX')} MXN</td>
                        <td>${p.descuento_porcentaje > 0
                            ? `<span style="background:#eff6ff;color:#2563eb;font-size:12px;font-weight:700;padding:2px 8px;border-radius:4px;">${esc(p.descuento_porcentaje)}%</span>
                               <span style="font-size:12px;color:#64748b;margin-left:4px;">${esc(p.descuento_concepto)}</span>`
                            : '<span style="color:#94a3b8;font-size:13px;">—</span>'}</td>
                        <td>${esc(p.metodo) || '—'}</td>
                        <td><span class="badge ${p.estado === 'pagado' ? 'confirmada' : 'pendiente'}">${esc(p.estado)}</span></td>
                        <td style="color:#64748b;font-size:13px;">${esc(p.creado_en?.slice(0,10)) || '—'}</td>
                        <td style="display:flex;gap:6px;flex-wrap:wrap;">
                            ${p.estado !== 'pagado' ? `
                            <button onclick="abrirDescuento(${p.id})"
                                style="${btnEstilo('#2563eb','#bfdbfe','#eff6ff')}"
                                onmouseover="this.style.background='#eff6ff'"
                                onmouseout="this.style.background='#fff'">
                                <i class="fa-solid fa-percent" style="font-size:11px;"></i> Descuento
                            </button>
                            <button onclick="imprimirRecibo(${p.id})"
                                style="${btnEstilo('#475569','#cbd5e1','#f1f5f9')}"
                                onmouseover="this.style.background='#f1f5f9'"
                                onmouseout="this.style.background='#fff'">
                                <i class="fa-solid fa-file-invoice" style="font-size:11px;"></i> Recibo
                            </button>
                            <button onclick="solicitarMarcarPagado(${p.id})"
                                style="${btnEstilo('#16a34a','#bbf7d0','#dcfce7')}"
                                onmouseover="this.style.background='#dcfce7'"
                                onmouseout="this.style.background='#fff'">
                                <i class="fa-solid fa-circle-check" style="font-size:11px;"></i> Marcar pagado
                            </button>` : `
                            <button onclick="imprimirRecibo(${p.id})"
                                style="${btnEstilo('#16a34a','#bbf7d0','#dcfce7')}"
                                onmouseover="this.style.background='#dcfce7'"
                                onmouseout="this.style.background='#fff'">
                                <i class="fa-solid fa-file-circle-check" style="font-size:11px;"></i> Comprobante
                            </button>`}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function imprimirRecibo(pagoId) {
    const p = todosPagos.find(x => x.id === pagoId);
    if (!p) return;

    const pac      = p.cita?.paciente   || {};
    const srv      = p.cita?.servicio   || {};
    const doc      = p.cita?.doctore    || {};
    const cita     = p.cita             || {};
    const esPagado = p.estado === 'pagado';

    const montoBase  = Number(p.monto || 0);
    const descPct    = Number(p.descuento_porcentaje || 0);
    const descValor  = montoBase * descPct / 100;
    const montoFinal = montoBase - descValor;
    const fmt        = n => '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2 }) + ' MXN';

    const fechaEmision = new Date().toLocaleDateString('es-MX', { year:'numeric', month:'long', day:'numeric' });
    const fechaCita    = cita.fecha
        ? new Date(cita.fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
        : '—';

    const tipo        = esPagado ? 'COMPROBANTE DE PAGO' : 'RECIBO';
    const accentColor = esPagado ? '#16a34a' : '#2563eb';
    const accentLight = esPagado ? '#dcfce7'  : '#eff6ff';
    const accentBorder= esPagado ? '#bbf7d0'  : '#bfdbfe';
    const stampColor  = esPagado ? '#16a34a'  : '#d97706';
    const stampBg     = esPagado ? '#dcfce7'  : '#fef3c7';
    const stampText   = esPagado ? '✓  PAGADO' : '⏳  PENDIENTE';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${tipo} — Clínica Dental</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:Arial,sans-serif;color:#111;font-size:13px;padding:36px 44px;max-width:700px;margin:auto;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:3px solid ${accentColor};margin-bottom:24px;}
  .clinic-name{font-size:22px;font-weight:800;color:${accentColor};}
  .clinic-sub{font-size:11px;color:#6b7280;margin-top:4px;}
  .doc-type{text-align:right;}
  .doc-type h2{font-size:16px;font-weight:800;color:${accentColor};letter-spacing:.04em;}
  .doc-type p{font-size:11px;color:#6b7280;margin-top:4px;}
  .stamp{display:inline-block;background:${stampBg};color:${stampColor};border:1.5px solid ${accentBorder};
         font-size:12px;font-weight:800;padding:4px 14px;border-radius:20px;letter-spacing:.06em;margin-top:6px;}
  .secciones{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;}
  .seccion{background:#f8fafc;border-radius:10px;padding:14px 16px;border:1px solid #e2e8f0;}
  .seccion h3{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin-bottom:10px;}
  .fila{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;gap:8px;}
  .fila .lbl{color:#64748b;font-size:12px;flex-shrink:0;}
  .fila .val{font-weight:600;color:#0f172a;font-size:13px;text-align:right;word-break:break-word;}
  .total-box{background:${accentLight};border:1.5px solid ${accentBorder};border-radius:12px;padding:18px 22px;margin-top:4px;}
  .total-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
  .total-row .lbl{color:#475569;font-size:13px;}
  .total-row .val{font-weight:600;color:#0f172a;}
  .total-final{font-size:26px;font-weight:800;color:${accentColor};}
  .divider{border:none;border-top:1px solid #e2e8f0;margin:6px 0;}
  .footer{margin-top:28px;padding-top:14px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;line-height:1.8;}
  .print-btn{display:block;margin:24px auto 0;background:${accentColor};color:#fff;border:none;border-radius:8px;
             padding:10px 28px;font-size:14px;font-weight:700;cursor:pointer;}
  @media print{.print-btn{display:none!important;} body{padding:16px 20px;}}
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="clinic-name">Clínica Dental</div>
    <div class="clinic-sub">citas@dentalelite.com &nbsp;·&nbsp; +52 (55) 1234-5678</div>
  </div>
  <div class="doc-type">
    <h2>${tipo}</h2>
    <p>No. ${String(p.id).padStart(6,'0')}</p>
    <p>Fecha de emisión: ${fechaEmision}</p>
    <div class="stamp">${stampText}</div>
  </div>
</div>

<div class="secciones">
  <div class="seccion">
    <h3>Paciente</h3>
    <div class="fila"><span class="lbl">Nombre</span><span class="val">${esc(pac.nombre) || '—'}</span></div>
    <div class="fila"><span class="lbl">Email</span><span class="val">${esc(pac.email) || '—'}</span></div>
    <div class="fila"><span class="lbl">Teléfono</span><span class="val">${esc(pac.telefono) || '—'}</span></div>
    <div class="fila"><span class="lbl">CURP</span><span class="val" style="font-family:monospace;font-size:11px;">${esc(pac.curp) || '—'}</span></div>
  </div>
  <div class="seccion">
    <h3>Cita</h3>
    <div class="fila"><span class="lbl">Servicio</span><span class="val">${esc(srv.nombre) || '—'}</span></div>
    <div class="fila"><span class="lbl">Doctor</span><span class="val">${esc(doc.nombre) || '—'}</span></div>
    <div class="fila"><span class="lbl">Fecha</span><span class="val">${fechaCita}</span></div>
    <div class="fila"><span class="lbl">Hora</span><span class="val">${esc(cita.hora?.slice(0,5)) || '—'}</span></div>
  </div>
</div>

<div class="total-box">
  <div class="total-row"><span class="lbl">Método de pago</span><span class="val">${esc(p.metodo) || '—'}</span></div>
  <hr class="divider">
  <div class="total-row"><span class="lbl">Monto del servicio</span><span class="val">${fmt(montoBase)}</span></div>
  ${descPct > 0 ? `
  <div class="total-row"><span class="lbl">Descuento (${descPct}%${p.descuento_concepto ? ' — ' + esc(p.descuento_concepto) : ''})</span>
    <span class="val" style="color:#16a34a;">− ${fmt(descValor)}</span></div>` : ''}
  <hr class="divider" style="border-color:${accentBorder};margin:10px 0;">
  <div class="total-row">
    <span style="font-size:15px;font-weight:700;color:#0f172a;">Total</span>
    <span class="total-final">${fmt(montoFinal)}</span>
  </div>
  ${esPagado ? `<p style="font-size:11px;color:#16a34a;margin-top:10px;font-weight:600;">✓ Pago confirmado el ${esc(p.creado_en?.slice(0,10)) || fechaEmision}</p>` : ''}
</div>

<div class="footer">
  <p>Este documento es un ${esPagado ? 'comprobante oficial' : 'recibo provisional'} emitido por Clínica Dental.</p>
  <p>Clínica Dental &nbsp;·&nbsp; citas@dentalelite.com &nbsp;·&nbsp; +52 (55) 1234-5678</p>
</div>

<button class="print-btn" onclick="window.print()">
  <span style="margin-right:6px;">🖨️</span> Imprimir / Guardar como PDF
</button>

<script>window.addEventListener('load', () => window.print());<\/script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=780,height=900');
    if (!win) { alert('Activa las ventanas emergentes para imprimir el recibo.'); return; }
    win.document.write(html);
    win.document.close();
}

function cerrarModal(id) {
    document.getElementById(id).style.display = 'none';
}

// ---------- DESCUENTOS Y PAGOS ----------
let pagoDescuentoId = null;

function abrirDescuento(pagoId) {
    pagoDescuentoId = pagoId;
    document.getElementById('desc-porcentaje').value = 0;
    document.getElementById('desc-concepto').value = '';
    document.getElementById('modal-descuento').style.display = 'flex';
}

function preConfirmarDescuento() {
    const pct      = parseInt(document.getElementById('desc-porcentaje').value) || 0;
    const concepto = document.getElementById('desc-concepto').value.trim();
    cerrarModal('modal-descuento');
    abrirConfirmPago({
        iconClass:   'fa-percent',
        iconColor:   '#2563eb',
        bgColor:     '#eff6ff',
        borderColor: '#bfdbfe',
        btnColor:    '#2563eb',
        titulo: 'Confirmar descuento',
        desc:   `Se aplicará un descuento del <strong>${pct}%</strong>${concepto ? ` con concepto:<br><em>"${esc(concepto)}"</em>` : ''}.`,
        accion: async () => {
            const res = await fetch(`${API}/pagos/${pagoDescuentoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ descuento_porcentaje: pct, descuento_concepto: concepto })
            });
            if (!res.ok) throw new Error('Error al aplicar descuento');
            cargarPagos();
        }
    });
}

function solicitarMarcarPagado(pagoId) {
    const p = todosPagos.find(x => x.id === pagoId);
    if (!p) return;
    const paciente = esc(p.cita?.paciente?.nombre || 'el paciente');
    const monto    = '$' + Number(p.monto).toLocaleString('es-MX') + ' MXN';
    abrirConfirmPago({
        iconClass:   'fa-circle-check',
        iconColor:   '#16a34a',
        bgColor:     '#dcfce7',
        borderColor: '#bbf7d0',
        btnColor:    '#16a34a',
        titulo: 'Confirmar pago recibido',
        desc:   `¿Confirmas que el pago de <strong>${monto}</strong> de <strong>${paciente}</strong> ha sido recibido?`,
        accion: async () => {
            const res = await fetch(`${API}/pagos/${pagoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ estado: 'pagado' })
            });
            if (!res.ok) throw new Error('Error al marcar como pagado');
            cargarPagos();
        }
    });
}

// ---------- ESTADÍSTICAS ----------

async function cargarEstadisticas() {
    const contenedor = document.getElementById('contenido-estadisticas');
    contenedor.innerHTML = `<div style="display:flex;align-items:center;gap:10px;color:#94a3b8;font-size:14px;">
        <div style="width:16px;height:16px;border:2px solid #e5e7eb;border-top-color:#2563eb;border-radius:50%;animation:spin .7s linear infinite;"></div>
        Cargando estadísticas...
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg);}}</style>`;
    try {
        const res = await fetch(`${API}/estadisticas`, { headers: { Authorization: `Bearer ${token}` } });
        const d = await res.json();
        const fmt = n => '$' + Number(n || 0).toLocaleString('es-MX') + ' MXN';

        const tarjetaCita = (label, val, icon, color, borde) => `
            <div class="stat-card" style="border-left:4px solid ${borde};">
                <div class="stat-card-icon" style="color:${color};"><i class="fa-solid ${icon}"></i></div>
                <p class="stat-card-label">${label}</p>
                <p class="stat-card-value" style="color:${color};">${val}</p>
            </div>`;

        const tarjetaIngreso = (label, val, icon, color, borde) => `
            <div class="stat-card" style="border-left:4px solid ${borde};">
                <div class="stat-card-icon" style="color:${color};"><i class="fa-solid ${icon}"></i></div>
                <p class="stat-card-label">${label}</p>
                <p class="stat-card-value" style="font-size:20px;color:${color};">${val}</p>
            </div>`;

        const estadoBadge = e => {
            if (e === 'confirmada') return 'confirmada';
            if (e === 'cancelada')  return 'cancelada';
            return 'pendiente';
        };

        contenedor.innerHTML = `
            <p class="stats-section-label"><i class="fa-solid fa-calendar-check" style="margin-right:6px;"></i>Citas</p>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:24px;">
                ${tarjetaCita('Citas hoy',           d.citas.hoy,    'fa-calendar-day',  '#2563eb', '#2563eb')}
                ${tarjetaCita('Citas esta semana',   d.citas.semana, 'fa-calendar-week', '#7c3aed', '#7c3aed')}
                ${tarjetaCita('Citas este mes',      d.citas.mes,    'fa-calendar',      '#0891b2', '#0891b2')}
            </div>

            <p class="stats-section-label"><i class="fa-solid fa-sack-dollar" style="margin-right:6px;"></i>Ingresos</p>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:24px;">
                ${tarjetaIngreso('Ingresos hoy',          fmt(d.ingresos.hoy),    'fa-coins',              '#16a34a', '#16a34a')}
                ${tarjetaIngreso('Ingresos esta semana',  fmt(d.ingresos.semana), 'fa-money-bill-trend-up','#059669', '#059669')}
                ${tarjetaIngreso('Ingresos este mes',     fmt(d.ingresos.mes),    'fa-chart-line',         '#0d9488', '#0d9488')}
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:0;">
                <div style="background:#fff;border-radius:14px;padding:22px 24px;box-shadow:0 1px 6px rgba(0,0,0,.07);">
                    <p style="font-size:14px;font-weight:700;color:#0f172a;margin:0 0 16px;">
                        <i class="fa-solid fa-chart-pie" style="margin-right:8px;color:#7c3aed;"></i>Citas por estado
                    </p>
                    ${d.porEstado.map(e => `
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                            <span class="badge ${estadoBadge(e.estado)}">${e.estado}</span>
                            <span style="font-weight:700;font-size:15px;color:#0f172a;">${e.total}</span>
                        </div>
                    `).join('')}
                </div>
                <div style="background:#fff;border-radius:14px;padding:22px 24px;box-shadow:0 1px 6px rgba(0,0,0,.07);">
                    <p style="font-size:14px;font-weight:700;color:#0f172a;margin:0 0 16px;">
                        <i class="fa-solid fa-ranking-star" style="margin-right:8px;color:#d97706;"></i>Servicios más solicitados
                    </p>
                    ${d.serviciosTop.map((s, i) => `
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span style="width:20px;height:20px;border-radius:50%;background:#eff6ff;color:#2563eb;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${i + 1}</span>
                                <span style="font-size:13px;color:#374151;">${esc(s.nombre)}</span>
                            </div>
                            <span style="font-weight:700;color:#2563eb;font-size:13px;">${s.total} citas</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="recordatorio-card">
                <div>
                    <p style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 6px;">
                        <i class="fa-solid fa-bell" style="color:#2563eb;margin-right:8px;"></i>Recordatorios de cita
                    </p>
                    <p style="font-size:13px;color:#64748b;margin:0;">
                        Envía un recordatorio por correo a todos los pacientes con citas para mañana.
                    </p>
                    <div id="recordatorio-status" style="display:none;margin-top:12px;"></div>
                </div>
                <button id="btn-recordatorio"
                    onclick="enviarRecordatorioManual()"
                    style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;border:none;border-radius:10px;padding:11px 22px;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0;">
                    <i class="fa-solid fa-paper-plane" style="margin-right:7px;"></i>Enviar recordatorios
                </button>
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
                            <td>${esc(m.nombre)}</td>
                            <td>${esc(m.email)}</td>
                            <td>${esc(m.telefono)}</td>
                            <td>${esc(m.asunto)}</td>
                            <td style="max-width:220px; white-space:pre-wrap; word-break:break-word;">${esc(m.mensaje)}</td>
                            <td>${esc(m.creado_en?.slice(0, 10))}</td>
                            <td style="display:flex; flex-direction:column; gap:6px;">
                                <button class="btn-tabla" onclick="abrirRespuesta(${m.id}, '${esc(m.nombre).replace(/'/g, '&#39;')}', '${esc(m.email)}')">Responder</button>
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
    const btn    = document.getElementById('btn-recordatorio');
    const status = document.getElementById('recordatorio-status');
    if (!btn) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right:7px;"></i>Enviando...';
    if (status) status.style.display = 'none';

    try {
        const res = await fetch(`${API}/recordatorios/enviar`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (status) {
            status.style.display = 'block';
            status.innerHTML = `
                <div style="background:#dcfce7;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;font-size:13px;color:#16a34a;">
                    <i class="fa-solid fa-circle-check" style="margin-right:6px;"></i>${esc(data.mensaje)}
                </div>`;
        }
    } catch (e) {
        if (status) {
            status.style.display = 'block';
            status.innerHTML = `
                <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 14px;font-size:13px;color:#dc2626;">
                    <i class="fa-solid fa-triangle-exclamation" style="margin-right:6px;"></i>Error al conectar con el servidor.
                </div>`;
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane" style="margin-right:7px;"></i>Enviar recordatorios';
    }
}

async function cargarResenas() {
    const contenedor = document.getElementById('contenido-resenas');
    try {
        const res = await fetch(`${API}/resenas`, { headers: { Authorization: `Bearer ${token}` } });
        const resenas = await res.json();

        if (!resenas.length) {
            contenedor.innerHTML = '<p style="color:#888;">No hay reseñas todavía.</p>';
            return;
        }

        const promedio = (resenas.reduce((s, r) => s + r.estrellas, 0) / resenas.length).toFixed(1);
        const estrellasPromedio = '★'.repeat(Math.round(promedio)) + '☆'.repeat(5 - Math.round(promedio));

        contenedor.innerHTML = `
            <div style="background:#eff6ff; border-radius:12px; padding:20px 24px; margin-bottom:24px; display:flex; align-items:center; gap:20px;">
                <div>
                    <p style="font-size:36px; font-weight:700; color:#2563eb; margin:0;">${promedio}</p>
                    <p style="font-size:18px; color:#f59e0b; margin:0;">${estrellasPromedio}</p>
                </div>
                <div>
                    <p style="font-size:14px; color:#374151; font-weight:600; margin:0;">${resenas.length} reseña(s) de pacientes</p>
                    <p style="font-size:13px; color:#6b7280; margin:4px 0 0;">Promedio general de calificación</p>
                </div>
            </div>
            ${resenas.map(r => `
                <div class="resena-card">
                    <div class="resena-card-header">
                        <span class="resena-card-nombre">${esc(r.paciente?.nombre || 'Paciente')}</span>
                        <span class="estrellas-display">${'★'.repeat(r.estrellas)}${'☆'.repeat(5 - r.estrellas)}</span>
                    </div>
                    <p class="resena-card-servicio">${esc(r.cita?.servicio?.nombre || '')} &nbsp;·&nbsp; ${esc(r.creado_en?.slice(0, 10))}</p>
                    ${r.comentario ? `<p class="resena-card-comentario">"${esc(r.comentario)}"</p>` : ''}
                </div>
            `).join('')}
        `;
    } catch (e) {
        contenedor.innerHTML = '<p style="color:red;">Error al cargar reseñas.</p>';
    }
}

cargarCitas();
