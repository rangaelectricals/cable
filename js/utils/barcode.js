/**
 * Barcode generation (JsBarcode) and camera scanning (Quagga)
 */
const Barcode = (() => {
  async function generate(imgId, value) {
    const img = document.getElementById(imgId);
    if (!img) return;

    // Local library check (QRious)
    if (window.QRious) {
      try {
        const qr = new QRious({
          value: value,
          size: 400,
          level: 'H'
        });
        img.src = qr.toDataURL();
        return;
      } catch(e) { console.error('QRious failed', e); }
    }

    // Fallback to Remote API (QRServer) - Extremely reliable
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(value)}`;
  }

  async function toDataURL(value) {
    if (window.QRious) {
      try {
        const qr = new QRious({ value: value, size: 400, level: 'H' });
        return qr.toDataURL();
      } catch { }
    }
    // Fallback URL for printing
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(value)}`;
  }

  async function printLabel(product) {
    const dataUrl = await toDataURL(product.barcode);
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>QR Code - ${product.cableNo}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Inter,sans-serif;}
    .wrap{width:80mm;padding:6mm;border:1px solid #eee;border-radius:8px;text-align:center;}
    .title{font-size:12pt;font-weight:800;color:#1d4ed8;margin-bottom:1mm;}
    .sub{font-size:9pt;color:#666;margin-bottom:4mm;}
    img{display:block;width:45mm;height:45mm;margin:0 auto 4mm;}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:2mm;font-size:8pt;text-align:left;}
    label{color:#888;display:block;font-size:7pt;text-transform:uppercase;font-weight:700;}
    span{font-weight:700;color:#111;}
    @media print{body{margin:0;}.wrap{border:none;}}</style></head>
    <body><div class="wrap">
      <div class="title">RE CABLETRACK</div>
      <div class="sub">${product.cableNo} — ${product.category}</div>
      ${dataUrl ? `<img src="${dataUrl}" />` : ''}
      <div class="grid">
        <div><label>Core/SQMM</label><span>${product.core} / ${product.sqmm}mm²</span></div>
        <div><label>Meter</label><span>${product.meter}m</span></div>
        <div style="grid-column:1/-1;margin-top:2mm;padding-top:2mm;border-top:1px solid #eee;">
          <label>ID / Barcode</label><span style="font-family:monospace;font-size:7pt">${product.barcode}</span>
        </div>
      </div>
    </div><script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`);
    w.document.close();
  }

  let _scanner = null;

  async function startCamera(containerId, onScan) {
    if (typeof Html5Qrcode === 'undefined') {
      Toast.show('error', 'Scanner Unavailable', 'Scanning library not loaded.'); return false;
    }
    const el = document.getElementById(containerId);
    if (!el) return false;

    // Use a fresh instance
    if (_scanner) { try { await _scanner.stop(); } catch(e){} }
    _scanner = new Html5Qrcode(containerId);

    const config = {
      fps: 20,
      qrbox: (viewWidth, viewHeight) => {
        // Square scan box for QR codes
        const s = Math.min(viewWidth, viewHeight) * 0.7;
        return { width: s, height: s };
      },
      aspectRatio: 1.0, 
      videoConstraints: {
        facingMode: 'environment',
        width: { min: 640, ideal: 1280 },
        height: { min: 640, ideal: 1280 },
        focusMode: 'continuous'
      }
    };

    let debounce = false;
    let lastResult = null;
    let count = 0;

    try {
      await _scanner.start({ facingMode: 'environment' }, config, (decodedText) => {
        if (debounce || !decodedText) return;

        debounce = true;
        if (onScan) {
          onScan(decodedText);
        }
        setTimeout(() => { debounce = false; }, 1500);
      });
      return true;
    } catch(err) {
      console.error('Camera Start Error', err);
      Toast.show('error', 'Camera Error', 'Could not access camera. Check permissions.');
      return false;
    }
  }

  async function stopCamera() {
    if (_scanner && _scanner.isScanning) {
      try { await _scanner.stop(); } catch(e){}
    }
    _scanner = null;
  }

  function pauseCamera() {
    if (_scanner && _scanner.isScanning) {
      _scanner.pause(true); // true = keep video feed on
    }
  }

  function resumeCamera() {
    if (_scanner) {
      _scanner.resume();
    }
  }

  function isCameraActive() {
    return _scanner && _scanner.isScanning;
  }

  async function downloadPNG(product, options = {}) {
    const { size = 512 } = options;
    const qrlib = window.QRious;
    try {
      let dataUrl = '';
      if (qrlib) {
        const qr = new qrlib({ value: product.barcode, size: size, level: 'H' });
        dataUrl = qr.toDataURL();
      } else {
        // Fallback to QRServer for download
        dataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(product.barcode)}`;
      }

      const link = document.createElement('a');
      link.download = `qr-${product.cableNo}-${size}.png`;
      link.href = dataUrl;
      link.target = '_blank';
      link.click();
      return true;
    } catch (e) {
      console.error('Download QR error', e);
      return false;
    }
  }

  return { generate, toDataURL, printLabel, downloadPNG, startCamera, stopCamera, pauseCamera, resumeCamera, isCameraActive };
})();
