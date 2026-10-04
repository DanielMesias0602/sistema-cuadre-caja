-- ============================================================
-- SISTEMA DE CUADRE DE CAJA
-- DISEÑO FÍSICO POSTGRESQL
-- schema.sql
--
-- Fuente:
--   MER oficial
--   Modelo lógico actualizado
--   Reglas de negocio aprobadas
--
-- Estado:
--   VERSIÓN OFICIAL - VALIDADA PARA EJECUCIÓN EN POSTGRESQL
--
-- IMPORTANTE:
--   Este script define únicamente la estructura de la BD.
--   Las reglas que requieren varias filas, por ejemplo:
--
--       SUM(PAGO.monto) = OPERACION.monto
--
--   serán controladas por el Service/backend dentro
--   de una transacción.
-- ============================================================

BEGIN;

-- ============================================================
-- 0. TABLAS MAESTRAS / CATÁLOGOS
-- ============================================================

CREATE TABLE rol (
    id_rol INTEGER GENERATED ALWAYS AS IDENTITY,
    nombre VARCHAR(50) NOT NULL,
    descripcion VARCHAR(150),
    estado BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT pk_rol
        PRIMARY KEY (id_rol),

    CONSTRAINT uq_rol_nombre
        UNIQUE (nombre)
);


CREATE TABLE medio_pago (
    id_medio_pago INTEGER GENERATED ALWAYS AS IDENTITY,
    nombre VARCHAR(50) NOT NULL,
    es_efectivo BOOLEAN NOT NULL DEFAULT FALSE,
    estado BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT pk_medio_pago
        PRIMARY KEY (id_medio_pago),

    CONSTRAINT uq_medio_pago_nombre
        UNIQUE (nombre)
);


CREATE TABLE tipo_salida (
    id_tipo_salida INTEGER GENERATED ALWAYS AS IDENTITY,
    nombre VARCHAR(50) NOT NULL,
    descripcion VARCHAR(150),
    estado BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT pk_tipo_salida
        PRIMARY KEY (id_tipo_salida),

    CONSTRAINT uq_tipo_salida_nombre
        UNIQUE (nombre)
);


-- ============================================================
-- 1. USUARIO
-- ============================================================

CREATE TABLE usuario (
    id_usuario INTEGER GENERATED ALWAYS AS IDENTITY,
    id_rol INTEGER NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    usuario VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    condicion_personal VARCHAR(50) NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_usuario
        PRIMARY KEY (id_usuario),

    CONSTRAINT uq_usuario_usuario
        UNIQUE (usuario),

    CONSTRAINT fk_usuario_rol
        FOREIGN KEY (id_rol)
        REFERENCES rol (id_rol)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);


-- ============================================================
-- 2. COMPROBANTE
-- ============================================================

CREATE TABLE comprobante (
    id_comprobante INTEGER GENERATED ALWAYS AS IDENTITY,
    tipo_comprobante VARCHAR(30) NOT NULL,
    serie VARCHAR(10) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    fecha DATE NOT NULL,
    monto NUMERIC(12,2) NOT NULL,

    CONSTRAINT pk_comprobante
        PRIMARY KEY (id_comprobante),

    CONSTRAINT uq_comprobante_tipo_serie_numero
        UNIQUE (tipo_comprobante, serie, numero),

    CONSTRAINT ck_comprobante_monto_positivo
        CHECK (monto > 0)
);


-- ============================================================
-- 3. CIERRE_CAJA
-- ============================================================

