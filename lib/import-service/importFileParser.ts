import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { S3Event } from "aws-lambda";
import * as csv from "csv-parser";

const s3Client = new S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME || "";
const UPLOADED_FOLDER = process.env.UPLOADED_FOLDER || "uploaded";
const PARSED_FOLDER = process.env.PARSED_FOLDER || "parsed";

const processFile = async (key: string): Promise<void> => {
  const getObjectParams = { Bucket: BUCKET_NAME, Key: key };

  const s3Stream = await s3Client.send(new GetObjectCommand(getObjectParams));
  const stream = s3Stream.Body;

  if (!stream) {
    throw new Error("Unable to retrieve stream from S3 object");
  }

  return new Promise<void>((resolve, reject) => {
    stream
      // @ts-ignore - csv-parser types don't match the S3 stream type
      .pipe(csv())
      .on("data", (data: any) => {
        console.log("CSV record parsed:", JSON.stringify(data));
      })
      .on("error", (error: Error) => {
        console.error("Error occurred while parsing CSV:", error);
        reject(error);
      })
      .on("end", async () => {
        try {
          const targetKey = key.replace(
            `${UPLOADED_FOLDER}/`,
            `${PARSED_FOLDER}/`
          );

          await s3Client.send(
            new CopyObjectCommand({
              Bucket: BUCKET_NAME,
              CopySource: `${BUCKET_NAME}/${key}`,
              Key: targetKey,
            })
          );
          console.log(`File successfully copied to: ${targetKey}`);

          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: BUCKET_NAME,
              Key: key,
            })
          );
          console.log(`File successfully deleted: ${key}`);

          resolve();
        } catch (error) {
          console.error("Error moving file:", error);
          reject(error);
        }
      });
  });
};

export const main = async (event: S3Event): Promise<void> => {
  console.log("Received S3 Event: ", JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    console.log(`Starting processing for file: ${key}`);

    if (!key.startsWith(`${UPLOADED_FOLDER}/`)) {
      console.log(`Skipping file as it is not in the uploaded folder: ${key}`);
      continue;
    }

    try {
      await processFile(key);
    } catch (error) {
      console.error(`Error while processing file ${key}:`, error);
    }
  }

  console.log("CSV file processing completed successfully");
};
