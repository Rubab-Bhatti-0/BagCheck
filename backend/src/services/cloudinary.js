'use strict';

const crypto = require('crypto');
const https = require('https');

function uploadImage(file) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const publicId = crypto.randomBytes(16).toString('hex');
  const signedParams = `folder=bagcheck&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(`${signedParams}${apiSecret}`).digest('hex');
  const boundary = `----BagCheck${crypto.randomBytes(16).toString('hex')}`;
  const filename = (file.originalname || 'image').split(/[\\/]/).pop().replace(/[\r\n"]/g, '_');
  const fields = {
    api_key: apiKey,
    timestamp,
    folder: 'bagcheck',
    public_id: publicId,
    signature,
  };
  const parts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${file.mimetype}\r\n\r\n`,
    file.buffer,
    '\r\n',
    ...Object.entries(fields).flatMap(([name, value]) => [
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
    ]),
    `--${boundary}--\r\n`,
  ];
  const body = Buffer.concat(parts.map((part) => Buffer.isBuffer(part) ? part : Buffer.from(part)));

  return new Promise((resolve, reject) => {
    const request = https.request({
      method: 'POST',
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        let result;
        try {
          result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch (error) {
          reject(new Error('Cloudinary returned an invalid response.'));
          return;
        }

        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(result.error?.message || `Cloudinary responded with status ${response.statusCode}.`));
          return;
        }
        if (!result.secure_url) {
          reject(new Error('Cloudinary upload response did not include an image URL.'));
          return;
        }
        resolve(result.secure_url);
      });
    });

    request.setTimeout(30000, () => request.destroy(new Error('Cloudinary upload timed out.')));
    request.on('error', reject);
    request.end(body);
  });
}

module.exports = { uploadImage };
