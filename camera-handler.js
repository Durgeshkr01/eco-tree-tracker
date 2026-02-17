// Camera Handler for Tree Measurement
// Integrates ML-based measurement with UI

let mlMeasurement = null;
let advancedML = null; // New: Automatic detection
let isDrawingReference = false;
let referenceStartX = 0;
let referenceEndX = 0;
let currentCanvas = null;
let isAutoMode = true; // Default: Automatic mode

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    mlMeasurement = new TreeMeasurementML();
    advancedML = new AdvancedTreeML(); // Initialize automatic ML
    initializeCameraHandlers();
});

function initializeCameraHandlers() {
    const openCameraBtn = document.getElementById('openCameraBtn');
    const manualInputBtn = document.getElementById('manualInputBtn');
    const closeCameraBtn = document.getElementById('closeCameraBtn');
    const cameraModal = document.getElementById('cameraModal');
    const captureBtn = document.getElementById('captureBtn');
    const retakeBtn = document.getElementById('retakeBtn');
    const calculateMeasurementBtn = document.getElementById('calculateMeasurementBtn');
    const useMeasurementBtn = document.getElementById('useMeasurementBtn');
    const referenceObjectSelect = document.getElementById('referenceObject');
    const customSizeInput = document.getElementById('customSizeInput');
    const customWidthInput = document.getElementById('customWidth');
    const cameraVideo = document.getElementById('cameraVideo');
    const cameraCanvas = document.getElementById('cameraCanvas');
    const resultCanvas = document.getElementById('resultCanvas');

    // Open camera modal
    openCameraBtn.addEventListener('click', async () => {
        try {
            cameraModal.style.display = 'flex';
            document.getElementById('measurementStep').style.display = 'none';
            document.getElementById('measurementResults').style.display = 'none';
            retakeBtn.style.display = 'none';
            resultCanvas.style.display = 'none';
            cameraVideo.style.display = 'block';
            
            // Hide reference selector (not needed in auto mode)
            const refSelector = document.querySelector('.reference-selector');
            if (refSelector) refSelector.style.display = 'none';
            
            await advancedML.initializeCamera(cameraVideo);
        } catch (error) {
            alert('Camera Error: ' + error.message);
            cameraModal.style.display = 'none';
        }
    });

    // Close camera modal
    closeCameraBtn.addEventListener('click', () => {
        mlMeasurement.stopCamera();
        advancedML.stopCamera();
        cameraModal.style.display = 'none';
        resetMeasurementUI();
        // Remove any extra info panels
        const extraInfo = document.querySelector('.extra-measurement-info');
        if (extraInfo) extraInfo.remove();
    });

    // Manual input button
    manualInputBtn.addEventListener('click', () => {
        document.getElementById('circumference').disabled = false;
        document.getElementById('circumference').focus();
    });

    // Reference object change
    referenceObjectSelect.addEventListener('change', (e) => {
        const value = e.target.value;
        if (value === 'custom') {
            customSizeInput.style.display = 'block';
        } else {
            customSizeInput.style.display = 'none';
        }
        
        const customWidth = customWidthInput.value;
        mlMeasurement.setReferenceObject(value, customWidth, customWidth);
    });

    // Custom width input
    customWidthInput.addEventListener('change', (e) => {
        const width = e.target.value;
        mlMeasurement.setReferenceObject('custom', width, width);
    });

    // Capture photo
    captureBtn.addEventListener('click', async () => {
        // Disable capture button immediately to prevent double-clicks
        captureBtn.disabled = true;
        captureBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        try {
            const image = advancedML.captureImage(cameraVideo, cameraCanvas);
            
            // Show captured image on result canvas
            const context = resultCanvas.getContext('2d');
            const img = new Image();
            img.onload = async () => {
                resultCanvas.width = img.width;
                resultCanvas.height = img.height;
                context.drawImage(img, 0, 0);
                
                // Hide video, show canvas
                cameraVideo.style.display = 'none';
                resultCanvas.style.display = 'block';
                captureBtn.style.display = 'none';
                retakeBtn.style.display = 'inline-block';
                
                // Show processing overlay
                const loadingMsg = document.createElement('div');
                loadingMsg.id = 'autoProcessing';
                loadingMsg.style.cssText = 'text-align: center; padding: 20px; color: #27ae60; font-weight: bold;';
                
                // Check if species is selected
                const treeSearchVal = document.getElementById('treeSearch') ? document.getElementById('treeSearch').value : '';
                const speciesInfo = treeSearchVal ? ` (calibrating for ${treeSearchVal})` : ' (select species for better accuracy)';
                
                loadingMsg.innerHTML = `
                    <div style="margin-bottom: 12px;">
                        <div class="processing-spinner" style="width: 40px; height: 40px; border: 4px solid #e0e0e0; border-top: 4px solid #27ae60; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 10px;"></div>
                    </div>
                    <div style="font-size: 16px;">Analyzing Tree${speciesInfo}...</div>
                    <small style="color: #666; font-weight: normal; margin-top: 8px; display: block;">
                        Running: Edge Detection → Trunk Analysis → Measurement Fusion
                    </small>
                    <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
                `;
                document.querySelector('.camera-modal-content').appendChild(loadingMsg);
                
                try {
                    // Load models and run automatic measurement
                    await advancedML.loadModels();
                    const measurements = await advancedML.measureAutomatically(resultCanvas);
                    
                    // Draw advanced detection overlay
                    advancedML.drawDetectionOverlay(resultCanvas, measurements.bounds, measurements);
                    
                    // Display results
                    document.getElementById('detectedHeight').textContent = measurements.height;
                    document.getElementById('detectedWidth').textContent = measurements.trunkWidth;
                    document.getElementById('detectedCircumference').textContent = measurements.circumference;
                    document.getElementById('detectedConfidence').textContent = measurements.confidence;
                    
                    // Remove loading and show results
                    if (loadingMsg) loadingMsg.remove();
                    document.getElementById('measurementResults').style.display = 'block';
                    
                    // Add species & method info under results
                    const resultsDiv = document.getElementById('measurementResults');
                    let extraInfo = resultsDiv.querySelector('.extra-measurement-info');
                    if (!extraInfo) {
                        extraInfo = document.createElement('div');
                        extraInfo.className = 'extra-measurement-info';
                        extraInfo.style.cssText = 'margin-top: 10px; padding: 12px; background: rgba(16,185,129,0.08); border-radius: 10px; font-size: 13px; color: #94a3b8; border: 1px solid rgba(16,185,129,0.2);';
                        resultsDiv.appendChild(extraInfo);
                    }
                    
                    let methodText = '';
                    if (measurements.methodDetails) {
                        methodText = measurements.methodDetails.map(function(m) {
                            return '<b>' + m.name.replace('_', ' ') + '</b>: ' + m.value.toFixed(1) + ' cm';
                        }).join(' | ');
                    }
                    
                    extraInfo.innerHTML = `
                        <div style="margin-bottom: 5px;">
                            <i class="fas fa-brain" style="color: #8e44ad;"></i>
                            <b>Analysis Methods:</b> ${methodText}
                        </div>
                        ${measurements.species ? '<div><i class="fas fa-leaf" style="color: #27ae60;"></i> Calibrated for: <b>' + measurements.species + '</b></div>' : '<div style="color: #e67e22;"><i class="fas fa-exclamation-triangle"></i> Select species above for better accuracy</div>'}
                        <div style="margin-top: 4px;"><i class="fas fa-bolt" style="color: #f39c12;"></i> Processed in ${measurements.processingTime || '?'}ms</div>
                    `;
                    
                } catch (error) {
                    if (loadingMsg) loadingMsg.remove();
                    
                    // Show error inline instead of alert
                    const errorMsg = document.createElement('div');
                    errorMsg.id = 'captureError';
                    errorMsg.style.cssText = 'text-align: center; padding: 16px; color: #f87171; background: rgba(239,68,68,0.1); border-radius: 10px; margin: 10px 0; border: 1px solid rgba(239,68,68,0.3);';
                    errorMsg.innerHTML = `
                        <i class="fas fa-exclamation-circle" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
                        <b>Detection Issue:</b> ${error.message}<br>
                        <small style="color: #888; margin-top: 8px; display: block;">Please retake: center the tree, ensure good lighting, stand 2-3m away</small>
                    `;
                    document.querySelector('.camera-modal-content').appendChild(errorMsg);
                    
                    // Auto-remove error after 5s
                    setTimeout(() => { if (errorMsg.parentNode) errorMsg.remove(); }, 5000);
                }
            };
            img.src = image;
        } catch (e) {
            console.error('Capture failed:', e);
        } finally {
            // Re-enable capture button
            captureBtn.disabled = false;
            captureBtn.innerHTML = '<i class="fas fa-camera"></i> Capture Photo';
        }
    });

    // Retake photo
    retakeBtn.addEventListener('click', () => {
        resetMeasurementUI();
        cameraVideo.style.display = 'block';
        resultCanvas.style.display = 'none';
        captureBtn.style.display = 'inline-block';
        captureBtn.disabled = false;
        captureBtn.innerHTML = '<i class="fas fa-camera"></i> Capture Photo';
        retakeBtn.style.display = 'none';
        // Remove any error messages
        const captureError = document.getElementById('captureError');
        if (captureError) captureError.remove();
        const autoProcessing = document.getElementById('autoProcessing');
        if (autoProcessing) autoProcessing.remove();
        const extraInfo = document.querySelector('.extra-measurement-info');
        if (extraInfo) extraInfo.remove();
    });

    // Calculate measurements
    calculateMeasurementBtn.addEventListener('click', async () => {
        try {
            const referencePixelWidth = Math.abs(referenceEndX - referenceStartX);
            
            if (referencePixelWidth < 10) {
                alert('Reference width too small. Please mark a larger reference object.');
                return;
            }
            
            // Show loading
            calculateMeasurementBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating...';
            calculateMeasurementBtn.disabled = true;
            
            // Calculate measurements
            const measurements = await mlMeasurement.calculateMeasurements(
                resultCanvas,
                referencePixelWidth
            );
            
            // Draw detection overlay
            mlMeasurement.drawDetectionOverlay(resultCanvas, measurements.bounds, measurements);
            
            // Display results
            document.getElementById('detectedHeight').textContent = measurements.height;
            document.getElementById('detectedWidth').textContent = measurements.width;
            document.getElementById('detectedCircumference').textContent = measurements.circumference;
            document.getElementById('detectedConfidence').textContent = measurements.confidence;
            
            document.getElementById('measurementResults').style.display = 'block';
            
            // Reset button
            calculateMeasurementBtn.innerHTML = '<i class="fas fa-calculator"></i> Calculate Measurements';
            calculateMeasurementBtn.disabled = false;
            
        } catch (error) {
            alert('Measurement Error: ' + error.message);
            calculateMeasurementBtn.innerHTML = '<i class="fas fa-calculator"></i> Calculate Measurements';
            calculateMeasurementBtn.disabled = false;
        }
    });

    // Use measurement - auto fill circumference and auto calculate
    useMeasurementBtn.addEventListener('click', () => {
        const circumference = document.getElementById('detectedCircumference').textContent;
        const circumferenceValue = parseFloat(circumference);
        
        if (isNaN(circumferenceValue) || circumferenceValue <= 0) {
            alert('Invalid measurement. Please retake the photo.');
            return;
        }
        
        // Set circumference value
        document.getElementById('circumference').value = circumference;
        document.getElementById('circumference').disabled = false;
        
        // Close modal
        mlMeasurement.stopCamera();
        advancedML.stopCamera();
        cameraModal.style.display = 'none';
        resetMeasurementUI();
        
        // Show success notification
        showAutoFillNotification(circumferenceValue);
        
        // Auto-trigger calculation after a short delay
        setTimeout(() => {
            const treeForm = document.getElementById('treeForm');
            if (treeForm) {
                // Check if species is selected
                const treeSearch = document.getElementById('treeSearch');
                const treeSpecies = document.getElementById('treeSpecies');
                
                if ((treeSearch && treeSearch.value) || (treeSpecies && treeSpecies.value)) {
                    // Auto submit the form to calculate
                    const submitEvent = new Event('submit', { cancelable: true });
                    treeForm.dispatchEvent(submitEvent);
                } else {
                    // Highlight species field
                    if (treeSearch) {
                        treeSearch.style.border = '2px solid #e74c3c';
                        treeSearch.style.animation = 'pulse 1s ease-in-out 3';
                        treeSearch.focus();
                        treeSearch.placeholder = '⚠️ Select species to auto-calculate!';
                    }
                }
            }
        }, 800);
    });
}

