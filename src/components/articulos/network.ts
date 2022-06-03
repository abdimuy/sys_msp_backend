import express from 'express';
import responses from '../../network/responses';
import controller from './controller';

const router = express.Router();

router.get('/', (req, res) => {
  controller.getArticulos()
    .then(articulos => {
      responses.success({req, res, data: articulos});
    })
    .catch(err => {
      responses.error({req, res, error: 'Error al obtener los artículos', details: err});
    });
});

router.get('/:articuloId', (req, res) => {
  const { articuloId } = req.params;
  controller.getArticulo(articuloId)
    .then((data) => {
      responses.success({req, res, data});
    })
    .catch(err => {
      responses.error({req, res, error: 'Error al obtener el artículo', details: err});
    });
});

export default router;