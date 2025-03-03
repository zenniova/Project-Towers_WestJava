import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { Polygon, Popup } from 'react-leaflet';
import PayloadChart from '../PayloadChart';
import '../../styles/components/SectorPopup.css';

// Move these constants outside component to prevent recreation
const TECH_COLORS = {
    '2G': {
        '900': '#ff4444',
        '1800': '#ff8844',
        'DCS': '#ff8844'
    },
    '4G': {
        '900': '#33b5e5',
        '1800': '#4285f4',
        '2100': '#0d47a1',
        '2300': '#1565c0',
        '2300 F1': '#1976d2',
        '2300 F2': '#1565c0',
        '2300 F3': '#0d47a1'
    },
    '5G': {
        '2100': '#00C851',
        '2300': '#00695c'
    }
};

const TECH_PARAMS = {
    '2G': {
        '900': { radius: 150, beamwidth: 10 },
        '1800': { radius: 140, beamwidth: 15 },
        'DCS': { radius: 140, beamwidth: 15 }
    },
    '4G': {
        '900': { radius: 130, beamwidth: 30 },
        '1800': { radius: 110, beamwidth: 34 },
        '2100': { radius: 120, beamwidth: 32 },
        '2300': { radius: 100, beamwidth: 36 },
        '2300 F1': { radius: 80, beamwidth: 40 },
        '2300 F2': { radius: 90, beamwidth: 38 },
        '2300 F3': { radius: 100, beamwidth: 36 }
    },
    '5G': {
        '2300': { radius: 155, beamwidth: 7 },
        '2100': { radius: 160, beamwidth: 5 }
    }
};

const TECH_DEFAULTS = {
    '2G': { radius: 140, beamwidth: 15 },
    '4G': { radius: 120, beamwidth: 32 },
    '5G': { radius: 155, beamwidth: 7 }
};

const DEFAULT_COVERAGE = { radius: 100, beamwidth: 30 };

const getAzimuthDirection = (azimuth) => {
    // Normalize azimuth to 0-360 range
    const normalizedAzimuth = ((azimuth % 360) + 360) % 360;
    
    // Get cardinal and intercardinal directions with more detail
    const getDetailedDirection = (angle) => {
        if (angle <= 11.25 || angle > 348.75) return "North";
        if (angle <= 33.75) return "North-Northeast";
        if (angle <= 56.25) return "Northeast";
        if (angle <= 78.75) return "East-Northeast";
        if (angle <= 101.25) return "East";
        if (angle <= 123.75) return "East-Southeast";
        if (angle <= 146.25) return "Southeast";
        if (angle <= 168.75) return "South-Southeast";
        if (angle <= 191.25) return "South";
        if (angle <= 213.75) return "South-Southwest";
        if (angle <= 236.25) return "Southwest";
        if (angle <= 258.75) return "West-Southwest";
        if (angle <= 281.25) return "West";
        if (angle <= 303.75) return "West-Northwest";
        if (angle <= 326.25) return "Northwest";
        if (angle <= 348.75) return "North-Northwest";
        return "North";
    };

    const direction = getDetailedDirection(normalizedAzimuth);
    
    // Format the output with detailed information
    return `${direction} (${Math.round(normalizedAzimuth)}°)`;
};

