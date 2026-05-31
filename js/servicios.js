const API = 'http://localhost:3000';
let todosLosServicios = [];
 
async function cargarServicios() {
    try {
        const res = await fetch(`${API}/servicios`);
        todosLosServicios = await res.json();
        renderServicios(todosLosServicios);
    } catch (e) {
        document.getElementById('grid-servicios').innerHTML = '<p>Error al cargar servicios.</p>';
    }
}
 
function renderServicios(servicios) {
    const grid = document.getElementById('grid-servicios');
    if (!servicios.length) {
        grid.innerHTML = '<p>No hay servicios disponibles.</p>';
        return;
    }
    grid.innerHTML = servicios.map(s => `
        <div class="servicio-card">
            <h3>${s.nombre}</h3>
            <p>${s.descripcion || ''}</p>
            <hr>
            <div class="servicio-precio">
                <div class="precio">$${Number(s.precio).toLocaleString()} <span>MXN</span></div>
                <div class="duracion">${s.duracion_min} min</div>
            </div>
        </div>
    `).join('');
}
 
function filtrar(categoria, btn) {
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');
    if (categoria === 'todos') {
        renderServicios(todosLosServicios);
    } else {
        renderServicios(todosLosServicios.filter(s => s.categoria === categoria));
    }
}
 
cargarServicios();