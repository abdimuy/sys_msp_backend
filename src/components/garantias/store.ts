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
import path from "path";

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
      // Usar el nombre del archivo que Multer ya guardó
      const filename = path.basename(file.path);
      const imgPath = `/uploads/garantias/${filename}`;
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
 * Crea un evento de garantía con imágenes asociadas en una transacción
 * @param idEvento UUID para el evento
 * @param externalId External ID de la garantía
 * @param nuevoEstado Nuevo estado
 * @param fechaEvento Fecha del evento
 * @param comentario Comentario opcional
 * @param filesOnDisk Archivos subidos por Multer
 * @param imagesMetadata Metadata de las imágenes
 */
export async function addGarantiaEventoWithImages(
  idEvento: string,
  externalId: string,
  nuevoEstado: EstadoGarantia,
  fechaEvento: string,
  comentario: string | undefined,
  filesOnDisk: FileWithPath[],
  imagesMetadata: Omit<CreateImagenGarantiaRequest, "imgPath">[]
): Promise<{ evento: GarantiaEventoRow; imagenes: number }> {
  if (!AllowedEstados.includes(nuevoEstado as EstadoGarantia)) {
    throw new Error(`Estado no permitido: ${nuevoEstado}`);
  }

  let db: Firebird.Database | null = null;
  let transaction: Firebird.Transaction | null = null;
  const savedFilePaths = filesOnDisk.map((f) => f.path);

  try {
    db = await getDbConnectionAsync();
    transaction = await getDbTransactionAsync(db);

    // Verificar si el evento ya existe
    const existSql = `
      SELECT FIRST 1 ID
      FROM MSP_GARANTIA_EVENTOS
      WHERE ID = ?
    `;
    const existingEvent: any[] = await queryAsync(transaction, existSql, [idEvento]);
    if (Array.isArray(existingEvent) && existingEvent.length > 0) {
      await rollbackTransactionAsync(transaction);
      await detachDbAsync(db);
      return { evento: existingEvent[0], imagenes: 0 };
    }

    // 1. Actualizar estado de la garantía
    const updateGarantiaSQL = `
      UPDATE MSP_GARANTIAS
      SET ESTADO = ?, FECHA_ULT_ACT = CURRENT_TIMESTAMP
      WHERE EXTERNAL_ID = ?
    `;
    await queryAsync(transaction, updateGarantiaSQL, [nuevoEstado, externalId]);

    // 2. Obtener ID interno de la garantía
    const getIDByExternalIDQuery = `
      SELECT ID
      FROM MSP_GARANTIAS
      WHERE EXTERNAL_ID = ?
    `;
    const garantiaResult = await queryAsync(transaction, getIDByExternalIDQuery, [externalId]);
    const idGarantiaInt = (garantiaResult as any)[0].ID as number;

    // 3. Insertar el evento
    const insertEventoSQL = `
      INSERT INTO MSP_GARANTIA_EVENTOS
        (ID, GARANTIA_ID, TIPO_EVENTO, FECHA_EVENTO, COMENTARIO)
      VALUES (?, ?, ?, ?, ?)
      RETURNING ID, GARANTIA_ID, TIPO_EVENTO, FECHA_EVENTO, COMENTARIO
    `;
    const eventoResult = await queryAsync(transaction, insertEventoSQL, [
      idEvento,
      idGarantiaInt,
      nuevoEstado,
      fechaEvento,
      comentario ?? null,
    ]);
    const evento = (eventoResult as any)[0] as GarantiaEventoRow;

    // 4. Insertar imágenes asociadas al evento
    const insertImagenSql = `
      INSERT INTO MSP_GARANTIA_IMAGENES
        (GARANTIA_ID, IMG_PATH, IMG_MIME, IMG_DESC, EVENTO_ID)
      VALUES (?, ?, ?, ?, ?)
    `;
    for (let i = 0; i < filesOnDisk.length; i++) {
      const file = filesOnDisk[i];
      const meta = imagesMetadata[i];
      // Usar el nombre del archivo que Multer ya guardó
      const filename = path.basename(file.path);
      const imgPath = `/uploads/garantias/${filename}`;

      await queryAsync(transaction, insertImagenSql, [
        idGarantiaInt,
        imgPath,
        meta.imgMime,
        meta.imgDesc,
        idEvento, // Asociar imagen al evento
      ]);
    }

    await commitTransactionAsync(transaction);
    return { evento, imagenes: filesOnDisk.length };
  } catch (err) {
    if (transaction) {
      try {
        await rollbackTransactionAsync(transaction);
      } catch {}
    }
    // Borrar archivos en caso de error
    await Promise.all(
      savedFilePaths.map(async (p) => {
        try {
          await fs.unlink(p);
        } catch {}
      })
    );
    throw err;
  } finally {
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
  externalId: string,
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

    await queryAsync(transaction, updateGarantiaSQL, [nuevoEstado, externalId]);

    const getIDByExternalIDQuery = `
      SELECT ID
      FROM MSP_GARANTIAS
      WHERE EXTERNAL_ID = ?;
    `
    const res = await queryAsync(transaction, getIDByExternalIDQuery, [
      externalId
    ])
    const idGarantiaInt = res[0].ID as number

    // 2. Insertar en eventos
    const insertEventoSQL = `
      INSERT INTO MSP_GARANTIA_EVENTOS
        (ID, GARANTIA_ID, TIPO_EVENTO, FECHA_EVENTO, COMENTARIO)
      VALUES (?, ?, ?, ?, ?)
      RETURNING ID, GARANTIA_ID, TIPO_EVENTO, FECHA_EVENTO, COMENTARIO
    `;

    const result = await queryAsync(transaction, insertEventoSQL, [
      idEvento,
      idGarantiaInt,
      nuevoEstado,
      fechaEvento,
      comentario ?? null,
    ]);
    
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
  const sqlEventos = `
    SELECT
      ID, GARANTIA_ID, TIPO_EVENTO, FECHA_EVENTO, COMENTARIO
    FROM MSP_GARANTIA_EVENTOS
    WHERE GARANTIA_ID = ?
    ORDER BY FECHA_EVENTO DESC
  `;
  const eventos = await query<GarantiaEventoRow>({sql: sqlEventos, params: [garantiaId]});

  // Obtener imágenes para cada evento
  const sqlImagenes = `
    SELECT
      ID, GARANTIA_ID, IMG_PATH, IMG_MIME, IMG_DESC, FECHA_SUBIDA, EVENTO_ID
    FROM MSP_GARANTIA_IMAGENES
    WHERE GARANTIA_ID = ? AND EVENTO_ID = ?
  `;

  for (const evento of eventos) {
    const imagenes = await query<GarantiaImageRow>({
      sql: sqlImagenes,
      params: [garantiaId, evento.ID],
      converters: [{ column: 'IMG_MIME', type: 'buffer' }]
    });
    evento.IMAGENES = imagenes;
  }

  return eventos;
}

async function getEventosGarantiasActivas(): Promise<GarantiaEventoRow[]> {
  const sqlEventos = `
    SELECT
    MSP_GARANTIA_EVENTOS.ID,
    MSP_GARANTIA_EVENTOS.GARANTIA_ID,
    MSP_GARANTIA_EVENTOS.TIPO_EVENTO,
    MSP_GARANTIA_EVENTOS.FECHA_EVENTO,
    MSP_GARANTIA_EVENTOS.COMENTARIO
    FROM MSP_GARANTIA_EVENTOS
    INNER JOIN MSP_GARANTIAS ON MSP_GARANTIAS.ID = MSP_GARANTIA_EVENTOS.GARANTIA_ID
    WHERE MSP_GARANTIAS.ESTADO != 'CANCELADO' AND MSP_GARANTIAS.ESTADO != 'CIERRE_GARANTIA';
  `;
  const eventos = await query<GarantiaEventoRow>({ sql: sqlEventos });

  // Obtener imágenes para cada evento
  const sqlImagenes = `
    SELECT
      ID, GARANTIA_ID, IMG_PATH, IMG_MIME, IMG_DESC, FECHA_SUBIDA, EVENTO_ID
    FROM MSP_GARANTIA_IMAGENES
    WHERE EVENTO_ID = ?
  `;

  for (const evento of eventos) {
    const imagenes = await query<GarantiaImageRow>({
      sql: sqlImagenes,
      params: [evento.ID],
      converters: [{ column: 'IMG_MIME', type: 'buffer' }]
    });
    evento.IMAGENES = imagenes;
  }

  return eventos;
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
