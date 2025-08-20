export interface ITraspaso {
  almacenOrigenId: number;
  almacenDestinoId: number;
  fecha?: Date | string;
  descripcion?: string;
  detalles: IDetalleTraspasoInput[];
  usuario?: string;
}

export interface IDetalleTraspasoInput {
  articuloId: number;
  claveArticulo?: string; // Opcional - se obtiene automáticamente si no se proporciona
  unidades: number;
}

export interface IDoctoIn {
  DOCTO_IN_ID: number;
  ALMACEN_ID: number;
  CONCEPTO_IN_ID: number;
  SUCURSAL_ID: number;
  FOLIO: string;
  NATURALEZA_CONCEPTO: string;
  FECHA: Date | string;
  ALMACEN_DESTINO_ID: number;
  CENTRO_COSTO_ID?: number;
  CANCELADO: string;
  APLICADO: string;
  DESCRIPCION?: string;
  CUENTA_CONCEPTO?: string;
  FORMA_EMITIDA: string;
  CONTABILIZADO: string;
  SISTEMA_ORIGEN: string;
  USUARIO_CREADOR: string;
  FECHA_HORA_CREACION: Date | string;
  USUARIO_AUT_CREACION?: string;
  USUARIO_ULT_MODIF: string;
  FECHA_HORA_ULT_MODIF: Date | string;
  USUARIO_AUT_MODIF?: string;
  USUARIO_CANCELACION?: string;
  FECHA_HORA_CANCELACION?: Date | string;
  USUARIO_AUT_CANCELACION?: string;
}

export interface IDoctoInDet {
  DOCTO_IN_DET_ID: number;
  DOCTO_IN_ID: number;
  ALMACEN_ID: number;
  CONCEPTO_IN_ID: number;
  CLAVE_ARTICULO: string;
  ARTICULO_ID: number;
  TIPO_MOVTO: "S" | "E"; // S = Salida, E = Entrada
  UNIDADES: number;
  COSTO_UNITARIO: number;
  COSTO_TOTAL: number;
  METODO_COSTEO: string;
  CANCELADO: string;
  APLICADO: string;
  COSTEO_PEND: string;
  PEDIMENTO_PEND: string;
  ROL: "S" | "E";
  FECHA: Date | string;
  CENTRO_COSTO_ID?: number;
}

// Tipos de errores para traspasos
export enum TipoErrorTraspaso {
  VALIDACION_STOCK = 'VALIDACION_STOCK',
  ERROR_TECNICO = 'ERROR_TECNICO',
  ERROR_PARAMETROS = 'ERROR_PARAMETROS'
}

export interface IErrorTraspaso {
  tipo: TipoErrorTraspaso;
  mensaje: string;
  detalles?: string[];
  codigo?: string;
}

// Clase de error personalizada para traspasos
export class ErrorTraspaso extends Error {
  public tipo: TipoErrorTraspaso;
  public detalles?: string[];
  public codigo?: string;

  constructor(tipo: TipoErrorTraspaso, mensaje: string, detalles?: string[], codigo?: string) {
    super(mensaje);
    this.name = 'ErrorTraspaso';
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

// Configuración por defecto para traspasos
export const TRASPASO_CONFIG = {
  CONCEPTO_SALIDA_ID: 36, // Concepto para salidas por traspaso
  CONCEPTO_ENTRADA_ID: 25, // Concepto para entradas por traspaso
  SUCURSAL_ID: 225490, // ID de sucursal por defecto
  NATURALEZA_CONCEPTO: "S",
  CANCELADO: "N",
  APLICADO: "S",
  FORMA_EMITIDA: "N",
  CONTABILIZADO: "N",
  SISTEMA_ORIGEN: "IN",
  METODO_COSTEO: "C",
  COSTEO_PEND: "N",
  PEDIMENTO_PEND: "N",
  USUARIO_DEFAULT: "SYSDBA",
};
