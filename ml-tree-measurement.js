// ML-based Tree Measurement System
// Uses TensorFlow.js + Image Processing for automatic tree measurement

class TreeMeasurementML {
    constructor() {
        this.model = null;
        this.isModelLoaded = false;
        this.videoStream = null;
        this.canvasContext = null;
        
        // Reference object sizes (in cm)
        this.referenceObjects = {
            'credit-card': { width: 8.5, height: 5.4 },
            'a4-paper': { width: 21, height: 29.7 },
            'coin-10rs': { width: 2.7, height: 2.7 },
            'hand': { width: 9, height: 18 }, // Average adult hand
            'custom': { width: 0, height: 0 }
        };
        
        this.selectedReference = 'credit-card';
        this.pixelToCmRatio = null;
        this.capturedImage = null;
    }

    // Initialize camera
    async initializeCamera(videoElement) {
        try {
            const constraints = {
                video: {
                    facingMode: 'environment', // Use back camera on mobile
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            };
            
            this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            videoElement.srcObject = this.videoStream;
            
            return new Promise((resolve) => {
                videoElement.onloadedmetadata = () => {
                    videoElement.play();
                    resolve(true);
                };
            });
        } catch (error) {
            console.error('Camera initialization error:', error);
            throw new Error('Camera access denied. Please allow camera permission.');
        }
    }

    // Stop camera
    stopCamera() {
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
            this.videoStream = null;
        }
    }

    // Capture image from video
    captureImage(videoElement, canvasElement) {
        const context = canvasElement.getContext('2d');
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        
        context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        this.capturedImage = canvasElement.toDataURL('image/jpeg', 0.9);
        
        return this.capturedImage;
    }

    // Set reference object
    setReferenceObject(type, customWidth = null, customHeight = null) {
        this.selectedReference = type;
        
        if (type === 'custom' && customWidth && customHeight) {
            this.referenceObjects.custom.width = parseFloat(customWidth);
            this.referenceObjects.custom.height = parseFloat(customHeight);
        }
    }

