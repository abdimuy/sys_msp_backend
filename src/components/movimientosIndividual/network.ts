import express from 'express';
import controller from './controller';
import responses from '../../network/responses';

const router = express.Router();

router.get('/', (req, res) => {
  controller.getMovimientosIndiv()
    .then(data => {
      responses.success({ req, res, data });
    })
    .catch(err => {
      responses.error({
        req,
        res,
        error: 'Error al obtener los movimientos dividuales',
        details: err
      });
    });
});

export default router;