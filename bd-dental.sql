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