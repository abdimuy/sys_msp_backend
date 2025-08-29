import { query } from "../repositories/fbRepository";
import { QUERY_VALIDAR_EXISTENCIAS } from "../components/traspasos/querys";
import { IProductoVentaLocalInput } from "../components/ventasLocales/interfaces";

interface IExistenciaResult {
  ARTICULO_ID: number;
  CLAVE: string;
  NOMBRE: string;
  EXISTENCIA: number;
  EXISTENCIA_DISPONIBLE: number;
}

export const validarStockParaVenta = async (
  almacenId: number,
  productos: IProductoVentaLocalInput[]
): Promise<{ valido: boolean; errores: string[] }> => {
  const errores: string[] = [];

  try {
    for (const producto of productos) {
      const result = await query<IExistenciaResult>({
        sql: QUERY_VALIDAR_EXISTENCIAS,
        params: [almacenId, producto.articuloId],
      });

      if (result.length === 0) {
        errores.push(`Artículo ID ${producto.articuloId} no encontrado en el almacén`);
      } else if (result[0].EXISTENCIA_DISPONIBLE < producto.cantidad) {
        errores.push(
          `Artículo ${result[0].CLAVE} - ${result[0].NOMBRE}: ` +
            `existencia disponible (${result[0].EXISTENCIA_DISPONIBLE}) ` +
            `menor a la solicitada (${producto.cantidad})`
        );
      }
    }

    return {
      valido: errores.length === 0,
      errores
    };
  } catch (error) {
    throw new Error(`Error al validar stock: ${error instanceof Error ? error.message : error}`);
  }
};

export default {
  validarStockParaVenta
};