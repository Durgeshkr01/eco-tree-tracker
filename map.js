// Initialize Map
let map;
let heatLayer;
let markerGroup;
let isHeatMapView = true;

// Default center (Paralakhemundi, Odisha)
const defaultCenter = [19.3067, 84.8939];
const defaultZoom = 13;

// Initialize the map
function initMap() {
    map = L.map('map').setView(defaultCenter, defaultZoom);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    // Initialize marker cluster group
    markerGroup = L.markerClusterGroup({
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true
    });

    // Load and display data
    loadMapData();
}

// Load data from localStorage
function loadMapData() {
    const history = JSON.parse(localStorage.getItem('treeHistory') || '[]');
    
    if (history.length === 0) {
        document.getElementById('noDataMsg').style.display = 'block';
        updateStatistics(history);
        return;
    }

    document.getElementById('noDataMsg').style.display = 'none';
    
    // Update statistics
    updateStatistics(history);
    
    // Display on map
    displayData(history);
}

// Update statistics dashboard
function updateStatistics(history) {
    const totalTrees = history.length;
    const totalCO2 = history.reduce((sum, item) => sum + (parseFloat(item.co2) || 0), 0);
    const avgCO2 = totalTrees > 0 ? totalCO2 / totalTrees : 0;
    
    // Find most common species
    const speciesCount = {};
    history.forEach(item => {
        const species = item.species || 'Unknown';
        speciesCount[species] = (speciesCount[species] || 0) + 1;
    });
    
    const topSpecies = Object.keys(speciesCount).length > 0 
        ? Object.keys(speciesCount).reduce((a, b) => speciesCount[a] > speciesCount[b] ? a : b)
        : '-';

    // Update UI
    document.getElementById('totalTrees').textContent = totalTrees;
    document.getElementById('totalCO2').innerHTML = totalCO2.toFixed(2) + ' <span class="unit">kg</span>';
    document.getElementById('avgCO2').innerHTML = avgCO2.toFixed(2) + ' <span class="unit">kg</span>';
    document.getElementById('topSpecies').textContent = topSpecies;
}

