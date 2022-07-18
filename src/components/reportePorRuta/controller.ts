import { groupBy } from "../../utils/arrayGroupBy";
import store from "./store";
import controllerRutas from "../rutas/controller";
import moment from "moment";

const getReportsRutas = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const fechasUltDiezSemanas = calcFechasUltDiezSemanas();
      const fechaSemanaActual = moment().format("YYYYW");
      const [reportsPorRuta, numCtasRutas, porcentajesParcialidadRutas] =
        await Promise.all([
          store.listReportsRuta(fechasUltDiezSemanas),
          controllerRutas.getNumCtasByRuta(),
          store.listPorcentajesParcialidadRuta(parseInt(fechaSemanaActual)),
        ]);
      const reportsGroup = groupBy(
        reportsPorRuta,
        (reporte: any) => reporte.ZONA_CLIENTE_ID,
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
            numCtasRuta.ZONA_CLIENTE_ID === reportsGroup[key][0].ZONA_CLIENTE_ID
        )?.TOTAL_CUENTAS;
        const porcentajeParcialidaRuta = porcentajesParcialidadRutas.find(
          (porceParcialRuta) =>
            porceParcialRuta.ZONA_CLIENTE_ID ===
            reportsGroup[key][0].ZONA_CLIENTE_ID
        );
        return {
          ...reportsGroup[key][0],
          NUMERO_CTAS: total_cuentas,
          PORCENTAJE_COBRO: Number.parseFloat(
            (
              (reportsGroup[key][0].NUM_CTAS_COB / total_cuentas) *
              100
            ).toString()
          ).toFixed(2),
          PORCENTAJE_COBRO_PARCIALIDAD:
            porcentajeParcialidaRuta?.PAGO_PARCIAL_PROMEDIO || 0,
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
