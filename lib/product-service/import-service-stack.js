"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportServiceStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const s3n = __importStar(require("aws-cdk-lib/aws-s3-notifications"));
const s3deploy = __importStar(require("aws-cdk-lib/aws-s3-deployment"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const path = __importStar(require("path"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const sns = __importStar(require("aws-cdk-lib/aws-sns"));
const sqs = __importStar(require("aws-cdk-lib/aws-sqs"));
const aws_sns_subscriptions_1 = require("aws-cdk-lib/aws-sns-subscriptions");
const aws_lambda_event_sources_1 = require("aws-cdk-lib/aws-lambda-event-sources");
class ImportServiceStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);
    const bucket = new s3.Bucket(this, "ImportBucket", {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    const lambdaAuthorizer = new apigateway.TokenAuthorizer(
      this,
      "LambdaAuthorizer",
      {
        handler: props.basicAuthorizer,
      }
    );
    const importProductsFileLambda = new lambda.Function(
      this,
      "ImportProductsFile",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        code: lambda.Code.fromAsset(path.join(__dirname, "./")),
        handler: "importProductsFile.handler",
        environment: {
          BUCKET_NAME: bucket.bucketName,
        },
      }
    );
    const catalogItemsQueue = new sqs.Queue(this, "catalogItemsQueue");
    const importFileParserLambda = new lambda.Function(
      this,
      "ImportFileParser",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        code: lambda.Code.fromAsset(path.join(__dirname, "./")),
        handler: "importFileParser.handler",
        environment: {
          BUCKET_NAME: bucket.bucketName,
          SQS_QUEUE_URL: catalogItemsQueue.queueUrl,
        },
      }
    );
    const createProductTopic = new sns.Topic(this, "CreateProductTopic");
    createProductTopic.addSubscription(
      new aws_sns_subscriptions_1.EmailSubscription("yuliia_mykhaliak@epam.com")
    );
    const catalogBatchProcessLambda = new lambda.Function(
      this,
      "CatalogBatchProcessLambda",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        code: lambda.Code.fromAsset(path.join(__dirname, "./")),
        handler: "catalogBatchProcess.handler",
        environment: {
          BUCKET_NAME: bucket.bucketName,
          PRODUCT_TABLE_NAME: "products",
        },
      }
    );
    catalogBatchProcessLambda.addEventSource(
      new aws_lambda_event_sources_1.SqsEventSource(catalogItemsQueue, {
        batchSize: 5,
      })
    );
    createProductTopic.grantPublish(catalogBatchProcessLambda);
    catalogItemsQueue.grantSendMessages(importFileParserLambda);
    props.tables.grantWriteData("products", catalogBatchProcessLambda);
    // Deploy an empty file to create the 'uploaded/' folder
    new s3deploy.BucketDeployment(this, "DeployUploadedFolder", {
      sources: [s3deploy.Source.data("uploaded/.keep", "")],
      destinationBucket: bucket,
      destinationKeyPrefix: "uploaded/",
    });
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParserLambda),
      { prefix: "uploaded/" }
    );
    bucket.grantRead(importFileParserLambda);
    // Define the API Gateway
    const api = new apigateway.RestApi(this, "ImportServiceApi", {
      restApiName: "Import Products Service",
    });
    // Add /import endpoint
    const importProductsResource = api.root.addResource("import");
    importProductsResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(importProductsFileLambda),
      {
        authorizer: lambdaAuthorizer,
        authorizationType: apigateway.AuthorizationType.CUSTOM,
      }
    );
  }
}
exports.ImportServiceStack = ImportServiceStack;
