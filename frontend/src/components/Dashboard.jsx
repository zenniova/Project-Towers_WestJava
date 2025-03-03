import React from 'react';
import MapContainer from './map/MapContainer';
import SearchControl from './controls/SearchControl';
import CityControl from './controls/CityControl';
import SectorControl from './controls/SectorControl';
import { useCityContext } from '../contexts/CityContext';
import { useTowerContext } from '../contexts/TowerContext';
import LoadingIndicator from './LoadingIndicator';
import './Dashboard.css';

const Dashboard = () => {
    const { isLoading: isCityLoading, error: cityError, selectedCity } = useCityContext();
    const { selectedTower, nearbyTowers, isLoading: isTowerLoading } = useTowerContext();

    if (isCityLoading || isTowerLoading) {
        return <LoadingIndicator message="Loading tower data..." />;
    }

    if (cityError) {
        return <div className="error-message">Error: {cityError}</div>;
    }

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="header-title">
                    <h1>Dashboard Monitoring Tower</h1>
                    <span className="header-subtitle">Telkomsel Regional Jawa Barat</span>
                </div>
                <div className="header-info">
                    {selectedCity && <span>Current City: {selectedCity}</span>}
                </div>
            </header>
            
            <div className="dashboard-content">
                <div className="controls-panel">
                    <div className="controls-section">
                        <h2>Controls</h2>
                        <CityControl />
                        <SearchControl />
                        <SectorControl />
                    </div>
                    
                    {selectedTower && (
                        <div className="tower-info-section">
                            <h2>Selected Tower</h2>
                            <div className="selected-tower-info">
                                <p><strong>Site ID:</strong> {selectedTower.site_id}</p>
                                <p><strong>Location:</strong></p>
                                <ul>
                                    <li>Kelurahan: {selectedTower.location.kelurahan}</li>
                                    <li>Kecamatan: {selectedTower.location.kecamatan}</li>
                                    <li>Kabupaten: {selectedTower.location.kabupaten}</li>
                                </ul>
                                <p><strong>Coordinates:</strong></p>
                                <ul>
                                    <li>Latitude: {selectedTower.location.latitude.toFixed(6)}</li>
                                    <li>Longitude: {selectedTower.location.longitude.toFixed(6)}</li>
                                </ul>
                            </div>
                            
                            {nearbyTowers.length > 0 && (
                                <div className="nearby-towers-info">
                                    <h3>Nearby Towers ({nearbyTowers.length})</h3>
                                    <ul>
                                        {nearbyTowers.map(tower => (
                                            <li key={tower.site_id}>
                                                Site ID: {tower.site_id}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="map-panel">
                    <MapContainer />
                </div>
            </div>
        </div>
    );
};

export default Dashboard; 