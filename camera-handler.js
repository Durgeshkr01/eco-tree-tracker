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
            
            // Show loading message
            const loadingMsg = document.createElement('div');
            loadingMsg.id = 'autoProcessing';
            loadingMsg.style.cssText = 'text-align: center; padding: 20px; color: #27ae60; font-weight: bold;';
            loadingMsg.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Automatically detecting tree...';
            document.querySelector('.camera-modal-content').appendChild(loadingMsg);
            
            try {
                // Automatic measurement (NO reference object needed!)
                await advancedML.loadModels();
                const measurements = await advancedML.measureAutomatically(resultCanvas);
                
                // Draw detection overlay
                advancedML.drawDetectionOverlay(resultCanvas, measurements.bounds, measurements);
                
                // Display results
                document.getElementById('detectedHeight').textContent = measurements.height;
                document.getElementById('detectedWidth').textContent = measurements.trunkWidth;
                document.getElementById('detectedCircumference').textContent = measurements.circumference;
                document.getElementById('detectedConfidence').textContent = measurements.confidence;
                
                // Remove loading and show results
                if (loadingMsg) loadingMsg.remove();
                document.getElementById('measurementResults').style.display = 'block';
                
            } catch (error) {
                if (loadingMsg) loadingMsg.remove();
                alert('Auto-detection failed: ' + error.message + '\n\nPlease ensure:\n- Tree is centered\n- Good lighting\n- Clear background');
                retakeBtn.click(); // Go back to camera
            }
        };
        img.src = image;
    });

    // Retake photo
    retakeBtn.addEventListener('click', () => {
        resetMeasurementUI();
        cameraVideo.style.display = 'block';
        resultCanvas.style.display = 'none';
        captureBtn.style.display = 'inline-block';
        retakeBtn.style.display = 'none';
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

    // Use measurement
    useMeasurementBtn.addEventListener('click', () => {
        const circumference = document.getElementById('detectedCircumference').textContent;
        document.getElementById('circumference').value = circumference;
        
        // Close modal
        mlMeasurement.stopCamera();
        cameraModal.style.display = 'none';
        resetMeasurementUI();
        
        // Show success message
        alert(`✅ Circumference set to ${circumference} cm\nYou can now calculate the tree's environmental impact!`);
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
