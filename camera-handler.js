// Camera Handler for Tree Measurement
// Uses native camera (file input) → ML analysis
// Supports: Auto AI detection + Manual trunk selection

let mlMeasurement = null;
let advancedML = null;
let manualSelectionMode = false;
let manualPoints = [];
let originalImageData = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    mlMeasurement = new TreeMeasurementML();
    advancedML = new AdvancedTreeML();
    initializeCameraHandlers();
});

function initializeCameraHandlers() {
    const openCameraBtn = document.getElementById('openCameraBtn');
    const manualInputBtn = document.getElementById('manualInputBtn');
    const closeCameraBtn = document.getElementById('closeCameraBtn');
    const cameraModal = document.getElementById('cameraModal');
    const cameraFileInput = document.getElementById('cameraFileInput');
    const resultCanvas = document.getElementById('resultCanvas');
    const retakeBtn = document.getElementById('retakeBtn');
    const retakeTopBtn = document.getElementById('retakeTopBtn');
    const useMeasurementBtn = document.getElementById('useMeasurementBtn');
    const referenceObjectSelect = document.getElementById('referenceObject');
    const customSizeInput = document.getElementById('customSizeInput');
    const customWidthInput = document.getElementById('customWidth');

    // ===== Open Camera: trigger native camera =====
    openCameraBtn.addEventListener('click', () => {
        cameraFileInput.value = '';
        cameraFileInput.click();
    });

    // ===== When photo is taken/selected =====
    cameraFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Show modal with preview
        cameraModal.style.display = 'flex';
        resetModalUI();
        manualSelectionMode = false;
        manualPoints = [];

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const img = new Image();
            img.onload = async () => {
                // Limit canvas size for performance (max 1200px wide)
                let w = img.width, h = img.height;
                const maxW = 1200;
                if (w > maxW) {
                    h = Math.round(h * (maxW / w));
                    w = maxW;
                }
                resultCanvas.width = w;
                resultCanvas.height = h;
                const ctx = resultCanvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                resultCanvas.style.display = 'block';
                
                // Save original image for manual mode redraw
                originalImageData = ctx.getImageData(0, 0, w, h);

                // Show mode selector: Auto or Manual
                showModeSelector(resultCanvas, file, img);
            };
            img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
    });

    // ===== Analyze the photo (Auto mode) =====
    async function analyzePhoto(canvas, imageFile) {
        const statusEl = document.getElementById('analysisStatus');
        const errorEl = document.getElementById('analysisError');
        const errorText = document.getElementById('analysisErrorText');
        const resultsEl = document.getElementById('measurementResults');
        const retakeTopEl = document.getElementById('retakeTopBtn');
        const modeSelectorEl = document.getElementById('modeSelector');
        if (modeSelectorEl) modeSelectorEl.style.display = 'none';

        statusEl.style.display = 'block';
        errorEl.style.display = 'none';
        resultsEl.style.display = 'none';
        retakeTopEl.style.display = 'none';

        try {
            // Pass manual reference object selection to real-world engine
            if (typeof realWorldEngine !== 'undefined' && referenceObjectSelect) {
                const refValue = referenceObjectSelect.value;
                if (refValue && refValue !== 'none') {
                    let refWidth = null;
                    if (refValue === 'custom' && customWidthInput) {
                        refWidth = parseFloat(customWidthInput.value);
                    }
                    realWorldEngine.setManualReference(refValue, refWidth);
                    console.log('📏 Manual reference set:', refValue, refWidth ? refWidth + 'cm' : '');
                } else {
                    realWorldEngine.clearManualReference();
                }
            }

            await advancedML.loadModels();
            const measurements = await advancedML.measureAutomatically(canvas, imageFile);

            // Draw detection overlay on canvas
            advancedML.drawDetectionOverlay(canvas, measurements.bounds, measurements);

            // Show full results
            showFullResults(measurements);

        } catch (error) {
            console.error('Analysis error:', error);
            statusEl.style.display = 'none';
            errorEl.style.display = 'block';
            errorText.textContent = error.message || 'Could not analyze tree. Please retake photo.';
            retakeTopEl.style.display = 'none';
            
            // Show manual mode option on error
            const manualFallbackEl = document.getElementById('manualFallbackBtn');
            if (manualFallbackEl) manualFallbackEl.style.display = 'inline-block';
        }
    }
    
    // ===== Show mode selector (Auto vs Manual) =====
    function showModeSelector(canvas, file, img) {
        let modeSelectorEl = document.getElementById('modeSelector');
        if (!modeSelectorEl) {
            modeSelectorEl = document.createElement('div');
            modeSelectorEl.id = 'modeSelector';
            modeSelectorEl.style.cssText = 'padding: 12px 16px; text-align: center;';
            const controlsDiv = document.querySelector('.camera-controls');
            if (controlsDiv) {
                controlsDiv.parentNode.insertBefore(modeSelectorEl, controlsDiv);
            } else {
                document.getElementById('photoPreviewSection').appendChild(modeSelectorEl);
            }
        }
        
        modeSelectorEl.innerHTML = `
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <button id="autoDetectBtn" type="button" disabled style="flex:1; min-width:140px; padding: 14px 20px; background: linear-gradient(135deg, #374151, #4b5563); color: rgba(255,255,255,0.5); border: none; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: not-allowed; box-shadow: none; position: relative; opacity: 0.7;">
                    <i class="fas fa-robot"></i> Auto Detect
                    <span style="position:absolute; top:-8px; right:-8px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; font-size: 9px; font-weight: 800; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Coming Soon</span>
                </button>
                <button id="manualSelectBtn" type="button" style="flex:1; min-width:140px; padding: 14px 20px; background: linear-gradient(135deg, #7c3aed, #8b5cf6); color: white; border: none; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 15px rgba(139,92,246,0.3); animation: manualPulse 2s ease-in-out infinite;">
                    <i class="fas fa-hand-pointer"></i> Manual Select
                </button>
            </div>
            <style>@keyframes manualPulse { 0%,100% { box-shadow: 0 4px 15px rgba(139,92,246,0.3); } 50% { box-shadow: 0 4px 25px rgba(139,92,246,0.6); } }</style>
            <div style="font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 8px;">
                Auto Detect coming soon &nbsp;|&nbsp; Manual = Tap trunk edges for precise measurement
            </div>
        `;
        modeSelectorEl.style.display = 'block';
        
        // Auto detect button (disabled - coming soon)
        document.getElementById('autoDetectBtn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Show coming soon toast
            const toast = document.createElement('div');
            toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:rgba(245,158,11,0.95);color:#000;padding:10px 24px;border-radius:10px;font-size:14px;font-weight:700;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
            toast.textContent = '🚧 Auto Detect is coming soon!';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2500);
        });
        
        // Manual select button
        document.getElementById('manualSelectBtn').addEventListener('click', () => {
            modeSelectorEl.style.display = 'none';
            enterManualMode(canvas, file);
        });
    }
    
    // ===== Enter manual trunk selection mode (Arboreal-style) =====
    function enterManualMode(canvas, imageFile) {
        manualSelectionMode = false;
        manualPoints = [];
        
        // State tracking
        let measureMode = null; // 'reference' or 'distance'
        let referencePoints = []; // 2 points on reference object
        let trunkPoints = [];    // 2 points on trunk edges
        let currentPhase = 'method-select'; // 'method-select', 'ref-tap', 'trunk-tap', 'distance-input'
        let selectedRefType = null;
        let selectedRefSizeCm = null;
        
        // Known reference object sizes (cm) — real-world width
        const refObjects = {
            'credit-card': { name: 'Credit/Debit Card', width: 8.56, icon: '💳' },
            'aadhar-card': { name: 'Aadhar Card', width: 8.56, icon: '🪪' },
            'a4-paper': { name: 'A4 Paper (width)', width: 21.0, icon: '📄' },
            'notebook': { name: 'Notebook (width)', width: 17.6, icon: '📓' },
            'phone': { name: 'Smartphone', width: 7.5, icon: '📱' },
            'hand-span': { name: 'Hand Span (thumb to pinky)', width: 20.0, icon: '🖐️' },
            'pen': { name: 'Pen/Pencil', width: 14.0, icon: '🖊️' },
            'shoe-length': { name: 'Shoe Length', width: 27.0, icon: '👟' },
            'custom': { name: 'Custom Size', width: null, icon: '📏' }
        };
        
        // Show instruction banner
        let instructionEl = document.getElementById('manualInstruction');
        if (!instructionEl) {
            instructionEl = document.createElement('div');
            instructionEl.id = 'manualInstruction';
            const controlsDiv = document.querySelector('.camera-controls');
            if (controlsDiv) {
                controlsDiv.parentNode.insertBefore(instructionEl, controlsDiv);
            }
        }
        instructionEl.style.cssText = 'padding: 14px 16px; text-align: center; background: rgba(139,92,246,0.12); border: 1px solid rgba(139,92,246,0.25); border-radius: 12px; margin: 8px 16px;';
        
        // ===== STEP 1: Show measurement method selector =====
        showMethodSelector();
        
        function showMethodSelector() {
            currentPhase = 'method-select';
            instructionEl.innerHTML = `
                <div style="color: #a78bfa; font-weight: 700; font-size: 16px; margin-bottom: 10px;">
                    <i class="fas fa-ruler-combined"></i> Choose Measurement Method
                </div>
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 10px;">
                    <button id="refMethodBtn" type="button" style="flex:1; min-width: 130px; padding: 14px 12px; background: linear-gradient(135deg, #059669, #10b981); color: white; border: none; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 3px 12px rgba(16,185,129,0.3);">
                        <div style="font-size: 24px; margin-bottom: 4px;">📏</div>
                        <div>Reference Object</div>
                        <div style="font-size: 10px; opacity: 0.8; margin-top: 2px;">Most Accurate ⭐</div>
                    </button>
                    <button id="distMethodBtn" type="button" style="flex:1; min-width: 130px; padding: 14px 12px; background: linear-gradient(135deg, #7c3aed, #8b5cf6); color: white; border: none; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 3px 12px rgba(139,92,246,0.3);">
                        <div style="font-size: 24px; margin-bottom: 4px;">📐</div>
                        <div>Enter Distance</div>
                        <div style="font-size: 10px; opacity: 0.8; margin-top: 2px;">Quick Method</div>
                    </button>
                </div>
                <div style="font-size: 11px; color: rgba(255,255,255,0.35);">
                    <i class="fas fa-info-circle"></i> Reference = Place a card/object near trunk for exact scale<br>
                    Distance = Enter how far you stood from the tree
                </div>
            `;
            instructionEl.style.display = 'block';
            
            document.getElementById('refMethodBtn').addEventListener('click', () => {
                measureMode = 'reference';
                showReferenceSelector();
            });
            
            document.getElementById('distMethodBtn').addEventListener('click', () => {
                measureMode = 'distance';
                startTrunkTapping();
            });
        }
        
        // ===== REFERENCE METHOD: Select reference object type =====
        function showReferenceSelector() {
            currentPhase = 'ref-select';
            let optionsHTML = '';
            for (const [key, ref] of Object.entries(refObjects)) {
                const widthText = ref.width ? ref.width + ' cm' : 'You enter size';
                const highlight = (key === 'credit-card' || key === 'aadhar-card') ? 'border: 2px solid #10b981; background: rgba(16,185,129,0.15);' : 'border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05);';
                optionsHTML += `
                    <button class="ref-option-btn" data-ref="${key}" style="display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 12px; ${highlight} border-radius: 8px; color: white; cursor: pointer; font-size: 13px; text-align: left; margin-bottom: 4px;">
                        <span style="font-size: 20px;">${ref.icon}</span>
                        <div style="flex: 1;">
                            <div style="font-weight: 600;">${ref.name}</div>
                            <div style="font-size: 10px; color: rgba(255,255,255,0.5);">${widthText}</div>
                        </div>
                        ${(key === 'credit-card' || key === 'aadhar-card') ? '<span style="font-size: 9px; background: #10b981; color: white; padding: 2px 6px; border-radius: 4px;">BEST</span>' : ''}
                    </button>
                `;
            }
            
            instructionEl.innerHTML = `
                <div style="color: #10b981; font-weight: 700; font-size: 15px; margin-bottom: 8px;">
                    <i class="fas fa-ruler"></i> What reference object is in the photo?
                </div>
                <div style="font-size: 11px; color: rgba(255,255,255,0.4); margin-bottom: 10px;">
                    Place any object near the trunk before/after taking the photo. Select it below.
                </div>
                <div style="max-height: 250px; overflow-y: auto; padding-right: 4px;">
                    ${optionsHTML}
                </div>
                <button id="backToMethodBtn" type="button" style="margin-top: 8px; padding: 6px 16px; background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; cursor: pointer; font-size: 11px;">
                    <i class="fas fa-arrow-left"></i> Back
                </button>
            `;
            
            // Handle reference selection
            instructionEl.querySelectorAll('.ref-option-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const refKey = btn.dataset.ref;
                    selectedRefType = refObjects[refKey];
                    
                    if (refKey === 'custom') {
                        showCustomSizeInput();
                    } else {
                        selectedRefSizeCm = selectedRefType.width;
                        startReferenceTapping();
                    }
                });
            });
            
            document.getElementById('backToMethodBtn').addEventListener('click', showMethodSelector);
        }
        
        // ===== Custom size input =====
        function showCustomSizeInput() {
            currentPhase = 'custom-size';
            instructionEl.innerHTML = `
                <div style="color: #f59e0b; font-weight: 700; font-size: 15px; margin-bottom: 8px;">
                    <i class="fas fa-ruler-horizontal"></i> Enter Reference Object Size
                </div>
                <div style="font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 10px;">
                    Enter the known width/length of your reference object in cm
                </div>
                <div style="display: flex; align-items: center; gap: 8px; justify-content: center;">
                    <input id="customRefSize" type="number" inputmode="decimal" placeholder="e.g. 15" step="0.1" min="1" max="200"
                        style="width: 100px; padding: 10px 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(245,158,11,0.4); border-radius: 8px; color: white; font-size: 16px; text-align: center; font-weight: 700;" />
                    <span style="color: rgba(255,255,255,0.6); font-size: 14px;">cm</span>
                    <button id="customRefConfirmBtn" type="button" style="padding: 10px 16px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; border: none; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer;">
                        OK <i class="fas fa-check"></i>
                    </button>
                </div>
                <button id="backToRefBtn" type="button" style="margin-top: 8px; padding: 6px 16px; background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; cursor: pointer; font-size: 11px;">
                    <i class="fas fa-arrow-left"></i> Back
                </button>
            `;
            
            document.getElementById('customRefConfirmBtn').addEventListener('click', () => {
                const val = parseFloat(document.getElementById('customRefSize').value);
                if (!val || val < 1 || val > 200) {
                    document.getElementById('customRefSize').style.borderColor = '#ef4444';
                    return;
                }
                selectedRefSizeCm = val;
                selectedRefType = { name: 'Custom (' + val + ' cm)', icon: '📏', width: val };
                startReferenceTapping();
            });
            
            document.getElementById('backToRefBtn').addEventListener('click', showReferenceSelector);
        }
        
        // ===== REFERENCE TAPPING: First mark reference object edges =====
        function startReferenceTapping() {
            currentPhase = 'ref-tap';
            referencePoints = [];
            manualSelectionMode = true;
            
            instructionEl.innerHTML = `
                <div style="color: #10b981; font-weight: 700; font-size: 15px; margin-bottom: 6px;">
                    <span style="font-size: 18px;">${selectedRefType.icon}</span> Mark Reference: ${selectedRefType.name}
                </div>
                <div style="color: rgba(255,255,255,0.7); font-size: 13px;">
                    <span id="manualStep">Step 1/4: Tap the <b>LEFT edge</b> of the reference object</span>
                </div>
                <div style="font-size: 10px; color: rgba(255,255,255,0.3); margin-top: 4px;">
                    Reference size: <b style="color: #10b981;">${selectedRefSizeCm} cm</b> — Tap both edges of this object
                </div>
                <div style="margin-top: 8px;">
                    <span id="pointCount" style="color: #10b981; font-size: 12px;">Reference: 0/2 | Trunk: 0/2</span>
                    <button id="resetPointsBtn" type="button" style="margin-left: 12px; padding: 4px 12px; background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid rgba(239,68,68,0.3); border-radius: 6px; cursor: pointer; font-size: 11px;">
                        <i class="fas fa-undo"></i> Reset All
                    </button>
                </div>
                <div style="font-size: 10px; color: rgba(167,139,250,0.5); margin-top: 4px;">
                    <i class="fas fa-search-plus"></i> Pinch to zoom for precise tapping
                </div>
            `;
            
            setupResetButton();
            attachCanvasListeners();
        }
        
        // ===== DISTANCE METHOD: Direct trunk tapping =====
        function startTrunkTapping() {
            currentPhase = 'trunk-tap';
            trunkPoints = [];
            manualSelectionMode = true;
            
            const totalSteps = measureMode === 'reference' ? '3/4' : '1/2';
            const stepNum = measureMode === 'reference' ? 3 : 1;
            
            instructionEl.innerHTML = `
                <div style="color: #a78bfa; font-weight: 700; font-size: 15px; margin-bottom: 6px;">
                    <i class="fas fa-tree"></i> Mark Trunk Edges
                </div>
                <div style="color: rgba(255,255,255,0.7); font-size: 13px;">
                    <span id="manualStep">Step ${stepNum}: Tap the <b>LEFT edge</b> of the trunk</span>
                </div>
                <div style="font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 4px;">
                    <i class="fas fa-info-circle"></i> Works for any tree — thin, thick, straight or tilted
                </div>
                <div style="margin-top: 8px;">
                    <span id="pointCount" style="color: #a78bfa; font-size: 12px;">${measureMode === 'reference' ? 'Reference: ✅ | Trunk: 0/2' : 'Trunk: 0/2'}</span>
                    <button id="resetPointsBtn" type="button" style="margin-left: 12px; padding: 4px 12px; background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid rgba(239,68,68,0.3); border-radius: 6px; cursor: pointer; font-size: 11px;">
                        <i class="fas fa-undo"></i> Reset
                    </button>
                </div>
                <div style="font-size: 10px; color: rgba(167,139,250,0.5); margin-top: 4px;">
                    <i class="fas fa-search-plus"></i> Pinch to zoom for precise tapping
                </div>
            `;
            
            setupResetButton();
            if (measureMode !== 'reference') {
                attachCanvasListeners();
            }
        }
        
        function setupResetButton() {
            const resetBtn = document.getElementById('resetPointsBtn');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    referencePoints = [];
                    trunkPoints = [];
                    manualPoints = [];
                    manualSelectionMode = false;
                    removeCanvasListeners();
                    if (originalImageData) {
                        canvas.getContext('2d').putImageData(originalImageData, 0, 0);
                    }
                    if (measureMode === 'reference') {
                        startReferenceTapping();
                    } else {
                        startTrunkTapping();
                    }
                });
            }
        }
        
        // ===== Draw a point on canvas =====
        function drawPoint(ctx, x, y, color, label) {
            // Glow
            ctx.shadowColor = color;
            ctx.shadowBlur = 12;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, 9, 0, 2 * Math.PI);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // White border
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(x, y, 9, 0, 2 * Math.PI);
            ctx.stroke();
            
            // Crosshair
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(x, y - 22); ctx.lineTo(x, y + 22);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x - 22, y); ctx.lineTo(x + 22, y);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Label
            ctx.fillStyle = 'white';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(label, x, y + 4);
        }
        
        // ===== Draw line between two points =====
        function drawLine(ctx, p1, p2, color, dashed) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            if (dashed) ctx.setLineDash([5, 4]);
            else ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // ===== Canvas click handler =====
        function handleCanvasClick(e) {
            if (!manualSelectionMode) return;
            
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            
            let clientX, clientY;
            if (e.touches && e.touches[0]) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            
            const x = (clientX - rect.left) * scaleX;
            const y = (clientY - rect.top) * scaleY;
            const point = { x: Math.round(x), y: Math.round(y) };
            const ctx = canvas.getContext('2d');
            
            // ===== REFERENCE PHASE =====
            if (currentPhase === 'ref-tap') {
                referencePoints.push(point);
                
                if (referencePoints.length === 1) {
                    drawPoint(ctx, x, y, '#f59e0b', 'R1');
                    document.getElementById('manualStep').innerHTML = 'Step 2/4: Tap the <b>RIGHT edge</b> of the reference object';
                    document.getElementById('pointCount').innerHTML = 'Reference: 1/2 | Trunk: 0/2';
                }
                else if (referencePoints.length === 2) {
                    drawPoint(ctx, x, y, '#f59e0b', 'R2');
                    drawLine(ctx, referencePoints[0], referencePoints[1], 'rgba(245,158,11,0.7)', true);
                    
                    // Check if reference points are too close
                    const refDist = Math.sqrt(Math.pow(referencePoints[1].x - referencePoints[0].x, 2) + Math.pow(referencePoints[1].y - referencePoints[0].y, 2));
                    if (refDist < 5) {
                        document.getElementById('manualStep').innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#f87171;"></i> Reference points too close! Reset and try again.';
                        return;
                    }
                    
                    // Draw reference label
                    const midRX = (referencePoints[0].x + referencePoints[1].x) / 2;
                    const midRY = (referencePoints[0].y + referencePoints[1].y) / 2;
                    ctx.fillStyle = 'rgba(245,158,11,0.85)';
                    const refLabel = selectedRefType.icon + ' ' + selectedRefSizeCm + ' cm';
                    const textW = ctx.measureText(refLabel).width + 16;
                    const rx = midRX - textW/2, ry = midRY - 22, rw = textW, rh = 20, rr = 6;
                    ctx.beginPath();
                    ctx.moveTo(rx + rr, ry);
                    ctx.lineTo(rx + rw - rr, ry);
                    ctx.arcTo(rx + rw, ry, rx + rw, ry + rr, rr);
                    ctx.lineTo(rx + rw, ry + rh - rr);
                    ctx.arcTo(rx + rw, ry + rh, rx + rw - rr, ry + rh, rr);
                    ctx.lineTo(rx + rr, ry + rh);
                    ctx.arcTo(rx, ry + rh, rx, ry + rh - rr, rr);
                    ctx.lineTo(rx, ry + rr);
                    ctx.arcTo(rx, ry, rx + rr, ry, rr);
                    ctx.closePath();
                    ctx.fill();
                    ctx.fillStyle = '#000';
                    ctx.font = 'bold 11px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(refLabel, midRX, midRY - 9);
                    
                    document.getElementById('pointCount').innerHTML = 'Reference: ✅ <span style="color:#10b981;">(' + selectedRefSizeCm + 'cm)</span> | Trunk: 0/2';
                    
                    // Move to trunk tapping
                    currentPhase = 'trunk-tap';
                    trunkPoints = [];
                    document.getElementById('manualStep').innerHTML = 'Step 3/4: Now tap the <b>LEFT edge</b> of the trunk';
                }
                return;
            }
            
            // ===== TRUNK PHASE =====
            if (currentPhase === 'trunk-tap') {
                trunkPoints.push(point);
                
                const stepBase = measureMode === 'reference' ? 2 : 0;
                
                if (trunkPoints.length === 1) {
                    drawPoint(ctx, x, y, '#3b82f6', 'T1');
                    const stepNum = measureMode === 'reference' ? '4/4' : '2/2';
                    document.getElementById('manualStep').innerHTML = `Step ${stepNum}: Tap the <b>RIGHT edge</b> of the trunk`;
                    if (measureMode === 'reference') {
                        document.getElementById('pointCount').innerHTML = 'Reference: ✅ | Trunk: 1/2';
                    } else {
                        document.getElementById('pointCount').textContent = 'Trunk: 1/2';
                    }
                }
                else if (trunkPoints.length === 2) {
                    drawPoint(ctx, x, y, '#ef4444', 'T2');
                    drawLine(ctx, trunkPoints[0], trunkPoints[1], 'rgba(59,130,246,0.7)', true);
                    
                    const trunkDist = Math.sqrt(Math.pow(trunkPoints[1].x - trunkPoints[0].x, 2) + Math.pow(trunkPoints[1].y - trunkPoints[0].y, 2));
                    
                    if (trunkDist < 2) {
                        document.getElementById('manualStep').innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#f87171;"></i> Points too close! Reset and try again.';
                        return;
                    }
                    
                    // Stop tapping
                    manualSelectionMode = false;
                    removeCanvasListeners();
                    
                    if (measureMode === 'reference') {
                        // ===== CALCULATE WITH REFERENCE (EXACT!) =====
                        document.getElementById('manualStep').innerHTML = '<i class="fas fa-check-circle" style="color:#10b981;"></i> All points selected! Calculating exact measurements...';
                        document.getElementById('pointCount').innerHTML = 'Reference: ✅ | Trunk: ✅';
                        
                        setTimeout(() => {
                            try {
                                if (originalImageData) {
                                    ctx.putImageData(originalImageData, 0, 0);
                                }
                                
                                const measurements = advancedML.manualMeasureWithReference(
                                    canvas, 
                                    referencePoints[0], referencePoints[1],
                                    trunkPoints[0], trunkPoints[1],
                                    selectedRefSizeCm,
                                    selectedRefType.name,
                                    imageFile
                                );
                                
                                showFullResults(measurements);
                                instructionEl.style.display = 'none';
                                
                            } catch (err) {
                                document.getElementById('manualStep').innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#f87171;"></i> ' + err.message;
                            }
                        }, 300);
                        
                    } else {
                        // ===== DISTANCE METHOD: ask for distance =====
                        document.getElementById('manualStep').innerHTML = '<i class="fas fa-check-circle" style="color:#10b981;"></i> Edges selected! Enter distance below.';
                        showDistanceInputPrompt(instructionEl, canvas, imageFile);
                    }
                }
            }
        }
        
        function handleCanvasTouch(e) {
            e.preventDefault();
            handleCanvasClick(e);
        }
        
        function attachCanvasListeners() {
            canvas.addEventListener('click', handleCanvasClick);
            canvas.addEventListener('touchend', handleCanvasTouch, { passive: false });
            canvas.style.cursor = 'crosshair';
        }
        
        function removeCanvasListeners() {
            canvas.removeEventListener('click', handleCanvasClick);
            canvas.removeEventListener('touchend', handleCanvasTouch);
        }
        
        // ===== Distance input prompt (fallback method) =====
        function showDistanceInputPrompt(instructionEl, canvas, imageFile) {
            currentPhase = 'distance-input';
            
            let distPromptEl = document.getElementById('distancePrompt');
            if (!distPromptEl) {
                distPromptEl = document.createElement('div');
                distPromptEl.id = 'distancePrompt';
                instructionEl.appendChild(distPromptEl);
            }
            
            distPromptEl.style.cssText = 'margin-top: 12px; padding: 12px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 10px;';
            distPromptEl.innerHTML = `
                <div style="color: #10b981; font-weight: 700; font-size: 14px; margin-bottom: 8px;">
                    <i class="fas fa-ruler"></i> How far were you from the tree?
                </div>
                <div style="color: rgba(255,255,255,0.5); font-size: 11px; margin-bottom: 10px;">
                    Accurate distance = accurate measurement. Measure or estimate carefully.
                </div>
                <div style="display: flex; align-items: center; gap: 8px; justify-content: center; flex-wrap: wrap;">
                    <input id="manualDistanceInput" type="number" inputmode="decimal" placeholder="e.g. 2.5" step="0.1" min="0.3" max="50" 
                        style="width: 100px; padding: 10px 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(16,185,129,0.4); border-radius: 8px; color: white; font-size: 16px; text-align: center; font-weight: 700;" />
                    <span style="color: rgba(255,255,255,0.6); font-size: 14px; font-weight: 600;">meters</span>
                    <button id="calcManualBtn" type="button" style="padding: 10px 20px; background: linear-gradient(135deg, #059669, #10b981); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer;">
                        <i class="fas fa-calculator"></i> Calculate
                    </button>
                </div>
                <div style="display: flex; gap: 6px; justify-content: center; margin-top: 8px; flex-wrap: wrap;">
                    <button class="quick-dist-btn" data-dist="1" style="padding: 5px 12px; background: rgba(139,92,246,0.15); color: #a78bfa; border: 1px solid rgba(139,92,246,0.3); border-radius: 6px; cursor: pointer; font-size: 11px;">1m</button>
                    <button class="quick-dist-btn" data-dist="1.5" style="padding: 5px 12px; background: rgba(139,92,246,0.15); color: #a78bfa; border: 1px solid rgba(139,92,246,0.3); border-radius: 6px; cursor: pointer; font-size: 11px;">1.5m</button>
                    <button class="quick-dist-btn" data-dist="2" style="padding: 5px 12px; background: rgba(139,92,246,0.15); color: #a78bfa; border: 1px solid rgba(139,92,246,0.3); border-radius: 6px; cursor: pointer; font-size: 11px;">2m</button>
                    <button class="quick-dist-btn" data-dist="3" style="padding: 5px 12px; background: rgba(139,92,246,0.15); color: #a78bfa; border: 1px solid rgba(139,92,246,0.3); border-radius: 6px; cursor: pointer; font-size: 11px;">3m</button>
                    <button class="quick-dist-btn" data-dist="5" style="padding: 5px 12px; background: rgba(139,92,246,0.15); color: #a78bfa; border: 1px solid rgba(139,92,246,0.3); border-radius: 6px; cursor: pointer; font-size: 11px;">5m</button>
                </div>
                <div style="font-size: 10px; color: rgba(255,255,255,0.3); margin-top: 6px;">
                    <i class="fas fa-lightbulb"></i> Tip: 1 step ≈ 0.7m, arm's length ≈ 0.6m
                </div>
            `;
            
            // Quick distance buttons
            distPromptEl.querySelectorAll('.quick-dist-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('manualDistanceInput').value = btn.dataset.dist;
                });
            });
            
            // Calculate button
            document.getElementById('calcManualBtn').addEventListener('click', () => {
                const distInput = document.getElementById('manualDistanceInput');
                const distMeters = parseFloat(distInput.value);
                
                if (!distMeters || distMeters < 0.3 || distMeters > 50) {
                    distInput.style.borderColor = '#ef4444';
                    distInput.placeholder = 'Enter valid distance!';
                    return;
                }
                
                const distCm = distMeters * 100;
                
                try {
                    const ctx = canvas.getContext('2d');
                    if (originalImageData) {
                        ctx.putImageData(originalImageData, 0, 0);
                    }
                    
                    const measurements = advancedML.manualMeasureFromPoints(canvas, trunkPoints[0], trunkPoints[1], imageFile, distCm);
                    
                    showFullResults(measurements);
                    instructionEl.style.display = 'none';
                    if (distPromptEl) distPromptEl.style.display = 'none';
                    
                } catch (err) {
                    document.getElementById('manualStep').innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#f87171;"></i> ' + err.message;
                }
            });
        }
    }
    
    // ===== Show full results with all measurements =====
    function showFullResults(measurements) {
        const statusEl = document.getElementById('analysisStatus');
        const resultsEl = document.getElementById('measurementResults');
        const retakeTopEl = document.getElementById('retakeTopBtn');
        
        statusEl.style.display = 'none';
        resultsEl.style.display = 'block';
        retakeTopEl.style.display = 'inline-block';
        
        // Fill primary circumference
        document.getElementById('detectedCircumference').textContent = measurements.circumference;
        document.getElementById('detectedConfidence').textContent = measurements.confidence;
        
        // Fill advanced measurements
        const diameterEl = document.getElementById('detectedDiameter');
        const girthEl = document.getElementById('detectedGirth');
        const heightEl = document.getElementById('detectedHeight');
        const trunkWidthEl = document.getElementById('detectedTrunkWidth');
        
        if (diameterEl) diameterEl.textContent = measurements.diameter || (parseFloat(measurements.circumference) / Math.PI).toFixed(1);
        if (girthEl) girthEl.textContent = measurements.girth || measurements.circumference;
        if (heightEl) heightEl.textContent = measurements.height || '-';
        if (trunkWidthEl) trunkWidthEl.textContent = measurements.trunkWidth || '-';
        
        // Add method details info
        addMethodInfo(resultsEl, measurements);
    }

    // ===== Add method info under results =====
    function addMethodInfo(parentEl, measurements) {
        let extraInfo = parentEl.querySelector('.extra-measurement-info');
        if (!extraInfo) {
            extraInfo = document.createElement('div');
            extraInfo.className = 'extra-measurement-info';
            extraInfo.style.cssText = 'margin: 12px 16px; padding: 12px; background: rgba(16,185,129,0.08); border-radius: 10px; font-size: 13px; color: #94a3b8; border: 1px solid rgba(16,185,129,0.2);';
            parentEl.appendChild(extraInfo);
        }

        // Build method details text
        let methodText = '';
        if (measurements.methodDetails) {
            methodText = measurements.methodDetails.map(function(m) {
                return '<b>' + m.name.replace(/_/g, ' ') + '</b>: ' + m.value.toFixed(1) + ' cm' +
                       (m.weight ? ' <span style="opacity:0.6">(' + (m.weight * 100).toFixed(0) + '%)</span>' : '');
            }).join(' | ');
        }

        // Real-world data display
        let realWorldHTML = '';
        if (measurements.realWorldData) {
            const rwd = measurements.realWorldData;
            const parts = [];
            if (rwd.referenceUsed) parts.push('📏 Reference: <b>' + rwd.referenceUsed + '</b>');
            if (rwd.estimatedDistance) parts.push('📐 Distance: <b>' + rwd.estimatedDistance.toFixed(1) + 'm</b>');
            if (rwd.exifFocalLength) parts.push('📷 Focal: <b>' + rwd.exifFocalLength.toFixed(1) + 'mm</b>');
            if (rwd.measurementBasis) parts.push('🔬 Basis: <b>' + rwd.measurementBasis + '</b>');
            if (parts.length) {
                realWorldHTML = '<div style="margin-top:6px; padding-top:6px; border-top:1px solid rgba(255,255,255,0.05);">' +
                    parts.join(' &nbsp;|&nbsp; ') + '</div>';
            }
        }

        // Accuracy tips display (Hindi)
        let tipsHTML = '';
        if (measurements.accuracyTips && measurements.accuracyTips.length > 0) {
            tipsHTML = '<div style="margin-top:8px; padding:8px; background:rgba(245,158,11,0.1); border-radius:8px; border:1px solid rgba(245,158,11,0.2);">' +
                '<div style="color:#f59e0b; margin-bottom:4px;"><i class="fas fa-lightbulb"></i> <b>Tips for better accuracy:</b></div>' +
                measurements.accuracyTips.map(function(tip) { return '<div style="margin-left:8px;">• ' + tip + '</div>'; }).join('') +
                '</div>';
        }

        extraInfo.innerHTML = `
            <div style="margin-bottom: 5px;">
                <i class="fas fa-brain" style="color: #a78bfa;"></i>
                <b>ML Methods:</b> ${methodText}
            </div>
            ${measurements.deeplabUsed ? `<div style="margin-top:6px;padding:6px 10px;background:rgba(16,185,129,0.15);border-radius:8px;border:1px solid rgba(16,185,129,0.3);">
                <i class="fas fa-tree" style="color:#10b981;"></i>
                <b style="color:#10b981;">DeepLab ADE20K Active</b>
                <span style="opacity:0.7;margin-left:6px;">${measurements.deeplabTreePercent}% tree pixels isolated — person/bike ignored ✅</span>
            </div>` : ''}
            ${realWorldHTML}
            ${measurements.species ? '<div style="margin-top:4px;"><i class="fas fa-leaf" style="color: #10b981;"></i> Species: <b>' + measurements.species + '</b></div>' : '<div style="color: #f59e0b; margin-top:4px;"><i class="fas fa-exclamation-triangle"></i> Select a species — improves accuracy</div>'}
            <div style="margin-top: 4px;"><i class="fas fa-bolt" style="color: #f59e0b;"></i> Processed in ${measurements.processingTime || '?'}ms</div>
            ${tipsHTML}
        `;
    }

    // ===== Retake: open native camera again =====
    function handleRetake() {
        cameraModal.style.display = 'none';
        resetModalUI();
        cameraFileInput.value = '';
        cameraFileInput.click();
    }

    retakeBtn.addEventListener('click', handleRetake);
    retakeTopBtn.addEventListener('click', handleRetake);
    
    // ===== Manual fallback from error =====
    const manualFallbackBtn = document.getElementById('manualFallbackBtn');
    if (manualFallbackBtn) {
        manualFallbackBtn.addEventListener('click', () => {
            document.getElementById('analysisError').style.display = 'none';
            manualFallbackBtn.style.display = 'none';
            if (originalImageData && resultCanvas) {
                resultCanvas.getContext('2d').putImageData(originalImageData, 0, 0);
            }
            enterManualMode(resultCanvas, null);
        });
    }

    // ===== Close modal =====
    closeCameraBtn.addEventListener('click', () => {
        cameraModal.style.display = 'none';
        resetModalUI();
    });

    // ===== Manual input =====
    manualInputBtn.addEventListener('click', () => {
        document.getElementById('circumference').disabled = false;
        document.getElementById('circumference').focus();
    });

    // ===== Use measurement: fill circumference & auto-calculate =====
    useMeasurementBtn.addEventListener('click', () => {
        const circumference = document.getElementById('detectedCircumference').textContent;
        const circumferenceValue = parseFloat(circumference);

        if (isNaN(circumferenceValue) || circumferenceValue <= 0) {
            alert('Invalid measurement. Please retake the photo.');
            return;
        }

        // Set circumference
        document.getElementById('circumference').value = circumference;
        document.getElementById('circumference').disabled = false;

        // Close modal
        cameraModal.style.display = 'none';
        resetModalUI();

        // Show success notification
        showAutoFillNotification(circumferenceValue);

        // Auto-trigger calculation
        setTimeout(() => {
            const treeForm = document.getElementById('treeForm');
            if (treeForm) {
                const treeSearch = document.getElementById('treeSearch');
                const treeSpecies = document.getElementById('treeSpecies');

                if ((treeSearch && treeSearch.value) || (treeSpecies && treeSpecies.value)) {
                    const submitEvent = new Event('submit', { cancelable: true });
                    treeForm.dispatchEvent(submitEvent);
                } else {
                    if (treeSearch) {
                        treeSearch.style.border = '2px solid #ef4444';
                        treeSearch.style.animation = 'pulse 1s ease-in-out 3';
                        treeSearch.focus();
                        treeSearch.placeholder = 'Select species to auto-calculate!';
                    }
                }
            }
        }, 800);
    });

    // Reference object (kept for backwards compat)
    if (referenceObjectSelect) {
        referenceObjectSelect.addEventListener('change', (e) => {
            const value = e.target.value;
            customSizeInput.style.display = value === 'custom' ? 'block' : 'none';
        });
    }

    // ===== Reset modal UI =====
    function resetModalUI() {
        document.getElementById('analysisStatus').style.display = 'none';
        document.getElementById('analysisError').style.display = 'none';
        document.getElementById('measurementResults').style.display = 'none';
        document.getElementById('retakeTopBtn').style.display = 'none';
        resultCanvas.style.display = 'none';
        resultCanvas.style.cursor = 'default';
        manualSelectionMode = false;
        manualPoints = [];
        originalImageData = null;
        const extraInfo = document.querySelector('.extra-measurement-info');
        if (extraInfo) extraInfo.remove();
        const modeSelector = document.getElementById('modeSelector');
        if (modeSelector) modeSelector.style.display = 'none';
        const manualInstruction = document.getElementById('manualInstruction');
        if (manualInstruction) manualInstruction.style.display = 'none';
    }
}

