import Firebird from "node-firebird";

const options: any = {
  // host: "SERVERM",
  // database: "C:\\Microsip datos\\PRUEBA_ALDRICH.fdb",
  database: "C:\\Microsip datos\\MUEBLERA_SNP.fdb",
  port: 3050,
  host: "localhost",
  // database: "C:\\dev\\MUEBLERA_SNP.fdb",
  // database: "C:\\Users\\abdid\\Documents\\MUEBLERA_SNP\\MUEBLERA_SNP.fdb",
  user: "SYSDBA",
  password: "masterkey",
  lowercase_keys: false,
  role: null,
};

export const pool = Firebird.pool(1000, options);

export interface IQuery {
  sql: string;
  params?: any[];
  converters?: IQueryConverter[];
}

export interface IQueryConverter {
  column: string;
  type: ITypeToConvert;
}

type ITypeToConvert = "buffer";

export const query = <T>({
  sql,
  converters = [],
  params = [],
}: IQuery): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    try {
      let result: any[];
      pool.get((err, db) => {
        if (err) {
          reject(err);
          return console.error(err);
        }
        db.query(sql, params, (err, rows) => {
          if (err) {
            console.log(err);
            reject(err);
          }
          try {
            result = rows;
            if (converters.length > 0) {
              rows.map((row) => {
                converters.forEach((converter) => {
                  switch (converter.type) {
                    case "buffer":
                      row[converter.column] = ab2str(row[converter.column]);
                      break;
                  }
                });
              });
            }
          } catch (err) {
            reject(err);
          }
          db.detach();
          resolve(result);
        });
      });
    } catch (err) {
      reject(err);
    }
  });
};
// const typesConverters = (typeConverter: string) => {
//   const types = {
//     buffer: (buffer: Buffer) => ab2str(buffer)
//   }
//   return types[typeConverter];
// }

function ab2str(buffer: any): string {
  if (!buffer) return "";

  // Si ya es string, devolverlo tal cual
  if (typeof buffer === "string") return buffer;

  // Verificar que sea un buffer válido
  if (!Buffer.isBuffer(buffer) && !ArrayBuffer.isView(buffer)) {
    console.warn(
      "ab2str: Received invalid buffer type:",
      typeof buffer,
      buffer
    );
    return "";
  }

  try {
    // Convertir Buffer a ArrayBuffer si es necesario
    let arrayBuffer: ArrayBuffer | SharedArrayBuffer;
    if (Buffer.isBuffer(buffer)) {
      arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      );
    } else if (ArrayBuffer.isView(buffer)) {
      // Si es un TypedArray o DataView, obtener su ArrayBuffer subyacente
      const bufferData = buffer.buffer;
      if (bufferData instanceof SharedArrayBuffer) {
        // Crear una copia como ArrayBuffer normal
        const temp = new ArrayBuffer(buffer.byteLength);
        const tempView = new Uint8Array(temp);
        const sourceView = new Uint8Array(
          bufferData,
          buffer.byteOffset,
          buffer.byteLength
        );
        tempView.set(sourceView);
        arrayBuffer = temp;
      } else {
        arrayBuffer = bufferData.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength
        );
      }
    } else {
      arrayBuffer = buffer;
    }

    // Verificar que el tamaño sea válido
    if (arrayBuffer.byteLength <= 0 || arrayBuffer.byteLength % 2 !== 0) {
      console.warn("ab2str: Invalid buffer length:", arrayBuffer.byteLength);
      // Intentar decodificar como UTF-8 en lugar de UTF-16
      if (Buffer.isBuffer(buffer)) {
        return buffer.toString("utf8");
      }
      return "";
    }

    const uint16Array = new Uint16Array(arrayBuffer);
    let result = "";
    const chunkSize = 8192; // Procesar en bloques para evitar stack overflow

    for (let i = 0; i < uint16Array.length; i += chunkSize) {
      const chunk = uint16Array.slice(
        i,
        Math.min(i + chunkSize, uint16Array.length)
      );
      result += String.fromCharCode(...chunk);
    }

    return result;
  } catch (error) {
    console.error("ab2str: Error converting buffer:", error);
    // Intentar conversión básica si falla
    if (Buffer.isBuffer(buffer)) {
      return buffer.toString("utf8");
    }
    return "";
  }
}

// Función para promisificar una consulta en la transacción con soporte para genéricos y RETURNING
export const queryAsync = <T = any>(
  transaction: Firebird.Transaction,
  sql: string,
  params: any[],
  returning?: boolean
): Promise<T[] | T> => {
  return new Promise((resolve, reject) => {
    transaction.query(sql, params, (err, result) => {
      if (err) return reject(err);

      if (returning && result) {
        // Si es RETURNING y el resultado es un array con un elemento, devolver el elemento directamente
        if (Array.isArray(result) && result.length === 1) {
          resolve(result[0] as T);
        }
        // Si es un array con múltiples elementos, devolver el array
        else if (Array.isArray(result)) {
          resolve(result as T[]);
        }
        // Si no es array, devolver tal como viene
        else {
          resolve(result as T);
        }
      } else if (returning) {
        // Si esperaba RETURNING pero no hay resultado, devolver null
        resolve(null as any);
      } else {
        // Para queries normales (INSERT/UPDATE sin RETURNING), devolver array vacío o resultado
        resolve(result || []);
      }
    });
  });
};

// Suponiendo que también tienes promisificada la obtención de la conexión:
export const getDbConnectionAsync = (): Promise<Firebird.Database> => {
  return new Promise((resolve, reject) => {
    pool.get((err, db) => {
      if (err) return reject(err);
      resolve(db);
    });
  });
};

export const getDbTransactionAsync = (
  db: Firebird.Database
): Promise<Firebird.Transaction> => {
  return new Promise((resolve, reject) => {
    db.transaction(Firebird.ISOLATION_READ_COMMITTED, (err, transaction) => {
      if (err) return reject(err);
      resolve(transaction);
    });
  });
};

export const commitTransactionAsync = (
  transaction: Firebird.Transaction
): Promise<void> => {
  return new Promise((resolve, reject) => {
    transaction.commit((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

export const rollbackTransactionAsync = (
  transaction: Firebird.Transaction
): Promise<void> => {
  return new Promise((resolve, reject) => {
    transaction.rollback((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

export const detachDbAsync = (db: Firebird.Database): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.detach((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};