CREATE TABLE cierre_caja (
    id_cierre INTEGER GENERATED ALWAYS AS IDENTITY,
    id_usuario_responsable INTEGER NOT NULL,
    fecha DATE NOT NULL,
    turno VARCHAR(30) NOT NULL,
    total_ingresos NUMERIC(12,2) NOT NULL,
    total_no_efectivo NUMERIC(12,2) NOT NULL,
    efectivo_esperado NUMERIC(12,2) NOT NULL,
    total_salidas NUMERIC(12,2) NOT NULL,
    efectivo_despues_salidas NUMERIC(12,2) NOT NULL,
    efectivo_fisico NUMERIC(12,2) NOT NULL,
    diferencia NUMERIC(12,2) NOT NULL,
    estado VARCHAR(30) NOT NULL,
    fecha_fin TIMESTAMPTZ NOT NULL,

    CONSTRAINT pk_cierre_caja
        PRIMARY KEY (id_cierre),

    CONSTRAINT fk_cierre_usuario_responsable
        FOREIGN KEY (id_usuario_responsable)
        REFERENCES usuario (id_usuario)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT ck_cierre_total_ingresos
        CHECK (total_ingresos >= 0),

    CONSTRAINT ck_cierre_total_no_efectivo
        CHECK (total_no_efectivo >= 0),

    CONSTRAINT ck_cierre_efectivo_esperado
        CHECK (efectivo_esperado >= 0),

    CONSTRAINT ck_cierre_total_salidas
        CHECK (total_salidas >= 0),

    CONSTRAINT ck_cierre_efectivo_fisico
        CHECK (efectivo_fisico >= 0)
);


-- ============================================================
-- 4. OPERACION
-- ============================================================

CREATE TABLE operacion (
    id_operacion INTEGER GENERATED ALWAYS AS IDENTITY,
    id_usuario INTEGER NOT NULL,
    id_cierre INTEGER,
    id_comprobante INTEGER NOT NULL,
    fecha DATE NOT NULL,
    monto NUMERIC(12,2) NOT NULL,
    estado VARCHAR(30) NOT NULL,
    observacion VARCHAR(500),
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMPTZ,
    id_usuario_modificacion INTEGER,

    CONSTRAINT pk_operacion
        PRIMARY KEY (id_operacion),

    CONSTRAINT uq_operacion_comprobante
        UNIQUE (id_comprobante),

    CONSTRAINT fk_operacion_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_operacion_cierre
        FOREIGN KEY (id_cierre)
        REFERENCES cierre_caja (id_cierre)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_operacion_comprobante
        FOREIGN KEY (id_comprobante)
        REFERENCES comprobante (id_comprobante)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_operacion_usuario_modificacion
        FOREIGN KEY (id_usuario_modificacion)
        REFERENCES usuario (id_usuario)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT ck_operacion_monto_positivo
        CHECK (monto > 0)
);


-- ============================================================
-- 5. PAGO
-- ============================================================

CREATE TABLE pago (
    id_pago INTEGER GENERATED ALWAYS AS IDENTITY,
    id_operacion INTEGER NOT NULL,
    id_medio_pago INTEGER NOT NULL,
    monto NUMERIC(12,2) NOT NULL,
    referencia_bancaria VARCHAR(100),
    observacion VARCHAR(500),
    estado VARCHAR(30) NOT NULL,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMPTZ,

    CONSTRAINT pk_pago
        PRIMARY KEY (id_pago),

    CONSTRAINT fk_pago_operacion
        FOREIGN KEY (id_operacion)
        REFERENCES operacion (id_operacion)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_pago_medio
        FOREIGN KEY (id_medio_pago)
        REFERENCES medio_pago (id_medio_pago)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT ck_pago_monto_positivo
        CHECK (monto > 0)
);


-- ============================================================
-- 6. EVIDENCIA
-- ============================================================

CREATE TABLE evidencia (
    id_evidencia INTEGER GENERATED ALWAYS AS IDENTITY,
    id_operacion INTEGER NOT NULL,
    id_usuario INTEGER NOT NULL,
    tipo_evidencia VARCHAR(30) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    fecha_evidencia DATE NOT NULL,
    observacion VARCHAR(500),
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_evidencia
        PRIMARY KEY (id_evidencia),

    CONSTRAINT fk_evidencia_operacion
        FOREIGN KEY (id_operacion)
        REFERENCES operacion (id_operacion)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_evidencia_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT uq_evidencia_storage_key
        UNIQUE (storage_key)
);


-- ============================================================
-- 7. VERIFICACION_PAGO
-- ============================================================

