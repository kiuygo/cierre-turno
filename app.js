(function(){
  // ---------- utils ----------
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const norm=t=>(t||"").toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const parseNum=v=>parseFloat(String(v??"").replace(/[^\d.\-]/g,""));

  // ---------- tema dinámico por área ----------
  function setArea(area){
    document.body.classList.remove('area-gnv','area-liquidos');
    document.body.classList.add(area==='gnv'?'area-gnv':'area-liquidos');
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const gnv=$('#area-gnv'), liq=$('#area-liq');
    setArea(gnv&&gnv.checked?'gnv':'liquidos');
    gnv&&gnv.addEventListener('change',()=>setArea('gnv'));
    liq&&liq.addEventListener('change',()=>setArea('liquidos'));
  });

  // ---------- hover/touch radial (excluye header) ----------
  const hoverSel=[
    '[role="tablist"] [role="tab"]',
    '.tabs .btn',
    '.seg .btn',  // -- ADDED LINE ----
    '.segmented .btn', // -- ADDED LINE ----
    '.segmented label',
    '.checkbox label',
    '.icon-row .icon-btn'
  ].join(', ');
  
  function handleMove(el,x){
    const r=el.getBoundingClientRect();
    el.style.setProperty('--mx',(x-r.left)+'px');
  }

  // Detectar si es dispositivo táctil
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  
  if(!isTouchDevice) {
    // En desktop: hover normal
    document.addEventListener('mousemove',(e)=>{
      if(e.target.closest('header.app-bar')) return; // título inmóvil
      const el=e.target.closest(hoverSel);
      if(el) handleMove(el,e.clientX);
    },{passive:true});
  }
  
  // Nota: evitamos bloquear touchend para no interferir con la edición en móviles.

  // ---------- auto-tag KPI diff + estado ok/bad ----------
  function tagDiff(){
    $$('.valuefield,.tile,.kpi,.textfield,.card').forEach(el=>{
      if(el.hasAttribute('data-kpi')) return;
      const txt = norm(el.textContent||'');
      if(/dif\.?\s*total\s*vs\s*sistema|diferencia/.test(txt)) el.setAttribute('data-kpi','diff');
    });
  }
  function updateDiff(){
    $$('[data-kpi="diff"]').forEach(el=>{
      const io=el.querySelector('input,output,[data-value]');
      if(!io) return;
      const raw=('value' in io?io.value:io.textContent) || io.getAttribute?.('data-value');
      const val=parseNum(raw);
      el.classList.toggle('ok', isFinite(val)&&val===0);
      el.classList.toggle('bad',isFinite(val)&&val!==0);
    });
  }
  document.addEventListener('input',updateDiff,{passive:true});
  document.addEventListener('DOMContentLoaded',()=>{ tagDiff(); updateDiff(); });

  // ---------- marcar campos editables clave ----------
  function markFieldByLabel(needles,cls,root=document){
    if(!Array.isArray(needles)) needles=[needles];
    $$('.textfield',root).forEach(tf=>{
      const lb=tf.querySelector('label'); if(!lb) return;
      const txt=norm(lb.textContent||'');
      if(needles.some(k=>txt.includes(k))) tf.classList.add(cls);
    });
  }
  const isEmpty=v=>(v??'').toString().trim()==='';
  function shadeTargets(){
    // N° desp., Sede, DNI, Financiación (este surtidor)
    $$('.textfield').forEach(tf=>{
      const lb=tf.querySelector('label'), ctl=tf.querySelector('input,select,textarea');
      if(!lb||!ctl) return;
      const t=norm(lb.textContent||'');
      const isTarget= /n.?\s*desp/.test(t) || /\bsede\b/.test(t) || /\bdni\b/.test(t) || /financiaci.+este surtidor/.test(t);
      const editable=!ctl.readOnly && !ctl.disabled;
      if(isTarget){
        if(editable){
          tf.classList.add('as-editable');
          const empty = isEmpty(ctl.value);
          tf.classList.toggle('is-empty', empty);
          // add a per-control 'filled' marker so CSS can remove tint when user populated the field
          try{ ctl.classList.toggle('filled', !empty); }catch(e){}
        }
        else tf.classList.remove('as-editable','is-empty');
      }
    });
    // S/ dentro de secciones de Izipay/Efectivo
    $$('section,.card,fieldset').forEach(card=>{
      const title=norm(card.textContent.slice(0,200));
      if(title.includes('izipay')||title.includes('efectivo')){
        $$('.textfield',card).forEach(tf=>{
          const lb=tf.querySelector('label');
          if(lb && /^s\/\s*/i.test(lb.textContent.trim())) tf.classList.add('as-editable');
        });
      }
    });
    // Denominaciones
    $$('#den-body .den-row input').forEach(inp=>{
      const empty = isEmpty(inp.value);
      inp.classList.toggle('is-empty', empty);
      inp.classList.toggle('filled', !empty);
    });

    // Generic: marcar como 'filled' cualquier control editable que tenga valor
    // (incluye inputs con clase "auto" que son editables por el usuario)
    $$('input,textarea,select').forEach(c=>{
      try{
        if(c.readOnly || c.disabled) return;
        const has = !(isEmpty(c.value));
        c.classList.toggle('filled', has);
      }catch(e){}
    });
  }
  document.addEventListener('DOMContentLoaded',()=>{
    markFieldByLabel('(auto','auto-soft');
    markFieldByLabel(['n° desp','nº desp','no desp','num desp','numero desp','financiacion s/ (este surtidor)','financiación s/ (este surtidor)'],'as-editable');
    // En "Estado del cierre": mantenemos solo el dif total visible como KPI
    $$('section,.card,fieldset').forEach(card=>{
      const txt=norm(card.textContent||'');
      if(txt.includes('estado del cierre')){
        $$('.textfield,.valuefield,.kpi',card).forEach(el=>el.classList.add('kpi-ghost'));
        $$('.textfield,.valuefield,.kpi',card).forEach(el=>{
          const lb=el.querySelector('label');
          const t=norm((lb&&lb.textContent)||el.textContent||'');
          if(t.includes('dif. total vs sistema')){ el.classList.remove('kpi-ghost'); el.setAttribute('data-kpi','diff'); }
        });
      }
    });
    shadeTargets();
  });
  document.addEventListener('input',shadeTargets,{passive:true});
  document.addEventListener('change',shadeTargets,{passive:true});

  // ---------- normalizadores de entrada ----------
  function onlyDigits(el,maxLen){
    const v=(el.value||'').replace(/\D+/g,'');
    el.value=typeof maxLen==='number'?v.slice(0,maxLen):v;
  }
  function onlyDecimal(el,maxDec){
    let v=(el.value||'').replace(/[^\d.,-]/g,'').replace(/,/g,'.');
    const neg=v.startsWith('-');
    const parts=v.replace(/^-/,'').split('.');
    if(parts.length>2) v=(neg?'-':'')+parts.shift()+'.'+parts.join('');
    if(typeof maxDec==='number'){
      const p=v.split('.');
      if(p[1] && p[1].length>maxDec) v=p[0]+'.'+p[1].slice(0,maxDec);
    }
    el.value=v;
  }
  document.addEventListener('input',(e)=>{
    const t=e.target;
    if(!(t instanceof HTMLInputElement)) return;
    if(t.id==='dni'){ onlyDigits(t,8); return; }
    if(t.classList.contains('desp')){ onlyDigits(t,3); return; }
    if(t.id==='tarjeta'||t.id==='qr'){ onlyDecimal(t,2); return; }
    if(t.closest('#den-body .den-row')){ onlyDigits(t); return; }
    if(t.getAttribute('inputmode')==='decimal'){ onlyDecimal(t,2); return; }
  },{passive:true});

})();

