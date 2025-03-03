const express = require('express');
const router = express.Router();
const towerController = require('../controllers/towerController');

// Middleware untuk logging requests
router.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Test route
router.get('/', (req, res) => {
    res.json({ message: 'Tower API is working' });
});

// Tower data routes
router.get('/towers', towerController.getAllMark);
router.get('/towers/:site_id', towerController.getSectors);
router.get('/triangle-dimensions', towerController.getTriangleDimensions);

// Kabupaten routes
router.get('/kabupaten', towerController.getKabupatenList);
router.get('/kabupaten/:kabupaten/towers', towerController.getTowersByKabupaten);

// Payload routes
router.get('/payload/cellname/:cellname', towerController.getAllPayloadByCellname);
router.get('/payload/summary/:site_id', towerController.getPayloadSummary);
router.post('/payload', towerController.addPayloadData);

// Cell details route
router.get('/cells/details', towerController.getCellDetails);

// Legacy routes for backward compatibility
router.get('/cells', towerController.getAllMark);
router.get('/cells/site/:site_id', towerController.getSectors);

module.exports = router;