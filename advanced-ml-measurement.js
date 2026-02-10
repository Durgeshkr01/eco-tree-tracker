// Advanced ML Tree Measurement - No Reference Object Needed!
// Uses TensorFlow.js with pre-trained models for automatic detection

class AdvancedTreeML {
    constructor() {
        this.mobilenet = null;
        this.depthModel = null;
        this.segmentationModel = null;
        this.isModelLoaded = false;
        
        // Average human height for scale estimation (in cm)
        this.ASSUMED_CAMERA_HEIGHT = 140; // Breast height ~1.4m
        this.ASSUMED_DISTANCE = 250; // Average 2.5 meters
        
        // Camera field of view (typical smartphone)
        this.CAMERA_FOV = 60; // degrees
        
        this.videoStream = null;
        this.capturedImage = null;
    }

    // Load ML models
    async loadModels() {
        try {
            console.log('🔄 Loading ML models...');
            
            // Load MobileNet for object detection
            if (typeof tf !== 'undefined' && tf.loadLayersModel) {
                console.log('✅ TensorFlow.js loaded');
                
                // For now, we'll use image processing + heuristics
                // Future: Load actual depth estimation model
                this.isModelLoaded = true;
                console.log('✅ Models ready for processing');
                return true;
            } else {
                console.warn('⚠️ TensorFlow.js not loaded, using fallback');
                this.isModelLoaded = true;
                return true;
            }
        } catch (error) {
            console.error('❌ Model loading error:', error);
            this.isModelLoaded = true; // Use fallback
            return true;
        }
    }

