import React, { useCallback } from 'react';
import { useCityContext } from '../../contexts/CityContext';

const CityControl = () => {
    const { cities, selectedCity, selectCity, isLoading } = useCityContext();

    const handleChange = useCallback((e) => {
        selectCity(e.target.value);
    }, [selectCity]);

    return (
        <div className="city-control">
            <select 
                value={selectedCity || ''}
                onChange={handleChange}
                className="city-select"
                disabled={isLoading}
            >
                <option value="">Pilih Kota</option>
                {cities?.map((city) => (
                    <option key={city.kota} value={city.kota}>
                        {city.kota}
                    </option>
                ))}
            </select>
            {isLoading && <div className="city-loading">Memuat data...</div>}
        </div>
    );
};

export default React.memo(CityControl); 