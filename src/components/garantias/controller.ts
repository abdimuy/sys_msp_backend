import store, { addGarantiaWithImages, FileWithPath } from "./store";
import {
  CreateGarantiaRequest,
  CreateImagenGarantiaRequest,
  GarantiaImageRow,
  GarantiaRow,
  UploadedFile,
} from "./types";
import { Request, Response } from "express";

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

export default {
  uploadGarantiaImages,
  addGarantia,
};
