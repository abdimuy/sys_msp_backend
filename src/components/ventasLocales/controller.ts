import store from './store';
import { 
  IVentaLocalInput, 
  IFiltrosVentasLocales,
  ErrorVentaLocal,
  TipoErrorVentaLocal 
} from './interfaces';
import { obtenerAlmacenDelUsuario } from '../../services/firebaseUserService';
import { validarStockParaVenta } from '../../services/inventarioService';

const crearVentaLocal = (datosVenta: IVentaLocalInput): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!datosVenta.localSaleId) {
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

      // Obtener el almacén del usuario desde Firebase
      let almacenId: number;
      try {
        almacenId = await obtenerAlmacenDelUsuario(datosVenta.userEmail);
      } catch (error) {
        throw new ErrorVentaLocal(
          TipoErrorVentaLocal.ERROR_PARAMETROS,
          'Error al obtener información del usuario',
          [error instanceof Error ? error.message : String(error)],
          'ERROR_USUARIO_FIREBASE'
        );
      }

      // Validar stock disponible en el almacén del usuario
      const validacionStock = await validarStockParaVenta(almacenId, datosVenta.productos);
      if (!validacionStock.valido) {
        throw new ErrorVentaLocal(
          TipoErrorVentaLocal.ERROR_ARTICULO_NO_EXISTE,
          'Stock insuficiente para realizar la venta',
          validacionStock.errores,
          'STOCK_INSUFICIENTE'
        );
      }

      const resultado = await store.crear(datosVenta, almacenId);
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

      // Obtener el almacén del usuario desde Firebase
      let almacenId: number;
      try {
        almacenId = await obtenerAlmacenDelUsuario(datosVenta.userEmail);
      } catch (error) {
        throw new ErrorVentaLocal(
          TipoErrorVentaLocal.ERROR_PARAMETROS,
          'Error al obtener información del usuario',
          [error instanceof Error ? error.message : String(error)],
          'ERROR_USUARIO_FIREBASE'
        );
      }

      // Validar stock disponible en el almacén del usuario
      const validacionStock = await validarStockParaVenta(almacenId, datosVenta.productos);
      if (!validacionStock.valido) {
        throw new ErrorVentaLocal(
          TipoErrorVentaLocal.ERROR_ARTICULO_NO_EXISTE,
          'Stock insuficiente para actualizar la venta',
          validacionStock.errores,
          'STOCK_INSUFICIENTE'
        );
      }

      const resultado = await store.actualizar(localSaleId, datosVenta, almacenId);
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
          // Validaciones básicas (igual que en crear individual)
          if (!venta.userEmail || venta.userEmail.trim() === '') {
            throw new Error('El email del usuario es requerido');
          }

          // Obtener el almacén del usuario desde Firebase
          let almacenId: number;
          try {
            almacenId = await obtenerAlmacenDelUsuario(venta.userEmail);
          } catch (error) {
            throw new Error(`Error al obtener información del usuario: ${error instanceof Error ? error.message : String(error)}`);
          }

          // Validar stock disponible en el almacén del usuario
          const validacionStock = await validarStockParaVenta(almacenId, venta.productos);
          if (!validacionStock.valido) {
            throw new Error(`Stock insuficiente: ${validacionStock.errores.join(', ')}`);
          }

          await store.crear(venta, almacenId);
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

export default {
  crear: crearVentaLocal,
  actualizar: actualizarVentaLocal,
  listar: obtenerVentasLocales,
  obtenerCompleta: obtenerVentaCompleta,
  eliminar: eliminarVentaLocal,
  obtenerResumen: obtenerResumenVentas,
  procesarLote: procesarVentasPorLote,
};