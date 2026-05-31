const API = 'http://localhost:3000';
 
async function buscar() {
    const query = document.getElementById('input-buscar').value.trim();
    const resultado = document.getElementById('resultado');
 
    if (!query) {
        resultado.innerHTML = '<p style="color:red;">Ingresa tu email o CURP.</p>';
        return;
    }
 
    resultado.innerHTML = '<p>Buscando...</p>';
 
    try {
        const res = await fetch(`${API}/pacientes/buscar/${encodeURIComponent(query)}`);
 
        if (!res.ok) {
            resultado.innerHTML = '<p style="color:#888;">No se encontraron citas con ese dato.</p>';
            return;
        }
 
        const data = await res.json();
        const citas = data.citas;
 
        if (!citas.length) {
            resultado.innerHTML = '<p style="color:#888;">No tienes citas registradas.</p>';
            return;
        }
 
        resultado.innerHTML = `<p class="conteo-citas">${citas.length} cita(s) encontrada(s)</p>` +
            citas.map(c => `
                <div class="cita-card" id="cita-${c.id}">
                    <div class="cita-header">
                        <h3>${c.servicio?.nombre || 'Servicio'}</h3>
                        <span class="badge ${c.estado === 'confirmada' ? 'confirmada' : 'pendiente'}">${c.estado}</span>
                    </div>
                    <p class="cita-info">
                        ${c.fecha} &nbsp; ${c.hora?.slice(0, 5)} &nbsp;
                        ${c.doctore?.nombre || ''} &nbsp;
                        $${Number(c.servicio?.precio || 0).toLocaleString()} MXN
                    </p>
                    <div class="cita-acciones">
                        <button class="btn-reprogramar" onclick="reprogramar(${c.id})">Reprogramar</button>
                        <button class="btn-cancelar" onclick="cancelar(${c.id})">Cancelar</button>
                    </div>
                </div>
            `).join('');
    } catch (e) {
        resultado.innerHTML = '<p style="color:red;">Error al conectar con el servidor.</p>';
    }
}
 
async function cancelar(id) {
    if (!confirm('¿Seguro que quieres cancelar esta cita?')) return;
 
    try {
        const res = await fetch(`${API}/citas/${id}`, { method: 'DELETE' });
 
        if (!res.ok) {
            alert('No se pudo cancelar la cita.');
            return;
        }
 
        const card = document.getElementById(`cita-${id}`);
        if (card) card.remove();
    } catch (e) {
        alert('Error al conectar con el servidor.');
    }
}
 
function reprogramar(id) {
    alert('Para reprogramar comunícate al consultorio o usa la opción de contacto.');
}
 
document.getElementById('input-buscar').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') buscar();
});