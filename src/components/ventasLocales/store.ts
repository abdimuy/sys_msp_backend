import {
  query,
  getDbConnectionAsync,
  getDbTransactionAsync,
  queryAsync,
  commitTransactionAsync,
  rollbackTransactionAsync,
  detachDbAsync,
  IQueryConverter,
} from "../../repositories/fbRepository";
import moment from "moment";
import {
  QUERY_INSERT_VENTA_LOCAL,
  QUERY_INSERT_PRODUCTO_VENTA_LOCAL,
  QUERY_CHECK_VENTA_EXISTS,
  QUERY_GET_VENTAS_LOCALES,
  QUERY_GET_VENTA_LOCAL_BY_ID,
  QUERY_GET_PRODUCTOS_VENTA_LOCAL,
  QUERY_UPDATE_VENTA_LOCAL,
  QUERY_DELETE_PRODUCTOS_VENTA_LOCAL,
  QUERY_DELETE_VENTA_LOCAL,
  QUERY_CHECK_ARTICULO_EXISTS,
  QUERY_GET_RESUMEN_VENTAS_LOCALES,
} from "./querys";
import {
  IVentaLocalInput,
  IProductoVentaLocalInput,
  IVentaLocalDB,
  IProductoVentaLocalDB,
  IFiltrosVentasLocales,
  ErrorVentaLocal,
  TipoErrorVentaLocal,
  VENTA_LOCAL_CONFIG,
  IVentaLocalResult,
} from "./interfaces";

const converterVentaLocal: IQueryConverter[] = [
  { type: "buffer", column: "LOCAL_SALE_ID" },
  { type: "buffer", column: "USER_EMAIL" },
  { type: "buffer", column: "NOMBRE_CLIENTE" },
  { type: "buffer", column: "DIRECCION" },
  { type: "buffer", column: "TELEFONO" },
  { type: "buffer", column: "FREC_PAGO" },
  { type: "buffer", column: "AVAL_O_RESPONSABLE" },
  { type: "buffer", column: "NOTA" },
  { type: "buffer", column: "DIA_COBRANZA" },
];

const converterProducto: IQueryConverter[] = [
  { type: "buffer", column: "LOCAL_SALE_ID" },
  { type: "buffer", column: "ARTICULO" },
];

interface ICheckExistsResult {
  EXISTE: number;
}

interface IResumenResult {
  TOTAL_VENTAS: number;
  MONTO_TOTAL: number;
  VENTAS_ENVIADAS: number;
  VENTAS_PENDIENTES: number;
}

// Función para normalizar textos: mayúsculas, sin acentos, sin espacios extra
const normalizarTexto = (texto: string | null | undefined): string => {
  if (!texto) return "";
  
  return texto
    .trim() // Eliminar espacios al inicio y final
    .toUpperCase() // Convertir a mayúsculas
    .normalize("NFD") // Descomponer caracteres con acentos
    .replace(/[\u0300-\u036f]/g, "") // Eliminar marcas diacríticas (acentos)
    .replace(/[^\w\s-]/g, "") // Eliminar caracteres especiales excepto guiones y espacios
    .replace(/\s+/g, " "); // Reemplazar múltiples espacios por uno solo
};

// Función para normalizar solo espacios (para números de teléfono, etc)
const normalizarEspacios = (texto: string | null | undefined): string => {
  if (!texto) return "";
  return texto.trim().replace(/\s+/g, " ");
};

const verificarArticuloExiste = async (
  articuloId: number
): Promise<boolean> => {
  try {
    const result = await query<ICheckExistsResult>({
      sql: QUERY_CHECK_ARTICULO_EXISTS,
      params: [articuloId],
    });
    return result[0].EXISTE > 0;
  } catch (error) {
    throw new ErrorVentaLocal(
      TipoErrorVentaLocal.ERROR_TECNICO,
      "Error al verificar existencia del artículo",
      [error instanceof Error ? error.message : String(error)],
      "ERROR_BD_VERIFICAR_ARTICULO"
    );
  }
};

