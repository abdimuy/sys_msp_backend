import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import controller from "./controller";
import responses from "../../network/responses";
import {
  IVentaLocalInput,
  IFiltrosVentasLocales,
  IFiltrosVentasLocalesV2,
  SortField,
  SortOrder,
  ErrorVentaLocal,
  TipoErrorVentaLocal,
} from "./interfaces";

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

    let localSaleId = "unknown";
    try {
      if (req.body.datos) {
        const datosVenta = JSON.parse(req.body.datos);
        localSaleId = datosVenta.localSaleId || "unknown";
      }
    } catch (error) {
      localSaleId = "unknown";
    }

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
    fileSize: 100 * 1024 * 1024, // 100 MB máximo por imagen
    files: 10, // Máximo 10 imágenes por venta
  },
});

// Endpoint con soporte para imágenes
router.post("/", upload.array("imagenes"), async (req, res) => {
  try {
    const datosVenta: IVentaLocalInput = JSON.parse(req.body.datos || "{}");
    const files = req.files as Express.Multer.File[];

    // Agregar información de las imágenes subidas
    if (files && files.length > 0) {
      datosVenta.imagenes = files.map((file, index) => ({
        id: req.body[`id_${index}`] || undefined,
        descripcion: req.body[`descripcion_${index}`] || `Imagen ${index + 1}`,
        archivo: file,
      }));
    }

    const resultado = await controller.crear(datosVenta);

    return responses.success({
      req,
      res,
      data: {
        ...resultado,
        message: "Venta local creada exitosamente",
        imagenesSubidas: files?.length || 0,
      },
    });
  } catch (error: any) {
    if (error instanceof ErrorVentaLocal) {
      const statusCode =
        error.tipo === TipoErrorVentaLocal.ERROR_DUPLICADO
          ? 409
          : error.tipo === TipoErrorVentaLocal.ERROR_PARAMETROS
          ? 400
          : error.tipo === TipoErrorVentaLocal.ERROR_ARTICULO_NO_EXISTE
          ? 422
          : error.tipo === TipoErrorVentaLocal.ERROR_STOCK_INSUFICIENTE
          ? 409
          : 500;

      return responses.error({
        req,
        res,
        status: statusCode,
        error: error.message,
        details: JSON.stringify({
          tipo: error.tipo,
          codigo: error.codigo,
          detalles: error.detalles,
        }),
      });
    }

    return responses.error({
      req,
      res,
      error: "Error al crear la venta local",
      details: error.message || error,
    });
  }
});

