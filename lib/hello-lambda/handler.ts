import { products } from "./products-list";

export async function main(event: any) {
  let response;
  if (event.productId) {
    const product =
      products.find((product) => product.id === event.productId) || null;
    response = product ? product : null;
  } else {
    response = products;
  }
  return response;
}
