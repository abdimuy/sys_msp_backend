import { query } from "../../repositories/fbRepository";
import { GarantiaImageRow } from "./types";

async function addGarantiaImage(
    garantiaId: number,
    imgPath: string,
    imgMime: string,
    imgDesc: string
): Promise<GarantiaImageRow> {
    const sql = `
      INSERT INTO GARANTIA_IMAGENES
        (GARANTIA_ID, IMG_PATH, IMG_MIME, IMG_DESC)
      VALUES
        (?, ?, ?, ?)
      RETURNING ID, GARANTIA_ID, IMG_PATH, IMG_MIME, IMG_DESC, FECHA_SUBIDA
    `;
    const params = [garantiaId, imgPath, imgMime, imgDesc];
    const res = await query<GarantiaImageRow>({sql, params});
    console.log(res)
    return res[0]
  }
  
export default {
    addGarantiaImage
}
  