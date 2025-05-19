import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as iam from "aws-cdk-lib/aws-iam";
import * as path from "path";
import { Construct } from "constructs";

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 bucket
    const importBucket = this.createImportBucket();

    // Create Lambda functions
    const importProductsFile = this.createLambdaFunction(
      "ImportProductsFile",
      "../../dist/importProductsFile",
      {
        BUCKET_NAME: importBucket.bucketName,
        UPLOADED_FOLDER: "uploaded",
      },
      30
    );

    const importFileParser = this.createLambdaFunction(
      "ImportFileParser",
      "../../dist/importFileParser",
      {
        BUCKET_NAME: importBucket.bucketName,
        UPLOADED_FOLDER: "uploaded",
        PARSED_FOLDER: "parsed",
      },
      60
    );

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
    importBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParser),
      { prefix: "uploaded/" }
    );

    // Create API Gateway
    const api = this.createApiGateway(importProductsFile);

    // Output API URL
    new cdk.CfnOutput(this, "ImportServiceApiUrl", {
      value: api.url,
      description: "URL of the Import Service API",
    });
  }

  private createImportBucket(): s3.Bucket {
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

  private createLambdaFunction(
    id: string,
    assetPath: string,
    environment: { [key: string]: string },
    timeoutSeconds: number
  ): lambda.Function {
    return new lambda.Function(this, id, {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(timeoutSeconds),
      handler: "index.main",
      code: lambda.Code.fromAsset(path.join(__dirname, assetPath)),
      environment,
    });
  }

  private attachPolicyToLambda(
    lambdaFunction: lambda.Function,
    policies: { actions: string[]; resources: string[] }[]
  ): void {
    policies.forEach((policy) => {
      lambdaFunction.addToRolePolicy(
        new iam.PolicyStatement({
          actions: policy.actions,
          resources: policy.resources,
        })
      );
    });
  }

  private createApiGateway(
    importProductsFile: lambda.Function
  ): apigateway.RestApi {
    const api = new apigateway.RestApi(this, "import-service-api", {
      restApiName: "Atilla's Import Service API",
      description: "This API serves the Import Service functions",
    });

    const importResource = api.root.addResource("import");
    importResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(importProductsFile),
      {
        requestParameters: {
          "method.request.querystring.name": true,
        },
      }
    );

    return api;
  }
}
