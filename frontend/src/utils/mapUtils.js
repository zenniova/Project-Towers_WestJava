// Fungsi untuk kalkulasi triangle
export const calculateTrianglePoints = (center, azimuth, radius, beamwidth) => {
    const toRad = (deg) => (deg * Math.PI) / 180;
    
    const lat = parseFloat(center[0]);
    const lng = parseFloat(center[1]);
    const R = 6378137; // Radius bumi dalam meter

    const radiusDeg = (radius / R) * (180 / Math.PI);
    
    const points = [];
    points.push([lat, lng]); // Titik pusat

    const halfBeam = beamwidth / 2;
    const angle1 = azimuth - halfBeam;
    const angle2 = azimuth + halfBeam;

    // Hitung titik kedua
    const lat2 = lat + radiusDeg * Math.cos(toRad(angle1));
    const lng2 = lng + radiusDeg * Math.sin(toRad(angle1)) / Math.cos(toRad(lat));
    points.push([lat2, lng2]);

    // Hitung titik ketiga
    const lat3 = lat + radiusDeg * Math.cos(toRad(angle2));
    const lng3 = lng + radiusDeg * Math.sin(toRad(angle2)) / Math.cos(toRad(lat));
    points.push([lat3, lng3]);

    return points;
};

// Fungsi untuk mendapatkan warna band
export const getBandColor = (band) => {
    const colors = {
        'DCS': '#FF0000',    // Merah
        'L900': '#00FF00',   // Hijau
        'L1800': '#0000FF',  // Biru
        'L2100': '#FFA500',  // Orange
        'L2300': '#800080',  // Ungu
        'N2300': '#FFC0CB'   // Pink
    };
    return colors[band] || '#808080'; // Abu-abu sebagai default
}; 