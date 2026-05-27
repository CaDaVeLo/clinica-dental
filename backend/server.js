import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Op } from 'sequelize';
import { sequelize, Paciente, Servicio, Doctor, Horario, Cita, Pago } from './models/models.js';
 
dotenv.config();
 
const app = express();
app.use(cors());
app.use(express.json());
 
//  PACIENTES
 
app.get('/pacientes', async (req, res) => {
    try {
        const pacientes = await Paciente.findAll({ where: { activo: true } });
        res.json(pacientes);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
 
app.get('/pacientes/:id', async (req, res) => {
    try {
        const paciente = await Paciente.findByPk(req.params.id);
        if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });
        res.json(paciente);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
 
app.get('/pacientes/buscar/:query', async (req, res) => {
    try {
        const q = req.params.query;
        const paciente = await Paciente.findOne({
            where: { [Op.or]: [{ email: q }, { curp: q }] }
        });
        if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });
 
        const citas = await Cita.findAll({
            where: { paciente_id: paciente.id },
            include: [{ model: Servicio }, { model: Doctor }]
        });
 
        res.json({ paciente, citas });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
 
app.post('/pacientes', async (req, res) => {
    try {
        const paciente = await Paciente.create(req.body);
        res.status(201).json(paciente);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
 
app.put('/pacientes/:id', async (req, res) => {
    try {
        const paciente = await Paciente.findByPk(req.params.id);
        if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });
        await paciente.update(req.body);
        res.json(paciente);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
 
//  SERVICIOS 
 
app.get('/servicios', async (req, res) => {
    try {
        const servicios = await Servicio.findAll({ where: { activo: true } });
        res.json(servicios);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
 
app.get('/servicios/:id', async (req, res) => {
    try {
        const servicio = await Servicio.findByPk(req.params.id);
        if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });
        res.json(servicio);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
 
app.post('/servicios', async (req, res) => {
    try {
        const servicio = await Servicio.create(req.body);
        res.status(201).json(servicio);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
 
app.put('/servicios/:id', async (req, res) => {
    try {
        const servicio = await Servicio.findByPk(req.params.id);
        if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });
        await servicio.update(req.body);
        res.json(servicio);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
 
//  DOCTORES 
 
app.get('/doctores', async (req, res) => {
    try {
        const doctores = await Doctor.findAll({ where: { activo: true } });
        res.json(doctores);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
 
app.get('/doctores/:id/horarios', async (req, res) => {
    try {
        const horarios = await Horario.findAll({
            where: { doctor_id: req.params.id, activo: true }
        });
        res.json(horarios);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
 
app.post('/doctores', async (req, res) => {
    try {
        const doctor = await Doctor.create(req.body);
        res.status(201).json(doctor);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
 
// DISPONIBILIDAD 
 
app.get('/disponibilidad', async (req, res) => {
    try {
        const { fecha, servicio_id } = req.query;
        if (!fecha || !servicio_id) return res.status(400).json({ error: 'Faltan parámetros' });
 
        const fecha_obj = new Date(fecha);
        const dia_semana = fecha_obj.getDay();
 
        const servicio = await Servicio.findByPk(servicio_id);
        if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });
 
        const horarios = await Horario.findAll({
            where: { dia_semana, activo: true },
            include: [{ model: Doctor, where: { activo: true } }]
        });
 
        const citasDelDia = await Cita.findAll({
            where: { fecha, estado: ['pendiente', 'confirmada'] }
        });
 
        const horasOcupadas = citasDelDia.map(c => c.hora);
 
        const slots = [];
        horarios.forEach(h => {
            let actual = new Date(`1970-01-01T${h.hora_inicio}`);
            const fin = new Date(`1970-01-01T${h.hora_fin}`);
 
            while (actual < fin) {
                const hora_str = actual.toTimeString().slice(0, 5);
                slots.push({
                    hora: hora_str,
                    doctor_id: h.doctor_id,
                    doctor: h.doctore.nombre,
                    disponible: !horasOcupadas.includes(hora_str + ':00')
                });
                actual = new Date(actual.getTime() + servicio.duracion_min * 60000);
            }
        });
 
        res.json(slots);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
 
//  CITAS 
 
app.get('/citas', async (req, res) => {
    try {
        const citas = await Cita.findAll({
            include: [{ model: Paciente }, { model: Servicio }, { model: Doctor }]
        });
        res.json(citas);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
 
app.get('/citas/:id', async (req, res) => {
    try {
        const cita = await Cita.findByPk(req.params.id, {
            include: [{ model: Paciente }, { model: Servicio }, { model: Doctor }, { model: Pago }]
        });
        if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });
        res.json(cita);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
 
app.post('/citas', async (req, res) => {
    try {
        const { paciente_id, servicio_id, doctor_id, fecha, hora, metodo_pago, notas, paciente } = req.body;
 
        let id_paciente = paciente_id;
 
        if (!paciente_id && paciente) {
            const [p] = await Paciente.findOrCreate({
                where: { curp: paciente.curp },
                defaults: paciente
            });
            id_paciente = p.id;
        }
 
        const citaExistente = await Cita.findOne({
            where: { fecha, hora, doctor_id, estado: ['pendiente', 'confirmada'] }
        });
        if (citaExistente) return res.status(409).json({ error: 'Ese horario ya está ocupado' });
 
        const servicio = await Servicio.findByPk(servicio_id);
        if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });
 
        const cita = await Cita.create({
            paciente_id: id_paciente,
            servicio_id,
            doctor_id,
            fecha,
            hora,
            estado: 'pendiente',
            metodo_pago,
            notas
        });
 
        await Pago.create({
            cita_id: cita.id,
            monto: servicio.precio,
            metodo: metodo_pago,
            estado: 'pendiente'
        });
 
        const citaCompleta = await Cita.findByPk(cita.id, {
            include: [{ model: Paciente }, { model: Servicio }, { model: Doctor }, { model: Pago }]
        });
 
        res.status(201).json(citaCompleta);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
 
app.put('/citas/:id/estado', async (req, res) => {
    try {
        const { estado } = req.body;
        const estados = ['pendiente', 'confirmada', 'cancelada', 'completada'];
        if (!estados.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });
 
        const cita = await Cita.findByPk(req.params.id);
        if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });
 
        await cita.update({ estado });
        res.json(cita);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
 
app.put('/citas/:id/reprogramar', async (req, res) => {
    try {
        const { fecha, hora, doctor_id } = req.body;
        const cita = await Cita.findByPk(req.params.id);
        if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });
 
        const conflicto = await Cita.findOne({
            where: { fecha, hora, doctor_id, estado: ['pendiente', 'confirmada'] }
        });
        if (conflicto) return res.status(409).json({ error: 'Ese horario ya está ocupado' });
 
        await cita.update({ fecha, hora, doctor_id, estado: 'pendiente' });
        res.json(cita);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
 
app.delete('/citas/:id', async (req, res) => {
    try {
        const cita = await Cita.findByPk(req.params.id);
        if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });
        await cita.update({ estado: 'cancelada' });
        res.json({ mensaje: 'Cita cancelada' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
 
//  PAGOS 
 
app.get('/pagos/:cita_id', async (req, res) => {
    try {
        const pago = await Pago.findOne({ where: { cita_id: req.params.cita_id } });
        if (!pago) return res.status(404).json({ error: 'Pago no encontrado' });
        res.json(pago);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
 
app.put('/pagos/:id', async (req, res) => {
    try {
        const pago = await Pago.findByPk(req.params.id);
        if (!pago) return res.status(404).json({ error: 'Pago no encontrado' });
        await pago.update(req.body);
        res.json(pago);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
 
//  INICIAR 
 
const PORT = process.env.PORT || 3000;
 
sequelize.sync({ alter: true }).then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
});