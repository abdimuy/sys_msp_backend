import { IQueryConverter } from "../../../repositories/fbRepository";

export const doctosCcConverters:IQueryConverter[] = [
  {
    column: 'FOLIO',
    type: 'buffer'
  },
  {
    column: 'NATURALEZA_CONCEPTO',
    type: 'buffer'
  },
  {
    column: 'CANCELADO',
    type: 'buffer'
  },
  {
    column: 'APLICADO',
    type: 'buffer'
  },
  {
    column: 'FORMA_EMITIDA',
    type: 'buffer',
  },
  {
    column: 'CONTABILIZADO',
    type: 'buffer'
  },
  {
    column: 'CONTABILIZADO_GYP',
    type: 'buffer'
  },
  {
    column: 'SISTEMA_ORIGEN',
    type: 'buffer'
  },
  {
    column: 'ESTATUS',
    type: 'buffer'
  },
  {
    column: 'DESCRIPCION',
    type: 'buffer'
  },
  {
    column: 'ESTATUS_ANT',
    type: 'buffer'
  },
  {
    column: 'ES_CFD',
    type: 'buffer'
  },
  {
    column: 'TIENE_ANTICIPO',
    type: 'buffer',
  }, 
  {
    column: 'MODALIDAD_FACTURACION',
    type: 'buffer'
  },
  {
    column: 'ENVIADO',
    type: 'buffer'
  },
  {
    column: 'CFDI_CERTIFICADO',
    type: 'buffer'
  },
  {
    column: 'INTEG_BA',
    type: 'buffer'
  },
  {
    column: 'CONTABILIZADO_BA',
    type: 'buffer'
  },
  {
    column: 'USUARIO_CREADOR',
    type: 'buffer'
  },
  {
    column: 'USUARIO_ULT_MODIF',
    type: 'buffer'
  },
  {
    column: "LAT",
    type: "buffer",
  },
  {
    column: 'LON',
    type: 'buffer'
  }
];

export const importesDoctosCcConverters: IQueryConverter[] = [
  {
    column: "CANCELADO",
    type: 'buffer',
  },
  {
    column: 'APLICADO',
    type: 'buffer'
  },
  {
    column: 'ESTATUS',
    type: 'buffer',
  },
  {
    column: 'TIPO_IMPTE',
    type: 'buffer'
  }
];

export const clientesConverters: IQueryConverter[] = [
  {
    column: 'CONTACTO1',
    type: 'buffer',
  },
  {
    column: 'CONTACTO2',
    type: 'buffer'
  },
  {
    column: 'ESTATUS',
    type: 'buffer',
  },
  {
    column: 'CAUSA_SUSP',
    type: 'buffer',
  },
  {
    column: 'COBRAR_IMPUESTOS',
    type: 'buffer'
  },
  {
    column: 'RETIENE_IMPUESTOS',
    type: 'buffer'
  },
  {
    column: 'SUJETO_IEPS',
    type: 'buffer'
  },
  {
    column: 'GENERAR_INTERESES',
    type: 'buffer',
  },
  {
    column: 'EMITIR_EDOCTA',
    type: 'buffer'
  },
  {
    column: 'USUARIO_CREADOR',
    type: 'buffer'
  },
  {
    column: 'USUARIO_ULT_MODIF',
    type: 'buffer'
  },
  {
    column: 'CUENTA_CXC',
    type: 'buffer'
  }
];

export const zonaClientesConverters: IQueryConverter[] = [
  {
    column: 'NOMBRE',
    type: 'buffer'
  },
  {
    column: 'ES_PREDET',
    type: 'buffer',
  },
  {
    column: 'OCULTO',
    type: 'buffer'
  },
  {
    column: 'USUARIO_CREADOR',
    type: 'buffer'
  },
  {
    column: 'USUARIO_ULT_MODIF',
    type: 'buffer',
  }
]

export const cobradoresConverters: IQueryConverter[] = [
  {
    column: 'ES_PREDET',
    type: 'buffer',
  },
  {
    column: 'OCULTO',
    type: 'buffer',
  },
  {
    column: 'USUARIO_CREADOR',
    type: 'buffer',
  },
  {
    column: 'USUARIO_ULT_MODIF',
    type: 'buffer'
  }
];

export const formasCobroDoctos: IQueryConverter[] = [
  {
    column: 'NOM_TABLA_DOCTOS',
    type: 'buffer',
  },
  {
    column: 'NUM_CTA_PAGO',
    type: 'buffer'
  },
  {
    column: 'CLAVE_SIS_FORMA_COB',
    type: 'buffer'
  },
  {
    column: 'REFERENCIA',
    type: 'buffer'
  }
];

export const mspPagosRecibidos: IQueryConverter[] = [
  {
    column: 'ID',
    type: 'buffer'
  }
]