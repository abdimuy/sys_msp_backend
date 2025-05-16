import { db } from "../../repositories/firebase";
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

const updateZonasFirebase = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const zonas = await store.getZonasCliente();
      zonas.forEach(async (zona) => {
        await db.collection("zonas_cliente").add(zona as any)
      })
      resolve("Updated Zonas")
    } catch(err) {
      reject(err)
    }
  })
}

export default { getZonasCliente, updateZonasFirebase };
