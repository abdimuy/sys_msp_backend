import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { createGarantiaWithImages } from "./controller";
import { v4 as uuid } from "uuid";

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
    const name = `garantia-${req.params.id}-${uuid()}${ext}`;
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

const upload = multer({ storage, fileFilter });

// Ruta: POST /garantias/:id/imagenes
router.post(
  "/:id/imagenes",
  upload.array("imagenes", 5),
  createGarantiaWithImages
);

export default router;
