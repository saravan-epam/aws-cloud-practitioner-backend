#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ProductStack } from "../lib/products/ProductsStack";

const app = new cdk.App();

new ProductStack(app, "ProductStack");
