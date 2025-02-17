import { useState, useCallback } from 'react';
import axios from 'axios';

// Simple cache implementation
const cache = new Map();

export const useTowerData = () => {
    const [tower, setTower] = useState(null);
    const [towerData, setTowerData] = useState(null);
    const [cellData, setCellData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const searchTower = useCallback(async (siteId) => {
        setLoading(true);
        setError(null);

        // Check cache first
        const cacheKey = `tower-${siteId}`;
        if (cache.has(cacheKey)) {
            const cachedData = cache.get(cacheKey);
            setTower(cachedData.tower);
            setTowerData(cachedData.towerData);
            setCellData(cachedData.cellData);
            setLoading(false);
            return;
        }

        try {
            const [cellsRes, azimuthRes, bandsRes, configsRes] = await Promise.all([
                axios.get(`http://localhost:3000/api/cells/site/${siteId}`),
                axios.get(`http://localhost:3000/api/cells/azimuth/${siteId}`),
                axios.get(`http://localhost:3000/api/bands/site/${siteId}`),
                axios.get('http://localhost:3000/api/band-configurations')
            ]);

            const lat = parseFloat(cellsRes.data.coordinates?.latitude);
            const lng = parseFloat(cellsRes.data.coordinates?.longitude);

            if (isNaN(lat) || isNaN(lng)) {
                throw new Error('Invalid coordinates');
            }

            const towerData = {
                tower: {
                    site_id: siteId,
                    latitude: lat,
                    longitude: lng
                },
                towerData: {
                    azimuth: azimuthRes.data,
                    bands: bandsRes.data.map(b => b.BAND),
                    configs: configsRes.data
                },
                cellData: cellsRes.data
            };

            // Store in cache
            cache.set(cacheKey, towerData);

            setTower(towerData.tower);
            setTowerData(towerData.towerData);
            setCellData(towerData.cellData);

        } catch (err) {
            console.error('Error searching tower:', err);
            setError(err.message === 'Invalid coordinates' ? 
                'Tower coordinates not found' : 
                err.response?.data?.error || 'Tower not found');
            setTower(null);
            setTowerData(null);
            setCellData(null);
        }
        setLoading(false);
    }, []);

    return {
        tower,
        towerData,
        cellData,
        loading,
        error,
        searchTower
    };
}; 