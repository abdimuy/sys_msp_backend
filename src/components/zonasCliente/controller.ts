import store from "./stores";

const getZonasCliente = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const zonas = await store.getZonasCliente();
      resolve(zonas);
    } catch (error) {
      reject(error);
    }
  });
};

export default { getZonasCliente };
