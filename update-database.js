// Script để cập nhật database structure
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

async function updateDatabase() {
    console.log('🔧 Đang cập nhật cấu trúc database...\n');
    
    try {
        // Thêm cột s3_key và url vào bảng documents
        console.log('1. Thêm cột s3_key và url vào bảng documents...');
        await pool.query(`
            ALTER TABLE documents 
            ADD COLUMN IF NOT EXISTS s3_key VARCHAR(500),
            ADD COLUMN IF NOT EXISTS url TEXT
        `);
        console.log('   ✅ Đã thêm cột s3_key và url');
        
        // Kiểm tra lại cấu trúc
        console.log('\n2. Kiểm tra cấu trúc bảng documents:');
        const result = await pool.query(`
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns 
            WHERE table_name = 'documents'
            ORDER BY ordinal_position
        `);
        
        result.rows.forEach(row => {
            const length = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
            console.log(`   - ${row.column_name}: ${row.data_type}${length}`);
        });
        
        console.log('\n✅ Cập nhật database thành công!');
        
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        await pool.end();
    }
}

updateDatabase();
