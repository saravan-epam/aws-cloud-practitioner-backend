import * as cdk from "aws-cdk-lib";

import { ProductServiceStack } from "../lib/product-service/product-service-stack";
import { ImportServiceStack } from "../lib/import-service/import-service-stack";
import { ProductDbStack } from "../lib/product-service/product-db-stack";
import { StockDbStack } from "../lib/product-service/stock-db-stack";

const app = new cdk.App();

const productDbStack = new ProductDbStack(app, "ProductDbStack");
const stockDbStack = new StockDbStack(app, "StockDbStack");

new ProductServiceStack(app, "ProductServiceStack", {
  productsTable: productDbStack.productsTable,
  stockTable: stockDbStack.stockTable,
});

new ImportServiceStack(app, "ImportServiceStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
