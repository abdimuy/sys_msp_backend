import moment from "moment";
import { query, queryAsync } from "../../repositories/fbRepository";
import {
  CreateGarantiaRequest,
  CreateImagenGarantiaRequest,
  GarantiaImageRow,
  GarantiaRow,
} from "./types";
import {
  getDbConnectionAsync,
  getDbTransactionAsync,
  commitTransactionAsync,
  rollbackTransactionAsync,
  detachDbAsync,
} from "../../repositories/fbRepository";
import Firebird from "node-firebird";
import path from "path";
import fs from "fs/promises";
import { v4 as uuid } from "uuid";

async function addGarantiaImage(
  garantiaId: number,
  imgPath: string,
  imgMime: string,
  imgDesc: string
): Promise<GarantiaImageRow> {
  const sql = `
      INSERT INTO MSP_GARANTIA_IMAGENES
        (GARANTIA_ID, IMG_PATH, IMG_MIME, IMG_DESC, FECHA_SUBIDA)
      VALUES
        (?, ?, ?, ?, ?)
      RETURNING ID, GARANTIA_ID, IMG_PATH, IMG_MIME, IMG_DESC, FECHA_SUBIDA
    `;
  const params = [
    garantiaId,
    imgPath,
    imgMime,
    imgDesc,
    moment().format("YYYY-MM-DD HH:mm:ss"),
  ];

  const res = await query<GarantiaImageRow>({
    sql,
    params,
  });
  const response = res as any;
  return response as GarantiaImageRow;
}

export async function addGarantia(
  data: CreateGarantiaRequest
): Promise<GarantiaRow> {
  const sql = `
    INSERT INTO MSP_GARANTIAS
      (DOCTO_CC_ID, DESCRIPCION_FALLA, OBSERVACIONES)
    VALUES
      (?, ?, ?)
    RETURNING
      ID, DOCTO_CC_ID, 
      FECHA_SOLICITUD, DESCRIPCION_FALLA,
      ESTADO, FECHA_ULT_ACT, OBSERVACIONES
  `;
  const params = [
    data.doctoCcId,
    data.descripcionFalla,
    data.observaciones ?? null,
  ];

  const row: any = await query<GarantiaRow>({ sql, params });
  return row as GarantiaRow;
}

export interface FileWithPath {
  path: string; // ruta absoluta donde Multer guardó el fichero
  mimetype: string;
  originalname: string;
}

export async function addGarantiaWithImages(
  doctoCcId: number,
  descripcionFalla: string,
  observaciones: string | null,
  // aquí pasas los archivos que Multer ya guardó en disco:
  filesOnDisk: FileWithPath[],
  // y además la metadata que guardarás en GARANTIA_IMAGENES
  imagesMetadata: Omit<CreateImagenGarantiaRequest, "imgPath">[],
  externalId: string
): Promise<number> {
  let db: Firebird.Database | null = null;
  let tr: Firebird.Transaction | null = null;
  console.log("filesOnDisk", filesOnDisk);
  const savedFilePaths = filesOnDisk.map((f) => f.path);

  try {
    // 1. BD: abre conexión y transacción
    db = await getDbConnectionAsync();
    tr = await getDbTransactionAsync(db);

    // 2. Inserta la garantía
    const insertGarantiaSql = `
      INSERT INTO MSP_GARANTIAS
        (DOCTO_CC_ID, DESCRIPCION_FALLA, OBSERVACIONES, FECHA_SOLICITUD, ESTADO, EXTERNAL_ID)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING ID
    `;
    const garantiaRes: any = await queryAsync(tr, insertGarantiaSql, [
      doctoCcId,
      descripcionFalla,
      observaciones,
      moment().format("YYYY-MM-DD HH:mm:ss"),
      "PENDIENTE",
      externalId,
    ]);
    const garantiaId: number = garantiaRes.ID;

    // 3. Inserta cada fila en GARANTIA_IMAGENES
    const insertImagenSql = `
      INSERT INTO MSP_GARANTIA_IMAGENES
        (GARANTIA_ID, IMG_PATH, IMG_MIME, IMG_DESC)
      VALUES (?, ?, ?, ?)
    `;
    console.log("filesOnDisk", filesOnDisk);
    for (let i = 0; i < filesOnDisk.length; i++) {
      const file = filesOnDisk[i];
      const meta = imagesMetadata[i];
      const uniqueId = uuid();
      // asume que imgPath = URL pública; construyela aquí si quieres:
      const imgPath = `/uploads/garantias/${uniqueId}${path.extname(
        file.originalname
      )}`;

      await queryAsync(tr, insertImagenSql, [
        garantiaId,
        imgPath,
        meta.imgMime,
        meta.imgDesc,
      ]);
    }

    // 4. Commit BD
    await commitTransactionAsync(tr);
    return garantiaId;
  } catch (err) {
    // rollback BD
    if (tr) {
      try {
        await rollbackTransactionAsync(tr);
      } catch {}
    }
    // además: borra TODOS los archivos que Multer haya escrito
    await Promise.all(
      savedFilePaths.map(async (p) => {
        try {
          await fs.unlink(p);
        } catch {
          /* ignora */
        }
      })
    );
    throw err;
  } finally {
    // cierra BD
    if (db) {
      try {
        await detachDbAsync(db);
      } catch {}
    }
  }
}

export default {
  addGarantiaImage,
  addGarantia,
};
