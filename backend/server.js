const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const towerRoutes = require('./src/routes/towerRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json());

// Debug logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// API routes
app.use('/api', towerRoutes);

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Server is running' });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
        path: req.path
    });
});

const PORT = process.env.PORT || 3000;

// Start server
const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
});

// Handle server errors
server.on('error', (error) => {
    console.error('Server failed to start:', error);
});

module.exports = app;