import React from 'react';
import { useTowerContext } from '../../contexts/TowerContext';
import './SectorControl.css';

const SectorControl = () => {
    const { showSectors, toggleSectors } = useTowerContext();

    return (
        <div className="sector-control">
            <button 
                className={`sector-button ${showSectors ? 'active' : ''}`}
                onClick={toggleSectors}
            >
                {showSectors ? 'Hide Sectors' : 'Show Sectors'}
            </button>
        </div>
    );
};

export default SectorControl; 