import store from "./store";
import controllerMovimientos from "../movimientos/controller";

const getAlmacenes = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await store.list();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};

const getOneAlmacen = (id: number, comparation: string) => {
  return new Promise((resolve, reject) => {
    try {
      const almacen = store.one(id, comparation);
      resolve(almacen);
    } catch (error) {
      reject(error);
    }
  });
};

const getAlmacenMov = (id: number) => {
  return new Promise(async (resolve, reject) => {
    try {
      const [almacenInfo, almacenMovs] = await Promise.all([
        store.oneOnlyInfo(id),
        controllerMovimientos.getMovimientosByAlmacen(id),
      ]);
      resolve({
        ALMACEN: almacenInfo,
        MOVIMIENTOS: almacenMovs,
      });
    } catch (error) {
      reject(error);
    }
  });
};

export default {
  getAlmacenes,
  getOneAlmacen,
  getAlmacenMov,
};