CREATE TABLE verificacion_pago (
    id_verificacion INTEGER GENERATED ALWAYS AS IDENTITY,
    id_pago INTEGER NOT NULL,
    id_evidencia_cliente INTEGER,
    id_evidencia_empresa INTEGER,
    id_usuario INTEGER NOT NULL,
    monto_comparado NUMERIC(12,2) NOT NULL,
    fecha_comparada DATE NOT NULL,
    referencia_bancaria_comparada VARCHAR(100),
    estado_verificacion VARCHAR(30) NOT NULL,
    observacion VARCHAR(500),
    fecha_verificacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_verificacion_pago
        PRIMARY KEY (id_verificacion),

    CONSTRAINT fk_verificacion_pago
        FOREIGN KEY (id_pago)
        REFERENCES pago (id_pago)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_verificacion_evidencia_cliente
        FOREIGN KEY (id_evidencia_cliente)
        REFERENCES evidencia (id_evidencia)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_verificacion_evidencia_empresa
        FOREIGN KEY (id_evidencia_empresa)
        REFERENCES evidencia (id_evidencia)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_verificacion_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT ck_verificacion_monto_positivo
        CHECK (monto_comparado > 0)
);


-- ============================================================
-- 8. SALIDA_CAJA
-- ============================================================

CREATE TABLE salida_caja (
    id_salida INTEGER GENERATED ALWAYS AS IDENTITY,
    id_cierre INTEGER NOT NULL,
    id_tipo_salida INTEGER NOT NULL,
    id_usuario INTEGER NOT NULL,
    id_comprobante INTEGER,
    fecha DATE NOT NULL,
    monto NUMERIC(12,2) NOT NULL,
    motivo VARCHAR(250) NOT NULL,
    observacion VARCHAR(500),
    storage_key VARCHAR(500),
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_salida_caja
        PRIMARY KEY (id_salida),

    CONSTRAINT fk_salida_cierre
        FOREIGN KEY (id_cierre)
        REFERENCES cierre_caja (id_cierre)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_salida_tipo
        FOREIGN KEY (id_tipo_salida)
        REFERENCES tipo_salida (id_tipo_salida)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_salida_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_salida_comprobante
        FOREIGN KEY (id_comprobante)
        REFERENCES comprobante (id_comprobante)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT ck_salida_monto_positivo
        CHECK (monto > 0)
);


-- ============================================================
-- 9. ANULACION
-- ============================================================

CREATE TABLE anulacion (
    id_anulacion INTEGER GENERATED ALWAYS AS IDENTITY,
    id_comprobante INTEGER NOT NULL,
    id_usuario INTEGER NOT NULL,
    fecha DATE NOT NULL,
    motivo VARCHAR(250) NOT NULL,
    observacion VARCHAR(500),

    CONSTRAINT pk_anulacion
        PRIMARY KEY (id_anulacion),

    CONSTRAINT uq_anulacion_comprobante
        UNIQUE (id_comprobante),

    CONSTRAINT fk_anulacion_comprobante
        FOREIGN KEY (id_comprobante)
        REFERENCES comprobante (id_comprobante)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_anulacion_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);


-- ============================================================
-- 10. NOTA_CREDITO
-- ============================================================

CREATE TABLE nota_credito (
    id_nota_credito INTEGER GENERATED ALWAYS AS IDENTITY,
    id_comprobante_original INTEGER NOT NULL,
    id_usuario INTEGER NOT NULL,
    fecha DATE NOT NULL,
    monto NUMERIC(12,2) NOT NULL,
    motivo VARCHAR(250) NOT NULL,
    observacion VARCHAR(500),

    CONSTRAINT pk_nota_credito
        PRIMARY KEY (id_nota_credito),

    CONSTRAINT fk_nota_credito_comprobante
        FOREIGN KEY (id_comprobante_original)
        REFERENCES comprobante (id_comprobante)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_nota_credito_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT ck_nota_credito_monto_positivo
        CHECK (monto > 0)
);


-- ============================================================
-- 11. CONCILIACION
-- ============================================================

