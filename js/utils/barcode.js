/**
 * Barcode generation (JsBarcode) and camera scanning (Quagga)
 */
const Barcode = (() => {
  function generate(svgId, value) {
    if (typeof JsBarcode === 'undefined') { console.warn('JsBarcode not loaded'); return; }
    try {
      JsBarcode(`#${svgId}`, value, {
        format: 'CODE128', width: 2, height: 56,
        displayValue: true, fontSize: 11, margin: 10,
        background: '#ffffff', lineColor: '#000000',
      });
    } catch(e) { console.error('Barcode gen error', e); }
  }

  async function toDataURL(value) {
    return new Promise(resolve => {
      const c = document.createElement('canvas');
      c.style.display = 'none';
      document.body.appendChild(c);
      try {
        JsBarcode(c, value, { format:'CODE128', width:2, height:56, displayValue:true, fontSize:11, margin:10 });
        resolve(c.toDataURL('image/png'));
      } catch { resolve(null); }
      finally { document.body.removeChild(c); }
    });
  }

  async function printLabel(product) {
    const dataUrl = await toDataURL(product.barcode);
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Barcode - ${product.cableNo}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Inter,sans-serif;}
    .wrap{width:85mm;padding:6mm;border:1px solid #ccc;border-radius:4px;}
    .title{font-size:11pt;font-weight:700;margin-bottom:2mm;}
    .sub{font-size:8pt;color:#666;margin-bottom:3mm;}
    img{display:block;max-width:100%;margin:0 auto 3mm;}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:1.5mm;font-size:7.5pt;}
    label{color:#888;}span{font-weight:600;display:block;}
    @media print{body{margin:0;}}</style></head>
    <body><div class="wrap">
      <div class="title">⚡ CableTrack Pro</div>
      <div class="sub">${product.cableNo} — ${product.category}</div>
      ${dataUrl ? `<img src="${dataUrl}" />` : ''}
      <div class="grid">
        <div><label>Core</label><span>${product.core}</span></div>
        <div><label>SQMM</label><span>${product.sqmm}mm²</span></div>
        <div><label>Meter</label><span>${product.meter}m</span></div>
        <div><label>Status</label><span>${STATUS_LABELS[product.status]||product.status}</span></div>
        <div style="grid-column:1/-1"><label>Barcode</label><span style="font-family:monospace;font-size:7pt">${product.barcode}</span></div>
      </div>
    </div><script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`);
    w.document.close();
  }

  let _cameraActive = false;

  async function startCamera(containerId, onScan) {
    if (typeof Quagga === 'undefined') {
      Toast.show('error', 'Scanner Unavailable', 'Camera library not loaded. Use manual input.'); return false;
    }
    const el = document.getElementById(containerId);
    if (!el) return false;
    try {
      Quagga.init({
        inputStream: { name:'Live', type:'LiveStream', target: el,
          constraints: { width:{min:320,ideal:640}, height:{min:240,ideal:480}, facingMode:'environment' }},
        locator: { patchSize:'medium', halfSample:true },
        numOfWorkers: Math.min(navigator.hardwareConcurrency||2, 4),
        frequency: 10,
        decoder: { readers:['code_128_reader','ean_reader'] },
        locate: true,
      }, err => {
        if (err) { Toast.show('error','Camera Error','Could not access camera.'); return; }
        Quagga.start(); _cameraActive = true;
      });
      let debounce = false;
      Quagga.onDetected(result => {
        if (debounce) return;
        const code = result.codeResult.code;
        if (code && onScan) { debounce = true; onScan(code); setTimeout(()=>{ debounce=false; }, 2000); }
      });
      return true;
    } catch(e) { Toast.show('error','Camera Error', e.message); return false; }
  }

  function stopCamera() {
    if (typeof Quagga !== 'undefined') { try { Quagga.stop(); } catch {} }
    _cameraActive = false;
  }

  function isCameraActive() { return _cameraActive; }

  return { generate, toDataURL, printLabel, startCamera, stopCamera, isCameraActive };
})();
