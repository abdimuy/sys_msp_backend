import store from "./store";

interface IGetMovimientosController {
  id?: number[];
  almacenId?: number;
}

const getMovimientosIndiv = ({ id = [], almacenId}: IGetMovimientosController = {}) => {
  return new Promise<any[]>(async(resolve, reject) => {
    try {
      const movimientosIndiv: any[] = await store.list({
        id: id,
        almacenId: almacenId
      });
      resolve(movimientosIndiv);
    } catch (err) {
      reject(err);
    };
  });
};

export default {
  getMovimientosIndiv
}