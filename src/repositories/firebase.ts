import serviceAccount from "../../serviceAccountKey.json";
import {
  getFirestore,
  Timestamp,
  FieldValue,
  Filter,
} from "firebase-admin/firestore";
import admin from "firebase-admin";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as any),
});

const db = getFirestore();

export { db, Timestamp, FieldValue, Filter };
