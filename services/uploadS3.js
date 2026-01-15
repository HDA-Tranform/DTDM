// AWS SDK v3 - Mới nhất, được khuyến nghị
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

let _s3Client = null;
function getS3Client() {
  if (_s3Client) return _s3Client;

  const region = process.env.AWS_REGION || 'ap-southeast-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  // If credentials are provided, use them explicitly; otherwise, allow SDK to use the default chain.
  const config = { region };
  if (accessKeyId && secretAccessKey) {
    config.credentials = { accessKeyId, secretAccessKey };
  }

  _s3Client = new S3Client(config);
  return _s3Client;
}

function getBucketName() {
  return process.env.S3_BUCKET_NAME;
}

/**
 * Upload file lên AWS S3 (SDK v3)
 * @param {Buffer} fileBuffer - Buffer data của file
 * @param {String} fileName - Tên file gốc
 * @param {String} mimetype - Loại file (application/pdf, image/png, etc.)
 * @returns {Promise<Object>} - Object chứa thông tin file đã upload
 */
const uploadToS3 = async (fileBuffer, fileName, mimetype) => {
  const BUCKET_NAME = getBucketName();
  if (!BUCKET_NAME) {
    throw new Error("S3 chưa được cấu hình (thiếu S3_BUCKET_NAME)");
  }

  // Tạo key unique cho file - GIỮ NGUYÊN tiếng Việt có dấu
  const timestamp = Date.now();
  const s3Key = `documents/${timestamp}_${fileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: mimetype,
    ContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(
      fileName
    )}`, // Hỗ trợ tên file tiếng Việt khi download
    // ACL: 'public-read' // Bỏ comment nếu muốn file public
  });

  try {
    const result = await getS3Client().send(command);
    const region = process.env.AWS_REGION || "ap-southeast-1";
    const location = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${s3Key}`;
    return {
      success: true,
      s3Key: s3Key,
      location: location,
      bucket: BUCKET_NAME,
      etag: result.ETag,
    };
  } catch (error) {
    console.error("❌ Lỗi upload S3:", error);
    throw new Error("Không thể upload file lên S3: " + error.message);
  }
};

/** (SDK v3)
 * @param {String} s3Key - Key của file trên S3
 * @returns {Promise<Boolean>}
 */
const deleteFromS3 = async (s3Key) => {
  const BUCKET_NAME = getBucketName();
  if (!BUCKET_NAME) {
    throw new Error("S3 chưa được cấu hình (thiếu S3_BUCKET_NAME)");
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  try {
    await getS3Client().send(command);
    console.log("✅ Đã xóa file khỏi S3:", s3Key);
    return true;
  } catch (error) {
    console.error("❌ Lỗi xóa file S3:", error);
    throw new Error("Không thể xóa file khỏi S3: " + error.message);
  }
};

/**
 * Tạo Presigned URL để download/xem file từ S3 (SDK v3)
 * Người dùng KHÔNG CẦN tài khoản AWS, chỉ cần link này
 * @param {String} s3Key - Key của file trên S3
 * @param {Number} expiresIn - Thời gian hết hạn (giây), mặc định 15 phút
 * @returns {Promise<String>} - Presigned URL
 */
const getPresignedUrl = async (s3Key, expiresIn = 900) => {
  const BUCKET_NAME = getBucketName();
  if (!BUCKET_NAME) {
    throw new Error("S3 chưa được cấu hình (thiếu S3_BUCKET_NAME)");
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  try {
    // Tạo link có chữ ký bảo mật, tự động hết hạn sau expiresIn giây
    const url = await getSignedUrl(getS3Client(), command, { expiresIn });
    return url;
  } catch (error) {
    console.error("❌ Lỗi tạo Presigned URL:", error);
    throw new Error("Không thể tạo link download: " + error.message);
  }
};

module.exports = {
  uploadToS3,
  deleteFromS3,
  getPresignedUrl,
};