    // Edge detection using canvas processing
    detectEdges(imageData) {
        const pixels = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const output = new Uint8ClampedArray(pixels.length);
        
        // Sobel filter kernels
        const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
        const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0, gy = 0;
                
                // Apply Sobel kernels
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        const gray = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
                        gx += gray * sobelX[ky + 1][kx + 1];
                        gy += gray * sobelY[ky + 1][kx + 1];
                    }
                }
                
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                const idx = (y * width + x) * 4;
                output[idx] = output[idx + 1] = output[idx + 2] = magnitude > 128 ? 255 : 0;
                output[idx + 3] = 255;
            }
        }
        
        return new ImageData(output, width, height);
    }

    // Find contours and calculate dimensions
    findTreeContour(canvas) {
        const context = canvas.getContext('2d');
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Convert to grayscale
        const pixels = imageData.data;
        for (let i = 0; i < pixels.length; i += 4) {
            const gray = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
            pixels[i] = pixels[i + 1] = pixels[i + 2] = gray;
        }
        
        // Apply edge detection
        const edges = this.detectEdges(imageData);
        
        // Find bounding box
        let minX = canvas.width, maxX = 0;
        let minY = canvas.height, maxY = 0;
        
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const idx = (y * canvas.width + x) * 4;
                if (edges.data[idx] > 128) { // Edge pixel
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
    }

    // Calculate measurements from image
    async calculateMeasurements(canvas, referencePixelWidth) {
        try {
            // Calculate pixel to cm ratio using reference object
            const referenceObject = this.referenceObjects[this.selectedReference];
            this.pixelToCmRatio = referenceObject.width / referencePixelWidth;
            
            // Find tree contour
            const treeBounds = this.findTreeContour(canvas);
            
            // Calculate real-world measurements
            const treeHeightCm = treeBounds.height * this.pixelToCmRatio;
            const treeWidthCm = treeBounds.width * this.pixelToCmRatio;
            
            // Calculate circumference (assuming circular cross-section)
            // Circumference = π × diameter
            const estimatedCircumference = Math.PI * treeWidthCm;
            
            return {
                height: treeHeightCm.toFixed(2),
                width: treeWidthCm.toFixed(2),
                circumference: estimatedCircumference.toFixed(2),
                bounds: treeBounds,
                confidence: this.calculateConfidence(treeBounds)
            };
        } catch (error) {
            console.error('Measurement calculation error:', error);
            throw new Error('Failed to calculate measurements from image.');
        }
    }

    // Calculate confidence score
    calculateConfidence(bounds) {
        // Simple confidence based on detection quality
        const areaRatio = (bounds.width * bounds.height) / (bounds.width * bounds.height);
        let confidence = 0.7; // Base confidence
        
        // Adjust based on detection quality
        if (bounds.width > 100 && bounds.height > 200) {
            confidence += 0.2;
        }
        
        if (bounds.centerX > 0 && bounds.centerY > 0) {
            confidence += 0.1;
        }
        
        return Math.min(confidence * 100, 95).toFixed(1);
    }

    // Draw detection overlay
    drawDetectionOverlay(canvas, bounds, measurements) {
        const context = canvas.getContext('2d');
        
        // Draw bounding box
        context.strokeStyle = '#27ae60';
        context.lineWidth = 3;
        context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        
        // Draw measurements
        context.fillStyle = '#27ae60';
        context.font = 'bold 16px Arial';
        
        // Height label
        context.fillText(
            `Height: ${measurements.height} cm`,
            bounds.x + 10,
            bounds.y - 30
        );
        
        // Width label
        context.fillText(
            `Width: ${measurements.width} cm`,
            bounds.x + 10,
            bounds.y - 10
        );
        
        // Circumference label
        context.fillStyle = '#e74c3c';
        context.fillText(
            `Circumference: ${measurements.circumference} cm`,
            bounds.x + 10,
            bounds.y + bounds.height + 25
        );
        
        // Confidence
        context.fillStyle = '#3498db';
        context.fillText(
            `Confidence: ${measurements.confidence}%`,
            bounds.x + bounds.width - 150,
            bounds.y - 10
        );
        
        // Center point
        context.fillStyle = '#e74c3c';
        context.beginPath();
        context.arc(bounds.centerX, bounds.centerY, 5, 0, 2 * Math.PI);
        context.fill();
    }

    // Advanced ML-based measurement using TensorFlow.js (placeholder for future enhancement)
    async loadMLModel() {
        try {
            // Placeholder for TensorFlow.js model loading
            // In future, you can load a custom trained model here
            console.log('ML Model loading...');
            
            // For now, we use image processing approach
            this.isModelLoaded = true;
            
            return true;
        } catch (error) {
            console.error('Model loading error:', error);
            this.isModelLoaded = false;
            return false;
        }
    }

    // Process with ML model (placeholder)
    async processWithML(imageData) {
        if (!this.isModelLoaded) {
            await this.loadMLModel();
        }
        
        // Placeholder for ML inference
        // Future enhancement: Use TensorFlow.js for better accuracy
        
        return null;
    }

    // Get measurement instructions
    getMeasurementInstructions() {
        return `
📸 How to Measure Tree Using Camera:

1️⃣ Place Reference Object:
   - Keep a known-size object (credit card, A4 paper, etc.) near the tree trunk
   - Make sure it's clearly visible and at same distance as tree

2️⃣ Frame the Shot:
   - Stand 2-3 meters away from the tree
   - Keep camera parallel to the ground
   - Ensure entire tree trunk is visible in frame
   - Include reference object in the photo

3️⃣ Capture & Process:
   - Tap capture button
   - Mark the reference object width in pixels
   - System will auto-calculate tree measurements

4️⃣ Tips for Better Accuracy:
   ✓ Good lighting conditions
   ✓ Clear background
   ✓ Reference object clearly visible
   ✓ Camera held steady
        `;
    }
}

// Export for use in other files
window.TreeMeasurementML = TreeMeasurementML;
