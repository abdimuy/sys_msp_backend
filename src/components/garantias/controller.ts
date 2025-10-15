import store, { addGarantiaWithImages, FileWithPath, addGarantiaEvento,
  getEventosByGarantia, addGarantiaEventoWithImages } from "./store";
import {
  CreateGarantiaRequest,
  CreateImagenGarantiaRequest,
  GarantiaImageRow,
  GarantiaRow,
  UploadedFile,
  AllowedEstados,
  EstadoGarantia
} from "./types";
import { Request, Response } from "express";
import responses from "../../network/responses";
import handleError from "../../network/handleError";

const getGarantiasActivas = async (): Promise<GarantiaRow[]> => {
  return store.getGarantiasActivas();
};

const addGarantia = async (
  data: CreateGarantiaRequest
): Promise<GarantiaRow> => {
  const { doctoCcId, descripcionFalla } = data;
  if (!Number.isInteger(doctoCcId) || doctoCcId <= 0) {
    throw new Error("ID de documento inválido");
  }
  if (!descripcionFalla || descripcionFalla.trim() === "") {
    throw new Error("Descripción de falla es obligatoria");
  }

  const row = await store.addGarantia(data);

  return row;
};

export async function uploadGarantiaImages(
  garantiaId: number,
  files: UploadedFile[]
): Promise<GarantiaImageRow[]> {
  if (!Number.isInteger(garantiaId) || garantiaId <= 0) {
    throw new Error("ID de garantía inválido");
  }
  if (!files || files.length === 0) {
    throw new Error("No se recibieron archivos para procesar");
  }

  const insertedRows: GarantiaImageRow[] = [];

  for (const file of files) {
    const imgPath = `/uploads/garantias/${file.filename}`;
    const imgMime = file.mimetype;
    const imgDesc = file.originalname;

    const row = await store.addGarantiaImage(
      garantiaId,
      imgPath,
      imgMime,
      imgDesc
    );

    insertedRows.push(row);
  }

  return insertedRows;
}

export async function createGarantiaWithImages(req: Request, res: Response) {
  const garantiaIdParam = Number(req.params.id);
  if (!Number.isInteger(garantiaIdParam) || garantiaIdParam <= 0) {
    return res.status(400).json({ error: "ID de garantía inválido" });
  }

  // Multer dejó los ficheros en disco en req.files
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No se recibieron imágenes" });
  }

  // Datos extra que envías en el body (pueden venir en multipart)
  const descripcionFalla = String(req.body.descripcionFalla ?? "");
  const observaciones = req.body.observaciones
    ? String(req.body.observaciones)
    : null;
  const externalId = req.body.externalId ? String(req.body.externalId) : null;

  // Prepara arrays para la transacción
  const filesOnDisk: FileWithPath[] = files.map((f) => ({
    path: f.path,
    mimetype: f.mimetype,
    originalname: f.originalname,
  }));

  const imagesMetadata: Omit<CreateImagenGarantiaRequest, "imgPath">[] =
    files.map((f) => ({
      imgMime: f.mimetype,
      imgDesc: f.originalname,
    }));

  try {
    const newGarantiaId = await addGarantiaWithImages(
      garantiaIdParam,
      descripcionFalla,
      observaciones,
      filesOnDisk,
      imagesMetadata,
      externalId
    );
    return res.status(201).json({ id: newGarantiaId });
  } catch (error: any) {
    // addGarantiaWithImages ya limpió rollback y borró ficheros
    return res.status(500).json({ error: error.message });
  }
}

export async function createGarantiaEvento(req: Request, res: Response) {
  try {
    const externalId = req.params.id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!externalId || !uuidRegex.test(externalId)) {
      return responses.error({
        req,
        res,
        status: 400,
        error: 'External ID de garantía inválido',
        details: `Param id="${req.params.id}" no es un UUID válido`
      });
    }

    const { tipoEvento, fechaEvento, comentario, id } = req.body;

    if (
      typeof tipoEvento !== 'string' ||
      !AllowedEstados.includes(tipoEvento as EstadoGarantia)
    ) {
      return responses.error({
        req,
        res,
        status: 400,
        error: 'tipoEvento inválido',
        details: `Debe ser uno de: ${AllowedEstados.join(', ')}`
      });
    }

    if (typeof fechaEvento !== 'string' || isNaN(Date.parse(fechaEvento))) {
      return responses.error({
        req,
        res,
        status: 400,
        error: 'fechaEvento inválido',
        details: `Valor recibido: "${fechaEvento}"`
      });
    }

    const newEvent = await addGarantiaEvento(
      id,
      externalId,
      tipoEvento as EstadoGarantia,
      fechaEvento,
      comentario ? String(comentario).toUpperCase() : undefined
    );

    return responses.success({
      req,
      res,
      status: 201,
      data: newEvent
    });
  } catch (err: any) {
    handleError(err);
    return responses.error({
      req,
      res,
      status: 500,
      error: 'Error interno al crear evento',
      details: err.message
    });
  }
}

