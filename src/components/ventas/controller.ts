import { groupBy } from "../../utils/arrayGroupBy";
import store from "./stores";
import controllerClientes from "../clientes/controller";
import { CONCEPTO_VENTA_MOSTRADOR } from "../../constants/fbStoreConstanst";
import moment from "moment";

const getVentasByCliente = (clienteId: number) => {
  return new Promise(async (resolve, reject) => {
    try {
      const [ventas, cliente] = await Promise.all([
        store.ventasByCliente({ clienteId }),
        controllerClientes.getClienteById(clienteId),
      ]);
      const ventasAgrupadas = groupBy(
        ventas,
        (venta: any) => venta.DOCTO_CC_ACR_ID
      );
      const ventasWithHistorial = Object.keys(ventasAgrupadas).map(
        (key: any, index) => {
          const venta = ventasAgrupadas[key];
          const ventaArticulo: any[] = venta.filter(
            (ventaItem: any) =>
              ventaItem?.CONCEPTO_CC_ID === CONCEPTO_VENTA_MOSTRADOR
          );
          const historial = venta.filter(
            (ventaItem: any) =>
              ventaItem?.CONCEPTO_CC_ID !== CONCEPTO_VENTA_MOSTRADOR
          );
          return {
            VENTA: ventaArticulo[0],
            HISTORIAL: historial,
          };
        }
      );
      //Ciclo con posible optimizacion en la consulta
      // let ventasFinalesProductos: any[] = [];
      // for (const venta of ventasWithHistorial) {
      //   const ventaProductos = await store.ventasProductosByFolio(
      //     venta.VENTA.FOLIO
      //   );
      //   ventasFinalesProductos = [
      //     ...ventasFinalesProductos,
      //     { ...venta, VENTA: { ...venta.VENTA, PRODUCTOS: ventaProductos } },
      //   ];
      //   // console.log(ventaProductos);
      // }
      // resolve({ CLIENTE: cliente[0], VENTAS: ventasFinalesProductos });

      const ventasFinales = revisarUltPagos(ventasWithHistorial);

      resolve({ CLIENTE: cliente[0], VENTAS: ventasFinales });
    } catch (err) {
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

const getVentasByRuta = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const ventas = await store.ventasByRuta(1);
      const ventasConAtraso = calcularAtrasos(ventas);
      resolve(ventasConAtraso);
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
    return {
      ...venta,
      PLAZOS_TRANS: plazosTrascurridos,
      IMPTE_ACTUAL_ESTIMADO: importeActualEstimado,
      IMPTE_ATRASADO: importeAtrasado,
      NUM_PLAZOS_ATRASADO: numPlazosAtrazados,
    };
  });
};

const tipoFrecuenciaDePago: any = {
  SEMANAL: (fechaVenta: moment.Moment, fechaLiquid: moment.Moment) =>
    moment(fechaLiquid).diff(fechaVenta, "weeks"),
  QUINCENAL: (fechaVenta = moment(), fechaLiquid: moment.Moment) =>
    moment(fechaLiquid).diff(fechaVenta, "months", true) / 2,
  MENSUAL: (fechaVenta = moment(), fechaLiquid: moment.Moment) =>
    moment(fechaLiquid).diff(fechaVenta, "months"),
};

export default {
  getVentasByCliente,
  getVentasByRuta,
};
