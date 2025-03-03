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

                    // Log azimuth values for verification
                    console.log('Azimuth Debug:', {
                        site_id: site_id,
                        sector: sectorNum,
                        db_azimuth: cell.Azimuth,
                        default_azimuth: defaultAzimuth,
                        final_azimuth: parseFloat(cell.Azimuth) || defaultAzimuth,
                        raw_value: cell.Azimuth
                    });

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

// Get payload data for specific cell
const getPayloadData = async (req, res) => {
    const cellname = req.params.cellname;
    
    try {
        // Log the requested cellname
        console.log('Requested cellname:', cellname);

        // First check if cellname exists in cells table
        const cellCheckQuery = `
            SELECT Cellname, Tech, BAND, Sector_Final
            FROM cells 
            WHERE Cellname = ?`;
        const [cellExists] = await db.execute(cellCheckQuery, [cellname]);
        
        console.log('Cell existence check:', {
            cellname,
            exists: cellExists.length > 0,
            details: cellExists[0] || null
        });

        // Get payload data for specific cellname
        const query = `
            SELECT 
                p.Cellname,
                DATE_FORMAT(p.day, '%Y-%m-%d') as day,
                p.Total_Payload_GB
            FROM kpi p
            WHERE p.Cellname = ?
            ORDER BY p.day DESC
            LIMIT 7`;

        const [rows] = await db.execute(query, [cellname]);
        
        // Log query results
        console.log('Payload query results:', {
            rowCount: rows.length,
            firstRow: rows[0],
            allRows: rows
        });

        if (rows.length === 0) {
            // If no data found, search for similar cells
            const [siteName, sectorCode] = cellname.split('_');
            
            // Search for similar cells in payload_4g
            const similarQuery = `
                SELECT DISTINCT 
                    p.Cellname,
                    c.Tech,
                    c.BAND,
                    c.Sector_Final,
                    MAX(p.day) as latest_date
                FROM kpi p
                JOIN cells c ON p.Cellname = c.Cellname
                WHERE 
                    (p.Cellname LIKE ? OR p.Cellname LIKE ?)
                    AND p.Cellname != ?
                GROUP BY p.Cellname, c.Tech, c.BAND, c.Sector_Final
                ORDER BY latest_date DESC
                LIMIT 5`;
            
            const searchPatterns = [
                `${siteName}%`,  // Match by site name
                `%${sectorCode}` // Match by sector code
            ];
            
            const [similarCells] = await db.execute(similarQuery, [...searchPatterns, cellname]);
            
            console.log('Similar cells search:', {
                requestedCell: cellname,
                siteName,
                sectorCode,
                searchPatterns,
                existsInCells: cellExists.length > 0,
                similarCellsFound: similarCells.map(row => ({
                    cellname: row.Cellname,
                    tech: row.Tech,
                    band: row.BAND,
                    sector: row.Sector_Final,
                    latest_date: row.latest_date
                }))
            });

            return res.json({
                cellname: cellname,
                message: 'No payload data found for this cell',
                exists_in_cells: cellExists.length > 0,
                cell_details: cellExists[0] || null,
                similar_cells: similarCells,
                data: []
            });
        }

        // Format the response
        const formattedData = rows.map(row => {
            console.log('Processing payload row:', {
                cellname: row.Cellname,
                day: row.day,
                payload_gb: {
                    value: row.payload_gb,
                    type: typeof row.payload_gb,
                    parsed: parseFloat(row.payload_gb)
                }
            });

            return {
                date: row.day,
                payload: parseFloat(row.payload_gb || 0)
            };
        });

        // Log final formatted data
        console.log('Final response data:', {
            cellname,
            cell_details: cellExists[0] || null,
            dataPoints: formattedData.length,
            date_range: {
                from: formattedData[formattedData.length - 1]?.date,
                to: formattedData[0]?.date
            },
            data: formattedData
        });

        res.json({
            cellname: cellname,
            cell_details: cellExists[0] || null,
            data: formattedData
        });
        
    } catch (err) {
        console.error('Database error details:', {
            message: err.message,
            code: err.code,
            sqlMessage: err.sqlMessage,
            sql: err.sql
        });
        res.status(500).json({ 
            error: 'Failed to fetch payload data',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Get payload summary for a tower
const getPayloadSummary = async (req, res) => {
    const site_id = req.params.site_id;
    
    try {
        const query = `
            SELECT 
                p.cellname,
                DATE_FORMAT(p.day, '%Y-%m-%d') as date,
                p.Total_Payload_GB as payload
            FROM kpi p
            JOIN cells c ON p.cellname = c.Cellname
            WHERE c.site_id = ?
            AND p.day >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
            ORDER BY p.day DESC, p.cellname`;

        const [rows] = await db.execute(query, [site_id]);
        
        // Group by cellname
        const summary = rows.reduce((acc, row) => {
            if (!acc[row.cellname]) {
                acc[row.cellname] = [];
            }
            acc[row.cellname].push({
                date: row.date,
                payload: parseFloat(row.payload)
            });
            return acc;
        }, {});

        res.json({
            site_id,
            cells: summary
        });
        
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ 
            error: 'Failed to fetch payload summary',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Add new payload data
const addPayloadData = async (req, res) => {
    const { cellname, day, payload_gb } = req.body;
    
    try {
        // Validate if cellname exists
        const [cellCheck] = await db.execute(
            'SELECT Cellname FROM cells WHERE Cellname = ?',
            [cellname]
        );

        if (cellCheck.length === 0) {
            return res.status(400).json({
                error: 'Invalid cellname',
                message: 'Cellname does not exist in cells table'
            });
        }

        // Insert payload data
        const query = `
            INSERT INTO kpi (cellname, day, Total_Payload_GB)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE Total_Payload_GB = VALUES(Total_Payload_GB)`;

        await db.execute(query, [cellname, day, payload_gb]);
        
        res.json({
            message: 'Payload data added successfully',
            data: { cellname, day, payload_gb }
        });
        
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ 
            error: 'Failed to add payload data',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Get all payload data for a specific cellname
const getAllPayloadByCellname = async (req, res) => {
    const cellname = req.params.cellname;
    
    try {
        const query = `
            SELECT 
                p.Cellname,
                DATE_FORMAT(p.day, '%Y-%m-%d') as day,
                CAST(p.Total_Payload_GB AS DECIMAL(10,8)) as Total_Payload_GB
            FROM kpi p
            INNER JOIN cells c ON p.Cellname = c.Cellname
            WHERE p.Cellname = ?
            ORDER BY p.day DESC`;

        const [rows] = await db.execute(query, [cellname]);
        
        if (rows.length === 0) {
            return res.json({
                cellname: cellname,
                data: [],
                message: 'No payload data found for this cell'
            });
        }

        const formattedData = rows.map(row => ({
            cellname: row.Cellname,
            date: row.day,
            payload: parseFloat(parseFloat(row.payload_gb).toFixed(8))
        }));

        res.json({
            cellname: cellname,
            data: formattedData
        });
        
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ 
            error: 'Failed to fetch payload data',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Get cell details
const getCellDetails = async (req, res) => {
    const { site_id, sector, tech, band } = req.query;
    
    try {
        const query = `
            SELECT 
                site_id,
                Cellname,
                Sector_Final,
                Tech,
                BAND
            FROM cells 
            WHERE site_id = ?
                AND Sector_Final = ?
                AND Tech = ?
                AND BAND = ?
            LIMIT 1`;

        const [rows] = await db.execute(query, [site_id, sector, tech, band]);
        
        if (!rows || rows.length === 0) {
            return res.status(404).json({
                error: 'Cell not found',
                message: 'No cell found with the specified parameters'
            });
        }

        res.json(rows[0]);
        
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ 
            error: 'Failed to fetch cell details',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

module.exports = {
    getAllMark,
    getSectors,
    getTriangleDimensions,
    getKabupatenList,
    getTowersByKabupaten,
    getPayloadData,
    getPayloadSummary,
    addPayloadData,
    getAllPayloadByCellname,
    getCellDetails
};
