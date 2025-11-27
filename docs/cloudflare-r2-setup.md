# Cloudflare R2 Setup Guide

This guide provides step-by-step instructions for configuring Cloudflare R2 storage for the PostMate application.

## Prerequisites

- A Cloudflare account with R2 enabled
- Access to the Cloudflare dashboard
- Your application domain configured (for CORS)

## 1. Create R2 Bucket

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2 Object Storage** in the left sidebar
3. Click **Create bucket**
4. Enter the bucket name: `postmate-files`
5. Select your preferred location (leave as automatic for best performance)
6. Click **Create bucket**

The bucket will be used to store:
- Brand voice documents
- Persona documents
- Knowledge base files
- Example content files

## 2. Generate R2 API Token

1. In the Cloudflare Dashboard, navigate to **R2 Object Storage**
2. Click **Manage R2 API Tokens** (or go to **My Profile** > **API Tokens**)
3. Click **Create API Token**
4. Configure the token:
   - **Token name**: `postmate-r2-access`
   - **Permissions**: Select **Object Read & Write**
   - **Specify bucket(s)**: Select `postmate-files` (recommended) or allow access to all buckets
   - **TTL**: Set an appropriate expiration or leave as non-expiring for production
5. Click **Create API Token**
6. **Important**: Copy and save the following credentials immediately (they will only be shown once):
   - **Access Key ID**
   - **Secret Access Key**
   - **Account ID** (visible in the R2 dashboard URL or account settings)

## 3. Configure CORS Policy

1. In the Cloudflare Dashboard, navigate to **R2 Object Storage**
2. Click on the `postmate-files` bucket
3. Go to the **Settings** tab
4. Scroll to **CORS Policy** and click **Add CORS policy**
5. Add the following configuration:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-production-domain.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Content-Type"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

6. Replace `https://your-production-domain.com` with your actual production domain
7. Click **Save**

### CORS Configuration Notes

- **AllowedOrigins**: Include all domains where your app will run (localhost for development, production domain for deployment)
- **AllowedMethods**: Required for file upload (PUT) and download (GET) operations
- **AllowedHeaders**: Using `*` allows all headers; you can restrict this for additional security
- **ExposeHeaders**: These headers are needed for proper file handling on the client
- **MaxAgeSeconds**: Preflight request cache duration (3600 = 1 hour)

## 4. Configure Environment Variables

After completing the above steps, add the following environment variables to your local `.env` file:

```env
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=postmate-files
```

For production deployment, configure these as secrets in Cloudflare Workers:

```bash
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
```

The `R2_ACCOUNT_ID` and `R2_BUCKET_NAME` can be set in `wrangler.jsonc` as regular environment variables since they are not sensitive.

## 5. Verify Configuration

To verify your R2 setup is working:

1. Ensure your local `.env` file has all required variables
2. Run the development server: `bun run dev`
3. Test file upload functionality through the application

## R2 Bucket Structure

Files will be organized in the bucket using the following structure:

```
postmate-files/
  {workspaceId}/
    brand-voices/
      {fileId}-{sanitizedFilename}
    personas/
      {fileId}-{sanitizedFilename}
    knowledge-base/
      {fileId}-{sanitizedFilename}
    examples/
      {fileId}-{sanitizedFilename}
```

## File Size and Type Limits

- **Maximum file size**: 15 MB (15,728,640 bytes)
- **Allowed file types**:
  - Plain text: `.txt`
  - PDF: `.pdf`
  - Word documents: `.doc`, `.docx`
  - Images: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`

## Troubleshooting

### CORS Errors

If you encounter CORS errors:
1. Verify the CORS policy includes your origin domain
2. Check that the bucket name matches your configuration
3. Ensure the API token has the correct permissions

### Authentication Errors

If you receive 403 Forbidden errors:
1. Verify your Access Key ID and Secret Access Key are correct
2. Check that the API token has not expired
3. Confirm the token has Object Read & Write permissions for the bucket

### Connection Issues

If you cannot connect to R2:
1. Verify your Account ID is correct
2. Check your network connectivity
3. Ensure the R2 endpoint URL is correctly formatted

## Security Best Practices

1. **Never commit secrets**: Add `.env` to `.gitignore` (already configured)
2. **Use Cloudflare secrets**: Store sensitive values like `R2_SECRET_ACCESS_KEY` as Cloudflare secrets for production
3. **Restrict bucket access**: Use bucket-specific API tokens rather than account-wide tokens
4. **Set token expiration**: Configure API token TTL for production environments
5. **Monitor usage**: Enable R2 analytics to monitor bucket usage and detect anomalies
