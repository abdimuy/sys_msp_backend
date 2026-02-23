import { AggregateOptions } from "mongodb";
import { IQueryConverter, query } from "../../repositories/fbRepository";
import { aggregateCollection, connectToMongo } from "../../repositories/mongoConnection";
import { QUERY_GET_PAGOS_BY_VENTAS_ID } from "../ventas/queries";
import { QUERY_EXIST_UNIQUE_ID_PAGO } from "./queries";
import { clientesConverters, doctosCcConverters, formasCobroDoctos, importesDoctosCcConverters, mspPagosRecibidos } from "../sincronizarAMongo/store/converters";

const getPagosByVentaId = (id: number) => {
    return new Promise((resolve, reject) => {
        query({
            sql: QUERY_GET_PAGOS_BY_VENTAS_ID,
            params: [id],
            converters: [
                {
                    column: "FOLIO",
                    type: "buffer"
                },
                {
                    column: "CONCEPTO",
                    type: "buffer",
                },
                {
                    column: "CANCELADO",
                    type: "buffer",
                },
                {
                    column: "APLICADO",
                    type: "buffer",
                },
                {
                    column: "ESTATUS",
                    type: "buffer",
                },
                {
                    column: "LAT", 
                    type: "buffer",
                },
                {
                    column: "LON",
                    type: "buffer"
                }
            ]
        }).then((pagos) => {
            resolve(pagos)
        }).catch((err) => {
            reject(err)
        })
    })
}

const existUniqueIdPago = (id: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        query({
            sql: QUERY_EXIST_UNIQUE_ID_PAGO,
            params: [id]
        }).then((response) => {
            if(response.length === 0) {
                resolve(false)
            }
            resolve(true)
        }).catch(err => {
            reject('Error al obtener la existencia del pago')
        })
    })
}

const getPagosByVentaIdsMongo = async (ventasIds: number[]) => {
    const pipeline = [
        {
          $match: {
            DOCTO_CC_ACR_ID: {
              $in: ventasIds.length === 0 ? [0] : ventasIds
            }
          }
        },
        {
          $lookup: {
            from: 'doctos_cc',
            localField: 'DOCTO_CC_ID',
            foreignField: 'DOCTO_CC_ID',
            as: 'doctos'
          }
        },
        { $unwind: '$doctos' },
        {
          $match: {
            'doctos.CANCELADO': 'N',
            'doctos.CONCEPTO_CC_ID': { $in: [87327, 27969] }
          }
        },
        {
          $lookup: {
            from: 'msp_pagos_recibidos',
            localField: 'doctos.DOCTO_CC_ID',
            foreignField: 'DOCTO_CC_ID',
            as: 'pagos'
          }
        },
        {
          $unwind: { path: '$pagos', preserveNullAndEmptyArrays: true }
        },
        {
          $lookup: {
            from: 'formas_cobro_doctos',
            localField: 'doctos.DOCTO_CC_ID',
            foreignField: 'DOCTO_ID',
            as: 'formasCobro'
          }
        },
        {
          $unwind: { path: '$formasCobro', preserveNullAndEmptyArrays: true }
        },
        {
          $lookup: {
            from: 'clientes',
            localField: 'doctos.CLIENTE_ID',
            foreignField: 'CLIENTE_ID',
            as: 'clientes'
          }
        },
        {
          $unwind: { path: '$clientes', preserveNullAndEmptyArrays: true }
        },
        {
          $project: {
            _id: 0,
            ID: {
              $ifNull: [
                '$pagos.ID',
                {
                  $concat: [
                    { $toString: '$doctos.DOCTO_CC_ID' },
                    '-',
                    { $toString: '$IMPTE_DOCTO_CC_ID' }
                  ]
                }
              ]
            },
            COBRADOR: { $ifNull: ['$doctos.DESCRIPCION', ''] },
            DOCTO_CC_ACR_ID: '$DOCTO_CC_ACR_ID',
            DOCTO_CC_ID: '$doctos.DOCTO_CC_ID',
            FECHA_HORA_PAGO: {
              $ifNull: [
                '$pagos.FECHA',
                {
                  $dateAdd: {
                    startDate: {
                      $dateAdd: {
                        startDate: {
                          $dateAdd: {
                            startDate: '$doctos.FECHA',
                            unit: 'hour',
                            amount: { $hour: '$doctos.HORA' }
                          }
                        },
                        unit: 'minute',
                        amount: { $minute: '$doctos.HORA' }
                      }
                    },
                    unit: 'second',
                    amount: { $second: '$doctos.HORA' }
                  }
                }
              ]
            },
            GUARDADO_EN_MICROSIP: { $literal: true },
            IMPORTE: { $add: ['$IMPORTE', '$IMPUESTO'] },
            LAT: { $ifNull: ['$doctos.LAT', ''] },
            LNG: { $ifNull: ['$doctos.LON', ''] },
            CLIENTE_ID: '$doctos.CLIENTE_ID',
            COBRADOR_ID: "$doctos.COBRADOR_ID",
            FORMA_COBRO_ID: { $ifNull: ['$formasCobro.FORMA_COBRO_ID', 0] },
            ZONA_CLIENTE_ID: { $literal: 0 },
            NOMBRE_CLIENTE: '$clientes.NOMBRE'
          }
        }
      ];

    const startTime = Date.now();

    const options: AggregateOptions = { maxTimeMS: 300000, allowDiskUse: true };
    const pagos = await aggregateCollection('importes_doctos_cc', pipeline, options);

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`Consulta completada en ${duration} ms`);
    console.log(`Cantidad de resultados: ${pagos.length}`);

    return pagos
}

