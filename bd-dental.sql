CREATE TABLE pacientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    curp VARCHAR(18) NOT NULL UNIQUE,
    fecha_nac DATE,
    direccion TEXT,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE TABLE servicios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    duracion_min INTEGER NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    categoria VARCHAR(50),
    icono VARCHAR(10),
    activo BOOLEAN DEFAULT true
);

CREATE TABLE doctores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    especialidad VARCHAR(100),
    email VARCHAR(150),
    telefono VARCHAR(20),
    activo BOOLEAN DEFAULT true
);

CREATE TABLE horarios (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES doctores(id),
    dia_semana INTEGER,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    activo BOOLEAN DEFAULT true
);

CREATE TABLE citas (
    id SERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
    servicio_id INTEGER NOT NULL REFERENCES servicios(id),
    doctor_id INTEGER REFERENCES doctores(id),
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente',
    metodo_pago VARCHAR(30),
    notas TEXT,
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pagos (
    id SERIAL PRIMARY KEY,
    cita_id INTEGER NOT NULL UNIQUE REFERENCES citas(id),
    monto DECIMAL(10,2) NOT NULL,
    metodo VARCHAR(30),
    estado VARCHAR(20) DEFAULT 'pendiente',
    referencia VARCHAR(100),
    creado_en TIMESTAMP DEFAULT NOW()
);

INSERT INTO servicios (nombre, descripcion, duracion_min, precio, categoria, activo) VALUES
('Limpieza Dental', 'Eliminación de placa y sarro con ultrasonido. Incluye pulido y flúor.', 60, 800, 'Preventivo', true),
('Diagnóstico Digital', 'Radiografías digitales y evaluación 3D completa de tu salud bucal.', 45, 600, 'Diagnostico', true),
('Blanqueamiento', 'Blanqueamiento profesional con gel activado con luz LED.', 90, 2500, 'Estético', true),
('Implante Dental', 'Implantes de titanio de alta calidad para reemplazar dientes perdidos.', 120, 12000, 'Cirugía', true),
('Ortodoncia', 'Brackets metálicos, cerámicos y alineadores invisibles.', 60, 4000, 'Ortodoncia', true),
('Endodoncia', 'Tratamiento de conducto para salvar dientes con infección grave.', 90, 2500, 'Preventivo', true);

INSERT INTO doctores (nombre, especialidad, email, telefono, activo) VALUES
('Dr. Barraza', 'Odontología General', 'barraza@clinica.com', '6651234567', true),
('Dra. García', 'Ortodoncia', 'garcia@clinica.com', '6659876543', true);

INSERT INTO horarios (doctor_id, dia_semana, hora_inicio, hora_fin, activo) VALUES
(1, 1, '08:00', '14:00', true),
(1, 2, '08:00', '14:00', true),
(1, 3, '08:00', '14:00', true),
(1, 4, '08:00', '14:00', true),
(1, 5, '08:00', '14:00', true),
(1, 6, '08:00', '13:00', true),
(2, 1, '10:00', '18:00', true),
(2, 2, '10:00', '18:00', true),
(2, 3, '10:00', '18:00', true),
(2, 4, '10:00', '18:00', true),
(2, 5, '10:00', '18:00', true),
(2, 6, '10:00', '15:00', true);

SELECT * FROM pacientes;

DELETE FROM pacientes WHERE id = 1;