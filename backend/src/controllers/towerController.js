const db = require('../config/database');

// Get all tower locations
const getAllMark = async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT
                site_id,
                Longitude,
                Latitude,
                KELURAHAN_DESA as kelurahan,
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
                c.KELURAHAN_DESA as kelurahan,
                c.Kecamatan,
                c.Kabupaten,
                c.Site_type,
                c.Tech,
                COALESCE(c.Sector_Final, 0) as Sector_Final,
                c.BAND,
                c.Cellname,
                COALESCE(c.Azimuth, 0) as Azimuth,
                COALESCE(d.\`Radius(m)\`, 0) as coverage_radius,
                COALESCE(d.Beamwidth, 0) as beamwidth
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
                Beamwidth as beamwidth
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
                t.KELURAHAN_DESA as kelurahan,
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
                        COALESCE(d.Beamwidth, '')
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
            GROUP BY t.site_id, t.Longitude, t.Latitude, t.KELURAHAN_DESA, t.Kecamatan, t.Kabupaten, t.Site_type`;

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

        // Query untuk mengambil data payload harian
        const query = `
            SELECT 
                k.DAY,
                DATE_FORMAT(k.DAY, '%m/%d/%Y') as formatted_date,
                k.Total_Payload_GB as payload_value,
                c.Tech,
                c.BAND,
                c.Sector_Final,
                c.Site_id
            FROM kpi c
            LEFT JOIN cells k ON c.Site_id = k.Site_id
            WHERE c.Cellname = ?
            ORDER BY k.DAY ASC`;

        console.log('Executing payload query for cellname:', cellname);
        const [rows] = await db.execute(query, [cellname]);

        // Debug log untuk hasil query
        console.log('Raw payload query results:', {
            rowCount: rows.length,
            sampleData: rows.slice(0, 2),
            allData: rows
        });

        if (!rows || rows.length === 0) {
            // Jika tidak ada data, cek total records di tabel kpi dengan join ke cells
            const checkKpiQuery = `
                SELECT COUNT(*) as count
                FROM cells c
                LEFT JOIN kpi k ON c.Cellname = k.Cellname
                WHERE c.Cellname = ?`;
            const [kpiCheck] = await db.execute(checkKpiQuery, [cellname]);
            
            console.log('No payload data found. KPI table check:', {
                cellname,
                totalRecords: kpiCheck[0].count,
                startDate: '2025-02-14'
            });

            return res.status(200).json({
                message: 'No payload data available for this cell',
                cell_info: {
                    cellname: cellExists[0].Cellname,
                    tech: cellExists[0].Tech,
                    band: cellExists[0].BAND,
                    sector: cellExists[0].Sector_Final
                },
                data: [],
                debug_info: {
                    total_kpi_records: kpiCheck[0].count,
                    date_range: {
                        start: '2025-02-14'
                    }
                }
            });
        }

        // Format data dengan validasi
        const formattedData = rows.map(row => {
            const payload = parseFloat(row.payload_value);
            return {
                date: row.formatted_date,
                raw_date: row.day,
                payload: isNaN(payload) ? 0 : Number(payload.toFixed(2)),
                tech: row.Tech,
                band: row.BAND,
                sector: row.Sector_Final
            };
        }).filter(item => item.date && !isNaN(item.payload));

        // Log hasil formatting
        console.log('Formatted response:', {
            total_records: formattedData.length,
            sample_data: formattedData.slice(0, 2),
            date_range: formattedData.length > 0 ? {
                earliest: formattedData[0].date,
                latest: formattedData[formattedData.length - 1].date
            } : null
        });

        return res.json({
            message: 'Payload data retrieved successfully',
            cell_info: {
                cellname: cellExists[0].Cellname,
                tech: cellExists[0].Tech,
                band: cellExists[0].BAND,
                sector: cellExists[0].Sector_Final
            },
            data: formattedData,
            date_range: {
                earliest: formattedData[0]?.date,
                latest: formattedData[formattedData.length - 1]?.date
            }
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
                p.Cellname,
                DATE_FORMAT(p.day, '%m/%d/%Y') as date,
                p.Total_Payload_GB as payload
            FROM kpi p
            JOIN cells c ON p.Cellname = c.Cellname
            WHERE c.site_id = ?
            AND p.day >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)
            ORDER BY p.day DESC, p.Cellname`;

        const [rows] = await db.execute(query, [site_id]);
        
        // Group by cellname
        const summary = rows.reduce((acc, row) => {
            if (!acc[row.Cellname]) {
                acc[row.Cellname] = [];
            }
            acc[row.Cellname].push({
                date: row.date,
                payload: parseFloat(row.payload) || 0
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
    
    if (!cellname || !day || payload_gb === undefined) {
        return res.status(400).json({
            error: 'Missing required fields',
            message: 'cellname, day, and payload_gb are required'
        });
    }

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

        // Validate payload value
        const payloadValue = parseFloat(payload_gb);
        if (isNaN(payloadValue) || payloadValue < 0) {
            return res.status(400).json({
                error: 'Invalid payload value',
                message: 'payload_gb must be a non-negative number'
            });
        }

        // Insert payload data
        const query = `
            INSERT INTO kpi (Cellname, day, Total_Payload_GB)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE Total_Payload_GB = VALUES(Total_Payload_GB)`;

        const [result] = await db.execute(query, [cellname, day, payloadValue]);
        
        // Log the operation
        console.log('Payload data added:', {
            cellname,
            day,
            payload_gb: payloadValue,
            result: {
                affectedRows: result.affectedRows,
                insertId: result.insertId
            }
        });

        res.json({
            message: 'Payload data added successfully',
            data: { 
                cellname, 
                day, 
                payload_gb: payloadValue 
            }
        });
        
    } catch (err) {
        console.error('Database error:', {
            message: err.message,
            code: err.code,
            sql: err.sql
        });
        res.status(500).json({ 
            error: 'Failed to add payload data',
            message: err.message,
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Get all payload data for a specific cellname
const getAllPayloadByCellname = async (req, res) => {
    const { cellname } = req.params;
    
    if (!cellname) {
        return res.status(400).json({
            error: 'Missing cellname parameter',
            message: 'Cellname is required'
        });
    }

    try {
        console.log('Received request for cellname:', cellname);

        // Query untuk mengecek apakah cell ada dan mendapatkan informasi cell
        const checkQuery = `
            SELECT 
                c.Cellname,
                c.Tech,
                c.BAND,
                c.Sector_Final
            FROM cells c
            WHERE c.Cellname = ?
            LIMIT 1`;
            
        const [cellExists] = await db.execute(checkQuery, [cellname]);
        console.log('Cell check result:', {
            cellExists: cellExists.length > 0,
            cellInfo: cellExists[0]
        });

        if (!cellExists || cellExists.length === 0) {
            return res.status(404).json({
                error: 'Cell not found',
                message: `No cell found with name: ${cellname}`
            });
        }

        // Query untuk mengambil data payload harian
        const query = `
            SELECT 
                k.day,
                DATE_FORMAT(k.day, '%m/%d/%Y') as formatted_date,
                ROUND(k.Total_Payload_GB, 2) as payload_value,
                c.Tech,
                c.BAND,
                c.Sector_Final,
                c.site_id
            FROM cells c
            INNER JOIN kpi k ON c.Cellname = k.Cellname
            WHERE c.Cellname = ?
                AND k.Total_Payload_GB IS NOT NULL
            ORDER BY k.day ASC`;

        console.log('Executing payload query for cellname:', cellname);
        const [rows] = await db.execute(query, [cellname]);
        
        // Debug log untuk hasil query
        console.log('Raw payload query results:', {
            rowCount: rows.length,
            sampleData: rows.slice(0, 2),
            allData: rows
        });

        if (!rows || rows.length === 0) {
            // Jika tidak ada data, cek total records di tabel kpi dengan join ke cells
            const checkKpiQuery = `
                SELECT 
                    COUNT(*) as count,
                    MIN(k.day) as earliest_date,
                    MAX(k.day) as latest_date
                FROM cells c
                LEFT JOIN kpi k ON c.Cellname = k.Cellname
                WHERE c.Cellname = ?`;
            const [kpiCheck] = await db.execute(checkKpiQuery, [cellname]);
            
            console.log('No payload data found. KPI table check:', {
                cellname,
                totalRecords: kpiCheck[0].count,
                dateRange: {
                    earliest: kpiCheck[0].earliest_date,
                    latest: kpiCheck[0].latest_date
                }
            });

            return res.status(200).json({
                message: 'No payload data available for this cell',
                cell_info: {
                    cellname: cellExists[0].Cellname,
                    tech: cellExists[0].Tech,
                    band: cellExists[0].BAND,
                    sector: cellExists[0].Sector_Final
                },
                data: [],
                debug_info: {
                    total_kpi_records: kpiCheck[0].count,
                    date_range: {
                        earliest: kpiCheck[0].earliest_date,
                        latest: kpiCheck[0].latest_date
                    }
                }
            });
        }

        // Format data dengan validasi
        const formattedData = rows.map(row => {
            const payload = parseFloat(row.payload_value);
            return {
                date: row.formatted_date,
                raw_date: row.day,
                payload: isNaN(payload) ? 0 : Number(payload.toFixed(2)),
                tech: row.Tech,
                band: row.BAND,
                sector: row.Sector_Final
            };
        }).filter(item => item.date && !isNaN(item.payload));

        // Log hasil formatting
        console.log('Formatted response:', {
            total_records: formattedData.length,
            sample_data: formattedData.slice(0, 2),
            date_range: formattedData.length > 0 ? {
                earliest: formattedData[0].date,
                latest: formattedData[formattedData.length - 1].date
            } : null
        });

        return res.json({
            message: 'Payload data retrieved successfully',
            cell_info: {
                cellname: cellExists[0].Cellname,
                tech: cellExists[0].Tech,
                band: cellExists[0].BAND,
                sector: cellExists[0].Sector_Final
            },
            data: formattedData,
            date_range: {
                earliest: formattedData[0]?.date,
                latest: formattedData[formattedData.length - 1]?.date
            }
        });

    } catch (err) {
        console.error('Error fetching payload data:', {
            error: err,
            cellname: cellname,
            message: err.message,
            code: err.code,
            sql: err.sql
        });
        
        res.status(500).json({ 
            error: 'Failed to fetch payload data',
            message: 'An error occurred while fetching payload data',
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
