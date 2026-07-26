/**
 * db.js — Persistencia local IndexedDB y Exportación para Cierre de Turno
 */
(function(window){
  const DB_NAME = 'CierreTurnoDB';
  const DB_VERSION = 1;
  let dbPromise = null;

  function initDB() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('cierres')) {
            const store = db.createObjectStore('cierres', { keyPath: 'id' });
            store.createIndex('fecha', 'fecha', { unique: false });
            store.createIndex('dni', 'dni', { unique: false });
            store.createIndex('timestamp_registro', 'timestamp_registro', { unique: false });
          }
          if (!db.objectStoreNames.contains('drafts')) {
            db.createObjectStore('drafts', { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }

  // --- Guardar Cierre Completado ---
  async function saveCierre(record) {
    const db = await initDB();
    if (!record.id) record.id = 'cierre-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    if (!record.timestamp_registro) record.timestamp_registro = Date.now();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['cierres'], 'readwrite');
      const store = tx.objectStore('cierres');
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  }

  // --- Listar todos los cierres guardados ---
  async function getAllCierres() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['cierres'], 'readonly');
      const store = tx.objectStore('cierres');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // --- Borrador (Draft) ---
  async function saveDraft(formData) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['drafts'], 'readwrite');
      const store = tx.objectStore('drafts');
      const req = store.put({ id: 'current_draft', data: formData, timestamp: Date.now() });
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async function getDraft() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['drafts'], 'readonly');
      const store = tx.objectStore('drafts');
      const req = store.get('current_draft');
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => resolve(null);
    });
  }

  async function clearDraft() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['drafts'], 'readwrite');
      const store = tx.objectStore('drafts');
      const req = store.delete('current_draft');
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  }

  // --- Exportar CSV ---
  async function exportToCSV() {
    const cierres = await getAllCierres();
    if (!cierres.length) {
      alert('No hay cierres guardados para exportar.');
      return;
    }

    const headers = [
      'ID', 'Fecha', 'Sede', 'Area', 'Turno', 'DNI', 'Operador',
      'Total_M3', 'Precio', 'Total_Soles', 'Financiacion', 'Gasolutions', 'N_Despachos',
      'Tarjetas_Izipay', 'QR_Izipay', 'Efectivo_Contado', 'Monto_Contado',
      'Dif_Total', 'Dif_Tarjetas', 'Dif_QR', 'Dif_Efectivo', 'Estado', 'Observaciones', 'Timestamp'
    ];

    const rows = cierres.map(c => [
      c.id, c.fecha, c.sede, c.area, c.turno, c.dni, `"${(c.operador_nombre||'').replace(/"/g, '""')}"`,
      c.total_m3 || 0, c.precio_unitario || 2.50, c.total_soles || 0, c.financiacion || 0, c.gasolutions || 0, c.n_despachos || 0,
      c.izipay_tarjetas || 0, c.izipay_qr || 0, c.efectivo_total || 0, c.monto_contado || 0,
      c.dif_total || 0, c.dif_tarjetas || 0, c.dif_qr || 0, c.dif_efectivo || 0, c.estado_cierre || 'OK',
      `"${(c.observaciones||'').replace(/"/g, '""')}"`, new Date(c.timestamp_registro).toISOString()
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cierres_turno_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { URL.revokeObjectURL(url); link.remove(); }, 1000);
  }

  // --- Exportar JSON para anexo directo a Parquet ---
  async function exportToJSONForParquet() {
    const cierres = await getAllCierres();
    if (!cierres.length) {
      alert('No hay cierres guardados para exportar.');
      return;
    }
    const cleanData = cierres.map(c => {
      const copy = { ...c };
      delete copy.foto_gnv_blob;
      delete copy.foto_izipay_blob;
      delete copy.foto_constancia_unida_blob;
      return copy;
    });

    const jsonStr = JSON.stringify(cleanData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cierres_parquet_import_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { URL.revokeObjectURL(url); link.remove(); }, 1000);
  }

  window.CTDB = {
    saveCierre,
    getAllCierres,
    saveDraft,
    getDraft,
    clearDraft,
    exportToCSV,
    exportToJSONForParquet
  };
})(window);
