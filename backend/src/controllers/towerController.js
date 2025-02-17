const db = require('../config/database');

// Get all tower locations
const getAllMark = async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT
                site_id,
                Longitude,
                Latitude,
                \`KELURAHAN/DESA\` as kelurahan,
                Kecamatan,
                Kabupaten,
                Site_type
            FROM cells 
            WHERE Longitude IS NOT NULL 
            AND Latitude IS NOT NULL
            AND site_id IS NOT NULL
            GROUP BY site_id`;

        const [rows] = await db.execute(query);
        
        if (!rows || rows.length === 0) {
            return res.json([]);
        }
        
        const formattedResults = rows.map(row => ({
            site_id: row.site_id,
            site_type: row.Site_type || 'outdoor',
            location: {
                latitude: parseFloat(row.Latitude) || 0,
                longitude: parseFloat(row.Longitude) || 0,
                kelurahan: row.kelurahan || '',
                kecamatan: row.Kecamatan || '',
                kabupaten: row.Kabupaten || ''
            }
        })).filter(item => 
            item.location.latitude !== 0 && 
            item.location.longitude !== 0 && 
            !isNaN(item.location.latitude) && 
            !isNaN(item.location.longitude)
        );
        
        res.json(formattedResults);
        
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ 
            status: 'error',
            message: 'Failed to fetch tower data',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Get complete tower information including sectors and cells
const getSectors = async (req, res) => {
    const site_id = req.params.site_id;
    
    if (!site_id) {
        return res.status(400).json({ error: 'Site ID is required' });
    }

    try {
        // Get basic tower information and cells with optimized query
        const query = `
            SELECT 
                c.site_id,
                c.Longitude,
                c.Latitude,
                c.\`KELURAHAN/DESA\` as kelurahan,
                c.Kecamatan,
                c.Kabupaten,
                c.Site_type,
                c.Tech,
                COALESCE(c.Sector_Final, 0) as Sector_Final,
                c.BAND,
                c.Cellname,
                COALESCE(c.Azimuth, 0) as Azimuth,
                COALESCE(d.\`Radius(m)\`, 0) as coverage_radius,
                COALESCE(d.Beamwidht, 0) as beamwidth
            FROM cells c
            LEFT JOIN dimensi d ON c.Tech = d.Tech AND c.BAND = d.Band
            WHERE c.site_id = ?
                AND c.Sector_Final BETWEEN 1 AND 17
                AND c.Tech IS NOT NULL 
                AND c.BAND IS NOT NULL
            ORDER BY c.Sector_Final
            LIMIT 100`; // Add limit to prevent excessive results
        
        // Set timeout for database query
        const queryPromise = db.query(query, [site_id]);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Database query timeout')), 3000)
        );

        const [results] = await Promise.race([queryPromise, timeoutPromise]);
        
        if (!results || results.length === 0) {
            console.warn(`No data found for tower ${site_id}`);
            return res.status(404).json({
                error: 'Tower not found',
                message: `No tower found with site_id: ${site_id}`
            });
        }

        // Format response with optimized data structure
        const tower = {
            site_id: site_id,
            site_type: results[0].Site_type || 'outdoor',
            location: {
                latitude: parseFloat(results[0].Latitude) || 0,
                longitude: parseFloat(results[0].Longitude) || 0,
                kelurahan: results[0].kelurahan || '',
                kecamatan: results[0].Kecamatan || '',
                kabupaten: results[0].Kabupaten || ''
            },
            sectors: []
        };

        // Use Set to track unique sector numbers
        const processedSectors = new Set();
        const sectors = {};

        // Process results with error handling
        for (const cell of results) {
            try {
                const sectorNum = parseInt(cell.Sector_Final);
                if (isNaN(sectorNum) || sectorNum < 1 || sectorNum > 17) {
                    continue;
                }

                if (!processedSectors.has(sectorNum)) {
                    processedSectors.add(sectorNum);
                    
                    // Calculate default azimuth based on sector number
                    let defaultAzimuth;
                    if (sectorNum <= 3) {
                        defaultAzimuth = (sectorNum - 1) * 120;
                    } else if (sectorNum <= 5) {
                        defaultAzimuth = (sectorNum - 1) * 72;
                    } else if (sectorNum >= 14 && sectorNum <= 17) {
                        defaultAzimuth = ((sectorNum - 14) * 90) % 360;
                    } else {
                        defaultAzimuth = (sectorNum - 1) * (360 / 17);
                    }

                    sectors[sectorNum] = {
                        number: sectorNum,
                        azimuth: parseFloat(cell.Azimuth) || defaultAzimuth,
                        cells: []
                    };
                }

                // Add cell data with validation
                if (cell.Tech && cell.BAND) {
                    sectors[sectorNum].cells.push({
                        tech: cell.Tech,
                        band: cell.BAND,
                        coverage: {
                            radius: Math.max(0, parseFloat(cell.coverage_radius) || 100),
                            beamwidth: Math.min(360, Math.max(0, parseFloat(cell.beamwidth) || 65))
                        }
                    });
                }
            } catch (cellError) {
                console.warn(`Error processing cell for tower ${site_id}, sector ${cell.Sector_Final}:`, cellError);
                continue;
            }
        }

        // Convert sectors object to array and sort
        tower.sectors = Object.values(sectors)
            .filter(sector => sector.cells.length > 0)
            .sort((a, b) => a.number - b.number);

        // Log processing summary
        console.log(`Tower ${site_id} processed:`, {
            total_sectors: tower.sectors.length,
            sectors_summary: tower.sectors.map(s => ({
                number: s.number,
                cells: s.cells.length
            }))
        });

        res.json(tower);
    } catch (error) {
        console.error(`Error processing tower ${site_id}:`, error);
        return res.status(error.message === 'Database query timeout' ? 504 : 500).json({
            error: error.message === 'Database query timeout' ? 'Request timeout' : 'Database error',
            details: error.message
        });
    }
};

