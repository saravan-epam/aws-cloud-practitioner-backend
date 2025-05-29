import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { ProductDbStack } from "./product-db-stack";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";

export class ImportServiceStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    tables: ProductDbStack,
    props?: cdk.StackProps
  ) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, "ImportBucket", {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

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
      new EmailSubscription("saravan_somanchi@epam.com")
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
      new SqsEventSource(catalogItemsQueue, {
        batchSize: 5,
      })
    );
    createProductTopic.grantPublish(catalogBatchProcessLambda);
    catalogItemsQueue.grantSendMessages(importFileParserLambda);
    tables.grantWriteData("products", catalogBatchProcessLambda);

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
      new apigateway.LambdaIntegration(importProductsFileLambda)
    );
  }
}
