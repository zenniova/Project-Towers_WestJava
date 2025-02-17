import React from 'react';
import { MapProvider } from './MapContext';
import { TowerProvider } from './TowerContext';
import { CityProvider } from './CityContext';

export const RootProvider = ({ children }) => {
    return (
        <MapProvider>
            <TowerProvider>
                <CityProvider>
                    {children}
                </CityProvider>
            </TowerProvider>
        </MapProvider>
    );
}; 