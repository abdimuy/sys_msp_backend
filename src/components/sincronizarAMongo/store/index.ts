import { Db } from "mongodb";

// syncInitialData.js
import { IQueryConverter, query } from "../../../repositories/fbRepository"; // Asegúrate de ajustar la ruta
import { connectToMongo, getCollection } from '../../../repositories/mongoConnection'
import { clientesConverters, cobradoresConverters, doctosCcConverters, formasCobroDoctos, importesDoctosCcConverters, mspPagosRecibidos, zonaClientesConverters } from "./converters";
import { from } from "arquero";

/**
 * Sincroniza una tabla de Firebird a una colección en MongoDB en lotes.
 * @param {string} tableName - Nombre de la tabla en Firebird.
 * @param {string} collectionName - Nombre de la colección en MongoDB.
 * @param {number} batchSize - Número de filas a procesar en cada lote.
 * @param {object} db - Instancia de la base de datos de MongoDB.
 */
async function syncTableToMongo(tableName: string, collectionName: string, batchSize = 10000, db: Db, converters: IQueryConverter[] = []) {
  console.log(`Sincronizando tabla ${tableName} a la colección ${collectionName}...`);
  
  // Limpiar la colección en MongoDB (puedes modificar esto si deseas conservar datos)
  await db.collection(collectionName).deleteMany({});
  
  let offset = 0;
  let hasMore = true;
  let totalInserted = 0;

  while (hasMore) {
    const sql = `SELECT FIRST ${batchSize} SKIP ${offset} * FROM ${tableName}`;
    let batch;
    try {
      batch = await query({ sql, converters });
    } catch (error) {
      console.error(`Error al consultar ${tableName} (offset ${offset}):`, error);
      break;
    }

    if (batch.length > 0) {
      try {
        const result = await db.collection(collectionName).insertMany(batch);
        totalInserted += result.insertedCount;
        console.log(`Insertado lote de ${result.insertedCount} registros en ${collectionName} (Total insertados: ${totalInserted}).`);
      } catch (error) {
        console.error(`Error al insertar lote en ${collectionName}:`, error);
      }
      offset += batchSize;
    } else {
      hasMore = false;
    }
  }
  console.log(`Sincronización de ${tableName} completada. Total de registros insertados: ${totalInserted}`);
}

/**
 * Función principal para sincronizar todas las tablas de Firebird a MongoDB.
 */
export async function syncInitialData() {
  try {
    console.log('Iniciando sincronización inicial de datos desde Firebird a MongoDB...');
    const db = await connectToMongo();

    // Sincroniza cada tabla. Ajusta el batchSize si es necesario.
    await syncTableToMongo('DOCTOS_CC', 'doctos_cc', 200000, db, doctosCcConverters);
    await syncTableToMongo('IMPORTES_DOCTOS_CC', 'importes_doctos_cc', 200000, db, importesDoctosCcConverters);
    await syncTableToMongo('CLIENTES', 'clientes', 200000, db, clientesConverters);
    // await syncTableToMongo('ZONAS_CLIENTES', 'zonas_clientes', 10000, db, zonaClientesConverters);
    // await syncTableToMongo('COBRADORES', 'cobradores', 10000, db, cobradoresConverters);
    await syncTableToMongo('FORMAS_COBRO_DOCTOS', 'formas_cobro_doctos', 200000, db, formasCobroDoctos);
    await syncTableToMongo('MSP_PAGOS_RECIBIDOS', 'msp_pagos_recibidos', 200000, db, mspPagosRecibidos);

    console.log('Sincronización inicial completada.');
  } catch (error) {
    console.error('Error durante la sincronización inicial:', error);
  }
}

