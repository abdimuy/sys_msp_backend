import { Express } from "express";
import Home from "../components/home/network";
import almacenes from "../components/almacenes/network";
import movimientos from "../components/movimientos/network";
import movimientoIndividuales from "../components/movimientosIndividual/network";
import articulos from "../components/articulos/network";
import lineasArticulos from "../components/lineaArticulo/network";
import vendedores from "../components/vendedores/network";
import ventas from "../components/ventas/network";
import clientes from "../components/clientes/network";
import rutas from "../components/rutas/network";
import reportesPorRuta from "../components/reportePorRuta/network";
import zonasCliente from "../components/zonasCliente/network";
import visitas from "../components/visitas/network";
import pagos from "../components/pagos/newtwork";
import sincronizarAMongo from "../components/sincronizarAMongo/network";
import garantias from "../components/garantias/network";

const appRouter = (server: Express) => {
  server.use("/garantias", garantias);
  server.use("/", Home);
  server.use("/almacenes", almacenes);
  server.use("/movimientos", movimientos);
  server.use("/movimientos_indiv", movimientoIndividuales);
  server.use("/articulos", articulos);
  server.use("/lineas_articulos", lineasArticulos);
  server.use("/vendedores", vendedores);
  server.use("/ventas", ventas);
  server.use("/clientes", clientes);
  server.use("/rutas", rutas);
  server.use("/reports_ruta", reportesPorRuta);
  server.use("/zonas-cliente", zonasCliente);
  server.use("/visitas", visitas);
  server.use("/pagos", pagos);
  server.use("/sync", sincronizarAMongo);
};

export default appRouter;