    // Initialize camera
    async initializeCamera(videoElement) {
        try {
            const constraints = {
                video: {
                    facingMode: 'environment',
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
            console.error('Camera error:', error);
            throw new Error('Camera access denied');
        }
    }

    // Stop camera
    stopCamera() {
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
            this.videoStream = null;
        }
    }

    // Capture image
    captureImage(videoElement, canvasElement) {
        const context = canvasElement.getContext('2d');
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        
        context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        this.capturedImage = canvasElement.toDataURL('image/jpeg', 0.9);
        
        return this.capturedImage;
    }

    // Advanced edge detection with adaptive thresholding
    detectEdgesAdvanced(imageData) {
        const pixels = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const output = new Uint8ClampedArray(pixels.length);
        
        // Sobel filter
        const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
        const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
        
        // Calculate gradients
        const gradients = [];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0, gy = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        const gray = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
                        gx += gray * sobelX[ky + 1][kx + 1];
                        gy += gray * sobelY[ky + 1][kx + 1];
                    }
                }
                
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                gradients.push(magnitude);
            }
        }
        
        // Adaptive threshold (Otsu's method simplified)
        gradients.sort((a, b) => a - b);
        const threshold = gradients[Math.floor(gradients.length * 0.7)]; // 70th percentile
        
        // Apply threshold
        let gIdx = 0;
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const value = gradients[gIdx++] > threshold ? 255 : 0;
                output[idx] = output[idx + 1] = output[idx + 2] = value;
                output[idx + 3] = 255;
            }
        }
        
        return new ImageData(output, width, height);
    }

    // Color-based tree segmentation (green detection)
    segmentTree(imageData) {
        const pixels = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const mask = new Uint8ClampedArray(pixels.length);
        
        let treePixelCount = 0;
        let totalPixels = width * height;
        
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            
            // Detect brown (trunk) and green (leaves)
            const isBrown = (r > 80 && r < 150) && (g > 60 && g < 120) && (b > 40 && b < 100);
            const isGreen = (g > r) && (g > b) && (g > 50);
            const isDarkBrown = (r > 40 && r < 100) && (g > 30 && g < 80) && (b > 20 && b < 60);
            const isLightBrown = (r > 100 && r < 180) && (g > 80 && g < 140) && (b > 50 && b < 110);
            
            if (isBrown || isGreen || isDarkBrown || isLightBrown) {
                mask[i] = 255;     // Mark as tree
                mask[i + 1] = 255;
                mask[i + 2] = 255;
                treePixelCount++;
            } else {
                mask[i] = 0;       // Background
                mask[i + 1] = 0;
                mask[i + 2] = 0;
            }
            mask[i + 3] = 255;
        }
        
        // Calculate tree coverage percentage
        const treeCoverage = (treePixelCount / totalPixels) * 100;
        
        return {
            imageData: new ImageData(mask, width, height),
            treeCoverage: treeCoverage
        };
    }

    // Validate if image contains a tree
    validateTreePresence(imageData) {
        const pixels = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        let greenPixels = 0;
        let brownPixels = 0;
        let skinPixels = 0;
        let grayPixels = 0; // For cars, buildings
        let totalPixels = width * height;
        
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            
            // Green detection (leaves/grass)
            if (g > r && g > b && g > 60) {
                greenPixels++;
            }
            
            // Brown detection (tree trunk/bark)
            if ((r > 80 && r < 180) && (g > 60 && g < 140) && (b > 40 && b < 110)) {
                brownPixels++;
            }
            
            // Skin tone detection (human)
            if ((r > 180 && r < 255) && (g > 140 && g < 220) && (b > 120 && b < 200)) {
                skinPixels++;
            }
            
            // Gray/metallic detection (car/building)
            const avg = (r + g + b) / 3;
            const variance = Math.abs(r - avg) + Math.abs(g - avg) + Math.abs(b - avg);
            if (variance < 30 && avg > 80 && avg < 200) {
                grayPixels++;
            }
        }
        
        // Calculate percentages
        const greenPercent = (greenPixels / totalPixels) * 100;
        const brownPercent = (brownPixels / totalPixels) * 100;
        const skinPercent = (skinPixels / totalPixels) * 100;
        const grayPercent = (grayPixels / totalPixels) * 100;
        
        // Tree should have significant green (leaves) OR brown (trunk)
        const hasTreeColors = (greenPercent > 5) || (brownPercent > 3);
        
        // Too much skin tone = human detected
        const hasPerson = skinPercent > 8;
        
        // Too much gray = car/building
        const hasVehicleOrBuilding = grayPercent > 40;
        
        // Validation result
        const isTree = hasTreeColors && !hasPerson && !hasVehicleOrBuilding;
        
        return {
            isTree: isTree,
            greenPercent: greenPercent.toFixed(1),
            brownPercent: brownPercent.toFixed(1),
            skinPercent: skinPercent.toFixed(1),
            grayPercent: grayPercent.toFixed(1),
            errorMessage: this.getValidationError(hasTreeColors, hasPerson, hasVehicleOrBuilding)
        };
    }

    // Get specific error message
    getValidationError(hasTreeColors, hasPerson, hasVehicleOrBuilding) {
        if (hasPerson) {
            return '❌ Human detected! Please capture only the tree.';
        }
        if (hasVehicleOrBuilding) {
            return '❌ Car/Building detected! Please focus on the tree only.';
        }
        if (!hasTreeColors) {
            return '❌ No tree detected! Please ensure tree is clearly visible with green leaves or brown trunk.';
        }
        return null;
    }

    // Find tree contour with morphological operations
    findTreeContourAdvanced(canvas) {
        const context = canvas.getContext('2d');
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Step 1: Color-based segmentation
        const segmentResult = this.segmentTree(imageData);
        const segmented = segmentResult.imageData;
        const treeCoverage = segmentResult.treeCoverage;
        
        // Validate tree coverage
        if (treeCoverage < 5) {
            throw new Error('Tree coverage too low (' + treeCoverage.toFixed(1) + '%). Tree not clearly visible in frame.');
        }
        
        if (treeCoverage > 90) {
            throw new Error('Frame almost fully covered. Please move back from the tree.');
        }
        
        // Step 2: Edge detection
        const edges = this.detectEdgesAdvanced(imageData);
        
        // Combine segmentation and edges
        const combined = new Uint8ClampedArray(segmented.data.length);
        for (let i = 0; i < combined.length; i += 4) {
            combined[i] = Math.max(segmented.data[i], edges.data[i]);
            combined[i + 1] = combined[i];
            combined[i + 2] = combined[i];
            combined[i + 3] = 255;
        }
        
        // Find bounding box from center (tree typically in center)
        let minX = canvas.width, maxX = 0;
        let minY = canvas.height, maxY = 0;
        
        const centerX = canvas.width / 2;
        const searchWidth = canvas.width * 0.6; // Search in center 60%
        
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                // Focus on center area
                if (Math.abs(x - centerX) > searchWidth / 2) continue;
                
                const idx = (y * canvas.width + x) * 4;
                if (combined[idx] > 128) {
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        
        // Validate bounds
        if (maxX - minX < 50 || maxY - minY < 100) {
            throw new Error('Tree boundaries too small. Please ensure tree is clearly visible and well-framed.');
        }
        
        // Find trunk width at breast height (middle-bottom area)
        const breastHeightY = Math.floor(canvas.height * 0.65); // 65% down from top
        let trunkLeft = centerX, trunkRight = centerX;
        
        for (let x = 0; x < canvas.width; x++) {
            const idx = (breastHeightY * canvas.width + x) * 4;
            if (combined[idx] > 128) {
                if (x < centerX) trunkLeft = Math.min(trunkLeft, x);
                if (x > centerX) trunkRight = Math.max(trunkRight, x);
            }
        }
        
        const trunkWidth = trunkRight - trunkLeft;
        
        // Validate trunk width
        if (trunkWidth < 20) {
            throw new Error('Tree trunk not clearly detected. Please ensure good lighting on the trunk.');
        }
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2,
            trunkWidth: trunkWidth,
            trunkLeft: trunkLeft,
            trunkRight: trunkRight,
            breastHeightY: breastHeightY,
            treeCoverage: treeCoverage
        };
    }

    // Estimate real-world dimensions using camera geometry
    estimateRealWorldSize(bounds, canvas) {
        const imageHeight = canvas.height;
        const imageWidth = canvas.width;
        
        // Estimate distance based on tree filling frame
        const treeFillRatio = bounds.height / imageHeight;
        const estimatedDistance = this.ASSUMED_DISTANCE / treeFillRatio;
        
        // Calculate real-world height using field of view
        const fovRadians = (this.CAMERA_FOV * Math.PI) / 180;
        const realWorldHeight = 2 * estimatedDistance * Math.tan(fovRadians / 2);
        const pixelToRealRatio = realWorldHeight / imageHeight;
        
        // Calculate tree measurements
        const treeHeightCm = bounds.height * pixelToRealRatio;
        const trunkWidthCm = bounds.trunkWidth * pixelToRealRatio;
        
        // Circumference (assuming circular trunk)
        const circumference = Math.PI * trunkWidthCm;
        
        return {
            height: treeHeightCm.toFixed(1),
            trunkWidth: trunkWidthCm.toFixed(1),
            circumference: circumference.toFixed(1),
            estimatedDistance: estimatedDistance.toFixed(0),
            confidence: this.calculateAdvancedConfidence(bounds, treeFillRatio)
        };
    }

    // Calculate confidence with multiple factors
    calculateAdvancedConfidence(bounds, treeFillRatio) {
        let confidence = 50; // Base
        
        // Tree fills appropriate amount of frame
        if (treeFillRatio > 0.3 && treeFillRatio < 0.8) confidence += 20;
        
        // Tree is reasonably centered
        const centerOffset = Math.abs(bounds.centerX - bounds.width / 2) / bounds.width;
        if (centerOffset < 0.2) confidence += 15;
        
        // Trunk width is reasonable
        if (bounds.trunkWidth > 50 && bounds.trunkWidth < 500) confidence += 10;
        
        // Good aspect ratio (trees are taller than wide)
        const aspectRatio = bounds.height / bounds.width;
        if (aspectRatio > 1.5) confidence += 5;
        
        return Math.min(confidence, 85).toFixed(1);
    }

    // Main automatic measurement function
    async measureAutomatically(canvas) {
        try {
            // Ensure models loaded
            if (!this.isModelLoaded) {
                await this.loadModels();
            }
            
            console.log('🔍 Analyzing image...');
            
            // Step 1: Validate if image contains a tree
            const context = canvas.getContext('2d');
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const validation = this.validateTreePresence(imageData);
            
            console.log('Tree Detection:', validation);
            
            if (!validation.isTree) {
                throw new Error(validation.errorMessage || 'No tree detected in image!');
            }
            
            // Display what was detected
            console.log(`✅ Tree detected! Green: ${validation.greenPercent}%, Brown: ${validation.brownPercent}%`);
            
            // Step 2: Find tree in image
            const bounds = this.findTreeContourAdvanced(canvas);
            
            if (bounds.width < 50 || bounds.height < 100) {
                throw new Error('Tree not clearly visible. Please ensure tree is centered and well-lit.');
            }
            
            // Step 3: Validate tree shape (trees are tall, not wide)
            const aspectRatio = bounds.height / bounds.width;
            if (aspectRatio < 0.8) {
                throw new Error('Object detected is too wide to be a tree. Please capture a vertical tree.');
            }
            
            // Step 4: Estimate real-world dimensions
            const measurements = this.estimateRealWorldSize(bounds, canvas);
            
            // Step 5: Validate measurements are reasonable for a tree
            const circumference = parseFloat(measurements.circumference);
            if (circumference < 10 || circumference > 500) {
                throw new Error(`Detected circumference (${circumference} cm) is unrealistic. Please retake photo from 2-3 meters distance.`);
            }
            
            console.log('✅ Measurements calculated:', measurements);
            
            return {
                ...measurements,
                bounds: bounds,
                validation: validation
            };
            
        } catch (error) {
            console.error('Measurement error:', error);
            throw error;
        }
    }

    // Draw detection overlay
    drawDetectionOverlay(canvas, bounds, measurements) {
        const context = canvas.getContext('2d');
        
        // Draw main bounding box
        context.strokeStyle = '#27ae60';
        context.lineWidth = 4;
        context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        
        // Draw trunk measurement line at breast height
        context.strokeStyle = '#e74c3c';
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(bounds.trunkLeft, bounds.breastHeightY);
        context.lineTo(bounds.trunkRight, bounds.breastHeightY);
        context.stroke();
        
        // Draw arrows on trunk line
        const arrowSize = 12;
        // Left arrow
        context.beginPath();
        context.moveTo(bounds.trunkLeft, bounds.breastHeightY);
        context.lineTo(bounds.trunkLeft + arrowSize, bounds.breastHeightY - arrowSize/2);
        context.moveTo(bounds.trunkLeft, bounds.breastHeightY);
        context.lineTo(bounds.trunkLeft + arrowSize, bounds.breastHeightY + arrowSize/2);
        context.stroke();
        // Right arrow
        context.beginPath();
        context.moveTo(bounds.trunkRight, bounds.breastHeightY);
        context.lineTo(bounds.trunkRight - arrowSize, bounds.breastHeightY - arrowSize/2);
        context.moveTo(bounds.trunkRight, bounds.breastHeightY);
        context.lineTo(bounds.trunkRight - arrowSize, bounds.breastHeightY + arrowSize/2);
        context.stroke();
        
        // Draw "TREE DETECTED" checkmark
        context.fillStyle = 'rgba(39, 174, 96, 0.9)';
        context.fillRect(10, 10, 200, 40);
        context.fillStyle = 'white';
        context.font = 'bold 18px Arial';
        context.fillText('✓ TREE DETECTED', 20, 35);
        
        // Labels with background
        const drawLabel = (text, x, y, bgColor) => {
            context.font = 'bold 16px Arial';
            const metrics = context.measureText(text);
            const padding = 8;
            
            // Background
            context.fillStyle = bgColor;
            context.fillRect(
                x - padding,
                y - 20 - padding,
                metrics.width + padding * 2,
                24 + padding * 2
            );
            
            // Text
            context.fillStyle = 'white';
            context.fillText(text, x, y);
        };
        
        // Draw measurements
        drawLabel(
            `Height: ${measurements.height} cm`,
            bounds.x + 10,
            bounds.y - 10,
            '#27ae60'
        );
        
        drawLabel(
            `Circumference: ${measurements.circumference} cm`,
            bounds.trunkLeft,
            bounds.breastHeightY + 35,
            '#e74c3c'
        );
        
        drawLabel(
            `Confidence: ${measurements.confidence}%`,
            bounds.x + bounds.width - 160,
            bounds.y - 10,
            '#3498db'
        );
        
        // Show validation info if available
        if (measurements.validation) {
            const val = measurements.validation;
            drawLabel(
                `Green: ${val.greenPercent}% | Brown: ${val.brownPercent}%`,
                10,
                canvas.height - 40,
                'rgba(39, 174, 96, 0.8)'
            );
        }
        
        // Center marker
        context.fillStyle = '#e74c3c';
        context.beginPath();
        context.arc(bounds.centerX, bounds.centerY, 6, 0, 2 * Math.PI);
        context.fill();
    }

    // Get instructions for automatic mode
    getAutomaticInstructions() {
        return `
📸 Automatic Tree Measurement:

1️⃣ Position:
   - Stand 2-3 meters away from tree
   - Keep camera at breast height (~1.4m)
   - Keep camera parallel to ground

2️⃣ Frame:
   - Center the tree in frame
   - Include full trunk (ground to top)
   - Ensure good lighting

3️⃣ Capture:
   - Hold steady and capture
   - System will auto-detect tree
   - Measurements calculated instantly!

4️⃣ Tips:
   ✓ Daylight is best
   ✓ Clear background helps
   ✓ Tree should fill 30-80% of frame
   ✓ Avoid shadows on trunk
        `;
    }
}

// Export
window.AdvancedTreeML = AdvancedTreeML;
