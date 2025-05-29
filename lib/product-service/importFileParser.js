"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_s3_1 = require("@aws-sdk/client-s3");
const csv_parser_1 = __importDefault(require("csv-parser"));
const client_sqs_1 = require("@aws-sdk/client-sqs");
const s3 = new client_s3_1.S3Client({ region: process.env.AWS_REGION });
const sqsClient = new client_sqs_1.SQSClient({ region: process.env.AWS_REGION });
exports.handler = async (event) => {
    try {
        for (const record of event.Records) {
            const bucketName = record.s3.bucket.name;
            const objectKey = record.s3.object.key;
            const command = new client_s3_1.GetObjectCommand({
                Bucket: bucketName,
                Key: objectKey,
            });
            const response = await s3.send(command);
            const stream = response.Body;
            const parsedProducts = await new Promise((resolve, reject) => {
                const products = [];
                stream
                    .pipe((0, csv_parser_1.default)())
                    .on("data", (row) => {
                    console.log("Row: ", row);
                    products.push(row);
                })
                    .on("end", () => {
                    console.log("CSV file successfully processed");
                    resolve(products);
                })
                    .on("error", (error) => {
                    console.error("Error: ", error);
                    reject(error);
                });
            });
            console.log(`Finished processing file: ${objectKey}`);
            const sqsEntries = new client_sqs_1.SendMessageBatchCommand({
                Entries: parsedProducts.map((product, index) => ({
                    Id: index.toString(),
                    MessageBody: JSON.stringify(product),
                })),
                QueueUrl: process.env.SQS_QUEUE_URL,
            });
            await sqsClient.send(sqsEntries);
            console.log("Products sent to SQS queue");
        }
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "File processed successfully" }),
        };
    }
    catch (error) {
        console.error("Error processing file:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Failed to process file", error: error.message }),
        };
    }
};
