import { Handler } from "aws-lambda";
import {
  BatchWriteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const tableName = process.env.TABLE_NAME as string;

export const addProduct: Handler = async (event, context) => {
  try {
    const command = new BatchWriteItemCommand({
      RequestItems: {
        [tableName]: [
          {
            PutRequest: {
              Item: {
                description: { S: "Short Product Description1" },
                id: { S: "7567ec4b-b10c-48c5-9345-fc73c48a80aa" },
                price: { N: "2.4" },
                title: { S: "ProductOne" },
              },
            },
          },
          {
            PutRequest: {
              Item: {
                description: { S: "Short Product Description3" },
                id: { S: "7567ec4b-b10c-48c5-9345-fc73c48a80a0" },
                price: { N: "10" },
                title: { S: "ProductNew" },
              },
            },
          },
          {
            PutRequest: {
              Item: {
                description: { S: "Short Product Description2" },
                id: { S: "7567ec4b-b10c-48c5-9345-fc73c48a80a2" },
                price: { N: "23" },
                title: { S: "ProductTop" },
              },
            },
          },
          {
            PutRequest: {
              Item: {
                description: { S: "Short Product Description7" },
                id: { S: "7567ec4b-b10c-48c5-9345-fc73c48a80a1" },
                price: { N: "15" },
                title: { S: "ProductTitle" },
              },
            },
          },
          {
            PutRequest: {
              Item: {
                description: { S: "Short Product Description2" },
                id: { S: "7567ec4b-b10c-48c5-9345-fc73c48a80a3" },
                price: { N: "23" },
                title: { S: "Product" },
              },
            },
          },
          {
            PutRequest: {
              Item: {
                description: { S: "Short Product Description4" },
                id: { S: "7567ec4b-b10c-48c5-9345-fc73348a80a1" },
                price: { N: "15" },
                title: { S: "ProductTest" },
              },
            },
          },
          {
            PutRequest: {
              Item: {
                description: { S: "Short Product Descriptio1" },
                id: { S: "7567ec4b-b10c-48c5-9445-fc73c48a80a2" },
                price: { N: "23" },
                title: { S: "Product2" },
              },
            },
          },
          {
            PutRequest: {
              Item: {
                description: { S: "Short Product Description7" },
                id: { S: "7567ec4b-b10c-45c5-9345-fc73c48a80a1" },
                price: { N: "15" },
                title: { S: "ProductName" },
              },
            },
          },
        ],
      },
    });

    const result = await dynamoDB.send(command);

    console.log("Add Product succeeded:", JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Error adding item to DynamoDB table");
  }
};

export const getProductById: Handler = async (event, context) => {
  try {
    const { id } = event.pathParameters;
    const productCommand = new GetItemCommand({
      TableName: tableName,
      Key: {
        id: { S: id },
      },
    });

    const productResult = await dynamoDB.send(productCommand);

    if (!productResult.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Product not found" }),
      };
    }
    const stockCommand = new GetItemCommand({
      TableName: tableName,
      Key: {
        id: { S: id },
      },
    });

    const stockResult = await dynamoDB.send(stockCommand);

    const product = {
      id: productResult.Item.id.S,
      title: productResult.Item.title?.S,
      description: productResult.Item.description?.S,
      price: productResult.Item.price?.N,
      count: stockResult.Item?.count?.N || "0",
    };

    console.log("GetItem succeeded:", JSON.stringify(product, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify(product),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error retrieving product" }),
    };
  }
};

export const createProduct: Handler = async (event, context) => {
  try {
    const { title, description, price, count } = JSON.parse(event.body);

    if (!title || !description || !price || !count) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required fields" }),
      };
    }

    const productId = `${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const putProductCommand = new PutItemCommand({
      TableName: tableName,
      Item: {
        id: { S: productId },
        title: { S: title },
        description: { S: description },
        price: { N: price.toString() },
      },
    });

    const putStockCommand = new PutItemCommand({
      TableName: tableName,
      Item: {
        id: { S: productId },
        count: { N: count.toString() },
      },
    });

    await dynamoDB.send(putProductCommand);
    await dynamoDB.send(putStockCommand);

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Product created successfully",
        id: productId,
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error creating product" }),
    };
  }
};
