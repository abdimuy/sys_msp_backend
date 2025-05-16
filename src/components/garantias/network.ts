import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadGarantiaImages } from './controller';

const router = Router();

// configuración de multer
const uploadDir = path.resolve('uploads/garantias');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: () => uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `garantia-${req.params.id}-${Date.now()}${ext}`;
    cb(null, name);
  }
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (/^image\/(jpeg|png|gif)$/.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes JPEG/PNG/GIF'));
  }
};

const upload = multer({ storage, fileFilter });

// POST /garantias/:id/imagenes
router.post(
  '/:id/imagenes',
  upload.array('imagenes', 5),
  async (req: Request, res: Response) => {
    const garantiaId = parseInt(req.params.id, 10);
    const files = req.files as Express.Multer.File[];

    try {
      const images = await uploadGarantiaImages(garantiaId, files);
      res.status(201).json({ images });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

export default router;
