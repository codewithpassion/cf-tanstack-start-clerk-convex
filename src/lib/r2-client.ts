/**
 * R2 client for interacting with Cloudflare R2 object storage.
 * Provides functions to generate presigned URLs for upload and download operations.
 */
import {
	S3Client,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Default expiration times in seconds
export const DEFAULT_UPLOAD_EXPIRY = 300; // 5 minutes
export const DEFAULT_DOWNLOAD_EXPIRY = 3600; // 1 hour

// Lazy initialization of S3 client to avoid issues during module load
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
	if (s3Client) {
		return s3Client;
	}

	const accountId = process.env.R2_ACCOUNT_ID;
	const accessKeyId = process.env.R2_ACCESS_KEY_ID;
	const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

	if (!accountId || !accessKeyId || !secretAccessKey) {
		throw new Error(
			"R2 credentials not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables.",
		);
	}

	s3Client = new S3Client({
		region: "auto",
		endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId,
			secretAccessKey,
		},
	});

	return s3Client;
}

function getBucketName(): string {
	const bucketName = process.env.R2_BUCKET_NAME;
	if (!bucketName) {
		throw new Error(
			"R2_BUCKET_NAME environment variable is not configured.",
		);
	}
	return bucketName;
}

/**
 * Generates a presigned PUT URL for uploading a file to R2.
 * @param key - The R2 object key (path/filename)
 * @param contentType - The MIME type of the file
 * @param expiresIn - URL expiration time in seconds (default: 5 minutes)
 * @returns Presigned PUT URL
 */
export async function generateUploadUrl(
	key: string,
	contentType: string,
	expiresIn: number = DEFAULT_UPLOAD_EXPIRY,
): Promise<string> {
	const client = getS3Client();
	const bucketName = getBucketName();

	const command = new PutObjectCommand({
		Bucket: bucketName,
		Key: key,
		ContentType: contentType,
	});

	const url = await getSignedUrl(client, command, { expiresIn });
	return url;
}

/**
 * Generates a presigned GET URL for downloading a file from R2.
 * @param key - The R2 object key (path/filename)
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Presigned GET URL
 */
export async function generateDownloadUrl(
	key: string,
	expiresIn: number = DEFAULT_DOWNLOAD_EXPIRY,
): Promise<string> {
	const client = getS3Client();
	const bucketName = getBucketName();

	const command = new GetObjectCommand({
		Bucket: bucketName,
		Key: key,
	});

	const url = await getSignedUrl(client, command, { expiresIn });
	return url;
}

/**
 * Fetches file content from R2 as a Buffer.
 * Used for text extraction after upload confirmation.
 * @param key - The R2 object key
 * @returns File content as Buffer, or null if fetch fails
 */
export async function fetchFileContent(key: string): Promise<Buffer | null> {
	try {
		const client = getS3Client();
		const bucketName = getBucketName();

		const command = new GetObjectCommand({
			Bucket: bucketName,
			Key: key,
		});

		const response = await client.send(command);

		if (!response.Body) {
			console.error("R2 response has no body for key:", key);
			return null;
		}

		// Convert the readable stream to a Buffer
		const chunks: Uint8Array[] = [];
		const stream = response.Body as AsyncIterable<Uint8Array>;

		for await (const chunk of stream) {
			chunks.push(chunk);
		}

		return Buffer.concat(chunks);
	} catch (error) {
		console.error("Failed to fetch file from R2:", error);
		return null;
	}
}

/**
 * Deletes an object from R2 storage.
 * @param key - The R2 object key to delete
 */
export async function deleteObject(key: string): Promise<void> {
	const client = getS3Client();
	const bucketName = getBucketName();

	const command = new DeleteObjectCommand({
		Bucket: bucketName,
		Key: key,
	});

	await client.send(command);
}

/**
 * Resets the S3 client instance (used for testing).
 */
export function resetClient(): void {
	s3Client = null;
}