const SectorPopupContent = ({ tower, sector, cell, radius, beamwidth, azimuth }) => {
    const [activePage, setActivePage] = useState('info'); // 'info' or 'chart'
    const [cellname, setCellname] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [cellDetails, setCellDetails] = useState(null);

    useEffect(() => {
        const fetchCellDetails = async () => {
            try {
                // Construct the query parameters
                const params = {
                    site_id: tower.site_id,
                    sector: sector.number,
                    tech: cell.tech,
                    band: cell.band
                };
                
                // Fetch cell details from the database
                const response = await fetch(`http://localhost:3000/api/cells/details?${new URLSearchParams(params)}`);
                const data = await response.json();
                
                if (data && data.Cellname) {
                    setCellname(data.Cellname);
                    setCellDetails(data);
                } else {
                    // Fallback to constructed cellname if not found in database
                    const constructedCellname = `${tower.site_id}_${sector.number}_${cell.tech}_${cell.band}`;
                    setCellname(constructedCellname);
                    console.warn('Cell details not found in database, using constructed name:', constructedCellname);
                }
            } catch (error) {
                console.error('Error fetching cell details:', error);
                // Fallback to constructed cellname on error
                const constructedCellname = `${tower.site_id}_${sector.number}_${cell.tech}_${cell.band}`;
                setCellname(constructedCellname);
            }
        };

        fetchCellDetails();
    }, [tower, sector, cell]);

    const handleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    return (
        <div className={`sector-popup ${isFullscreen ? 'fullscreen' : ''}`}>
            <div className="popup-nav">
                <button 
                    className={`nav-btn ${activePage === 'info' ? 'active' : ''}`}
                    onClick={() => setActivePage('info')}
                >
                    Info
                </button>
                <button 
                    className={`nav-btn ${activePage === 'chart' ? 'active' : ''}`}
                    onClick={() => setActivePage('chart')}
                >
                    Payload Chart
                </button>
                {activePage === 'chart' && (
                    <button 
                        className="fullscreen-btn"
                        onClick={handleFullscreen}
                        title={isFullscreen ? "Exit Fullscreen" : "View Fullscreen"}
                    >
                        {isFullscreen ? '⊖' : '⊕'}
                    </button>
                )}
            </div>

            {activePage === 'info' ? (
                <>
                    <h4>Sector Information</h4>
                    <p><strong>Tower ID:</strong> {tower.site_id}</p>
                    <p><strong>Sector Number:</strong> {sector.number}</p>
                    <p>
                        <strong>Azimuth:</strong> {getAzimuthDirection(azimuth)}
                        <span className="azimuth-note">
                        </span>
                    </p>
                    <div className="cell-info">
                        <p><strong>Cell Details:</strong></p>
                        <ul>
                            <li><strong>Technology:</strong> {cell.tech}</li>
                            <li><strong>Band:</strong> {cell.band}</li>
                            <li><strong>Coverage Radius:</strong> {radius}m</li>
                            <li><strong>Beamwidth:</strong> {beamwidth}°</li>
                            <li><strong>Cell Name:</strong> {cellname}</li>
                        </ul>
                    </div>
                </>
            ) : (
                <div className={`sector-payload-popup ${isFullscreen ? 'fullscreen' : ''}`}>
                    <h4>Payload Data - {cell.tech} {cell.band}</h4>
                    <div className="chart-container">
                        <PayloadChart 
                            cellname={cellname}
                            band={cell.band}
                            height={isFullscreen ? 400 : 200}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

const SectorOverlay = ({ tower, sector }) => {
    const { latitude, longitude } = tower.location;
    const { azimuth, cells } = sector;

    // Debug logs
    useEffect(() => {
        console.log('SectorOverlay Props:', {
            sectorNumber: sector.number,
            azimuth,
            cells: cells.map(cell => ({
                tech: cell.tech,
                band: cell.band,
                coverage: cell.coverage
            }))
        });
    }, [sector]);

    // Memoize coverage parameters calculation
    const getCoverageParams = useCallback((tech, band) => {
        const normalizedBand = band.replace(/^[LN]/, '').replace('NR', '');
        return TECH_PARAMS[tech]?.[normalizedBand] || TECH_DEFAULTS[tech] || DEFAULT_COVERAGE;
    }, []);

    // Memoize color calculation
    const getColor = useCallback((tech, band) => {
        const normalizedBand = band.replace(/^[LN]/, '').replace('NR', '');
        return TECH_COLORS[tech]?.[normalizedBand] || '#fbbc04';
    }, []);

    // Memoize triangle points calculation
    const getTrianglePoints = useCallback((cellRadius, cellBeamwidth) => {
        const radiusInDegrees = cellRadius / 111000;  // Convert meters to degrees
        
        // Telecommunications standard azimuth:
        // 0° = North, increasing clockwise
        // Convert to mathematical angle (radians)
        const azimuthRad = ((270 - azimuth) % 360) * (Math.PI / 180);
        const halfBeamRad = (cellBeamwidth / 2) * (Math.PI / 180);

        const centerPoint = [latitude, longitude];
        const leftAngle = azimuthRad - halfBeamRad;
        const rightAngle = azimuthRad + halfBeamRad;

        // Calculate points
        const leftPoint = [
            latitude + (radiusInDegrees * Math.cos(leftAngle)),
            longitude + (radiusInDegrees * Math.sin(leftAngle))
        ];
        
        const rightPoint = [
            latitude + (radiusInDegrees * Math.cos(rightAngle)),
            longitude + (radiusInDegrees * Math.sin(rightAngle))
        ];

        // Debug log for azimuth calculation
        console.log('Sector Azimuth Debug:', {
            sectorNumber: sector.number,
            originalAzimuth: azimuth,
            normalizedAzimuth: ((azimuth % 360) + 360) % 360,
            mathAngle: (270 - azimuth) % 360,  // Mathematical angle in degrees
            direction: getAzimuthDirection(azimuth),
            angles: {
                left: leftAngle * 180 / Math.PI,
                right: rightAngle * 180 / Math.PI
            },
            points: {
                center: centerPoint,
                left: leftPoint,
                right: rightPoint
            }
        });

        return [centerPoint, leftPoint, rightPoint, centerPoint];
    }, [latitude, longitude, azimuth]);

    // Skip invalid data
    if (!latitude || !longitude || typeof azimuth !== 'number' || !cells?.length) {
        return null;
    }

    // Memoize cell triangles
    const cellTriangles = useMemo(() => 
        cells.map((cell, index) => {
            const coverage = getCoverageParams(cell.tech, cell.band);
            const radius = coverage.radius || 100;
            const beamwidth = coverage.beamwidth || 65;
            
            if (radius <= 0 || beamwidth <= 0) return null;

            const points = getTrianglePoints(radius, beamwidth);
            const color = getColor(cell.tech, cell.band);

            return (
                <Polygon 
                    key={`${sector.number}-${index}`}
                    positions={points}
                    pathOptions={{
                        color,
                        weight: 2,
                        fillColor: color,
                        fillOpacity: 0.3,
                        stroke: true,
                        lineCap: 'round',
                        lineJoin: 'round'
                    }}
                >
                    <Popup>
                        <SectorPopupContent 
                            tower={tower}
                            sector={sector}
                            cell={cell}
                            radius={radius}
                            beamwidth={beamwidth}
                            azimuth={azimuth}
                        />
                    </Popup>
                </Polygon>
            );
        }), [cells, sector.number, getTrianglePoints, getCoverageParams, getColor, tower.site_id, azimuth]);

    return <>{cellTriangles}</>;
};

export default React.memo(SectorOverlay); 