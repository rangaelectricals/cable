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
    .large-spec{font-size:15pt;font-weight:900;color:#1d4ed8;margin:3mm 0;text-transform:uppercase;border-top:1.5px solid #eee;border-bottom:1.5px solid #eee;padding:2mm 0;}
    @media print{body{margin:0;}.wrap{border:none;}}</style></head>
    <body><div class="wrap">
      <div class="title">RE CABLETRACK</div>
      <div class="sub">${product.cableNo} — ${product.category}</div>
      ${dataUrl ? `<img src="${dataUrl}" />` : ''}
      <div class="large-spec">
        ${product.no ? `#${product.no} &bull; ` : ''}${product.core} / ${product.sqmm}mm² &bull; ${product.meter}M
      </div>
      <div class="grid">
        <div style="grid-column:1/-1;margin-top:2mm;padding-top:2mm;">
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
    const size = 1024;
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";

      const qrlib = window.QRious;
      let dataUrl = '';
      if (qrlib) {
        const qr = new qrlib({ value: product.barcode, size: size, level: 'H' });
        dataUrl = qr.toDataURL();
      } else {
        dataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(product.barcode)}`;
      }

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = size;
      canvas.height = size + 320;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, 0, 0, size, size);

      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "center";

      ctx.font = "bold 44px Inter, Arial, sans-serif";
      ctx.fillText(`${product.cableNo || 'CABLE'} — ${product.category || 'INVENTORY'}`, size / 2, size + 70);

      ctx.font = "bold 56px Inter, Arial, sans-serif";
      ctx.fillStyle = "#1d4ed8";
      const noPart = product.no ? `#${product.no} • ` : '';
      ctx.fillText(`${noPart}${product.core} / ${product.sqmm}mm² • ${product.meter}M`, size / 2, size + 170);

      ctx.font = "32px monospace";
      ctx.fillStyle = "#64748b";
      ctx.fillText(product.barcode, size / 2, size + 260);

      const fullUrl = canvas.toDataURL("image/png");
      const link = document.createElement('a');

      const filenameSpec = `${product.category || ''}_${product.core || ''}_${product.sqmm || ''}mm2_${product.meter || 0}M`.replace(/[\s\/]/g, '_');
      link.download = `qr_${filenameSpec}.png`;
      link.href = fullUrl;
      link.target = '_blank';
      link.click();
      return true;
    } catch (e) {
      console.error('Download QR error', e);
      return false;
    }
  }

  async function generatePNGDataURL(product) {
    const size = 1024;
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";

      const qrlib = window.QRious;
      let dataUrl = '';
      if (qrlib) {
        const qr = new qrlib({ value: product.barcode, size: size, level: 'H' });
        dataUrl = qr.toDataURL();
      } else {
        dataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(product.barcode)}`;
      }

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = size;
      canvas.height = size + 320;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, 0, 0, size, size);

      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "center";

      ctx.font = "bold 44px Inter, Arial, sans-serif";
      ctx.fillText(`${product.cableNo || 'CABLE'} — ${product.category || 'INVENTORY'}`, size / 2, size + 70);

      ctx.font = "bold 56px Inter, Arial, sans-serif";
      ctx.fillStyle = "#1d4ed8";
      const noPart = product.no ? `#${product.no} • ` : '';
      ctx.fillText(`${noPart}${product.core} / ${product.sqmm}mm² • ${product.meter}M`, size / 2, size + 170);

      ctx.font = "32px monospace";
      ctx.fillStyle = "#64748b";
      ctx.fillText(product.barcode, size / 2, size + 260);

      return canvas.toDataURL("image/png");
    } catch (e) {
      console.error('generatePNGDataURL error', e);
      return null;
    }
  }

  return { generate, toDataURL, printLabel, downloadPNG, startCamera, stopCamera, pauseCamera, resumeCamera, isCameraActive, generatePNGDataURL };
})();
