"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_sns_1 = require("@aws-sdk/client-sns");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const dynamoDB = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION });
const productTableName = process.env.PRODUCT_TABLE_NAME;
exports.handler = async (event) => {
    try {
        const snsClient = new client_sns_1.SNSClient([{
                region: process.env.AWS_REGION,
            }]);
        const titles = [];
        for (const record of event.Records) {
            try {
                const product = JSON.parse(record.body);
                console.log('Parsing product: ', product);
                const { title, price, description } = product;
                if (!title || !price) {
                    throw new Error("title and price are required fields");
                }
                const productId = `product-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
                const productCommand = new client_dynamodb_1.PutItemCommand({
                    TableName: productTableName,
                    Item: {
                        id: { S: productId },
                        title: { S: title },
                        price: { N: price.toString() },
                        description: { S: description || "" },
                        createdAt: { N: new Date().getTime().toString() },
                    },
                });
                await dynamoDB.send(productCommand);
                const scanCommand = new client_dynamodb_1.ScanCommand({
                    TableName: productTableName,
                    Select: "COUNT",
                });
                await dynamoDB.send(scanCommand);
                console.log('Product created: ', productId);
                titles.push(title);
            }
            catch (error) {
                console.error('Error: ', error);
            }
        }
        const publishCommand = new client_sns_1.PublishCommand({
            TopicArn: process.env.SNS_TOPIC_ARN,
            Message: `The following products have been successfully processed: ${titles.join(', ')}`,
        });
        await snsClient.send(publishCommand);
    }
    catch (error) {
        console.error('Error in catalogBatchProcess: ', error);
    }
};
