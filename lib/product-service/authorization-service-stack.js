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
exports.AuthorizationServiceStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const path = __importStar(require("path"));
class AuthorizationServiceStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);
    const basicAuthorizerLambda = new aws_lambda_nodejs_1.NodejsFunction(
      this,
      "basicAuthorizer",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "basicAuthorizer.handler",
        code: lambda.Code.fromAsset(path.join(__dirname, "./")),
        environment: {
          TEST_USERNAME: process.env.TEST_USERNAME,
          [process.env.TEST_USERNAME]: process.env[process.env.TEST_USERNAME],
        },
      }
    );
    basicAuthorizerLambda.addPermission("AllowApiGatewayInvoke", {
      principal: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      action: "lambda:InvokeFunction",
    });
    this.basicAuthorizer = lambda.Function.fromFunctionArn(
      this,
      "BasicAuthorizerExport",
      basicAuthorizerLambda.functionArn
    );
    new cdk.CfnOutput(this, "BasicAuthorizerArn", {
      value: basicAuthorizerLambda.functionArn,
      exportName: "BasicAuthorizerFnArn",
    });
  }
}
exports.AuthorizationServiceStack = AuthorizationServiceStack;
