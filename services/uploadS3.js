const AWS = require('aws-sdk');

// Cấu hình S3 với thông tin từ nhóm AWS
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

/**
 * Upload file lên AWS S3
 * @param {Buffer} fileBuffer - Buffer data của file
 * @param {String} fileName - Tên file gốc
 * @param {String} mimetype - Loại file (application/pdf, etc.)
 * @returns {Promise<Object>} - Object chứa thông tin file đã upload
 */
const uploadToS3 = async (fileBuffer, fileName, mimetype) => {
  // Tạo key unique cho file - GIỮ NGUYÊN tiếng Việt có dấu
  const timestamp = Date.now();
  // Encode URI để giữ ký tự tiếng Việt
  const s3Key = `documents/${timestamp}_${fileName}`;

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: mimetype,
    ContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`, // Hỗ trợ tên file tiếng Việt khi download
    // ACL: 'public-read' // Bỏ comment nếu muốn file public
  };

  try {
    const result = await s3.upload(params).promise();
    
    return {
      success: true,
      s3Key: result.Key,
      location: result.Location,
      bucket: result.Bucket,
      etag: result.ETag
    };
  } catch (error) {
    console.error('❌ Lỗi upload S3:', error);
    throw new Error('Không thể upload file lên S3: ' + error.message);
  }
};

/**
 * Xóa file khỏi S3
 * @param {String} s3Key - Key của file trên S3
 * @returns {Promise<Boolean>}
 */
const deleteFromS3 = async (s3Key) => {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: s3Key
  };

  try {
    await s3.deleteObject(params).promise();
    console.log('✅ Đã xóa file khỏi S3:', s3Key);
    return true;
  } catch (error) {
    console.error('❌ Lỗi xóa file S3:', error);
    throw new Error('Không thể xóa file khỏi S3: ' + error.message);
  }
};

/**
 * Tạo URL có thời hạn để download file từ S3
 * @param {String} s3Key - Key của file trên S3
 * @param {Number} expiresIn - Thời gian hết hạn (giây), mặc định 1 giờ
 * @returns {String} - Signed URL
 */
const getSignedUrl = (s3Key, expiresIn = 3600) => {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: s3Key,
    Expires: expiresIn
  };

  return s3.getSignedUrl('getObject', params);
};

module.exports = {
  uploadToS3,
  deleteFromS3,
  getSignedUrl,
  s3
};
