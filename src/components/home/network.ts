import express from 'express';
import responses from '../../network/responses';

const router = express.Router();

router.get('/', (req, res) => {
  responses.success({ req, res, data: 'Hello World' });
});

export default router;