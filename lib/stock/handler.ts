import { Handler } from "aws-lambda";
import {
  BatchWriteItemCommand,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const tableName = process.env.TABLE_NAME as string;

export const addStock: Handler = async (event, context) => {
  try {
    const batchWriteCommand = new BatchWriteItemCommand({
      RequestItems: {
        [tableName]: [
          {
            PutRequest: {
              Item: {
                id: { S: "7567ec4b-b10c-48c5-9345-fc73c48a80aa" },
                count: { N: "4" },
              },
            },
          },
          {
            PutRequest: {
              Item: {
                id: { S: "7567ec4b-b10c-48c5-9345-fc73c48a80a0" },
                count: { N: "6" },
              },
            },
          },
          {
            PutRequest: {
              Item: {
                id: { S: "7567ec4b-b10c-48c5-9345-fc73c48a80a2" },
                count: { N: "7" },
              },
            },
          },
          {
            PutRequest: {
              Item: {
                id: { S: "7567ec4b-b10c-48c5-9345-fc73c48a80a1" },
                count: { N: "12" },
              },
            },
          },
          {
            PutRequest: {
              Item: {
                id: { S: "7567ec4b-b10c-48c5-9345-fc73c48a80a3" },
                count: { N: "7" },
              },
            },
          },
          {
            PutRequest: {
              Item: {
                id: { S: "7567ec4b-b10c-48c5-9345-fc73348a80a1" },
                count: { N: "8" },
              },
            },
          },
          {
            PutRequest: {
              Item: {
                id: { S: "7567ec4b-b10c-48c5-9445-fc73c48a80a2" },
                count: { N: "2" },
              },
            },
          },
          {
            PutRequest: {
              Item: {
                id: { S: "7567ec4b-b10c-45c5-9345-fc73c48a80a1" },
                count: { N: "3" },
              },
            },
          },
        ],
      },
    });

    const batchWriteResult = await dynamoDB.send(batchWriteCommand);
    console.log(
      "BatchWrite succeeded:",
      JSON.stringify(batchWriteResult, null, 2)
    );

    const result = await dynamoDB.send(batchWriteCommand);

    console.log("Add stock succeeded:", JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Error adding item to DynamoDB table");
  }
};
