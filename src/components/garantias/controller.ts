import store from "./store";
import { GarantiaImageRow, UploadedFile } from "./types";

export async function uploadGarantiaImages(
  garantiaId: number,
  files: UploadedFile[],
): Promise<GarantiaImageRow[]> {
  if (!Number.isInteger(garantiaId) || garantiaId <= 0) {
    throw new Error("ID de garantía inválido");
  }
  if (!files || files.length === 0) {
    throw new Error("No se recibieron archivos para procesar");
  }

  const insertedRows: GarantiaImageRow[] = [];

  for (const file of files) {
    const imgPath = `/uploads/garantias/${file.filename}`;
    const imgMime = file.mimetype;
    const imgDesc = file.originalname;

    const row = await store.addGarantiaImage(
      garantiaId,
      imgPath,
      imgMime,
      imgDesc,
    );

    insertedRows.push(row);
  }

  return insertedRows;
}
