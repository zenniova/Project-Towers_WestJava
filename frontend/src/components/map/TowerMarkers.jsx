import React, { useEffect, useMemo, useCallback } from 'react';
import { Circle, Popup } from 'react-leaflet';
import { useTowerContext } from '../../contexts/TowerContext';
import TowerPopup from './TowerPopup';
import SectorOverlay from './SectorOverlay';
import { getMarkerStyle } from '../../utils/mapStyles';

// Helper function to check if a site type is indoor
const isIndoorSiteType = (siteType) => {
    if (!siteType) return false;
    const type = siteType.toLowerCase();
    return type === 'indoor' || type === 'lampsite' || type === 'femto';
};

// Helper function to calculate tower score
const calculateTowerScore = (tower) => {
    let score = 0;
    
    // Score based on sectors
    if (tower.sectors?.length) {
        score += tower.sectors.length * 5;  // 5 points per sector
    }

    // Score based on site type
    const siteType = tower.site_type?.toLowerCase() || '';
    if (siteType === 'macro') score += 8;
    else if (siteType === 'outdoor') score += 6;
    else if (siteType === 'easy macro') score += 7;
    else if (siteType === 'indoor') score += 4;
    else if (siteType === 'lampsite') score += 3;
    else if (siteType === 'femto') score += 2;

    // Score based on location data completeness
    if (tower.location) {
        const { latitude, longitude, kelurahan, kecamatan, kabupaten } = tower.location;
        if (latitude && longitude && latitude !== 0 && longitude !== 0) score += 5;
        if (kelurahan) score += 2;
        if (kecamatan) score += 2;
        if (kabupaten) score += 2;
    }

    return score;
};

const TowerMarker = React.memo(({ tower, isSelected, isNearby, showSectors, onSelect }) => {
    const { latitude, longitude } = tower.location;
    const isIndoor = isIndoorSiteType(tower.site_type);

    const handleClick = useCallback(() => {
        onSelect(tower);
    }, [tower, onSelect]);

    const markerStyle = useMemo(() => 
        getMarkerStyle(isSelected, isNearby, isIndoor, tower.site_type),
        [isSelected, isNearby, isIndoor, tower.site_type]
    );

    return (
        <React.Fragment>
            {showSectors && !isIndoor && tower.sectors?.map((sector, index) => (
                <SectorOverlay
                    key={`${tower.site_id}-sector-${index}`}
                    tower={tower}
                    sector={sector}
                />
            ))}
            <Circle
                center={[latitude, longitude]}
                pathOptions={markerStyle}
                radius={isIndoor ? 2 : 5}
                eventHandlers={{
                    click: handleClick
                }}
            >
                <Popup>
                    <TowerPopup tower={tower} />
                </Popup>
            </Circle>
        </React.Fragment>
    );
});

const TowerMarkers = () => {
    const { 
        towers, 
        selectedTower, 
        nearbyTowers, 
        showSectors,
        selectTower 
    } = useTowerContext();

    // Deduplicate towers based on site_id with scoring system
    const uniqueTowers = useMemo(() => {
        const seen = new Map();
        const duplicates = new Set();
        
        // First pass: identify duplicates and calculate scores
        towers.forEach(tower => {
            const id = tower.site_id;
            if (seen.has(id)) {
                duplicates.add(id);
            } else {
                const score = calculateTowerScore(tower);
                seen.set(id, {
                    tower,
                    score,
                    sectors: tower.sectors?.length || 0,
                    siteType: tower.site_type || 'unknown'
                });
            }
        });

        // Log duplicates if found
        if (duplicates.size > 0) {
            duplicates.forEach(id => {
                console.log(`Found ${towers.filter(t => t.site_id === id).length} instances of tower ${id}`);
            });
        }

        // Second pass: for duplicates, keep the one with highest score
        towers.forEach(tower => {
            const id = tower.site_id;
            if (duplicates.has(id)) {
                const score = calculateTowerScore(tower);
                const existing = seen.get(id);
                
                if (score > existing.score) {
                    const details = {
                        score,
                        sectors: tower.sectors?.length || 0,
                        siteType: tower.site_type || 'unknown',
                        location: tower.location
                    };
                    console.log(`Selected best instance for tower ${id}:`, details);
                    seen.set(id, { tower, ...details });
                }
            }
        });

        // Return only the towers
        return Array.from(seen.values()).map(entry => entry.tower);
    }, [towers]);

    const selectedId = selectedTower?.site_id;
    const nearbyIds = useMemo(() => 
        new Set(nearbyTowers.map(t => t.site_id)),
        [nearbyTowers]
    );

    // Enhanced debug logs
    useEffect(() => {
        const stats = {
            total: towers.length,
            unique: uniqueTowers.length,
            duplicates: towers.length - uniqueTowers.length,
            byType: uniqueTowers.reduce((acc, tower) => {
                const type = tower.site_type || 'unknown';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {}),
            withSectors: uniqueTowers.filter(t => t.sectors?.length > 0).length
        };
        
        console.log('Tower Statistics:', stats);
    }, [towers, uniqueTowers]);

    return (
        <>
            {uniqueTowers.map((tower) => (
                <TowerMarker
                    key={tower.site_id}
                    tower={tower}
                    isSelected={tower.site_id === selectedId}
                    isNearby={nearbyIds.has(tower.site_id)}
                    showSectors={showSectors}
                    onSelect={selectTower}
                />
            ))}
        </>
    );
};

export default React.memo(TowerMarkers); 