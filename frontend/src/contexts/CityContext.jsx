import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useMapContext } from './MapContext';
import { useTowerContext } from './TowerContext';

const CityContext = createContext();

export const CityProvider = ({ children }) => {
    const [cities, setCities] = useState([]);
    const [selectedCity, setSelectedCity] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const { setMapCenter, setZoom } = useMapContext();
    const { setTowers } = useTowerContext();

    // Load cities on mount
    useEffect(() => {
        const loadCities = async () => {
            try {
                const response = await axios.get('http://localhost:3000/api/kabupaten');
                if (response.data) {
                    setCities(response.data);
                    // Set default city to Bandung
                    const defaultCity = response.data.find(city => city.kota === 'BANDUNG');
                    if (defaultCity) {
                        setSelectedCity(defaultCity.kota);
                    }
                }
            } catch (error) {
                console.error('Error loading cities:', error);
                setError('Failed to load cities');
            }
        };

        loadCities();
    }, []);

    // Load towers when city changes
    useEffect(() => {
        const loadCityTowers = async () => {
            if (!selectedCity) return;

            setIsLoading(true);
            try {
                const response = await axios.get(`http://localhost:3000/api/kabupaten/${selectedCity}/towers`);
                if (response.data) {
                    setTowers(response.data);
                    const cityData = cities.find(city => city.kota === selectedCity);
                    if (cityData?.center) {
                        setMapCenter([cityData.center.lat, cityData.center.lng]);
                        setZoom(13);
                    }
                }
            } catch (error) {
                console.error('Error loading towers:', error);
                setError('Failed to load towers for selected city');
            } finally {
                setIsLoading(false);
            }
        };

        loadCityTowers();
    }, [selectedCity, cities, setTowers, setMapCenter, setZoom]);

    const selectCity = (cityId) => {
        setSelectedCity(cityId);
    };

    const value = {
        cities,
        selectedCity,
        selectCity,
        isLoading,
        error
    };

    return (
        <CityContext.Provider value={value}>
            {children}
        </CityContext.Provider>
    );
};

export const useCityContext = () => {
    const context = useContext(CityContext);
    if (!context) {
        throw new Error('useCityContext must be used within a CityProvider');
    }
    return context;
}; 