const crearVentaLocal = async (datosVenta: IVentaLocalInput, almacenId: number): Promise<any> => {
  const db = await getDbConnectionAsync();
  const transaction = await getDbTransactionAsync(db);

  try {
    const existeResult = await query<ICheckExistsResult>({
      sql: QUERY_CHECK_VENTA_EXISTS,
      params: [datosVenta.localSaleId.trim().toUpperCase()],
    });

    if (existeResult[0].EXISTE > 0) {
      throw new ErrorVentaLocal(
        TipoErrorVentaLocal.ERROR_DUPLICADO,
        `Ya existe una venta con el ID ${datosVenta.localSaleId}`,
        [`La venta con ID ${datosVenta.localSaleId} ya fue registrada`],
        "VENTA_DUPLICADA"
      );
    }

    const articulosInvalidos: number[] = [];
    for (const producto of datosVenta.productos) {
      const existe = await verificarArticuloExiste(producto.articuloId);
      if (!existe) {
        articulosInvalidos.push(producto.articuloId);
      }
    }

    if (articulosInvalidos.length > 0) {
      throw new ErrorVentaLocal(
        TipoErrorVentaLocal.ERROR_ARTICULO_NO_EXISTE,
        "Uno o más artículos no existen en el sistema",
        articulosInvalidos.map((id) => `Artículo ID ${id} no encontrado`),
        "ARTICULOS_NO_EXISTEN"
      );
    }

    const fechaVenta = datosVenta.fechaVenta
      ? moment(datosVenta.fechaVenta)
      : moment();

    const fechaFormateada = fechaVenta.format("YYYY-MM-DD HH:mm:ss.SSS");

    await queryAsync(
      transaction,
      QUERY_INSERT_VENTA_LOCAL.replace(' RETURNING LOCAL_SALE_ID', ''),
      [
        datosVenta.localSaleId.trim().toUpperCase(),
        datosVenta.userEmail.trim().toLowerCase(),
        almacenId,
        normalizarTexto(datosVenta.nombreCliente),
        fechaFormateada,
        datosVenta.latitud,
        datosVenta.longitud,
        normalizarTexto(datosVenta.direccion),
        datosVenta.parcialidad,
        datosVenta.enganche || null,
        normalizarEspacios(datosVenta.telefono),
        normalizarTexto(datosVenta.frecPago),
        normalizarTexto(datosVenta.avalOResponsable),
        normalizarTexto(datosVenta.nota),
        normalizarTexto(datosVenta.diaCobranza),
        datosVenta.precioTotal,
        datosVenta.tiempoACortoPlazoMeses,
        datosVenta.montoACortoPlazo
      ]
    );

    for (const producto of datosVenta.productos) {
      await queryAsync(transaction, QUERY_INSERT_PRODUCTO_VENTA_LOCAL, [
        datosVenta.localSaleId.trim().toUpperCase(),
        producto.articuloId,
        normalizarTexto(producto.articulo),
        producto.cantidad,
        producto.precioLista,
        producto.precioCortoPlazo,
        producto.precioContado,
      ]);
    }

    await commitTransactionAsync(transaction);
    await detachDbAsync(db);

    return {
      success: true,
      localSaleId: datosVenta.localSaleId,
      mensaje: `Venta local creada exitosamente con ID ${datosVenta.localSaleId}`,
      productosRegistrados: datosVenta.productos.length,
    };
  } catch (error) {
    await rollbackTransactionAsync(transaction);
    await detachDbAsync(db);
    throw error;
  }
};

