export interface IVentaLocal {
  localSaleId: string;
  nombreCliente: string;
  fechaVenta: Date | string;
  latitud: number;
  longitud: number;
  direccion: string;
  parcialidad: number;
  enganche?: number;
  telefono: string;
  frecPago: string;
  avalOResponsable?: string;
  nota?: string;
  diaCobranza: string;
  precioTotal: number;
  tiempoACortoPlazoMeses: number;
  montoACortoPlazo: number;
  productos: IProductoVentaLocal[];
}

export interface IProductoVentaLocal {
  articuloId: number;
  articulo: string;
  cantidad: number;
  precioLista: number;
  precioCortoPlazo: number;
  precioContado: number;
}

export interface IVentaLocalDB {
  LOCAL_SALE_ID: string;
  USER_EMAIL: string;
  ALMACEN_ID: number;
  NOMBRE_CLIENTE: string;
  FECHA_VENTA: Date | string;
  LATITUD: number;
  LONGITUD: number;
  DIRECCION: string;
  PARCIALIDAD: number;
  ENGANCHE: number | null;
  TELEFONO: string;
  FREC_PAGO: string;
  AVAL_O_RESPONSABLE: string | null;
  NOTA: string | null;
  DIA_COBRANZA: string;
  PRECIO_TOTAL: number;
  TIEMPO_A_CORTO_PLAZOMESES: number;
  MONTO_A_CORTO_PLAZO: number;
  ENVIADO: boolean | null;
}

export interface IProductoVentaLocalDB {
  LOCAL_SALE_ID: string;
  ARTICULO_ID: number;
  ARTICULO: string;
  CANTIDAD: number;
  PRECIO_LISTA: number;
  PRECIO_CORTO_PLAZO: number;
  PRECIO_CONTADO: number;
}

export interface IVentaLocalInput {
  localSaleId: string;
  userEmail: string;
  nombreCliente: string;
  fechaVenta?: Date | string;
  latitud: number;
  longitud: number;
  direccion: string;
  parcialidad: number;
  enganche?: number;
  telefono: string;
  frecPago: string;
  avalOResponsable?: string;
  nota?: string;
  diaCobranza: string;
  precioTotal: number;
  tiempoACortoPlazoMeses: number;
  montoACortoPlazo: number;
  productos: IProductoVentaLocalInput[];
}

export interface IProductoVentaLocalInput {
  articuloId: number;
  articulo: string;
  cantidad: number;
  precioLista: number;
  precioCortoPlazo: number;
  precioContado: number;
}

export interface IVentaLocalResult {
  LOCAL_SALE_ID: string;
}

export interface IFiltrosVentasLocales {
  fechaInicio?: Date | string;
  fechaFin?: Date | string;
  nombreCliente?: string;
  limit?: number;
  offset?: number;
}

export enum TipoErrorVentaLocal {
  ERROR_DUPLICADO = 'ERROR_DUPLICADO',
  ERROR_PARAMETROS = 'ERROR_PARAMETROS',
  ERROR_TECNICO = 'ERROR_TECNICO',
  ERROR_ARTICULO_NO_EXISTE = 'ERROR_ARTICULO_NO_EXISTE'
}

export class ErrorVentaLocal extends Error {
  public tipo: TipoErrorVentaLocal;
  public detalles?: string[];
  public codigo?: string;

  constructor(tipo: TipoErrorVentaLocal, mensaje: string, detalles?: string[], codigo?: string) {
    super(mensaje);
    this.name = 'ErrorVentaLocal';
    this.tipo = tipo;
    this.detalles = detalles;
    this.codigo = codigo;
  }

  toJSON() {
    return {
      tipo: this.tipo,
      mensaje: this.message,
      detalles: this.detalles,
      codigo: this.codigo
    };
  }
}

export const VENTA_LOCAL_CONFIG = {
  USUARIO_DEFAULT: "SYSDBA",
  ENVIADO_DEFAULT: false
};