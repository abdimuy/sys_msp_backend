import { Request, Response } from 'express';
import handleError from './handleError';

interface ISuccessResponseParams {
  req: Request;
  res: Response;
  status?: number;
  data: any;
};

interface IErrorResponseParams {
  req: Request;
  res: Response;
  status?: number;
  error: string;
  details: string
};

interface IResponse {
  error: string;
  body: any;
}


const success = ({ req, res, status = 200, data }: ISuccessResponseParams) => {
  const successResponse: IResponse = {
    error: '',
    body: data
  }
  res.status(status).send(successResponse);
};

const error = ({ req, res, status = 500, error, details }: IErrorResponseParams) => {
  handleError(details);
  const errorResponse: IResponse = {
    error: error,
    body: ''
  }
  res.status(status).send(errorResponse);
};

export default {
  success,
  error
};