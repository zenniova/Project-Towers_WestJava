import React, { useEffect, useMemo, useCallback } from 'react';
import { Polygon, Popup } from 'react-leaflet';
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
        const radiusInDegrees = cellRadius / 111000;
        const azimuthRad = ((-azimuth + 90) * Math.PI / 180);
        const halfBeamRad = (cellBeamwidth / 2) * (Math.PI / 180);

        const centerPoint = [latitude, longitude];
        const leftAngle = azimuthRad - halfBeamRad;
        const rightAngle = azimuthRad + halfBeamRad;

        const leftPoint = [
            latitude + (radiusInDegrees * Math.cos(leftAngle)),
            longitude + (radiusInDegrees * Math.sin(leftAngle))
        ];
        
        const rightPoint = [
            latitude + (radiusInDegrees * Math.cos(rightAngle)),
            longitude + (radiusInDegrees * Math.sin(rightAngle))
        ];

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
                        <div className="sector-popup">
                            <h4>Sector Information</h4>
                            <p><strong>Tower ID:</strong> {tower.site_id}</p>
                            <p><strong>Sector Number:</strong> {sector.number}</p>
                            <p><strong>Azimuth:</strong> {azimuth}°</p>
                            <div className="cell-info">
                                <p><strong>Cell Details:</strong></p>
                                <ul>
                                    <li><strong>Technology:</strong> {cell.tech}</li>
                                    <li><strong>Band:</strong> {cell.band}</li>
                                    <li><strong>Coverage Radius:</strong> {radius}m</li>
                                    <li><strong>Beamwidth:</strong> {beamwidth}°</li>
                                </ul>
                            </div>
                        </div>
                    </Popup>
                </Polygon>
            );
        }), [cells, sector.number, getTrianglePoints, getCoverageParams, getColor, tower.site_id, azimuth]);

    return <>{cellTriangles}</>;
};

export default React.memo(SectorOverlay); 