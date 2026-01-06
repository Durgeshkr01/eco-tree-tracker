// Main Application Logic
let calculationHistory = [];

// Load history from localStorage on page load
document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
});

// Form submission handler
document.getElementById('treeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    performCalculation();
});

// Perform calculation
function performCalculation() {
    // Get form values
    const speciesIndex = document.getElementById('treeSpecies').value;
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
document.getElementById('downloadPDF').addEventListener('click', () => {
    const resultsSection = document.getElementById('resultsSection');
    
    const opt = {
        margin: 10,
        filename: `tree-carbon-calculation-${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(resultsSection).save();
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
