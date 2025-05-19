import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as path from "path";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

interface ProductServiceStackProps extends cdk.StackProps {
  productsTable: dynamodb.Table;
  stockTable: dynamodb.Table;
}

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ProductServiceStackProps) {
    super(scope, id, props);

    const { productsTable, stockTable } = props;

    const getProductsListLambda = new lambda.Function(this, "GetProductsListLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, './')),
      handler: "getProductsList.handler",
      environment: {
        PRODUCT_TABLE_NAME: "products",
        STOCK_TABLE_NAME: "stock",
      }
    });

    const getProductByIdLambda = new lambda.Function(this, "GetProductByIdLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, './')),
      handler: "getProductById.handler",
      environment: {
        PRODUCT_TABLE_NAME: "products",
        STOCK_TABLE_NAME: "stock",
      }
    });

    const createProductLambda = new lambda.Function(this, "CreateProductLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, './')),
      handler: "createProduct.handler",
      environment: {
        PRODUCT_TABLE_NAME: "products",
        STOCK_TABLE_NAME: "stock",
      },
    });

    // Define the API Gateway
    const api = new apigateway.RestApi(this, "ProductServiceApi", {
      restApiName: "Product Service",
    });

    // Add /products endpoint
    const productsResource = api.root.addResource("products");
    productsResource.addMethod("GET", new apigateway.LambdaIntegration(getProductsListLambda));
    productsResource.addMethod("POST", new apigateway.LambdaIntegration(createProductLambda));

    // Add /products/{id} endpoint
    const productByIdResource = productsResource.addResource("{id}");
    productByIdResource.addMethod("GET", new apigateway.LambdaIntegration(getProductByIdLambda));

    productsTable.grantReadData(getProductByIdLambda);
    stockTable.grantReadData(getProductByIdLambda);

    productsTable.grantWriteData(createProductLambda);
    stockTable.grantWriteData(createProductLambda);
    productsTable.grantReadData(createProductLambda);

    productsTable.grantReadData(getProductsListLambda);
    stockTable.grantReadData(getProductsListLambda);
  }
}