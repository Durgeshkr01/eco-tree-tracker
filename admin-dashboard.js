// Admin Dashboard Logic
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

console.log('🔄 Admin Dashboard v4.0 loaded - with debug logs');

const db = getFirestore(window.firebaseApp);
let heatMapInstance = null;
let submissionsListener = null;
let currentAdmin = null;
let allSubmissions = []; // Store all submissions globally for heat map

// Load admin from session
function loadAdminFromSession() {
    const adminSession = sessionStorage.getItem('adminSession');
    if (!adminSession) {
        window.location.href = 'admin-login.html';
        return null;
    }
    return JSON.parse(adminSession);
}

currentAdmin = loadAdminFromSession();

// Update getCurrentAdmin to use session
window.getCurrentAdmin = () => currentAdmin;

// Generate Random Pass Code
window.generateNewPass = async () => {
    if (!currentAdmin) return;
    
    console.log('🔑 Generate code clicked. Checking for existing code...');
    
    try {
        // First check if admin already has an active code
        const adminDoc = await getDoc(doc(db, 'admins', currentAdmin.username));
        
        if (adminDoc.exists()) {
            const adminData = adminDoc.data();
            console.log('📋 Admin data:', adminData);
            
            // If admin already has an active pass code, show it instead of generating new
            if (adminData.passActive && adminData.currentPass) {
                console.log('✅ Existing active code found:', adminData.currentPass);
                document.getElementById('passCodeDisplay').textContent = adminData.currentPass;
                alert('ℹ️ You already have an active code! Your permanent code is: ' + adminData.currentPass);
                return;
            }
        }
        
        console.log('🆕 No active code found. Generating new code...');
        // Generate 5-digit code only if no active code exists
        const newPass = Math.random().toString(36).substring(2, 7).toUpperCase();
        console.log('🔑 New code generated:', newPass);
        
        // Save to admin document
        await setDoc(doc(db, 'admins', currentAdmin.username), {
            currentPass: newPass,
            passActive: true,
            passGeneratedAt: new Date().toISOString()
        }, { merge: true });
        
        // Also save to passes collection for easy validation
        await setDoc(doc(db, 'passes', newPass), {
            adminUsername: currentAdmin.username,
            adminName: currentAdmin.name,
            active: true,
            createdAt: new Date().toISOString()
        });
        
        document.getElementById('passCodeDisplay').textContent = newPass;
        alert('✅ Your permanent access code generated: ' + newPass + '\n\nThis code will remain the same. Students can use this code to login.');
        console.log('✅ Code saved to database');
    } catch (error) {
        console.error('❌ Error generating pass:', error);
        alert('Failed to generate code: ' + error.message);
    }
};

// Copy Pass Code
window.copyPassCode = () => {
    const passCode = document.getElementById('passCodeDisplay').textContent;
    if (passCode === 'XXXXX') {
        alert('Please generate a code first!');
        return;
    }
    
    navigator.clipboard.writeText(passCode).then(() => {
        alert('✅ Code copied to clipboard!');
    });
};

// Deactivate Pass Code
window.deactivatePass = async () => {
    if (!currentAdmin) return;
    
    const passCode = document.getElementById('passCodeDisplay').textContent;
    if (passCode === 'XXXXX') {
        alert('No active code to deactivate!');
        return;
    }
    
    if (!confirm('Are you sure you want to deactivate this code? Students will not be able to log in.')) {
        return;
    }
    
    try {
        await setDoc(doc(db, 'admins', currentAdmin.username), {
            passActive: false
        }, { merge: true });
        
        await setDoc(doc(db, 'passes', passCode), {
            active: false
        }, { merge: true });
        
        document.getElementById('passCodeDisplay').textContent = 'XXXXX';
        alert('✅ Code deactivated successfully!');
    } catch (error) {
        console.error('Error deactivating pass:', error);
        alert('Failed to deactivate code: ' + error.message);
    }
};

