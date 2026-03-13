import { EventEmitter } from "events";

export interface VentaLocalEvent {
  localSaleId: string;
  nombreCliente: string;
  precioTotal: number;
  tipoVenta: string;
  userEmail: string;
  productos: number;
  zonaClienteId: number | null;
  timestamp: string;
}

class AppEventBus extends EventEmitter {
  private static instance: AppEventBus;

  private constructor() {
    super();
    this.setMaxListeners(50);
  }

  static getInstance(): AppEventBus {
    if (!AppEventBus.instance) {
      AppEventBus.instance = new AppEventBus();
    }
    return AppEventBus.instance;
  }

  emitVentaCreada(event: VentaLocalEvent) {
    this.emit("venta:creada", event);
  }

  onVentaCreada(listener: (event: VentaLocalEvent) => void) {
    this.on("venta:creada", listener);
    return () => this.off("venta:creada", listener);
  }
}

export const eventBus = AppEventBus.getInstance();
