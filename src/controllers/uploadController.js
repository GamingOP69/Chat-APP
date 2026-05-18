const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('../../config');
const crypto = require('crypto');

async function getPresignUrl(req, res, next) {
  try {
    if (!config.s3.bucket || !config.s3.region) {
      return res.status(501).json({ error: 'S3 not configured on server' });
    }

    const s3Client = new S3Client({
      region: config.s3.region,
      credentials: config.s3.accessKeyId ? {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      } : undefined,
    });

    const key = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const command = new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      ACL: 'private',
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    res.json({ url, key, expiresIn: 300, bucket: config.s3.bucket });
  } catch (error) {
    next(error);
  }
}

module.exports = { getPresignUrl };