// Load Dashboard Data
window.loadDashboardData = async () => {
    if (!currentAdmin) return;
    
    // Update welcome text
    if (currentAdmin.name) {
        document.getElementById('welcomeText').textContent = `Welcome, ${currentAdmin.name}`;
    }
    
    try {
        // Load current pass code
        const adminDoc = await getDoc(doc(db, 'admins', currentAdmin.username));
        if (adminDoc.exists()) {
            const data = adminDoc.data();
            if (data.currentPass && data.passActive) {
                document.getElementById('passCodeDisplay').textContent = data.currentPass;
            }
        }
        
        console.log('📊 Loading submissions for admin:', currentAdmin.username);
        console.log('🔍 Admin username type:', typeof currentAdmin.username);
        console.log('🔍 Admin username value:', JSON.stringify(currentAdmin.username));
        
        // Listen to student submissions in real-time
        if (submissionsListener) {
            submissionsListener(); // Unsubscribe previous listener
        }
        
        // Try with orderBy first
        try {
            const submissionsQuery = query(
                collection(db, 'submissions'),
                where('adminUsername', '==', currentAdmin.username),
                orderBy('timestamp', 'desc')
            );
            
            console.log('✅ Query created successfully for admin:', currentAdmin.username);
            
            submissionsListener = onSnapshot(submissionsQuery, (snapshot) => {
                console.log('📦 Received', snapshot.size, 'submissions');
                console.log('📦 Query filter: adminUsername ==', currentAdmin.username);
                
                const submissions = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    console.log('📄 Submission doc:', {
                        id: doc.id,
                        adminUsername: data.adminUsername,
                        studentId: data.studentId,
                        treeName: data.treeName
                    });
                    submissions.push({
                        id: doc.id,
                        ...data
                    });
                });
                
                console.log('✅ Total submissions collected:', submissions.length);
                
                // Store globally for heat map
                allSubmissions = submissions;
                
                updateDashboardStats(submissions);
                updateStudentsTable(submissions);
                
                // Update heat map if already initialized
                if (heatMapInstance) {
                    updateHeatMap(submissions);
                }
            }, (error) => {
                console.error('❌ Snapshot error:', error);
                console.error('❌ Error code:', error.code);
                console.error('❌ Error message:', error.message);
                // If index error, try without orderBy
                if (error.code === 'failed-precondition') {
                    console.log('⚠️ Index not found, trying without orderBy...');
                    loadSubmissionsWithoutOrder();
                }
            });
        } catch (queryError) {
            console.error('❌ Query creation error:', queryError);
            loadSubmissionsWithoutOrder();
        }
        
    } catch (error) {
        console.error('❌ Error loading dashboard:', error);
        alert('Failed to load data: ' + error.message);
    }
};

// Fallback: Load submissions without orderBy
async function loadSubmissionsWithoutOrder() {
    try {
        console.log('🔄 Trying fallback query without orderBy...');
        console.log('🔍 Filtering by adminUsername:', currentAdmin.username);
        
        const submissionsQuery = query(
            collection(db, 'submissions'),
            where('adminUsername', '==', currentAdmin.username)
        );
        
        submissionsListener = onSnapshot(submissionsQuery, (snapshot) => {
            console.log('📦 Received', snapshot.size, 'submissions (no order)');
            const submissions = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                console.log('📄 Submission (no order):', {
                    id: doc.id,
                    adminUsername: data.adminUsername,
                    studentId: data.studentId
                });
                submissions.push({
                    id: doc.id,
                    ...data
                });
            });
            
            // Sort manually by timestamp
            submissions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            console.log('✅ Sorted submissions:', submissions.length);
            
            // Store globally for heat map
            allSubmissions = submissions;
            
            updateDashboardStats(submissions);
            updateStudentsTable(submissions);
            
            // Update heat map if already initialized
            if (heatMapInstance) {
                updateHeatMap(submissions);
            }
        });
    } catch (error) {
        console.error('❌ Fallback query also failed:', error);
        console.error('❌ Error details:', error);
        alert('Failed to load submissions. Check Firebase console.');
    }
}

// Update Dashboard Stats
function updateDashboardStats(submissions) {
    // Count unique students
    const uniqueStudents = new Set(submissions.map(s => s.studentId)).size;
    document.getElementById('activeStudents').textContent = uniqueStudents;
    
    // Total trees
    document.getElementById('totalTrees').textContent = submissions.length;
    
    // Total CO2
    const totalCO2 = submissions.reduce((sum, s) => sum + (parseFloat(s.co2) || 0), 0);
    document.getElementById('totalCO2').textContent = totalCO2.toFixed(2) + ' kg';
    
    // Unique locations
    const uniqueLocations = new Set(
        submissions
            .filter(s => s.latitude && s.longitude)
            .map(s => `${s.latitude},${s.longitude}`)
    ).size;
    document.getElementById('totalLocations').textContent = uniqueLocations;
}

