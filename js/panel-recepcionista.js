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
 
    document.getElementById('seccion-citas').style.display = 'none';
    document.getElementById('seccion-pacientes').style.display = 'none';
    document.getElementById('seccion-pagos').style.display = 'none';
 
    const titulos = { citas: 'Citas', pacientes: 'Pacientes', pagos: 'Pagos' };
    document.getElementById('titulo-seccion').textContent = titulos[seccion];
    document.getElementById(`seccion-${seccion}`).style.display = 'block';
 
    if (seccion === 'citas') cargarCitas();
    if (seccion === 'pacientes') cargarPacientes();
    if (seccion === 'pagos') cargarPagos();
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
                        <th>Método</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                    </tr>
                </thead>
                <tbody>
                    ${pagos.map(p => `
                        <tr>
                            <td>${p.cita?.paciente?.nombre || '-'}</td>
                            <td>${p.cita?.servicio?.nombre || '-'}</td>
                            <td>$${Number(p.monto).toLocaleString()} MXN</td>
                            <td>${p.metodo || '-'}</td>
                            <td><span class="badge ${p.estado === 'pagado' ? 'confirmada' : 'pendiente'}">${p.estado}</span></td>
                            <td>${p.creado_en?.slice(0,10) || '-'}</td>
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
 
cargarCitas();