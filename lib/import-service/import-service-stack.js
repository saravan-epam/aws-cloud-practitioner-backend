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
exports.ImportServiceStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const s3n = __importStar(require("aws-cdk-lib/aws-s3-notifications"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const path = __importStar(require("path"));
class ImportServiceStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Create S3 bucket
        const importBucket = this.createImportBucket();
        // Create Lambda functions
        const importProductsFile = this.createLambdaFunction("ImportProductsFile", "../../dist/importProductsFile", {
            BUCKET_NAME: importBucket.bucketName,
            UPLOADED_FOLDER: "uploaded",
        }, 30);
        const importFileParser = this.createLambdaFunction("ImportFileParser", "../../dist/importFileParser", {
            BUCKET_NAME: importBucket.bucketName,
            UPLOADED_FOLDER: "uploaded",
            PARSED_FOLDER: "parsed",
        }, 60);
        // Attach IAM policies to Lambda functions
        this.attachPolicyToLambda(importProductsFile, [
            {
                actions: ["s3:PutObject"],
                resources: [`${importBucket.bucketArn}/uploaded/*`],
            },
        ]);
        this.attachPolicyToLambda(importFileParser, [
            {
                actions: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
                resources: [
                    `${importBucket.bucketArn}/uploaded/*`,
                    `${importBucket.bucketArn}/parsed/*`,
                ],
            },
        ]);
        // Add S3 event notification
        importBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(importFileParser), { prefix: "uploaded/" });
        // Create API Gateway
        const api = this.createApiGateway(importProductsFile);
        // Output API URL
        new cdk.CfnOutput(this, "ImportServiceApiUrl", {
            value: api.url,
            description: "URL of the Import Service API",
        });
    }
    createImportBucket() {
        return new s3.Bucket(this, "ImportBucket", {
            bucketName: `product-import-bucket-${this.account}`,
            cors: [
                {
                    allowedMethods: [
                        s3.HttpMethods.GET,
                        s3.HttpMethods.POST,
                        s3.HttpMethods.PUT,
                    ],
                    allowedOrigins: ["*"],
                    allowedHeaders: ["*"],
                },
            ],
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });
    }
    createLambdaFunction(id, assetPath, environment, timeoutSeconds) {
        return new lambda.Function(this, id, {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(timeoutSeconds),
            handler: "index.main",
            code: lambda.Code.fromAsset(path.join(__dirname, assetPath)),
            environment,
        });
    }
    attachPolicyToLambda(lambdaFunction, policies) {
        policies.forEach((policy) => {
            lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
                actions: policy.actions,
                resources: policy.resources,
            }));
        });
    }
    createApiGateway(importProductsFile) {
        const api = new apigateway.RestApi(this, "import-service-api", {
            restApiName: "Atilla's Import Service API",
            description: "This API serves the Import Service functions",
        });
        const importResource = api.root.addResource("import");
        importResource.addMethod("GET", new apigateway.LambdaIntegration(importProductsFile), {
            requestParameters: {
                "method.request.querystring.name": true,
            },
        });
        return api;
    }
}
exports.ImportServiceStack = ImportServiceStack;
