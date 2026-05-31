const API = 'http://localhost:3000';
let servicioSeleccionado = null;
 
async function cargarServicios() {
    try {
        const res = await fetch(`${API}/servicios`);
        const servicios = await res.json();
        const lista = document.getElementById('lista-tratamientos');
        lista.innerHTML = servicios.map(s => `
            <div class="tratamiento-item" onclick="seleccionar(${s.id}, this)" data-id="${s.id}" data-nombre="${s.nombre}" data-precio="${s.precio}">
                <div class="tratamiento-info">
                    <h4>${s.nombre}</h4>
                    <span>${s.duracion_min} min</span>
                </div>
                <div class="tratamiento-precio">$${Number(s.precio).toLocaleString()} <small>MXN</small></div>
            </div>
        `).join('');
    } catch (e) {
        document.getElementById('lista-tratamientos').innerHTML = '<p>Error al cargar servicios.</p>';
    }
}
 
function seleccionar(id, el) {
    document.querySelectorAll('.tratamiento-item').forEach(i => i.classList.remove('seleccionado'));
    el.classList.add('seleccionado');
    servicioSeleccionado = {
        id,
        nombre: el.dataset.nombre,
        precio: el.dataset.precio
    };
}
 
function siguiente() {
    if (!servicioSeleccionado) {
        alert('Selecciona un servicio para continuar.');
        return;
    }
    sessionStorage.setItem('servicio', JSON.stringify(servicioSeleccionado));
    window.location.href = 'agenda-fecha.html';
}
 
cargarServicios();
 