const actualizarVentaLocal = async (
  localSaleId: string,
  datosVenta: IVentaLocalInput,
  almacenId: number
): Promise<any> => {
  const db = await getDbConnectionAsync();
  const transaction = await getDbTransactionAsync(db);

  try {
    const existeResult = await query<ICheckExistsResult>({
      sql: QUERY_CHECK_VENTA_EXISTS,
      params: [localSaleId.trim().toUpperCase()],
    });

    if (existeResult[0].EXISTE === 0) {
      throw new ErrorVentaLocal(
        TipoErrorVentaLocal.ERROR_PARAMETROS,
        `No existe una venta con el ID ${localSaleId}`,
        [`La venta con ID ${localSaleId} no fue encontrada`],
        "VENTA_NO_ENCONTRADA"
      );
    }

    const articulosInvalidos: number[] = [];
    for (const producto of datosVenta.productos) {
      const existe = await verificarArticuloExiste(producto.articuloId);
      if (!existe) {
        articulosInvalidos.push(producto.articuloId);
      }
    }

    if (articulosInvalidos.length > 0) {
      throw new ErrorVentaLocal(
        TipoErrorVentaLocal.ERROR_ARTICULO_NO_EXISTE,
        "Uno o más artículos no existen en el sistema",
        articulosInvalidos.map((id) => `Artículo ID ${id} no encontrado`),
        "ARTICULOS_NO_EXISTEN"
      );
    }

    const fechaVenta = datosVenta.fechaVenta
      ? moment(datosVenta.fechaVenta)
      : moment();

    const fechaFormateada = fechaVenta.format("YYYY-MM-DD HH:mm:ss.SSS");

    await queryAsync(transaction, QUERY_UPDATE_VENTA_LOCAL, [
      datosVenta.userEmail.trim().toLowerCase(),
      almacenId,
      normalizarTexto(datosVenta.nombreCliente),
      fechaFormateada,
      datosVenta.latitud,
      datosVenta.longitud,
      normalizarTexto(datosVenta.direccion),
      datosVenta.parcialidad,
      datosVenta.enganche || null,
      normalizarEspacios(datosVenta.telefono),
      normalizarTexto(datosVenta.frecPago),
      normalizarTexto(datosVenta.avalOResponsable),
      normalizarTexto(datosVenta.nota),
      normalizarTexto(datosVenta.diaCobranza),
      datosVenta.precioTotal,
      datosVenta.tiempoACortoPlazoMeses,
      datosVenta.montoACortoPlazo,
      localSaleId.trim().toUpperCase(),
    ]);

    await queryAsync(transaction, QUERY_DELETE_PRODUCTOS_VENTA_LOCAL, [
      localSaleId.trim().toUpperCase(),
    ]);

    for (const producto of datosVenta.productos) {
      await queryAsync(transaction, QUERY_INSERT_PRODUCTO_VENTA_LOCAL, [
        localSaleId.trim().toUpperCase(),
        producto.articuloId,
        normalizarTexto(producto.articulo),
        producto.cantidad,
        producto.precioLista,
        producto.precioCortoPlazo,
        producto.precioContado,
      ]);
    }

    await commitTransactionAsync(transaction);
    await detachDbAsync(db);

    return {
      success: true,
      localSaleId,
      mensaje: `Venta local actualizada exitosamente`,
      productosActualizados: datosVenta.productos.length,
    };
  } catch (error) {
    await rollbackTransactionAsync(transaction);
    await detachDbAsync(db);
    throw error;
  }
};

const obtenerVentasLocales = async (
  filtros?: IFiltrosVentasLocales
): Promise<IVentaLocalDB[]> => {
  let sql = QUERY_GET_VENTAS_LOCALES;
  const params: any[] = [];

  if (filtros) {
    const conditions: string[] = [];

    if (filtros.fechaInicio) {
      conditions.push("V.FECHA_VENTA >= ?");
      params.push(moment(filtros.fechaInicio).format("YYYY-MM-DD HH:mm:ss"));
    }

    if (filtros.fechaFin) {
      conditions.push("V.FECHA_VENTA <= ?");
      params.push(moment(filtros.fechaFin).format("YYYY-MM-DD HH:mm:ss"));
    }

    if (filtros.nombreCliente) {
      conditions.push("UPPER(V.NOMBRE_CLIENTE) LIKE UPPER(?)");
      params.push(`%${filtros.nombreCliente}%`);
    }

    if (conditions.length > 0) {
      sql += ` AND ${conditions.join(" AND ")}`;
    }

    sql += " ORDER BY V.FECHA_VENTA DESC";

    if (filtros.limit) {
      sql += ` ROWS ${filtros.offset || 0} TO ${
        (filtros.offset || 0) + filtros.limit
      }`;
    }
  } else {
    sql += " ORDER BY V.FECHA_VENTA DESC";
  }

  return await query<IVentaLocalDB>({
    sql,
    params,
    converters: converterVentaLocal,
  });
};

