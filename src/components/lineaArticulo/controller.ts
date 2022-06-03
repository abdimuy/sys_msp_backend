import store from "./store";

const getLineasArticulos = () => {
  return new Promise((resolve, reject) => {
    try {
      const lineasArticulos = store.list();
      resolve(lineasArticulos);
    } catch (error) {
      reject(error);
    };
  });
};

export default {
  getLineasArticulos,
}