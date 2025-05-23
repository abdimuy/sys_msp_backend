export interface GarantiaImageRow {
  ID: number;
  GARANTIA_ID: number;
  IMG_PATH: string;
  IMG_MIME: string;
  IMG_DESC: string;
  FECHA_SUBIDA: string;
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
