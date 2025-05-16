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