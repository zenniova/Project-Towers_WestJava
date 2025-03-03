import React from 'react';
import PayloadChart from './PayloadChart';

const TowerDetail = ({ tower, onClose }) => {
    return (
        <div className="tower-detail">
            <div className="tower-detail-header">
                <h2>Tower Detail</h2>
                <button onClick={onClose}>&times;</button>
            </div>
            
            <div className="tower-info">
                <p><strong>Site ID:</strong> {tower.site_id}</p>
                <p><strong>Latitude:</strong> {tower.latitude}</p>
                <p><strong>Longitude:</strong> {tower.longitude}</p>
                <p><strong>Address:</strong> {tower.address}</p>
            </div>

            {tower.sectors && tower.sectors.length > 0 && (
                <div className="sectors-info">
                    <h3>Sectors</h3>
                    {tower.sectors.map((sector, index) => (
                        <div key={index} className="sector-item">
                            <h4>Sector {sector.sector_number}</h4>
                            <p><strong>Cell Name:</strong> {sector.Cellname}</p>
                            <p><strong>Technology:</strong> {sector.technology}</p>
                            <p><strong>Band:</strong> {sector.band}</p>
                            <p><strong>Azimuth:</strong> {sector.azimuth}°</p>
                            
                            {/* Add PayloadChart for each sector with band information */}
                            <div className="sector-payload">
                                <h4>Payload Data</h4>
                                <PayloadChart 
                                    cellname={sector.Cellname} 
                                    band={sector.band}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TowerDetail; 