import moment, { Moment } from "moment";
import "moment-timezone";
import { query } from "../../repositories/connection";
import {
  getDbConnectionAsync,
  IQueryConverter,
  queryAsync,
} from "../../repositories/fbRepository";
import Firebird from "node-firebird";
import {
  QUERY_GET_VENTAS_BY_CLIENTE,
  QUERY_GET_ARTICULOS_BY_FOLIO,
  QUERY_GET_VENTAS_BY_CLIENTES_SIMPLIFICADO,
  QUERY_GET_VENTAS_BY_ID_SIMPLIFICADO,
  QUERY_GET_ALL_VENTAS_WITH_CLIENTE,
  QUERY_GET_NEXT_FOLIO_CR,
  QUERTY_INSERT_PAGO,
  QUERY_GET_CLAVE_CLIENTE,
  QUERY_INSERT_PAGO_IMPORTES,
  QUERY_UPDATE_FOLIO_CR,
  QUERY_INSERT_FORMA_COBRO,
  QUERY_GET_PAGO,
  QUERY_GET_ALL_VENTAS_WITH_CLIENTE_WITHOUT_DATE,
  QUERY_SET_PAGO_RECIBIDO,
  QUERY_GET_VENTAS_BY_ZONA_CLIENTE,
  QUERY_GET_VENTA_BY_ID,
} from "./queries";
import { Timestamp } from "../../repositories/firebase";
// import { createCanvas } from "canvas";
import fs from "fs";
import path from "path";
import { create, Whatsapp } from "venom-bot";
import controller from "../pagos/controller";

interface IGetVentasByClienteStore {
  clienteId: number;
}

const convertersVentas: IQueryConverter[] = [
  {
    column: "CONCEPTO",
    type: "buffer",
  },
  {
    column: "DESCRIPCION",
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
    column: "FOLIO",
    type: "buffer",
  },
  {
    column: "VENDEDOR_1",
    type: "buffer",
  },
  {
    column: "VENDEDOR_2",
    type: "buffer",
  },
  {
    column: "VENDEDOR_3",
    type: "buffer",
  },
  {
    column: "FORMA_DE_PAGO",
    type: "buffer",
  },
];

const getVentasByCliente = ({ clienteId }: IGetVentasByClienteStore) => {
  return new Promise<Array<any>>((resolve, reject) => {
    try {
      const ventas = query({
        sql: QUERY_GET_VENTAS_BY_CLIENTE,
        params: [clienteId],
        converters: convertersVentas,
      });
      resolve(ventas);
    } catch (err) {
      reject(err);
    }
  });
};

const getVentasByRuta = (clientesId: string) => {
  return new Promise<any[]>(async (resolve, reject) => {
    try {
      const ventas = await query({
        sql: QUERY_GET_VENTAS_BY_CLIENTES_SIMPLIFICADO(clientesId),
        converters: [
          {
            column: "FREC_PAGO",
            type: "buffer",
          },
          {
            column: "FOLIO",
            type: "buffer",
          },
          {
            column: "DOMICILIO",
            type: "buffer",
          },
          {
            column: "VENDEDOR_1",
            type: "buffer",
          },
          {
            column: "VENDEDOR_2",
            type: "buffer",
          },
          {
            column: "VENDEDOR_3",
            type: "buffer",
          },
          {
            column: "LOCALIDAD",
            type: "buffer",
          },
          {
            column: "RUTA",
            type: "buffer",
          },
        ],
      });
      resolve(ventas);
    } catch (err) {
      reject(err);
    }
  });
};

const getVentasById = (ventasId: string) => {
  return new Promise<any[]>(async (resolve, reject) => {
    try {
      const ventas = await query({
        sql: QUERY_GET_VENTAS_BY_ID_SIMPLIFICADO(ventasId),
        converters: [
          {
            column: "FREC_PAGO",
            type: "buffer",
          },
          {
            column: "FOLIO",
            type: "buffer",
          },
          {
            column: "DOMICILIO",
            type: "buffer",
          },
          {
            column: "VENDEDOR_1",
            type: "buffer",
          },
          {
            column: "VENDEDOR_2",
            type: "buffer",
          },
          {
            column: "VENDEDOR_3",
            type: "buffer",
          },
        ],
      });
      resolve(ventas);
    } catch (err) {
      reject(err);
    }
  });
};

