import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import controller from './controller';
import responses from '../../network/responses';
import { 
  IVentaLocalInput, 
  IFiltrosVentasLocales,
  ErrorVentaLocal, 
  TipoErrorVentaLocal 
} from './interfaces';

const router = express.Router();

// Configuración de Multer para imágenes de ventas locales
const uploadDir = path.resolve("uploads/ventas-locales");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueId = uuidv4();
    const localSaleId = req.body.localSaleId || 'unknown';
    const name = `venta-${localSaleId}-${uniqueId}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (/^image\/(jpeg|jpg|png|gif)$/.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten imágenes JPEG, PNG o GIF"));
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo por imagen
    files: 10 // Máximo 10 imágenes por venta
  }
});

// Endpoint con soporte para imágenes
router.post('/', upload.array('imagenes'), async (req, res) => {
  try {
    const datosVenta: IVentaLocalInput = JSON.parse(req.body.datos || '{}');
    const files = req.files as Express.Multer.File[];
    
    // Agregar información de las imágenes subidas
    if (files && files.length > 0) {
      datosVenta.imagenes = files.map((file, index) => ({
        descripcion: req.body[`descripcion_${index}`] || `Imagen ${index + 1}`,
        archivo: file
      }));
    }
    
    const resultado = await controller.crear(datosVenta);
    
    return responses.success({
      req,
      res,
      data: {
        ...resultado,
        message: 'Venta local creada exitosamente',
        imagenesSubidas: files?.length || 0
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

// Endpoint temporal para consultar estructura de usuario Firebase
router.get('/temp/usuario-firebase/:email', async (req, res) => {
  try {
    const { db } = await import('../../repositories/firebase');
    const { email } = req.params;
    
    const usersCollection = db.collection('users');
    const querySnapshot = await usersCollection.where('EMAIL', '==', email).get();
    
    if (querySnapshot.empty) {
      return responses.error({
        req,
        res,
        status: 404,
        error: 'Usuario no encontrado',
        details: `No se encontró usuario con email ${email}`
      });
    }
    
    const userData = querySnapshot.docs[0].data();
    
    return responses.success({
      req,
      res,
      data: {
        docId: querySnapshot.docs[0].id,
        userData: userData
      }
    });
  } catch (error: any) {
    return responses.error({
      req,
      res,
      error: 'Error al consultar Firebase',
      details: error.message || error
    });
  }
});

export default router;