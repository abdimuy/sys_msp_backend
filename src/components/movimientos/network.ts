import express from 'express';
import controller from './controller';
import responses from '../../network/responses';

const router = express.Router();

router.get('/', (req, res) => {
  controller.getMovimientos()
    .then(data => {
      return responses.success({ req, res, data });
    })
    .catch(err => {
      return responses.error({ req, res, error: 'Error al obtener los movimientos', details: err });
    });
});

router.get('/byAlmacen/:almacenId', (req, res) => {
  const { almacenId } = req.params;
  controller.getMovimientosByAlmacen(parseInt(almacenId))
    .then(data => {
      responses.success({ req, res, data });
    })
    .catch(err => {
      responses.error({ req, res, error: 'Error al obtener los movimientos', details: err });
    });
})

router.post('/', (req, res) => {
  const {
    traspaso,
  } = req.body;
  controller.setMovimientos(traspaso)
    .then(data => {
      responses.success({ req, res, data });
    })
    .catch(err => {
      responses.error({ req, res, error: 'Error al guardar el traspaso', details: err });
    })
})

export default router;
