// Test kết nối AWS RDS và S3
require('dotenv').config();
const { Pool } = require('pg');
const AWS = require('aws-sdk');

console.log('🔍 Đang kiểm tra cấu hình AWS...\n');

// Kiểm tra biến môi trường
console.log('📝 Biến môi trường:');
console.log('- DB_HOST:', process.env.DB_HOST);
console.log('- DB_NAME:', process.env.DB_NAME);
console.log('- DB_USER:', process.env.DB_USER);
console.log('- DB_PASS:', process.env.DB_PASS ? '✓ Đã set' : '✗ Chưa set');
console.log('- AWS_REGION:', process.env.AWS_REGION);
console.log('- S3_BUCKET_NAME:', process.env.S3_BUCKET_NAME);
console.log('- AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✓ Đã set' : '✗ Chưa set');
console.log('- AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✓ Đã set' : '✗ Chưa set');
console.log('');

// Test PostgreSQL RDS
async function testDatabase() {
    console.log('🔌 Đang kết nối PostgreSQL...');
    const pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        connectionTimeoutMillis: 5000,
        ssl: process.env.DB_HOST && process.env.DB_HOST.includes('rds.amazonaws.com') 
            ? { rejectUnauthorized: false } 
            : false // Tắt SSL cho localhost
    });

    try {
        const client = await pool.connect();
        console.log('✅ Kết nối PostgreSQL thành công!');
        
        // Kiểm tra version
        const versionResult = await client.query('SELECT version()');
        console.log('📊 PostgreSQL Version:', versionResult.rows[0].version.split(',')[0]);
        
        // Kiểm tra các bảng
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        console.log('📋 Các bảng trong database:');
        if (tablesResult.rows.length > 0) {
            tablesResult.rows.forEach(row => {
                console.log('  -', row.table_name);
            });
        } else {
            console.log('  ⚠️  Chưa có bảng nào. Vui lòng chạy database-setup.sql');
        }
        
        // Kiểm tra cấu trúc bảng documents
        const columnsResult = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'documents'
            ORDER BY ordinal_position
        `);
        
        if (columnsResult.rows.length > 0) {
            console.log('\n📐 Cấu trúc bảng documents:');
            columnsResult.rows.forEach(row => {
                console.log(`  - ${row.column_name}: ${row.data_type}`);
            });
        }
        
        client.release();
        await pool.end();
        return true;
    } catch (error) {
        console.error('❌ Lỗi kết nối PostgreSQL:', error.message);
        await pool.end();
        return false;
    }
}

// Test S3
async function testS3() {
    console.log('\n☁️  Đang kiểm tra AWS S3...');
    
    const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION
    });

    try {
        // Kiểm tra bucket có tồn tại
        const params = {
            Bucket: process.env.S3_BUCKET_NAME
        };
        
        await s3.headBucket(params).promise();
        console.log('✅ Kết nối S3 thành công!');
        console.log('🪣 Bucket:', process.env.S3_BUCKET_NAME);
        
        // List một số file trong bucket
        const listParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            MaxKeys: 5,
            Prefix: 'documents/'
        };
        
        const data = await s3.listObjectsV2(listParams).promise();
        console.log('📦 Số file trong thư mục documents/:', data.KeyCount);
        
        if (data.Contents && data.Contents.length > 0) {
            console.log('📄 File gần đây:');
            data.Contents.forEach(item => {
                const size = (item.Size / 1024).toFixed(2);
                console.log(`  - ${item.Key} (${size} KB)`);
            });
        }
        
        return true;
    } catch (error) {
        console.error('❌ Lỗi kết nối S3:', error.message);
        if (error.code === 'NoSuchBucket') {
            console.log('⚠️  Bucket không tồn tại hoặc sai tên.');
        } else if (error.code === 'InvalidAccessKeyId') {
            console.log('⚠️  Access Key ID không hợp lệ.');
        } else if (error.code === 'SignatureDoesNotMatch') {
            console.log('⚠️  Secret Access Key không đúng.');
        }
        return false;
    }
}

// Chạy test
async function runTests() {
    console.log('═══════════════════════════════════════════════');
    console.log('     🧪 TEST KẾT NỐI AWS - DTDM.edu');
    console.log('═══════════════════════════════════════════════\n');
    
    const dbOk = await testDatabase();
    const s3Ok = await testS3();
    
    console.log('\n═══════════════════════════════════════════════');
    console.log('📊 KẾT QUẢ:');
    console.log('═══════════════════════════════════════════════');
    console.log('PostgreSQL RDS:', dbOk ? '✅ OK' : '❌ FAILED');
    console.log('AWS S3:', s3Ok ? '✅ OK' : '❌ FAILED');
    console.log('═══════════════════════════════════════════════\n');
    
    if (dbOk && s3Ok) {
        console.log('🎉 Tất cả dịch vụ đã sẵn sàng! Bạn có thể chạy server.');
    } else {
        console.log('⚠️  Vui lòng kiểm tra lại cấu hình trong file .env');
    }
    
    process.exit(dbOk && s3Ok ? 0 : 1);
}

runTests();
