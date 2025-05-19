import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";
import { join } from "path";

const productTableName = "products";

export class ProductDbStack extends Stack {
  public readonly productsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.productsTable = new dynamodb.Table(this, productTableName, {
      tableName: productTableName,
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
    });

    const createProductLambda = new lambda.Function(this, "lambda-function", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      code: lambda.Code.fromAsset(join(__dirname, './')),
      handler: "createProduct.handler",
      environment: {
        PRODUCT_TABLE_NAME: "products",
        STOCK_TABLE_NAME: "stock",
      },
    });

    this.productsTable.grantWriteData(createProductLambda);
  }
}
