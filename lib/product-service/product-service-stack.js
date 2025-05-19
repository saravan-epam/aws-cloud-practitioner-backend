"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductServiceStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const path = __importStar(require("path"));
class ProductServiceStack extends cdk.Stack {
    constructor(scope, id, props) {
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
exports.ProductServiceStack = ProductServiceStack;
