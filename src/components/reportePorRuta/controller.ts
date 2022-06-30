import { groupBy } from "../../utils/arrayGroupBy";
import store from "./store";
import controllerRutas from "../rutas/controller";
import controllerVentas from "../ventas/controller";
import moment from "moment";

const getReportsRutas = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const fechasUltDiezSemanas = calcFechasUltDiezSemanas();
      const [reportsPorRuta, numCtasRutas, porcentajesParcialidadRutas] =
        await Promise.all([
          store.listReportsRuta(fechasUltDiezSemanas),
          controllerRutas.getNumCtasByRuta(),
          store.listPorcentajesParcialidadRuta(),
        ]);
      // console.log(porcentajesParcialidadVentas);
      const reportsGroup = groupBy(
        reportsPorRuta,
        (reporte: any) => reporte.COBRADOR_ID,
        (reporte: any) => ({
          ...reporte,
          SEMANA: parseInt(
            new String(reporte?.FECHA_M).split("").slice(4, 6).join("")
          ),
        })
      );

      const reports = Object.keys(reportsGroup).map((key: any) => {
        const total_cuentas = numCtasRutas.find(
          (numCtasRuta) =>
            numCtasRuta.COBRADOR_ID === reportsGroup[key][0].COBRADOR_ID
        ).TOTAL_CUENTAS;
        const porcentajeParcialidaRuta = porcentajesParcialidadRutas.find(
          (porceParcialRuta) =>
            porceParcialRuta.COBRADOR_ID === reportsGroup[key][0].COBRADOR_ID
        );
        return {
          ...reportsGroup[key][0],
          NUMERO_CTAS: total_cuentas,
          PORCENTAJE_COBRO:
            (reportsGroup[key][0].NUM_CTAS_COB / total_cuentas) * 100,
          PORCENTAJE_COBRO_PARCIALIDAD:
            porcentajeParcialidaRuta.SUM_PORC_PAGOS_RUTA,
          HISTORIAL: reportsGroup[key],
        };
      });
      resolve(reports);
    } catch (err) {
      reject(err);
    }
  });
};

const calcFechasUltDiezSemanas = (): string => {
  const listDiezSemanas = [];
  for (let i = 0; i < 10; i++) {
    listDiezSemanas.push(moment().subtract(i, "weeks").format("YYYYW"));
  }
  return listDiezSemanas.join(",");
};

export default {
  getReportsRutas,
};
