import { query } from './base.repository.js';

export const createEvidencia = async ({
  id_operacion,
  id_usuario,
  tipo_evidencia,
  storage_key,
  fecha_evidencia,
  observacion = null,
  texto_ocr = null,
  datos_ocr = null
}, client = null) => {
  const executor = client ?? { query };
  const result = await executor.query(
    `INSERT INTO evidencia 
       (id_operacion, id_usuario, tipo_evidencia, storage_key, fecha_evidencia, observacion, texto_ocr, datos_ocr) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
     RETURNING id_evidencia, id_operacion, id_usuario, tipo_evidencia, storage_key, fecha_evidencia, observacion, texto_ocr, datos_ocr, fecha_registro`,
    [id_operacion, id_usuario, tipo_evidencia, storage_key, fecha_evidencia, observacion, texto_ocr, datos_ocr]
  );

  return result.rows[0];
};

export const findEvidenciaById = async (idEvidencia) => {
  const result = await query(
    `SELECT
       id_evidencia,
       id_operacion,
       id_usuario,
       tipo_evidencia,
       storage_key,
       fecha_evidencia,
       observacion,
       texto_ocr,
       datos_ocr,
       fecha_registro
     FROM evidencia
     WHERE id_evidencia = $1`,
    [idEvidencia]
  );

  return result.rows[0] ?? null;
};

export const findEvidenciasByOperacion = async (idOperacion) => {
  const result = await query(
    `SELECT
       id_evidencia,
       id_operacion,
       id_usuario,
       tipo_evidencia,
       storage_key,
       fecha_evidencia,
       observacion,
       texto_ocr,
       datos_ocr,
       fecha_registro
     FROM evidencia
     WHERE id_operacion = $1
     ORDER BY id_evidencia`,
    [idOperacion]
  );

  return result.rows;
};