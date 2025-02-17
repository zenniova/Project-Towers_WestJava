import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useMapContext } from './MapContext';

const TowerContext = createContext();

export const TowerProvider = ({ children }) => {
    const [towers, setTowers] = useState([]);
    const [selectedTower, setSelectedTower] = useState(null);
    const [nearbyTowers, setNearbyTowers] = useState([]);
    const [showSectors, setShowSectors] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const { setMapCenter, setZoom } = useMapContext();

    // Add effect to log towers data when it changes
    useEffect(() => {
        if (towers.length > 0) {
            console.log('TowerContext - Current towers data:', {
                total: towers.length,
                withSiteType: towers.filter(t => t.site_type).length,
                indoor: towers.filter(t => t.site_type?.toLowerCase() === 'indoor').length,
                withSectors: towers.filter(t => t.sectors?.length > 0).length,
                sample: {
                    first: towers[0],
                    withSiteType: towers.find(t => t.site_type),
                    withSectors: towers.find(t => t.sectors?.length > 0)
                }
            });
        }
    }, [towers]);

    // Load initial tower data
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const response = await axios.get('http://localhost:3000/api/towers');
                if (response.data && response.data.length > 0) {
                    const allTowers = response.data;
                    console.log('Initial towers data received:', {
                        total: allTowers.length,
                        withSectors: allTowers.filter(t => t.sectors?.length > 0).length
                    });
                    
                    // Set towers directly since they now include sector data
                    setTowers(allTowers);
                    
                    // Set initial selected tower (prefer tower with sectors)
                    const firstTower = allTowers.find(t => t.sectors?.length > 0) || allTowers[0];
                    if (firstTower) {
                        console.log('Setting first tower:', {
                            id: firstTower.site_id,
                            type: firstTower.site_type,
                            sectorCount: firstTower.sectors?.length
                        });
                        setSelectedTower(firstTower);
                        
                        if (firstTower.location) {
                            setMapCenter([
                                firstTower.location.latitude,
                                firstTower.location.longitude
                            ]);
                            setZoom(13);
                        }

                        // Find nearby towers
                        const nearby = allTowers.filter(t => {
                            if (t.site_id === firstTower.site_id) return false;
                            const distance = calculateDistance(
                                firstTower.location.latitude,
                                firstTower.location.longitude,
                                t.location.latitude,
                                t.location.longitude
                            );
                            return distance <= 1;
                        });
                        setNearbyTowers(nearby);
                    }
                }
            } catch (error) {
                console.error('Error loading initial data:', error);
                setSearchError('Failed to load initial tower data');
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialData();
    }, [setMapCenter, setZoom]);

    const centerMapOnTower = (tower) => {
        if (tower?.location) {
            setMapCenter([tower.location.latitude, tower.location.longitude]);
            setZoom(17);
        }
    };

    const selectTower = (tower) => {
        // No need to fetch tower data again since we already have sectors
        setSelectedTower(tower);
        centerMapOnTower(tower);

        // Find nearby towers
        const nearby = towers.filter(t => {
            if (t.site_id === tower.site_id) return false;
            const distance = calculateDistance(
                tower.location.latitude,
                tower.location.longitude,
                t.location.latitude,
                t.location.longitude
            );
            return distance <= 1;
        });
        setNearbyTowers(nearby);
    };

    const searchTower = async (siteId) => {
        setIsSearching(true);
        setSearchError(null);
        try {
            // First check if we already have this tower in our state
            const existingTower = towers.find(t => t.site_id === siteId);
            if (existingTower) {
                selectTower(existingTower);
                setIsSearching(false);
                return;
            }

            // If not found in state, fetch from server
            const response = await axios.get(`http://localhost:3000/api/towers/${siteId}`);
            if (response.data) {
                const tower = response.data;
                
                // Add to towers list
                setTowers(prevTowers => [...prevTowers, tower]);
                
                // Select the tower
                selectTower(tower);
            } else {
                setSearchError('Tower not found');
            }
        } catch (error) {
            console.error('Search error:', error);
            setSearchError(error.response?.data?.message || 'Failed to search tower');
        } finally {
            setIsSearching(false);
        }
    };

    const toggleSectors = () => {
        setShowSectors(prev => !prev);
    };

    // Helper function to calculate distance between two points in km
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Earth's radius in km
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    const toRad = (value) => {
        return value * Math.PI / 180;
    };

    const value = {
        towers,
        setTowers,
        selectedTower,
        selectTower,
        nearbyTowers,
        showSectors,
        toggleSectors,
        searchTower,
        isSearching,
        searchError,
        isLoading
    };

    return (
        <TowerContext.Provider value={value}>
            {children}
        </TowerContext.Provider>
    );
};

export const useTowerContext = () => {
    const context = useContext(TowerContext);
    if (!context) {
        throw new Error('useTowerContext must be used within a TowerProvider');
    }
    return context;
}; 