const getProductosByFolios = async (foliosBatch: string[]): Promise<any[]> => {
  const foliosStr = QUERY_GET_ARTICULOS_BY_FOLIO(foliosBatch.join("','"));
  const productosList = await query({
    sql: foliosStr,
    params: [],
    converters: [
      {
        column: "FOLIO",
        type: "buffer",
      },
    ],
  });
  return productosList;
};

const getProductoByFolio = async (folio: string) => {
  const folioSql = QUERY_GET_ARTICULOS_BY_FOLIO(folio)
  const products = await query({
    sql: folioSql,
    converters: [
      {
        column: "FOLIO",
        type: "buffer"
      }
    ]
  })
  return products
}

const getVentasProductosByFolio = async (folios: string[]): Promise<any[]> => {
  let productos: any[] = [];

  if (folios.length < 1500) {
    return await getProductosByFolios(folios);
  }

  let i = 0;
  while (i < folios.length) {
    const foliosBatch = folios.slice(i, i + 1500);
    const productosBatch = await getProductosByFolios(foliosBatch);
    productos = productos.concat(productosBatch);
    i += 1500;
  }

  return productos;
};

// const getProductosByVentaId = (ventaIds: number[]) => {
//   return new Promise<any[]>((resolve, reject) => {
//     try {
//       const productos = query({
//         sql:
//           QUERY_GET_ARTICULOS_ITEMS_BY_VENTA_ID_PART_1 +
//           ventaIds.join(",") +
//           QUERY_GET_ARTICULOS_ITEMS_BY_VENTA_ID_PART_2,
//         params: [],
//       });
//       resolve(productos);
//     } catch (err) {
//       reject(err);
//     }
//   });
// };

const getAllVentasWithCliente = (zona_cliente_id: number) => {
  return new Promise<any[]>(async (resolve, reject) => {
    const ultimoMartes = moment().day("Tuesday").format("YYYY-MM-DD");
    const inicioSemana = moment().day(0).format("YYYY-MM-DD");
    const numCtasRutas = await query({
      sql: QUERY_GET_ALL_VENTAS_WITH_CLIENTE,
      params: [zona_cliente_id, inicioSemana, ultimoMartes, ultimoMartes],
      converters: [
        {
          column: "FOLIO",
          type: "buffer",
        },
        {
          column: "ZONA_NOMBRE",
          type: "buffer",
        },
        {
          column: "TELEFONO",
          type: "buffer",
        },
        {
          column: "APLICADO",
          type: "buffer",
        },
        {
          column: "CALLE",
          type: "buffer",
        },
        {
          column: "NOTAS",
          type: "buffer",
        },
        {
          column: "VENDEDOR_1",
          type: "buffer",
        },
        {
          column: "VENDEDOR_2",
          type: "buffer",
        },
        {
          column: "VENDEDOR_3",
          type: "buffer",
        },
      ],
    });
    resolve(numCtasRutas);
  });
};

const getVentaById = (ventaId: number) => {
  return new Promise((resolve, reject) => {
    resolve(
      query({
        sql: QUERY_GET_VENTA_BY_ID,
        params: [ventaId],
        converters: [
          { column: "FOLIO", type: "buffer", },
          { column: "ZONA_NOMBRE", type: "buffer", },
          { column: "TELEFONO", type: "buffer", },
          { column: "APLICADO", type: "buffer", },
          { column: "CALLE", type: "buffer", },
          { column: "NOTAS", type: "buffer", },
          { column: "VENDEDOR_1", type: "buffer", },
          { column: "VENDEDOR_2", type: "buffer", },
          { column: "VENDEDOR_3", type: "buffer", },
        ],
      })
    )
  })
}

