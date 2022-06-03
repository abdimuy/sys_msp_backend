import express, { response } from 'express';
import responses from '../../network/responses';
import controller from './controller';

const router = express.Router();

router.get('/', (req, res) => {
  controller.getLineasArticulos()
    .then((data) => {
      responses.success({ req, res, data })
    })
    .catch((err) => {
      responses.error({
        req,
        res,
        error: 'Error al obtener las lineas de articulos',
        details: err
      });
    });
});

export default router;