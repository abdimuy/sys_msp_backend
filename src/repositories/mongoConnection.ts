import { MongoClient, Db, Collection, Filter, WithId, AggregateOptions } from 'mongodb';

const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'msp';

let dbInstance: Db | null = null;

export async function connectToMongo(): Promise<Db> {
  if (dbInstance) {
    return dbInstance;
  }
  try {
    const client = new MongoClient(mongoUrl);
    await client.connect();
    dbInstance = client.db(dbName);
    console.log('Conectado a MongoDB');
    return dbInstance;
  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
    throw error;
  }
}

/**
 * Obtiene datos de la colección especificada aplicando un filtro opcional.
 * @param collection - Nombre de la colección en MongoDB.
 * @param query - Objeto de consulta para filtrar documentos.
 * @returns Promise con un arreglo de documentos del tipo T.
 */
export async function getCollection<T extends Document>(collection: string, query: Filter<T> = {}): Promise<WithId<T>[]> {
  const client = new MongoClient(mongoUrl);
  try {
    await client.connect();
    const db: Db = client.db(dbName);
    const collectionRef: Collection<T> = db.collection(collection);
    const docs: WithId<T>[] = await collectionRef.find(query).toArray();
    return docs;
  } catch (error) {
    console.error("Error al obtener datos:", error);
    return [];
  } finally {
    await client.close();
  }
}

export async function aggregateCollection<T extends Document>(
  collectionName: string,
  pipeline: object[] = [],
  options: AggregateOptions = { allowDiskUse: true, maxTimeMS: 60000 }
): Promise<T[]> {
  const client = new MongoClient(mongoUrl);
  try {
    await client.connect();
    const db: Db = client.db(dbName);
    const collectionRef: Collection<T> = db.collection(collectionName);
    // El método aggregate devuelve T[], ya que _id no se garantiza
    const docs: T[] = await collectionRef.aggregate<T>(pipeline, options).toArray();
    return docs;
  } catch (error) {
    console.error("Error al ejecutar la agregación:", error);
    return [];
  } finally {
    await client.close();
  }
}