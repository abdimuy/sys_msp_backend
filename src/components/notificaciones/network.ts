import { Router, Request, Response } from "express";
import { eventBus, VentaLocalEvent } from "../../utils/eventBus";
import { obtenerZonasDesktop, asignarZonasDesktop } from "../../services/firebaseUserService";

const router = Router();

router.get("/stream", async (req: Request, res: Response) => {
  const email = req.query.email as string;

  if (!email) {
    return res.status(400).json({ error: "El parámetro email es requerido" });
  }

  // Obtener zonas permitidas antes de abrir el stream
  const zonasPermitidas = await obtenerZonasDesktop(email);

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
    // Si no tiene zonas configuradas, recibe todo
    if (zonasPermitidas.length === 0) {
      res.write(`event: nueva_venta\ndata: ${JSON.stringify(event)}\n\n`);
      return;
    }

    // Solo enviar si la zona de la venta está en las permitidas
    if (event.zonaClienteId && zonasPermitidas.includes(event.zonaClienteId)) {
      res.write(`event: nueva_venta\ndata: ${JSON.stringify(event)}\n\n`);
    }
  };

  const unsubscribe = eventBus.onVentaCreada(listener);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

router.get("/zonas/:email", async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const zonas = await obtenerZonasDesktop(email);
    res.json({ email, zonas });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/zonas", async (req: Request, res: Response) => {
  try {
    const { email, zonas } = req.body;

    if (!email || !Array.isArray(zonas)) {
      return res.status(400).json({ error: "Se requiere email (string) y zonas (array de números)" });
    }

    await asignarZonasDesktop(email, zonas);
    res.json({ ok: true, email, zonas });
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
    productos: req.body.productos ?? 3,
    zonaClienteId: req.body.zonaClienteId ?? null,
    timestamp: new Date().toISOString(),
  });
  res.json({ ok: true, message: "Evento de prueba emitido" });
});

export default router;
