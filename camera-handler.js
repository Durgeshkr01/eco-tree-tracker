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
                <button id="autoDetectBtn" type="button" style="flex:1; min-width:140px; padding: 14px 20px; background: linear-gradient(135deg, #059669, #10b981); color: white; border: none; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 15px rgba(16,185,129,0.3);">
                    <i class="fas fa-robot"></i> Auto Detect
                </button>
                <button id="manualSelectBtn" type="button" style="flex:1; min-width:140px; padding: 14px 20px; background: linear-gradient(135deg, #7c3aed, #8b5cf6); color: white; border: none; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 15px rgba(139,92,246,0.3);">
                    <i class="fas fa-hand-pointer"></i> Manual Select
                </button>
            </div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 8px;">
                Auto = AI detects tree automatically &nbsp;|&nbsp; Manual = Tap trunk edges yourself
            </div>
        `;
        modeSelectorEl.style.display = 'block';
        
        // Auto detect button
        document.getElementById('autoDetectBtn').addEventListener('click', async () => {
            modeSelectorEl.style.display = 'none';
            await analyzePhoto(canvas, file);
        });
        
        // Manual select button
        document.getElementById('manualSelectBtn').addEventListener('click', () => {
            modeSelectorEl.style.display = 'none';
            enterManualMode(canvas, file);
        });
    }
    
    // ===== Enter manual trunk selection mode =====
    function enterManualMode(canvas, imageFile) {
        manualSelectionMode = true;
        manualPoints = [];
        
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
        instructionEl.style.cssText = 'padding: 12px 16px; text-align: center; background: rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.3); border-radius: 10px; margin: 8px 16px;';
        instructionEl.innerHTML = `
            <div style="color: #a78bfa; font-weight: 700; font-size: 15px; margin-bottom: 6px;">
                <i class="fas fa-hand-pointer"></i> Manual Trunk Selection
            </div>
            <div style="color: rgba(255,255,255,0.7); font-size: 13px;">
                <span id="manualStep">Step 1: Tap the <b>LEFT edge</b> of the trunk at chest height</span>
            </div>
            <div style="margin-top: 8px;">
                <span id="pointCount" style="color: #a78bfa; font-size: 12px;">Points: 0/2</span>
                <button id="resetPointsBtn" type="button" style="margin-left: 12px; padding: 4px 12px; background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid rgba(239,68,68,0.3); border-radius: 6px; cursor: pointer; font-size: 11px;">
                    <i class="fas fa-undo"></i> Reset
                </button>
            </div>
        `;
        instructionEl.style.display = 'block';
        
        // Reset points button
        document.getElementById('resetPointsBtn').addEventListener('click', () => {
            manualPoints = [];
            if (originalImageData) {
                canvas.getContext('2d').putImageData(originalImageData, 0, 0);
            }
            document.getElementById('manualStep').innerHTML = 'Step 1: Tap the <b>LEFT edge</b> of the trunk at chest height';
            document.getElementById('pointCount').textContent = 'Points: 0/2';
        });
        
        // Canvas touch/click handler for manual points
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
            
            manualPoints.push({ x: Math.round(x), y: Math.round(y) });
            
            // Draw point marker
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = manualPoints.length === 1 ? '#3b82f6' : '#ef4444';
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(manualPoints.length === 1 ? 'L' : 'R', x, y + 4);
            
            document.getElementById('pointCount').textContent = 'Points: ' + manualPoints.length + '/2';
            
            if (manualPoints.length === 1) {
                document.getElementById('manualStep').innerHTML = 'Step 2: Now tap the <b>RIGHT edge</b> of the trunk';
            }
            
            if (manualPoints.length >= 2) {
                // Both points selected — calculate measurements
                manualSelectionMode = false;
                canvas.removeEventListener('click', handleCanvasClick);
                canvas.removeEventListener('touchend', handleCanvasTouch);
                
                document.getElementById('manualStep').innerHTML = '<i class="fas fa-check-circle" style="color:#10b981;"></i> Both edges selected! Calculating...';
                
                try {
                    // Restore original image before drawing overlay
                    if (originalImageData) {
                        ctx.putImageData(originalImageData, 0, 0);
                    }
                    
                    const measurements = advancedML.manualMeasureFromPoints(canvas, manualPoints[0], manualPoints[1], imageFile);
                    
                    // Show full results
                    showFullResults(measurements);
                    
                    if (instructionEl) instructionEl.style.display = 'none';
                    
                } catch (err) {
                    document.getElementById('manualStep').innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#f87171;"></i> ' + err.message;
                }
            }
        }
        
        function handleCanvasTouch(e) {
            e.preventDefault();
            handleCanvasClick(e);
        }
        
        canvas.addEventListener('click', handleCanvasClick);
        canvas.addEventListener('touchend', handleCanvasTouch, { passive: false });
        
        // Change cursor
        canvas.style.cursor = 'crosshair';
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
