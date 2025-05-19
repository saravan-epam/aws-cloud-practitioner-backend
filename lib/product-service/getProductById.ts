import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const productTableName = process.env.PRODUCT_TABLE_NAME as string;
const stockTableName = process.env.STOCK_TABLE_NAME as string;

exports.handler = async (event: any) => {
  try {
    const { id } = event.pathParameters || {};

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Product ID is required" }),
      };
    }

    // Fetch the product from the products table
    const productCommand = new GetItemCommand({
      TableName: productTableName,
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

    const product = productResult.Item;

    // Fetch the stock count from the stock table
    const stockCommand = new GetItemCommand({
      TableName: stockTableName,
      Key: {
        product_id: { S: id },
      },
    });
    const stockResult = await dynamoDB.send(stockCommand);
    const count = stockResult.Item?.count?.N || "0";

    // Format the product data
    const formattedProduct = {
      id: id,
      title: product.title.S,
      // @ts-ignore
      price: parseFloat(product.price.N),
      description: product.description.S,
      count: parseInt(count, 10),
    };

    return {
      statusCode: 200,
      body: JSON.stringify(formattedProduct),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    };
  } catch (error: any) {
    console.error("Error fetching product:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to fetch product", error: error?.message }),
    };
  }
};
