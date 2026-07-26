(function(){
  // ---------- Utils ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const norm = t => (t || "").toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const parseNum = v => parseFloat(String(v ?? "").replace(/[^\d.\-]/g, ""));

  // ---------- Configuración por defecto ----------
  const DEFAULT_SETTINGS = {
    precio: 2.50,
    waPhone: '51937260860',
    waSupport: '51965737361',
    telegramToken: '8707994105:AAF0j9-ZSgtBAoWAljtqrGQlsTbh4cum4gA',
    telegramChatId: '-5341081719',
    operadores: {
      "12345678": "Operador A",
      "87654321": "Operador B"
    }
  };

  function getSettings() {
    try {
      const stored = localStorage.getItem('ct_settings');
      if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch (e) {}
    return { ...DEFAULT_SETTINGS };
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem('ct_settings', JSON.stringify(settings));
    } catch (e) {}
  }

  // ---------- Tema dinámico por área ----------
  function setArea(area){
    document.body.classList.remove('area-gnv', 'area-liquidos');
    document.body.classList.add(area === 'gnv' ? 'area-gnv' : 'area-liquidos');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const gnv = $('#area-gnv'), liq = $('#area-liq');
    setArea(gnv && gnv.checked ? 'gnv' : 'liquidos');
    gnv && gnv.addEventListener('change', () => setArea('gnv'));
    liq && liq.addEventListener('change', () => setArea('liquidos'));

    // Cargar precio desde settings si existe
    const settings = getSettings();
    const precioEl = $('#precio');
    if (precioEl && (!precioEl.value || precioEl.value === '2.40')) {
      precioEl.value = Number(settings.precio).toFixed(2);
    }
  });

  // ---------- Hover/touch radial ----------
  const hoverSel = [
    '[role="tablist"] [role="tab"]',
    '.tabs .btn',
    '.seg .btn',
    '.segmented .btn',
    '.segmented label',
    '.checkbox label',
    '.icon-row .icon-btn'
  ].join(', ');

  function handleMove(el, x){
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (x - r.left) + 'px');
  }

  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (!isTouchDevice) {
    document.addEventListener('mousemove', (e) => {
      if (e.target.closest('header.app-bar')) return;
      const el = e.target.closest(hoverSel);
      if (el) handleMove(el, e.clientX);
    }, { passive: true });
  }

  // ---------- Auto-tag KPI diff + estado ok/bad ----------
  function tagDiff(){
    $$('.valuefield,.tile,.kpi,.textfield,.card').forEach(el => {
      if (el.hasAttribute('data-kpi')) return;
      const txt = norm(el.textContent || '');
      if (/dif\.?\s*total\s*vs\s*sistema|diferencia/.test(txt)) el.setAttribute('data-kpi', 'diff');
    });
  }

  function updateDiff(){
    $$('[data-kpi="diff"]').forEach(el => {
      const io = el.querySelector('input,output,[data-value]');
      if (!io) return;
      const raw = ('value' in io ? io.value : io.textContent) || io.getAttribute?.('data-value');
      const val = parseNum(raw);
      el.classList.toggle('ok', isFinite(val) && val === 0);
      el.classList.toggle('bad', isFinite(val) && val !== 0);
    });
  }
  document.addEventListener('input', updateDiff, { passive: true });
  document.addEventListener('DOMContentLoaded', () => { tagDiff(); updateDiff(); });

  // ---------- Marcar campos editables ----------
  function isEmpty(v) { return (v ?? '').toString().trim() === ''; }
  function shadeTargets(){
    $$('.textfield').forEach(tf => {
      const lb = tf.querySelector('label'), ctl = tf.querySelector('input,select,textarea');
      if (!lb || !ctl) return;
      const t = norm(lb.textContent || '');
      const isTarget = /n.?\s*desp/.test(t) || /\bsede\b/.test(t) || /\bdni\b/.test(t) || /financiaci.+este surtidor/.test(t);
      const editable = !ctl.readOnly && !ctl.disabled;
      if (isTarget){
        if (editable){
          tf.classList.add('as-editable');
          const empty = isEmpty(ctl.value);
          tf.classList.toggle('is-empty', empty);
          try { ctl.classList.toggle('filled', !empty); } catch(e){}
        } else tf.classList.remove('as-editable', 'is-empty');
      }
    });

    $$('input,textarea,select').forEach(c => {
      try {
        if (c.readOnly || c.disabled) return;
        const has = !(isEmpty(c.value));
        c.classList.toggle('filled', has);
      } catch(e){}
    });
  }
  document.addEventListener('DOMContentLoaded', shadeTargets);
  document.addEventListener('input', shadeTargets, { passive: true });
  document.addEventListener('change', shadeTargets, { passive: true });

  // ---------- Normalizadores ----------
  function onlyDigits(el, maxLen){
    const v = (el.value || '').replace(/\D+/g, '');
    el.value = typeof maxLen === 'number' ? v.slice(0, maxLen) : v;
  }

  function onlyDecimal(el, maxDec){
    let v = (el.value || '').replace(/[^\d.,-]/g, '').replace(/,/g, '.');
    const neg = v.startsWith('-');
    const parts = v.replace(/^-/, '').split('.');
    if (parts.length > 2) v = (neg ? '-' : '') + parts.shift() + '.' + parts.join('');
    if (typeof maxDec === 'number'){
      const p = v.split('.');
      if (p[1] && p[1].length > maxDec) v = p[0] + '.' + p[1].slice(0, maxDec);
    }
    el.value = v;
  }

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (t.id === 'dni') { onlyDigits(t, 8); return; }
    if (t.classList.contains('desp')) { onlyDigits(t, 3); return; }
    if (t.id === 'tarjeta' || t.id === 'qr') { onlyDecimal(t, 2); return; }
    if (t.closest('#den-body .den-row')) { onlyDigits(t); return; }
    if (t.getAttribute('inputmode') === 'decimal') { onlyDecimal(t, 2); return; }
  }, { passive: true });

  // ---------- Envío por Telegram Bot API ----------
  async function doTelegramShare() {
    const settings = getSettings();
    if (!settings.telegramToken || !settings.telegramChatId) {
      alert('Configura primero el Token y Chat ID de Telegram en ⚙️ Configuración.');
      openModal('modal-settings');
      return;
    }

    if (typeof window.buildReport !== 'function') return;
    const text = window.buildReport();
    const toast = typeof window.showActionToast === 'function' ? window.showActionToast : alert;

    toast('Preparando envío a Telegram...');

    try {
      if (!(window.mergedConstanciaBlob instanceof Blob)) {
        if (typeof window.mergeConstanciaImagesVertical === 'function') {
          await window.mergeConstanciaImagesVertical();
        }
      }

      const form = new FormData();
      form.append('chat_id', settings.telegramChatId);
      form.append('caption', text);

      if (window.mergedConstanciaBlob instanceof Blob) {
        form.append('photo', window.mergedConstanciaBlob, window.mergedConstanciaName || 'constancia.jpg');
      }

      const endpoint = (window.mergedConstanciaBlob instanceof Blob)
        ? `https://api.telegram.org/bot${settings.telegramToken}/sendPhoto`
        : `https://api.telegram.org/bot${settings.telegramToken}/sendMessage`;

      if (!(window.mergedConstanciaBlob instanceof Blob)) {
        form.delete('caption');
        form.append('text', text);
      }

      const res = await fetch(endpoint, { method: 'POST', body: form });
      const resData = await res.json();

      if (res.ok && resData.ok) {
        toast('✅ Reporte y constancia enviados con éxito a Telegram.');
        if (window.CTDB && typeof window.saveCurrentCierreToDB === 'function') {
          window.saveCurrentCierreToDB('telegram');
        }
      } else {
        throw new Error(resData.description || 'Error al enviar');
      }
    } catch (err) {
      console.error('Telegram share error:', err);
      alert('❌ Error al enviar por Telegram: ' + (err.message || 'Verifica la conexión y configuración.'));
    }
  }

  // ---------- Impresión Térmica 80mm ----------
  function doPrint80mm() {
    if (typeof window.buildReport !== 'function') return;
    const reportText = window.buildReport();

    let receiptContainer = document.getElementById('thermal-receipt');
    if (!receiptContainer) {
      receiptContainer = document.createElement('div');
      receiptContainer.id = 'thermal-receipt';
      document.body.appendChild(receiptContainer);
    }

    const dateStr = $('#fecha')?.value || new Date().toISOString().slice(0,10);
    const sedeStr = $('#sede')?.value || 'San Jeronimo';
    const areaStr = ($('input[name="area"]:checked')?.value) || 'GNV';
    const turnoStr = ($('input[name="turno"]:checked')?.value) || 'Mañana';
    const surts = [$('#s1')?.checked ? '1' : '', $('#s2')?.checked ? '2' : ''].filter(Boolean).join(',') || 'N/A';
    const dniStr = $('#dni')?.value || '—';
    const settings = getSettings();
    const operadorStr = settings.operadores[dniStr] || 'Despachador';

    const totalM3 = $('#total-m3')?.value || '0.00';
    const precioUnit = $('#precio')?.value || '2.50';
    const totalSoles = $('#total-s')?.textContent || '0.00';
    const finanStr = $('#finan')?.value || '0.00';
    const gasolutionsStr = $('#suma-sis')?.textContent || '0.00';
    const nDesp = $('#ndesp')?.value || '0';

    const tarjetasStr = $('#tarjeta')?.value || '0.00';
    const qrStr = $('#qr')?.value || '0.00';
    const efecTotalStr = $('#efectivo-total')?.textContent || '0.00';

    const contadoStr = $('#st-contado')?.textContent || '0.00';
    const difTotalStr = $('#st-diftotal')?.textContent || '0.00';
    const difNum = parseNum(difTotalStr);
    const estadoStr = Math.abs(difNum) <= 0.01 ? '✅ CUADRA PERFECTO' : (difNum < 0 ? '❗ FALTANTE EN CAJA' : '⚠️ SOBRANTE EN CAJA');

    const obsStr = ($('#obs')?.value || '').trim();

    let html = `
      <div class="t-center t-title">BIOCOM / SURCO</div>
      <div class="t-center t-bold">REPORT DE CIERRE DE TURNO</div>
      <div class="t-divider"></div>
      <div class="t-row"><span>Fecha:</span><span>${dateStr}</span></div>
      <div class="t-row"><span>Sede:</span><span>${sedeStr}</span></div>
      <div class="t-row"><span>Área / Turno:</span><span>${areaStr} - ${turnoStr}</span></div>
      <div class="t-row"><span>Surtidor(es):</span><span>${surts}</span></div>
      <div class="t-row"><span>DNI:</span><span>${dniStr}</span></div>
      <div class="t-row"><span>Operador:</span><span>${operadorStr}</span></div>
      <div class="t-divider"></div>
      <div class="t-bold">TOTALES DEL SISTEMA</div>
      <div class="t-row"><span>DIF M3/Gal:</span><span>${totalM3}</span></div>
      <div class="t-row"><span>Precio Unit:</span><span>S/ ${precioUnit}</span></div>
      <div class="t-row"><span>Venta Soles:</span><span>S/ ${totalSoles}</span></div>
      <div class="t-row"><span>Financiación:</span><span>S/ ${finanStr}</span></div>
      <div class="t-row t-bold"><span>GASOLUTIONS:</span><span>S/ ${gasolutionsStr}</span></div>
      <div class="t-row"><span>N° Despachos:</span><span>${nDesp}</span></div>
      <div class="t-divider"></div>
      <div class="t-bold">MEDIOS DE PAGO (IZIPAY)</div>
      <div class="t-row"><span>Tarjetas (Visa):</span><span>S/ ${tarjetasStr}</span></div>
      <div class="t-row"><span>QR (Débito):</span><span>S/ ${qrStr}</span></div>
      <div class="t-divider"></div>
      <div class="t-bold">EFECTIVO CONTADO</div>
      <div class="t-row t-bold"><span>Total Efectivo:</span><span>S/ ${efecTotalStr}</span></div>
      <div class="t-divider"></div>
      <div class="t-bold">ESTADO DEL CIERRE</div>
      <div class="t-row"><span>Monto Contado:</span><span>S/ ${contadoStr}</span></div>
      <div class="t-row"><span>Declarado Sis:</span><span>S/ ${gasolutionsStr}</span></div>
      <div class="t-row t-bold"><span>DIFERENCIA:</span><span>S/ ${difTotalStr}</span></div>
      <div class="t-center t-bold" style="margin-top:4px;">${estadoStr}</div>
    `;

    if (obsStr) {
      html += `
        <div class="t-divider"></div>
        <div class="t-bold">OBSERVACIONES:</div>
        <div>${obsStr}</div>
      `;
    }

    html += `
      <div class="t-divider"></div>
      <div class="t-center" style="font-size:9px;">Impreso: ${new Date().toLocaleString()}</div>
      <div class="t-center t-bold" style="margin-top:4px;">*** CORTE AQUI ***</div>
    `;

    receiptContainer.innerHTML = html;
    window.print();
  }

  // ---------- Controladores de Modales ----------
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  }

  // ---------- Exponer API global ----------
  window.doTelegramShare = doTelegramShare;
  window.doPrint80mm = doPrint80mm;
  window.getSettings = getSettings;
  window.saveSettings = saveSettings;
  window.openModal = openModal;
  window.closeModal = closeModal;
})();
