"""
Script para agregar un nuevo registro de cierre de turno al archivo Parquet.
Recibe un objeto JSON con los datos del cierre y los anexa a data/cierres_turno.parquet.
"""

import sys
import json
import os
import datetime
import pyarrow as pa
import pyarrow.parquet as pq

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
PARQUET_FILE = os.path.join(DATA_DIR, "cierres_turno.parquet")

def parse_date(d_str):
    if not d_str:
        return datetime.date.today()
    try:
        return datetime.datetime.strptime(str(d_str).split("T")[0], "%Y-%m-%d").date()
    except Exception:
        return datetime.date.today()

def parse_ts(ts_val):
    if isinstance(ts_val, (int, float)):
        return datetime.datetime.fromtimestamp(ts_val / 1000.0)
    elif isinstance(ts_val, str) and ts_val:
        try:
            return datetime.datetime.fromisoformat(ts_val.replace("Z", "+00:00"))
        except Exception:
            pass
    return datetime.datetime.now()

def append_record(record_data):
    if not os.path.exists(PARQUET_FILE):
        # Generar archivo inicial si no existe
        from crear_parquet import schema
        empty_table = pa.table({field.name: pa.array([], type=field.type) for field in schema}, schema=schema)
        os.makedirs(DATA_DIR, exist_ok=True)
        pq.write_table(empty_table, PARQUET_FILE)

    # Cargar tabla existente para leer esquema
    existing_table = pq.read_table(PARQUET_FILE)
    schema = existing_table.schema

    # Preparar diccionario formateado con tipos de datos
    v_s1 = record_data.get("ventas_s1", {})
    v_s2 = record_data.get("ventas_s2", {})
    den = record_data.get("denominaciones", {})

    formatted_row = {
        "id": [str(record_data.get("id", ""))],
        "timestamp_registro": [parse_ts(record_data.get("timestamp_registro"))],
        "fecha": [parse_date(record_data.get("fecha"))],
        "sede": [str(record_data.get("sede", ""))],
        "area": [str(record_data.get("area", "GNV"))],
        "turno": [str(record_data.get("turno", ""))],
        "surtidor_1": [bool(record_data.get("surtidor_1", True))],
        "surtidor_2": [bool(record_data.get("surtidor_2", False))],
        "dni": [str(record_data.get("dni", ""))],
        "operador_nombre": [str(record_data.get("operador_nombre", ""))],
        "dif_m3": [float(record_data.get("dif_m3", 0.0))],
        "precio_unitario": [float(record_data.get("precio_unitario", 2.50))],
        "total_soles": [float(record_data.get("total_soles", 0.0))],
        "financiacion": [float(record_data.get("financiacion", 0.0))],
        "gasolutions": [float(record_data.get("gasolutions", 0.0))],
        "n_despachos": [int(record_data.get("n_despachos", 0))],
        
        "s1_debito_m3": [float(v_s1.get("deb_m3", 0.0))],
        "s1_debito_soles": [float(v_s1.get("deb_s", 0.0))],
        "s1_debito_despachos": [int(v_s1.get("deb_d", 0))],
        "s1_credito_m3": [float(v_s1.get("cre_m3", 0.0))],
        "s1_credito_soles": [float(v_s1.get("cre_s", 0.0))],
        "s1_credito_despachos": [int(v_s1.get("cre_d", 0))],
        "s1_efectivo_m3": [float(v_s1.get("efe_m3", 0.0))],
        "s1_efectivo_soles": [float(v_s1.get("efe_s", 0.0))],
        "s1_efectivo_despachos": [int(v_s1.get("efe_d", 0))],
        "s1_financiacion": [float(v_s1.get("finan", 0.0))],

        "s2_debito_m3": [float(v_s2.get("deb_m3", 0.0))],
        "s2_debito_soles": [float(v_s2.get("deb_s", 0.0))],
        "s2_debito_despachos": [int(v_s2.get("deb_d", 0))],
        "s2_credito_m3": [float(v_s2.get("cre_m3", 0.0))],
        "s2_credito_soles": [float(v_s2.get("cre_s", 0.0))],
        "s2_credito_despachos": [int(v_s2.get("cre_d", 0))],
        "s2_efectivo_m3": [float(v_s2.get("efe_m3", 0.0))],
        "s2_efectivo_soles": [float(v_s2.get("efe_s", 0.0))],
        "s2_efectivo_despachos": [int(v_s2.get("efe_d", 0))],
        "s2_financiacion": [float(v_s2.get("finan", 0.0))],

        "izipay_tarjetas": [float(record_data.get("izipay_tarjetas", 0.0))],
        "izipay_qr": [float(record_data.get("izipay_qr", 0.0))],

        "den_200": [int(den.get("200", 0))],
        "den_100": [int(den.get("100", 0))],
        "den_50": [int(den.get("50", 0))],
        "den_20": [int(den.get("20", 0))],
        "den_10": [int(den.get("10", 0))],
        "den_5": [int(den.get("5", 0))],
        "den_2": [int(den.get("2", 0))],
        "den_1": [int(den.get("1", 0))],
        "den_050": [int(den.get("0.5", den.get("0.50", 0)))],
        "den_020": [int(den.get("0.2", den.get("0.20", 0)))],
        "den_010": [int(den.get("0.1", den.get("0.10", 0)))],
        "efectivo_total": [float(record_data.get("efectivo_total", 0.0))],

        "monto_contado": [float(record_data.get("monto_contado", 0.0))],
        "dif_total": [float(record_data.get("dif_total", 0.0))],
        "dif_tarjetas": [float(record_data.get("dif_tarjetas", 0.0))],
        "dif_qr": [float(record_data.get("dif_qr", 0.0))],
        "dif_efectivo": [float(record_data.get("dif_efectivo", 0.0))],
        "estado_cierre": [str(record_data.get("estado_cierre", "OK"))],

        "otros": [float(record_data.get("otros", 0.0))],
        "observaciones": [str(record_data.get("observaciones", ""))],

        "foto_gnv": [str(record_data.get("foto_gnv", ""))],
        "foto_izipay": [str(record_data.get("foto_izipay", ""))],
        "foto_constancia_unida": [str(record_data.get("foto_constancia_unida", ""))],

        "enviado": [bool(record_data.get("enviado", False))],
        "canal_envio": [str(record_data.get("canal_envio", ""))],
        "impreso": [bool(record_data.get("impreso", False))]
    }

    new_table = pa.Table.from_pydict(formatted_row, schema=schema)
    combined = pa.concat_tables([existing_table, new_table])
    pq.write_table(combined, PARQUET_FILE)
    print(f"✅ Registro {formatted_row['id'][0]} anexado exitosamente. Total registros en Parquet: {combined.num_rows}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if os.path.exists(sys.argv[1]):
            with open(sys.argv[1], "r", encoding="utf-8") as f:
                data = json.load(f)
        else:
            data = json.loads(sys.argv[1])
        if isinstance(data, list):
            for rec in data:
                append_record(rec)
        else:
            append_record(data)
    else:
        print("Uso: python append_to_parquet.py '<json_string>' o python append_to_parquet.py archivo.json")
