import express from 'express';
import responses from '../../network/responses';
import controller from './controller';

const router = express.Router();

router.get('/', (req, res) => {
  controller.getVendedores()
    .then((data) => {
      responses.success({ req, res, data });
    })
    .catch((err) => {
      responses.error({
        req,
        res,
        error: 'Error al obtener los vendedores',
        details: err,
      })
    })
})

export default router;