router.post("/lote", async (req, res) => {
  try {
    const ventas: IVentaLocalInput[] = req.body.ventas;

    if (!Array.isArray(ventas)) {
      return responses.error({
        req,
        res,
        status: 400,
        error: "El campo ventas debe ser un array",
        details: "Se esperaba un array de ventas en el body",
      });
    }

    const resultado = await controller.procesarLote(ventas);

    return responses.success({
      req,
      res,
      data: resultado,
    });
  } catch (error: any) {
    return responses.error({
      req,
      res,
      error: "Error al procesar lote de ventas",
      details: error.message || error,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const { fechaInicio, fechaFin, nombreCliente, zonaClienteId, limit, offset } = req.query;

    const filtros: IFiltrosVentasLocales = {};

    if (fechaInicio) filtros.fechaInicio = fechaInicio as string;
    if (fechaFin) filtros.fechaFin = fechaFin as string;
    if (nombreCliente) filtros.nombreCliente = nombreCliente as string;
    if (zonaClienteId) filtros.zonaClienteId = parseInt(zonaClienteId as string);
    if (limit) filtros.limit = parseInt(limit as string);
    if (offset) filtros.offset = parseInt(offset as string);

    const ventas = await controller.listar(filtros);

    return responses.success({
      req,
      res,
      data: ventas,
    });
  } catch (error: any) {
    return responses.error({
      req,
      res,
      error: "Error al obtener las ventas locales",
      details: error.message || error,
    });
  }
});

/**
 * GET /v2 - Listado de ventas locales con paginación por cursor (World Class)
 *
 * Query Parameters:
 * - Filtros de fecha:
 *   @param {string} fechaInicio - Fecha inicio (YYYY-MM-DD)
 *   @param {string} fechaFin - Fecha fin (YYYY-MM-DD)
 *
 * - Filtros de texto (búsqueda parcial):
 *   @param {string} nombreCliente - Nombre del cliente
 *   @param {string} telefono - Teléfono
 *   @param {string} direccion - Dirección
 *   @param {string} ciudad - Ciudad
 *   @param {string} colonia - Colonia
 *   @param {string} poblacion - Población
 *
 * - Filtros exactos:
 *   @param {number} zonaClienteId - ID de zona cliente
 *   @param {string} tipoVenta - CONTADO | CREDITO
 *   @param {string} userEmail - Email del vendedor
 *   @param {number} almacenId - ID del almacén
 *   @param {boolean} enviado - Estado de envío
 *
 * - Filtros de rango:
 *   @param {number} precioMin - Precio mínimo
 *   @param {number} precioMax - Precio máximo
 *
 * - Búsqueda general:
 *   @param {string} search - Busca en múltiples campos
 *
 * - Paginación:
 *   @param {string} cursor - Cursor para paginación
 *   @param {number} limit - Tamaño de página (default 20, max 100)
 *
 * - Ordenamiento:
 *   @param {string} sortBy - Campo: fechaVenta|nombreCliente|precioTotal|ciudad|tipoVenta
 *   @param {string} sortOrder - asc|desc (default desc)
 *
 * - Opciones:
 *   @param {boolean} includeTotal - Incluir conteo total (más lento)
 */
router.get("/v2", async (req, res) => {
  try {
    const {
      // Filtros de fecha
      fechaInicio,
      fechaFin,
      // Filtros de texto
      nombreCliente,
      telefono,
      direccion,
      ciudad,
      colonia,
      poblacion,
      // Filtros exactos
      zonaClienteId,
      tipoVenta,
      userEmail,
      almacenId,
      enviado,
      // Filtros de rango
      precioMin,
      precioMax,
      // Búsqueda general
      search,
      // Paginación
      cursor,
      limit,
      // Ordenamiento
      sortBy,
      sortOrder,
      // Opciones
      includeTotal,
    } = req.query;

    const filtros: IFiltrosVentasLocalesV2 = {};

    // Filtros de fecha
    if (fechaInicio) filtros.fechaInicio = fechaInicio as string;
    if (fechaFin) filtros.fechaFin = fechaFin as string;

    // Filtros de texto
    if (nombreCliente) filtros.nombreCliente = nombreCliente as string;
    if (telefono) filtros.telefono = telefono as string;
    if (direccion) filtros.direccion = direccion as string;
    if (ciudad) filtros.ciudad = ciudad as string;
    if (colonia) filtros.colonia = colonia as string;
    if (poblacion) filtros.poblacion = poblacion as string;

    // Filtros exactos
    if (zonaClienteId) filtros.zonaClienteId = parseInt(zonaClienteId as string);
    if (tipoVenta) {
      const tipo = (tipoVenta as string).toUpperCase();
      if (tipo === 'CONTADO' || tipo === 'CREDITO') {
        filtros.tipoVenta = tipo;
      }
    }
    if (userEmail) filtros.userEmail = userEmail as string;
    if (almacenId) filtros.almacenId = parseInt(almacenId as string);
    if (enviado !== undefined) {
      filtros.enviado = enviado === 'true' || enviado === '1';
    }

    // Filtros de rango
    if (precioMin) filtros.precioMin = parseFloat(precioMin as string);
    if (precioMax) filtros.precioMax = parseFloat(precioMax as string);

    // Búsqueda general
    if (search) filtros.search = search as string;

    // Paginación
    if (cursor) filtros.cursor = cursor as string;
    if (limit) filtros.limit = parseInt(limit as string);

    // Ordenamiento
    if (sortBy) {
      const validSortFields: SortField[] = ['fechaVenta', 'nombreCliente', 'precioTotal', 'ciudad', 'tipoVenta'];
      if (validSortFields.includes(sortBy as SortField)) {
        filtros.sortBy = sortBy as SortField;
      }
    }
    if (sortOrder) {
      const order = (sortOrder as string).toLowerCase();
      if (order === 'asc' || order === 'desc') {
        filtros.sortOrder = order as SortOrder;
      }
    }

    // Opciones
    if (includeTotal !== undefined) {
      filtros.includeTotal = includeTotal === 'true' || includeTotal === '1';
    }

    const resultado = await controller.listarV2(filtros);

    return responses.success({
      req,
      res,
      data: resultado,
    });
  } catch (error: any) {
    return responses.error({
      req,
      res,
      error: "Error al obtener las ventas locales",
      details: error.message || error,
    });
  }
});

router.get("/resumen", async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    const filtros: IFiltrosVentasLocales = {};
    if (fechaInicio) filtros.fechaInicio = fechaInicio as string;
    if (fechaFin) filtros.fechaFin = fechaFin as string;

    const resumen = await controller.obtenerResumen(filtros);

    return responses.success({
      req,
      res,
      data: resumen,
    });
  } catch (error: any) {
    return responses.error({
      req,
      res,
      error: "Error al obtener resumen de ventas",
      details: error.message || error,
    });
  }
});

