import {DynamoDBClient, PutItemCommand, ScanCommand, UpdateItemCommand} from "@aws-sdk/client-dynamodb";

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const productTableName = process.env.PRODUCT_TABLE_NAME as string;
const stockTableName = process.env.STOCK_TABLE_NAME as string;

exports.handler = async (event: any) => {
  try {
    const body = JSON.parse(event.body);

    const { title, price, description } = body;
    if (!title || !price) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "title and price are required fields" }),
      };
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

    // Count the total number of products in the products table
    const scanCommand = new ScanCommand({
      TableName: productTableName,
      Select: "COUNT",
    });

    const scanResult = await dynamoDB.send(scanCommand);
    const totalProducts = scanResult.Count || 0;

    // Update the stock table with the total product count
    const stockCommand = new UpdateItemCommand({
      TableName: stockTableName,
      Key: {
        product_id: { S: "global" }, // Use a global key for stock count
      },
      UpdateExpression: "SET #count = :count",
      ExpressionAttributeNames: {
        "#count": "count",
      },
      ExpressionAttributeValues: {
        ":count": { N: totalProducts.toString() },
      },
    });

    await dynamoDB.send(stockCommand);

    return {
      statusCode: 201,
      body: JSON.stringify({ message: "Product created successfully" }),
    };
  } catch (error: any) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to create product", error: error?.message }),
    };
  }
}
