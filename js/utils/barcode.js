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
      fps: 20, // High FPS for quick detection
      qrbox: (viewWidth, viewHeight) => {
        // Dynamic scan box: 80% width, 40% height (optimized for 1D barcodes)
        const w = Math.floor(viewWidth * 0.8);
        const h = Math.floor(viewHeight * 0.4);
        return { width: w, height: h };
      },
      aspectRatio: 1.777778, // 16:9
      videoConstraints: {
        facingMode: 'environment',
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 },
        focusMode: 'continuous'
      }
    };

    let debounce = false;
    let lastResult = null;
    let count = 0;

    try {
      await _scanner.start({ facingMode: 'environment' }, config, (decodedText) => {
        if (debounce) return;
        
        // Pattern filter: Only accept system barcodes
        if (!decodedText.startsWith('CBL-')) return;

        // Triple-read confirmation for 100% accuracy
        if (decodedText === lastResult) {
          count++;
        } else {
          lastResult = decodedText;
          count = 1;
        }

        if (count >= 3 && onScan) {
          debounce = true;
          onScan(decodedText);
          lastResult = null;
          count = 0;
          setTimeout(() => { debounce = false; }, 3000);
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
    const { width = 4, height = 100, fontSize = 16, margin = 10 } = options;
    return new Promise(resolve => {
      const c = document.createElement('canvas');
      c.style.display = 'none';
      document.body.appendChild(c);
      try {
        JsBarcode(c, product.barcode, {
          format: 'CODE128',
          width: width,
          height: height,
          displayValue: true,
          fontSize: fontSize,
          margin: margin,
          background: '#ffffff',
          lineColor: '#000000'
        });
        const link = document.createElement('a');
        link.download = `barcode-${product.cableNo}-${width}x${height}.png`;
        link.href = c.toDataURL('image/png');
        link.click();
        resolve(true);
      } catch (e) {
        console.error('Download PNG error', e);
        resolve(false);
      } finally {
        document.body.removeChild(c);
      }
    });
  }

  return { generate, toDataURL, printLabel, downloadPNG, startCamera, stopCamera, isCameraActive };
})();