// Display data on map
function displayData(history) {
    // Clear existing layers
    if (heatLayer) {
        map.removeLayer(heatLayer);
    }
    markerGroup.clearLayers();

    // Filter valid data with coordinates
    const validData = history.filter(item => 
        item.latitude && item.longitude && 
        !isNaN(item.latitude) && !isNaN(item.longitude)
    );

    if (validData.length === 0) {
        return;
    }

    if (isHeatMapView) {
        displayHeatMap(validData);
    } else {
        displayMarkers(validData);
    }

    // Auto-zoom to show all points
    if (validData.length > 0) {
        const bounds = validData.map(item => [item.latitude, item.longitude]);
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Display heat map
function displayHeatMap(data) {
    const heatData = data.map(item => {
        const co2 = parseFloat(item.co2) || 0;
        // Intensity based on CO2 value - REVERSED for correct color mapping
        // High CO2 = high intensity = green (good)
        // Low CO2 = low intensity = red (needs attention)
        const intensity = Math.min(co2 / 150, 1);
        return [item.latitude, item.longitude, intensity];
    });

    heatLayer = L.heatLayer(heatData, {
        radius: 45,
        blur: 18,
        maxZoom: 17,
        max: 1.0,
        minOpacity: 0.5,
        gradient: {
            0.0: '#ff0000',  // Red (LOW CO2 - needs more trees)
            0.25: '#ff6600', // Orange-Red
            0.5: '#ffaa00',  // Orange (MEDIUM CO2)
            0.75: '#80ff00', // Yellow-Green
            1.0: '#00ff00'   // Bright Green (HIGH CO2 - excellent!)
        }
    }).addTo(map);
}

// Display markers
function displayMarkers(data) {
    data.forEach(item => {
        const co2 = parseFloat(item.co2) || 0;
        
        // Color based on CO2 level - HIGH is GOOD (green), LOW needs attention (red)
        let color = '#ff0000'; // Red (LOW CO2)
        let shadowColor = 'rgba(255, 0, 0, 0.6)';
        if (co2 > 100) {
            color = '#00ff00'; // Bright Green (HIGH CO2 - excellent!)
            shadowColor = 'rgba(0, 255, 0, 0.6)';
        } else if (co2 > 50) {
            color = '#ffaa00'; // Orange (MEDIUM CO2)
            shadowColor = 'rgba(255, 170, 0, 0.6)';
        }

        // Custom marker icon
        const markerIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="
                background-color: ${color};
                width: 35px;
                height: 35px;
                border-radius: 50%;
                border: 4px solid white;
                box-shadow: 0 4px 15px ${shadowColor}, 0 0 20px ${shadowColor};
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 13px;
                text-shadow: 0 1px 3px rgba(0,0,0,0.8);
            ">${Math.round(co2)}</div>`,
            iconSize: [35, 35],
            iconAnchor: [17.5, 17.5]
        });

        // Create marker
        const marker = L.marker([item.latitude, item.longitude], { icon: markerIcon });

        // Popup content
        const popupContent = `
            <div style="font-family: 'Segoe UI', sans-serif; min-width: 200px;">
                <h3 style="color: #00d4aa; margin-bottom: 10px; font-size: 1.1rem;">
                    <i class="fas fa-tree"></i> ${item.species || 'Unknown Species'}
                </h3>
                <div style="margin-bottom: 8px;">
                    <strong>🌍 CO2 Absorbed:</strong> <span style="color: #27ae60; font-weight: bold;">${co2.toFixed(2)} kg</span>
                </div>
                <div style="margin-bottom: 8px;">
                    <strong>💨 Oxygen Produced:</strong> ${(item.oxygen || 0).toFixed(2)} kg
                </div>
                <div style="margin-bottom: 8px;">
                    <strong>📏 Circumference:</strong> ${item.circumference || '-'} cm
                </div>
                <div style="margin-bottom: 8px;">
                    <strong>🌱 Age:</strong> ${item.age || 'Not specified'} years
                </div>
                <div style="margin-bottom: 8px;">
                    <strong>📍 Location:</strong><br>
                    Lat: ${parseFloat(item.latitude).toFixed(6)}<br>
                    Lng: ${parseFloat(item.longitude).toFixed(6)}
                </div>
                <div style="font-size: 0.85rem; color: #7f8c8d; margin-top: 10px;">
                    📅 Recorded: ${item.timestamp || 'N/A'}
                </div>
            </div>
        `;

        marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'custom-popup'
        });

        markerGroup.addLayer(marker);
    });

    map.addLayer(markerGroup);
}

// Toggle between heat map and markers
document.getElementById('viewToggle').addEventListener('click', function() {
    isHeatMapView = !isHeatMapView;
    
    const viewModeText = document.getElementById('viewMode');
    const icon = this.querySelector('i');
    
    if (isHeatMapView) {
        viewModeText.textContent = 'Heat Map View';
        icon.className = 'fas fa-fire';
    } else {
        viewModeText.textContent = 'Markers View';
        icon.className = 'fas fa-map-marker-alt';
    }
    
    loadMapData();
});

// Refresh data
document.getElementById('refreshBtn').addEventListener('click', function() {
    const icon = this.querySelector('i');
    icon.classList.add('fa-spin');
    
    setTimeout(() => {
        loadMapData();
        icon.classList.remove('fa-spin');
    }, 500);
});

// Clear all data
document.getElementById('clearDataBtn').addEventListener('click', function() {
    if (confirm('Are you sure you want to delete all tree records? This action cannot be undone!')) {
        localStorage.removeItem('treeHistory');
        location.reload();
    }
});

// Initialize map when page loads
document.addEventListener('DOMContentLoaded', initMap);

// Add custom CSS for popup
const style = document.createElement('style');
style.textContent = `
    .custom-popup .leaflet-popup-content-wrapper {
        border-radius: 15px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
    }
    
    .custom-popup .leaflet-popup-tip {
        background: white;
    }
    
    .leaflet-marker-icon.custom-marker {
        background: transparent !important;
        border: none !important;
    }
`;
document.head.appendChild(style);
