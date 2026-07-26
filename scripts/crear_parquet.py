"""
Crear archivo Parquet como base de datos para Cierres de Turno.
Cada fila = un cierre completado por un despachador.
El archivo se va llenando conforme se registran cierres.
"""

import pyarrow as pa
import pyarrow.parquet as pq
import os

# ========================================
# ESQUEMA DEL PARQUET — Cierre de Turno
# ========================================

schema = pa.schema([
    # --- Identificador único del registro ---
    ("id",                      pa.string()),       # UUID del cierre
    ("timestamp_registro",      pa.timestamp("ms")),# Momento exacto en que se guardó

    # --- Datos del turno ---
    ("fecha",                   pa.date32()),       # Fecha del turno (YYYY-MM-DD)
    ("sede",                    pa.string()),       # "San Jeronimo" | "San Sebastian"
    ("area",                    pa.string()),       # "GNV" | "Líquidos"
    ("turno",                   pa.string()),       # "Mañana" | "Tarde" | "Noche"
    ("surtidor_1",              pa.bool_()),        # True si trabajó surtidor 1
    ("surtidor_2",              pa.bool_()),        # True si trabajó surtidor 2

    # --- Datos del despachador ---
    ("dni",                     pa.string()),       # DNI 8 dígitos
    ("operador_nombre",         pa.string()),       # Nombre del operador

    # --- Totales del sistema (boleta del surtidor) ---
    ("dif_m3",                  pa.float64()),      # DIF M3 total (o Galones si Líquidos)
    ("precio_unitario",         pa.float64()),      # Precio S/ por M3 o Galón (ej: 2.50)
    ("total_soles",             pa.float64()),      # dif_m3 × precio
    ("financiacion",            pa.float64()),      # Financiación S/ total
    ("gasolutions",             pa.float64()),      # Total del sistema (total_soles + financiacion)
    ("n_despachos",             pa.int32()),        # Número total de despachos

    # --- Detalle de ventas Surtidor 1 ---
    ("s1_debito_m3",            pa.float64()),
    ("s1_debito_soles",         pa.float64()),
    ("s1_debito_despachos",     pa.int32()),
    ("s1_credito_m3",           pa.float64()),
    ("s1_credito_soles",        pa.float64()),
    ("s1_credito_despachos",    pa.int32()),
    ("s1_efectivo_m3",          pa.float64()),
    ("s1_efectivo_soles",       pa.float64()),
    ("s1_efectivo_despachos",   pa.int32()),
    ("s1_financiacion",         pa.float64()),

    # --- Detalle de ventas Surtidor 2 ---
    ("s2_debito_m3",            pa.float64()),
    ("s2_debito_soles",         pa.float64()),
    ("s2_debito_despachos",     pa.int32()),
    ("s2_credito_m3",           pa.float64()),
    ("s2_credito_soles",        pa.float64()),
    ("s2_credito_despachos",    pa.int32()),
    ("s2_efectivo_m3",          pa.float64()),
    ("s2_efectivo_soles",       pa.float64()),
    ("s2_efectivo_despachos",   pa.int32()),
    ("s2_financiacion",         pa.float64()),

    # --- Izipay (cobros electrónicos reales del turno) ---
    ("izipay_tarjetas",         pa.float64()),      # Total tarjetas (de boleta Izipay)
    ("izipay_qr",               pa.float64()),      # Total QR (de boleta Izipay)

    # --- Efectivo contado (denominaciones) ---
    ("den_200",                 pa.int32()),        # Cantidad de billetes de 200
    ("den_100",                 pa.int32()),
    ("den_50",                  pa.int32()),
    ("den_20",                  pa.int32()),
    ("den_10",                  pa.int32()),
    ("den_5",                   pa.int32()),        # Cantidad de monedas de 5
    ("den_2",                   pa.int32()),
    ("den_1",                   pa.int32()),
    ("den_050",                 pa.int32()),        # 0.50
    ("den_020",                 pa.int32()),        # 0.20
    ("den_010",                 pa.int32()),        # 0.10
    ("efectivo_total",          pa.float64()),      # Suma total del efectivo contado

    # --- Estado del cierre (calculados) ---
    ("monto_contado",           pa.float64()),      # efectivo + tarjetas + qr
    ("dif_total",               pa.float64()),      # contado - gasolutions
    ("dif_tarjetas",            pa.float64()),      # crédito_soles - izipay_tarjetas
    ("dif_qr",                  pa.float64()),      # débito_soles - izipay_qr
    ("dif_efectivo",            pa.float64()),      # (efectivo_soles + finan + otros) - efectivo_total
    ("estado_cierre",           pa.string()),       # "OK" | "Faltante" | "Sobrante"

    # --- Otros ---
    ("otros",                   pa.float64()),      # Monto "Otros"
    ("observaciones",           pa.string()),       # Texto libre de observaciones

    # --- Fotos (rutas o nombres de archivo) ---
    ("foto_gnv",                pa.string()),       # Nombre/ruta de la foto GNV
    ("foto_izipay",             pa.string()),       # Nombre/ruta de la foto Izipay
    ("foto_constancia_unida",   pa.string()),       # Nombre/ruta de la constancia combinada

    # --- Metadata de envío ---
    ("enviado",                 pa.bool_()),        # True si se envió
    ("canal_envio",             pa.string()),       # "telegram" | "whatsapp" | null
    ("impreso",                 pa.bool_()),        # True si se imprimió
])

# ========================================
# CREAR ARCHIVO PARQUET VACÍO CON ESQUEMA
# ========================================

output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, "cierres_turno.parquet")

# Crear tabla vacía con el esquema definido
empty_table = pa.table(
    {field.name: pa.array([], type=field.type) for field in schema},
    schema=schema
)

pq.write_table(empty_table, output_path)

print(f"✅ Parquet creado: {output_path}")
print(f"   Columnas: {len(schema)}")
print(f"   Filas: 0 (listo para recibir registros)")
print()
print("Esquema completo:")
print("─" * 50)
for field in schema:
    print(f"  {field.name:<30} {field.type}")
