// Script tạo S3 bucket
require('dotenv').config();
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

async function createBucket() {
    const bucketName = process.env.S3_BUCKET_NAME;
    
    console.log('🪣 Đang kiểm tra và tạo S3 bucket...\n');
    console.log('Bucket name:', bucketName);
    console.log('Region:', process.env.AWS_REGION);
    console.log('');
    
    try {
        // Kiểm tra bucket đã tồn tại chưa
        console.log('1. Kiểm tra bucket có tồn tại...');
        try {
            await s3.headBucket({ Bucket: bucketName }).promise();
            console.log('   ✅ Bucket đã tồn tại!\n');
            
            // List các file trong bucket
            console.log('2. Kiểm tra nội dung bucket:');
            const objects = await s3.listObjectsV2({ 
                Bucket: bucketName,
                MaxKeys: 10
            }).promise();
            
            if (objects.Contents && objects.Contents.length > 0) {
                console.log(`   📁 Có ${objects.Contents.length} file:`);
                objects.Contents.forEach(obj => {
                    console.log(`      - ${obj.Key} (${obj.Size} bytes)`);
                });
            } else {
                console.log('   📭 Bucket trống');
            }
            return;
        } catch (headError) {
            if (headError.code === 'NotFound' || headError.code === 'NoSuchBucket') {
                console.log('   ⚠️  Bucket chưa tồn tại, đang tạo mới...\n');
            } else {
                throw headError;
            }
        }
        
        // Tạo bucket mới
        console.log('2. Tạo bucket mới...');
        const params = {
            Bucket: bucketName,
            CreateBucketConfiguration: {
                LocationConstraint: process.env.AWS_REGION
            }
        };
        
        await s3.createBucket(params).promise();
        console.log('   ✅ Đã tạo bucket thành công!\n');
        
        // Tạo thư mục documents
        console.log('3. Tạo thư mục documents/...');
        await s3.putObject({
            Bucket: bucketName,
            Key: 'documents/',
            Body: ''
        }).promise();
        console.log('   ✅ Đã tạo thư mục documents/\n');
        
        // Cấu hình CORS cho bucket
        console.log('4. Cấu hình CORS...');
        const corsParams = {
            Bucket: bucketName,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ['*'],
                        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
                        AllowedOrigins: ['*'],
                        ExposeHeaders: []
                    }
                ]
            }
        };
        
        await s3.putBucketCors(corsParams).promise();
        console.log('   ✅ Đã cấu hình CORS\n');
        
        console.log('🎉 Hoàn tất! Bucket đã sẵn sàng sử dụng.');
        
    } catch (error) {
        console.error('\n❌ Lỗi:', error.message);
        console.error('Code:', error.code);
        
        if (error.code === 'InvalidAccessKeyId' || error.code === 'SignatureDoesNotMatch') {
            console.error('\n⚠️  Lỗi xác thực AWS. Vui lòng kiểm tra:');
            console.error('   - AWS_ACCESS_KEY_ID');
            console.error('   - AWS_SECRET_ACCESS_KEY');
        }
        
        if (error.code === 'BucketAlreadyExists') {
            console.error('\n⚠️  Bucket name đã được sử dụng bởi tài khoản khác.');
            console.error('   Thử đổi tên bucket trong file .env');
        }
    }
}

createBucket();
