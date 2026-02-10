import Papa from 'papaparse';

const getData = () => {
  return new Promise((resolve, reject) => {
    Papa.parse('./data.csv', {
      download: true,
      header: true,
      dynamicTyping: true,
      complete: (results) => resolve(results.data),
      error: (err) => reject(err)
    });
  });
};

const allProducts = await getData();

export async function getProductByUpc(upc) {
  const product = allProducts.find(item =>
    String(item.part_no).trim() === String(upc).trim()
  );

  return product || null;
}