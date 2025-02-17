import React, { useState, useCallback } from 'react';
import { useTowerContext } from '../../contexts/TowerContext';
import { useMapContext } from '../../contexts/MapContext';
import axios from 'axios';

const SearchControl = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [localError, setLocalError] = useState('');
    const { searchTower, isSearching, searchError } = useTowerContext();
    const { flyToLocation } = useMapContext();

    const validateSiteId = useCallback((siteId) => {
        if (!siteId) return 'Site ID tidak boleh kosong';
        if (siteId.length < 3) return 'Site ID minimal 3 karakter';
        if (!/^[A-Z0-9]+$/.test(siteId)) return 'Site ID hanya boleh mengandung huruf dan angka';
        return '';
    }, []);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        const query = searchQuery.trim().toUpperCase();
        setLocalError('');
        
        const validationError = validateSiteId(query);
        if (validationError) {
            setLocalError(validationError);
            return;
        }

        try {
            const response = await axios.get(`http://localhost:3000/api/towers/${query}`);
            const towerData = response.data;

            if (!towerData?.location?.latitude || !towerData?.location?.longitude) {
                throw new Error('Data lokasi tower tidak ditemukan');
            }

            const { latitude, longitude } = towerData.location;
            flyToLocation(latitude, longitude);
            await searchTower(query);
            setSearchQuery(''); // Clear input after successful search
            
        } catch (error) {
            console.error('Search failed:', error);
            if (error.response?.status === 404) {
                setLocalError(`Tower dengan ID ${query} tidak ditemukan`);
            } else if (error.response?.data?.message) {
                setLocalError(error.response.data.message);
            } else {
                setLocalError('Terjadi kesalahan saat mencari tower');
            }
        }
    }, [searchQuery, flyToLocation, searchTower, validateSiteId]);

    const handleChange = useCallback((e) => {
        const value = e.target.value.toUpperCase();
        setSearchQuery(value);
        setLocalError('');
    }, []);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            setSearchQuery('');
            setLocalError('');
        }
    }, []);

    return (
        <div className="search-control">
            <form onSubmit={handleSubmit} className="search-form">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Masukkan Site ID..."
                    className={`search-input ${(localError || searchError) ? 'error' : ''}`}
                    autoFocus
                    maxLength={10}
                />
                <button 
                    type="submit"
                    className="search-button"
                    disabled={isSearching || !searchQuery.trim()}
                >
                    {isSearching ? 'Searching...' : 'Search'}
                </button>
            </form>
            {(localError || searchError) && (
                <div className="search-error">
                    {localError || searchError}
                </div>
            )}
        </div>
    );
};

export default React.memo(SearchControl); 