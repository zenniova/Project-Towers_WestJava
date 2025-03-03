import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const PayloadChart = ({ cellname, height = 200 }) => {
    const [chartData, setChartData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sortedData, setSortedData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!cellname) {
                setError('No cellname provided');
                setLoading(false);
                return;
            }

            try {
                console.log('Fetching data for cellname:', cellname);
                const response = await fetch(`http://localhost:3000/api/payload/cellname/${cellname}`);
                
                const data = await response.json();
                console.log('Raw response data:', data);

                if (!data) {
                    console.error('No data received from API');
                    setError('No data received from API');
                    setChartData(null);
                    return;
                }

                if (!data.data || !Array.isArray(data.data)) {
                    console.error('Invalid data format received:', data);
                    setError('Invalid data format received');
                    setChartData(null);
                    return;
                }

                if (data.data.length === 0) {
                    console.log('No payload data available for:', cellname);
                    setError(data.message || 'No payload data available');
                    setChartData(null);
                    return;
                }

                // Aggregate data by date
                const aggregatedData = data.data.reduce((acc, curr) => {
                    const date = new Date(curr.date).toISOString().split('T')[0];
                    if (!acc[date]) {
                        acc[date] = {
                            date: date,
                            payload: 0,
                            count: 0
                        };
                    }
                    acc[date].payload += Number(curr.payload);
                    acc[date].count += 1;
                    return acc;
                }, {});

                // Convert to array and calculate average
                const processedData = Object.values(aggregatedData).map(item => ({
                    date: item.date,
                    payload: item.payload
                }));

                // Sort data by date and store in state
                const newSortedData = processedData.sort((a, b) => new Date(a.date) - new Date(b.date));
                setSortedData(newSortedData);

                console.log('Processed data:', {
                    original: data.data.length,
                    aggregated: newSortedData.length,
                    data: newSortedData
                });

                const chartData = {
                    labels: newSortedData.map(item => {
                        const date = new Date(item.date);
                        return date.toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short'
                        });
                    }),
                    datasets: [
                        {
                            id: `payload-${cellname}`,
                            label: `Daily Total Payload`,
                            data: newSortedData.map(item => {
                                return Number(item.payload).toFixed(2);
                            }),
                            fill: false,
                            borderColor: 'rgb(26, 115, 232)',
                            backgroundColor: 'rgb(26, 115, 232)',
                            borderWidth: 2,
                            tension: 0,
                            pointRadius: 5,
                            pointBackgroundColor: 'rgb(26, 115, 232)',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                            pointHoverRadius: 8,
                            pointHoverBackgroundColor: 'rgb(26, 115, 232)',
                            pointHoverBorderColor: '#fff',
                            pointHoverBorderWidth: 2,
                            spanGaps: false
                        }
                    ]
                };

                setChartData(chartData);
                setError(null);

            } catch (err) {
                console.error('Error fetching payload data:', err);
                setError(`Error: ${err.message}`);
                setChartData(null);
                setSortedData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [cellname]);

    if (loading) {
        return (
            <div className="chart-loading" style={{ height }}>
                <p>Loading payload data for {cellname}...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="chart-error" style={{ height }}>
                <p>Error: {error}</p>
                <p>Cellname: {cellname}</p>
            </div>
        );
    }

    if (!chartData) {
        return (
            <div className="chart-empty" style={{ height }}>
                <p>No payload data available for {cellname}</p>
            </div>
        );
    }

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 750,
            easing: 'easeInOutQuart'
        },
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    usePointStyle: true,
                    padding: 15,
                    font: {
                        size: 12,
                        weight: '600'
                    },
                    generateLabels: (chart) => [{
                        text: 'Daily Total Payload (GB)',
                        fillStyle: 'rgb(26, 115, 232)',
                        strokeStyle: 'rgb(26, 115, 232)',
                        lineWidth: 2,
                        hidden: false,
                        pointStyle: 'circle'
                    }]
                }
            },
            title: {
                display: true,
                text: `Daily Total Payload Data - ${cellname}`,
                font: {
                    size: 14,
                    weight: 'bold',
                    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
                },
                padding: {
                    top: 10,
                    bottom: 20
                },
                color: '#333'
            },
            tooltip: {
                enabled: true,
                mode: 'nearest',
                intersect: true,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#333',
                bodyColor: '#333',
                borderColor: '#ddd',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
                displayColors: false,
                titleFont: {
                    size: 13,
                    weight: '600',
                    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
                },
                bodyFont: {
                    size: 12,
                    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
                },
                callbacks: {
                    title: (tooltipItems) => {
                        if (!sortedData[tooltipItems[0].dataIndex]) return '';
                        const date = new Date(sortedData[tooltipItems[0].dataIndex].date);
                        return date.toLocaleDateString('id-ID', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                    },
                    label: (context) => {
                        const value = parseFloat(context.raw);
                        return `Total Payload: ${value.toFixed(2)} GB`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.06)',
                    drawBorder: false,
                    lineWidth: 1
                },
                border: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Daily Payload (GB)',
                    font: {
                        weight: '600',
                        size: 12,
                        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
                    },
                    color: '#666'
                },
                ticks: {
                    callback: (value) => `${value} GB`,
                    font: {
                        size: 11,
                        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
                    },
                    color: '#666',
                    padding: 8
                }
            },
            x: {
                grid: {
                    display: false
                },
                border: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Date',
                    font: {
                        weight: '600',
                        size: 12,
                        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
                    },
                    color: '#666'
                },
                ticks: {
                    font: {
                        size: 11,
                        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
                    },
                    color: '#666',
                    maxRotation: 45,
                    minRotation: 45,
                    padding: 8,
                    autoSkip: false
                }
            }
        },
        interaction: {
            mode: 'nearest',
            intersect: true,
            axis: 'x'
        },
        layout: {
            padding: {
                left: 15,
                right: 15,
                top: 5,
                bottom: 25
            }
        },
        elements: {
            line: {
                tension: 0
            },
            point: {
                hitRadius: 10,
                hoverRadius: 8
            }
        }
    };

    return (
        <div style={{ 
            width: '100%', 
            height,
            backgroundColor: '#ffffff',
            padding: '15px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease'
        }} className="chart-wrapper">
            <Line options={options} data={chartData} />
        </div>
    );
};

export default PayloadChart; 