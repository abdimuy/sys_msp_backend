import store from "./store";
import { Timestamp } from "../../repositories/firebase";
import {
  IUsuarioMerged,
  ICreateUsuarioRequest,
  IUsuarioFirestore,
  ErrorUsuario,
  TipoErrorUsuario,
} from "./interfaces";

// ==================== VALIDACIONES ====================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validarEmail = (email: string) => {
  if (!email || !EMAIL_REGEX.test(email)) {
    throw new ErrorUsuario(
      TipoErrorUsuario.VALIDACION,
      "Email inválido",
      [`El email '${email}' no tiene un formato válido`],
      "EMAIL_INVALIDO"
    );
  }
};

const validarPassword = (password: string) => {
  if (!password || password.length < 6) {
    throw new ErrorUsuario(
      TipoErrorUsuario.VALIDACION,
      "La contraseña debe tener al menos 6 caracteres",
      [],
      "PASSWORD_CORTO"
    );
  }
};

// ==================== OPERACIONES ====================

// Listar usuarios (Auth + Firestore merged)
const listarUsuarios = async (
  filtroStatus?: "activo" | "inactivo"
): Promise<IUsuarioMerged[]> => {
  const [authUsers, firestoreMap] = await Promise.all([
    store.listAllAuthUsers(),
    store.listFirestoreUsers(),
  ]);

  let usuarios: IUsuarioMerged[] = authUsers.map((authUser) => {
    // Buscar doc por uid, luego por email como fallback
    const fsData =
      firestoreMap.get(authUser.uid) ||
      firestoreMap.get(`email:${authUser.email?.toLowerCase()}`);

    const fs = fsData?.data;

    return {
      uid: authUser.uid,
      email: authUser.email || "",
      disabled: authUser.disabled,
      lastSignIn: authUser.metadata.lastSignInTime || null,
      creationTime: authUser.metadata.creationTime || null,
      nombre: fs?.NOMBRE || null,
      telefono: fs?.TELEFONO || null,
      cobradorId: fs?.COBRADOR_ID || null,
      zonaClienteId: fs?.ZONA_CLIENTE_ID || null,
      camionetaAsignada: fs?.CAMIONETA_ASIGNADA || null,
      modulos: fs?.MODULOS || [],
      versionApp: fs?.VERSION_APP || null,
      vendedoresPermitidosDesktop: fs?.VENDEDORES_PERMITIDOS_DESKTOP || [],
      firestoreDocId: fsData?.docId || null,
    };
  });

  // Filtrar por estatus
  if (filtroStatus === "activo") {
    usuarios = usuarios.filter((u) => !u.disabled);
  } else if (filtroStatus === "inactivo") {
    usuarios = usuarios.filter((u) => u.disabled);
  }

  // Ordenar por nombre
  usuarios.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));

  return usuarios;
};

// Crear usuario (Auth + Firestore con rollback)
const crearUsuario = async (data: ICreateUsuarioRequest): Promise<IUsuarioMerged> => {
  // Validaciones
  validarEmail(data.email);
  validarPassword(data.password);

  if (!data.nombre || data.nombre.trim() === "") {
    throw new ErrorUsuario(
      TipoErrorUsuario.VALIDACION,
      "El nombre es requerido",
      [],
      "NOMBRE_REQUERIDO"
    );
  }

  // Paso 1: Crear en Auth
  const authUser = await store.createAuthUser(
    data.email,
    data.password,
    data.nombre
  );

  // Paso 2: Crear documento en Firestore (sin campos undefined)
  const firestoreData: Record<string, any> = {
    EMAIL: data.email,
    NOMBRE: data.nombre.toUpperCase(),
    TELEFONO: data.telefono || "",
    MODULOS: data.modulos || [],
    VENDEDORES_PERMITIDOS_DESKTOP: data.vendedoresPermitidosDesktop || [],
    P: data.password,
    CREATED_AT: Timestamp.now(),
  };
  if (data.cobradorId !== undefined) firestoreData.COBRADOR_ID = data.cobradorId;
  if (data.zonaClienteId !== undefined) firestoreData.ZONA_CLIENTE_ID = data.zonaClienteId;
  if (data.camionetaAsignada !== undefined) firestoreData.CAMIONETA_ASIGNADA = data.camionetaAsignada;

  try {
    await store.createFirestoreUser(authUser.uid, firestoreData as IUsuarioFirestore);
  } catch (firestoreError) {
    // Rollback: eliminar usuario de Auth si Firestore falla
    try {
      await store.deleteAuthUser(authUser.uid);
    } catch (rollbackError) {
      console.error("Error en rollback de Auth después de fallo en Firestore:", rollbackError);
    }
    throw firestoreError;
  }

  return {
    uid: authUser.uid,
    email: data.email,
    disabled: false,
    lastSignIn: null,
    creationTime: authUser.metadata.creationTime || null,
    nombre: firestoreData.NOMBRE,
    telefono: firestoreData.TELEFONO || null,
    cobradorId: firestoreData.COBRADOR_ID || null,
    zonaClienteId: firestoreData.ZONA_CLIENTE_ID || null,
    camionetaAsignada: firestoreData.CAMIONETA_ASIGNADA || null,
    modulos: firestoreData.MODULOS || [],
    versionApp: null,
    vendedoresPermitidosDesktop: firestoreData.VENDEDORES_PERMITIDOS_DESKTOP || [],
    firestoreDocId: authUser.uid,
  };
};