const getAllVentasWithClienteWithoutDate = (
  date: Moment = moment().day() === 4 ? moment() : moment().day(-3),
  zonaClienteId: number
) => {
  console.log(date.format("YYYY-MM-DD HH:mm:ss"));
  const dateInit = date.format("YYYY-MM-DD HH:mm:ss");
  // const q = QUERY_GET_ALL_VENTAS_WITH_CLIENTE_WITHOUT_DATE(dateInit, 21571)
  const q = QUERY_GET_ALL_VENTAS_WITH_CLIENTE_WITHOUT_DATE;
  return new Promise<any[]>(async (resolve, reject) => {
    const numCtasRutas = await query({
      sql: q,
      // params: [zonaClienteId, zonaClienteId, dateInit],
      params: [dateInit],
      converters: [
        {
          column: "FOLIO",
          type: "buffer",
        },
        {
          column: "ZONA_NOMBRE",
          type: "buffer",
        },
        {
          column: "TELEFONO",
          type: "buffer",
        },
        {
          column: "APLICADO",
          type: "buffer",
        },
        {
          column: "CALLE",
          type: "buffer",
        },
        {
          column: "NOTAS",
          type: "buffer",
        },
        {
          column: "VENDEDOR_1",
          type: "buffer",
        },
        {
          column: "VENDEDOR_2",
          type: "buffer",
        },
        {
          column: "VENDEDOR_3",
          type: "buffer",
        },
        {
          column: "AVAL_O_RESPONSABLE",
          type: "buffer",
        },
        {
          column: "FREC_PAGO",
          type: "buffer",
        },
      ],
    });
    resolve(numCtasRutas);
  });
};

const getNextFolioCR = async (): Promise<string> => {
  const folio = await query({
    sql: QUERY_GET_NEXT_FOLIO_CR,
  });

  // @ts-ignore
  return folio[0].FOLIO;
};

