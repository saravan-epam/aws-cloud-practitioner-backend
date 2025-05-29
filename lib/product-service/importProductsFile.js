"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3 = new client_s3_1.S3Client({ region: process.env.AWS_REGION });
const bucketName = process.env.BUCKET_NAME;
exports.handler = async (event) => {
    try {
        const fileName = event.queryStringParameters?.fileName;
        if (!fileName) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "fileName query parameter is required" }),
            };
        }
        const key = `uploaded/${fileName}`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: bucketName,
            Key: key,
        });
        const signedUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3, command, { expiresIn: 3600 }); // URL valid for 1 hour
        return {
            statusCode: 200,
            body: JSON.stringify({ signedUrl }),
        };
    }
    catch (error) {
        console.error("Error generating signed URL:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Failed to generate signed URL", error: error.message }),
        };
    }
};
