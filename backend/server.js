import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import nodemailer from 'nodemailer';
import rateLimit from 'express-rate-limit';
import { sequelize, Paciente, Expediente, Servicio, Doctor, Horario, Cita, Pago, Usuario, Presupuesto, Mensaje, Resena } from './models/models.js';
 
dotenv.config();
 
const app = express();
app.use(cors());
app.use(express.json());
 
const SECRET = process.env.JWT_SECRET || 'clinica_secret_2024';

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
 
function verificarToken(req, res, next) {
    const auth = req.headers['authorization'];
    if (!auth) return res.status(401).json({ error: 'Sin token' });
    const token = auth.split(' ')[1];
    try {
        req.usuario = jwt.verify(token, SECRET);
        next();
    } catch (e) {
        res.status(401).json({ error: 'Token inválido' });
    }
}
 
function soloRol(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.usuario.rol)) {
            return res.status(403).json({ error: 'Sin permisos' });
        }
        next();
    };
}
 
// ---------- AUTH ----------
 
app.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        const usuario = await Usuario.findOne({ where: { email } });
        if (!usuario) return res.status(401).json({ error: 'Credenciales incorrectas' });
 
        const valido = await bcrypt.compare(password, usuario.password);
        if (!valido) return res.status(401).json({ error: 'Credenciales incorrectas' });
 
        const token = jwt.sign(
            { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol, doctor_id: usuario.doctor_id },
            SECRET,
            { expiresIn: '8h' }
        );
 
        res.json({ token, usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol, doctor_id: usuario.doctor_id } });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
 
