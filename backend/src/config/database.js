const mysql = require('mysql2/promise');
require('dotenv').config();

const isDevelopment = process.env.NODE_ENV === 'development';

const config = {
    host: process.env.DB_HOST || '156.67.218.186',
    user: process.env.DB_USER || 'zenni',
    password: process.env.DB_PASSWORD || '#ICTelkomJabar1',
    database: process.env.DB_NAME || 'towerdb',
    port: parseInt(process.env.DB_PORT || '3306'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Tambahan konfigurasi untuk production
    ...(isDevelopment ? {} : {
        ssl: {
            rejectUnauthorized: false
        }
    })
};

// Buat pool connection untuk handling multiple queries
const pool = mysql.createPool(config);

// Test koneksi dengan retry mechanism
const testConnection = async (retries = 5) => {
    for (let i = 0; i < retries; i++) {
        try {
            const connection = await pool.getConnection();
            console.log('Database connected successfully to', process.env.DB_NAME);
            console.log('Environment:', process.env.NODE_ENV);
            connection.release();
            return true;
        } catch (err) {
            console.error(`Attempt ${i + 1}/${retries} - Error connecting to the database:`, err.message);
            if (i === retries - 1) {
                throw new Error(`Failed to connect to database after ${retries} attempts`);
            }
            // Tunggu 5 detik sebelum mencoba lagi
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
};

// Panggil inisialisasi saat startup
testConnection().catch(err => {
    console.error('Database initialization failed:', err);
    process.exit(1);
});

// Export pool untuk digunakan di controller
module.exports = pool;