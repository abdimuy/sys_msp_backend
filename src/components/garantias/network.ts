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
    const ext = path.extname(file.originalname);
    const name = `garantia-${req.params.id}-${file.originalname}`;
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
    fileSize: 20 * 1024 * 1024, // 20 MB por archivo
  },
});

// Ruta: GET /garantias/activa
router.get("/activa", async (req, res) => {
  try {
    const garantias = await controller.getGarantiasActivas();
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

router.get("/:idGarantia", controller.getGarantiaById)

router.get('/eventos_activos', controller.getEventosGarantiasActivas)

// Ruta: POST /garantias/:id/imagenes
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
