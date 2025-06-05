import * as cdk from "aws-cdk-lib";
import "dotenv/config";

import { ProductServiceStack } from "../lib/product-service/product-service-stack";
import { ProductDbStack } from "../lib/product-service/product-db-stack";
import { StockDbStack } from "../lib/product-service/stock-db-stack";
import { ImportServiceStack } from "../lib/product-service/import-service-stack";
import { AuthorizationServiceStack } from "../lib/product-service/authorization-service-stack";

const app = new cdk.App();

const auth = new AuthorizationServiceStack(
  app,
  "AuthorizationServiceStack",
  {}
);

const productDbStack = new ProductDbStack(app, "ProductDbStack");
const stockDbStack = new StockDbStack(app, "StockDbStack");

new ImportServiceStack(app, "ImportServiceStack", {
  tables: productDbStack,
  basicAuthorizer: auth.basicAuthorizer,
});

new ProductServiceStack(app, "ProductServiceStack", {
  productsTable: productDbStack.productsTable,
  stockTable: stockDbStack.stockTable,
});
