import store from "./store";

const getVendedores = () => {
  return new Promise((resolve, reject) => {
    resolve(store.list());
  });
};

export default {
  getVendedores
}