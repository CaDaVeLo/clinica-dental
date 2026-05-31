// ─────────────────────────────────────────────
//  agenda-servicio.js  —  Paso 2: Elegir servicio
//
//  Responsabilidad:
//    - Consumir GET /servicios y renderizar las tarjetas
//    - Guardar el servicio elegido: store.set('servicio', {...})
//    - Navegar al siguiente paso: agenda-fecha.html
//
//  HTML necesario en agenda-servicio.html:
//    <div id="lista-servicios"></div>
//    <a class="btn-atras" href="agenda-paciente.html">Atrás</a>
//    <button class="btn-siguiente" disabled>Siguiente: Fecha y hora</button>
// ─────────────────────────────────────────────
import { API, store } from './api.js';

const contenedor    = document.getElementById('lista-servicios');
const btnSiguiente  = document.querySelector('.btn-siguiente');
let servicioElegido = null;

async function cargarServicios() {
    try {
        contenedor.innerHTML = '<p>Cargando servicios...</p>';
        const res      = await fetch(`${API}/servicios`);
        const servicios = await res.json();

        contenedor.innerHTML = '';

        servicios.forEach(s => {
            const card = document.createElement('div');
            card.className  = 'servicio-card';
            card.dataset.id = s.id;
            card.innerHTML  = `
                <span class="servicio-icono">${s.icono ?? '🦷'}</span>
                <div>
                    <h3>${s.nombre}</h3>
                    <p class="servicio-desc">${s.descripcion ?? ''}</p>
                    <p class="servicio-meta">${s.duracion_min} min &nbsp;·&nbsp; $${Number(s.precio).toLocaleString('es-MX')} MXN</p>
                </div>`;

            card.addEventListener('click', () => {
                // Quitar selección anterior
                document.querySelectorAll('.servicio-card').forEach(c => c.classList.remove('seleccionado'));
                card.classList.add('seleccionado');

                servicioElegido = { id: s.id, nombre: s.nombre, precio: s.precio };
                btnSiguiente.disabled = false;
            });

            contenedor.appendChild(card);
        });
    } catch (err) {
        contenedor.innerHTML = `<p class="error">No se pudieron cargar los servicios: ${err.message}</p>`;
    }
}

btnSiguiente.addEventListener('click', (e) => {
    e.preventDefault();
    if (!servicioElegido) { alert('Selecciona un servicio.'); return; }
    store.set('servicio', servicioElegido);
    window.location.href = 'agenda-fecha.html';
});

cargarServicios();