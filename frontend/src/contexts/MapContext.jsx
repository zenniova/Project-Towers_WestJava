import React, { createContext, useContext, useState, useCallback } from 'react';

const MapContext = createContext();

export const MapProvider = ({ children }) => {
    // Default center is set to Bandung
    const [mapCenter, setMapCenter] = useState([-6.9175, 107.6191]);
    const [zoom, setZoom] = useState(13);
    const [bounds, setBounds] = useState(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const [mapInstance, setMapInstance] = useState(null);

    const onMapReady = (map) => {
        setIsMapReady(true);
        setMapInstance(map);
    };

    const updateBounds = (newBounds) => {
        setBounds(newBounds);
    };

    const flyToLocation = useCallback((latitude, longitude, zoomLevel = 17) => {
        if (mapInstance) {
            console.log('Flying to:', { latitude, longitude, zoomLevel });
            mapInstance.flyTo([latitude, longitude], zoomLevel, {
                duration: 1.5,
                easeLinearity: 0.25
            });
        } else {
            console.log('Map instance not ready');
            setMapCenter([latitude, longitude]);
            setZoom(zoomLevel);
        }
    }, [mapInstance]);

    const value = {
        mapCenter,
        setMapCenter,
        zoom,
        setZoom,
        bounds,
        updateBounds,
        isMapReady,
        onMapReady,
        mapInstance,
        flyToLocation
    };

    return (
        <MapContext.Provider value={value}>
            {children}
        </MapContext.Provider>
    );
};

export const useMapContext = () => {
    const context = useContext(MapContext);
    if (!context) {
        throw new Error('useMapContext must be used within a MapProvider');
    }
    return context;
}; 