// Enable drawing reference on canvas
function enableReferenceDrawing(canvas) {
    currentCanvas = canvas;
    const context = canvas.getContext('2d');
    let isDragging = false;

    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        const rect = canvas.getBoundingClientRect();
        referenceStartX = (e.clientX - rect.left) * (canvas.width / rect.width);
        referenceEndX = referenceStartX;
        isDrawingReference = true;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const rect = canvas.getBoundingClientRect();
        referenceEndX = (e.clientX - rect.left) * (canvas.width / rect.width);
        
        // Redraw image
        const img = new Image();
        img.onload = () => {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(img, 0, 0);
            
            // Draw reference line
            context.strokeStyle = '#e74c3c';
            context.lineWidth = 3;
            context.beginPath();
            context.moveTo(referenceStartX, canvas.height / 2);
            context.lineTo(referenceEndX, canvas.height / 2);
            context.stroke();
            
            // Draw arrows
            drawArrow(context, referenceStartX, canvas.height / 2, referenceEndX, canvas.height / 2);
            
            // Update pixel width display
            const pixelWidth = Math.abs(referenceEndX - referenceStartX);
            document.getElementById('pixelWidth').textContent = pixelWidth.toFixed(0);
        };
        img.src = mlMeasurement.capturedImage;
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
        const pixelWidth = Math.abs(referenceEndX - referenceStartX);
        
        if (pixelWidth > 10) {
            document.getElementById('calculateMeasurementBtn').disabled = false;
        }
    });

    // Touch events for mobile
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isDragging = true;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        referenceStartX = (touch.clientX - rect.left) * (canvas.width / rect.width);
        referenceEndX = referenceStartX;
        isDrawingReference = true;
    });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!isDragging) return;
        
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        referenceEndX = (touch.clientX - rect.left) * (canvas.width / rect.width);
        
        // Redraw image
        const img = new Image();
        img.onload = () => {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(img, 0, 0);
            
            // Draw reference line
            context.strokeStyle = '#e74c3c';
            context.lineWidth = 3;
            context.beginPath();
            context.moveTo(referenceStartX, canvas.height / 2);
            context.lineTo(referenceEndX, canvas.height / 2);
            context.stroke();
            
            // Draw arrows
            drawArrow(context, referenceStartX, canvas.height / 2, referenceEndX, canvas.height / 2);
            
            // Update pixel width display
            const pixelWidth = Math.abs(referenceEndX - referenceStartX);
            document.getElementById('pixelWidth').textContent = pixelWidth.toFixed(0);
        };
        img.src = mlMeasurement.capturedImage;
    });

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        isDragging = false;
        const pixelWidth = Math.abs(referenceEndX - referenceStartX);
        
        if (pixelWidth > 10) {
            document.getElementById('calculateMeasurementBtn').disabled = false;
        }
    });
}