export async function createGarantiaEventoWithImages(req: Request, res: Response) {
  try {
    const externalId = req.params.id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!externalId || !uuidRegex.test(externalId)) {
      return responses.error({
        req,
        res,
        status: 400,
        error: 'External ID de garantía inválido',
        details: `Param id="${req.params.id}" no es un UUID válido`
      });
    }

    // Obtener archivos subidos por Multer
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      return responses.error({
        req,
        res,
        status: 400,
        error: 'No se recibieron imágenes',
        details: 'El endpoint requiere al menos una imagen'
      });
    }

    // Extraer campos del body (vienen en multipart)
    const { tipoEvento, fechaEvento, comentario, id } = req.body;

    if (
      typeof tipoEvento !== 'string' ||
      !AllowedEstados.includes(tipoEvento as EstadoGarantia)
    ) {
      return responses.error({
        req,
        res,
        status: 400,
        error: 'tipoEvento inválido',
        details: `Debe ser uno de: ${AllowedEstados.join(', ')}`
      });
    }

    if (typeof fechaEvento !== 'string' || isNaN(Date.parse(fechaEvento))) {
      return responses.error({
        req,
        res,
        status: 400,
        error: 'fechaEvento inválido',
        details: `Valor recibido: "${fechaEvento}"`
      });
    }

    // Preparar datos para la transacción
    const filesOnDisk: FileWithPath[] = files.map((f) => ({
      path: f.path,
      mimetype: f.mimetype,
      originalname: f.originalname,
    }));

    const imagesMetadata: Omit<CreateImagenGarantiaRequest, "imgPath">[] =
      files.map((f) => ({
        imgMime: f.mimetype,
        imgDesc: f.originalname,
      }));

    const result = await addGarantiaEventoWithImages(
      id,
      externalId,
      tipoEvento as EstadoGarantia,
      fechaEvento,
      comentario ? String(comentario).toUpperCase() : undefined,
      filesOnDisk,
      imagesMetadata
    );

    return responses.success({
      req,
      res,
      status: 201,
      data: result
    });
  } catch (err: any) {
    handleError(err);
    return responses.error({
      req,
      res,
      status: 500,
      error: 'Error interno al crear evento con imágenes',
      details: err.message
    });
  }
}

export async function listGarantiaEventos(req: Request, res: any) {
  try {
    const garantiaId = Number(req.params.id);
    if (!Number.isInteger(garantiaId) || garantiaId <= 0) {
      return responses.error({
        req,
        res,
        status: 400,
        error: 'ID de garantía inválido',
        details: `Param id="${req.params.id}" no es un entero válido`
      });
    }

    const events = await getEventosByGarantia(garantiaId);
    return responses.success({
      req,
      res,
      data: events
    });
  } catch (err: any) {
    handleError(err);
    return responses.error({
      req,
      res,
      status: 500,
      error: 'Error interno al listar eventos',
      details: err.message
    });
  }
}

async function getEventosGarantiasActivas(req: Request, res: Response) {
  try {
    const events = await store.getEventosGarantiasActivas();
    return responses.success({
      req,
      res,
      data: events
    });
  } catch (err) {
    handleError(err);
    return responses.error({
      req,
      res,
      status: 500,
      error: 'Error interno al listar eventos',
      details: err.message
    });
  }
}

async function getGarantiaById(req: Request, res: Response) {
  const {
    idGarantia
  } = req.params
  try {
    const garantia = await store.getGarantiaById(Number(idGarantia));
    return responses.success({
      req,
      res,
      data: garantia
    });
  } catch (err) {
    handleError(err);
    return responses.error({
      req,
      res,
      status: 500,
      error: 'Error interno al obtener la garantia',
      details: err.message
    });
  }
}

async function getImagesByGarantia(req: Request, res: Response) {
  const {
    garantiaId
  } = req.params
  try {
    const garantia = await store.getImagesByGarantia(Number(garantiaId));
    return responses.success({
      req,
      res,
      data: garantia
    });
  } catch (err) {
    handleError(err);
    return responses.error({
      req,
      res,
      status: 500,
      error: 'Error interno al obtener las imagenes de la garantia',
      details: err.message
    });
  }
}

const actualizarEstadoGarantiaController = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { estado } = req.body;

  if (!id || isNaN(Number(id))) {
    return responses.error({
      req,
      res,
      status: 400,
      error: 'ID inválido',
      details: `Se recibió id = ${id}`
    });
  }

  if (!estado || typeof estado !== 'string') {
    return responses.error({
      req,
      res,
      status: 400,
      error: 'El estado es requerido y debe ser un string',
      details: `estado recibido = ${estado}`
    });
  }

  if (!AllowedEstados.includes(estado as any)) {
    return responses.error({
      req,
      res,
      status: 400,
      error: `Estado no permitido: ${estado}`,
      details: `Estado recibido no está en AllowedEstados`
    });
  }

  try {
    await store.actualizarEstadoGarantia(Number(id), estado);
    return responses.success({
      req,
      res,
      status: 200,
      data: { mensaje: 'Estado actualizado correctamente' }
    });
  } catch (err: any) {
    return responses.error({
      req,
      res,
      status: 500,
      error: 'Error interno al actualizar el estado',
      details: err.message || 'Error desconocido'
    });
  }
};


export default {
  uploadGarantiaImages,
  addGarantia,
  getGarantiasActivas,
  getEventosGarantiasActivas,
  getGarantiaById,
  getImagesByGarantia,
  createGarantiaEventoWithImages
};
