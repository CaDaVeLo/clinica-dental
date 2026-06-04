const API = 'http://localhost:3000';
let fechaSeleccionada = null;
let horaSeleccionada = null;
let doctorSeleccionado = null;
let hoy = new Date();
let mesActual = hoy.getMonth();
let anioActual = hoy.getFullYear();

const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function renderCalendario() {
    document.getElementById('mes-anio').textContent = `${meses[mesActual]} ${anioActual}`;

    const primer_dia = new Date(anioActual, mesActual, 1).getDay();
    const offset = primer_dia === 0 ? 6 : primer_dia - 1;
    const dias_en_mes = new Date(anioActual, mesActual + 1, 0).getDate();
    const cal = document.getElementById('cal-dias');
    cal.innerHTML = '';

    for (let i = 0; i < offset; i++) {
        cal.innerHTML += '<span></span>';
    }

    for (let d = 1; d <= dias_en_mes; d++) {
        const fecha = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const fechaObj = new Date(anioActual, mesActual, d);
        const hoyMidnight = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        const esPasadoOHoy = fechaObj <= hoyMidnight; // requiere al menos 1 día de anticipación
        const esDomingo = fechaObj.getDay() === 0;
        const seleccionado = fecha === fechaSeleccionada ? 'seleccionado' : '';

        if (esPasadoOHoy) {
            cal.innerHTML += `<span title="${fechaObj.getTime() === hoyMidnight.getTime() ? 'Las citas requieren 24 h de anticipación' : ''}">${d}</span>`;
        } else if (esDomingo) {
            cal.innerHTML += `<span class="domingo" title="Cerrado los domingos">${d}</span>`;
        } else {
            cal.innerHTML += `<span class="disponible ${seleccionado}" onclick="seleccionarFecha('${fecha}', this)">${d}</span>`;
        }
    }
}

function cambiarMes(dir) {
    mesActual += dir;
    if (mesActual > 11) { mesActual = 0; anioActual++; }
    if (mesActual < 0) { mesActual = 11; anioActual--; }
    renderCalendario();
}

async function seleccionarFecha(fecha, el) {
    fechaSeleccionada = fecha;
    horaSeleccionada = null;
    doctorSeleccionado = null;
    renderCalendario();

    const servicio = JSON.parse(sessionStorage.getItem('servicio'));
    if (!servicio) {
        alert('No se encontró el servicio seleccionado. Regresa al paso anterior.');
        return;
    }

    const grid = document.getElementById('horarios-grid');
    grid.innerHTML = '<p style="font-size:13px;">Cargando horarios...</p>';

    try {
        const res = await fetch(`${API}/disponibilidad?fecha=${fecha}&servicio_id=${servicio.id}`);
        const slots = await res.json();

        if (!slots.length) {
            grid.innerHTML = '<p style="font-size:13px; color:#888;">Sin horarios disponibles este día.</p>';
            return;
        }

        grid.innerHTML = slots.map(s => `
            <div class="horario-btn ${!s.disponible ? 'ocupado' : ''}"
                ${s.disponible ? `onclick="seleccionarHora('${s.hora}', ${s.doctor_id}, this)"` : ''}>
                ${s.hora}
            </div>
        `).join('');
    } catch (e) {
        grid.innerHTML = '<p style="font-size:13px; color:red;">Error al cargar horarios.</p>';
    }
}

function seleccionarHora(hora, doctor_id, el) {
    document.querySelectorAll('.horario-btn').forEach(b => b.classList.remove('seleccionado'));
    el.classList.add('seleccionado');
    horaSeleccionada = hora;
    doctorSeleccionado = doctor_id;
}

function siguiente() {
    if (!fechaSeleccionada || !horaSeleccionada) {
        alert('Selecciona una fecha y un horario.');
        return;
    }
    sessionStorage.setItem('fecha', fechaSeleccionada);
    sessionStorage.setItem('hora', horaSeleccionada);
    sessionStorage.setItem('doctor_id', doctorSeleccionado);
    window.location.href = 'agenda-pago.html';
}

renderCalendario();
