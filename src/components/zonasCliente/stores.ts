import { query } from "../../repositories/fbRepository";
import { GET_ZONAS_CLIENTE, GET_COBRADORES_POR_ZONA } from "./queries";

interface IZonaCliente {
  ZONA_CLIENTE_ID: number;
  ZONA_CLIENTE: string;
}

interface ICobradorZona {
  ZONA_CLIENTE_ID: number;
  COBRADOR_ID: number;
  COBRADOR: string;
}

const getZonasCliente = async (): Promise<IZonaCliente[]> => {
  // 1. Obtener zonas
  const zonas = await query<IZonaCliente>({
    sql: GET_ZONAS_CLIENTE,
    params: [],
    converters: [{ column: "ZONA_CLIENTE", type: "buffer" }],
  });

  // 2. Obtener cobradores únicos por zona
  const cobradoresPorZona = await query<ICobradorZona>({
    sql: GET_COBRADORES_POR_ZONA,
    params: [],
    converters: [{ column: "COBRADOR", type: "buffer" }],
  });

  // 3. Agrupar cobradores por zona
  const cobradorMap = new Map<number, string[]>();
  for (const row of cobradoresPorZona) {
    if (!cobradorMap.has(row.ZONA_CLIENTE_ID)) {
      cobradorMap.set(row.ZONA_CLIENTE_ID, []);
    }
    cobradorMap.get(row.ZONA_CLIENTE_ID)!.push(row.COBRADOR);
  }

  // 4. Combinar zona con cobradores
  return zonas.map((zona) => {
    const cobradores = cobradorMap.get(zona.ZONA_CLIENTE_ID) || [];
    const cobradoresStr = cobradores.join(" | ");
    return {
      ZONA_CLIENTE_ID: zona.ZONA_CLIENTE_ID,
      ZONA_CLIENTE: cobradoresStr
        ? `${zona.ZONA_CLIENTE} - ${cobradoresStr}`
        : zona.ZONA_CLIENTE,
    };
  });
};

export default { getZonasCliente };
