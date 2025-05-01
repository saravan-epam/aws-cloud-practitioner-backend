// Filename: hello-lambda-stack.ts
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cdk from "aws-cdk-lib";
import * as path from "path";
import { Construct } from "constructs";

export class HelloLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaFunction = new lambda.Function(this, "lambda-function", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: "handler.main",
      code: lambda.Code.fromAsset(path.join(__dirname, "./")),
    });

    const api = new apigateway.RestApi(this, "my-api", {
      restApiName: "My API Gateway",
      description: "This API serves the Lambda functions.",
    });

    const productsFromLambdaIntegration = new apigateway.LambdaIntegration(
      lambdaFunction,
      {
        integrationResponses: [{ statusCode: "200" }],
        proxy: false,
        requestTemplates: {
          "application/json": `{ "productId": "$input.params('productId')" }`,
        },
      }
    );

    const productsResource = api.root.addResource("products");
    productsResource.addMethod("GET", productsFromLambdaIntegration, {
      methodResponses: [{ statusCode: "200" }],
    });

    productsResource.addCorsPreflight({
      allowOrigins: ["*"],
      allowMethods: ["GET"],
    });
  }
}
