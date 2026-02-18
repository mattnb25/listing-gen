import Papa from 'papaparse';

const getData = () => {
  return new Promise((resolve, reject) => {
    Papa.parse('./data.csv', {
      download: true,
      header: true,
      complete: (results) => {
        const processedData = results.data.map(item => {
          return {
            ...item,
            price1: item.price1 ? Number(item.price1) : null // Convert price1 to a number
          };
        }).filter(item => item.part_no); // Filter out rows with empty part_no if any
        resolve(processedData);
      },
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