async function getUnprocessedChanges(limit: number = 500): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT FIRST ${limit} LOG_ID, TABLE_NAME, RECORD_ID, OPERATION, CHANGE_TIMESTAMP
      FROM MSP_CHANGE_LOG
      WHERE PROCESSED = 0
      ORDER BY CHANGE_TIMESTAMP
    `;
    
    resolve(
      query({
        sql: sql,
        converters: [
          {
            column: 'TABLE_NAME',
            type: 'buffer'
          },
          {
            column: "RECORD_ID",
            type: 'buffer',
          },
          {
            column: "OPERATION",
            type: 'buffer'
          }
        ]
      })
    )
  });
}

async function markChangeAsProcessed(logId: number): Promise<any> {
  return new Promise((resolve, reject) => {
    const sql = `UPDATE MSP_CHANGE_LOG SET PROCESSED = 1 WHERE LOG_ID = ?`;
    resolve(query({
      sql,
      params: [logId]
    }))
  });
}

async function getRecordFromFirebird(table: string, recordId: string | number): Promise<any> {
  return new Promise((resolve, reject) => {
    let sql = '';
    let converter: IQueryConverter[] = []
    switch (table) {
      case 'DOCTOS_CC':
        recordId = Number(recordId)
        sql = `SELECT * FROM DOCTOS_CC WHERE DOCTO_CC_ID = ?`;
        converter = doctosCcConverters
        break;
      case 'IMPORTES_DOCTOS_CC':
        recordId = Number(recordId)
        sql = `SELECT * FROM IMPORTES_DOCTOS_CC WHERE IMPTE_DOCTO_CC_ID = ?`;
        converter = importesDoctosCcConverters
        break;
      case 'MSP_PAGOS_RECIBIDOS':
        sql = `SELECT * FROM MSP_PAGOS_RECIBIDOS WHERE ID = ?`;
        converter = mspPagosRecibidos
        break;
      case 'FORMAS_COBRO_DOCTOS':
        recordId = Number(recordId);
        sql = `SELECT * FROM FORMAS_COBRO_DOCTOS WHERE FORMA_COBRO_DOC_ID = ?`;
        converter = formasCobroDoctos
        break;
      case 'CLIENTES':
        recordId = Number(recordId);
        sql = "SELECT * FROM CLIENTES WHERE CLIENTE_ID = ?"
        converter = clientesConverters;
        break;
      default:
        return reject(new Error('Tabla no soportada'));
    }
    resolve(query({
      sql: sql,
      converters: converter,
      params: [recordId]
    }))
  });
}

let isSyncing = false;

async function syncChangesToMongo() {
  if (isSyncing) {
    console.log('⚠️  Sincronización ya en proceso, saltando esta ejecución...');
    return;
  }
  
  try {
    isSyncing = true;
    
    const changes = await getUnprocessedChanges(500);
    if (changes.length === 0) {
      isSyncing = false;
      return;
    }
    
    const startTime = Date.now();

    const db = await connectToMongo();

    const changesByTable = new Map<string, {
      records: Map<string, any>,
      logIds: number[]
    }>();

    for (const change of changes) {
      const { TABLE_NAME, RECORD_ID, LOG_ID, OPERATION, CHANGE_TIMESTAMP } = change;

      if (!changesByTable.has(TABLE_NAME)) {
        changesByTable.set(TABLE_NAME, {
          records: new Map(),
          logIds: []
        });
      }

      const tableData = changesByTable.get(TABLE_NAME)!;
      const recordKey = `${RECORD_ID}_${OPERATION}`;

      if (!tableData.records.has(recordKey) ||
          new Date(CHANGE_TIMESTAMP) > new Date(tableData.records.get(recordKey).CHANGE_TIMESTAMP)) {
        tableData.records.set(recordKey, change);
      }

      tableData.logIds.push(LOG_ID);
    }

    let totalInsertados = 0;
    let totalActualizados = 0;
    let totalEliminados = 0;
    let totalYaSincronizados = 0;
    let totalErrores = 0;

    for (const [TABLE_NAME, tableData] of changesByTable.entries()) {
      const collectionName = TABLE_NAME.toLowerCase();
      const collection = db.collection(collectionName);

      const idFieldNames: { [key: string]: string } = {
        doctos_cc: 'DOCTO_CC_ID',
        importes_doctos_cc: 'IMPTE_DOCTO_CC_ID',
        msp_pagos_recibidos: 'ID',
        formas_cobro_doctos: 'FORMA_COBRO_DOC_ID',
        clientes: 'CLIENTE_ID'
      };
      const idFieldName = idFieldNames[collectionName];

      const deleteOps: any[] = [];
      const upsertRecordIds: (string | number)[] = [];
      const operations = Array.from(tableData.records.values());

      for (const op of operations) {
        const recordId = ['msp_pagos_recibidos'].includes(collectionName)
          ? op.RECORD_ID
          : Number(op.RECORD_ID);

        if (op.OPERATION === 'DELETE') {
          deleteOps.push(recordId);
        } else {
          upsertRecordIds.push(recordId);
        }
      }

      if (deleteOps.length > 0) {
        try {
          const result = await collection.deleteMany({
            [idFieldName]: { $in: deleteOps }
          });
          totalEliminados += result.deletedCount;
        } catch (error) {
          totalErrores++;
          console.error(`Error al eliminar registros de ${collectionName}:`, error);
        }
      }

      const BATCH_SIZE = 100;

      for (let i = 0; i < upsertRecordIds.length; i += BATCH_SIZE) {
        const batchIds = upsertRecordIds.slice(i, i + BATCH_SIZE);
        const bulkOps: any[] = [];

        for (const recordId of batchIds) {
          try {
            const records = await getRecordFromFirebird(TABLE_NAME, recordId);
            if (records && records[0]) {
              bulkOps.push({
                updateOne: {
                  filter: { [idFieldName]: recordId },
                  update: { $set: records[0] },
                  upsert: true
                }
              });
            }
          } catch (error) {
            totalErrores++;
            console.error(`Error al obtener registro ${TABLE_NAME} ID: ${recordId}`, error);
          }
        }

        if (bulkOps.length > 0) {
          try {
            const result = await collection.bulkWrite(bulkOps, { ordered: false });
            totalInsertados += result.upsertedCount;
            totalActualizados += result.modifiedCount;
            totalYaSincronizados += bulkOps.length - result.upsertedCount - result.modifiedCount;
          } catch (bulkError: any) {
            totalErrores++;
            console.error(`${collectionName}: Error en bulk:`, bulkError.message || bulkError);
          }
        }
      }

      const MARK_BATCH_SIZE = 200;
      for (let i = 0; i < tableData.logIds.length; i += MARK_BATCH_SIZE) {
        const batchLogIds = tableData.logIds.slice(i, i + MARK_BATCH_SIZE);
        await markChangesAsProcessedBatch(batchLogIds);
      }
    }

    const duration = Date.now() - startTime;
    const partes: string[] = [];
    if (totalInsertados > 0) partes.push(`${totalInsertados} insertados`);
    if (totalActualizados > 0) partes.push(`${totalActualizados} actualizados`);
    if (totalEliminados > 0) partes.push(`${totalEliminados} eliminados`);
    if (totalYaSincronizados > 0) partes.push(`${totalYaSincronizados} ya sincronizados`);
    if (totalErrores > 0) partes.push(`${totalErrores} errores`);
    const resumen = partes.length > 0 ? partes.join(', ') : 'sin cambios nuevos';
    console.log(`Sync ciclo: ${changes.length} cambios procesados → ${resumen} (${(duration / 1000).toFixed(1)}s)`);
  } catch (error) {
    console.error('Error en la sincronización:', error);
  } finally {
    isSyncing = false;
  }
}

async function markChangesAsProcessedBatch(logIds: number[]): Promise<any> {
  if (logIds.length === 0) return;
  
  return new Promise((resolve, reject) => {
    const placeholders = logIds.map(() => '?').join(',');
    const sql = `UPDATE MSP_CHANGE_LOG SET PROCESSED = 1 WHERE LOG_ID IN (${placeholders})`;
    resolve(query({
      sql,
      params: logIds
    }));
  });
}

async function syncPagoInmediato(doctoCCId: number, mspPagoId: string): Promise<number> {
  const startTime = Date.now();
  const db = await connectToMongo();

  const tasks = [
    { table: 'DOCTOS_CC', collection: 'doctos_cc', sql: 'SELECT * FROM DOCTOS_CC WHERE DOCTO_CC_ID = ?', param: doctoCCId, converter: doctosCcConverters, idField: 'DOCTO_CC_ID' },
    { table: 'IMPORTES_DOCTOS_CC', collection: 'importes_doctos_cc', sql: 'SELECT * FROM IMPORTES_DOCTOS_CC WHERE DOCTO_CC_ID = ?', param: doctoCCId, converter: importesDoctosCcConverters, idField: 'IMPTE_DOCTO_CC_ID' },
    { table: 'FORMAS_COBRO_DOCTOS', collection: 'formas_cobro_doctos', sql: 'SELECT * FROM FORMAS_COBRO_DOCTOS WHERE DOCTO_ID = ?', param: doctoCCId, converter: formasCobroDoctos, idField: 'FORMA_COBRO_DOC_ID' },
    { table: 'MSP_PAGOS_RECIBIDOS', collection: 'msp_pagos_recibidos', sql: 'SELECT * FROM MSP_PAGOS_RECIBIDOS WHERE ID = ?', param: mspPagoId, converter: mspPagosRecibidos, idField: 'ID' },
  ];

  const results = await Promise.allSettled(
    tasks.map(async (t) => {
      const records: any[] = await query({ sql: t.sql, params: [t.param], converters: t.converter });
      if (!records || records.length === 0) return;
      const collection = db.collection(t.collection);
      const bulkOps = records.map((rec) => ({
        updateOne: { filter: { [t.idField]: rec[t.idField] }, update: { $set: rec }, upsert: true }
      }));
      await collection.bulkWrite(bulkOps, { ordered: false });
    })
  );

  const duration = Date.now() - startTime;
  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length > 0) {
    console.warn(`syncPagoInmediato: ${failed.length}/4 tablas fallaron (${duration}ms)`);
  }
  return duration;
}

export default {
    existUniqueIdPago,
    getPagosByVentaId,
    getPagosByVentaIdsMongo,
    syncChangesToMongo,
    syncPagoInmediato
}