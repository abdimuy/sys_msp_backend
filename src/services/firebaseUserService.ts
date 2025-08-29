import { db, Timestamp } from "../repositories/firebase";

interface IFirebaseUser {
  EMAIL: string;
  NOMBRE: string;
  CAMIONETA_ASIGNADA: number;
  COBRADOR_ID: number;
  ZONA_CLIENTE_ID: number;
  TELEFONO: string;
  MODULOS: string[];
  VERSION_APP: string;
  P: string;
  CREATED_AT: Timestamp;
  FECHA_CARGA_INICIAL: Timestamp;
  FECHA_VERSION_APP: Timestamp;
}

export const obtenerAlmacenDelUsuario = async (userEmail: string): Promise<number> => {
  try {
    const usersCollection = db.collection('users');
    const querySnapshot = await usersCollection.where('EMAIL', '==', userEmail).get();
    
    if (querySnapshot.empty) {
      throw new Error(`Usuario con email ${userEmail} no encontrado en Firebase`);
    }
    
    const userData = querySnapshot.docs[0].data() as IFirebaseUser;
    
    if (!userData.CAMIONETA_ASIGNADA) {
      throw new Error(`Usuario ${userEmail} no tiene camioneta/almacén asignado`);
    }
    
    return userData.CAMIONETA_ASIGNADA;
  } catch (error) {
    throw new Error(`Error al obtener almacén del usuario: ${error instanceof Error ? error.message : error}`);
  }
};

export const obtenerInfoUsuario = async (userEmail: string): Promise<IFirebaseUser> => {
  try {
    const usersCollection = db.collection('users');
    const querySnapshot = await usersCollection.where('EMAIL', '==', userEmail).get();
    
    if (querySnapshot.empty) {
      throw new Error(`Usuario con email ${userEmail} no encontrado en Firebase`);
    }
    
    return querySnapshot.docs[0].data() as IFirebaseUser;
  } catch (error) {
    throw new Error(`Error al obtener información del usuario: ${error instanceof Error ? error.message : error}`);
  }
};

export default {
  obtenerAlmacenDelUsuario,
  obtenerInfoUsuario
};