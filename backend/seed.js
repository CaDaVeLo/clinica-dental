import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { sequelize, Usuario } from './models/models.js';

dotenv.config();

await sequelize.authenticate();

const hash = await bcrypt.hash('123456', 10);

await Usuario.findOrCreate({
    where: { email: 'recepcion@clinica.com' },
    defaults: { nombre: 'Recepcionista', email: 'recepcion@clinica.com', password: hash, rol: 'recepcionista' }
});

await Usuario.findOrCreate({
    where: { email: 'barraza@clinica.com' },
    defaults: { nombre: 'Dr. Barraza', email: 'barraza@clinica.com', password: hash, rol: 'doctor', doctor_id: 1 }
});

console.log('Usuarios creados correctamente.');
await sequelize.close();
