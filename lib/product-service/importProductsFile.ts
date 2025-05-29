import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: process.env.AWS_REGION });
const bucketName = process.env.BUCKET_NAME as string;

exports.handler = async (event: any) => {
  try {
    const fileName = event.queryStringParameters?.fileName;

    if (!fileName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "fileName query parameter is required" }),
      };
    }

    const key = `uploaded/${fileName}`;
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // URL valid for 1 hour

    return {
      statusCode: 200,
      body: JSON.stringify({ signedUrl }),
    };
  } catch (error: any) {
    console.error("Error generating signed URL:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to generate signed URL", error: error.message }),
    };
  }
};