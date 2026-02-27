import { signal, component } from 'reefjs';
import { getProductByUpc } from "./utils.js";
import { BarcodeDetectorPolyfill } from '@undecaf/barcode-detector-polyfill';

const _getContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (type, attr) {
  return _getContext.call(this, type, type === '2d' ? {
    ...attr,
    willReadFrequently: true
  } : attr);
};

window.BarcodeDetector ||= BarcodeDetectorPolyfill;
const barcodeDetector = new window.BarcodeDetector({
  formats: ["upc_a", "upc_e", "code_128", "ean_13", "ean_8"],
});

let videoElement = document.querySelector("video");

(async () => {
  const videoStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" }
  });

  videoElement.srcObject = videoStream;
  videoElement.onloadedmetadata = () => {
    videoElement.play();
    scan();
  };
})();


const state = signal({
  status: 'idle',
  barcode: null,
  product: null
}, 'app-state');

document.addEventListener('reef:signal-app-state', () => {
  const isIdle = state.status === 'idle';
  videoElement.hidden = !isIdle;

  if (isIdle) {
    videoElement.play();
    scan();
  } else {
    videoElement.pause();
  }
});

function reset() {
  state.status = 'idle';
  state.barcode = null;
  state.product = null;
}

async function scan() {
  if (state.status !== 'idle') return;

  if (videoElement.readyState < 2) {
    requestAnimationFrame(scan);
    return;
  }
  const barcodes = await barcodeDetector.detect(videoElement);
  if (barcodes.length > 0) {
    state.status = 'fetching';

    let barcode = barcodes[0].rawValue;
    if (barcodes[0].format === 'upc_e') {
      barcode = barcode.slice(1, 7)
    }
    state.barcode = barcode;

    state.product = await getProductByUpc(state.barcode);
    state.status = !state.product ? 'not-found' : 'found';
    console.log(state);
    return
  }
  requestAnimationFrame(scan);
}


component("#product-info", () => {
  const {
    status,
    barcode,
    product
  } = state;

  switch (status) {
    case 'idle':
      return `<p>Please enable camera access and point your camera at a barcode.</p>`;

    case 'fetching':
      return `<p>Searching for ${barcode}...</p>`;

    case 'not-found':
      return `
  <p>Could not find ${barcode}...</p>
  <button id="scan-btn">Scan Another Item</button>
  `;

    case 'found':
      return `
  <article>
    <h2>${barcode}</h2>
    <dl>
      <dt>Item</dt>
      <dd>${product.desc}</dd>
      <dt>Price</dt>
      <dd>$${product.price1.toFixed(2)}</dd>
    </dl>
  </article>
  <button id="scan-btn">Scan Another Item</button>`;
  }
}, {
  signals: ['app-state']
});

document.querySelector("#product-info").addEventListener("click", (event) => {
  if (event.target.matches("#scan-btn")) {
    reset();
  }
});