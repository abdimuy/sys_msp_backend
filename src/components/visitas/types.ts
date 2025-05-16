export interface Visita {
    ID: string;
    CLIENTE_ID: number;
    COBRADOR: string;
    COBRADOR_ID: number;
    FECHA: Date;
    FORMA_COBRO_ID: number;
    LAT: number;
    LNG: number;
    NOTA?: string;
    TIPO_VISITA: string;
    ZONA_CLIENTE_ID: number;
    IMPTE_DOCTO_CC_ID?: number;
}

export interface PagoOrVisita {
    ID: string;
    COBRADOR: string;
    COBRADOR_ID: number;
    FECHA: string;
    FORMA_COBRO_ID: number;
    IMPORTE: number;
    LAT: string;
    LNG: string;
    NOTA: string;
    TIPO_VISITA: string;
    CLIENTE: string;
    ZONA_CLIENTE_ID: number;
    CLIENTE_ID: number;
    TIPO: string;
}

