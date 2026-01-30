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
  QUERY_INSERT_IMAGEN_VENTA_LOCAL,
  QUERY_GET_IMAGENES_VENTA_LOCAL,
  QUERY_DELETE_IMAGENES_VENTA_LOCAL,
  QUERY_DELETE_IMAGEN_POR_ID,
  QUERY_GET_IMAGEN_POR_ID,
  QUERY_INSERT_COMBO_VENTA_LOCAL,
  QUERY_GET_COMBOS_VENTA_LOCAL,
  QUERY_DELETE_COMBOS_VENTA_LOCAL,
  QUERY_GET_VENTAS_LOCALES_V2_BASE,
  QUERY_COUNT_VENTAS_LOCALES_BASE,
} from "./querys";
import {
  IVentaLocalInput,
  IProductoVentaLocalInput,
  IVentaLocalDB,
  IProductoVentaLocalDB,
  IFiltrosVentasLocales,
  IFiltrosVentasLocalesV2,
  ICursorData,
  IPaginatedResponse,
  SortField,
  SortOrder,
  ErrorVentaLocal,
  TipoErrorVentaLocal,
  VENTA_LOCAL_CONFIG,
  IVentaLocalResult,
  IDiferenciaProducto,
  IResultadoComparacionProductos,
  IComboVentaLocalDB,
} from "./interfaces";
import traspasosStore from "../traspasos/store";
import traspasosController from "../traspasos/controller";

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
  { type: "buffer", column: "NUMERO" },
  { type: "buffer", column: "COLONIA" },
  { type: "buffer", column: "POBLACION" },
  { type: "buffer", column: "CIUDAD" },
  { type: "buffer", column: "TIPO_VENTA" },
  { type: "buffer", column: "ZONA_CLIENTE" },
];

const converterProducto: IQueryConverter[] = [
  { type: "buffer", column: "LOCAL_SALE_ID" },
  { type: "buffer", column: "ARTICULO" },
  { type: "buffer", column: "COMBO_ID" },
];

