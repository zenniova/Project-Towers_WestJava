import React from 'react';
import './TowerPopup.css';

const TowerPopup = ({ tower }) => {
    const { site_id, location } = tower;
    const { latitude, longitude, kelurahan, kecamatan, kabupaten } = location;

    return (
        <div className="tower-popup">
            <h4>Tower Information</h4>
            <p><strong>Site ID:</strong> {site_id}</p>
            <p><strong>Location:</strong><br />
                {kelurahan && `Kelurahan: ${kelurahan}`}<br />
                {kecamatan && `Kecamatan: ${kecamatan}`}<br />
                {kabupaten && `Kabupaten: ${kabupaten}`}
            </p>
            <p><strong>Coordinates:</strong><br />
                Lat: {latitude.toFixed(6)}<br />
                Lng: {longitude.toFixed(6)}
            </p>
        </div>
    );
};

export default TowerPopup; 