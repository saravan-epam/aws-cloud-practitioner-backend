#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { StockStack } from "../lib/stock/StockStack";

const app = new cdk.App();

new StockStack(app, "ProductStack");
