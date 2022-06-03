import express from 'express';
import responses from '../../network/responses';
import controller from './controller';

const router = express.Router();

router.get('/', async (req, res) => {
  controller.getAlmacenes()
    .then(data => {
      responses.success({req, res, data});
    })
    .catch(err => {
      responses.error({req, res, error: 'Error al obtener los almacenes', details: err});
    });
});

router.get('/movimientos/:almacenId', (req, res) => {
  const { almacenId } = req.params;
  controller.getAlmacenMov(parseInt(almacenId))
    .then(data => {
      responses.success({req, res, data});
    })
    .catch(err => {
      responses.error({req, res, error: 'Error al obtener los movimientos del almacen', details: err});
    });
});

router.get('/:almacenId', (req, res) => {
  const {
    almacenId,
  } = req.params;
  const { comparation = '' } = req.query;
  controller.getOneAlmacen(parseInt(almacenId), comparation.toString())
    .then(data => {
      responses.success({req, res, data});
    })
    .catch(err => {
        responses.error({req, res, error: 'Error al obtener el almacen', details: err});
    })
})

export default router;