// Script migrate database lên AWS RDS
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    ssl: process.env.DB_HOST && process.env.DB_HOST.includes('rds.amazonaws.com') 
        ? { rejectUnauthorized: false } 
        : false
});

async function migrateToRDS() {
    console.log('🚀 Bắt đầu migrate database lên AWS RDS...\n');
    console.log('📍 Target:', process.env.DB_HOST);
    console.log('📊 Database:', process.env.DB_NAME);
    console.log('');
    
    try {
        // Test kết nối
        console.log('1. Kiểm tra kết nối RDS...');
        const client = await pool.connect();
        console.log('   ✅ Kết nối thành công!\n');
        
        // Tạo bảng users
        console.log('2. Tạo bảng users...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                plan VARCHAR(20) DEFAULT 'free',
                quota INTEGER DEFAULT 5,
                uploaded_files INTEGER DEFAULT 0,
                premium_activated_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ Bảng users đã sẵn sàng');
        
        // Tạo bảng documents
        console.log('3. Tạo bảng documents...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS documents (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                username VARCHAR(100),
                title VARCHAR(255) NOT NULL,
                description TEXT,
                filename VARCHAR(255) NOT NULL,
                original_name VARCHAR(255) NOT NULL,
                mimetype VARCHAR(100),
                size INTEGER,
                s3_key VARCHAR(500),
                url TEXT,
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ Bảng documents đã sẵn sàng');
        
        // Tạo bảng payment_transactions
        console.log('4. Tạo bảng payment_transactions...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS payment_transactions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                order_id VARCHAR(100) UNIQUE NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                payment_method VARCHAR(50),
                status VARCHAR(50) DEFAULT 'pending',
                transaction_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ Bảng payment_transactions đã sẵn sàng');
        
        // Tạo bảng user_stats
        console.log('5. Tạo bảng user_stats...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_stats (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                total_downloads INTEGER DEFAULT 0,
                total_uploads INTEGER DEFAULT 0,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ Bảng user_stats đã sẵn sàng');
        
        // Kiểm tra kết quả
        console.log('\n6. Kiểm tra các bảng đã tạo:');
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        tables.rows.forEach(row => {
            console.log(`   📋 ${row.table_name}`);
        });
        
        // Tạo user test (nếu chưa có)
        console.log('\n7. Tạo user test...');
        const userCheck = await client.query('SELECT COUNT(*) FROM users');
        if (userCheck.rows[0].count === '0') {
            await client.query(`
                INSERT INTO users (username, email, password, plan, quota, uploaded_files)
                VALUES ('Admin', 'admin@dtdmedu.com', 'admin123', 'premium', 999, 0)
            `);
            console.log('   ✅ Đã tạo user test: admin@dtdmedu.com / admin123');
        } else {
            console.log(`   ℹ️  Đã có ${userCheck.rows[0].count} user trong database`);
        }
        
        client.release();
        console.log('\n🎉 Migration hoàn tất! Database RDS đã sẵn sàng sử dụng.');
        console.log('\n📝 Thông tin kết nối:');
        console.log(`   Host: ${process.env.DB_HOST}`);
        console.log(`   Database: ${process.env.DB_NAME}`);
        console.log(`   Port: ${process.env.DB_PORT}`);
        
    } catch (error) {
        console.error('\n❌ Lỗi migration:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await pool.end();
    }
}

migrateToRDS();
