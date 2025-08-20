import store from './store';
import controllerMovimIndiv from '../movimientosIndividual/controller'

const getMovimientos = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const movimientos: any[] = await store.list();
      const movimientosIndiv = await controllerMovimIndiv.getMovimientosIndiv({
        id: movimientos.map(movim => movim.DOCTO_IN_ID)
      });
      const movimientosWithIndiv = movimientos.map(movim => {
        const movimIndiv = movimientosIndiv.filter(movimInd => movimInd.DOCTO_IN_ID === movim.DOCTO_IN_ID);
        movim.MOVIMIENTOS = movimIndiv;
        return movim;
      })
      resolve(movimientosWithIndiv);
    } catch (err) {
      reject(err);
    };
  });
};

const getMovimientosByAlmacen = (almacenId: number) => {
  return new Promise(async (resolve, reject) => {
    try {
      const movimientos: any[] = await store.oneByAlmacen(almacenId);
      const movimientosIndiv = await controllerMovimIndiv.getMovimientosIndiv({
        id: movimientos.map(movim => movim.DOCTO_IN_ID),
        almacenId: almacenId
      });
      const movimientosWithIndiv = movimientos.map(movim => {
        const movimIndiv = movimientosIndiv.filter(movimInd => movimInd.DOCTO_IN_ID === movim.DOCTO_IN_ID);
        movim.MOVIMIENTOS_INDIV = movimIndiv;
        return movim;
      })
      resolve(movimientosWithIndiv);
    } catch (err) {
      reject(err);
    };
  });
}

export default {
  getMovimientos,
  getMovimientosByAlmacen
}