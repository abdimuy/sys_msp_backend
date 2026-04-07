import { admin, db, Timestamp } from "../../repositories/firebase";
import { IUsuarioFirestore, ErrorUsuario, TipoErrorUsuario } from "./interfaces";
import { UserRecord } from "firebase-admin/auth";

// ==================== AUTH ====================

// Listar todos los usuarios de Firebase Auth (con paginación)
const listAllAuthUsers = async (): Promise<UserRecord[]> => {
  const users: UserRecord[] = [];
  let pageToken: string | undefined;

  do {
    const result = await admin.auth().listUsers(1000, pageToken);
    users.push(...result.users);
    pageToken = result.pageToken;
  } while (pageToken);

  return users;
};

// Obtener un usuario de Auth por uid
const getAuthUser = async (uid: string): Promise<UserRecord> => {
  try {
    return await admin.auth().getUser(uid);
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      throw new ErrorUsuario(
        TipoErrorUsuario.NO_ENCONTRADO,
        `Usuario con uid ${uid} no encontrado en Auth`,
        [],
        "AUTH_USER_NOT_FOUND"
      );
    }
    throw new ErrorUsuario(
      TipoErrorUsuario.FIREBASE_AUTH,
      "Error al obtener usuario de Auth",
      [error.message],
      "AUTH_GET_ERROR"
    );
  }
};

// Crear usuario en Auth
const createAuthUser = async (
  email: string,
  password: string,
  displayName?: string
): Promise<UserRecord> => {
  try {
    return await admin.auth().createUser({ email, password, displayName });
  } catch (error: any) {
    if (error.code === "auth/email-already-exists") {
      throw new ErrorUsuario(
        TipoErrorUsuario.DUPLICADO,
        `Ya existe un usuario con el email ${email}`,
        [],
        "AUTH_EMAIL_DUPLICADO"
      );
    }
    if (error.code === "auth/invalid-password") {
      throw new ErrorUsuario(
        TipoErrorUsuario.VALIDACION,
        "La contraseña debe tener al menos 6 caracteres",
        [],
        "AUTH_INVALID_PASSWORD"
      );
    }
    throw new ErrorUsuario(
      TipoErrorUsuario.FIREBASE_AUTH,
      "Error al crear usuario en Auth",
      [error.message],
      "AUTH_CREATE_ERROR"
    );
  }
};

// Actualizar email en Auth
const updateAuthEmail = async (uid: string, email: string): Promise<void> => {
  try {
    await admin.auth().updateUser(uid, { email });
  } catch (error: any) {
    if (error.code === "auth/email-already-exists") {
      throw new ErrorUsuario(
        TipoErrorUsuario.DUPLICADO,
        `Ya existe un usuario con el email ${email}`,
        [],
        "AUTH_EMAIL_DUPLICADO"
      );
    }
    throw new ErrorUsuario(
      TipoErrorUsuario.FIREBASE_AUTH,
      "Error al actualizar email en Auth",
      [error.message],
      "AUTH_UPDATE_EMAIL_ERROR"
    );
  }
};

// Cambiar contraseña
const changePassword = async (uid: string, newPassword: string): Promise<void> => {
  try {
    await admin.auth().updateUser(uid, { password: newPassword });
  } catch (error: any) {
    throw new ErrorUsuario(
      TipoErrorUsuario.FIREBASE_AUTH,
      "Error al cambiar contraseña",
      [error.message],
      "AUTH_CHANGE_PASSWORD_ERROR"
    );
  }
};

// Habilitar/deshabilitar usuario
const setUserDisabled = async (uid: string, disabled: boolean): Promise<void> => {
  try {
    await admin.auth().updateUser(uid, { disabled });
  } catch (error: any) {
    throw new ErrorUsuario(
      TipoErrorUsuario.FIREBASE_AUTH,
      "Error al cambiar estatus del usuario",
      [error.message],
      "AUTH_DISABLE_ERROR"
    );
  }
};

// Eliminar usuario de Auth
const deleteAuthUser = async (uid: string): Promise<void> => {
  try {
    await admin.auth().deleteUser(uid);
  } catch (error: any) {
    throw new ErrorUsuario(
      TipoErrorUsuario.FIREBASE_AUTH,
      "Error al eliminar usuario de Auth",
      [error.message],
      "AUTH_DELETE_ERROR"
    );
  }
};

// ==================== FIRESTORE ====================

// Obtener referencia del documento de Firestore por uid o por email (fallback)
const getFirestoreDocRef = async (uid: string, email?: string) => {
  // Intentar por uid primero
  const docRef = db.collection("users").doc(uid);
  const doc = await docRef.get();

  if (doc.exists) {
    return { ref: docRef, data: doc.data() as IUsuarioFirestore, docId: uid };
  }

  // Fallback: buscar por email (docs existentes pueden no usar uid como ID)
  if (email) {
    const snapshot = await db
      .collection("users")
      .where("EMAIL", "==", email)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const matchDoc = snapshot.docs[0];
      return {
        ref: matchDoc.ref,
        data: matchDoc.data() as IUsuarioFirestore,
        docId: matchDoc.id,
      };
    }
  }

  return null;
};

// Listar todos los documentos de Firestore
const listFirestoreUsers = async (): Promise<
  Map<string, { data: IUsuarioFirestore; docId: string }>
> => {
  const snapshot = await db.collection("users").get();
  const map = new Map<string, { data: IUsuarioFirestore; docId: string }>();

  snapshot.forEach((doc) => {
    const data = doc.data() as IUsuarioFirestore;
    // Guardar por docId Y por email para facilitar el merge
    map.set(doc.id, { data, docId: doc.id });
    if (data.EMAIL) {
      map.set(`email:${data.EMAIL.toLowerCase()}`, { data, docId: doc.id });
    }
  });

  return map;
};

// Crear documento en Firestore (usa uid como doc ID)
const createFirestoreUser = async (
  uid: string,
  data: IUsuarioFirestore
): Promise<void> => {
  try {
    await db.collection("users").doc(uid).set(data);
  } catch (error: any) {
    throw new ErrorUsuario(
      TipoErrorUsuario.FIREBASE_FIRESTORE,
      "Error al crear documento de usuario en Firestore",
      [error.message],
      "FIRESTORE_CREATE_ERROR"
    );
  }
};

// Actualizar documento en Firestore
const updateFirestoreUser = async (
  docId: string,
  data: Partial<IUsuarioFirestore>
): Promise<void> => {
  try {
    await db.collection("users").doc(docId).update(data);
  } catch (error: any) {
    throw new ErrorUsuario(
      TipoErrorUsuario.FIREBASE_FIRESTORE,
      "Error al actualizar documento de usuario en Firestore",
      [error.message],
      "FIRESTORE_UPDATE_ERROR"
    );
  }
};

// Eliminar documento de Firestore
const deleteFirestoreUser = async (docId: string): Promise<void> => {
  try {
    await db.collection("users").doc(docId).delete();
  } catch (error: any) {
    throw new ErrorUsuario(
      TipoErrorUsuario.FIREBASE_FIRESTORE,
      "Error al eliminar documento de usuario en Firestore",
      [error.message],
      "FIRESTORE_DELETE_ERROR"
    );
  }
};

export default {
  listAllAuthUsers,
  getAuthUser,
  createAuthUser,
  updateAuthEmail,
  changePassword,
  setUserDisabled,
  deleteAuthUser,
  getFirestoreDocRef,
  listFirestoreUsers,
  createFirestoreUser,
  updateFirestoreUser,
  deleteFirestoreUser,
};
