import store from './store';

const getArticulos = () => {
  return new Promise(async(resolve, reject) => {
    resolve(store.list());
  });
};

const getArticulo = (articuloId: string) => {
  return new Promise((resolve, reject) => {
    
  })
}

export default {
  getArticulos,
  getArticulo
}