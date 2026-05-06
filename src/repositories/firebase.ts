import path from "path";
import fs from "fs";
import {
  getFirestore,
  Timestamp,
  FieldValue,
  Filter,
} from "firebase-admin/firestore";
import admin from "firebase-admin";

const serviceAccountPath = path.join(__dirname, "..", "..", "serviceAccountKey.json");

let db: FirebaseFirestore.Firestore;

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any),
  });
  db = getFirestore();
} else {
  console.warn(
    `[firebase] serviceAccountKey.json no encontrado en ${serviceAccountPath}. ` +
      `Firebase queda sin inicializar; cualquier llamada a 'db' fallará en runtime.`
  );
  db = new Proxy({} as FirebaseFirestore.Firestore, {
    get() {
      throw new Error(
        "Firebase no está inicializado: falta serviceAccountKey.json en la raíz del proyecto."
      );
    },
  });
}

export { db, admin, Timestamp, FieldValue, Filter };
