import { Timestamp } from "../../repositories/firebase";

// Documento de Firestore (colección 'users')
export interface IUsuarioFirestore {
  EMAIL: string;
  NOMBRE: string;
  TELEFONO?: string;
  COBRADOR_ID?: number;
  ZONA_CLIENTE_ID?: number;
  CAMIONETA_ASIGNADA?: number;
  MODULOS?: string[];
  VERSION_APP?: string;
  P?: string;
  VENDEDORES_PERMITIDOS_DESKTOP?: string[];
  CREATED_AT?: Timestamp;
  FECHA_CARGA_INICIAL?: Timestamp;
  FECHA_VERSION_APP?: Timestamp;
}

// Usuario combinado Auth + Firestore
export interface IUsuarioMerged {
  uid: string;
  email: string;
  disabled: boolean;
  lastSignIn: string | null;
  creationTime: string | null;
  // Campos Firestore
  nombre: string | null;
  telefono: string | null;
  cobradorId: number | null;
  zonaClienteId: number | null;
  camionetaAsignada: number | null;
  modulos: string[];
  versionApp: string | null;
  vendedoresPermitidosDesktop: string[];
  firestoreDocId: string | null; // ID del doc en Firestore (puede diferir del uid)
}

// Request para crear usuario
export interface ICreateUsuarioRequest {
  email: string;
  password: string;
  nombre: string;
  telefono?: string;
  cobradorId?: number;
  zonaClienteId?: number;
  camionetaAsignada?: number;
  modulos?: string[];
  vendedoresPermitidosDesktop?: string[];
}

// Request para cambiar contraseña
export interface IChangePasswordRequest {
  newPassword: string;
}

// Request para cambiar estatus
export interface IChangeStatusRequest {
  disabled: boolean;
}

// Errores tipados
export enum TipoErrorUsuario {
  VALIDACION = "VALIDACION",
  NO_ENCONTRADO = "NO_ENCONTRADO",
  DUPLICADO = "DUPLICADO",
  FIREBASE_AUTH = "FIREBASE_AUTH",
  FIREBASE_FIRESTORE = "FIREBASE_FIRESTORE",
  ERROR_TECNICO = "ERROR_TECNICO",
}

export class ErrorUsuario extends Error {
  tipo: TipoErrorUsuario;
  detalles: string[];
  codigo: string;

  constructor(
    tipo: TipoErrorUsuario,
    mensaje: string,
    detalles: string[] = [],
    codigo: string = "ERROR_USUARIO"
  ) {
    super(mensaje);
    this.tipo = tipo;
    this.detalles = detalles;
    this.codigo = codigo;
    this.name = "ErrorUsuario";
  }
}
