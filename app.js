// Main Application Logic
let calculationHistory = [];
let selectedTreeIndex = null;

// Load history from localStorage on page load
document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    initializeTreeSearch();
    animatePageLoad();
});

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
    
    // Search on input
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        if (query.trim()) {
            showTreeOptions(query);
        } else {
            dropdown.classList.remove('active');
        }
    });
    
    // Show dropdown on focus with text
    searchInput.addEventListener('focus', (e) => {
        if (e.target.value.trim()) {
            dropdown.classList.add('active');
        }
    });
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.form-group')) {
            dropdown.classList.remove('active');
        }
    });
}

// Show tree options based on search query
function showTreeOptions(query) {
    const dropdown = document.getElementById('treeDropdown');
    const lowerQuery = query.toLowerCase();
    
    const filteredTrees = treeSpeciesData.filter(tree => 
        tree.name.toLowerCase().includes(lowerQuery) ||
        tree.scientific.toLowerCase().includes(lowerQuery)
    );
    
    if (filteredTrees.length === 0) {
        dropdown.innerHTML = '<div class="no-results">No trees found</div>';
        dropdown.classList.add('active');
        return;
    }
    
    dropdown.innerHTML = filteredTrees.map((tree, index) => {
        const originalIndex = treeSpeciesData.indexOf(tree);
        const isSelected = selectedTreeIndex === originalIndex;
        return `
            <div class="tree-option ${isSelected ? 'selected' : ''}" onclick="selectTree(${originalIndex})">
                <div><strong>${tree.name}</strong></div>
                <div class="tree-scientific">${tree.scientific}</div>
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
    const heightValue = parseFloat(document.getElementById('height').value);
    const heightUnit = document.getElementById('heightUnit').value;
    const dbhValue = parseFloat(document.getElementById('dbh').value);
    const dbhUnit = document.getElementById('dbhUnit').value;
    const age = document.getElementById('age').value || 'N/A';
    const location = document.getElementById('location').value || 'N/A';

    // Validate inputs
    if (!speciesIndex || !heightValue || !dbhValue) {
        alert('Please fill in all required fields!');
        return;
    }

    // Get tree species data
    const treeData = getTreeData(speciesIndex);

    // Calculate results
    const results = calculator.calculate(heightValue, heightUnit, dbhValue, dbhUnit);

    // Display results
    displayResults(treeData, results, age, location);

    // Save to history
    saveToHistory(treeData, results, age, location);

    // Scroll to results
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
}

// Display results in the UI
function displayResults(treeData, results, age, location) {
    // Show results section
    document.getElementById('resultsSection').style.display = 'block';

    // Update tree summary
    document.getElementById('treeName').textContent = treeData.name;
    document.getElementById('treeDetails').innerHTML = `
        <p><strong>Scientific Name:</strong> ${treeData.scientific}</p>
        <p><strong>Height:</strong> ${results.inputs.height} m</p>
        <p><strong>DBH:</strong> ${results.inputs.dbh} cm</p>
        <p><strong>Age:</strong> ${age} years</p>
        <p><strong>Location:</strong> ${location}</p>
    `;

    // Update result cards
    document.getElementById('biomassValue').textContent = results.biomass.total;
    document.getElementById('agbValue').textContent = results.biomass.aboveGround;
    document.getElementById('bgbValue').textContent = results.biomass.belowGround;
    document.getElementById('carbonValue').textContent = results.carbon;
    document.getElementById('co2Value').textContent = results.co2;
    document.getElementById('oxygenValue').textContent = results.oxygen;
    document.getElementById('pollutionValue').textContent = results.pollution;
    document.getElementById('economicValue').textContent = results.economicValue;

    // Update equivalents
    document.getElementById('peopleEquivalent').textContent = results.equivalents.people;
    document.getElementById('carEquivalent').textContent = results.equivalents.carKm;
    document.getElementById('homeEquivalent').textContent = results.equivalents.homeDays;

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
function saveToHistory(treeData, results, age, location) {
    const calculation = {
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        tree: treeData.name,
        age: age,
        location: location,
        results: results
    };

    calculationHistory.unshift(calculation);

    // Keep only last 20 calculations
    if (calculationHistory.length > 20) {
        calculationHistory = calculationHistory.slice(0, 20);
    }

    // Save to localStorage
    localStorage.setItem('treeCalculations', JSON.stringify(calculationHistory));

    // Update history display
    displayHistory();
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
                <p>${calc.timestamp} • ${calc.location}</p>
            </div>
            <div class="history-stats">
                <div class="stat-badge">
                    <strong>${calc.results.co2}</strong>
                    <small>kg CO₂</small>
                </div>
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
    displayResults(treeData, calc.results, calc.age, calc.location);
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
    const co2Val = document.getElementById('co2Value').textContent || '0';
    const oxygen = document.getElementById('oxygenValue').textContent || '0';
    const pollution = document.getElementById('pollutionValue').textContent || '0';
    const economic = document.getElementById('economicValue').textContent || '0';
    const people = document.getElementById('peopleEquivalent').textContent || '0';
    const car = document.getElementById('carEquivalent').textContent || '0';
    const home = document.getElementById('homeEquivalent').textContent || '0';
    
    // Get tree details
    const heightEl = document.querySelector('#treeDetails p:nth-child(2)');
    const dbhEl = document.querySelector('#treeDetails p:nth-child(3)');
    const ageEl = document.querySelector('#treeDetails p:nth-child(4)');
    const locEl = document.querySelector('#treeDetails p:nth-child(5)');
    
    const height = heightEl ? heightEl.textContent : '';
    const dbh = dbhEl ? dbhEl.textContent : '';
    const age = ageEl ? ageEl.textContent : '';
    const location = locEl ? locEl.textContent : '';
    
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
    doc.text(height, 20, y + 22);
    doc.text(dbh, 80, y + 22);
    doc.text(age, 20, y + 30);
    doc.text(location, 80, y + 30);
    
    y = 90;
    
    // Results Grid
    const cards = [
        { title: 'Total Biomass', value: biomass, unit: 'kg', color: [243, 156, 18], extra: `AGB: ${agb} | BGB: ${bgb}` },
        { title: 'Carbon Stored', value: carbon, unit: 'kg C', color: [149, 165, 166] },
        { title: 'CO2 Sequestration', value: co2Val, unit: 'kg CO2/year', color: [52, 152, 219] },
        { title: 'Oxygen Production', value: oxygen, unit: 'kg O2/year', color: [26, 188, 156] },
        { title: 'Air Pollution Removed', value: pollution, unit: 'kg/year', color: [231, 76, 60] },
        { title: 'Economic Value', value: economic, unit: 'Rs/year', color: [46, 204, 113] }
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
document.getElementById('shareBtn').addEventListener('click', () => {
    const co2Value = document.getElementById('co2Value').textContent;
    const oxygenValue = document.getElementById('oxygenValue').textContent;
    const treeName = document.getElementById('treeName').textContent;

    const shareText = `🌳 ${treeName} Impact:\n` +
                     `🌍 CO₂ Absorbed: ${co2Value} kg/year\n` +
                     `💨 Oxygen Produced: ${oxygenValue} kg/year\n` +
                     `\nCalculated using EcoTree Tracker`;

    if (navigator.share) {
        navigator.share({
            title: 'EcoTree Tracker - Environmental Impact',
            text: shareText
        }).catch(err => console.log('Share failed:', err));
    } else {
        // Fallback: Copy to clipboard
        navigator.clipboard.writeText(shareText).then(() => {
            alert('Results copied to clipboard!');
        });
    }
});

// Auto-fill tree data when species is selected
document.getElementById('treeSpecies').addEventListener('change', (e) => {
    const index = e.target.value;
    if (index) {
        const tree = getTreeData(index);
        
        // Optional: Auto-fill with average values
        if (!document.getElementById('height').value) {
            document.getElementById('height').value = tree.avgHeight;
        }
        if (!document.getElementById('dbh').value) {
            document.getElementById('dbh').value = tree.avgDBH;
        }
    }
});
