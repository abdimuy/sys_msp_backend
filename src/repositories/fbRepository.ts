import Firebird from "node-firebird";

const pool = Firebird.pool(5, {
  // host: "SERVERM",
  // database: "C:\\Microsip datos\\MUEBLERA_SNP.fdb",
  port: 3050,
  host: "localhost",
  // database: "C:\\dev\\MUEBLERA_SNP.fdb",
  database: "C:\\Users\\abdid\\Documents\\MUEBLERA_SNP\\MUEBLERA_SNP.fdb",
  user: "SYSDBA",
  password: "masterkey",
});

interface IQuery {
  sql: string;
  params?: any[];
  converters?: IQueryConverter[];
}

export interface IQueryConverter {
  column: string;
  type: ITypeToConvert;
}

type ITypeToConvert = "buffer";

export const query = ({
  sql,
  converters = [],
  params = [],
}: IQuery): Promise<any[]> => {
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
  return String.fromCharCode.apply(null, [...new Uint16Array(buffer)]);
}