// Cambiar contraseña
const cambiarPassword = async (
  uid: string,
  newPassword: string
): Promise<{ message: string }> => {
  validarPassword(newPassword);

  // Verificar que existe
  const authUser = await store.getAuthUser(uid);

  // Actualizar en Auth
  await store.changePassword(uid, newPassword);

  // Actualizar campo P en Firestore
  const fsDoc = await store.getFirestoreDocRef(uid, authUser.email);
  if (fsDoc) {
    try {
      await store.updateFirestoreUser(fsDoc.docId, { P: newPassword });
    } catch (error) {
      // No revertir Auth — la contraseña ya cambió, el campo P es secundario
      console.error("Error al actualizar campo P en Firestore:", error);
    }
  }

  return { message: "Contraseña actualizada correctamente" };
};

// Cambiar estatus (habilitar/deshabilitar)
const cambiarEstatus = async (
  uid: string,
  disabled: boolean
): Promise<{ message: string }> => {
  if (typeof disabled !== "boolean") {
    throw new ErrorUsuario(
      TipoErrorUsuario.VALIDACION,
      "El campo 'disabled' debe ser true o false",
      [],
      "DISABLED_INVALIDO"
    );
  }

  // Verificar que existe
  await store.getAuthUser(uid);

  await store.setUserDisabled(uid, disabled);

  return {
    message: disabled
      ? "Usuario deshabilitado correctamente"
      : "Usuario habilitado correctamente",
  };
};

// Eliminar usuario (Firestore primero, luego Auth, con rollback)
const eliminarUsuario = async (uid: string): Promise<{ message: string }> => {
  // Verificar que existe
  const authUser = await store.getAuthUser(uid);

  // Obtener datos de Firestore para posible rollback
  const fsDoc = await store.getFirestoreDocRef(uid, authUser.email);
  let firestoreBackup: IUsuarioFirestore | null = null;
  let firestoreDocId: string | null = null;

  // Paso 1: Eliminar Firestore primero
  if (fsDoc) {
    firestoreBackup = fsDoc.data;
    firestoreDocId = fsDoc.docId;
    await store.deleteFirestoreUser(fsDoc.docId);
  }

  // Paso 2: Eliminar Auth
  try {
    await store.deleteAuthUser(uid);
  } catch (authError) {
    // Rollback: recrear documento en Firestore
    if (firestoreBackup && firestoreDocId) {
      try {
        await store.createFirestoreUser(firestoreDocId, firestoreBackup);
      } catch (rollbackError) {
        console.error("Error en rollback de Firestore después de fallo en Auth:", rollbackError);
      }
    }
    throw authError;
  }

  return { message: "Usuario eliminado correctamente" };
};

export default {
  listarUsuarios,
  crearUsuario,
  cambiarPassword,
  cambiarEstatus,
  eliminarUsuario,
};
