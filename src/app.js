import { signal, component } from 'reefjs';
import { getProductByUpc } from './parser.js';
import { BarcodeDetectorPolyfill } from '@undecaf/barcode-detector-polyfill';

// Patch both standard and offscreen canvases
[HTMLCanvasElement, OffscreenCanvas].forEach(cls => {
  const _getContext = cls.prototype.getContext;
  cls.prototype.getContext = function (type, attr) {
    if (type === '2d') {
      attr = { ...(attr || {}), willReadFrequently: true };
    }
    return _getContext.call(this, type, attr);
  };
});

window.BarcodeDetector ||= BarcodeDetectorPolyfill;
const barcodeDetector = new window.BarcodeDetector({
  formats: ["upc_a", "upc_e", "code_128", "ean_13", "ean_8"],
});

const videoElement = document.querySelector("video");
const state = signal({ status: 'idle', barcode: null, product: null }, 'app-state');

async function scan() {
  if (state.status !== 'idle') return;
  if (!videoElement || videoElement.readyState < 2) {
    return setTimeout(scan, 250);
  }

  const [detected] = await barcodeDetector.detect(videoElement);

  if (detected) {
    state.status = 'fetching';

    state.barcode = detected.format === 'upc_e'
      ? detected.rawValue.slice(1, 7)
      : detected.rawValue;

    state.product = await getProductByUpc(state.barcode);
    state.status = state.product ? 'found' : 'not-found';
    return;
  }

  setTimeout(scan, 250)
}

async function toggleCamera() {
  const isIdle = state.status === 'idle';
  if (isIdle) {
    videoElement.srcObject = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    videoElement.hidden = false;
    videoElement.play();
    scan();
  } else {
    videoElement.pause();
    videoElement.srcObject?.getTracks().forEach(track => track.stop());
    videoElement.srcObject = null;
    videoElement.hidden = true;
  }
}

toggleCamera();

component("#product-info", () => {
  const { status, barcode, product } = state;

  const uiViews = {
    'idle': `<p>Please allow camera access and point your camera at a barcode.</p>`,
    'fetching': `<p>Searching for ${barcode}...</p>`,
    'not-found': `
      <p>Could not find ${barcode}...</p>
      <button id="scan-btn">Scan Another Item</button>
    `,
    'found': `
      <article>
        <h2>ITEM: ${barcode}</h2>
        <dl>
          <dt>Description</dt><dd>${product?.desc}</dd>
          <dt>Price</dt><dd>$${product?.price1?.toFixed(2)}</dd>
        </dl>
      </article>
      <button id="scan-btn">Scan Another Item</button>
    `
  };

  return uiViews[status];
}, { signals: ['app-state'] });

document.querySelector("#product-info").addEventListener("click", (e) => {
  if (e.target.id === "scan-btn") {
    state.status = 'idle';
    state.barcode = null;
    state.product = null;
  }
});

document.addEventListener('reef:signal-app-state', () => {
  toggleCamera();
});

