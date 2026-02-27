import Papa from 'papaparse';

const products = await new Promise((resolve) => {
  Papa.parse('./data.csv', {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const map = new Map();

      for (const row of results.data) {
        if (!row.part_no) continue;

        const key = String(row.part_no).trim();
        row.desc = row.desc?.trim() || "No description";
        row.price1 = parseFloat(row.price1) || 0;

        map.set(key, row);
      }
      resolve(map);
    }
  });
});

export function getProductByUpc(upc) {
  return products.get(String(upc).trim()) || null;
}