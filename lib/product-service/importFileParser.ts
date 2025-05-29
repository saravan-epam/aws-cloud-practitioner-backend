import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import csvParser from "csv-parser";
import { SQSClient, SendMessageBatchCommand } from "@aws-sdk/client-sqs";

const s3 = new S3Client({ region: process.env.AWS_REGION });
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

exports.handler = async (event: any) => {
  try {
    for (const record of event.Records) {
      const bucketName = record.s3.bucket.name;
      const objectKey = record.s3.object.key;

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      });

      const response = await s3.send(command);
      const stream = response.Body as Readable;

      const parsedProducts = await new Promise<any[]>((resolve, reject) => {
        const products: any[] = [];
        stream
          .pipe(csvParser())
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

      const sqsEntries = new SendMessageBatchCommand({
        Entries: parsedProducts.map((product, index) => ({
          Id: index.toString(),
          MessageBody: JSON.stringify(product),
        })),
        QueueUrl: process.env.SQS_QUEUE_URL!,
      });

      await sqsClient.send(sqsEntries);
      console.log("Products sent to SQS queue");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "File processed successfully" }),
    };
  } catch (error: any) {
    console.error("Error processing file:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to process file", error: error.message }),
    };
  }
};
