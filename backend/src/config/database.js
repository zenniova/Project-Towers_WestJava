const mysql = require('mysql2/promise');
require('dotenv').config();

// Buat pool connection untuk handling multiple queries
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'towerdb',
    port: parseInt(process.env.DB_PORT || '3306'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test koneksi
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('Database connected successfully to', process.env.DB_NAME);
        connection.release();
    } catch (err) {
        console.error('Error connecting to the database:', err);
        process.exit(1); // Exit jika tidak bisa connect ke database
    }
};

testConnection();

// Export pool untuk digunakan di controller
module.exports = pool;