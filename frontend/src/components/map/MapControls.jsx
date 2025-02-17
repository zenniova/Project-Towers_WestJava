import React from 'react';
import { useMapEvents } from 'react-leaflet';
import { useMapContext } from '../../contexts/MapContext';

const MapControls = () => {
    const { updateBounds, onMapReady } = useMapContext();

    // Set up map event handlers
    useMapEvents({
        load: () => {
            onMapReady();
        },
        moveend: (e) => {
            const map = e.target;
            const bounds = map.getBounds();
            updateBounds(bounds);
        },
        zoomend: (e) => {
            const map = e.target;
            const bounds = map.getBounds();
            updateBounds(bounds);
        }
    });

    return null; // This component doesn't render anything
};

export default MapControls; 