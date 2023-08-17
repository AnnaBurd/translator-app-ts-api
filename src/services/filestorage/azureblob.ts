import { BlobServiceClient } from "@azure/storage-blob";

import {
  STORAGE_ACCOUNT_NAME,
  STORAGE_CONNECTION_STRING,
  STORAGE_CONTAINER_NAME,
} from "../../config.js";

import logger from "../../utils/logger.js";

const storageAccount = STORAGE_ACCOUNT_NAME as string;
const connStr = STORAGE_CONNECTION_STRING as string;
const containerName = STORAGE_CONTAINER_NAME as string;

const blobServiceClient = BlobServiceClient.fromConnectionString(connStr);
const containerClient = blobServiceClient.getContainerClient(containerName);

export const uploadBlob = async (file: Express.Multer.File) => {
  const blobName = `${Date.now()}-${Buffer.from(
    file.originalname,
    "latin1"
  ).toString("utf8")}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const uploadBlobResponse = await blockBlobClient.upload(
    file.buffer,
    file.buffer.byteLength
  );
  console.log(
    `Upload block blob ${blobName} successfully`,
    uploadBlobResponse.requestId
  );
  console.log(uploadBlobResponse);

  return `https://${storageAccount}.blob.core.windows.net/${containerName}/${blobName}`;
};

export const deleteBlob = async (blobName: string) => {
  try {
    await containerClient.deleteBlob(blobName);
  } catch (error) {
    logger.error("Error deleting blob ", error);
  }
};
