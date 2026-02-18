import { signal, component } from 'reefjs';
import { getProductByUpc } from "./utils.js";
import { BarcodeDetectorPolyfill } from '@undecaf/barcode-detector-polyfill'

const state = signal({
  barcode: null,
  product: null
});

let videoStream = null;

if (!("BarcodeDetector" in window)) {
  window.BarcodeDetector = BarcodeDetectorPolyfill;
}

const barcodeDetector = new window.BarcodeDetector({
  formats: ["upc_a", "upc_e", "code_128", "ean_13", "ean_8"],
});

async function stopCamera() {
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
  }
  document.querySelector("video").srcObject = null;
}

async function startScanning() {
  state.barcode = null;
  state.product = null;

  // Wait for DOM update
  await new Promise(requestAnimationFrame);

  const video = document.querySelector("video");
  if (!video) return;

  try {
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment", width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    });
    video.srcObject = videoStream;

    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.play().then(resolve);
      };
    });

    scan();
  } catch (err) {
    console.error("Error starting camera:", err);
  }
}

async function scan() {
  if (state.product) return;

  const video = document.querySelector("video");
  if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
    requestAnimationFrame(scan);
    return;
  }

  try {
    const barcodes = await barcodeDetector.detect(video);
    if (barcodes.length > 0) {
      const firstBarcode = barcodes[0].rawValue;
      await stopCamera();
      const product = await getProductByUpc(firstBarcode);

      state.barcode = firstBarcode;
      state.product = product;


      return;
    }
  } catch (e) {
    console.error("Detection error:", e);
  }

  requestAnimationFrame(scan);
}

component("#app", () => {
  if (state.barcode && !state.product) {
    // Check if the product lookup has already occurred (i.e., we are past the "fetching" stage)
    // This assumes that if state.product is null here, it's because getProductByUpc returned null.
    // If we are continuously scanning, then product would not be null, but we'd still be in the "Point your camera" state.
    // So, if state.barcode is set, and product is null, it means lookup failed.
    if (state.product === null) {
      return `
        <article>
          <h2>Barcode: ${state.barcode}</h2>
          <p>Product not found.</p>
        </article>
        <button id="scan-again-btn">Scan Again</button>
      `;
    }
    return `<p>Fetching product details for ${state.barcode}...</p>`;
  }

  if (state.product) {
    return `
                                                                                                                                                                                                                          <article>
                                                                                                                                                                                                                                  <h2>${state.barcode}</h2>
                                                                                                                                                                                                                                          <dl>
                                                                                                                                                                                                                                                    <dt>Name</dt>
                                                                                                                                                                                                                                                              <dd>${state.product?.desc || 'Not Found'}</dd>
                                                                                                                                                                                                                                                                        <dt>Price</dt>
                                                                                                                                                                                                                                                                                  <dd>${state.product?.price1?.toFixed(2) || 'Not Found'}</dd>
                                                                                                                                                                                                                                                                                          </dl>
                                                                                                                                                                                                                                                                                                </article>
                                                                                                                                                                                                                                                                                                      <button id="scan-again-btn">Scan Again</button>
                                                                                                                                                                                                                                                                                                          `;
  }

  return `
                                                                                                                                                                                                                                                                                                                  <p>Point your camera at a barcode.</p>
                                                                                                                                                                                                                                                                                                                      <div class="video-container">
                                                                                                                                                                                                                                                                                                                            <video autoplay muted playsinline></video>
                                                                                                                                                                                                                                                                                                                                </div>
                                                                                                                                                                                                                                                                                                                                  `;
});
// Initialize
startScanning();

document.addEventListener('click', (event) => {
  if (event.target.matches('#scan-again-btn')) {
    startScanning();
  }
});