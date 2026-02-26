const Minio = require('minio')
const config = require('./env')

const minioClient = new Minio.Client({
  endPoint: config.MINIO_ENDPOINT,
  port: config.MINIO_PORT,
  useSSL: config.MINIO_USE_SSL,
  accessKey: config.MINIO_ACCESS_KEY,
  secretKey: config.MINIO_SECRET_KEY,
})

const initBucket = async () => {
  try {
    const bucketExists = await minioClient.bucketExists(config.MINIO_BUCKET)

    if (!bucketExists) {
      await minioClient.makeBucket(config.MINIO_BUCKET, 'us-east-1')
      console.log(`[MinIO] Bucket '${config.MINIO_BUCKET}' created successfully`)

      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${config.MINIO_BUCKET}/public/*`],
          },
        ],
      }

      await minioClient.setBucketPolicy(config.MINIO_BUCKET, JSON.stringify(policy))
      console.log(`[MinIO] Bucket policy set successfully`)
    } else {
      console.log(`[MinIO] Bucket '${config.MINIO_BUCKET}' already exists`)
    }
  } catch (error) {
    console.error('[MinIO] Error initializing MinIO bucket:', error.message)
    throw error
  }
}

const uploadFile = async (file, metadata = {}) => {
  try {
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(7)
    const filename = `${timestamp}-${randomString}-${file.originalname}`

    const metaData = {
      'Content-Type': file.mimetype,
      'Original-Name': Buffer.from(file.originalname).toString('base64'),
      ...metadata
    }

    await minioClient.putObject(
      config.MINIO_BUCKET,
      filename,
      file.buffer,
      file.size,
      metaData
    )

    return {
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      minioBucket: config.MINIO_BUCKET,
      minioKey: filename,
    }
  } catch (error) {
    console.error('[MinIO] Error uploading file to MinIO:', error.message)
    throw error
  }
}

const downloadFile = async (filename) => {
  try {
    const dataStream = await minioClient.getObject(config.MINIO_BUCKET, filename)
    return dataStream
  } catch (error) {
    console.error('[MinIO] Error downloading file from MinIO:', error.message)
    throw error
  }
}

const deleteFile = async (filename) => {
  try {
    await minioClient.removeObject(config.MINIO_BUCKET, filename)
    console.log(`[MinIO] File '${filename}' deleted from MinIO`)
  } catch (error) {
    console.error('[MinIO] Error deleting file from MinIO:', error.message)
    throw error
  }
}

const getFileUrl = async (filename, expirySeconds = 3600) => {
  try {
    const url = await minioClient.presignedGetObject(
      config.MINIO_BUCKET,
      filename,
      expirySeconds
    )
    return url
  } catch (error) {
    console.error('[MinIO] Error generating file URL:', error.message)
    throw error
  }
}

module.exports = {
  minioClient,
  initBucket,
  uploadFile,
  downloadFile,
  deleteFile,
  getFileUrl,
}
