import { DataTypes } from 'sequelize';
import sequelize from './db.js';
 
const Paciente = sequelize.define('pacientes', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    telefono: { type: DataTypes.STRING(20) },
    curp: { type: DataTypes.STRING(18), allowNull: false, unique: true },
    fecha_nac: { type: DataTypes.DATEONLY },
    direccion: { type: DataTypes.TEXT },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { timestamps: true, createdAt: 'creado_en', updatedAt: false });
 
const Expediente = sequelize.define('expedientes', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    paciente_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    alergias: { type: DataTypes.TEXT },
    enfermedades: { type: DataTypes.TEXT },
    medicamentos: { type: DataTypes.TEXT },
    antecedentes: { type: DataTypes.TEXT },
    notas_generales: { type: DataTypes.TEXT },
    odontograma: { type: DataTypes.JSON, defaultValue: {} }
}, { timestamps: true, createdAt: 'creado_en', updatedAt: 'actualizado_en' });
 
const Servicio = sequelize.define('servicios', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    duracion_min: { type: DataTypes.INTEGER, allowNull: false },
    precio: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    categoria: { type: DataTypes.STRING(50) },
    icono: { type: DataTypes.STRING(10) },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { timestamps: false });
 
const Doctor = sequelize.define('doctores', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    especialidad: { type: DataTypes.STRING(100) },
    email: { type: DataTypes.STRING(150) },
    telefono: { type: DataTypes.STRING(20) },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { timestamps: false });
 
const Horario = sequelize.define('horarios', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    doctor_id: { type: DataTypes.INTEGER, allowNull: false },
    dia_semana: { type: DataTypes.INTEGER },
    hora_inicio: { type: DataTypes.TIME, allowNull: false },
    hora_fin: { type: DataTypes.TIME, allowNull: false },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { timestamps: false });
 
const Cita = sequelize.define('citas', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    paciente_id: { type: DataTypes.INTEGER, allowNull: false },
    servicio_id: { type: DataTypes.INTEGER, allowNull: false },
    doctor_id: { type: DataTypes.INTEGER },
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
    hora: { type: DataTypes.TIME, allowNull: false },
    estado: { type: DataTypes.STRING(20), defaultValue: 'pendiente' },
    metodo_pago: { type: DataTypes.STRING(30) },
    notas: { type: DataTypes.TEXT }
}, { timestamps: true, createdAt: 'creado_en', updatedAt: 'actualizado_en' });
 
const Pago = sequelize.define('pagos', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cita_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    monto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    metodo: { type: DataTypes.STRING(30) },
    estado: { type: DataTypes.STRING(20), defaultValue: 'pendiente' },
    referencia: { type: DataTypes.STRING(100) },
    descuento_porcentaje: { type: DataTypes.INTEGER, defaultValue: 0 },
    descuento_concepto: { type: DataTypes.STRING(100) }
}, { timestamps: true, createdAt: 'creado_en', updatedAt: false });
 
const Usuario = sequelize.define('usuarios', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(255), allowNull: false },
    rol: { type: DataTypes.STRING(20), allowNull: false },
    doctor_id: { type: DataTypes.INTEGER }
}, { timestamps: false });
 
const Mensaje = sequelize.define('mensajes', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false },
    telefono: { type: DataTypes.STRING(20) },
    asunto: { type: DataTypes.STRING(100) },
    mensaje: { type: DataTypes.TEXT, allowNull: false },
    leido: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: true, createdAt: 'creado_en', updatedAt: false });

const Presupuesto = sequelize.define('presupuestos', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    paciente_id: { type: DataTypes.INTEGER, allowNull: false },
    doctor_id: { type: DataTypes.INTEGER },
    items: { type: DataTypes.JSON, defaultValue: [] },
    total: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    descuento_porcentaje: { type: DataTypes.INTEGER, defaultValue: 0 },
    estado: { type: DataTypes.STRING(20), defaultValue: 'borrador' },
    notas: { type: DataTypes.TEXT }
}, { timestamps: true, createdAt: 'creado_en', updatedAt: 'actualizado_en' });

Doctor.hasMany(Horario, { foreignKey: 'doctor_id' });
Horario.belongsTo(Doctor, { foreignKey: 'doctor_id' });
 
Paciente.hasMany(Cita, { foreignKey: 'paciente_id' });
Cita.belongsTo(Paciente, { foreignKey: 'paciente_id' });
 
Servicio.hasMany(Cita, { foreignKey: 'servicio_id' });
Cita.belongsTo(Servicio, { foreignKey: 'servicio_id' });
 
Doctor.hasMany(Cita, { foreignKey: 'doctor_id' });
Cita.belongsTo(Doctor, { foreignKey: 'doctor_id' });
 
Cita.hasOne(Pago, { foreignKey: 'cita_id' });
Pago.belongsTo(Cita, { foreignKey: 'cita_id' });
 
Paciente.hasOne(Expediente, { foreignKey: 'paciente_id' });
Expediente.belongsTo(Paciente, { foreignKey: 'paciente_id' });

Presupuesto.belongsTo(Paciente, { foreignKey: 'paciente_id' });
Presupuesto.belongsTo(Doctor, { foreignKey: 'doctor_id' });
Paciente.hasMany(Presupuesto, { foreignKey: 'paciente_id' });

export { sequelize, Paciente, Expediente, Servicio, Doctor, Horario, Cita, Pago, Usuario, Presupuesto, Mensaje };
 