// Draw arrow helper
function drawArrow(context, fromX, fromY, toX, toY) {
    const headLength = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    // Arrow head at start
    context.beginPath();
    context.moveTo(fromX, fromY);
    context.lineTo(
        fromX + headLength * Math.cos(angle + Math.PI - Math.PI / 6),
        fromY + headLength * Math.sin(angle + Math.PI - Math.PI / 6)
    );
    context.moveTo(fromX, fromY);
    context.lineTo(
        fromX + headLength * Math.cos(angle + Math.PI + Math.PI / 6),
        fromY + headLength * Math.sin(angle + Math.PI + Math.PI / 6)
    );
    context.stroke();
    
    // Arrow head at end
    context.beginPath();
    context.moveTo(toX, toY);
    context.lineTo(
        toX - headLength * Math.cos(angle - Math.PI / 6),
        toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    context.moveTo(toX, toY);
    context.lineTo(
        toX - headLength * Math.cos(angle + Math.PI / 6),
        toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    context.stroke();
}

// Reset measurement UI
function resetMeasurementUI() {
    document.getElementById('measurementStep').style.display = 'none';
    document.getElementById('measurementResults').style.display = 'none';
    document.getElementById('pixelWidth').textContent = '0';
    document.getElementById('calculateMeasurementBtn').disabled = true;
    referenceStartX = 0;
    referenceEndX = 0;
    isDrawingReference = false;
}

// Show auto-fill success notification (replaces alert)
function showAutoFillNotification(circumferenceValue) {
    // Remove existing notification if any
    const existing = document.getElementById('autoFillNotification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.id = 'autoFillNotification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #27ae60, #2ecc71);
        color: white;
        padding: 16px 28px;
        border-radius: 12px;
        font-size: 16px;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 8px 32px rgba(39, 174, 96, 0.4);
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideDownNotif 0.4s ease-out;
        max-width: 90vw;
    `;
    
    notification.innerHTML = `
        <i class="fas fa-check-circle" style="font-size: 24px;"></i>
        <div>
            <div style="font-size: 14px; opacity: 0.9;">Auto-Detected Circumference</div>
            <div style="font-size: 20px;">${circumferenceValue.toFixed(1)} cm</div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Add animation keyframes if not exists
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
                50% { transform: scale(1.02); border-color: #e74c3c; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transition = 'opacity 0.5s, transform 0.5s';
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(-100%)';
            setTimeout(() => notification.remove(), 500);
        }
    }, 4000);
}
