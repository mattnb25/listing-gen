import { getProductByUpc, downloadCsv } from "./csv-parser.js";
const { signal, component } = reef;

const productListing = new Map();
const detectedProduct = signal(null);

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
    width: { ideal: 1280 }, // Higher res helps with small barcodes
    height: { ideal: 720 }
  });

  videoElement.srcObject = stream;

  await new Promise((resolve) => {
    videoElement.onloadedmetadata = () => {
      videoElement.play().then(resolve);
    };
  });
}

async function scan() {
  if (videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
    requestAnimationFrame(scan);
    return;
  }
  const barcodes = await barcodeDetector.detect(videoElement);
  if (barcodes.length > 0) {
    for (const barcode of barcodes) {
      const product = await getProductByUpc(barcode.rawValue);
      if (product) {
        detectedProduct.value = product;
        productListing.set(barcode.rawValue, product);
      }
    }
  }
  setTimeout(() => requestAnimationFrame(scan), 100);
}

// Initialize
setupCamera().then(() => scan());

component("#product-view", () => {
  return `
    <h2>${'last added: ' + (detectedProduct.value?.name || "none")}</h2>
    <button id="download-btn">Download CSV (${productListing.size} items added)</button>
  `;
});

document.querySelector("#product-view").addEventListener('click', (event) => {

  if (event.target?.id === 'download-btn') {
    downloadCsv(productListing);
  }
});
