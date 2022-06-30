import store from "./store";

const getClienteById = (clienteId: number) => {
  return new Promise<any[]>((resolve, reject) => {
    try {
      const cliente = store.getCliente({ clienteId });
      resolve(cliente);
    } catch (err) {
      reject(err);
    }
  });
};

const getClienteByText = (text: string) => {
  return new Promise(async (resolve, reject) => {
    try {
      const cliente = await store.getClienteByText(text);
      resolve(cliente);
    } catch (err) {
      reject(err);
    }
  });
};

const getClientesByRuta = (rutaId: number) => {
  return new Promise<any[]>(async (resolve, reject) => {
    try {
      const clientesList = await store.getClientesByRuta(rutaId);
      resolve(clientesList);
    } catch (err) {
      reject(err);
    }
  });
};

export default {
  getClienteById,
  getClienteByText,
  getClientesByRuta,
};