app.post('/usuarios', verificarToken, soloRol('recepcionista'), async (req, res) => {
    try {
        const { nombre, email, password, rol, doctor_id } = req.body;
        const hash = await bcrypt.hash(password, 10);
        const usuario = await Usuario.create({ nombre, email, password: hash, rol, doctor_id });
        res.status(201).json({ id: usuario.id, nombre: usuario.nombre, rol: usuario.rol });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
 
// ---------- PACIENTES ----------
 
app.get('/pacientes', verificarToken, async (req, res) => {
    try {
        const pacientes = await Paciente.findAll({ where: { activo: true } });
        res.json(pacientes);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
 
app.get('/pacientes/:id', verificarToken, async (req, res) => {
    try {
        const paciente = await Paciente.findByPk(req.params.id, {
            include: [{ model: Expediente }]
        });
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
            include: [{ model: Servicio }, { model: Doctor }, { model: Resena }]
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
 
app.put('/pacientes/:id', verificarToken, async (req, res) => {
    try {
        const paciente = await Paciente.findByPk(req.params.id);
        if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });
        const { nombre, email, telefono, fecha_nac, direccion } = req.body;
        await paciente.update({ nombre, email, telefono, fecha_nac, direccion });
        res.json(paciente);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
 
// ---------- EXPEDIENTES ----------
 
app.get('/expedientes/:paciente_id', verificarToken, async (req, res) => {
    try {
        const expediente = await Expediente.findOne({
            where: { paciente_id: req.params.paciente_id },
            include: [{ model: Paciente }]
        });
        if (!expediente) return res.status(404).json({ error: 'Expediente no encontrado' });
        res.json(expediente);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
 
app.post('/expedientes', verificarToken, async (req, res) => {
    try {
        const existente = await Expediente.findOne({ where: { paciente_id: req.body.paciente_id } });
        if (existente) {
            await existente.update(req.body);
            return res.json(existente);
        }
        const expediente = await Expediente.create(req.body);
        res.status(201).json(expediente);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
 
// ---------- SERVICIOS ----------
 
app.get('/servicios', async (req, res) => {
    try {
        const servicios = await Servicio.findAll({ where: { activo: true } });
        res.json(servicios);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
 
app.post('/servicios', verificarToken, soloRol('recepcionista', 'admin'), async (req, res) => {
    try {
        const servicio = await Servicio.create(req.body);
        res.status(201).json(servicio);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
 
// ---------- DOCTORES ----------
 
app.get('/doctores', async (req, res) => {
    try {
        const doctores = await Doctor.findAll({ where: { activo: true } });
        res.json(doctores);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
 
app.get('/doctores/:id/horarios', verificarToken, async (req, res) => {
    try {
        const horarios = await Horario.findAll({
            where: { doctor_id: req.params.id, activo: true }
        });
        res.json(horarios);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
 
// ---------- DISPONIBILIDAD ----------
 
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
 
// ---------- CITAS ----------
 
app.get('/citas', verificarToken, async (req, res) => {
    try {
        const where = {};
        if (req.usuario.rol === 'doctor') where.doctor_id = req.usuario.doctor_id;
        if (req.query.fecha) where.fecha = req.query.fecha;
 
        const citas = await Cita.findAll({
            where,
            include: [{ model: Paciente }, { model: Servicio }, { model: Doctor }, { model: Pago }],
            order: [['fecha', 'ASC'], ['hora', 'ASC']]
        });
        res.json(citas);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
 
app.get('/citas/:id', verificarToken, async (req, res) => {
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
 
        const servicio = await Servicio.findByPk(servicio_id);
        if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });

        const citasDelDoctor = await Cita.findAll({
            where: { fecha, doctor_id, estado: ['pendiente', 'confirmada'] },
            include: [{ model: Servicio }]
        });
        const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        const nuevaI = toMin(hora); const nuevaF = nuevaI + servicio.duracion_min;
        const conflicto = citasDelDoctor.some(c => {
            const eI = toMin(c.hora); const eF = eI + (c.servicio?.duracion_min || 30);
            return nuevaI < eF && nuevaF > eI;
        });
        if (conflicto) return res.status(409).json({ error: 'Ese horario ya está ocupado' });
 
        const cita = await Cita.create({
            paciente_id: id_paciente, servicio_id, doctor_id,
            fecha, hora, estado: 'pendiente', metodo_pago, notas
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

        const emailPaciente = citaCompleta.paciente?.email;
        if (emailPaciente) {
            const fechaFormato = new Date(citaCompleta.fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const horaFormato = citaCompleta.hora?.slice(0, 5);
            const nombrePaciente = citaCompleta.paciente?.nombre;
            const nombreServicio = citaCompleta.servicio?.nombre;
            const nombreDoctor = citaCompleta.doctore?.nombre || 'por asignar';
            const precio = Number(citaCompleta.servicio?.precio || 0).toLocaleString('es-MX');

            transporter.sendMail({
                from: process.env.EMAIL_FROM,
                to: emailPaciente,
                subject: 'Confirmación de cita — Clínica Dental',
                html: `
                    <div style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto;">
                        <div style="background:#2563eb; padding:24px 32px; border-radius:12px 12px 0 0;">
                            <h2 style="color:white; margin:0; font-size:20px;">Clínica Dental</h2>
                            <p style="color:#bfdbfe; margin:4px 0 0; font-size:13px;">Confirmación de cita</p>
                        </div>
                        <div style="background:#f9fafb; padding:28px 32px; border:1px solid #e5e7eb; border-top:none;">
                            <p style="color:#374151; font-size:15px; margin-bottom:20px;">Hola <strong>${nombrePaciente}</strong>, tu cita ha sido registrada exitosamente.</p>
                            <table style="width:100%; border-collapse:collapse; font-size:14px;">
                                <tr style="border-bottom:1px solid #e5e7eb;">
                                    <td style="padding:10px 0; color:#6b7280; width:40%;">Servicio</td>
                                    <td style="padding:10px 0; color:#111; font-weight:600;">${nombreServicio}</td>
                                </tr>
                                <tr style="border-bottom:1px solid #e5e7eb;">
                                    <td style="padding:10px 0; color:#6b7280;">Fecha</td>
                                    <td style="padding:10px 0; color:#111; font-weight:600;">${fechaFormato}</td>
                                </tr>
                                <tr style="border-bottom:1px solid #e5e7eb;">
                                    <td style="padding:10px 0; color:#6b7280;">Hora</td>
                                    <td style="padding:10px 0; color:#111; font-weight:600;">${horaFormato}</td>
                                </tr>
                                <tr style="border-bottom:1px solid #e5e7eb;">
                                    <td style="padding:10px 0; color:#6b7280;">Doctor</td>
                                    <td style="padding:10px 0; color:#111; font-weight:600;">${nombreDoctor}</td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 0; color:#6b7280;">Precio</td>
                                    <td style="padding:10px 0; color:#2563eb; font-weight:700; font-size:16px;">$${precio} MXN</td>
                                </tr>
                            </table>
                            <div style="margin-top:24px; text-align:center;">
                                <a href="http://localhost:3000" style="background:#2563eb; color:white; padding:12px 28px; border-radius:8px; text-decoration:none; font-weight:600; font-size:14px;">Ver mis citas</a>
                            </div>
                        </div>
                        <div style="background:#f3f4f6; padding:16px 32px; border-radius:0 0 12px 12px; border:1px solid #e5e7eb; border-top:none;">
                            <p style="color:#9ca3af; font-size:12px; margin:0; text-align:center;">Clínica Dental &nbsp;·&nbsp; citas@dentalelite.com &nbsp;·&nbsp; +52 (55) 1234-5678</p>
                        </div>
                    </div>
                `
            }).catch(err => console.error('[EMAIL CITA]', err.message));
        }

        res.status(201).json(citaCompleta);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
 
app.put('/citas/:id/estado', verificarToken, soloRol('recepcionista'), async (req, res) => {
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
 
app.put('/citas/:id/notas', verificarToken, soloRol('doctor'), async (req, res) => {
    try {
        const cita = await Cita.findByPk(req.params.id);
        if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });
        await cita.update({ notas: req.body.notas });
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

app.delete('/citas/:id/eliminar', verificarToken, soloRol('recepcionista'), async (req, res) => {
    try {
        const cita = await Cita.findByPk(req.params.id);
        if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });
        if (cita.estado !== 'cancelada') return res.status(400).json({ error: 'Solo se pueden eliminar citas canceladas.' });
        await cita.destroy();
        res.json({ mensaje: 'Cita eliminada permanentemente' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- PAGOS ----------
 
app.get('/pagos', verificarToken, soloRol('recepcionista'), async (req, res) => {
    try {
        const pagos = await Pago.findAll({
            include: [{ model: Cita, include: [{ model: Paciente }, { model: Servicio }, { model: Doctor }] }],
            order: [['creado_en', 'DESC']]
        });
        res.json(pagos);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
 
app.put('/pagos/:id', verificarToken, async (req, res) => {
    try {
        const pago = await Pago.findByPk(req.params.id, {
            include: [{ model: Cita, include: [{ model: Servicio }] }]
        });
        if (!pago) return res.status(404).json({ error: 'Pago no encontrado' });
        const { estado, metodo, referencia, descuento_porcentaje, descuento_concepto } = req.body;
        const campos = { estado, metodo, referencia, descuento_porcentaje, descuento_concepto };
        if (descuento_porcentaje > 0) {
            const precioBase = Number(pago.cita?.servicio?.precio || pago.monto);
            campos.monto = precioBase * (1 - descuento_porcentaje / 100);
        }
        await pago.update(campos);
        res.json(pago);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
 
// ---------- ESTADÍSTICAS ----------

app.get('/estadisticas', verificarToken, soloRol('recepcionista'), async (req, res) => {
    try {
        const hoy = new Date().toISOString().slice(0, 10);
        const inicioSemana = new Date(); inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
        const finSemana = new Date(inicioSemana); finSemana.setDate(finSemana.getDate() + 6);
        const inicioMes = new Date(); inicioMes.setDate(1);
        const finMes = new Date(inicioMes.getFullYear(), inicioMes.getMonth() + 1, 0);
        const fmt = d => d.toISOString().slice(0, 10);

        const [citasHoy, citasSemana, citasMes, pagosHoy, pagosSemana, pagosMes, porEstado, serviciosTop] = await Promise.all([
            Cita.count({ where: { fecha: hoy } }),
            Cita.count({ where: { fecha: { [Op.between]: [fmt(inicioSemana), fmt(finSemana)] } } }),
            Cita.count({ where: { fecha: { [Op.between]: [fmt(inicioMes), fmt(finMes)] } } }),
            Pago.sum('monto', { where: { estado: 'pagado', creado_en: { [Op.gte]: new Date(hoy) } } }),
            Pago.sum('monto', { where: { estado: 'pagado', creado_en: { [Op.gte]: inicioSemana } } }),
            Pago.sum('monto', { where: { estado: 'pagado', creado_en: { [Op.gte]: inicioMes } } }),
            Cita.findAll({ attributes: ['estado', [sequelize.fn('COUNT', sequelize.col('estado')), 'total']], group: ['estado'] }),
            Cita.findAll({
                attributes: ['servicio_id', [sequelize.fn('COUNT', sequelize.col('servicio_id')), 'total']],
                include: [{ model: Servicio, attributes: ['nombre'] }],
                group: ['servicio_id', 'servicio.id', 'servicio.nombre'],
                order: [[sequelize.literal('total'), 'DESC']],
                limit: 5
            })
        ]);

        res.json({
            citas: { hoy: citasHoy, semana: citasSemana, mes: citasMes },
            ingresos: { hoy: pagosHoy || 0, semana: pagosSemana || 0, mes: pagosMes || 0 },
            porEstado: porEstado.map(e => ({ estado: e.estado, total: parseInt(e.dataValues.total) })),
            serviciosTop: serviciosTop.map(s => ({ nombre: s.servicio?.nombre, total: parseInt(s.dataValues.total) }))
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ---------- PRESUPUESTOS ----------

app.get('/presupuestos', verificarToken, async (req, res) => {
    try {
        const where = {};
        if (req.usuario.rol === 'doctor') where.doctor_id = req.usuario.doctor_id;
        const presupuestos = await Presupuesto.findAll({
            where,
            include: [{ model: Paciente }, { model: Doctor }],
            order: [['creado_en', 'DESC']]
        });
        res.json(presupuestos);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/presupuestos/:id', verificarToken, async (req, res) => {
    try {
        const presupuesto = await Presupuesto.findByPk(req.params.id, {
            include: [{ model: Paciente }, { model: Doctor }]
        });
        if (!presupuesto) return res.status(404).json({ error: 'Presupuesto no encontrado' });
        res.json(presupuesto);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/presupuestos', verificarToken, async (req, res) => {
    try {
        const presupuesto = await Presupuesto.create(req.body);
        res.status(201).json(presupuesto);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.put('/presupuestos/:id', verificarToken, async (req, res) => {
    try {
        const presupuesto = await Presupuesto.findByPk(req.params.id);
        if (!presupuesto) return res.status(404).json({ error: 'Presupuesto no encontrado' });
        await presupuesto.update(req.body);
        res.json(presupuesto);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ---------- RECORDATORIOS ----------

async function enviarRecordatorios() {
    try {
        const manana = new Date();
        manana.setDate(manana.getDate() + 1);
        // Componentes locales para evitar desfase UTC
        const fechaManana = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2,'0')}-${String(manana.getDate()).padStart(2,'0')}`;
        const fechaFormato = new Date(fechaManana + 'T12:00:00').toLocaleDateString('es-MX', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        const citas = await Cita.findAll({
            where: { fecha: fechaManana, estado: { [Op.in]: ['pendiente', 'confirmada'] } },
            include: [{ model: Paciente }, { model: Servicio }, { model: Doctor }]
        });

        let enviados = 0;
        await Promise.all(citas.map(async c => {
            const email = c.paciente?.email;
            if (!email) return;
            const nombrePaciente = c.paciente?.nombre || 'Paciente';
            const nombreServicio = c.servicio?.nombre || '—';
            const nombreDoctor   = c.doctore?.nombre  || 'por asignar';
            const horaFormato    = c.hora?.slice(0, 5) || '—';
            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_FROM,
                    to: email,
                    subject: `Recordatorio de cita — Clínica Dental`,
                    html: `
                        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                            <div style="background:#2563eb;padding:24px 32px;border-radius:12px 12px 0 0;">
                                <table style="width:100%;border-collapse:collapse;">
                                    <tr>
                                        <td style="vertical-align:middle;padding:0;">
                                            <table style="border-collapse:collapse;">
                                                <tr>
                                                    <td style="padding-right:14px;vertical-align:middle;">
                                                        <div style="width:44px;height:44px;background:rgba(255,255,255,0.15);border-radius:10px;display:inline-flex;align-items:center;justify-content:center;text-align:center;line-height:44px;">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto;">
                                                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                                                                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                                                            </svg>
                                                        </div>
                                                    </td>
                                                    <td style="vertical-align:middle;">
                                                        <h2 style="color:white;margin:0;font-size:20px;font-weight:700;">Clínica Dental</h2>
                                                        <p style="color:#bfdbfe;margin:3px 0 0;font-size:13px;">Recordatorio de cita</p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            <div style="background:#eff6ff;padding:16px 32px;border:1px solid #bfdbfe;border-top:none;">
                                <p style="color:#1d4ed8;font-size:13px;font-weight:700;margin:0;text-align:center;letter-spacing:.04em;text-transform:uppercase;">
                                    Tienes una cita programada para mañana
                                </p>
                            </div>
                            <div style="background:#f9fafb;padding:28px 32px;border:1px solid #e5e7eb;border-top:none;">
                                <p style="color:#374151;font-size:15px;margin:0 0 20px;">
                                    Hola <strong>${nombrePaciente}</strong>, te recordamos que tienes una cita dental programada para mañana. ¡Te esperamos!
                                </p>
                                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                                    <tr style="border-bottom:1px solid #e5e7eb;">
                                        <td style="padding:10px 0;color:#6b7280;width:40%;">Servicio</td>
                                        <td style="padding:10px 0;color:#111;font-weight:600;">${nombreServicio}</td>
                                    </tr>
                                    <tr style="border-bottom:1px solid #e5e7eb;">
                                        <td style="padding:10px 0;color:#6b7280;">Fecha</td>
                                        <td style="padding:10px 0;color:#2563eb;font-weight:700;">${fechaFormato}</td>
                                    </tr>
                                    <tr style="border-bottom:1px solid #e5e7eb;">
                                        <td style="padding:10px 0;color:#6b7280;">Hora</td>
                                        <td style="padding:10px 0;color:#2563eb;font-weight:700;font-size:16px;">${horaFormato}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px 0;color:#6b7280;">Doctor</td>
                                        <td style="padding:10px 0;color:#111;font-weight:600;">${nombreDoctor}</td>
                                    </tr>
                                </table>
                                <div style="margin-top:22px;background:#eff6ff;border-left:4px solid #2563eb;border-radius:0 8px 8px 0;padding:12px 16px;">
                                    <p style="margin:0;font-size:13px;color:#1d4ed8;font-weight:600;">Recuerda:</p>
                                    <ul style="margin:6px 0 0;padding-left:18px;font-size:13px;color:#1e40af;line-height:1.9;">
                                        <li>Llega al menos 10 minutos antes de tu cita.</li>
                                        <li>Si necesitas cancelar, hazlo con al menos 24 horas de anticipación.</li>
                                        <li>Trae una identificación oficial.</li>
                                    </ul>
                                </div>
                            </div>
                            <div style="background:#f3f4f6;padding:16px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
                                <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">
                                    Clínica Dental &nbsp;·&nbsp; citas@dentalelite.com &nbsp;·&nbsp; +52 (55) 1234-5678
                                </p>
                            </div>
                        </div>
                    `
                });
                enviados++;
            } catch (err) {
                console.error('[RECORDATORIO EMAIL]', email, err.message);
            }
        }));

        return { enviados, total: citas.length, fecha: fechaManana };
    } catch (e) {
        console.error('[RECORDATORIO ERROR]', e.message);
        return { enviados: 0, total: 0, fecha: '?' };
    }
}

app.post('/recordatorios/enviar', verificarToken, soloRol('recepcionista'), async (req, res) => {
    const { enviados, total, fecha } = await enviarRecordatorios();
    const mensaje = total === 0
        ? `No se encontraron citas pendientes/confirmadas para el ${fecha}.`
        : `Se enviaron ${enviados} de ${total} recordatorio(s) para el ${fecha}.`;
    res.json({ mensaje, enviados, total, fecha });
});

// Cron: ejecutar recordatorios cada 24 horas
setInterval(enviarRecordatorios, 24 * 60 * 60 * 1000);

// ---------- CANCELAR CITA POR PACIENTE CON VALIDACIÓN DE TIEMPO ----------

app.delete('/citas/:id/paciente', async (req, res) => {
    try {
        const cita = await Cita.findByPk(req.params.id);
        if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });
        if (['cancelada', 'completada'].includes(cita.estado)) {
            return res.status(400).json({ error: 'Esta cita ya no puede cancelarse' });
        }
        const ahora = new Date();
        const fechaHoraCita = new Date(`${cita.fecha}T${cita.hora}`);
        const diff = (fechaHoraCita - ahora) / 60000;
        if (diff < 1440) return res.status(400).json({ error: 'Solo puedes cancelar con al menos 1 día de anticipación' });
        await cita.update({ estado: 'cancelada' });
        res.json({ mensaje: 'Cita cancelada' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ---------- CONTACTO ----------

app.post('/contacto', async (req, res) => {
    try {
        const { nombre, email, telefono, asunto, mensaje } = req.body;
        if (!nombre || !email || !mensaje) {
            return res.status(400).json({ error: 'Nombre, email y mensaje son obligatorios.' });
        }
        await Mensaje.create({ nombre, email, telefono, asunto, mensaje });
        res.status(201).json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/mensajes', verificarToken, soloRol('recepcionista'), async (req, res) => {
    try {
        const mensajes = await Mensaje.findAll({ order: [['creado_en', 'DESC']] });
        res.json(mensajes);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/mensajes/:id/leido', verificarToken, soloRol('recepcionista'), async (req, res) => {
    try {
        const msg = await Mensaje.findByPk(req.params.id);
        if (!msg) return res.status(404).json({ error: 'Mensaje no encontrado' });
        await msg.update({ leido: true });
        res.json(msg);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/mensajes/:id/responder', verificarToken, soloRol('recepcionista'), async (req, res) => {
    try {
        const { respuesta } = req.body;
        if (!respuesta?.trim()) return res.status(400).json({ error: 'La respuesta no puede estar vacía.' });

        const msg = await Mensaje.findByPk(req.params.id);
        if (!msg) return res.status(404).json({ error: 'Mensaje no encontrado' });

        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: msg.email,
            subject: `Re: ${msg.asunto || 'Tu mensaje en Clínica Dental'}`,
            html: `
                <div style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto;">
                    <div style="background:#2563eb; padding:24px 32px; border-radius:12px 12px 0 0;">
                        <h2 style="color:white; margin:0; font-size:20px;">Clínica Dental</h2>
                        <p style="color:#bfdbfe; margin:4px 0 0; font-size:13px;">Respuesta a tu mensaje</p>
                    </div>
                    <div style="background:#f9fafb; padding:28px 32px; border:1px solid #e5e7eb; border-top:none;">
                        <p style="color:#374151; font-size:15px;">Hola <strong>${msg.nombre}</strong>,</p>
                        <p style="color:#374151; font-size:15px; line-height:1.6;">${respuesta.replace(/\n/g, '<br>')}</p>
                        <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;">
                        <p style="color:#9ca3af; font-size:12px; margin:0;">
                            Este correo es una respuesta a tu mensaje:<br>
                            <em style="color:#6b7280;">"${msg.mensaje}"</em>
                        </p>
                    </div>
                    <div style="background:#f3f4f6; padding:16px 32px; border-radius:0 0 12px 12px; border:1px solid #e5e7eb; border-top:none;">
                        <p style="color:#9ca3af; font-size:12px; margin:0; text-align:center;">
                            Clínica Dental &nbsp;·&nbsp; citas@dentalelite.com &nbsp;·&nbsp; +52 (55) 1234-5678
                        </p>
                    </div>
                </div>
            `
        });

        await msg.update({ leido: true });
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ---------- RESEÑAS ----------

app.get('/resenas', async (req, res) => {
    try {
        const resenas = await Resena.findAll({
            include: [
                { model: Paciente, attributes: ['nombre'] },
                { model: Cita, include: [{ model: Servicio, attributes: ['nombre'] }] }
            ],
            order: [['creado_en', 'DESC']]
        });
        res.json(resenas);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/resenas', async (req, res) => {
    try {
        const { cita_id, estrellas, comentario } = req.body;

        if (!cita_id || !estrellas) return res.status(400).json({ error: 'Faltan datos obligatorios.' });
        if (estrellas < 1 || estrellas > 5) return res.status(400).json({ error: 'Las estrellas deben ser entre 1 y 5.' });

        const cita = await Cita.findByPk(cita_id);
        if (!cita) return res.status(404).json({ error: 'Cita no encontrada.' });
        if (cita.estado !== 'completada') return res.status(400).json({ error: 'Solo puedes reseñar citas completadas.' });

        const yaExiste = await Resena.findOne({ where: { cita_id } });
        if (yaExiste) return res.status(409).json({ error: 'Ya dejaste una reseña para esta cita.' });

        const resena = await Resena.create({ cita_id, paciente_id: cita.paciente_id, estrellas, comentario });
        res.status(201).json(resena);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ---------- ADMIN ----------

async function verificarPasswordAdmin(req, res, next) {
    try {
        const { passwordAdmin } = req.body;
        if (!passwordAdmin) return res.status(400).json({ error: 'Se requiere la contraseña de administrador.' });
        const admin = await Usuario.findByPk(req.usuario.id);
        if (!admin) return res.status(401).json({ error: 'Administrador no encontrado.' });
        const valido = await bcrypt.compare(passwordAdmin, admin.password);
        if (!valido) return res.status(401).json({ error: 'Contraseña incorrecta.' });
        next();
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

// Usuarios: listar, editar, eliminar, cambiar contraseña
app.get('/usuarios', verificarToken, soloRol('admin'), async (req, res) => {
    try {
        const usuarios = await Usuario.findAll({ attributes: ['id', 'nombre', 'email', 'rol', 'doctor_id'] });
        res.json(usuarios);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/usuarios/:id', verificarToken, soloRol('admin'), async (req, res) => {
    try {
        const usuario = await Usuario.findByPk(req.params.id);
        if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
        const { nombre, email, rol, doctor_id } = req.body;
        await usuario.update({ nombre, email, rol, doctor_id: doctor_id || null });
        res.json({ id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol });
    } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/usuarios/:id', verificarToken, soloRol('admin'), verificarPasswordAdmin, async (req, res) => {
    try {
        const usuario = await Usuario.findByPk(req.params.id);
        if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
        if (usuario.rol === 'admin') return res.status(400).json({ error: 'No se puede eliminar una cuenta de administrador.' });
        await usuario.destroy();
        res.json({ mensaje: 'Usuario eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/usuarios/:id/password', verificarToken, soloRol('admin'), async (req, res) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
        const usuario = await Usuario.findByPk(req.params.id);
        if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
        const hash = await bcrypt.hash(password, 10);
        await usuario.update({ password: hash });
        res.json({ ok: true });
    } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/usuarios/admin', verificarToken, soloRol('admin'), async (req, res) => {
    try {
        const { nombre, email, password, rol, doctor_id } = req.body;
        if (!nombre || !email || !password || !rol) return res.status(400).json({ error: 'Faltan campos obligatorios.' });
        const hash = await bcrypt.hash(password, 10);
        const usuario = await Usuario.create({ nombre, email, password: hash, rol, doctor_id: doctor_id || null });
        res.status(201).json({ id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol });
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// Doctores: crear, editar, activar/desactivar, eliminar
app.delete('/doctores/:id', verificarToken, soloRol('admin'), verificarPasswordAdmin, async (req, res) => {
    try {
        const doctor = await Doctor.findByPk(req.params.id);
        if (!doctor) return res.status(404).json({ error: 'Doctor no encontrado' });
        const citasCount = await Cita.count({ where: { doctor_id: req.params.id } });
        if (citasCount > 0) return res.status(400).json({ error: `No se puede eliminar: este doctor tiene ${citasCount} cita(s) registrada(s). Desactívalo en su lugar.` });
        await Horario.destroy({ where: { doctor_id: req.params.id } });
        await doctor.destroy();
        res.json({ mensaje: 'Doctor eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/doctores', verificarToken, soloRol('admin'), async (req, res) => {
    try {
        const doctor = await Doctor.create(req.body);
        res.status(201).json(doctor);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/doctores/:id', verificarToken, soloRol('admin'), async (req, res) => {
    try {
        const doctor = await Doctor.findByPk(req.params.id);
        if (!doctor) return res.status(404).json({ error: 'Doctor no encontrado' });
        await doctor.update(req.body);
        res.json(doctor);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// Horarios: listar todos, crear, eliminar
app.get('/horarios', verificarToken, soloRol('admin'), async (req, res) => {
    try {
        const horarios = await Horario.findAll({
            include: [{ model: Doctor }],
            order: [['doctor_id', 'ASC'], ['dia_semana', 'ASC']]
        });
        res.json(horarios);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/horarios', verificarToken, soloRol('admin'), async (req, res) => {
    try {
        const horario = await Horario.create(req.body);
        res.status(201).json(horario);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/horarios/:id', verificarToken, soloRol('admin'), verificarPasswordAdmin, async (req, res) => {
    try {
        const horario = await Horario.findByPk(req.params.id);
        if (!horario) return res.status(404).json({ error: 'Horario no encontrado' });
        await horario.destroy();
        res.json({ mensaje: 'Horario eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Servicios: crear (admin), editar precio/datos, activar/desactivar, eliminar
app.delete('/servicios/:id', verificarToken, soloRol('admin'), verificarPasswordAdmin, async (req, res) => {
    try {
        const servicio = await Servicio.findByPk(req.params.id);
        if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });
        const citasCount = await Cita.count({ where: { servicio_id: req.params.id } });
        if (citasCount > 0) return res.status(400).json({ error: `No se puede eliminar: este servicio tiene ${citasCount} cita(s) registrada(s). Desactívalo en su lugar.` });
        await servicio.destroy();
        res.json({ mensaje: 'Servicio eliminado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/servicios/:id', verificarToken, soloRol('admin'), async (req, res) => {
    try {
        const servicio = await Servicio.findByPk(req.params.id);
        if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });
        await servicio.update(req.body);
        res.json(servicio);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// ---------- INICIAR ----------

const PORT = process.env.PORT || 3000;
 
sequelize.sync().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
});