const processData = async () => {
  // Obtener datos de las colecciones
  const doctos = await getCollection<any>('doctos_cc', { 
    CANCELADO: 'N', 
    CONCEPTO_CC_ID: { $in: [87327, 27969] } 
  });
  const importes = await getCollection<any>('importes_doctos_cc');
  const clientes = await getCollection<any>('clientes');
  const zonas = await getCollection<any>('zonas_clientes');
  const cobradores = await getCollection<any>('cobradores');
  const formasCobro = await getCollection<any>('formas_cobro_doctos');
  const msps = await getCollection<any>('msp_pagos_recibidos');

  // Convertir arrays a tablas Arquero
  const tDoctos = from(doctos);
  const tImportes = from(importes);
  const tClientes = from(clientes);
  const tZonas = from(zonas);
  const tCobradores = from(cobradores);
  const tFormasCobro = from(formasCobro);
  const tMSP = from(msps);

  console.log("Inicial:");
  console.log("tDoctos:", tDoctos.objects().length);
  console.log("tImportes:", tImportes.objects().length);
  console.log("tClientes:", tClientes.objects().length);
  console.log("tZonas:", tZonas.objects().length);
  console.log("tCobradores:", tCobradores.objects().length);
  console.log("tFormasCobro:", tFormasCobro.objects().length);
  console.log("tMSP:", tMSP.objects().length);

  // 1. Unir doctos con importes usando DOCTO_CC_ID (ambas tablas usan la misma clave)
  let joined = tDoctos.join(tImportes, 'DOCTO_CC_ID');
  console.log("Después del join (doctos-importes):", joined.objects().length);

  // 2. Filtrar por ventasIds en importes.DOCTO_CC_ACR_ID
  const ventasIds = [12345, 23456];
  joined = joined.filter(d => ventasIds.includes(d.DOCTO_CC_ACR_ID));
  console.log("Después del filtro (ventasIds):", joined.objects().length);

  // 3. Unir con clientes por CLIENTE_ID
  joined = joined.join(tClientes, 'CLIENTE_ID');
  console.log("Después del join (clientes):", joined.objects().length);

  // 4. Unir con zonas_clientes por ZONA_CLIENTE_ID
  joined = joined.join(tZonas, 'ZONA_CLIENTE_ID');
  console.log("Después del join (zonas_clientes):", joined.objects().length);

  // 5. Unir con cobradores por COBRADOR_ID
  joined = joined.join(tCobradores, 'COBRADOR_ID');
  console.log("Después del join (cobradores):", joined.objects().length);

  // 6. Unir con formas de cobro: clave izquierda 'DOCTO_CC_ID' y derecha 'DOCTO_ID'
  joined = joined.join(tFormasCobro, ['DOCTO_CC_ID', 'DOCTO_ID']);
  console.log("Después del join (formas_cobro):", joined.objects().length);

  // 7. Realizar un left join con msp_pagos_recibidos sobre DOCTO_CC_ID
  joined = joined.join(tMSP, 'DOCTO_CC_ID', { how: 'left' });
  console.log("Después del left join (msp_pagos_recibidos):", joined.objects().length);

  // Agregar campos calculados con derive (similar a $addFields)
  joined = joined.derive({
    // Si existe msp.ID, se utiliza; de lo contrario, se concatena DOCTO_CC_ID e IMPTE_DOCTOS_CC_ID.
    ID: d => d.ID != null ? d.ID : `${d.DOCTO_CC_ID}-${d.IMPTE_DOCTOS_CC_ID}`,
    // FECHA_HORA_PAGO se calcula a partir de FECHA o combinando FECHA y HORA
    FECHA_HORA_PAGO: d => d.FECHA ? d.FECHA : (d.FECHA && d.HORA ? `${d.FECHA} ${d.HORA}` : null),
    // Columna constante
    GUARDADO_EN_MICROSIP: () => true,
    // IMPORTE: suma de IMPORTE e IMPUESTO
    IMPORTE: d => d.IMPORTE + d.IMPUESTO,
    // Renombrar LON a LNG
    LNG: d => d.LON
  });
  console.log("Después de derive:", joined.objects().length);

  // Seleccionar columnas deseadas (similar a $project)
  const result = joined.select(
    'ID',
    'CLIENTE_ID',
    'COBRADOR_ID',
    'DOCTO_CC_ACR_ID',
    'DOCTO_CC_ID',
    'FECHA_HORA_PAGO',
    'FORMA_COBRO_ID',
    'GUARDADO_EN_MICROSIP',
    'IMPORTE',
    'LAT',
    'LNG',
    'ZONA_CLIENTE_ID',
    'NOMBRE'
  );
  console.log("Después del select final:", result.objects().length);

  // Convertir el resultado a un array de objetos y mostrarlo
  const output = result.objects();
  console.log("Resultado final:", output);
};

export default {
  processData
}