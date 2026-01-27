import { getProductByUpc, downloadCsv } from "./csv-parser.js";
const { signal, component } = reef;

const productListing = new Map();
const detectedProduct = signal(null);
const isScanning = signal(true, 'isScanning');

if (!("BarcodeDetector" in window)) {
  window["BarcodeDetector"] = barcodeDetectorPolyfill.BarcodeDetectorPolyfill;
}

const barcodeDetector = new BarcodeDetector({
  formats: ["upc_a", "upc_e", "code_128", "ean_13", "ean_8"],
});

const videoElement = document.querySelector("video");

async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" },
  });

  videoElement.srcObject = stream;

  await new Promise((resolve) => {
    videoElement.onloadedmetadata = resolve;
  });
}

async function scan() {
  if (!isScanning.value) return;
  const barcodes = await barcodeDetector.detect(videoElement);
  if (barcodes.length > 0) {
    for (const barcode of barcodes) {
      const product = getProductByUpc(barcode.rawValue);
      if (product) {
        detectedProduct.value = product;
        productListing.set(barcode.rawValue, product);
        isScanning.value = false;
      }
    }
  }
  requestAnimationFrame(scan);
}

// Initialize
setupCamera().then(() => scan());

component("#product-view", () => {
  return `
    <h2>${'added: ' + detectedProduct.value?.name}</h2>
    <button id="scan-btn">Scan Again</button>
    <button id="download-btn">Download CSV (${productListing.size} items added)</button>
  `;
});

document.querySelector("#product-view").addEventListener('click', (event) => {
  if (event.target?.id === 'scan-btn') {
    isScanning.value = true;
    scan();
  }
  if (event.target?.id === 'download-btn') {
    downloadCsv(productListing);
  }
});

document.addEventListener('reef:signal-isScanning', function (event) {
	document.querySelector("#scan-view").classList.toggle('hidden', !isScanning.value);
	document.querySelector("#product-view").classList.toggle('hidden', isScanning.value);
});