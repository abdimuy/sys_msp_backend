import store from "./store";

const getRutas = () => {
  return new Promise((resolve, reject) => {
    try {
      const rutas = store.getRutas();
      resolve(rutas);
    } catch (err) {
      reject(err);
    }
  });
};

const getNumCtasByRuta = () => {
  return new Promise<any[]>((resolve, reject) => {
    resolve(store.getNumCtasByRuta());
  });
};

export default {
  getRutas,
  getNumCtasByRuta,
};