CREATE TABLE conciliacion (
    id_conciliacion INTEGER GENERATED ALWAYS AS IDENTITY,
    id_usuario INTEGER NOT NULL,
    fecha DATE NOT NULL,
    diferencia_detectada NUMERIC(12,2) NOT NULL,
    resultado VARCHAR(30) NOT NULL,
    observacion VARCHAR(500),
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_conciliacion
        PRIMARY KEY (id_conciliacion),

    CONSTRAINT fk_conciliacion_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);


-- ============================================================
-- 12. DETALLE_CONCILIACION
-- ============================================================

CREATE TABLE detalle_conciliacion (
    id_detalle INTEGER GENERATED ALWAYS AS IDENTITY,
    id_conciliacion INTEGER NOT NULL,
    id_operacion INTEGER NOT NULL,
    observacion VARCHAR(500),
    resultado VARCHAR(30) NOT NULL,

    CONSTRAINT pk_detalle_conciliacion
        PRIMARY KEY (id_detalle),

    CONSTRAINT fk_detalle_conciliacion
        FOREIGN KEY (id_conciliacion)
        REFERENCES conciliacion (id_conciliacion)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_detalle_operacion
        FOREIGN KEY (id_operacion)
        REFERENCES operacion (id_operacion)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);


-- ============================================================
-- 13. ÍNDICES
-- ============================================================

CREATE INDEX idx_usuario_rol
    ON usuario (id_rol);

CREATE INDEX idx_operacion_usuario
    ON operacion (id_usuario);

CREATE INDEX idx_operacion_cierre
    ON operacion (id_cierre);

CREATE INDEX idx_operacion_fecha
    ON operacion (fecha);

CREATE INDEX idx_operacion_estado
    ON operacion (estado);

CREATE INDEX idx_pago_operacion
    ON pago (id_operacion);

CREATE INDEX idx_pago_medio_pago
    ON pago (id_medio_pago);

CREATE INDEX idx_pago_estado
    ON pago (estado);

CREATE INDEX idx_evidencia_operacion
    ON evidencia (id_operacion);

CREATE INDEX idx_evidencia_usuario
    ON evidencia (id_usuario);

CREATE INDEX idx_verificacion_pago
    ON verificacion_pago (id_pago);

CREATE INDEX idx_verificacion_estado
    ON verificacion_pago (estado_verificacion);

CREATE INDEX idx_salida_cierre
    ON salida_caja (id_cierre);

CREATE INDEX idx_salida_tipo
    ON salida_caja (id_tipo_salida);

CREATE INDEX idx_salida_fecha
    ON salida_caja (fecha);

CREATE INDEX idx_anulacion_comprobante
    ON anulacion (id_comprobante);

CREATE INDEX idx_nota_credito_comprobante
    ON nota_credito (id_comprobante_original);

CREATE INDEX idx_conciliacion_fecha
    ON conciliacion (fecha);

CREATE INDEX idx_detalle_conciliacion
    ON detalle_conciliacion (id_conciliacion);

CREATE INDEX idx_detalle_operacion
    ON detalle_conciliacion (id_operacion);


-- ============================================================
-- 14. DATOS INICIALES DE CATÁLOGOS
-- ============================================================
--
-- IMPORTANTE:
-- VALE se mantiene como medio independiente.
-- No se fuerza aquí una interpretación adicional sobre
-- si debe considerarse efectivo para el cálculo.
--
-- Los valores pueden ser revisados posteriormente con
-- las reglas definitivas del negocio.
-- ============================================================

INSERT INTO medio_pago (nombre, es_efectivo)
VALUES
    ('Efectivo', TRUE),
    ('Yape BCP', FALSE),
    ('Yape BBVA', FALSE),
    ('Transferencia BCP', FALSE),
    ('Transferencia BBVA', FALSE),
    ('Tarjeta', FALSE)
ON CONFLICT (nombre) DO NOTHING;


-- ============================================================
-- 15. FINALIZACION
-- ============================================================

COMMIT;