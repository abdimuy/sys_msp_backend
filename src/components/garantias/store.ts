import moment from "moment";
import { query, queryAsync } from "../../repositories/fbRepository";
import {
  AllowedEstados,
  CreateGarantiaRequest,
  CreateImagenGarantiaRequest,
  EstadoGarantia,
  GarantiaEventoRow,
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
import fs from "fs/promises";

async function getGarantiasActivas(): Promise<GarantiaRow[]> {
  const sql = `
  SELECT ID, MSP_GARANTIAS.DOCTO_CC_ID, FECHA_SOLICITUD, DESCRIPCION_FALLA,
    ESTADO, FECHA_ULT_ACT, OBSERVACIONES, EXTERNAL_ID, ZONAS_CLIENTES.ZONA_CLIENTE_ID, ZONAS_CLIENTES.NOMBRE AS ZONA_CLIENTE_NOMBRE
  FROM MSP_GARANTIAS
  INNER JOIN DOCTOS_CC ON DOCTOS_CC.DOCTO_CC_ID = MSP_GARANTIAS.DOCTO_CC_ID
  INNER JOIN CLIENTES ON CLIENTES.CLIENTE_ID = DOCTOS_CC.CLIENTE_ID
  INNER JOIN ZONAS_CLIENTES ON ZONAS_CLIENTES.ZONA_CLIENTE_ID = CLIENTES.ZONA_CLIENTE_ID
  WHERE ESTADO != 'CANCELADO' AND ESTADO != 'CIERRE_GARANTIA'
  `;

  const params: any[] = [];

  const rows = await query<GarantiaRow>({ sql, params, converters: [{column: "ZONA_CLIENTE_NOMBRE", type: "buffer"}] });
  return rows as GarantiaRow[];
}

async function getGarantiaById(idGarantia: number): Promise<GarantiaRow> {
  const sql = `
    SELECT ID, DOCTO_CC_ID, FECHA_SOLICITUD, DESCRIPCION_FALLA,
      ESTADO, FECHA_ULT_ACT, OBSERVACIONES, EXTERNAL_ID
    FROM MSP_GARANTIAS
    WHERE ID = ?
  `
  const params = [idGarantia]

  const rows = await query({
    sql,
    params
  })
  const res = rows[0] as any

  if(!res) {
    throw new Error("No existe una garantia con ese ID")
  }

  return res as GarantiaRow
}

async function getImagesByGarantia(garantiaId) {
  const sql = `
    SELECT
      ID, GARANTIA_ID, IMG_PATH, IMG_MIME, IMG_DESC, FECHA_SUBIDA
    FROM
      MSP_GARANTIA_IMAGENES
    WHERE GARANTIA_ID = ?
  `;

  const params = [garantiaId]

  const rows = await query({
    sql,
    params,
    converters: [
      {
        column: 'IMG_MIME',
        type: 'buffer'
      }
    ]
  })

  return rows
}

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
  const savedFilePaths = filesOnDisk.map((f) => f.path);

  try {
    // 1. BD: abre conexión y transacción
    db = await getDbConnectionAsync();
    tr = await getDbTransactionAsync(db);

    const existSql = `
      SELECT FIRST 1 ID
      FROM MSP_GARANTIAS
      WHERE EXTERNAL_ID = ?
    `;
    // Query devuelve un array de filas
    const rows: any[] = await queryAsync(tr, existSql, [externalId]);
    if (Array.isArray(rows) && rows.length > 0) {
      // Abortamos insert y devolvemos ID existente
      await rollbackTransactionAsync(tr);
      await detachDbAsync(db);
      return rows[0].ID;
    }

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
    for (let i = 0; i < filesOnDisk.length; i++) {
      const file = filesOnDisk[i];
      const meta = imagesMetadata[i];
      // asume que imgPath = URL pública; construyela aquí si quieres:
      const imgPath = `/uploads/garantias/garantia-${doctoCcId}-${
        file.originalname
      }`;
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

/**
 * Actualiza el estado de la garantía y registra el evento en una transacción.
 * @param idEvento UUID para el evento
 * @param garantiaId ID de la garantía
 * @param nuevoEstado Nuevo estado de la garantía
 * @param fechaEvento Fecha del evento (ISO string)
 * @param comentario Comentario opcional para el evento
 */
export async function addGarantiaEvento(
  idEvento: string,
  garantiaId: string,
  nuevoEstado: EstadoGarantia,
  fechaEvento: string,
  comentario?: string
): Promise<GarantiaEventoRow> {
  if (!AllowedEstados.includes(nuevoEstado as EstadoGarantia)) {
    throw new Error(`Estado no permitido: ${nuevoEstado}`);
  }

  let db: Firebird.Database;
  let transaction: Firebird.Transaction;

  try {
    db = await getDbConnectionAsync();
    transaction = await getDbTransactionAsync(db);

    const existSql = `
      SELECT FIRST 1 ID
      FROM MSP_GARANTIA_EVENTOS
      WHERE ID = ?
    `;
    // Query devuelve un array de filas
    const rows: any[] = await queryAsync(transaction, existSql, [idEvento]);
    if (Array.isArray(rows) && rows.length > 0) {
      // Abortamos insert y devolvemos ID existente
      await rollbackTransactionAsync(transaction);
      await detachDbAsync(db);
      return rows[0].ID;
    }

    // 1. Actualizar estado de la garantía
    const updateGarantiaSQL = `
      UPDATE MSP_GARANTIAS
      SET ESTADO = ?, FECHA_ULT_ACT = CURRENT_TIMESTAMP
      WHERE EXTERNAL_ID = ?
    `;
    console.log("updateGarantiaSQL", updateGarantiaSQL)
    console.log("nuevoEstado", nuevoEstado)
    console.log("garantiaId", garantiaId)

    await queryAsync(transaction, updateGarantiaSQL, [nuevoEstado, garantiaId]);

    const getIDByExternalIDQuery = `
      SELECT ID
      FROM MSP_GARANTIAS
      WHERE EXTERNAL_ID = ?;
    `
    console.log("getIDByExternalIDQuery", getIDByExternalIDQuery)
    const res = await queryAsync(transaction, getIDByExternalIDQuery, [
      garantiaId
    ])
    const idGarantiaInt = res[0].ID as number

    // 2. Insertar en eventos
    const insertEventoSQL = `
      INSERT INTO MSP_GARANTIA_EVENTOS
        (ID, GARANTIA_ID, TIPO_EVENTO, FECHA_EVENTO, COMENTARIO)
      VALUES (?, ?, ?, ?, ?)
      RETURNING ID, GARANTIA_ID, TIPO_EVENTO, FECHA_EVENTO, COMENTARIO
    `;
    console.log("insertEventoSQL", insertEventoSQL)

    const result = await queryAsync(transaction, insertEventoSQL, [
      idEvento,
      idGarantiaInt,
      nuevoEstado,
      fechaEvento,
      comentario ?? null,
    ]);
    console.log("result", result)

    await commitTransactionAsync(transaction);
    return result[0] as GarantiaEventoRow;

  } catch (error) {
    if (transaction) await rollbackTransactionAsync(transaction);
    throw error;
  } finally {
    if (db) await detachDbAsync(db);
  }
}

/**
 * Actualiza el estado de una garantía si es válido
 * @param id ID de la garantía
 * @param nuevoEstado Estado a asignar
 */
async function actualizarEstadoGarantia(id: number, nuevoEstado: string): Promise<void> {
  if (!AllowedEstados.includes(nuevoEstado as EstadoGarantia)) {
    throw new Error(`Estado no permitido: ${nuevoEstado}`);
  }

  const sql = `
    UPDATE MSP_GARANTIAS
    SET ESTADO = ?, FECHA_ULT_ACT = CURRENT_TIMESTAMP
    WHERE ID = ?
  `;

  await query({sql, params: [nuevoEstado, id]});
}

export async function getEventosByGarantia(
  garantiaId: number
): Promise<GarantiaEventoRow[]> {
  const sql = `
    SELECT
      ID, GARANTIA_ID, TIPO_EVENTO, FECHA_EVENTO, COMENTARIO
    FROM MSP_GARANTIA_EVENTOS
    WHERE GARANTIA_ID = ?
    ORDER BY FECHA_EVENTO DESC
  `;
  const rows = await query<GarantiaEventoRow>({sql, params: [garantiaId]});
  return rows;
}

async function getEventosGarantiasActivas(): Promise<GarantiaEventoRow[]> {
  const sql = `
    SELECT
    MSP_GARANTIA_EVENTOS.ID,
    MSP_GARANTIA_EVENTOS.GARANTIA_ID,
    MSP_GARANTIA_EVENTOS.TIPO_EVENTO,
    MSP_GARANTIA_EVENTOS.FECHA_EVENTO,
    MSP_GARANTIA_EVENTOS.COMENTARIO
    FROM MSP_GARANTIA_EVENTOS
    INNER JOIN MSP_GARANTIAS ON MSP_GARANTIAS.ID = MSP_GARANTIA_EVENTOS.GARANTIA_ID
    WHERE MSP_GARANTIAS.ESTADO != 'CANCELADO' AND MSP_GARANTIAS.ESTADO != 'CIERRE_GARANTIA';
  `
  const rows = await query<GarantiaEventoRow>({
    sql: sql,
  })
  const res = rows as any

  return res as GarantiaEventoRow[]
}

export default {
  addGarantiaImage,
  addGarantia,
  getGarantiasActivas,
  getEventosGarantiasActivas,
  getGarantiaById,
  getImagesByGarantia,
  actualizarEstadoGarantia
};
