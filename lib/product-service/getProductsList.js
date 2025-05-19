"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const dynamoDB = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION });
const productTableName = process.env.PRODUCT_TABLE_NAME;
const stockTableName = process.env.STOCK_TABLE_NAME;
exports.handler = async (event) => {
    try {
        // Fetch all products from the products table
        const scanCommand = new client_dynamodb_1.ScanCommand({
            TableName: productTableName,
        });
        const productsResult = await dynamoDB.send(scanCommand);
        const products = productsResult.Items || [];
        // Fetch stock count for each product and format the response
        const productList = await Promise.all(products.map(async (product) => {
            const productId = product.id.S;
            // Fetch stock count from the stock table
            const stockCommand = new client_dynamodb_1.GetItemCommand({
                TableName: stockTableName,
                Key: {
                    // @ts-ignore
                    product_id: { S: productId },
                },
            });
            const stockResult = await dynamoDB.send(stockCommand);
            const count = stockResult.Item?.count?.N || "0";
            // Format the product data
            return {
                id: productId,
                title: product.title.S,
                // @ts-ignore
                price: parseFloat(product.price.N),
                description: product.description.S,
                count: parseInt(count, 10),
            };
        }));
        return {
            statusCode: 200,
            body: JSON.stringify(productList),
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        };
    }
    catch (error) {
        console.error("Error fetching products:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Failed to fetch products", error: error?.message }),
        };
    }
};