router.get("/:localSaleId", async (req, res) => {
  try {
    const { localSaleId } = req.params;

    const venta = await controller.obtenerCompleta(localSaleId);

    return responses.success({
      req,
      res,
      data: venta,
    });
  } catch (error: any) {
    if (
      error instanceof ErrorVentaLocal &&
      error.tipo === TipoErrorVentaLocal.ERROR_PARAMETROS
    ) {
      return responses.error({
        req,
        res,
        status: 404,
        error: "Venta no encontrada",
        details: error.message,
      });
    }

    return responses.error({
      req,
      res,
      error: "Error al obtener la venta",
      details: error.message || error,
    });
  }
});

router.put("/:localSaleId", upload.array("imagenes"), async (req, res) => {
  try {
    const { localSaleId } = req.params;

    // Soportar tanto JSON directo como multipart form data
    let datosVenta: IVentaLocalInput;
    if (req.body.datos) {
      datosVenta = JSON.parse(req.body.datos);
    } else {
      datosVenta = req.body;
    }

    const files = req.files as Express.Multer.File[];

    // Agregar información de las imágenes nuevas subidas
    if (files && files.length > 0) {
      datosVenta.imagenes = files.map((file, index) => ({
        id: req.body[`id_${index}`] || undefined,
        descripcion: req.body[`descripcion_${index}`] || `Imagen ${index + 1}`,
        archivo: file,
      }));
    }

    const resultado = await controller.actualizar(localSaleId, datosVenta);

    return responses.success({
      req,
      res,
      data: {
        ...resultado,
        message: "Venta local actualizada exitosamente",
        imagenesSubidas: files?.length || 0,
      },
    });
  } catch (error: any) {
    if (error instanceof ErrorVentaLocal) {
      const statusCode =
        error.tipo === TipoErrorVentaLocal.ERROR_PARAMETROS
          ? 400
          : error.tipo === TipoErrorVentaLocal.ERROR_ARTICULO_NO_EXISTE
          ? 422
          : error.tipo === TipoErrorVentaLocal.ERROR_STOCK_INSUFICIENTE
          ? 409
          : 500;

      return responses.error({
        req,
        res,
        status: statusCode,
        error: error.message,
        details: JSON.stringify({
          tipo: error.tipo,
          codigo: error.codigo,
          detalles: error.detalles,
        }),
      });
    }

    return responses.error({
      req,
      res,
      error: "Error al actualizar la venta",
      details: error.message || error,
    });
  }
});

router.delete("/:localSaleId", async (req, res) => {
  try {
    const { localSaleId } = req.params;

    const resultado = await controller.eliminar(localSaleId);

    return responses.success({
      req,
      res,
      data: resultado,
    });
  } catch (error: any) {
    if (
      error instanceof ErrorVentaLocal &&
      error.tipo === TipoErrorVentaLocal.ERROR_PARAMETROS
    ) {
      return responses.error({
        req,
        res,
        status: 404,
        error: "Venta no encontrada",
        details: error.message,
      });
    }

    return responses.error({
      req,
      res,
      error: "Error al eliminar la venta",
      details: error.message || error,
    });
  }
});

// Endpoint temporal para consultar estructura de usuario Firebase
router.get("/temp/usuario-firebase/:email", async (req, res) => {
  try {
    const { db } = await import("../../repositories/firebase");
    const { email } = req.params;

    const usersCollection = db.collection("users");
    const querySnapshot = await usersCollection
      .where("EMAIL", "==", email)
      .get();

    if (querySnapshot.empty) {
      return responses.error({
        req,
        res,
        status: 404,
        error: "Usuario no encontrado",
        details: `No se encontró usuario con email ${email}`,
      });
    }

    const userData = querySnapshot.docs[0].data();

    return responses.success({
      req,
      res,
      data: {
        docId: querySnapshot.docs[0].id,
        userData: userData,
      },
    });
  } catch (error: any) {
    return responses.error({
      req,
      res,
      error: "Error al consultar Firebase",
      details: error.message || error,
    });
  }
});

export default router;
