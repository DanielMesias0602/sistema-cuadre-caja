import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

import {
  registerEvidencia,
  getEvidenciaById,
  getEvidenciasByOperacion
} from '../services/evidencia.service.js';

import {
  uploadObject,
  deleteObject
} from '../services/ociStorage.service.js';

const optimizarImagen = async (inputPath, outputPath) => {
  await sharp(inputPath)
    .rotate()
    .resize({
      width: 2000,
      height: 2000,
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({
      quality: 82,
      mozjpeg: true
    })
    .toFile(outputPath);
};

export const create = async (req, res, next) => {
  let tempFilePath = null;
  let optimizedFilePath = null;
  let objectName = null;

  try {
    if (!req.file) {
      const error = new Error(
        'El archivo de evidencia es obligatorio'
      );
      error.statusCode = 400;
      throw error;
    }

    tempFilePath = req.file.path;

    const idOperacion = Number(req.body.id_operacion);

    if (!Number.isInteger(idOperacion) || idOperacion <= 0) {
      const error = new Error(
        'id_operacion es obligatorio y debe ser válido'
      );
      error.statusCode = 400;
      throw error;
    }

    const esImagen = req.file.mimetype.startsWith('image/');

    let archivoParaSubir = tempFilePath;
    let contentType = req.file.mimetype;
    let extension = path.extname(req.file.originalname).toLowerCase();

    if (esImagen) {
      optimizedFilePath = `${tempFilePath}-optimized.jpg`;

      await optimizarImagen(
        tempFilePath,
        optimizedFilePath
      );

      archivoParaSubir = optimizedFilePath;
      contentType = 'image/jpeg';
      extension = '.jpg';
    }

    const nombreBase = path.parse(req.file.filename).name;

objectName =
  `evidencias/operacion-${idOperacion}/` +
  `${Date.now()}-${nombreBase}${extension}`;

    await uploadObject({
      objectName,
      filePath: archivoParaSubir,
      contentType
    });

    try {
      const evidencia = await registerEvidencia({
        id_operacion: idOperacion,
        id_usuario: req.user.id_usuario,
        tipo_evidencia: req.body.tipo_evidencia,
        storage_key: objectName,
        fecha_evidencia: req.body.fecha_evidencia,
        observacion: req.body.observacion ?? null
      });

      return res.status(201).json({
        status: 'ok',
        message: 'Evidencia cargada, optimizada y registrada correctamente',
        data: evidencia
      });

    } catch (error) {
      try {
        await deleteObject(objectName);
      } catch (deleteError) {
        console.error(
          'Error al eliminar el objeto OCI después de fallar el registro:',
          deleteError
        );
      }

      throw error;
    }

  } catch (error) {
    next(error);

  } finally {
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }

    if (optimizedFilePath) {
      await fs.unlink(optimizedFilePath).catch(() => {});
    }
  }
};

export const getById = async (req, res, next) => {
  try {
    const evidencia = await getEvidenciaById(req.params.id);

    if (!evidencia) {
      return res.status(404).json({
        status: 'error',
        message: 'Evidencia no encontrada'
      });
    }

    res.json({
      status: 'ok',
      data: evidencia
    });

  } catch (error) {
    next(error);
  }
};

export const getByOperacion = async (req, res, next) => {
  try {
    const evidencias = await getEvidenciasByOperacion(
      req.params.idOperacion
    );

    res.json({
      status: 'ok',
      data: evidencias
    });

  } catch (error) {
    next(error);
  }
};