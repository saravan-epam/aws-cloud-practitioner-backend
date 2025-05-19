"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const s3Client = new client_s3_1.S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME || "";
const UPLOADED_FOLDER = process.env.UPLOADED_FOLDER || "uploaded";
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || "*";
const main = async (event) => {
    console.log("Received event for generating signed URL:", JSON.stringify(event, null, 2));
    try {
        const fileName = event.queryStringParameters?.name;
        if (!fileName) {
            return {
                statusCode: 400,
                headers: getCorsHeaders(),
                body: JSON.stringify({
                    message: "File name is missing or invalid",
                }),
            };
        }
        if (!fileName.toLowerCase().endsWith(".csv")) {
            return {
                statusCode: 400,
                headers: getCorsHeaders(),
                body: JSON.stringify({
                    message: "Only .csv files are allowed",
                }),
            };
        }
        // Generate a presigned URL for uploading to S3
        const key = `${UPLOADED_FOLDER}/${fileName}`;
        const putObjectParams = {
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: "text/csv",
        };
        const command = new client_s3_1.PutObjectCommand(putObjectParams);
        const signedUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn: 60 });
        console.log(`Successfully created signed URL for file: ${key}`, signedUrl);
        return {
            statusCode: 200,
            headers: getCorsHeaders(),
            body: JSON.stringify({
                signedUrl,
            }),
        };
    }
    catch (error) {
        console.error("Failed to generate signed URL:", error);
        return {
            statusCode: 500,
            headers: getCorsHeaders(),
            body: JSON.stringify({
                message: "An error occurred while generating the upload URL",
                error: error.message || "Unknown error occurred",
            }),
        };
    }
};
exports.main = main;
const getCorsHeaders = () => {
    return {
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
        "Access-Control-Allow-Credentials": true,
    };
};
