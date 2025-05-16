import { groupBy } from "../../utils/arrayGroupBy";
import store from "./stores";
import controllerClientes from "../clientes/controller";
import { CONCEPTO_VENTA_MOSTRADOR } from "../../constants/fbStoreConstanst";
import moment, { Moment } from "moment";
import { SUBCONSUTA_GET_CLIENTES_ACTIVOS } from "./queries";
import { Timestamp } from "firebase-admin/firestore";
import pagosStore from "../pagos/store";

const getVentasByCliente = (clienteId: number) => {
  return new Promise(async (resolve, reject) => {
    try {
      const [ventas, cliente] = await Promise.all([
        store.ventasByCliente({ clienteId }),
        controllerClientes.getClienteById(clienteId),
      ]);
      const ventasAgrupadas: any[] = groupBy(
        ventas,
        (venta: any) => venta.DOCTO_CC_ACR_ID,
        (venta: any) => venta
      );
      let foliosArray: string[] = [];
      const ventasWithHistorial = Object.keys(ventasAgrupadas).map(
        (key: any) => {
          const venta = ventasAgrupadas[key];
          const ventaArticulo: any[] = venta.filter(
            (ventaItem: any) =>
              ventaItem?.CONCEPTO_CC_ID === CONCEPTO_VENTA_MOSTRADOR
          );
          const historial = venta.filter(
            (ventaItem: any) =>
              ventaItem?.CONCEPTO_CC_ID !== CONCEPTO_VENTA_MOSTRADOR
          );
          const importeTotal = historial.reduce(
            (a: any, b: any) => a + b.CANTIDAD,
            0
          );
          const historialPorMes = groupBy(
            historial,
            (item: any) => item.ANO_MES,
            (item: any) => item
          );
          foliosArray.push(ventaArticulo[0]?.FOLIO);

          return {
            VENTA: {
              ...ventaArticulo[0],
              TOTAL_IMPORTE: importeTotal,
              SALDO_REST: ventaArticulo[0].CANTIDAD - importeTotal,
            },
            HISTORIAL: historial,
            HISTORIAL_POR_MES: historialPorMes,
          };
        }
      );

      const ventasProductos = await store.ventasProductosByFolio(foliosArray);

      const ventasWithProductos = ventasWithHistorial.map((venta: any) => {
        const productos = ventasProductos.filter(
          (producto: any) => producto.FOLIO === venta.VENTA.FOLIO
        );
        return {
          ...venta,
          VENTA: { ...venta.VENTA, PRODUCTOS: productos },
        };
      });
      const ventasFinales = revisarUltPagos(ventasWithProductos);
      const ventasOrdenadas = ventasFinales.sort(
        (a, b) => b.VENTA.SALDO_REST - a.VENTA.SALDO_REST
      );

      resolve({ CLIENTE: cliente[0], VENTAS: ventasOrdenadas });
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
};

const revisarUltPagos = (ventas: any[]) => {
  return ventas.map((venta: any) => {
    const numPagos = venta?.HISTORIAL?.length;
    return {
      ...venta,
      NUM_PAGOS: numPagos,
    };
  });
};

const getVentasByRuta = (numRuta: number) => {
  return new Promise(async (resolve, reject) => {
    try {
      let clientesPorRutaIds: string;
      if (numRuta === 0) {
        clientesPorRutaIds = SUBCONSUTA_GET_CLIENTES_ACTIVOS;
      } else {
        const clientesPorRuta = await controllerClientes.getClientesByRuta(
          numRuta
        );
        clientesPorRutaIds = clientesPorRuta
          .map((cliente) => cliente.CLIENTE_ID)
          .join(",");
      }
      const ventasPorRuta = await store.ventasByRuta(clientesPorRutaIds);
      const ventasConAtraso = calcularAtrasos(ventasPorRuta);
      // const ventasIds = ventasConAtraso
      //   .map((cuenta) => cuenta.DOCTO_CC_ACR_ID)
      //   .toString();
      // const ventasEstado = store.ventasById(ventasIds);
      resolve(ventasConAtraso);
    } catch (err) {
      reject(err);
    }
  });
};

const getVentasById = (ventasId: string) => {
  return new Promise<any[]>(async (resolve, reject) => {
    try {
      const ventas = await store.ventasById(ventasId);
      const ventasIds = ventas.map((venta) => venta.DOCTO_CC_ACR_ID);
      const ventasConAtrasos = calcularAtrasos(ventasIds);
      resolve(ventasConAtrasos);
    } catch (err) {
      reject(err);
    }
  });
};

const calcularAtrasos = (ventas: any[]) => {
  return ventas.map((venta: any) => {
    if (venta.FREC_PAGO === "CONTADO") {
      return {
        ...venta,
        PLAZOS_TRANS: 0,
        IMPTE_ACTUAL_ESTIMADO: 0,
        IMPTE_ATRASADO: 0,
        NUM_PLAZOS_ATRASADOS: 0,
      };
    }

    const vendedores = `${venta.VENDEDORE_1 ?? venta.VENDEDOR_1 + ","} ${
      venta.VENDEDOR_2 ?? venta.VENDEDOR_2 + ","
    } ${venta.VENDEDOR_3 && venta.VENDEDOR_3 + ","}`;

    const fechaVenta = moment(venta.FECHA);
    const fechaLiq = moment(
      venta.SALDO_REST === 0 ? venta.FECHA_ULT_PAGO : moment()
    );
    const plazosTrascurridos = tipoFrecuenciaDePago[venta.FREC_PAGO](
      fechaVenta,
      fechaLiq
    );
    const importeActualEstimado = plazosTrascurridos * venta?.PARCIALIDAD;
    const importeAtrasado = importeActualEstimado - venta?.TOTAL_IMPORTE;
    const numPlazosAtrazados = plazosTrascurridos - venta?.NUM_IMPORTES;
    const numPlazosAtrasadosSegunSaldoEstimado =
      (importeActualEstimado - venta?.TOTAL_IMPORTE - venta?.IMPTE_REST) /
      venta?.PARCIALIDAD;

    const maxNumPlazosAtrasadosSegunSaldo =
      venta?.SALDO_REST / venta?.PARCIALIDAD;

    const numPlazosAtrasadosSegunSaldo =
      numPlazosAtrasadosSegunSaldoEstimado > maxNumPlazosAtrasadosSegunSaldo
        ? maxNumPlazosAtrasadosSegunSaldo
        : numPlazosAtrasadosSegunSaldoEstimado;

    const tiempoTranscurridoDays = moment(fechaVenta).diff(fechaLiq, "days");
    const tiempoTransHumanizado = moment
      .duration(tiempoTranscurridoDays, "days")
      .humanize(true);
    return {
      ...venta,
      VENDEDORES: vendedores,
      PLAZOS_TRANS: plazosTrascurridos,
      IMPTE_ACTUAL_ESTIMADO: importeActualEstimado,
      IMPTE_ATRASADO: importeAtrasado,
      NUM_PLAZOS_ATRASADO: numPlazosAtrazados.toFixed(2),
      NUM_PLAZOS_ATRASADOS_BY_SALDO: numPlazosAtrasadosSegunSaldo.toFixed(1),
      TIEMPO_TRANSCURRIDO: tiempoTransHumanizado,
    };
  });
};

const tipoFrecuenciaDePago: any = {
  SEMANAL: (fechaVenta: moment.Moment, fechaLiquid: moment.Moment) =>
    moment(fechaLiquid).diff(fechaVenta, "weeks"),
  QUINCENAL: (fechaVenta = moment(), fechaLiquid: moment.Moment) =>
    moment(fechaLiquid).diff(fechaVenta, "month", true) * 2,
  MENSUAL: (fechaVenta = moment(), fechaLiquid: moment.Moment) =>
    moment(fechaLiquid).diff(fechaVenta, "months"),
};

// const getAllVentasWithCliente = async () => {
//   try {
//     const cuentas = await store.getAllVentasWithClienteWithoutDate()
//     return cuentas;
//   } catch (err) {
//     console.log(err);
//   }
// };

const getVentasByZona = async (zonaId: number, dateInit: Moment) => {
  const ventas = await store.getAllVentasWithClienteWithoutDate(dateInit, zonaId)
  
  const ventasByZonaCliente: {[key: number]: any[]} = {}
  
  ventas.forEach(venta => {
    const newVenta = {
      ...venta,
      ESTADO_COBRANZA: "PENDIENTE",
      DIA_COBRANZA: "DOMINGO",
      DIA_TEMPORAL_COBRANZA: "",
    } 
    if(!Array.isArray(ventasByZonaCliente[newVenta.ZONA_CLIENTE_ID])) {
      ventasByZonaCliente[newVenta.ZONA_CLIENTE_ID] = [newVenta]
    } else {
      ventasByZonaCliente[newVenta.ZONA_CLIENTE_ID].push(newVenta)
    }
  })
  
  const ventasByZonaClienteSelected = ventasByZonaCliente[zonaId] || []
  const ventasIds: number[] = ventasByZonaClienteSelected.map(venta => venta.DOCTO_CC_ACR_ID)

// Supongamos que tienes definida la variable ventasIds, por ejemplo:
// const ventasIds = [12345, 23456]; // Reemplaza con los valores reales

  const queryString = `
  SELECT
    COALESCE(MSP_PAGOS_RECIBIDOS.ID, CAST(DOCTOS_CC.DOCTO_CC_ID AS VARCHAR(36)) || '-' || CAST(IMPORTES_DOCTOS_CC.IMPTE_DOCTO_CC_ID AS VARCHAR(36))) AS ID,
    CLIENTES.CLIENTE_ID,
    COALESCE(DOCTOS_CC.DESCRIPCION, '') AS COBRADOR,
    COBRADORES.COBRADOR_ID,
    IMPORTES_DOCTOS_CC.DOCTO_CC_ACR_ID,
    DOCTOS_CC.DOCTO_CC_ID,
    COALESCE(MSP_PAGOS_RECIBIDOS.FECHA, DOCTOS_CC.FECHA + DOCTOS_CC.HORA) AS FECHA_HORA_PAGO,
    FORMAS_COBRO_DOCTOS.FORMA_COBRO_ID,
    TRUE AS GUARDADO_EN_MICROSIP,
    IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO AS IMPORTE,
    DOCTOS_CC.LAT,
    DOCTOS_CC.LON AS LNG,
    ZONAS_CLIENTES.ZONA_CLIENTE_ID,
    CLIENTES.NOMBRE AS NOMBRE_CLIENTE
  FROM
    DOCTOS_CC
    INNER JOIN IMPORTES_DOCTOS_CC ON IMPORTES_DOCTOS_CC.DOCTO_CC_ID = DOCTOS_CC.DOCTO_CC_ID
    INNER JOIN CLIENTES ON CLIENTES.CLIENTE_ID = DOCTOS_CC.CLIENTE_ID
    INNER JOIN ZONAS_CLIENTES ON ZONAS_CLIENTES.ZONA_CLIENTE_ID = CLIENTES.ZONA_CLIENTE_ID
    INNER JOIN COBRADORES ON COBRADORES.COBRADOR_ID = DOCTOS_CC.COBRADOR_ID
    INNER JOIN FORMAS_COBRO_DOCTOS ON FORMAS_COBRO_DOCTOS.DOCTO_ID = DOCTOS_CC.DOCTO_CC_ID
    LEFT JOIN MSP_PAGOS_RECIBIDOS ON DOCTOS_CC.DOCTO_CC_ID = MSP_PAGOS_RECIBIDOS.DOCTO_CC_ID
  WHERE
    DOCTOS_CC.CANCELADO = 'N'
    AND DOCTOS_CC.CONCEPTO_CC_ID IN (87327, 27969)
    AND IMPORTES_DOCTOS_CC.DOCTO_CC_ACR_ID IN (${ventasIds.join(',') || 0})
  `

  // const pagos = await query({
  //   sql: queryString,
  //   converters: [
  //     {
  //       column: "LAT",
  //       type: "buffer"
  //     },
  //     {
  //       column: "LNG",
  //       type: "buffer"
  //     }
  //   ]
  // })

  const pagos = await pagosStore.getPagosByVentaIdsMongo(ventasIds)

  const productosFolios = ventasByZonaClienteSelected.map(venta => venta.FOLIO)

  const productos = await store.getProductosByFolios(productosFolios)

  return {
    ventas: ventasByZonaClienteSelected,
    pagos,
    productos
  }
}

interface PagoDto {
  CLIENTE_ID: number;
  FECHA_HORA_PAGO: string;
  COBRADOR: string;
  COBRADOR_ID: number;
  LAT: number;
  LNG: number;
  IMPORTE: number;
  DOCTO_CC_ACR_ID: number;
  FORMA_COBRO_ID: number;
  DOCTO_CC_ID: number;
  ID: string;
}

import fs from 'fs'
import { query } from "../../repositories/fbRepository";

function appendToCsvFile(pago: PagoDto) {
  const data = JSON.stringify(pago)

  // Agregar datos al final del archivo
  fs.appendFileSync("./data", data + "\n", 'utf-8');
}


const addPago = (pago: PagoDto) => {
  return new Promise((resolve, reject) => {
    const ID_TO_USE = pago.ID === undefined ? pago.DOCTO_CC_ID.toString() : pago.ID
    const {
      CLIENTE_ID,
      COBRADOR, 
      COBRADOR_ID,
      DOCTO_CC_ACR_ID,
      FECHA_HORA_PAGO,
      FORMA_COBRO_ID,
      IMPORTE,
      LAT,
      LNG
    } = pago
    // console.log(pago)
    appendToCsvFile(pago)
    store.insertDataToFirebird(
      CLIENTE_ID,
      Timestamp.fromDate(new Date(FECHA_HORA_PAGO)),
      COBRADOR,
      COBRADOR_ID,
      LAT,
      LNG,
      IMPORTE,
      DOCTO_CC_ACR_ID,
      FORMA_COBRO_ID,
      ID_TO_USE
    ).then(res => {
      fs.appendFileSync("./data", `Pago con ID ${pago.ID} insertado con exito\n`, 'utf-8');
      pagosStore.existUniqueIdPago(ID_TO_USE).then(res => {
        if (res) {
          fs.appendFileSync("./data", `Pago con ID ${pago.ID} validado que si existe en la db\n`, 'utf-8');
          resolve("Pago agregado con exito")
        } else {
          fs.appendFileSync("./data", `Error: Pago con ID ${pago.ID} no se ha encontrado despues de insertalo\n`, 'utf-8');
          reject("Error al encontrar el pago insertado " + pago.ID,)
        }
      }).catch(err => {
        fs.appendFileSync("./data", `Error: Pago con ID ${pago.ID} ha tenido un error al vericar si existe\n`, 'utf-8');
        reject(err)
        return
      })
    }).catch(err => {
      fs.appendFileSync("./data", `Error: Pago con ID ${pago.ID} no se ha podido insertar`, 'utf-8');
      reject(err)
      return
    })
  })
}

const getNextFolioCR = async (): Promise<string | undefined> => {
  try {
    const folio = await store.getNextFolioCR();
    return folio;
  } catch (err) {
    console.log(err);
  }
};


const getVentasByZonaCliente = async (zonaClienteId: number) => {
  const ventas = await store.getVentasByZona(zonaClienteId)
  return ventas
}

export default {
  getVentasByCliente,
  getVentasByRuta,
  getVentasById,
  // getAllVentasWithCliente,
  getNextFolioCR,
  getVentasByZona,
  addPago,
  getVentasByZonaCliente
};