const converterCombo: IQueryConverter[] = [
  { type: "buffer", column: "COMBO_ID" },
  { type: "buffer", column: "LOCAL_SALE_ID" },
  { type: "buffer", column: "NOMBRE_COMBO" },
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

// Función para validar tipo de venta
const validarTipoVenta = (tipoVenta: string | undefined): string => {
  if (!tipoVenta) return "CONTADO";

  const tipoNormalizado = tipoVenta.toUpperCase().trim();

  if (tipoNormalizado !== "CONTADO" && tipoNormalizado !== "CREDITO") {
    throw new ErrorVentaLocal(
      TipoErrorVentaLocal.ERROR_TIPO_VENTA_INVALIDO,
      "Tipo de venta inválido. Solo se acepta CONTADO o CREDITO",
      [`Tipo de venta '${tipoVenta}' no es válido`],
      "TIPO_VENTA_INVALIDO"
    );
  }

  return tipoNormalizado;
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

const verificarVentaExiste = async (
  localSaleId: string
): Promise<boolean> => {
  try {
    const result = await query<ICheckExistsResult>({
      sql: QUERY_CHECK_VENTA_EXISTS,
      params: [localSaleId.trim().toUpperCase()],
    });
    return result[0].EXISTE > 0;
  } catch (error) {
    throw new ErrorVentaLocal(
      TipoErrorVentaLocal.ERROR_TECNICO,
      "Error al verificar existencia de la venta",
      [error instanceof Error ? error.message : String(error)],
      "ERROR_BD_VERIFICAR_VENTA"
    );
  }
};

const crearVentaLocal = async (
  datosVenta: IVentaLocalInput,
  almacenOrigenId: number,
  almacenDestinoId?: number,
  omitirTraspaso?: boolean
): Promise<any> => {
  const db = await getDbConnectionAsync();
  const transaction = await getDbTransactionAsync(db);

  // Usar almacén destino proporcionado o el default
  const almacenDestino = almacenDestinoId || VENTA_LOCAL_CONFIG.ALMACEN_DESTINO_VENTAS;

  try {
    // Validación de duplicado movida al controller para idempotencia

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

    // Validar tipo de venta
    const tipoVenta = validarTipoVenta(datosVenta.tipoVenta);

    await queryAsync(
      transaction,
      QUERY_INSERT_VENTA_LOCAL.replace(" RETURNING LOCAL_SALE_ID", ""),
      [
        datosVenta.localSaleId.trim().toUpperCase(),
        datosVenta.userEmail.trim().toLowerCase(),
        almacenOrigenId,
        almacenDestino,
        normalizarTexto(datosVenta.nombreCliente),
        fechaFormateada,
        datosVenta.latitud || 0,
        datosVenta.longitud || 0,
        normalizarTexto(datosVenta.direccion),
        datosVenta.parcialidad || 0,
        datosVenta.enganche || 0,
        normalizarEspacios(datosVenta.telefono),
        normalizarTexto(datosVenta.frecPago),
        normalizarTexto(datosVenta.avalOResponsable),
        normalizarTexto(datosVenta.nota),
        normalizarTexto(datosVenta.diaCobranza),
        datosVenta.precioTotal || 0,
        datosVenta.tiempoACortoPlazoMeses || 0,
        datosVenta.montoACortoPlazo || 0,
        normalizarTexto(datosVenta.numero) || null,
        normalizarTexto(datosVenta.colonia) || null,
        normalizarTexto(datosVenta.poblacion) || null,
        normalizarTexto(datosVenta.ciudad) || null,
        tipoVenta,
        datosVenta.zonaClienteId || null,
      ]
    );

    // Guardar combos si existen
    if (datosVenta.combos && datosVenta.combos.length > 0) {
      for (const combo of datosVenta.combos) {
        await queryAsync(transaction, QUERY_INSERT_COMBO_VENTA_LOCAL, [
          combo.comboId.trim().toUpperCase(),
          datosVenta.localSaleId.trim().toUpperCase(),
          normalizarTexto(combo.nombreCombo),
          combo.precioLista || 0,
          combo.precioCortoPlazo || 0,
          combo.precioContado || 0,
        ]);
      }
    }

    for (const producto of datosVenta.productos) {
      await queryAsync(transaction, QUERY_INSERT_PRODUCTO_VENTA_LOCAL, [
        datosVenta.localSaleId.trim().toUpperCase(),
        producto.articuloId,
        normalizarTexto(producto.articulo),
        producto.cantidad,
        producto.precioLista,
        producto.precioCortoPlazo,
        producto.precioContado,
        producto.comboId ? producto.comboId.trim().toUpperCase() : null,
      ]);
    }

    // Guardar imágenes si existen
    if (datosVenta.imagenes && datosVenta.imagenes.length > 0) {
      const { v4: uuidv4 } = await import("uuid");

      for (const imagen of datosVenta.imagenes) {
        if (imagen.archivo) {
          const imagenId = imagen.id || uuidv4();
          const rutaRelativa = `/uploads/ventas-locales/${imagen.archivo.filename}`;

          await queryAsync(transaction, QUERY_INSERT_IMAGEN_VENTA_LOCAL, [
            imagenId,
            datosVenta.localSaleId.trim().toUpperCase(),
            rutaRelativa,
            imagen.archivo.mimetype,
            normalizarTexto(imagen.descripcion || "Imagen de venta"),
          ]);
        }
      }
    }

    // Crear traspaso automático DENTRO de la misma transacción (si no se omite)
    if (!omitirTraspaso) {
      const datosTraspaso = {
        almacenOrigenId: almacenOrigenId,
        almacenDestinoId: almacenDestino,
        descripcion: `Traspaso automático por venta local ${datosVenta.localSaleId}`,
        detalles: datosVenta.productos.map((producto) => ({
          articuloId: producto.articuloId,
          unidades: producto.cantidad,
        })),
        usuario: datosVenta.userEmail,
      };

      // Pasar la transacción actual al controller de traspasos
      await traspasosController.crear(datosTraspaso, transaction, db);
    }

    // Commit DESPUÉS de que todo esté listo (venta + traspaso si aplica)
    await commitTransactionAsync(transaction);
    await detachDbAsync(db);

    return {
      success: true,
      localSaleId: datosVenta.localSaleId,
      mensaje: omitirTraspaso
        ? `Venta local creada exitosamente (sin traspaso de inventario)`
        : `Venta local creada exitosamente con ID ${datosVenta.localSaleId}`,
      productosRegistrados: datosVenta.productos.length,
      combosRegistrados: datosVenta.combos?.length || 0,
      almacenOrigenId,
      almacenDestinoId: almacenDestino,
      traspasoOmitido: omitirTraspaso || false,
    };
  } catch (error) {
    await rollbackTransactionAsync(transaction);
    await detachDbAsync(db);
    throw error;
  }
};

/**
 * Compara los productos originales con los nuevos y calcula las diferencias
 */
const compararProductos = (
  productosOriginales: IProductoVentaLocalDB[],
  productosNuevos: IProductoVentaLocalInput[]
): IResultadoComparacionProductos => {
  const productosADevolver: IDiferenciaProducto[] = [];
  const productosASacar: IDiferenciaProducto[] = [];

  // Crear mapa de productos originales por articuloId
  const mapaOriginales = new Map<number, IProductoVentaLocalDB>();
  for (const prod of productosOriginales) {
    mapaOriginales.set(prod.ARTICULO_ID, prod);
  }

  // Crear mapa de productos nuevos por articuloId
  const mapaNuevos = new Map<number, IProductoVentaLocalInput>();
  for (const prod of productosNuevos) {
    mapaNuevos.set(prod.articuloId, prod);
  }

  // Verificar productos que se eliminan o reducen (devolver al origen)
  for (const [articuloId, prodOriginal] of mapaOriginales) {
    const prodNuevo = mapaNuevos.get(articuloId);

    if (!prodNuevo) {
      // Producto eliminado completamente - devolver todo
      productosADevolver.push({
        articuloId,
        articulo: prodOriginal.ARTICULO,
        cantidadOriginal: prodOriginal.CANTIDAD,
        cantidadNueva: 0,
        diferencia: -prodOriginal.CANTIDAD,
      });
    } else if (prodNuevo.cantidad < prodOriginal.CANTIDAD) {
      // Cantidad reducida - devolver la diferencia
      const diferencia = prodNuevo.cantidad - prodOriginal.CANTIDAD;
      productosADevolver.push({
        articuloId,
        articulo: prodOriginal.ARTICULO,
        cantidadOriginal: prodOriginal.CANTIDAD,
        cantidadNueva: prodNuevo.cantidad,
        diferencia,
      });
    }
  }

  // Verificar productos que se agregan o aumentan (sacar del origen)
  for (const [articuloId, prodNuevo] of mapaNuevos) {
    const prodOriginal = mapaOriginales.get(articuloId);

    if (!prodOriginal) {
      // Producto nuevo - sacar del origen
      productosASacar.push({
        articuloId,
        articulo: prodNuevo.articulo,
        cantidadOriginal: 0,
        cantidadNueva: prodNuevo.cantidad,
        diferencia: prodNuevo.cantidad,
      });
    } else if (prodNuevo.cantidad > prodOriginal.CANTIDAD) {
      // Cantidad aumentada - sacar la diferencia
      const diferencia = prodNuevo.cantidad - prodOriginal.CANTIDAD;
      productosASacar.push({
        articuloId,
        articulo: prodNuevo.articulo,
        cantidadOriginal: prodOriginal.CANTIDAD,
        cantidadNueva: prodNuevo.cantidad,
        diferencia,
      });
    }
  }

  return {
    productosADevolver,
    productosASacar,
    sinCambios: productosADevolver.length === 0 && productosASacar.length === 0,
  };
};

/**
 * Elimina imágenes específicas de la venta por sus IDs
 */
const eliminarImagenesPorIds = async (
  imagenesIds: string[],
  transaction: any
): Promise<string[]> => {
  const fs = await import("fs");
  const path = await import("path");
  const imagenesEliminadas: string[] = [];

  for (const imagenId of imagenesIds) {
    // Obtener la ruta de la imagen antes de eliminarla
    const resultado = await query<{ IMG_PATH: string }>({
      sql: QUERY_GET_IMAGEN_POR_ID,
      params: [imagenId],
      converters: [{ type: "buffer", column: "IMG_PATH" }],
    });

    if (resultado.length > 0) {
      const rutaRelativa = resultado[0].IMG_PATH;
      const rutaAbsoluta = path.resolve("." + rutaRelativa);

      // Eliminar de la BD
      await queryAsync(transaction, QUERY_DELETE_IMAGEN_POR_ID, [imagenId]);

      // Intentar eliminar el archivo físico
      try {
        if (fs.existsSync(rutaAbsoluta)) {
          fs.unlinkSync(rutaAbsoluta);
        }
      } catch (err) {
        console.warn(`No se pudo eliminar el archivo físico: ${rutaAbsoluta}`);
      }

      imagenesEliminadas.push(imagenId);
    }
  }

  return imagenesEliminadas;
};

const actualizarVentaLocal = async (
  localSaleId: string,
  datosVenta: IVentaLocalInput,
  almacenOrigenId: number,
  almacenDestinoId?: number
): Promise<any> => {
  const localSaleIdNormalizado = localSaleId.trim().toUpperCase();

  // 1. Obtener venta original con productos
  const ventaOriginal = await obtenerVentaLocalPorId(localSaleIdNormalizado);
  if (!ventaOriginal) {
    throw new ErrorVentaLocal(
      TipoErrorVentaLocal.ERROR_PARAMETROS,
      `No existe una venta con el ID ${localSaleId}`,
      [`La venta con ID ${localSaleId} no fue encontrada`],
      "VENTA_NO_ENCONTRADA"
    );
  }

  const productosOriginales = await obtenerProductosVentaLocal(localSaleIdNormalizado);

  // Usar almacenes proporcionados o los de la venta original / default
  const almacenOrigen = almacenOrigenId;
  const almacenDestino = almacenDestinoId ||
    ventaOriginal.ALMACEN_DESTINO_ID ||
    VENTA_LOCAL_CONFIG.ALMACEN_DESTINO_VENTAS;

  // 2. Validar que los nuevos artículos existan
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

  // 3. Comparar productos y calcular diferencias
  const comparacion = compararProductos(productosOriginales, datosVenta.productos);

  // 4. Validar stock si hay cambios en productos
  if (!comparacion.sinCambios) {
    const erroresStock: string[] = [];

    // Validar stock en almacén destino para productos a devolver
    if (comparacion.productosADevolver.length > 0) {
      try {
        await traspasosStore.validarExistencias(
          almacenDestino,
          comparacion.productosADevolver.map((p) => ({
            articuloId: p.articuloId,
            unidades: Math.abs(p.diferencia),
          }))
        );
      } catch (error: any) {
        if (error.detalles) {
          erroresStock.push(
            `Stock insuficiente en almacén destino (${almacenDestino}) para devolver: ${error.detalles.join(", ")}`
          );
        } else {
          erroresStock.push(`Error validando stock en almacén destino: ${error.message}`);
        }
      }
    }

    // Validar stock en almacén origen para productos a sacar
    if (comparacion.productosASacar.length > 0) {
      try {
        await traspasosStore.validarExistencias(
          almacenOrigen,
          comparacion.productosASacar.map((p) => ({
            articuloId: p.articuloId,
            unidades: p.diferencia,
          }))
        );
      } catch (error: any) {
        if (error.detalles) {
          erroresStock.push(
            `Stock insuficiente en almacén origen (${almacenOrigen}) para agregar: ${error.detalles.join(", ")}`
          );
        } else {
          erroresStock.push(`Error validando stock en almacén origen: ${error.message}`);
        }
      }
    }

    // Si hay errores de stock, lanzar error
    if (erroresStock.length > 0) {
      throw new ErrorVentaLocal(
        TipoErrorVentaLocal.ERROR_STOCK_INSUFICIENTE,
        "No se puede editar la venta por falta de stock",
        erroresStock,
        "STOCK_INSUFICIENTE_EDICION"
      );
    }
  }

  // 5. Iniciar transacción para la actualización
  const db = await getDbConnectionAsync();
  const transaction = await getDbTransactionAsync(db);

  try {
    // 6. Crear traspasos de ajuste si hay cambios en productos
    if (!comparacion.sinCambios) {
      // Traspaso inverso: devolver productos del destino al origen
      if (comparacion.productosADevolver.length > 0) {
        const datosTraspasoDev = {
          almacenOrigenId: almacenDestino,
          almacenDestinoId: almacenOrigen,
          descripcion: `Devolución por edición de venta local ${localSaleIdNormalizado}`,
          detalles: comparacion.productosADevolver.map((p) => ({
            articuloId: p.articuloId,
            unidades: Math.abs(p.diferencia),
          })),
          usuario: datosVenta.userEmail,
        };
        await traspasosController.crear(datosTraspasoDev, transaction, db);
      }

      // Traspaso normal: sacar productos del origen al destino
      if (comparacion.productosASacar.length > 0) {
        const datosTraspasoSacar = {
          almacenOrigenId: almacenOrigen,
          almacenDestinoId: almacenDestino,
          descripcion: `Agregado por edición de venta local ${localSaleIdNormalizado}`,
          detalles: comparacion.productosASacar.map((p) => ({
            articuloId: p.articuloId,
            unidades: p.diferencia,
          })),
          usuario: datosVenta.userEmail,
        };
        await traspasosController.crear(datosTraspasoSacar, transaction, db);
      }
    }

    // 7. Eliminar imágenes indicadas
    let imagenesEliminadas: string[] = [];
    if (datosVenta.imagenesAEliminar && datosVenta.imagenesAEliminar.length > 0) {
      imagenesEliminadas = await eliminarImagenesPorIds(
        datosVenta.imagenesAEliminar,
        transaction
      );
    }

    // 8. Agregar nuevas imágenes
    let imagenesAgregadas = 0;
    if (datosVenta.imagenes && datosVenta.imagenes.length > 0) {
      const { v4: uuidv4 } = await import("uuid");

      for (const imagen of datosVenta.imagenes) {
        if (imagen.archivo) {
          const imagenId = imagen.id || uuidv4();
          const rutaRelativa = `/uploads/ventas-locales/${imagen.archivo.filename}`;

          await queryAsync(transaction, QUERY_INSERT_IMAGEN_VENTA_LOCAL, [
            imagenId,
            localSaleIdNormalizado,
            rutaRelativa,
            imagen.archivo.mimetype,
            normalizarTexto(imagen.descripcion || "Imagen de venta"),
          ]);
          imagenesAgregadas++;
        }
      }
    }

    // 9. Actualizar datos de la venta
    const fechaVenta = datosVenta.fechaVenta
      ? moment(datosVenta.fechaVenta)
      : moment();
    const fechaFormateada = fechaVenta.format("YYYY-MM-DD HH:mm:ss.SSS");
    const tipoVenta = validarTipoVenta(datosVenta.tipoVenta);

    await queryAsync(transaction, QUERY_UPDATE_VENTA_LOCAL, [
      datosVenta.userEmail.trim().toLowerCase(),
      almacenOrigen,
      almacenDestino,
      normalizarTexto(datosVenta.nombreCliente),
      fechaFormateada,
      datosVenta.latitud || 0,
      datosVenta.longitud || 0,
      normalizarTexto(datosVenta.direccion),
      datosVenta.parcialidad || 0,
      datosVenta.enganche || 0,
      normalizarEspacios(datosVenta.telefono),
      normalizarTexto(datosVenta.frecPago),
      normalizarTexto(datosVenta.avalOResponsable),
      normalizarTexto(datosVenta.nota),
      normalizarTexto(datosVenta.diaCobranza),
      datosVenta.precioTotal || 0,
      datosVenta.tiempoACortoPlazoMeses || 0,
      datosVenta.montoACortoPlazo || 0,
      normalizarTexto(datosVenta.numero) || null,
      normalizarTexto(datosVenta.colonia) || null,
      normalizarTexto(datosVenta.poblacion) || null,
      normalizarTexto(datosVenta.ciudad) || null,
      tipoVenta,
      datosVenta.zonaClienteId || null,
      localSaleIdNormalizado,
    ]);

    // 10. Actualizar combos y productos (eliminar anteriores e insertar nuevos)
    // Primero eliminar productos (por FK constraint)
    await queryAsync(transaction, QUERY_DELETE_PRODUCTOS_VENTA_LOCAL, [
      localSaleIdNormalizado,
    ]);

    // Luego eliminar combos
    await queryAsync(transaction, QUERY_DELETE_COMBOS_VENTA_LOCAL, [
      localSaleIdNormalizado,
    ]);

    // Insertar nuevos combos si existen
    if (datosVenta.combos && datosVenta.combos.length > 0) {
      for (const combo of datosVenta.combos) {
        await queryAsync(transaction, QUERY_INSERT_COMBO_VENTA_LOCAL, [
          combo.comboId.trim().toUpperCase(),
          localSaleIdNormalizado,
          normalizarTexto(combo.nombreCombo),
          combo.precioLista || 0,
          combo.precioCortoPlazo || 0,
          combo.precioContado || 0,
        ]);
      }
    }

    // Insertar productos con comboId si aplica
    for (const producto of datosVenta.productos) {
      await queryAsync(transaction, QUERY_INSERT_PRODUCTO_VENTA_LOCAL, [
        localSaleIdNormalizado,
        producto.articuloId,
        normalizarTexto(producto.articulo),
        producto.cantidad,
        producto.precioLista,
        producto.precioCortoPlazo,
        producto.precioContado,
        producto.comboId ? producto.comboId.trim().toUpperCase() : null,
      ]);
    }

    // 11. Commit
    await commitTransactionAsync(transaction);
    await detachDbAsync(db);

    return {
      success: true,
      localSaleId: localSaleIdNormalizado,
      mensaje: "Venta local actualizada exitosamente",
      productosActualizados: datosVenta.productos.length,
      cambiosProductos: {
        devueltos: comparacion.productosADevolver.length,
        agregados: comparacion.productosASacar.length,
        sinCambios: comparacion.sinCambios,
      },
      imagenesEliminadas: imagenesEliminadas.length,
      imagenesAgregadas,
      almacenOrigenId: almacenOrigen,
      almacenDestinoId: almacenDestino,
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
      const fechaInicio = moment(filtros.fechaInicio);
      params.push(fechaInicio.startOf('day').format("YYYY-MM-DD HH:mm:ss"));
    }

    if (filtros.fechaFin) {
      conditions.push("V.FECHA_VENTA <= ?");
      const fechaFin = moment(filtros.fechaFin);
      if (fechaFin.hours() === 0 && fechaFin.minutes() === 0 && fechaFin.seconds() === 0) {
        params.push(fechaFin.endOf('day').format("YYYY-MM-DD HH:mm:ss"));
      } else {
        params.push(fechaFin.format("YYYY-MM-DD HH:mm:ss"));
      }
    }

    if (filtros.nombreCliente) {
      conditions.push("UPPER(V.NOMBRE_CLIENTE) LIKE UPPER(?)");
      params.push(`%${filtros.nombreCliente}%`);
    }

    if (filtros.zonaClienteId) {
      conditions.push("V.ZONA_CLIENTE_ID = ?");
      params.push(filtros.zonaClienteId);
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

const obtenerCombosVentaLocal = async (
  localSaleId: string
): Promise<IComboVentaLocalDB[]> => {
  return await query<IComboVentaLocalDB>({
    sql: QUERY_GET_COMBOS_VENTA_LOCAL,
    params: [localSaleId.trim().toUpperCase()],
    converters: converterCombo,
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
  const combos = await obtenerCombosVentaLocal(localSaleId);

  // Obtener las imágenes de la venta
  const imagenes = await query({
    sql: QUERY_GET_IMAGENES_VENTA_LOCAL,
    params: [localSaleId.trim().toUpperCase()],
    converters: [
      { type: "buffer", column: "ID" },
      { type: "buffer", column: "LOCAL_SALE_ID" },
      { type: "buffer", column: "IMG_PATH" },
      { type: "buffer", column: "IMG_MIME" },
      { type: "buffer", column: "IMG_DESC" }
    ]
  });

  return {
    ...venta,
    productos,
    combos,
    imagenes,
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

    await queryAsync(transaction, QUERY_DELETE_VENTA_LOCAL, [
      localSaleId.trim().toUpperCase(),
    ]);

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
      const fechaInicio = moment(filtros.fechaInicio);
      params.push(fechaInicio.startOf('day').format("YYYY-MM-DD HH:mm:ss"));
    }

    if (filtros.fechaFin) {
      conditions.push("V.FECHA_VENTA <= ?");
      const fechaFin = moment(filtros.fechaFin);
      if (fechaFin.hours() === 0 && fechaFin.minutes() === 0 && fechaFin.seconds() === 0) {
        params.push(fechaFin.endOf('day').format("YYYY-MM-DD HH:mm:ss"));
      } else {
        params.push(fechaFin.format("YYYY-MM-DD HH:mm:ss"));
      }
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

// ===============================================
// PAGINACIÓN POR CURSOR (World Class)
// ===============================================

const SORT_FIELD_MAP: Record<SortField, string> = {
  fechaVenta: 'V.FECHA_VENTA',
  nombreCliente: 'V.NOMBRE_CLIENTE',
  precioTotal: 'V.PRECIO_TOTAL',
  ciudad: 'V.CIUDAD',
  tipoVenta: 'V.TIPO_VENTA',
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Codifica datos del cursor a base64
 */
const encodeCursor = (data: ICursorData): string => {
  return Buffer.from(JSON.stringify(data)).toString('base64');
};

/**
 * Decodifica cursor de base64 a datos
 */
const decodeCursor = (cursor: string): ICursorData | null => {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

/**
 * Construye las condiciones WHERE dinámicamente
 */
const buildWhereConditions = (
  filtros: IFiltrosVentasLocalesV2,
  params: any[]
): string => {
  const conditions: string[] = [];

  // Filtros de fecha
  if (filtros.fechaInicio) {
    conditions.push("V.FECHA_VENTA >= ?");
    const fechaInicio = moment(filtros.fechaInicio);
    params.push(fechaInicio.startOf('day').format("YYYY-MM-DD HH:mm:ss"));
  }

  if (filtros.fechaFin) {
    conditions.push("V.FECHA_VENTA <= ?");
    const fechaFin = moment(filtros.fechaFin);
    if (fechaFin.hours() === 0 && fechaFin.minutes() === 0 && fechaFin.seconds() === 0) {
      params.push(fechaFin.endOf('day').format("YYYY-MM-DD HH:mm:ss"));
    } else {
      params.push(fechaFin.format("YYYY-MM-DD HH:mm:ss"));
    }
  }

  // Filtros de texto (búsqueda parcial con LIKE)
  if (filtros.nombreCliente) {
    conditions.push("UPPER(V.NOMBRE_CLIENTE) LIKE UPPER(?)");
    params.push(`%${filtros.nombreCliente}%`);
  }

  if (filtros.telefono) {
    conditions.push("V.TELEFONO LIKE ?");
    params.push(`%${filtros.telefono}%`);
  }

  if (filtros.direccion) {
    conditions.push("UPPER(V.DIRECCION) LIKE UPPER(?)");
    params.push(`%${filtros.direccion}%`);
  }

  if (filtros.ciudad) {
    conditions.push("UPPER(V.CIUDAD) LIKE UPPER(?)");
    params.push(`%${filtros.ciudad}%`);
  }

  if (filtros.colonia) {
    conditions.push("UPPER(V.COLONIA) LIKE UPPER(?)");
    params.push(`%${filtros.colonia}%`);
  }

  if (filtros.poblacion) {
    conditions.push("UPPER(V.POBLACION) LIKE UPPER(?)");
    params.push(`%${filtros.poblacion}%`);
  }

  // Filtros exactos
  if (filtros.zonaClienteId) {
    conditions.push("V.ZONA_CLIENTE_ID = ?");
    params.push(filtros.zonaClienteId);
  }

  if (filtros.tipoVenta) {
    conditions.push("V.TIPO_VENTA = ?");
    params.push(filtros.tipoVenta.toUpperCase());
  }

  if (filtros.userEmail) {
    conditions.push("LOWER(V.USER_EMAIL) = LOWER(?)");
    params.push(filtros.userEmail);
  }

  if (filtros.almacenId) {
    conditions.push("V.ALMACEN_ID = ?");
    params.push(filtros.almacenId);
  }

  if (filtros.enviado !== undefined) {
    conditions.push("V.ENVIADO = ?");
    params.push(filtros.enviado);
  }

  // Filtros de rango numérico
  if (filtros.precioMin !== undefined) {
    conditions.push("V.PRECIO_TOTAL >= ?");
    params.push(filtros.precioMin);
  }

  if (filtros.precioMax !== undefined) {
    conditions.push("V.PRECIO_TOTAL <= ?");
    params.push(filtros.precioMax);
  }

  // Búsqueda general (busca en múltiples campos)
  if (filtros.search) {
    const searchTerm = `%${filtros.search}%`;
    conditions.push(`(
      UPPER(V.NOMBRE_CLIENTE) LIKE UPPER(?) OR
      V.TELEFONO LIKE ? OR
      UPPER(V.DIRECCION) LIKE UPPER(?) OR
      UPPER(V.CIUDAD) LIKE UPPER(?) OR
      UPPER(V.COLONIA) LIKE UPPER(?) OR
      V.LOCAL_SALE_ID LIKE UPPER(?)
    )`);
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  return conditions.length > 0 ? ` AND ${conditions.join(" AND ")}` : "";
};

/**
 * Construye la condición del cursor para paginación
 */
const buildCursorCondition = (
  cursorData: ICursorData,
  sortBy: SortField,
  sortOrder: SortOrder,
  params: any[]
): string => {
  const sortColumn = SORT_FIELD_MAP[sortBy];
  const operator = sortOrder === 'desc' ? '<' : '>';

  // Para ordenamiento descendente: queremos registros anteriores al cursor
  // Para ordenamiento ascendente: queremos registros posteriores al cursor
  // Usamos (sortColumn, LOCAL_SALE_ID) como clave compuesta para garantizar unicidad

  if (sortBy === 'fechaVenta') {
    // Caso especial: ordenamiento por fecha (campo principal)
    params.push(cursorData.fechaVenta, cursorData.fechaVenta, cursorData.localSaleId);
    return ` AND (
      V.FECHA_VENTA ${operator} ? OR
      (V.FECHA_VENTA = ? AND V.LOCAL_SALE_ID ${operator} ?)
    )`;
  } else {
    // Ordenamiento por otro campo + fecha como desempate
    params.push(
      cursorData.sortValue,
      cursorData.sortValue,
      cursorData.fechaVenta,
      cursorData.sortValue,
      cursorData.fechaVenta,
      cursorData.localSaleId
    );
    return ` AND (
      ${sortColumn} ${operator} ? OR
      (${sortColumn} = ? AND V.FECHA_VENTA ${operator} ?) OR
      (${sortColumn} = ? AND V.FECHA_VENTA = ? AND V.LOCAL_SALE_ID ${operator} ?)
    )`;
  }
};

/**
 * Obtiene el valor de ordenamiento de un registro para el cursor
 */
const getSortValue = (record: IVentaLocalDB, sortBy: SortField): string | number => {
  switch (sortBy) {
    case 'fechaVenta':
      return moment(record.FECHA_VENTA).format("YYYY-MM-DD HH:mm:ss.SSS");
    case 'nombreCliente':
      return record.NOMBRE_CLIENTE || '';
    case 'precioTotal':
      return record.PRECIO_TOTAL || 0;
    case 'ciudad':
      return record.CIUDAD || '';
    case 'tipoVenta':
      return record.TIPO_VENTA || '';
    default:
      return moment(record.FECHA_VENTA).format("YYYY-MM-DD HH:mm:ss.SSS");
  }
};

/**
 * Listado de ventas locales con paginación por cursor (V2 - World Class)
 */
const obtenerVentasLocalesV2 = async (
  filtros: IFiltrosVentasLocalesV2 = {}
): Promise<IPaginatedResponse<IVentaLocalDB>> => {
  // Validar y normalizar parámetros
  const limit = Math.min(Math.max(filtros.limit || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const sortBy: SortField = filtros.sortBy || 'fechaVenta';
  const sortOrder: SortOrder = filtros.sortOrder || 'desc';

  const params: any[] = [];
  let sql = QUERY_GET_VENTAS_LOCALES_V2_BASE;

  // Agregar condiciones WHERE
  sql += buildWhereConditions(filtros, params);

  // Procesar cursor si existe
  let cursorData: ICursorData | null = null;
  if (filtros.cursor) {
    cursorData = decodeCursor(filtros.cursor);
    if (cursorData) {
      sql += buildCursorCondition(cursorData, sortBy, sortOrder, params);
    }
  }

  // Agregar ORDER BY
  const sortColumn = SORT_FIELD_MAP[sortBy];
  const orderDirection = sortOrder.toUpperCase();

  if (sortBy === 'fechaVenta') {
    sql += ` ORDER BY V.FECHA_VENTA ${orderDirection}, V.LOCAL_SALE_ID ${orderDirection}`;
  } else {
    sql += ` ORDER BY ${sortColumn} ${orderDirection}, V.FECHA_VENTA ${orderDirection}, V.LOCAL_SALE_ID ${orderDirection}`;
  }

  // Pedir uno más para saber si hay siguiente página
  sql += ` ROWS 1 TO ${limit + 1}`;

  // Ejecutar query principal
  const results = await query<IVentaLocalDB>({
    sql,
    params,
    converters: converterVentaLocal,
  });

  // Determinar si hay más páginas
  const hasNextPage = results.length > limit;
  const data = hasNextPage ? results.slice(0, limit) : results;

  // Generar cursores
  let nextCursor: string | null = null;
  let previousCursor: string | null = null;

  if (data.length > 0) {
    // Cursor para siguiente página (último elemento)
    if (hasNextPage) {
      const lastRecord = data[data.length - 1];
      nextCursor = encodeCursor({
        fechaVenta: moment(lastRecord.FECHA_VENTA).format("YYYY-MM-DD HH:mm:ss.SSS"),
        localSaleId: lastRecord.LOCAL_SALE_ID,
        sortValue: getSortValue(lastRecord, sortBy),
      });
    }

    // Cursor para página anterior (primer elemento) - solo si hay cursor actual
    if (cursorData) {
      const firstRecord = data[0];
      previousCursor = encodeCursor({
        fechaVenta: moment(firstRecord.FECHA_VENTA).format("YYYY-MM-DD HH:mm:ss.SSS"),
        localSaleId: firstRecord.LOCAL_SALE_ID,
        sortValue: getSortValue(firstRecord, sortBy),
      });
    }
  }

  // Contar total si se solicita
  let totalCount: number | undefined;
  if (filtros.includeTotal) {
    const countParams: any[] = [];
    let countSql = QUERY_COUNT_VENTAS_LOCALES_BASE;
    countSql += buildWhereConditions(filtros, countParams);

    const countResult = await query<{ TOTAL: number }>({
      sql: countSql,
      params: countParams,
    });
    totalCount = countResult[0]?.TOTAL || 0;
  }

  // Construir filtros aplicados para la respuesta
  const appliedFilters: Record<string, any> = {};
  for (const [key, value] of Object.entries(filtros)) {
    if (value !== undefined && key !== 'cursor' && key !== 'limit' && key !== 'sortBy' && key !== 'sortOrder' && key !== 'includeTotal') {
      appliedFilters[key] = value;
    }
  }

  return {
    data,
    pagination: {
      hasNextPage,
      hasPreviousPage: !!cursorData,
      nextCursor,
      previousCursor,
      limit,
      ...(totalCount !== undefined && { totalCount }),
    },
    filters: {
      applied: appliedFilters,
      sortBy,
      sortOrder,
    },
  };
};

export default {
  crear: crearVentaLocal,
  actualizar: actualizarVentaLocal,
  listar: obtenerVentasLocales,
  listarV2: obtenerVentasLocalesV2,
  obtenerPorId: obtenerVentaLocalPorId,
  obtenerProductos: obtenerProductosVentaLocal,
  obtenerCombos: obtenerCombosVentaLocal,
  obtenerCompleta: obtenerVentaCompleta,
  eliminar: eliminarVentaLocal,
  obtenerResumen: obtenerResumenVentas,
  verificarVentaExiste: verificarVentaExiste,
};