// Update Students Table
function updateStudentsTable(submissions) {
    const tbody = document.getElementById('studentsTableBody');
    
    if (submissions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #999;">
                    No data available. Students will appear here once they submit data.
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = submissions.map(sub => `
        <tr>
            <td>${sub.studentId || 'N/A'}</td>
            <td>${sub.treeName || 'Unknown'}</td>
            <td>${sub.latitude && sub.longitude ? `${parseFloat(sub.latitude).toFixed(4)}, ${parseFloat(sub.longitude).toFixed(4)}` : 'Not recorded'}</td>
            <td>${new Date(sub.timestamp).toLocaleString()}</td>
            <td>${parseFloat(sub.co2).toFixed(2)}</td>
            <td><button class="btn-view" onclick="viewDetails('${sub.id}')">View</button></td>
        </tr>
    `).join('');
}

// View Student Submission Details
window.viewDetails = async (submissionId) => {
    const admin = window.getCurrentAdmin();
    if (!admin) return;
    
    try {
        const submissionDoc = await getDoc(doc(db, 'submissions', submissionId));
        if (!submissionDoc.exists()) {
            alert('Submission not found!');
            return;
        }
        
        const data = submissionDoc.data();
        
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <div class="detail-row">
                <strong>Student ID:</strong>
                <span>${data.studentId || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <strong>Tree Name:</strong>
                <span>${data.treeName || 'Unknown'}</span>
            </div>
            <div class="detail-row">
                <strong>Scientific Name:</strong>
                <span>${data.scientificName || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <strong>Circumference:</strong>
                <span>${data.circumference || 'N/A'} cm</span>
            </div>
            <div class="detail-row">
                <strong>DBH (Calculated):</strong>
                <span>${data.dbh || 'N/A'} cm</span>
            </div>
            <div class="detail-row">
                <strong>Tree Age:</strong>
                <span>${data.age || 'N/A'} years</span>
            </div>
            <div class="detail-row">
                <strong>GPS Location:</strong>
                <span>${data.latitude && data.longitude ? `${data.latitude}, ${data.longitude}` : 'Not recorded'}</span>
            </div>
            <hr style="margin: 20px 0;">
            <h3 style="color: #667eea; margin-bottom: 15px;">Calculated Results</h3>
            <div class="detail-row">
                <strong>Total Biomass:</strong>
                <span>${data.totalBiomass || 'N/A'} kg</span>
            </div>
            <div class="detail-row">
                <strong>Above-Ground Biomass:</strong>
                <span>${data.agb || 'N/A'} kg</span>
            </div>
            <div class="detail-row">
                <strong>Below-Ground Biomass:</strong>
                <span>${data.bgb || 'N/A'} kg</span>
            </div>
            <div class="detail-row">
                <strong>Carbon Stored:</strong>
                <span>${data.carbon || 'N/A'} kg C</span>
            </div>
            <div class="detail-row">
                <strong>CO2 Sequestration:</strong>
                <span>${data.co2 || 'N/A'} kg CO2/year</span>
            </div>
            <div class="detail-row">
                <strong>Oxygen Production:</strong>
                <span>${data.oxygen || 'N/A'} kg O2/year</span>
            </div>
            <div class="detail-row">
                <strong>Pollution Absorbed:</strong>
                <span>${data.pollution || 'N/A'} kg/year</span>
            </div>
            <div class="detail-row">
                <strong>Economic Value:</strong>
                <span>₹${data.economicValue || 'N/A'}/year</span>
            </div>
            <div class="detail-row">
                <strong>Submitted At:</strong>
                <span>${new Date(data.timestamp).toLocaleString()}</span>
            </div>
        `;
        
        document.getElementById('detailModal').classList.add('active');
    } catch (error) {
        console.error('Error viewing details:', error);
        alert('Failed to load details: ' + error.message);
    }
};

// Close Modal
window.closeModal = () => {
    document.getElementById('detailModal').classList.remove('active');
};

// Switch Tabs
window.switchTab = (tabName) => {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // Initialize heat map if switching to heat map tab
    if (tabName === 'heatmap') {
        if (!heatMapInstance) {
            console.log('🗺️ Initializing heat map for first time...');
            initializeHeatMap();
        } else {
            console.log('🗺️ Heat map already initialized, refreshing view...');
            // Invalidate size in case container was hidden
            setTimeout(() => heatMapInstance.invalidateSize(), 100);
        }
        
        // Load submissions data into heat map
        console.log('🗺️ Loading heat map with', allSubmissions.length, 'submissions');
        if (allSubmissions.length > 0) {
            updateHeatMap(allSubmissions);
        } else {
            console.log('⚠️ No submissions available for heat map yet');
        }
    }
};

// Initialize Heat Map
function initializeHeatMap() {
    const mapContainer = document.getElementById('heatMap');
    
    // Clear any existing map
    if (heatMapInstance) {
        heatMapInstance.remove();
        heatMapInstance = null;
    }
    
    // Clear container
    mapContainer.innerHTML = '';
    
    // Create new map centered on India
    heatMapInstance = L.map('heatMap').setView([20.5937, 78.9629], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(heatMapInstance);
    
    console.log('✅ Heat map initialized successfully');
}

// Update Heat Map with Data
function updateHeatMap(submissions) {
    console.log('🗺️ Updating heat map with', submissions.length, 'submissions');
    
    if (!heatMapInstance) {
        console.log('⚠️ Heat map not initialized yet');
        return;
    }
    
    // Filter submissions with valid coordinates
    const validSubmissions = submissions.filter(s => {
        const lat = parseFloat(s.latitude);
        const lng = parseFloat(s.longitude);
        const isValid = s.latitude && s.longitude && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        if (s.latitude && s.longitude) {
            console.log(`📍 Checking: ${s.studentId} - Lat: ${lat}, Lng: ${lng}, Valid: ${isValid}`);
        }
        return isValid;
    });
    
    console.log(`📍 Valid coordinates: ${validSubmissions.length} out of ${submissions.length}`);
    
    if (validSubmissions.length === 0) {
        console.log('⚠️ No valid coordinates for heat map');
        alert('No location data available. Students need to add GPS coordinates when submitting trees.');
        return;
    }
    
    // Clear all layers except base tile layer
    heatMapInstance.eachLayer((layer) => {
        if (!(layer instanceof L.TileLayer)) {
            heatMapInstance.removeLayer(layer);
        }
    });
    
    // Calculate max CO2 for normalization
    const maxCO2 = Math.max(...validSubmissions.map(s => parseFloat(s.co2) || 0));
    console.log(`📊 Max CO2 value: ${maxCO2} kg`);
    
    // Prepare heat data with normalized intensity
    const heatData = validSubmissions.map(s => {
        const lat = parseFloat(s.latitude);
        const lng = parseFloat(s.longitude);
        const co2Value = parseFloat(s.co2) || 0;
        const intensity = maxCO2 > 0 ? co2Value / maxCO2 : 0.5; // Normalize 0-1
        console.log(`🔥 Heat point: [${lat}, ${lng}] CO2: ${co2Value} kg, intensity: ${intensity.toFixed(2)}`);
        return [lat, lng, intensity];
    });
    
    // Add heat layer FIRST (background)
    if (typeof L.heatLayer !== 'undefined') {
        const heat = L.heatLayer(heatData, {
            radius: 35,
            blur: 25,
            maxZoom: 17,
            max: 1.0,
            minOpacity: 0.3,
            gradient: {
                0.0: '#00ff00',  // Green - Low CO2
                0.2: '#7fff00',  // Light green
                0.4: '#ffff00',  // Yellow - Medium CO2
                0.6: '#ffa500',  // Orange
                0.8: '#ff4500',  // Red-orange - High CO2
                1.0: '#ff0000'   // Red - Highest CO2
            }
        }).addTo(heatMapInstance);
        
        console.log('✅ Heat layer added with CO2 gradient');
    } else {
        console.warn('⚠️ L.heatLayer not available');
    }
    
    // Add markers on TOP of heat layer
    validSubmissions.forEach(s => {
        const lat = parseFloat(s.latitude);
        const lng = parseFloat(s.longitude);
        const co2Value = parseFloat(s.co2) || 0;
        
        // Color code marker based on CO2
        let markerColor;
        if (co2Value < maxCO2 * 0.3) markerColor = '#27ae60'; // Green - Low
        else if (co2Value < maxCO2 * 0.6) markerColor = '#f39c12'; // Orange - Medium
        else markerColor = '#e74c3c'; // Red - High
        
        L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: markerColor,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
        }).addTo(heatMapInstance)
          .bindPopup(`
              <strong>${s.treeName}</strong><br>
              Student: ${s.studentId}<br>
              <strong>CO2: ${co2Value} kg</strong><br>
              Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}
          `);
    });
    
    // Fit bounds to show all points
    const bounds = L.latLngBounds(validSubmissions.map(s => [parseFloat(s.latitude), parseFloat(s.longitude)]));
    heatMapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    
    console.log('✅ Heat map updated with', validSubmissions.length, 'locations');
}

console.log('✅ Admin dashboard initialized');

// Auto-load dashboard data when page loads
if (currentAdmin) {
    console.log('🚀 Auto-loading dashboard data for:', currentAdmin.username);
    loadDashboardData();
} else {
    console.error('❌ No admin session found!');
}
