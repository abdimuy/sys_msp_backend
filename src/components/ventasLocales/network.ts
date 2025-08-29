import express from 'express';
import controller from './controller';
import responses from '../../network/responses';
import { 
  IVentaLocalInput, 
  IFiltrosVentasLocales,
  ErrorVentaLocal, 
  TipoErrorVentaLocal 
} from './interfaces';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const datosVenta: IVentaLocalInput = req.body;
    
    const resultado = await controller.crear(datosVenta);
    
    return responses.success({
      req,
      res,
      data: {
        ...resultado,
        message: 'Venta local creada exitosamente'
      }
    });
  } catch (error: any) {
    if (error instanceof ErrorVentaLocal) {
      const statusCode = 
        error.tipo === TipoErrorVentaLocal.ERROR_DUPLICADO ? 409 :
        error.tipo === TipoErrorVentaLocal.ERROR_PARAMETROS ? 400 :
        error.tipo === TipoErrorVentaLocal.ERROR_ARTICULO_NO_EXISTE ? 422 : 500;
      
      return responses.error({
        req,
        res,
        status: statusCode,
        error: error.message,
        details: JSON.stringify({
          tipo: error.tipo,
          codigo: error.codigo,
          detalles: error.detalles
        })
      });
    }
    
    return responses.error({
      req,
      res,
      error: 'Error al crear la venta local',
      details: error.message || error
    });
  }
});

router.post('/lote', async (req, res) => {
  try {
    const ventas: IVentaLocalInput[] = req.body.ventas;
    
    if (!Array.isArray(ventas)) {
      return responses.error({
        req,
        res,
        status: 400,
        error: 'El campo ventas debe ser un array',
        details: 'Se esperaba un array de ventas en el body'
      });
    }
    
    const resultado = await controller.procesarLote(ventas);
    
    return responses.success({
      req,
      res,
      data: resultado
    });
  } catch (error: any) {
    return responses.error({
      req,
      res,
      error: 'Error al procesar lote de ventas',
      details: error.message || error
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const { 
      fechaInicio, 
      fechaFin, 
      nombreCliente,
      limit,
      offset 
    } = req.query;
    
    const filtros: IFiltrosVentasLocales = {};
    
    if (fechaInicio) filtros.fechaInicio = fechaInicio as string;
    if (fechaFin) filtros.fechaFin = fechaFin as string;
    if (nombreCliente) filtros.nombreCliente = nombreCliente as string;
    if (limit) filtros.limit = parseInt(limit as string);
    if (offset) filtros.offset = parseInt(offset as string);
    
    const ventas = await controller.listar(filtros);
    
    return responses.success({
      req,
      res,
      data: ventas
    });
  } catch (error: any) {
    return responses.error({
      req,
      res,
      error: 'Error al obtener las ventas locales',
      details: error.message || error
    });
  }
});


router.get('/resumen', async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    
    const filtros: IFiltrosVentasLocales = {};
    if (fechaInicio) filtros.fechaInicio = fechaInicio as string;
    if (fechaFin) filtros.fechaFin = fechaFin as string;
    
    const resumen = await controller.obtenerResumen(filtros);
    
    return responses.success({
      req,
      res,
      data: resumen
    });
  } catch (error: any) {
    return responses.error({
      req,
      res,
      error: 'Error al obtener resumen de ventas',
      details: error.message || error
    });
  }
});

router.get('/:localSaleId', async (req, res) => {
  try {
    const { localSaleId } = req.params;
    
    const venta = await controller.obtenerCompleta(localSaleId);
    
    return responses.success({
      req,
      res,
      data: venta
    });
  } catch (error: any) {
    if (error instanceof ErrorVentaLocal && 
        error.tipo === TipoErrorVentaLocal.ERROR_PARAMETROS) {
      return responses.error({
        req,
        res,
        status: 404,
        error: 'Venta no encontrada',
        details: error.message
      });
    }
    
    return responses.error({
      req,
      res,
      error: 'Error al obtener la venta',
      details: error.message || error
    });
  }
});

router.put('/:localSaleId', async (req, res) => {
  try {
    const { localSaleId } = req.params;
    const datosVenta: IVentaLocalInput = req.body;
    
    const resultado = await controller.actualizar(localSaleId, datosVenta);
    
    return responses.success({
      req,
      res,
      data: {
        ...resultado,
        message: 'Venta local actualizada exitosamente'
      }
    });
  } catch (error: any) {
    if (error instanceof ErrorVentaLocal) {
      const statusCode = 
        error.tipo === TipoErrorVentaLocal.ERROR_PARAMETROS ? 400 :
        error.tipo === TipoErrorVentaLocal.ERROR_ARTICULO_NO_EXISTE ? 422 : 500;
      
      return responses.error({
        req,
        res,
        status: statusCode,
        error: error.message,
        details: JSON.stringify({
          tipo: error.tipo,
          codigo: error.codigo,
          detalles: error.detalles
        })
      });
    }
    
    return responses.error({
      req,
      res,
      error: 'Error al actualizar la venta',
      details: error.message || error
    });
  }
});


router.delete('/:localSaleId', async (req, res) => {
  try {
    const { localSaleId } = req.params;
    
    const resultado = await controller.eliminar(localSaleId);
    
    return responses.success({
      req,
      res,
      data: resultado
    });
  } catch (error: any) {
    if (error instanceof ErrorVentaLocal && 
        error.tipo === TipoErrorVentaLocal.ERROR_PARAMETROS) {
      return responses.error({
        req,
        res,
        status: 404,
        error: 'Venta no encontrada',
        details: error.message
      });
    }
    
    return responses.error({
      req,
      res,
      error: 'Error al eliminar la venta',
      details: error.message || error
    });
  }
});

export default router;