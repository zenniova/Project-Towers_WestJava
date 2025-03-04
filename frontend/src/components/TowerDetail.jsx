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
                <p><strong>Latitude:</strong> {tower.location.latitude}</p>
                <p><strong>Longitude:</strong> {tower.location.longitude}</p>
                <p><strong>Kelurahan:</strong> {tower.location.kelurahan}</p>
                <p><strong>Kecamatan:</strong> {tower.location.kecamatan}</p>
                <p><strong>Kabupaten:</strong> {tower.location.kabupaten}</p>
            </div>

            {tower.sectors && tower.sectors.length > 0 && (
                <div className="sectors-info">
                    <h3>Sectors</h3>
                    {tower.sectors.map((sector, index) => (
                        <div key={index} className="sector-item">
                            <h4>Sector {sector.number}</h4>
                            {sector.cells.map((cell, cellIndex) => (
                                <div key={cellIndex} className="cell-info">
                                    <p><strong>Technology:</strong> {cell.tech}</p>
                                    <p><strong>Band:</strong> {cell.band}</p>
                                    <p><strong>Coverage Radius:</strong> {cell.coverage.radius}m</p>
                                    <p><strong>Beamwidth:</strong> {cell.coverage.beamwidth}°</p>
                                    
                                    {/* Add PayloadChart for each cell */}
                                    <div className="cell-payload">
                                        <h4>Payload Data</h4>
                                        <PayloadChart 
                                            cellname={cell.cellname} 
                                            band={cell.band}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TowerDetail; 