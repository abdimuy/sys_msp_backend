import { Router, Request, Response } from "express";
import { eventBus, VentaLocalEvent } from "../../utils/eventBus";
import { obtenerVendedoresDesktop, asignarVendedoresDesktop, obtenerTodosLosUsuarios } from "../../services/firebaseUserService";

const router = Router();

router.get("/stream", async (req: Request, res: Response) => {
  const email = req.query.email as string;

  if (!email) {
    return res.status(400).json({ error: "El parámetro email es requerido" });
  }

  // Obtener vendedores permitidos antes de abrir el stream
  const vendedoresPermitidos = await obtenerVendedoresDesktop(email);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // Heartbeat cada 30s para mantener la conexión viva
  const heartbeat = setInterval(() => {
    res.write(":heartbeat\n\n");
  }, 30000);

  const listener = (event: VentaLocalEvent) => {
    // Si no tiene vendedores configurados, recibe todo
    if (vendedoresPermitidos.length === 0) {
      res.write(`event: nueva_venta\ndata: ${JSON.stringify(event)}\n\n`);
      return;
    }

    // Solo enviar si alguno de los vendedores de la venta está en los permitidos
    const emailsVenta = event.vendedoresEmails || [];
    const match = emailsVenta.some(email => vendedoresPermitidos.includes(email));
    if (match) {
      res.write(`event: nueva_venta\ndata: ${JSON.stringify(event)}\n\n`);
    }
  };

  const unsubscribe = eventBus.onVentaCreada(listener);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

router.get("/vendedores/:email", async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const vendedores = await obtenerVendedoresDesktop(email);
    res.json({ email, vendedores });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/vendedores", async (req: Request, res: Response) => {
  try {
    const { email, vendedores } = req.body;

    if (!email || !Array.isArray(vendedores)) {
      return res.status(400).json({ error: "Se requiere email (string) y vendedores (array de strings)" });
    }

    await asignarVendedoresDesktop(email, vendedores);
    res.json({ ok: true, email, vendedores });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/usuarios-firebase", async (req: Request, res: Response) => {
  try {
    const usuarios = await obtenerTodosLosUsuarios();
    res.json(usuarios);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/test", (req: Request, res: Response) => {
  eventBus.emitVentaCreada({
    localSaleId: req.body.localSaleId ?? "TEST-" + Date.now(),
    nombreCliente: req.body.nombreCliente ?? "CLIENTE DE PRUEBA",
    precioTotal: req.body.precioTotal ?? 9999.99,
    tipoVenta: req.body.tipoVenta ?? "CONTADO",
    userEmail: req.body.userEmail ?? "test@prueba.com",
    vendedoresEmails: req.body.vendedoresEmails ?? [req.body.userEmail ?? "test@prueba.com"],
    vendedoresNombres: req.body.vendedoresNombres ?? ["VENDEDOR DE PRUEBA"],
    productos: req.body.productos ?? 3,
    zonaClienteId: req.body.zonaClienteId ?? null,
    timestamp: new Date().toISOString(),
  });
  res.json({ ok: true, message: "Evento de prueba emitido" });
});

export default router;
