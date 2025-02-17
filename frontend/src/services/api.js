import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getTowers = () => api.get('/cells');
export const getTowerBySiteId = (siteId) => api.get(`/cells/site/${siteId}`);
export const getCellBySiteId = async (siteId) => {
  try {
    const response = await api.get(`/cells/site/${siteId}`);
    return response;
  } catch (error) {
    console.warn(`Warning: Failed to fetch cells for site ${siteId}:`, error);
    // Return a valid response structure even when there's an error
    return {
      data: {
        site_id: siteId,
        location: {},
        sectors: []
      }
    };
  }
};
export const getBandConfigurations = () => api.get('/band-configurations');
export const getTowerAzimuth = (siteId) => api.get(`/cells/azimuth/${siteId}`);
export const getBandsBySiteId = (siteId) => api.get(`/bands/site/${siteId}`);

export default api; 