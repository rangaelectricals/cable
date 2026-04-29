/**
 * Barcode generation (JsBarcode) and camera scanning (Quagga)
 */
const Barcode = (() => {
  async function generate(imgId, value) {
    const qrlib = window.QRCode;
    if (typeof qrlib === 'undefined') { console.warn('QRCode library not loaded'); return; }
    const img = document.getElementById(imgId);
    if (!img) return;
    try {
      const url = await qrlib.toDataURL(value, {
        width: 256,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });
      img.src = url;
    } catch(e) { console.error('QR gen error', e); }
  }

  async function toDataURL(value) {
    if (typeof QRCode === 'undefined') return null;
    try {
      return await QRCode.toDataURL(value, { width: 300, margin: 2 });
    } catch { return null; }
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
      <div class="title">CableTrack Pro</div>
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
        if (debounce) return;
        
        // Pattern filter: Only accept system barcodes/QRs
        if (!decodedText.startsWith('CBL-')) return;

        // Double-read confirmation is enough for QR (more robust than 1D)
        if (decodedText === lastResult) {
          count++;
        } else {
          lastResult = decodedText;
          count = 1;
        }

        if (count >= 2 && onScan) {
          debounce = true;
          onScan(decodedText);
          lastResult = null;
          count = 0;
          setTimeout(() => { debounce = false; }, 2000);
        }
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

  function isCameraActive() {
    return _scanner && _scanner.isScanning;
  }

  async function downloadPNG(product, options = {}) {
    const { size = 512, margin = 2 } = options;
    if (typeof QRCode === 'undefined') return false;
    try {
      const dataUrl = await QRCode.toDataURL(product.barcode, { width: size, margin: margin });
      const link = document.createElement('a');
      link.download = `qr-${product.cableNo}-${size}.png`;
      link.href = dataUrl;
      link.click();
      return true;
    } catch (e) {
      console.error('Download QR error', e);
      return false;
    }
  }

  return { generate, toDataURL, printLabel, downloadPNG, startCamera, stopCamera, isCameraActive };
})();
