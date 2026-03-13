import store from './store';
import {
  IVentaLocalInput,
  IFiltrosVentasLocales,
  IFiltrosVentasLocalesV2,
  IPaginatedResponse,
  IVentaLocalDB,
  ErrorVentaLocal,
  TipoErrorVentaLocal
} from './interfaces';
import { obtenerAlmacenDelUsuario, obtenerUsuariosPorCamioneta } from '../../services/firebaseUserService';
import { validarStockParaVenta } from '../../services/inventarioService';
import { eventBus } from '../../utils/eventBus';

/**
 * Valida los campos básicos de una venta local
 */
const validarCamposBasicos = (datosVenta: IVentaLocalInput, esCreacion: boolean = true): void => {
  if (esCreacion && !datosVenta.localSaleId) {
    throw new ErrorVentaLocal(
      TipoErrorVentaLocal.ERROR_PARAMETROS,
      'El ID de la venta local es requerido',
      ['localSaleId es un campo obligatorio'],
      'ID_VENTA_REQUERIDO'
    );
  }

  if (!datosVenta.userEmail || datosVenta.userEmail.trim() === '') {
    throw new ErrorVentaLocal(
      TipoErrorVentaLocal.ERROR_PARAMETROS,
      'El email del usuario es requerido',
      ['userEmail es un campo obligatorio'],
      'USER_EMAIL_REQUERIDO'
    );
  }

  if (!datosVenta.nombreCliente || datosVenta.nombreCliente.trim() === '') {
    throw new ErrorVentaLocal(
      TipoErrorVentaLocal.ERROR_PARAMETROS,
      'El nombre del cliente es requerido',
      ['nombreCliente no puede estar vacío'],
      'NOMBRE_CLIENTE_REQUERIDO'
    );
  }

  if (!datosVenta.productos || datosVenta.productos.length === 0) {
    throw new ErrorVentaLocal(
      TipoErrorVentaLocal.ERROR_PARAMETROS,
      'Debe incluir al menos un producto en la venta',
      ['La lista de productos no puede estar vacía'],
      'PRODUCTOS_REQUERIDOS'
    );
  }

  for (const producto of datosVenta.productos) {
    if (!producto.articuloId) {
      throw new ErrorVentaLocal(
        TipoErrorVentaLocal.ERROR_PARAMETROS,
        'Todos los productos deben tener ID de artículo',
        ['articuloId es requerido para cada producto'],
        'ARTICULO_ID_REQUERIDO'
      );
    }

    if (producto.cantidad <= 0) {
      throw new ErrorVentaLocal(
        TipoErrorVentaLocal.ERROR_PARAMETROS,
        'La cantidad debe ser mayor a cero',
        [`Producto ${producto.articulo}: cantidad inválida`],
        'CANTIDAD_INVALIDA'
      );
    }

    if (producto.precioLista < 0 || producto.precioCortoPlazo < 0 || producto.precioContado < 0) {
      throw new ErrorVentaLocal(
        TipoErrorVentaLocal.ERROR_PARAMETROS,
        'Los precios no pueden ser negativos',
        [`Producto ${producto.articulo}: precios inválidos`],
        'PRECIOS_INVALIDOS'
      );
    }
  }

  if (datosVenta.latitud < -90 || datosVenta.latitud > 90) {
    throw new ErrorVentaLocal(
      TipoErrorVentaLocal.ERROR_PARAMETROS,
      'Latitud inválida',
      ['La latitud debe estar entre -90 y 90'],
      'LATITUD_INVALIDA'
    );
  }

  if (datosVenta.longitud < -180 || datosVenta.longitud > 180) {
    throw new ErrorVentaLocal(
      TipoErrorVentaLocal.ERROR_PARAMETROS,
      'Longitud inválida',
      ['La longitud debe estar entre -180 y 180'],
      'LONGITUD_INVALIDA'
    );
  }

  // Validar combos si existen
  if (datosVenta.combos && datosVenta.combos.length > 0) {
    const comboIds = new Set<string>();

    for (const combo of datosVenta.combos) {
      if (!combo.comboId || combo.comboId.trim() === '') {
        throw new ErrorVentaLocal(
          TipoErrorVentaLocal.ERROR_PARAMETROS,
          'Todos los combos deben tener un ID',
          ['comboId es requerido para cada combo'],
          'COMBO_ID_REQUERIDO'
        );
      }

      if (!combo.nombreCombo || combo.nombreCombo.trim() === '') {
        throw new ErrorVentaLocal(
          TipoErrorVentaLocal.ERROR_PARAMETROS,
          'Todos los combos deben tener un nombre',
          [`Combo ${combo.comboId}: nombreCombo es requerido`],
          'COMBO_NOMBRE_REQUERIDO'
        );
      }

      if (combo.precioLista < 0 || combo.precioCortoPlazo < 0 || combo.precioContado < 0) {
        throw new ErrorVentaLocal(
          TipoErrorVentaLocal.ERROR_PARAMETROS,
          'Los precios del combo no pueden ser negativos',
          [`Combo ${combo.nombreCombo}: precios inválidos`],
          'COMBO_PRECIOS_INVALIDOS'
        );
      }

      comboIds.add(combo.comboId.trim().toUpperCase());
    }

    // Validar que los productos con comboId referencien combos existentes
    for (const producto of datosVenta.productos) {
      if (producto.comboId) {
        const comboIdNormalizado = producto.comboId.trim().toUpperCase();
        if (!comboIds.has(comboIdNormalizado)) {
          throw new ErrorVentaLocal(
            TipoErrorVentaLocal.ERROR_PARAMETROS,
            'Producto referencia un combo inexistente',
            [`Producto ${producto.articulo} referencia comboId "${producto.comboId}" que no existe en la lista de combos`],
            'COMBO_NO_ENCONTRADO'
          );
        }
      }
    }
  } else {
    // Si no hay combos, verificar que ningún producto tenga comboId
    for (const producto of datosVenta.productos) {
      if (producto.comboId) {
        throw new ErrorVentaLocal(
          TipoErrorVentaLocal.ERROR_PARAMETROS,
          'Producto tiene comboId pero no hay combos definidos',
          [`Producto ${producto.articulo} tiene comboId "${producto.comboId}" pero no se enviaron combos`],
          'COMBO_NO_DEFINIDO'
        );
      }
    }
  }
};

