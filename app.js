// Main Application Logic
let calculationHistory = [];
let selectedTreeIndex = null;
let treeSearchIndex = [];
let treeSearchDebounceTimer = null;
let lastIndexedSpeciesCount = 0;

const MAX_SEARCH_RESULTS = 80;
const SEARCH_DEBOUNCE_MS = 100;

// Logout function
window.logout = () => {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('studentSession');
        localStorage.removeItem('adminSession');
        window.location.href = 'login.html';
    }
};

// Load history from localStorage on page load
document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    initializeTreeSearch();
    initializeMethodControls();
    animatePageLoad();
    initializeGPSLocation();

    indianCalculator.loadWoodDensityArchive()
        .then(() => refreshWoodDensityForSelection())
        .catch(() => {
            // Built-in densities remain available even if archive load fails.
        });
});

// Initialize GPS Location functionality
function initializeGPSLocation() {
    const getLocationBtn = document.getElementById('getLocationBtn');
    const lockLocationBtn = document.getElementById('lockLocationBtn');
    const unlockLocationBtn = document.getElementById('unlockLocationBtn');
    let lockedLocation = null;
    let lockModeActive = false;
    
    // Check if location is already locked in session
    const savedLocation = sessionStorage.getItem('lockedLocation');
    if (savedLocation) {
        const location = JSON.parse(savedLocation);
        lockedLocation = location;
        document.getElementById('latitude').value = location.lat;
        document.getElementById('longitude').value = location.lon;
        getLocationBtn.style.display = 'none';
        lockLocationBtn.style.display = 'block';
        unlockLocationBtn.style.display = 'block';
    }
    
    // Main location button handler
    getLocationBtn.addEventListener('click', function handleLocationClick(e) {
        e.preventDefault();
        
        // If in lock mode, lock the location
        if (lockModeActive) {
            const lat = document.getElementById('latitude').value;
            const lon = document.getElementById('longitude').value;
            
            if (!lat || !lon) {
                alert('No location to lock!');
                return;
            }
            
            lockedLocation = { lat, lon };
            sessionStorage.setItem('lockedLocation', JSON.stringify(lockedLocation));
            getLocationBtn.style.display = 'none';
            lockLocationBtn.style.display = 'block';
            unlockLocationBtn.style.display = 'block';
            lockModeActive = false;
            alert('📍 Location locked! Same coordinates will be used for all trees.');
            return;
        }
        
        // Get location from GPS
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }
        
        getLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting...';
        getLocationBtn.disabled = true;
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude.toFixed(6);
                const lon = position.coords.longitude.toFixed(6);
                
                document.getElementById('latitude').value = lat;
                document.getElementById('longitude').value = lon;
                
                getLocationBtn.innerHTML = '<i class="fas fa-lock"></i> Lock Location';
                getLocationBtn.disabled = false;
                getLocationBtn.style.background = '#27ae60';
                lockModeActive = true;
            },
            (error) => {
                console.error('Geolocation error:', error);
                alert('Unable to get location: ' + error.message);
                getLocationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Get Location';
                getLocationBtn.disabled = false;
                lockModeActive = false;
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
    
    // Unlock location
    unlockLocationBtn.addEventListener('click', (e) => {
        e.preventDefault();
        lockedLocation = null;
        sessionStorage.removeItem('lockedLocation');
        document.getElementById('latitude').value = '';
        document.getElementById('longitude').value = '';
        getLocationBtn.style.display = 'block';
        getLocationBtn.style.background = '';
        getLocationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Get Location';
        lockLocationBtn.style.display = 'none';
        unlockLocationBtn.style.display = 'none';
        lockModeActive = false;
    });
    
    // Auto-fill locked location when form is reset
    document.getElementById('treeForm').addEventListener('reset', () => {
        if (lockedLocation) {
            setTimeout(() => {
                document.getElementById('latitude').value = lockedLocation.lat;
                document.getElementById('longitude').value = lockedLocation.lon;
            }, 100);
        }
    });
}

// Animate page elements on load
function animatePageLoad() {
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease-out';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 150);
    });
}

