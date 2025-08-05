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

async function getUnprocessedChanges(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT LOG_ID, TABLE_NAME, RECORD_ID, OPERATION, CHANGE_TIMESTAMP
      FROM MSP_CHANGE_LOG
      WHERE PROCESSED = 0
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

async function syncChangesToMongo() {
  try {
    // Obtener cambios no procesados
    const changes = await getUnprocessedChanges();
    // console.log(`Cambios sin procesar: ${changes.length}`);
    if (changes.length === 0) {
      // console.log('No hay cambios para procesar.');
      return;
    }
    console.log(`Detectados ${changes.length} cambios.`);

    const db = await connectToMongo();

    // Agrupar cambios por clave compuesta: TABLE_NAME + RECORD_ID
    const changesByRecord = new Map<string, any[]>();
    for (const change of changes) {
      const key = `${change.TABLE_NAME}_${change.RECORD_ID}`;
      if (!changesByRecord.has(key)) {
        changesByRecord.set(key, []);
      }
      changesByRecord.get(key)!.push(change);
    }

    // Procesar cada grupo (cada registro) tomando solo la última operación
    for (const [key, group] of changesByRecord.entries()) {
      // Ordenar el grupo por CHANGE_TIMESTAMP y tomar la última operación
      group.sort(
        (a, b) =>
          new Date(a.CHANGE_TIMESTAMP).getTime() -
          new Date(b.CHANGE_TIMESTAMP).getTime()
      );
      const lastChange = group[group.length - 1];
      const { LOG_ID, TABLE_NAME, RECORD_ID, OPERATION } = lastChange;
      // console.log(
      //   `Procesando grupo ${key}: [${TABLE_NAME}] ${OPERATION} - ID: ${RECORD_ID}`
      // );

      // Definir el nombre de la colección en Mongo según la tabla
      const collectionName = TABLE_NAME.toLowerCase();
      const collection = db.collection(collectionName);
      const idValues: { [key: string]: string | number } = {
        doctos_cc: Number(RECORD_ID),
        importes_doctos_cc: Number(RECORD_ID),
        msp_pagos_recibidos: RECORD_ID,
        formas_cobro_doctos: Number(RECORD_ID),
        clientes: Number(RECORD_ID)
      };
      const idFieldNames: { [key: string]: string } = {
        doctos_cc: 'DOCTO_CC_ID',
        importes_doctos_cc: 'IMPTE_DOCTO_CC_ID',
        msp_pagos_recibidos: 'ID',
        formas_cobro_doctos: 'FORMA_COBRO_DOC_ID',
        clientes: 'CLIENTE_ID'
      };
      const idFieldName = idFieldNames[collectionName];

      if (OPERATION === 'DELETE') {
        // Eliminar el documento en Mongo
        await collection.deleteOne({ [idFieldName]: idValues[collectionName] });
        console.log(
          `Eliminado ${collectionName} con ID: ${idValues[collectionName]}`
        );
      } else {
        // Para INSERT o UPDATE, obtener el registro actualizado desde Firebird
        const record = await getRecordFromFirebird(TABLE_NAME, idValues[collectionName]);
        // console.log('Registro obtenido:', record);
        if (record) {
          // Se asume que getRecordFromFirebird devuelve un array y se toma el primer elemento
          // console.log({record: record[0]})
          await collection.updateOne(
            { [idFieldName]: idValues[collectionName] },
            { $set: record[0] },
            { upsert: true }
          );
          // console.log(
          //   `Actualizado/inserto en ${collectionName} con ID: ${idValues[collectionName]}`
          // );
        } else {
          console.warn(
            `No se encontró registro en ${TABLE_NAME} con ID: ${idValues[collectionName]}`
          );
        }
      }

      // Marcar todos los cambios del grupo como procesados
      for (const change of group) {
        await markChangeAsProcessed(change.LOG_ID);
      }
    }

    // console.log('Sincronización completada de grupos.');
  } catch (error) {
    console.error('Error en la sincronización:', error);
  }
}

export default {
    existUniqueIdPago,
    getPagosByVentaId,
    getPagosByVentaIdsMongo,
    syncChangesToMongo
}