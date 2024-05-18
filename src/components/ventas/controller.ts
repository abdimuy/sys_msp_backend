import { groupBy } from "../../utils/arrayGroupBy";
import store from "./stores";
import controllerClientes from "../clientes/controller";
import { CONCEPTO_VENTA_MOSTRADOR } from "../../constants/fbStoreConstanst";
import moment from "moment";
import { SUBCONSUTA_GET_CLIENTES_ACTIVOS } from "./queries";

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

const getAllVentasWithCliente = async () => {
  try {
    const cuentas = await store.allVentasWithCliente();
    return cuentas;
  } catch (err) {
    console.log(err);
  }
};

/*
  Controlador para subir todas las ventas a la base de datos de MongoDB.
*/
const setAllVentasWithCliente = async () => {
  try {
    const cuentas = await store.setAllVentasWithCliente();
    return cuentas;
  } catch (err) {
    console.log(err);
  }
};

const getNextFolioCR = async (): Promise<string | undefined> => {
  try {
    const folio = await store.getNextFolioCR();
    return folio;
  } catch (err) {
    console.log(err);
  }
};

export default {
  getVentasByCliente,
  getVentasByRuta,
  getVentasById,
  getAllVentasWithCliente,
  setAllVentasWithCliente,
  getNextFolioCR,
};
