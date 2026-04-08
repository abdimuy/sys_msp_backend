import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import controller, { createGarantiaEvento, createGarantiaWithImages, listGarantiaEventos } from "./controller";
import responses from "../../network/responses";

const router = Router();

// Configuración de Multer
const uploadDir = path.resolve("uploads/garantias");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const idPart = req.params.id || "nueva";
    const name = `garantia-${idPart}-${Date.now()}-${file.originalname}`;
    cb(null, name);
  },
});

const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (/^image\/(jpeg|png|gif)$/.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten imágenes JPEG, PNG o GIF"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB por archivo
  },
});

// Ruta: GET /garantias/estados
router.get("/estados", (_req, res) => {
  responses.success({ req: _req, res, data: [
    { value: "PENDIENTE", label: "Pendiente" },
    { value: "NOTIFICADO", label: "Notificado" },
    { value: "RECOLECTADO", label: "Recolectado" },
    { value: "RECIBIDO", label: "Recibido" },
    { value: "LEVANTAMIENTO_REPORTE", label: "Levantamiento de reporte" },
    { value: "EN_PROCESO_REPARACION", label: "En proceso de reparación" },
    { value: "NO_APLICABLE", label: "No aplicable" },
    { value: "APLICABLE", label: "Aplicable" },
    { value: "LISTO_PARA_ENTREGAR", label: "Listo para entregar" },
    { value: "ENTREGADO", label: "Entregado" },
    { value: "CIERRE_GARANTIA", label: "Cierre de garantía" },
    { value: "CANCELADO", label: "Cancelado" },
  ]});
});

// Ruta: GET /garantias/activa?estado=...&fechaInicio=...&fechaFin=...&zonaClienteId=...&cliente=...
router.get("/activa", async (req, res) => {
  try {
    const { estado, fechaInicio, fechaFin, zonaClienteId, cliente } = req.query;

    const filtros = {
      estado: estado as string | undefined,
      fechaInicio: fechaInicio as string | undefined,
      fechaFin: fechaFin as string | undefined,
      zonaClienteId: zonaClienteId ? parseInt(zonaClienteId as string) : undefined,
      cliente: cliente as string | undefined,
    };

    const garantias = await controller.getGarantiasActivas(filtros);
    responses.success({ req, res, data: garantias, status: 200 });
  } catch (error) {
    responses.error({
      req,
      res,
      error: "Error al obtener garantías activas",
      details: error,
      status: 500,
    });
  }
});

router.get("/imagenes/:garantiaId", controller.getImagesByGarantia)

router.get('/eventos_activos', controller.getEventosGarantiasActivas)

router.get("/:idGarantia", controller.getGarantiaById)

// Ruta: POST /garantias/nueva — crear garantía (con o sin venta asociada)
router.post(
  "/nueva",
  upload.array("imagenes", 10),
  createGarantiaWithImages
);

// Ruta legacy: POST /garantias/:id/imagenes (mantiene compatibilidad)
router.post(
  "/:id/imagenes",
  upload.array("imagenes", 10),
  createGarantiaWithImages
);

// POST /garantias/:id/eventos
router.post('/:id/eventos', createGarantiaEvento);

// POST /garantias/:id/eventos-con-imagenes (nuevo endpoint con multipart)
router.post(
  '/:id/eventos-con-imagenes',
  upload.array('imagenes', 10),
  controller.createGarantiaEventoWithImages
);

// GET /garantias/:id/eventos
router.get('/:id/eventos', listGarantiaEventos);

export default router;
