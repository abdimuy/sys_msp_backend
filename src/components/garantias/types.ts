export interface GarantiaImageRow {
  ID: number;
  GARANTIA_ID: number;
  IMG_PATH: string;
  IMG_MIME: string;
  IMG_DESC: string;
  FECHA_SUBIDA: string;
  EVENTO_ID: string | null;
}

export interface UploadedFile {
  filename: string;
  mimetype: string;
  originalname: string;
}

export interface GarantiaRow {
  ID: number;
  DOCTO_CC_ID: number;
  FECHA_SOLICITUD: string;
  DESCRIPCION_FALLA: string;
  ESTADO: string;
  FECHA_ULT_ACT: string;
  OBSERVACIONES: string | null;
}

export interface CreateGarantiaRequest {
  doctoCcId: number;
  descripcionFalla: string;
  observaciones?: string;
}

export interface CreateImagenGarantiaRequest {
  imgPath: string;
  imgMime: string;
  imgDesc: string;
}

export type GarantiaEventoRow = {
  ID: string;
  GARANTIA_ID: number;
  TIPO_EVENTO: string;
  FECHA_EVENTO: string;
  COMENTARIO: string | null;
  IMAGENES?: GarantiaImageRow[];
};

export const AllowedEstados = [
  "NOTIFICADO",
  "RECOLECTADO",
  "RECIBIDO",
  "LEVANTAMIENTO_REPORTE",
  "EN_PROCESO_REPARACION",
  "NO_APLICABLE",
  "APLICABLE",
  "LISTO_PARA_ENTREGAR",
  "ENTREGADO",
  "CIERRE_GARANTIA",
  "CANCELADO",
] as const;

export type EstadoGarantia = typeof AllowedEstados[number];
