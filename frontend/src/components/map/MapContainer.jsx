import React from 'react';
import { MapContainer as LeafletMap, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import TowerMarkers from './TowerMarkers';
import MapControls from './MapControls';
import { useMapContext } from '../../contexts/MapContext';
import './MapContainer.css';

// Fix Leaflet default icon issue
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapContainer = () => {
    const { mapCenter, zoom, onMapReady } = useMapContext();

    return (
        <div className="map-wrapper">
            <LeafletMap
                center={mapCenter}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
                ref={(map) => {
                    if (map) {
                        onMapReady(map);
                    }
                }}
                preferCanvas={true}
                zoomControl={false}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <TowerMarkers />
                <MapControls />
            </LeafletMap>
        </div>
    );
};

export default MapContainer; 