// Initialize tree search functionality
function initializeTreeSearch() {
    const searchInput = document.getElementById('treeSearch');
    const dropdown = document.getElementById('treeDropdown');
    ensureTreeSearchIndex();
    
    // Search on input
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value;

        if (treeSearchDebounceTimer) {
            clearTimeout(treeSearchDebounceTimer);
        }

        if (!query.trim()) {
            dropdown.classList.remove('active');
            return;
        }

        treeSearchDebounceTimer = setTimeout(() => {
            showTreeOptions(query);
        }, SEARCH_DEBOUNCE_MS);
    });
    
    // Show dropdown on focus with text
    searchInput.addEventListener('focus', (e) => {
        if (e.target.value.trim()) {
            showTreeOptions(e.target.value);
        }
    });
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.form-group')) {
            dropdown.classList.remove('active');
        }
    });
}

function normalizeSearchText(value) {
    return (value || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function ensureTreeSearchIndex() {
    if (!Array.isArray(treeSpeciesData) || treeSpeciesData.length === 0) {
        treeSearchIndex = [];
        lastIndexedSpeciesCount = 0;
        return;
    }

    if (treeSpeciesData.length === lastIndexedSpeciesCount && treeSearchIndex.length > 0) {
        return;
    }

    treeSearchIndex = treeSpeciesData.map((tree, index) => {
        const name = tree.name || '';
        const scientific = tree.scientific || '';

        return {
            index,
            name,
            scientific,
            nameSearch: normalizeSearchText(name),
            scientificSearch: normalizeSearchText(scientific)
        };
    });

    lastIndexedSpeciesCount = treeSpeciesData.length;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Show tree options based on search query
function showTreeOptions(query) {
    const dropdown = document.getElementById('treeDropdown');
    ensureTreeSearchIndex();

    const searchQuery = normalizeSearchText(query);
    if (!searchQuery) {
        dropdown.classList.remove('active');
        return;
    }

    const startsWithMatches = [];
    const containsMatches = [];

    for (let i = 0; i < treeSearchIndex.length; i++) {
        const tree = treeSearchIndex[i];
        const nameStarts = tree.nameSearch.startsWith(searchQuery);
        const scientificStarts = tree.scientificSearch.startsWith(searchQuery);
        const nameContains = tree.nameSearch.includes(searchQuery);
        const scientificContains = tree.scientificSearch.includes(searchQuery);

        if (nameStarts || scientificStarts) {
            startsWithMatches.push(tree);
        } else if (nameContains || scientificContains) {
            containsMatches.push(tree);
        }

        if ((startsWithMatches.length + containsMatches.length) >= MAX_SEARCH_RESULTS) {
            break;
        }
    }

    const filteredTrees = startsWithMatches.concat(containsMatches);
    
    if (filteredTrees.length === 0) {
        dropdown.innerHTML = '<div class="no-results">No trees found</div>';
        dropdown.classList.add('active');
        return;
    }
    
    dropdown.innerHTML = filteredTrees.map((tree) => {
        const originalIndex = tree.index;
        const isSelected = selectedTreeIndex === originalIndex;
        return `
            <div class="tree-option ${isSelected ? 'selected' : ''}" onclick="selectTree(${originalIndex})">
                <div><strong>${escapeHtml(tree.name)}</strong></div>
                <div class="tree-scientific">${escapeHtml(tree.scientific)}</div>
            </div>
        `;
    }).join('');
    
    dropdown.classList.add('active');
}

// Select a tree from dropdown
function selectTree(index) {
    selectedTreeIndex = index;
    const tree = treeSpeciesData[index];
    
    // Update search input
    document.getElementById('treeSearch').value = tree.name;
    
    // Update hidden select
    document.getElementById('treeSpecies').value = index;
    
    // Hide dropdown
    document.getElementById('treeDropdown').classList.remove('active');

    // Auto-fill density as soon as a species is selected.
    refreshWoodDensityForSelection();
}

function initializeMethodControls() {
    const methodSelect = document.getElementById('biomassMethod');
    const heightGroup = document.getElementById('treeHeightGroup');
    const heightInput = document.getElementById('treeHeight');

    if (!methodSelect || !heightGroup || !heightInput) {
        return;
    }

    const updateMethodState = () => {
        const requiresHeight = methodSelect.value === 'method2';
        heightGroup.style.display = requiresHeight ? 'block' : 'none';
        heightInput.required = requiresHeight;

        if (!requiresHeight) {
            heightInput.value = '';
        }
    };

    methodSelect.addEventListener('change', updateMethodState);
    updateMethodState();
}

function refreshWoodDensityForSelection() {
    const woodDensityInput = document.getElementById('woodDensity');
    const woodDensitySource = document.getElementById('woodDensitySource');

    if (!woodDensityInput || !woodDensitySource) {
        return;
    }

    if (selectedTreeIndex === null || selectedTreeIndex === undefined) {
        woodDensityInput.value = '';
        woodDensitySource.textContent = 'Select a tree species to auto-fill wood density.';
        return;
    }

    const tree = treeSpeciesData[selectedTreeIndex];
    const densityDetails = indianCalculator.getWoodDensityDetails(tree?.name, tree?.scientific);

    woodDensityInput.value = Number(densityDetails.density).toFixed(3);
    woodDensitySource.textContent = `Auto-filled: ${densityDetails.source}`;
}

// Form submission handler
document.getElementById('treeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Validate tree selection
    if (selectedTreeIndex === null) {
        alert('Please select a tree species!');
        return;
    }
    
    performCalculation();
});

// Perform calculation
function performCalculation() {
    // Get form values
    const speciesIndex = selectedTreeIndex;
    const circumference = parseFloat(document.getElementById('circumference').value);
    const method = document.getElementById('biomassMethod')?.value || 'method1';
    const heightM = parseFloat(document.getElementById('treeHeight')?.value);
    const forestType = document.getElementById('forestType')?.value || 'broadleaf';
    const woodDensityOverride = parseFloat(document.getElementById('woodDensity')?.value);
    const age = document.getElementById('age')?.value || 'N/A';
    const latitude = document.getElementById('latitude')?.value || 'Not captured';
    const longitude = document.getElementById('longitude')?.value || 'Not captured';

    // Validate inputs (speciesIndex can be 0, so check for null/undefined)
    if (speciesIndex === null || speciesIndex === undefined || !circumference) {
        alert('Please fill in Tree Species and Circumference!');
        return;
    }

    if (method === 'method2' && (!Number.isFinite(heightM) || heightM <= 0)) {
        alert('Method 2 requires tree height in meters. Please enter a valid height.');
        return;
    }

    if (!Number.isFinite(woodDensityOverride) || woodDensityOverride <= 0) {
        alert('Wood density is required. Please select a species or enter a valid wood density.');
        return;
    }

    // Get tree species data
    const treeData = getTreeData(speciesIndex);

    // Calculate results using Chave (2014) method selection
    const results = indianCalculator.calculate(circumference, treeData.name, heightM, {
        scientificName: treeData.scientific,
        method,
        forestType,
        woodDensityOverride
    });

    // Display results
    displayResults(treeData, results, age, latitude, longitude);

    // Save to history
    saveToHistory(treeData, results, age, latitude, longitude);

    // Scroll to results
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
}

// Display results in the UI
function displayResults(treeData, results, age, latitude, longitude) {
    // Show results section
    document.getElementById('resultsSection').style.display = 'block';

    // Update tree summary
    document.getElementById('treeName').textContent = treeData.name;
    document.getElementById('treeDetails').innerHTML = `
        <p><strong>Scientific Name:</strong> ${treeData.scientific}</p>
        <p><strong>Circumference:</strong> ${results.inputs.circumference} cm</p>
        <p><strong>DBH (Calculated):</strong> ${results.inputs.dbh} cm</p>
        <p><strong>Method:</strong> ${results.inputs.methodLabel}</p>
        <p><strong>Height Used:</strong> ${results.inputs.height === 'Not used' ? 'Not used' : `${results.inputs.height} m`}</p>
        <p><strong>Wood Density:</strong> ${results.inputs.woodDensity} g/cm^3 (${results.inputs.woodDensitySource})</p>
        <p><strong>Forest Type:</strong> ${results.inputs.forestType} (CF ${results.inputs.carbonFraction})</p>
        <p><strong>Age:</strong> ${age} years</p>
        <p><strong>GPS Location:</strong> ${latitude}, ${longitude}</p>
    `;

    // Update result cards
    document.getElementById('biomassValue').textContent = results.biomass.total;
    document.getElementById('agbValue').textContent = results.biomass.aboveGround;
    document.getElementById('bgbValue').textContent = results.biomass.belowGround;
    document.getElementById('carbonValue').textContent = results.carbon;

    document.getElementById('oxygenValue').textContent = results.oxygen;
    document.getElementById('pollutionValue').textContent = results.pollution;

    // Update equivalents
    document.getElementById('peopleEquivalent').textContent = results.equivalents.people;
    document.getElementById('carEquivalent').textContent = results.equivalents.carKm;
    document.getElementById('homeEquivalent').textContent = results.equivalents.homeDays;

    // Display tree information for agriculture users
    const treeInfoCard = document.getElementById('treeInfoCard');
    if (treeData.info) {
        document.getElementById('treeUses').textContent = treeData.info.uses;
        document.getElementById('treeBenefits').textContent = treeData.info.benefits;
        document.getElementById('treeFact').textContent = treeData.info.fact;
        treeInfoCard.style.display = 'block';
    } else {
        treeInfoCard.style.display = 'none';
    }

    // Add animation
    animateResults();
}

// Animate result cards
function animateResults() {
    const cards = document.querySelectorAll('.result-card');
    cards.forEach((card, index) => {
        card.style.animation = 'none';
        setTimeout(() => {
            card.style.animation = `fadeIn 0.5s ease-in ${index * 0.1}s forwards`;
        }, 10);
    });
}

// Save calculation to history
function saveToHistory(treeData, results, age, latitude, longitude) {
    const calculation = {
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        tree: treeData.name,
        species: treeData.name,  // For map.js compatibility
        age: age,
        latitude: latitude,
        longitude: longitude,
        circumference: parseFloat(document.getElementById('circumference').value),
        method: results.inputs.method,
        methodLabel: results.inputs.methodLabel,
        forestType: results.inputs.forestType,
        woodDensity: results.inputs.woodDensity,
        heightUsed: results.inputs.height,
        co2: results.co2,
        oxygen: results.oxygen,
        results: results
    };

    calculationHistory.unshift(calculation);

    // Keep only last 20 calculations
    if (calculationHistory.length > 20) {
        calculationHistory = calculationHistory.slice(0, 20);
    }

    // Save to localStorage (both keys for compatibility)
    localStorage.setItem('treeCalculations', JSON.stringify(calculationHistory));
    localStorage.setItem('treeHistory', JSON.stringify(calculationHistory));

    // Update history display
    displayHistory();
    
    // If user is logged in, submit to Firebase for admin
    submitToAdmin(treeData, results, age, latitude, longitude);
}

// Submit data to admin's Firebase collection
async function submitToAdmin(treeData, results, age, latitude, longitude) {
    const studentSession = localStorage.getItem('studentSession');
    if (!studentSession) {
        console.log('⚠️ No user session found, skipping admin submission');
        return;
    }
    
    const session = JSON.parse(studentSession);
    console.log('📤 Submitting data to admin:', session.adminUsername);
    
    try {
        const { getFirestore, collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        const db = getFirestore(window.firebaseApp);
        
        const submissionData = {
            adminUsername: session.adminUsername,
            studentId: session.studentId,
            accessCode: session.accessCode,
            treeName: treeData.name,
            scientificName: treeData.scientific,
            circumference: parseFloat(document.getElementById('circumference').value),
            dbh: results.inputs.dbh,
            method: results.inputs.method,
            methodLabel: results.inputs.methodLabel,
            forestType: results.inputs.forestType,
            woodDensity: results.inputs.woodDensity,
            woodDensitySource: results.inputs.woodDensitySource,
            heightUsed: results.inputs.height,
            carbonFraction: results.inputs.carbonFraction,
            age: age,
            latitude: latitude,
            longitude: longitude,
            totalBiomass: results.biomass.total,
            agb: results.biomass.aboveGround,
            bgb: results.biomass.belowGround,
            carbon: results.carbon,
            co2: results.co2,
            oxygen: results.oxygen,
            pollution: results.pollution,
            timestamp: new Date().toISOString()
        };
        
        console.log('📋 Submission data:', submissionData);
        
        const docRef = await addDoc(collection(db, 'submissions'), submissionData);
        
        console.log('✅ Data submitted successfully! Doc ID:', docRef.id);
    } catch (error) {
        console.error('❌ Error submitting to admin:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
    }
}

// Load history from localStorage
function loadHistory() {
    const saved = localStorage.getItem('treeCalculations');
    if (saved) {
        calculationHistory = JSON.parse(saved);
        displayHistory();
    }
}

// Display history list
function displayHistory() {
    const historyList = document.getElementById('historyList');

    if (calculationHistory.length === 0) {
        historyList.innerHTML = '<p class="no-history">No calculations yet. Start by calculating a tree\'s impact!</p>';
        return;
    }

    historyList.innerHTML = calculationHistory.map(calc => `
        <div class="history-item" onclick="loadCalculation(${calc.id})">
            <div class="history-info">
                <h4>🌳 ${calc.tree}</h4>
                <p>${calc.timestamp} • ${calc.latitude || 'N/A'}, ${calc.longitude || 'N/A'}</p>
            </div>
            <div class="history-stats">
                <div class="stat-badge">
                    <strong>${calc.results.oxygen}</strong>
                    <small>kg O₂</small>
                </div>
                <button class="delete-btn" onclick="deleteCalculation(event, ${calc.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Load a calculation from history
function loadCalculation(id) {
    const calc = calculationHistory.find(c => c.id === id);
    if (!calc) return;

    // Find tree in database
    const treeIndex = treeSpeciesData.findIndex(t => t.name === calc.tree);
    const treeData = treeSpeciesData[treeIndex];

    // Display the calculation
    displayResults(treeData, calc.results, calc.age, calc.latitude || 'N/A', calc.longitude || 'N/A');
}

// Delete a calculation from history
function deleteCalculation(event, id) {
    event.stopPropagation();

    if (confirm('Delete this calculation?')) {
        calculationHistory = calculationHistory.filter(c => c.id !== id);
        localStorage.setItem('treeCalculations', JSON.stringify(calculationHistory));
        displayHistory();
    }
}

// Clear all history
document.getElementById('clearHistory').addEventListener('click', () => {
    if (confirm('Clear all calculation history?')) {
        calculationHistory = [];
        localStorage.removeItem('treeCalculations');
        displayHistory();
    }
});

// Export history to Excel
document.getElementById('exportExcel').addEventListener('click', () => {
    if (calculationHistory.length === 0) {
        alert('No calculation history to export!');
        return;
    }

    // Prepare data for Excel
    const excelData = calculationHistory.map((calc, index) => {
        return {
            'Sr. No.': index + 1,
            'Date & Time': calc.timestamp,
            'Tree Name': calc.tree,
            'Tree Age (years)': calc.age,
            'Latitude': calc.latitude || 'N/A',
            'Longitude': calc.longitude || 'N/A',
            'Method': calc.results.inputs.methodLabel,
            'Forest Type': calc.results.inputs.forestType,
            'Wood Density (g/cm^3)': calc.results.inputs.woodDensity,
            'Height Used (m)': calc.results.inputs.height,
            'Circumference (cm)': calc.results.inputs.circumference,
            'DBH (cm)': calc.results.inputs.dbh,
            'Total Biomass (kg)': calc.results.biomass.total,
            'Above-Ground Biomass (kg)': calc.results.biomass.aboveGround,
            'Below-Ground Biomass (kg)': calc.results.biomass.belowGround,
            'Carbon Stored (kg C)': calc.results.carbon,
            'Oxygen Produced (kg/year)': calc.results.oxygen,
            'Pollution Absorbed (kg/year)': calc.results.pollution,
            'People Oxygen Equivalent': calc.results.equivalents.people,
            'Car KM Offset': calc.results.equivalents.carKm,
            'Home Days Offset': calc.results.equivalents.homeDays
        };
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
        { wch: 8 },  // Sr. No.
        { wch: 20 }, // Date & Time
        { wch: 25 }, // Tree Name
        { wch: 15 }, // Age
        { wch: 12 }, // Latitude
        { wch: 12 }, // Longitude
        { wch: 40 }, // Method
        { wch: 16 }, // Forest Type
        { wch: 18 }, // Wood Density
        { wch: 16 }, // Height Used
        { wch: 18 }, // Circumference
        { wch: 12 }, // DBH
        { wch: 20 }, // Total Biomass
        { wch: 25 }, // AGB
        { wch: 25 }, // BGB
        { wch: 20 }, // Carbon
        { wch: 25 }, // Oxygen
        { wch: 25 }, // Pollution
        { wch: 22 }, // People Oxygen
        { wch: 15 }, // Car KM
        { wch: 15 }  // Home Days
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Tree Calculations');

    // Generate filename with timestamp
    const filename = `EcoTree_History_${new Date().toISOString().slice(0, 10)}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);
    
    alert(`Excel file "${filename}" downloaded successfully!`);
});

// Download PDF functionality
// Download PDF functionality
document.getElementById('downloadPDF').addEventListener('click', () => {
    // Check if results exist
    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection.style.display === 'none') {
        alert('Please calculate tree data first before downloading PDF!');
        return;
    }
    
    // Get all result values
    const treeName = document.getElementById('treeName').textContent || 'Tree';
    const biomass = document.getElementById('biomassValue').textContent || '0';
    const agb = document.getElementById('agbValue').textContent || '0';
    const bgb = document.getElementById('bgbValue').textContent || '0';
    const carbon = document.getElementById('carbonValue').textContent || '0';

    const oxygen = document.getElementById('oxygenValue').textContent || '0';
    const pollution = document.getElementById('pollutionValue').textContent || '0';
    const people = document.getElementById('peopleEquivalent').textContent || '0';
    const car = document.getElementById('carEquivalent').textContent || '0';
    const home = document.getElementById('homeEquivalent').textContent || '0';
    
    // Get tree details
    const detailLines = Array.from(document.querySelectorAll('#treeDetails p'));
    const getDetailLine = (labelText) => {
        const line = detailLines.find((el) => el.textContent.includes(labelText));
        return line ? line.textContent : '';
    };
    
    const circumference = getDetailLine('Circumference:');
    const dbh = getDetailLine('DBH (Calculated):');
    const age = getDetailLine('Age:');
    const gpsLocation = getDetailLine('GPS Location:');
    
    // Use jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Colors
    const green = [46, 204, 113];
    const darkGreen = [39, 174, 96];
    const dark = [44, 62, 80];
    const gray = [127, 140, 141];
    
    let y = 20;
    
    // Header
    doc.setFillColor(46, 204, 113);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('EcoTree Tracker', 105, 18, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Tree Carbon & Oxygen Calculation Report', 105, 28, { align: 'center' });
    
    y = 45;
    
    // Tree Info Box
    doc.setFillColor(232, 245, 233);
    doc.roundedRect(15, y, 180, 35, 3, 3, 'F');
    doc.setDrawColor(46, 204, 113);
    doc.setLineWidth(0.5);
    doc.roundedRect(15, y, 180, 35, 3, 3, 'S');
    
    doc.setTextColor(...darkGreen);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(treeName, 20, y + 12);
    
    doc.setTextColor(...dark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(circumference, 20, y + 22);
    doc.text(dbh, 80, y + 22);
    doc.text(age, 20, y + 30);
    doc.text(gpsLocation, 80, y + 30);
    
    y = 90;
    
    // Results Grid
    const cards = [
        { title: 'Total Biomass', value: biomass, unit: 'kg', color: [243, 156, 18], extra: `AGB: ${agb} | BGB: ${bgb}` },
        { title: 'Carbon Stored', value: carbon, unit: 'kg C', color: [149, 165, 166] },
        { title: 'Oxygen Production', value: oxygen, unit: 'kg O2/year', color: [26, 188, 156] },
        { title: 'Air Pollution Removed', value: pollution, unit: 'kg/year', color: [231, 76, 60] }
    ];
    
    let cardX = 15;
    let cardY = y;
    const cardW = 87;
    const cardH = 38;
    
    cards.forEach((card, i) => {
        if (i > 0 && i % 2 === 0) {
            cardX = 15;
            cardY += cardH + 5;
        }
        
        // Card border
        doc.setDrawColor(...card.color);
        doc.setLineWidth(1);
        doc.roundedRect(cardX, cardY, cardW, cardH, 2, 2, 'S');
        
        // Card content
        doc.setTextColor(...dark);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(card.title, cardX + cardW/2, cardY + 10, { align: 'center' });
        
        doc.setTextColor(...green);
        doc.setFontSize(18);
        doc.text(card.value, cardX + cardW/2, cardY + 22, { align: 'center' });
        
        doc.setTextColor(...gray);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(card.unit, cardX + cardW/2, cardY + 28, { align: 'center' });
        
        if (card.extra) {
            doc.setFontSize(7);
            doc.text(card.extra, cardX + cardW/2, cardY + 34, { align: 'center' });
        }
        
        cardX += cardW + 6;
    });
    
    // Environmental Equivalents
    y = cardY + cardH + 15;
    
    doc.setFillColor(243, 229, 245);
    doc.roundedRect(15, y, 180, 40, 3, 3, 'F');
    doc.setDrawColor(155, 89, 182);
    doc.roundedRect(15, y, 180, 40, 3, 3, 'S');
    
    doc.setTextColor(142, 68, 173);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Environmental Equivalents', 105, y + 10, { align: 'center' });
    
    // Three columns
    const eqData = [
        { icon: 'People O2', value: people },
        { icon: 'km Driving', value: car },
        { icon: 'Days Energy', value: home }
    ];
    
    let eqX = 35;
    eqData.forEach(eq => {
        doc.setTextColor(...green);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(eq.value, eqX, y + 25, { align: 'center' });
        
        doc.setTextColor(...gray);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(eq.icon, eqX, y + 33, { align: 'center' });
        
        eqX += 60;
    });
    
    // Footer
    y = y + 50;
    doc.setTextColor(...gray);
    doc.setFontSize(9);
    doc.text('Generated by EcoTree Tracker - Making environmental impact visible', 105, y, { align: 'center' });
    doc.text(new Date().toLocaleString(), 105, y + 6, { align: 'center' });
    
    // Save
    doc.save(`tree-carbon-report-${Date.now()}.pdf`);
});

// Share functionality
function getFullShareText() {
    const treeName = document.getElementById('treeName').textContent;
    const biomassValue = document.getElementById('biomassValue').textContent;
    const agbValue = document.getElementById('agbValue').textContent;
    const bgbValue = document.getElementById('bgbValue').textContent;
    const carbonValue = document.getElementById('carbonValue').textContent;
    const oxygenValue = document.getElementById('oxygenValue').textContent;
    const pollutionValue = document.getElementById('pollutionValue').textContent;
    const peopleEquivalent = document.getElementById('peopleEquivalent').textContent;
    const carEquivalent = document.getElementById('carEquivalent').textContent;
    const homeEquivalent = document.getElementById('homeEquivalent').textContent;

    return `🌳 *${treeName} - Environmental Impact Report*\n\n` +
           `⚖️ Total Biomass: ${biomassValue} kg\n` +
           `   ▪ Above-ground: ${agbValue} kg\n` +
           `   ▪ Below-ground: ${bgbValue} kg\n\n` +
           `🔬 Carbon Stored: ${carbonValue} kg C\n` +
           `💨 Oxygen Produced: ${oxygenValue} kg O₂/year\n` +
           `🌫️ Pollution Absorbed: ${pollutionValue} kg/year\n\n` +
           `🌍 *Environmental Equivalents:*\n` +
           `👥 ${peopleEquivalent} people's annual oxygen supply\n` +
           `🚗 ${carEquivalent} km of car emissions offset\n` +
           `🏠 ${homeEquivalent} days of home energy offset\n\n` +
           `📊 Calculated using EcoTree Tracker`;
}

// Toggle share dropdown
document.getElementById('shareBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('shareDropdown').classList.toggle('active');
});

// Close dropdown when clicking outside
document.addEventListener('click', () => {
    document.getElementById('shareDropdown').classList.remove('active');
});

// WhatsApp share
document.getElementById('shareWhatsApp').addEventListener('click', () => {
    const text = encodeURIComponent(getFullShareText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
    document.getElementById('shareDropdown').classList.remove('active');
});

// Email share
document.getElementById('shareEmail').addEventListener('click', () => {
    const treeName = document.getElementById('treeName').textContent;
    const subject = encodeURIComponent(`EcoTree Tracker - ${treeName} Environmental Impact Report`);
    const body = encodeURIComponent(getFullShareText());
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    document.getElementById('shareDropdown').classList.remove('active');
});

// Auto-fill tree data when species is selected (removed - no longer auto-filling)
// Species selection now only updates the selected tree index

// FAQ Accordion functionality
document.querySelectorAll('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
        const faqItem = button.parentElement;
        const isActive = faqItem.classList.contains('active');
        
        // Close all FAQ items
        document.querySelectorAll('.faq-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Toggle current item
        if (!isActive) {
            faqItem.classList.add('active');
        }
    });
});

// Feedback Form submission - Opens email client
document.getElementById('feedbackForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('feedbackName').value;
    const email = document.getElementById('feedbackEmail').value;
    const message = document.getElementById('feedbackMessage').value;
    
    // Create mailto link
    const subject = encodeURIComponent(`EcoTree Tracker Feedback from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n\n---\nSent from EcoTree Tracker`);
    
    // Open email client
    window.open(`mailto:durgeshraj0852@gmail.com?subject=${subject}&body=${body}`, '_blank');
    
    // Show message and reset form
    alert(`Thank you ${name}! Your email client will open. Please click Send to submit your feedback.`);
    e.target.reset();
});