/**
 * Obtiene el almacén origen: usa el proporcionado en datosVenta o lo obtiene de Firebase
 */
const obtenerAlmacenOrigen = async (datosVenta: IVentaLocalInput): Promise<number> => {
  if (datosVenta.almacenOrigenId) {
    return datosVenta.almacenOrigenId;
  }

  try {
    return await obtenerAlmacenDelUsuario(datosVenta.userEmail);
  } catch (error) {
    throw new ErrorVentaLocal(
      TipoErrorVentaLocal.ERROR_PARAMETROS,
      'Error al obtener información del usuario',
      [error instanceof Error ? error.message : String(error)],
      'ERROR_USUARIO_FIREBASE'
    );
  }
};

const crearVentaLocal = (datosVenta: IVentaLocalInput): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Validar campos básicos
      validarCamposBasicos(datosVenta, true);

      // Validar si la venta ya existe (IDEMPOTENCIA)
      const yaExiste = await store.verificarVentaExiste(datosVenta.localSaleId);
      if (yaExiste) {
        resolve({
          success: true,
          localSaleId: datosVenta.localSaleId,
          mensaje: `Venta local con ID ${datosVenta.localSaleId} ya fue procesada anteriormente`,
          yaExistia: true,
          productosRegistrados: 0
        });
        return;
      }

      // Obtener almacén origen
      const almacenOrigenId = await obtenerAlmacenOrigen(datosVenta);

      // Obtener vendedores asignados a la misma camioneta
      const vendedores = await obtenerUsuariosPorCamioneta(almacenOrigenId);

      // Cambiar a true para omitir traspasos por defecto (pruebas)
      const omitirTraspaso = datosVenta.omitirTraspaso ?? false;

      // Validar stock disponible en el almacén origen (si no se omite traspaso)
      if (!omitirTraspaso) {
        const validacionStock = await validarStockParaVenta(almacenOrigenId, datosVenta.productos);
        if (!validacionStock.valido) {
          throw new ErrorVentaLocal(
            TipoErrorVentaLocal.ERROR_STOCK_INSUFICIENTE,
            'Stock insuficiente para realizar la venta',
            validacionStock.errores,
            'STOCK_INSUFICIENTE'
          );
        }
      }

      // Crear la venta con almacén destino opcional
      const resultado = await store.crear(
        datosVenta,
        almacenOrigenId,
        datosVenta.almacenDestinoId,
        omitirTraspaso,
        vendedores
      );

      if (!resultado.yaExistia) {
        eventBus.emitVentaCreada({
          localSaleId: datosVenta.localSaleId,
          nombreCliente: datosVenta.nombreCliente,
          precioTotal: datosVenta.productos.reduce((sum, p) => sum + (p.precioLista * p.cantidad), 0),
          tipoVenta: datosVenta.tipoVenta || "CONTADO",
          userEmail: datosVenta.userEmail,
          productos: datosVenta.productos.length,
          zonaClienteId: datosVenta.zonaClienteId || null,
          timestamp: new Date().toISOString(),
        });
      }

      resolve(resultado);

    } catch (error) {
      reject(error);
    }
  });
};