const insertDataToFirebird = async (
  clienteId: number,
  fechaHoraPago: Timestamp,
  cobrador: string,
  cobradorId: number,
  lat: number,
  lng: number,
  importe: number,
  doctoAcrId: number,
  formaCobroId: number,
  doctoCCId: string
) => {
  const existPagoId = await controller.existUniqueIdPago(doctoCCId);
  if (existPagoId) {
    return "El pago ya existe";
  }
  const db = await getDbConnectionAsync();
  // Inicia la transacción (asegúrate que exista una versión promisificada o la envuelvas en una promesa)
  const transaction = await new Promise<Firebird.Transaction>(
    (resolve, reject) => {
      db.transaction(Firebird.ISOLATION_READ_COMMITED, (err, trans) => {
        if (err) return reject(err);
        resolve(trans);
      });
    }
  );

  try {
    // Ejecutar consultas secuencialmente
    const resultFolio = await queryAsync(transaction, QUERY_GET_NEXT_FOLIO_CR, [
      clienteId,
    ]);
    const folioNumber = resultFolio.FOLIO_TEMP;

    const resultClave = await queryAsync(transaction, QUERY_GET_CLAVE_CLIENTE, [
      clienteId,
    ]);
    const claveCliente = resultClave[0].CLAVE_CLIENTE || "";
    const folio = "Z" + folioNumber;

    let conceptoCCID = formaCobroId === 137026 ? 27969 : 87327;
    const paramsPago = [
      -1,
      conceptoCCID,
      folio,
      "R",
      225490,
      moment(fechaHoraPago.toDate()).format("YYYY-MM-DD"),
      moment(fechaHoraPago.toDate()).add(10, "s").format("HH:mm:ss"),
      claveCliente,
      0,
      moment().format(
        moment(fechaHoraPago.toDate()).format("YYYY-MM-DD HH:mm:ss")
      ),
      clienteId,
      1,
      "N",
      "S",
      cobrador,
      234,
      null,
      cobradorId,
      "N",
      "N",
      "N",
      null,
      null,
      0,
      null,
      "CC",
      "P",
      "P",
      null,
      "N",
      "N",
      "PREIMP",
      "false",
      null,
      "N",
      moment().format("YYYY-MM-DD HH:mm:ss"),
      null,
      "N",
      null,
      null,
      "N",
      "N",
      null,
      null,
      null,
      null,
      null,
      "COBRANZA EN RUTA 2.0",
      moment().format("YYYY-MM-DD HH:mm:ss"),
      null,
      "COBRANZA EN RUTA 2.0",
      moment().format("YYYY-MM-DD HH:mm:ss"),
      "COBRANZA EN RUTA 2.0",
      null,
      null,
      null,
      lat.toString(),
      lng.toString(),
      null,
    ];

    const resultPago = await queryAsync(
      transaction,
      QUERTY_INSERT_PAGO,
      paramsPago
    );
    const idDoctoCCID = resultPago.DOCTO_CC_ID;

    const paramsImporte = [
      -1,
      idDoctoCCID,
      moment().format("YYYY-MM-DD"),
      "N",
      "S",
      "P",
      "R",
      doctoAcrId,
      importe,
      0,
      0,
      0,
      0,
      0,
    ];
    await queryAsync(transaction, QUERY_INSERT_PAGO_IMPORTES, paramsImporte);

    const paramsFormaCobro = [
      -1,
      "DOCTOS_CC",
      idDoctoCCID,
      formaCobroId,
      "",
      "CC",
      "",
      0,
    ];
    await queryAsync(transaction, QUERY_INSERT_FORMA_COBRO, paramsFormaCobro);

    await queryAsync(transaction, QUERY_SET_PAGO_RECIBIDO, [
      doctoCCId,
      idDoctoCCID,
      moment(fechaHoraPago.toDate()).format("YYYY-MM-DD HH:mm:ss"),
    ]);

    // Commit de la transacción
    await new Promise<void>((resolve, reject) => {
      transaction.commit((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    db.detach();
    return folio;
  } catch (error) {
    // En caso de error, se hace rollback y se cierra la conexión
    await new Promise<void>((resolve) => {
      transaction.rollback(() => resolve());
    });
    db.detach();
    throw error;
  }
};

// Función para crear el ticket
// async function createTicket(data: any) {
//   const width = 500;
//   const height = 300;
//   const canvas = createCanvas(width, height);
//   const ctx = canvas.getContext("2d");

//   // Fondo gradient
//   const gradient = ctx.createLinearGradient(0, 0, width, 0);
//   gradient.addColorStop(0, "#ff7e5f");
//   gradient.addColorStop(1, "#feb47b");
//   ctx.fillStyle = gradient;
//   ctx.fillRect(0, 0, width, height);

//   // Texto
//   ctx.font = "bold 30px sans-serif";
//   ctx.fillStyle = "#fff";
//   ctx.fillText("¡Gracias por tu compra!", 50, 50);

//   // Información de la compra
//   ctx.font = "20px sans-serif";
//   ctx.fillText(`Cliente: ${data.NOMBRE}`, 50, 100);
//   ctx.fillText(`Fecha: ${data.FECHA}`, 50, 130);
//   ctx.fillText(`Folio: ${data.FOLIO}`, 50, 160);
//   ctx.fillText(`Importe total: $${data.IMPORTE_TOTAL}`, 50, 190);

//   // Guardar la imagen en un archivo
//   const buffer = canvas.toBuffer("image/png");
//   const ticketPath = path.join(__dirname, "ticket.png");
//   fs.writeFileSync(ticketPath, buffer);

//   return ticketPath;
// }

const getPago = async (doctoCCID: number) => {
  const pago = await query({
    sql: QUERY_GET_PAGO,
    params: [doctoCCID],
  });
  return pago[0];
};

const getVentasByZona = async (zonaClienteId: number) => {
  const ventas = await query({
    sql: QUERY_GET_VENTAS_BY_ZONA_CLIENTE,
    params: [zonaClienteId],
    converters: [
      {
        column: "FOLIO",
        type: "buffer",
      },
      {
        column: "RUTA",
        type: "buffer",
      },
      {
        column: "DOMICILIO",
        type: "buffer",
      },
      {
        column: "LOCALIDAD",
        type: "buffer",
      },
      {
        column: "VENDEDOR_1",
        type: "buffer",
      },
      {
        column: "VENDEDOR_2",
        type: "buffer",
      },
      {
        column: "VENDEDOR_3",
        type: "buffer",
      },
      {
        column: "FREC_PAGO",
        type: "buffer",
      },
    ],
  });
  return ventas;
};

export default {
  ventasByCliente: getVentasByCliente,
  ventasProductosByFolio: getVentasProductosByFolio,
  ventasByRuta: getVentasByRuta,
  ventasById: getVentasById,
  allVentasWithCliente: getAllVentasWithCliente,
  getNextFolioCR,
  getAllVentasWithClienteWithoutDate,
  insertDataToFirebird,
  getProductosByFolios,
  getVentasByZona: getVentasByZona,
  getVentaById,
  getProductoByFolio
};