const obtenerVentaLocalPorId = async (
  localSaleId: string
): Promise<IVentaLocalDB | null> => {
  const result = await query<IVentaLocalDB>({
    sql: QUERY_GET_VENTA_LOCAL_BY_ID,
    params: [localSaleId.trim().toUpperCase()],
    converters: converterVentaLocal,
  });

  return result.length > 0 ? result[0] : null;
};

const obtenerProductosVentaLocal = async (
  localSaleId: string
): Promise<IProductoVentaLocalDB[]> => {
  return await query<IProductoVentaLocalDB>({
    sql: QUERY_GET_PRODUCTOS_VENTA_LOCAL,
    params: [localSaleId.trim().toUpperCase()],
    converters: converterProducto,
  });
};

const obtenerVentaCompleta = async (localSaleId: string): Promise<any> => {
  const venta = await obtenerVentaLocalPorId(localSaleId);

  if (!venta) {
    throw new ErrorVentaLocal(
      TipoErrorVentaLocal.ERROR_PARAMETROS,
      `No se encontró la venta con ID ${localSaleId}`,
      [`Venta con ID ${localSaleId} no existe`],
      "VENTA_NO_ENCONTRADA"
    );
  }

  const productos = await obtenerProductosVentaLocal(localSaleId);

  return {
    ...venta,
    productos,
  };
};

const eliminarVentaLocal = async (localSaleId: string): Promise<any> => {
  const db = await getDbConnectionAsync();
  const transaction = await getDbTransactionAsync(db);

  try {
    const existeResult = await query<ICheckExistsResult>({
      sql: QUERY_CHECK_VENTA_EXISTS,
      params: [localSaleId.trim().toUpperCase()],
    });

    if (existeResult[0].EXISTE === 0) {
      throw new ErrorVentaLocal(
        TipoErrorVentaLocal.ERROR_PARAMETROS,
        `No existe una venta con el ID ${localSaleId}`,
        [`La venta con ID ${localSaleId} no fue encontrada`],
        "VENTA_NO_ENCONTRADA"
      );
    }

    await queryAsync(transaction, QUERY_DELETE_PRODUCTOS_VENTA_LOCAL, [
      localSaleId.trim().toUpperCase(),
    ]);

    await queryAsync(transaction, QUERY_DELETE_VENTA_LOCAL, [localSaleId.trim().toUpperCase()]);

    await commitTransactionAsync(transaction);
    await detachDbAsync(db);

    return {
      success: true,
      localSaleId,
      mensaje: `Venta local eliminada exitosamente`,
    };
  } catch (error) {
    await rollbackTransactionAsync(transaction);
    await detachDbAsync(db);
    throw error;
  }
};

const obtenerResumenVentas = async (
  filtros?: IFiltrosVentasLocales
): Promise<IResumenResult> => {
  let sql = QUERY_GET_RESUMEN_VENTAS_LOCALES;
  const params: any[] = [];

  if (filtros) {
    const conditions: string[] = [];

    if (filtros.fechaInicio) {
      conditions.push("V.FECHA_VENTA >= ?");
      params.push(moment(filtros.fechaInicio).format("YYYY-MM-DD HH:mm:ss"));
    }

    if (filtros.fechaFin) {
      conditions.push("V.FECHA_VENTA <= ?");
      params.push(moment(filtros.fechaFin).format("YYYY-MM-DD HH:mm:ss"));
    }

    if (conditions.length > 0) {
      sql += ` AND ${conditions.join(" AND ")}`;
    }
  }

  const result = await query<IResumenResult>({
    sql,
    params,
  });

  return result[0];
};

export default {
  crear: crearVentaLocal,
  actualizar: actualizarVentaLocal,
  listar: obtenerVentasLocales,
  obtenerPorId: obtenerVentaLocalPorId,
  obtenerProductos: obtenerProductosVentaLocal,
  obtenerCompleta: obtenerVentaCompleta,
  eliminar: eliminarVentaLocal,
  obtenerResumen: obtenerResumenVentas,
};
