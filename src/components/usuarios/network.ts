import express from "express";
import controller from "./controller";
import responses from "../../network/responses";
import { ErrorUsuario, TipoErrorUsuario } from "./interfaces";

const router = express.Router();

const getErrorStatus = (error: ErrorUsuario): number => {
  switch (error.tipo) {
    case TipoErrorUsuario.VALIDACION:
      return 400;
    case TipoErrorUsuario.NO_ENCONTRADO:
      return 404;
    case TipoErrorUsuario.DUPLICADO:
      return 409;
    default:
      return 500;
  }
};

const handleError = (res: any, req: any, error: any, mensajeGenerico: string) => {
  if (error instanceof ErrorUsuario) {
    return responses.error({
      req,
      res,
      status: getErrorStatus(error),
      error: error.message,
      details: JSON.stringify({
        tipo: error.tipo,
        codigo: error.codigo,
        detalles: error.detalles,
      }),
    });
  }
  return responses.error({
    req,
    res,
    error: mensajeGenerico,
    details: error.message || error,
  });
};

// GET /usuarios?status=activo|inactivo
router.get("/", async (req, res) => {
  try {
    const status = req.query.status as string | undefined;

    if (status && status !== "activo" && status !== "inactivo") {
      return responses.error({
        req,
        res,
        status: 400,
        error: "El parámetro status debe ser 'activo' o 'inactivo'",
        details: `Valor recibido: '${status}'`,
      });
    }

    const usuarios = await controller.listarUsuarios(
      status as "activo" | "inactivo" | undefined
    );

    return responses.success({ req, res, data: usuarios });
  } catch (error: any) {
    return handleError(res, req, error, "Error al listar usuarios");
  }
});

// POST /usuarios
router.post("/", async (req, res) => {
  try {
    const usuario = await controller.crearUsuario(req.body);
    return responses.success({ req, res, status: 201, data: usuario });
  } catch (error: any) {
    return handleError(res, req, error, "Error al crear usuario");
  }
});

// PUT /usuarios/:uid/password
router.put("/:uid/password", async (req, res) => {
  try {
    const { newPassword } = req.body;
    const resultado = await controller.cambiarPassword(req.params.uid, newPassword);
    return responses.success({ req, res, data: resultado });
  } catch (error: any) {
    return handleError(res, req, error, "Error al cambiar contraseña");
  }
});

// PUT /usuarios/:uid/status
router.put("/:uid/status", async (req, res) => {
  try {
    const { disabled } = req.body;
    const resultado = await controller.cambiarEstatus(req.params.uid, disabled);
    return responses.success({ req, res, data: resultado });
  } catch (error: any) {
    return handleError(res, req, error, "Error al cambiar estatus");
  }
});

// DELETE /usuarios/:uid
router.delete("/:uid", async (req, res) => {
  try {
    const resultado = await controller.eliminarUsuario(req.params.uid);
    return responses.success({ req, res, data: resultado });
  } catch (error: any) {
    return handleError(res, req, error, "Error al eliminar usuario");
  }
});

export default router;