const actualizarVentaLocal = (
  localSaleId: string,
  datosVenta: IVentaLocalInput
): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!localSaleId) {
        throw new ErrorVentaLocal(
          TipoErrorVentaLocal.ERROR_PARAMETROS,
          'El ID de la venta local es requerido',
          ['localSaleId es un campo obligatorio'],
          'ID_VENTA_REQUERIDO'
        );
      }

      // Validar campos básicos (sin validar localSaleId porque viene como parámetro)
      validarCamposBasicos(datosVenta, false);

      // Obtener almacén origen
      const almacenOrigenId = await obtenerAlmacenOrigen(datosVenta);

      // Obtener vendedores asignados a la misma camioneta
      const vendedores = await obtenerUsuariosPorCamioneta(almacenOrigenId);

      // El store se encarga de validar stock y crear traspasos de ajuste
      const resultado = await store.actualizar(
        localSaleId,
        datosVenta,
        almacenOrigenId,
        datosVenta.almacenDestinoId,
        vendedores
      );
      resolve(resultado);

    } catch (error) {
      reject(error);
    }
  });
};

const obtenerVentasLocales = (filtros?: IFiltrosVentasLocales): Promise<any[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const ventas = await store.listar(filtros);
      resolve(ventas);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Listado de ventas locales V2 con paginación por cursor (World Class)
 */
const obtenerVentasLocalesV2 = (
  filtros?: IFiltrosVentasLocalesV2
): Promise<IPaginatedResponse<IVentaLocalDB>> => {
  return new Promise(async (resolve, reject) => {
    try {
      const resultado = await store.listarV2(filtros || {});
      resolve(resultado);
    } catch (error) {
      reject(error);
    }
  });
};

const obtenerVentaCompleta = (localSaleId: string): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!localSaleId) {
        throw new ErrorVentaLocal(
          TipoErrorVentaLocal.ERROR_PARAMETROS,
          'El ID de la venta es requerido',
          ['localSaleId es obligatorio'],
          'ID_VENTA_REQUERIDO'
        );
      }

      const ventaCompleta = await store.obtenerCompleta(localSaleId);
      resolve(ventaCompleta);
      
    } catch (error) {
      reject(error);
    }
  });
};


const eliminarVentaLocal = (localSaleId: string): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!localSaleId) {
        throw new ErrorVentaLocal(
          TipoErrorVentaLocal.ERROR_PARAMETROS,
          'El ID de la venta es requerido',
          ['localSaleId es obligatorio'],
          'ID_VENTA_REQUERIDO'
        );
      }

      const resultado = await store.eliminar(localSaleId);
      resolve(resultado);
      
    } catch (error) {
      reject(error);
    }
  });
};


const obtenerResumenVentas = (filtros?: IFiltrosVentasLocales): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      const resumen = await store.obtenerResumen(filtros);
      resolve(resumen);
    } catch (error) {
      reject(error);
    }
  });
};

const procesarVentasPorLote = (
  ventas: IVentaLocalInput[]
): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!ventas || ventas.length === 0) {
        throw new ErrorVentaLocal(
          TipoErrorVentaLocal.ERROR_PARAMETROS,
          'Debe proporcionar al menos una venta para procesar',
          ['El array de ventas no puede estar vacío'],
          'VENTAS_VACIAS'
        );
      }

      const resultados = {
        exitosas: [] as string[],
        fallidas: [] as { id: string; error: string }[],
        totales: ventas.length,
      };

      for (const venta of ventas) {
        try {
          // Validaciones básicas
          if (!venta.userEmail || venta.userEmail.trim() === '') {
            throw new Error('El email del usuario es requerido');
          }

          // Obtener almacén origen
          const almacenOrigenId = await obtenerAlmacenOrigen(venta);

          // Obtener vendedores asignados a la misma camioneta
          const vendedoresLote = await obtenerUsuariosPorCamioneta(almacenOrigenId);

          // Validar stock disponible en el almacén origen
          const validacionStock = await validarStockParaVenta(almacenOrigenId, venta.productos);
          if (!validacionStock.valido) {
            throw new Error(`Stock insuficiente: ${validacionStock.errores.join(', ')}`);
          }

          await store.crear(venta, almacenOrigenId, venta.almacenDestinoId, false, vendedoresLote);
          resultados.exitosas.push(venta.localSaleId);
        } catch (error) {
          resultados.fallidas.push({
            id: venta.localSaleId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      resolve({
        ...resultados,
        porcentajeExito: (resultados.exitosas.length / resultados.totales) * 100,
        mensaje: `Procesadas ${resultados.exitosas.length} de ${resultados.totales} ventas`,
      });

    } catch (error) {
      reject(error);
    }
  });
};

const obtenerVendedoresUnicos = (): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      const vendedores = await store.obtenerVendedoresUnicos();
      resolve(vendedores);
    } catch (error) {
      reject(error);
    }
  });
};

export default {
  crear: crearVentaLocal,
  actualizar: actualizarVentaLocal,
  listar: obtenerVentasLocales,
  listarV2: obtenerVentasLocalesV2,
  obtenerCompleta: obtenerVentaCompleta,
  eliminar: eliminarVentaLocal,
  obtenerResumen: obtenerResumenVentas,
  procesarLote: procesarVentasPorLote,
  obtenerVendedoresUnicos: obtenerVendedoresUnicos,
};