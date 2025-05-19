"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const csv = __importStar(require("csv-parser"));
const s3Client = new client_s3_1.S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME || "";
const UPLOADED_FOLDER = process.env.UPLOADED_FOLDER || "uploaded";
const PARSED_FOLDER = process.env.PARSED_FOLDER || "parsed";
const processFile = async (key) => {
    const getObjectParams = { Bucket: BUCKET_NAME, Key: key };
    const s3Stream = await s3Client.send(new client_s3_1.GetObjectCommand(getObjectParams));
    const stream = s3Stream.Body;
    if (!stream) {
        throw new Error("Unable to retrieve stream from S3 object");
    }
    return new Promise((resolve, reject) => {
        stream
            // @ts-ignore - csv-parser types don't match the S3 stream type
            .pipe(csv())
            .on("data", (data) => {
            console.log("CSV record parsed:", JSON.stringify(data));
        })
            .on("error", (error) => {
            console.error("Error occurred while parsing CSV:", error);
            reject(error);
        })
            .on("end", async () => {
            try {
                const targetKey = key.replace(`${UPLOADED_FOLDER}/`, `${PARSED_FOLDER}/`);
                await s3Client.send(new client_s3_1.CopyObjectCommand({
                    Bucket: BUCKET_NAME,
                    CopySource: `${BUCKET_NAME}/${key}`,
                    Key: targetKey,
                }));
                console.log(`File successfully copied to: ${targetKey}`);
                await s3Client.send(new client_s3_1.DeleteObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: key,
                }));
                console.log(`File successfully deleted: ${key}`);
                resolve();
            }
            catch (error) {
                console.error("Error moving file:", error);
                reject(error);
            }
        });
    });
};
const main = async (event) => {
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
        }
        catch (error) {
            console.error(`Error while processing file ${key}:`, error);
        }
    }
    console.log("CSV file processing completed successfully");
};
exports.main = main;
