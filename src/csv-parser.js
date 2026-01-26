import csv from "./data.csv?raw";

const productMap = (() => {
  const lines = csv.trim().split('\n');
  const header = lines.shift().split(',').map(s => s.trim());
  const barcodeIndex = header.indexOf('part_no');
  const descIndex = header.indexOf('desc');
  const priceIndex = header.indexOf('price1');

  const map = new Map();

  for (const line of lines) {
    const columns = line.split(',');
    if (columns.length >= 3) {
      const barcode = columns[barcodeIndex]?.trim();
      const name = columns[descIndex]?.trim();
      const price = parseFloat(columns[priceIndex]?.trim());
      if (barcode && name && !isNaN(price)) {
        map.set(barcode, { name, price });
      }
    }
  }

  return map;
})();

export function getProductByUpc(upc) {
  return productMap.get(upc);
}

export function downloadCsv(map) {
  const lines = [];

  for (const [barcode, { name, price }] of map) {
    lines.push(`${barcode},${name},${price}`);
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `listing.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}