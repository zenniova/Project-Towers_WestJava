// Get color based on site type
const getSiteTypeColor = (siteType) => {
    if (!siteType) return { fill: '#ea4335', border: '#c5221f' }; // default red

    switch(siteType.toLowerCase()) {
        case 'macro':
            return { fill: '#ea4335', border: '#c5221f' }; // red
        case 'outdoor':
            return { fill: '#fbbc04', border: '#f9ab00' }; // yellow
        case 'easy macro':
            return { fill: '#34a853', border: '#2d8544' }; // green
        case 'indoor':
            return { fill: '#9e9e9e', border: '#757575' }; // grey
        case 'lampsite':
            return { fill: '#4285f4', border: '#1a73e8' }; // blue
        case 'femto':
            return { fill: '#673ab7', border: '#5e35b1' }; // purple
        default:
            return { fill: '#ea4335', border: '#c5221f' }; // default red
    }
};

export const getMarkerStyle = (isSelected, isNearby, isIndoor, siteType) => {
    // Base style based on site type
    const typeColors = getSiteTypeColor(siteType);
    
    if (isSelected) {
        return {
            fillColor: '#1a73e8',
            color: '#1557b0',
            weight: 2,
            fillOpacity: isIndoor ? 1 : 0.7,
            radius: isIndoor ? 2 : 8
        };
    }
    
    if (isNearby) {
        return {
            fillColor: '#34a853',
            color: '#2d8544',
            weight: 2,
            fillOpacity: isIndoor ? 1 : 0.6,
            radius: isIndoor ? 2 : 6
        };
    }
    
    // Style based on site type
    return {
        fillColor: typeColors.fill,
        color: typeColors.border,
        weight: isIndoor ? 1 : 1.5,
        fillOpacity: isIndoor ? 1 : 0.5,
        radius: isIndoor ? 2 : 5
    };
};

export const getSectorStyle = (azimuth, radius, beamwidth) => {
    return {
        color: '#fbbc04',
        weight: 2,
        fillColor: '#fbbc04',
        fillOpacity: 0.2,
        startAngle: azimuth - beamwidth / 2,
        endAngle: azimuth + beamwidth / 2,
        radius: radius
    };
}; 