import express from 'express';
import controller from './controller';
import responses from '../../network/responses';
import { ITraspaso } from './interfaces';

const router = express.Router();

// Crear un nuevo traspaso
router.post('/', async (req, res) => {
  try {
    const datosTraspaso: ITraspaso = req.body;
    
    // Crear traspaso directamente (la BD maneja las validaciones)
    const resultado = await controller.crear(datosTraspaso);
    
    return responses.success({
      req,
      res,
      data: {
        ...resultado,
        message: 'Traspaso creado exitosamente'
      }
    });
  } catch (error: any) {
    return responses.error({
      req,
      res,
      error: 'Error al crear el traspaso',
      details: error.message || error
    });
  }
});

// Obtener lista de traspasos con filtros opcionales
router.get('/', async (req, res) => {
  try {
    const { fechaInicio, fechaFin, almacenOrigenId, almacenDestinoId } = req.query;
    
    const filtros = {
      fechaInicio: fechaInicio as string,
      fechaFin: fechaFin as string,
      almacenOrigenId: almacenOrigenId ? parseInt(almacenOrigenId as string) : undefined,
      almacenDestinoId: almacenDestinoId ? parseInt(almacenDestinoId as string) : undefined
    };
    
    const traspasos = await controller.listar(filtros);
    
    return responses.success({
      req,
      res,
      data: traspasos
    });
  } catch (error: any) {
    return responses.error({
      req,
      res,
      error: 'Error al obtener los traspasos',
      details: error.message || error
    });
  }
});

// Obtener detalle completo de un traspaso específico
router.get('/:doctoInId', async (req, res) => {
  try {
    const doctoInId = parseInt(req.params.doctoInId);
    
    if (isNaN(doctoInId)) {
      return responses.error({
        req,
        res,
        error: 'ID de documento inválido',
        details: 'El ID proporcionado no es un número válido'
      });
    }
    
    const traspaso = await controller.obtenerCompleto(doctoInId);
    
    return responses.success({
      req,
      res,
      data: traspaso
    });
  } catch (error: any) {
    return responses.error({
      req,
      res,
      error: 'Error al obtener el detalle del traspaso',
      details: error.message || error
    });
  }
});

// Validar disponibilidad de artículos antes de crear traspaso - COMENTADO
// router.post('/validar', async (req, res) => {
//   try {
//     const { almacenId, articulos } = req.body;
    
//     if (!almacenId || !articulos) {
//       return responses.error({
//         req,
//         res,
//         error: 'Almacén y artículos son requeridos',
//         details: 'Debe proporcionar almacenId y lista de articulos'
//       });
//     }
    
//     const validacion = await controller.validarDisponibilidad(almacenId, articulos);
    
//     return responses.success({
//       req,
//       res,
//       data: validacion
//     });
//   } catch (error: any) {
//     return responses.error({
//       req,
//       res,
//       error: 'Error al validar disponibilidad',
//       details: error.message || error
//     });
//   }
// });

// Obtener costos de artículos para preview
router.post('/costos', async (req, res) => {
  try {
    const { almacenId, articulosIds } = req.body;
    
    if (!almacenId || !articulosIds || !Array.isArray(articulosIds)) {
      return responses.error({
        req,
        res,
        error: 'Almacén y lista de artículos son requeridos',
        details: 'Debe proporcionar almacenId y articulosIds como array'
      });
    }
    
    const costos = await controller.obtenerCostos(almacenId, articulosIds);
    
    return responses.success({
      req,
      res,
      data: costos
    });
  } catch (error: any) {
    return responses.error({
      req,
      res,
      error: 'Error al obtener costos',
      details: error.message || error
    });
  }
});

// Crear traspaso sin validación (uso avanzado) - YA NO ES NECESARIO
// router.post('/forzar', async (req, res) => {
//   try {
//     const datosTraspaso: ITraspaso = req.body;
    
//     // Crear sin validación previa (usar con precaución)
//     const resultado = await controller.crear(datosTraspaso);
    
//     return responses.success({
//       req,
//       res,
//       data: {
//         ...resultado,
//         message: 'Traspaso creado exitosamente (sin validación)'
//       }
//     });
//   } catch (error: any) {
//     return responses.error({
//       req,
//       res,
//       error: 'Error al crear el traspaso',
//       details: error.message || error
//     });
//   }
// });

export default router;