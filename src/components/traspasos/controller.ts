import store from './store';
import { ITraspaso, IDetalleTraspasoInput } from './interfaces';

// Crear un nuevo traspaso
const crearTraspaso = (datosTraspaso: ITraspaso): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Validaciones básicas
      if (!datosTraspaso.almacenOrigenId || !datosTraspaso.almacenDestinoId) {
        throw new Error('Los almacenes de origen y destino son requeridos');
      }
      
      if (datosTraspaso.almacenOrigenId === datosTraspaso.almacenDestinoId) {
        throw new Error('El almacén de origen y destino no pueden ser el mismo');
      }
      
      if (!datosTraspaso.detalles || datosTraspaso.detalles.length === 0) {
        throw new Error('Debe incluir al menos un artículo para el traspaso');
      }
      
      // Validar que todos los detalles tengan la información necesaria
      for (const detalle of datosTraspaso.detalles) {
        if (!detalle.articuloId) {
          throw new Error('Todos los artículos deben tener ID');
        }
        
        if (detalle.unidades <= 0) {
          throw new Error('Las unidades deben ser mayores a cero');
        }
      }
      
      // Crear el traspaso
      const resultado = await store.crear(datosTraspaso);
      resolve(resultado);
      
    } catch (error) {
      reject(error);
    }
  });
};

// Obtener lista de traspasos con filtros opcionales
const obtenerTraspasos = (filtros?: {
  fechaInicio?: string;
  fechaFin?: string;
  almacenOrigenId?: number;
  almacenDestinoId?: number;
}): Promise<any[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Convertir fechas string a Date si se proporcionan
      const filtrosConvertidos = filtros ? {
        ...filtros,
        fechaInicio: filtros.fechaInicio ? new Date(filtros.fechaInicio) : undefined,
        fechaFin: filtros.fechaFin ? new Date(filtros.fechaFin) : undefined
      } : undefined;
      
      const traspasos = await store.listar(filtrosConvertidos);
      resolve(traspasos);
      
    } catch (error) {
      reject(error);
    }
  });
};

// Obtener detalle completo de un traspaso
const obtenerTraspasoCompleto = (doctoInId: number): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!doctoInId) {
        throw new Error('El ID del documento es requerido');
      }
      
      // Obtener encabezado
      const traspasos = await store.listar();
      const encabezado = traspasos.find(t => t.DOCTO_IN_ID === doctoInId);
      
      if (!encabezado) {
        throw new Error(`No se encontró el traspaso con ID ${doctoInId}`);
      }
      
      // Obtener detalles
      const detalles = await store.obtenerDetalle(doctoInId);
      
      // Separar salidas y entradas
      const salidas = detalles.filter(d => d.TIPO_MOVTO === 'S');
      const entradas = detalles.filter(d => d.TIPO_MOVTO === 'E');
      
      resolve({
        ...encabezado,
        salidas,
        entradas,
        detallesCompletos: detalles
      });
      
    } catch (error) {
      reject(error);
    }
  });
};

// Validar disponibilidad de artículos antes de crear traspaso - COMENTADO
// const validarDisponibilidad = (
//   almacenId: number,
//   articulos: IDetalleTraspasoInput[]
// ): Promise<any> => {
//   return new Promise(async (resolve, reject) => {
//     try {
//       if (!almacenId) {
//         throw new Error('El ID del almacén es requerido');
//       }
      
//       if (!articulos || articulos.length === 0) {
//         throw new Error('Debe proporcionar al menos un artículo para validar');
//       }
      
//       const validacion = await store.validarExistencias(almacenId, articulos);
//       resolve(validacion);
      
//     } catch (error) {
//       reject(error);
//     }
//   });
// };

// Obtener costo de artículos para preview del traspaso
const obtenerCostosArticulos = (
  almacenId: number,
  articulosIds: number[]
): Promise<any[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const costos = await Promise.all(
        articulosIds.map(async (articuloId) => {
          const costo = await store.getCostoArticulo(almacenId, articuloId);
          return {
            articuloId,
            costoUnitario: costo
          };
        })
      );
      
      resolve(costos);
      
    } catch (error) {
      reject(error);
    }
  });
};

// Crear traspaso con validación previa - COMENTADO: La BD maneja validaciones
// const crearTraspasoConValidacion = (datosTraspaso: ITraspaso): Promise<any> => {
//   return new Promise(async (resolve, reject) => {
//     try {
//       // Primero validar disponibilidad
//       const validacion = await validarDisponibilidad(
//         datosTraspaso.almacenOrigenId,
//         datosTraspaso.detalles
//       );
      
//       if (!validacion.valido) {
//         throw new Error(`No se puede realizar el traspaso: ${validacion.errores.join(', ')}`);
//       }
      
//       // Si la validación es exitosa, crear el traspaso
//       const resultado = await crearTraspaso(datosTraspaso);
//       resolve(resultado);
      
//     } catch (error) {
//       reject(error);
//     }
//   });
// };

export default {
  crear: crearTraspaso,
  // crearConValidacion: crearTraspasoConValidacion, // COMENTADO
  listar: obtenerTraspasos,
  obtenerCompleto: obtenerTraspasoCompleto,
  // validarDisponibilidad, // COMENTADO
  obtenerCostos: obtenerCostosArticulos
};