// Get triangle dimensions from dimensi table
const getTriangleDimensions = async (req, res) => {
    try {
        const query = `
            SELECT 
                Tech as technology,
                Type as type,
                Band as band,
                \`Radius(m)\` as radius,
                Beamwidht as beamwidth
            FROM dimensi
            WHERE Tech IS NOT NULL 
            AND Band IS NOT NULL
            ORDER BY Tech, Band`;

        const [rows] = await db.execute(query);
        
        if (!rows || rows.length === 0) {
            return res.status(404).json({
                error: 'No dimension data found'
            });
        }
        
        // Format data untuk frontend
        const formattedData = rows.map(row => ({
            technology: row.technology,
            type: row.type || 'Unknown',
            band: row.band,
            coverage: {
                radius: parseFloat(row.radius) || 0,
                beamwidth: parseFloat(row.beamwidth) || 0
            }
        }));
        
        res.json(formattedData);
        
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ 
            error: 'Failed to fetch triangle dimensions',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Get all kabupaten data
const getKabupatenList = async (req, res) => {
    try {
        const query = `
            SELECT 
                kota,
                Latitude,
                Longitude
            FROM kabupaten
            ORDER BY kota`;

        const [rows] = await db.execute(query);
        
        if (!rows || rows.length === 0) {
            return res.json([]);
        }
        
        const formattedResults = rows.map(row => ({
            kota: row.kota,
            center: {
                lat: parseFloat(row.Latitude) || 0,
                lng: parseFloat(row.Longitude) || 0
            }
        }));
        
        res.json(formattedResults);
        
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ 
            status: 'error',
            message: 'Failed to fetch kabupaten data',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Get towers by kabupaten
const getTowersByKabupaten = async (req, res) => {
    const kabupaten = req.params.kabupaten;
    
    if (!kabupaten) {
        return res.status(400).json({ error: 'Kabupaten name is required' });
    }

    try {
        // Modified query to include sector data in one go
        const query = `
            SELECT DISTINCT
                t.site_id,
                t.Longitude,
                t.Latitude,
                t.\`KELURAHAN/DESA\` as kelurahan,
                t.Kecamatan,
                t.Kabupaten,
                t.Site_type,
                GROUP_CONCAT(
                    DISTINCT CONCAT(
                        COALESCE(t.Sector_Final, ''),',',
                        COALESCE(t.Tech, ''),',',
                        COALESCE(t.BAND, ''),',',
                        COALESCE(t.Azimuth, ''),',',
                        COALESCE(d.\`Radius(m)\`, ''),',',
                        COALESCE(d.Beamwidht, '')
                    ) SEPARATOR ';'
                ) as sector_data
            FROM cells t
            LEFT JOIN dimensi d ON t.Tech = d.Tech AND t.BAND = d.Band
            WHERE t.Kabupaten LIKE ?
                AND t.Longitude IS NOT NULL 
                AND t.Latitude IS NOT NULL
                AND t.Sector_Final BETWEEN 1 AND 17
                AND t.Tech IS NOT NULL
                AND t.BAND IS NOT NULL
            GROUP BY t.site_id, t.Longitude, t.Latitude, t.\`KELURAHAN/DESA\`, t.Kecamatan, t.Kabupaten, t.Site_type`;

        const [rows] = await db.execute(query, [`%${kabupaten}%`]);
        
        if (!rows || rows.length === 0) {
            return res.json([]);
        }

        const formattedResults = rows.map(row => {
            // Process sector data
            const sectors = {};
            if (row.sector_data) {
                row.sector_data.split(';').forEach(sectorStr => {
                    const [sector, tech, band, azimuth, radius, beamwidth] = sectorStr.split(',');
                    if (sector && tech && band) {
                        const sectorNum = parseInt(sector);
                        if (!sectors[sectorNum]) {
                            sectors[sectorNum] = {
                                number: sectorNum,
                                azimuth: parseFloat(azimuth) || getDefaultAzimuth(sectorNum),
                                cells: []
                            };
                        }
                        sectors[sectorNum].cells.push({
                            tech,
                            band,
                            coverage: {
                                radius: Math.max(0, parseFloat(radius) || 100),
                                beamwidth: Math.min(360, Math.max(0, parseFloat(beamwidth) || 65))
                            }
                        });
                    }
                });
            }

            return {
                site_id: row.site_id,
                site_type: row.Site_type || 'outdoor',
                location: {
                    latitude: parseFloat(row.Latitude) || 0,
                    longitude: parseFloat(row.Longitude) || 0,
                    kelurahan: row.kelurahan || '',
                    kecamatan: row.Kecamatan || '',
                    kabupaten: row.Kabupaten || ''
                },
                sectors: Object.values(sectors)
                    .filter(s => s.cells.length > 0)
                    .sort((a, b) => a.number - b.number)
            };
        }).filter(item => 
            item.location.latitude !== 0 && 
            item.location.longitude !== 0 && 
            !isNaN(item.location.latitude) && 
            !isNaN(item.location.longitude)
        );

        console.log('Sending towers data:', {
            total: formattedResults.length,
            indoor: formattedResults.filter(t => t.site_type?.toLowerCase() === 'indoor').length,
            withSectors: formattedResults.filter(t => t.sectors?.length > 0).length
        });

        res.json(formattedResults);
        
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ 
            status: 'error',
            message: 'Failed to fetch towers for kabupaten',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Helper function for default azimuth calculation
const getDefaultAzimuth = (sectorNum) => {
    if (sectorNum <= 3) {
        return (sectorNum - 1) * 120;
    } else if (sectorNum <= 5) {
        return (sectorNum - 1) * 72;
    } else if (sectorNum >= 14 && sectorNum <= 17) {
        return ((sectorNum - 14) * 90) % 360;
    }
    return (sectorNum - 1) * (360 / 17);
};

module.exports = {
    getAllMark,
    getSectors,
    getTriangleDimensions,
    getKabupatenList,
    getTowersByKabupaten
};
