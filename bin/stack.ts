import * as cdk from 'aws-cdk-lib';

import {ProductServiceStack} from "../lib/product-service/product-service-stack";
import {ProductDbStack} from "../lib/product-service/product-db-stack";
import {StockDbStack} from "../lib/product-service/stock-db-stack";

const app = new cdk.App();

const productDbStack = new ProductDbStack(app, "ProductDbStack");
const stockDbStack = new StockDbStack(app, "StockDbStack");

new ProductServiceStack(app, 'ProductServiceStack', {
  productsTable: productDbStack.productsTable,
  stockTable: stockDbStack.stockTable,
});