// Show auto-fill success notification
function showAutoFillNotification(circumferenceValue) {
    const existing = document.getElementById('autoFillNotification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'autoFillNotification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #059669, #10b981);
        color: white;
        padding: 16px 28px;
        border-radius: 14px;
        font-size: 16px;
        font-weight: bold;
        z-index: 10001;
        box-shadow: 0 8px 32px rgba(16, 185, 129, 0.4);
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideDownNotif 0.4s ease-out;
        max-width: 90vw;
    `;

    notification.innerHTML = `
        <i class="fas fa-check-circle" style="font-size: 24px;"></i>
        <div>
            <div style="font-size: 13px; opacity: 0.85;">Auto-Detected Circumference</div>
            <div style="font-size: 22px;">${circumferenceValue.toFixed(1)} cm ✅</div>
        </div>
    `;

    document.body.appendChild(notification);

    if (!document.getElementById('autoFillAnimStyle')) {
        const style = document.createElement('style');
        style.id = 'autoFillAnimStyle';
        style.textContent = `
            @keyframes slideDownNotif {
                from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.02); border-color: #ef4444; }
            }
        `;
        document.head.appendChild(style);
    }

    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transition = 'opacity 0.5s, transform 0.5s';
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(-100%)';
            setTimeout(() => notification.remove(), 500);
        }
    }, 4000);
}