/* === Optimizations (responsive helpers) =============================
   - Debounced resize to recalc any width/height dependent logic.
   - MatchMedia hooks to prefer touch interactions.
   - Focus manage for inputs to ensure visibility on mobile keyboards.
   ------------------------------------------------------------------- */
(function(){
  const mqFine = window.matchMedia('(pointer:fine)');
  const mqCoarse = window.matchMedia('(pointer:coarse)');
  const mqDesktop = window.matchMedia('(min-width:1024px)');
  let resizeTO;

  function debounceResize(){
    clearTimeout(resizeTO);
    resizeTO = setTimeout(()=>{
      const ev = new Event('app:resized');
      window.dispatchEvent(ev);
    }, 120);
  }
  window.addEventListener('resize', debounceResize, {passive:true});

  // Mark body for CSS hooks
  function applyBodyFlags(){
    document.body.classList.toggle('is-desktop', mqDesktop.matches);
    document.body.classList.toggle('is-touch', mqCoarse.matches && !mqFine.matches);
  }
  [mqFine, mqCoarse, mqDesktop].forEach(mq => mq.addEventListener?.('change', applyBodyFlags));
  applyBodyFlags();

  // Ensure input visibility when keyboard opens
  function ensureVisible(e){
    const el = e.target;
    if(!(el instanceof HTMLElement)) return;
    try { el.scrollIntoView({block:'center', behavior:'smooth'}); } catch {}
  }
  document.addEventListener('focusin', ensureVisible, {passive:true});

  // Polyfill :focus-visible for older browsers (very light)
  try{
    if(!CSS.supports('selector(:focus-visible)')){
      document.addEventListener('keydown', ()=>document.body.classList.add('using-kbd'), {passive:true});
      document.addEventListener('mousedown', ()=>document.body.classList.remove('using-kbd'), {passive:true});
    }
  }catch{}
})();
