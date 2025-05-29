import {SQSEvent} from "aws-lambda";
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

import {DynamoDBClient, PutItemCommand, ScanCommand, UpdateItemCommand} from "@aws-sdk/client-dynamodb";

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const productTableName = process.env.PRODUCT_TABLE_NAME as string;

exports.handler = async (event: SQSEvent) => {
  try {
    const snsClient = new SNSClient([{
      region: process.env.AWS_REGION!,
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

        const productCommand = new PutItemCommand({
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

        const scanCommand = new ScanCommand({
          TableName: productTableName,
          Select: "COUNT",
        });

        await dynamoDB.send(scanCommand);

        console.log('Product created: ', productId);
        titles.push(title);
      } catch (error) {
        console.error('Error: ', error);
      }
    }

    const publishCommand = new PublishCommand({
      TopicArn: process.env.SNS_TOPIC_ARN!,
      Message: `The following products have been successfully processed: ${titles.join(', ')}`,
    });
    await snsClient.send(publishCommand);
  } catch (error) {
    console.error('Error in catalogBatchProcess: ', error);
  }
}