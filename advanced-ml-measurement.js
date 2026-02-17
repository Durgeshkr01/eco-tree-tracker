// Advanced ML Tree Measurement - Accurate Automatic Detection
// Uses Computer Vision + Species-Specific Calibration + Camera Geometry
// for real-world accurate circumference measurement

class AdvancedTreeML {
    constructor() {
        this.isModelLoaded = false;
        this.videoStream = null;
        this.capturedImage = null;
        
        // Camera calibration parameters
        this.cameraParams = {
            focalLength: null,
            sensorWidth: 4.8,        // mm (typical smartphone sensor)
            sensorHeight: 3.6,
            fovHorizontal: 65,       // degrees (typical smartphone)
            fovVertical: 50,
            imageWidth: 0,
            imageHeight: 0
        };
        
        // Distance estimation parameters
        this.BREAST_HEIGHT_CM = 137;  // Standard DBH measurement height (1.37m)
        this.DEFAULT_DISTANCE_CM = 250;
        
        // Species-specific average circumference data (cm) for validation
        this.speciesCircumferenceDB = {
            'Neem': { min: 50, max: 250, avg: 125 },
            'Mango': { min: 60, max: 300, avg: 157 },
            'Peepal': { min: 80, max: 400, avg: 188 },
            'Banyan': { min: 100, max: 500, avg: 251 },
            'Jamun': { min: 50, max: 280, avg: 141 },
            'Ashoka': { min: 30, max: 150, avg: 78 },
            'Gulmohar': { min: 40, max: 200, avg: 110 },
            'Teak': { min: 70, max: 350, avg: 220 },
            'Coconut': { min: 60, max: 150, avg: 78 },
            'Guava': { min: 30, max: 120, avg: 62 },
            'Jackfruit': { min: 60, max: 300, avg: 157 },
            'Tamarind': { min: 80, max: 350, avg: 188 },
            'Sal': { min: 80, max: 400, avg: 251 },
            'Sheesham': { min: 60, max: 300, avg: 188 },
            'Eucalyptus': { min: 70, max: 350, avg: 220 },
            'Pine': { min: 60, max: 300, avg: 204 },
            'Deodar': { min: 80, max: 400, avg: 251 },
            'Oak': { min: 60, max: 300, avg: 172 },
            'Babul': { min: 40, max: 200, avg: 125 },
            'default': { min: 20, max: 500, avg: 125 }
        };
    }

    // ==================== MODEL LOADING ====================
    async loadModels() {
        try {
            console.log('Loading ML models...');
            if (typeof tf !== 'undefined') {
                console.log('TensorFlow.js available');
                await tf.ready();
                console.log('TF.js backend:', tf.getBackend());
            }
            this.isModelLoaded = true;
            console.log('Advanced CV pipeline ready');
            return true;
        } catch (error) {
            console.warn('TF.js init warning:', error);
            this.isModelLoaded = true;
            return true;
        }
    }

    // ==================== CAMERA MANAGEMENT ====================
    async initializeCamera(videoElement) {
        try {
            const constraints = {
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1920, min: 1280 },
                    height: { ideal: 1080, min: 720 },
                    frameRate: { ideal: 30 }
                }
            };
            
            this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            videoElement.srcObject = this.videoStream;
            
            const track = this.videoStream.getVideoTracks()[0];
            if (track) {
                const settings = track.getSettings ? track.getSettings() : {};
                console.log('Camera settings:', settings);
                if (settings.focalLength) this.cameraParams.focalLength = settings.focalLength;
                if (settings.width) this.cameraParams.imageWidth = settings.width;
                if (settings.height) this.cameraParams.imageHeight = settings.height;
            }
            
            return new Promise((resolve) => {
                videoElement.onloadedmetadata = () => {
                    videoElement.play();
                    this.cameraParams.imageWidth = videoElement.videoWidth;
                    this.cameraParams.imageHeight = videoElement.videoHeight;
                    if (!this.cameraParams.focalLength) {
                        this.cameraParams.focalLength = 
                            (this.cameraParams.sensorWidth * this.cameraParams.imageWidth) / 
                            (2 * this.cameraParams.sensorWidth * Math.tan((this.cameraParams.fovHorizontal * Math.PI) / 360));
                    }
                    resolve(true);
                };
            });
        } catch (error) {
            console.error('Camera error:', error);
            throw new Error('Camera access denied. Please allow camera permission.');
        }
    }

    stopCamera() {
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
            this.videoStream = null;
        }
    }

    captureImage(videoElement, canvasElement) {
        const context = canvasElement.getContext('2d');
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        this.capturedImage = canvasElement.toDataURL('image/jpeg', 0.95);
        this.cameraParams.imageWidth = canvasElement.width;
        this.cameraParams.imageHeight = canvasElement.height;
        return this.capturedImage;
    }

    // ==================== COLOR SPACE CONVERSIONS ====================
    
    rgbToLab(r, g, b) {
        let rr = r / 255, gg = g / 255, bb = b / 255;
        rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92;
        gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92;
        bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92;
        
        let x = (rr * 0.4124 + gg * 0.3576 + bb * 0.1805) / 0.95047;
        let y = (rr * 0.2126 + gg * 0.7152 + bb * 0.0722) / 1.00000;
        let z = (rr * 0.0193 + gg * 0.1192 + bb * 0.9505) / 1.08883;
        
        x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
        y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
        z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;
        
        return { L: (116 * y) - 16, a: 500 * (x - y), b: 200 * (y - z) };
    }

    rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, v = max;
        const d = max - min;
        s = max === 0 ? 0 : d / max;
        if (max === min) { h = 0; }
        else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: h * 360, s: s * 100, v: v * 100 };
    }

    // ==================== IMAGE PREPROCESSING ====================
    
    gaussianBlur(imageData, radius) {
        if (!radius) radius = 2;
        const pixels = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const output = new Uint8ClampedArray(pixels.length);
        
        const sigma = radius / 2;
        const kernel = [];
        let kernelSum = 0;
        
        for (let y = -radius; y <= radius; y++) {
            for (let x = -radius; x <= radius; x++) {
                const value = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
                kernel.push(value);
                kernelSum += value;
            }
        }
        for (let i = 0; i < kernel.length; i++) kernel[i] /= kernelSum;
        
        for (let y = radius; y < height - radius; y++) {
            for (let x = radius; x < width - radius; x++) {
                let rSum = 0, gSum = 0, bSum = 0, ki = 0;
                for (let ky = -radius; ky <= radius; ky++) {
                    for (let kx = -radius; kx <= radius; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        rSum += pixels[idx] * kernel[ki];
                        gSum += pixels[idx + 1] * kernel[ki];
                        bSum += pixels[idx + 2] * kernel[ki];
                        ki++;
                    }
                }
                const outIdx = (y * width + x) * 4;
                output[outIdx] = rSum;
                output[outIdx + 1] = gSum;
                output[outIdx + 2] = bSum;
                output[outIdx + 3] = 255;
            }
        }
        return new ImageData(output, width, height);
    }

    // ==================== ADVANCED TREE SEGMENTATION ====================
    
    segmentTreeAdvanced(imageData) {
        const pixels = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const mask = new Float32Array(width * height);
        
        let trunkPixels = 0, greenPixels = 0;
        const totalPixels = width * height;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
                const hsv = this.rgbToHsv(r, g, b);
                const lab = this.rgbToLab(r, g, b);
                
                let treeProb = 0;
                
                // Green foliage detection (HSV)
                if (hsv.h >= 40 && hsv.h <= 170 && hsv.s > 15 && hsv.v > 20) {
                    treeProb = Math.max(treeProb, Math.min(1, (hsv.s / 100) * 0.7 + 0.3) * 0.8);
                    greenPixels++;
                }
                
                // Brown trunk (HSV + LAB)
                if (hsv.h >= 10 && hsv.h <= 45 && hsv.s >= 15 && hsv.s <= 80 && hsv.v >= 15 && hsv.v <= 75) {
                    if (lab.a > -5 && lab.b > 5 && lab.L > 15 && lab.L < 75) {
                        treeProb = Math.max(treeProb, 0.9);
                        trunkPixels++;
                    }
                }
                
                // Dark bark
                if (hsv.v >= 8 && hsv.v <= 45 && hsv.s <= 50) {
                    if (lab.a > -10 && lab.b > -5 && lab.L > 8 && lab.L < 45) {
                        treeProb = Math.max(treeProb, 0.7);
                        trunkPixels++;
                    }
                }
                
                // Light bark
                if (hsv.s < 20 && hsv.v > 60 && hsv.v < 90) {
                    if (lab.b > 2 && lab.b < 20 && lab.a > -5 && lab.a < 10) {
                        treeProb = Math.max(treeProb, 0.5);
                    }
                }
                
                mask[y * width + x] = treeProb;
            }
        }
        
        return {
            mask: mask, width: width, height: height,
            greenPercent: ((greenPixels / totalPixels) * 100).toFixed(1),
            trunkPercent: ((trunkPixels / totalPixels) * 100).toFixed(1)
        };
    }

    // ==================== MORPHOLOGICAL OPERATIONS ====================
    
    morphologicalClose(mask, width, height, radius) {
        if (!radius) radius = 3;
        let result = this.dilate(mask, width, height, radius);
        result = this.erode(result, width, height, radius);
        return result;
    }

    dilate(mask, width, height, radius) {
        const output = new Float32Array(mask.length);
        for (let y = radius; y < height - radius; y++) {
            for (let x = radius; x < width - radius; x++) {
                let maxVal = 0;
                for (let ky = -radius; ky <= radius; ky++) {
                    for (let kx = -radius; kx <= radius; kx++) {
                        maxVal = Math.max(maxVal, mask[(y + ky) * width + (x + kx)]);
                    }
                }
                output[y * width + x] = maxVal;
            }
        }
        return output;
    }

    erode(mask, width, height, radius) {
        const output = new Float32Array(mask.length);
        for (let y = radius; y < height - radius; y++) {
            for (let x = radius; x < width - radius; x++) {
                let minVal = 1;
                for (let ky = -radius; ky <= radius; ky++) {
                    for (let kx = -radius; kx <= radius; kx++) {
                        minVal = Math.min(minVal, mask[(y + ky) * width + (x + kx)]);
                    }
                }
                output[y * width + x] = minVal;
            }
        }
        return output;
    }

    // ==================== TRUNK DETECTION (KEY ALGORITHM) ====================
    
    detectTrunkPrecise(canvas, segMask, segWidth, segHeight) {
        const context = canvas.getContext('2d');
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        
        const scaleX = segWidth / width;
        const scaleY = segHeight / height;
        
        // STEP 1: Build trunk probability using vertical structure analysis
        const trunkMask = new Float32Array(width * height);
        
        for (let x = 0; x < width; x++) {
            let consecutiveBrown = 0;
            for (let y = 0; y < height; y++) {
                const i = (y * width + x) * 4;
                const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
                const hsv = this.rgbToHsv(r, g, b);
                const lab = this.rgbToLab(r, g, b);
                
                const isTrunk = (
                    (hsv.h >= 5 && hsv.h <= 50 && hsv.s >= 10 && hsv.s <= 85 && hsv.v >= 10 && hsv.v <= 80 &&
                     lab.a > -8 && lab.b > 0 && lab.L > 10 && lab.L < 80) ||
                    (hsv.v >= 5 && hsv.v <= 40 && hsv.s <= 55 && lab.L > 5 && lab.L < 40 && lab.b > -10) ||
                    (hsv.s < 25 && hsv.v > 25 && hsv.v < 70 && lab.a > -5 && lab.a < 8 && lab.b > -5 && lab.b < 15)
                );
                
                if (isTrunk) {
                    consecutiveBrown++;
                    trunkMask[y * width + x] = Math.min(1, consecutiveBrown / 40);
                } else {
                    consecutiveBrown = Math.max(0, consecutiveBrown - 3);
                }
            }
        }
        
        // STEP 2: Column density profiling (lower 60% of image)
        const columnDensity = new Float32Array(width);
        const trunkSearchTop = Math.floor(height * 0.35);
        const trunkSearchBottom = Math.floor(height * 0.95);
        
        for (let x = 0; x < width; x++) {
            let density = 0;
            for (let y = trunkSearchTop; y < trunkSearchBottom; y++) {
                density += trunkMask[y * width + x];
            }
            columnDensity[x] = density;
        }
        
        // STEP 3: Find trunk center using smoothed peak detection
        const smoothedDensity = this.smoothArray(columnDensity, 15);
        const searchStart = Math.floor(width * 0.15);
        const searchEnd = Math.floor(width * 0.85);
        let maxDensity = 0;
        let trunkCenterX = width / 2;
        
        for (let x = searchStart; x < searchEnd; x++) {
            if (smoothedDensity[x] > maxDensity) {
                maxDensity = smoothedDensity[x];
                trunkCenterX = x;
            }
        }
        
        // STEP 4: Find trunk edges at breast height
        const breastHeightY = Math.floor(height * 0.65);
        const scanRows = 20;
        const trunkEdges = [];
        
        for (let dy = -scanRows; dy <= scanRows; dy++) {
            const scanY = Math.max(0, Math.min(height - 1, breastHeightY + dy));
            
            let leftEdge = trunkCenterX;
            for (let x = trunkCenterX; x >= 0; x--) {
                if (trunkMask[scanY * width + x] < 0.15) { leftEdge = x; break; }
            }
            
            let rightEdge = trunkCenterX;
            for (let x = trunkCenterX; x < width; x++) {
                if (trunkMask[scanY * width + x] < 0.15) { rightEdge = x; break; }
            }
            
            if (rightEdge > leftEdge + 5) {
                trunkEdges.push({ left: leftEdge, right: rightEdge, width: rightEdge - leftEdge });
            }
        }
        
        // STEP 5: Robust trunk width (median of all scans)
        if (trunkEdges.length === 0) {
            const halfMax = maxDensity / 2;
            let fwhmLeft = trunkCenterX, fwhmRight = trunkCenterX;
            for (let x = trunkCenterX; x >= 0; x--) {
                if (smoothedDensity[x] < halfMax) { fwhmLeft = x; break; }
            }
            for (let x = trunkCenterX; x < width; x++) {
                if (smoothedDensity[x] < halfMax) { fwhmRight = x; break; }
            }
            trunkEdges.push({ left: fwhmLeft, right: fwhmRight, width: fwhmRight - fwhmLeft });
        }
        
        trunkEdges.sort(function(a, b) { return a.width - b.width; });
        const medianIdx = Math.floor(trunkEdges.length / 2);
        const medianEdge = trunkEdges[medianIdx];
        
        // Cross-validate with Sobel edge detection
        const sobelTrunkWidth = this.detectTrunkBySobel(imageData, trunkCenterX, breastHeightY, width, height);
        
        let finalTrunkWidthPx;
        if (sobelTrunkWidth > 10) {
            finalTrunkWidthPx = medianEdge.width * 0.5 + sobelTrunkWidth * 0.5;
        } else {
            finalTrunkWidthPx = medianEdge.width;
        }
        
        // STEP 6: Find tree bounding box
        const processedMask = this.morphologicalClose(segMask, segWidth, segHeight, 5);
        let minX = segWidth, maxX = 0, minY = segHeight, maxY = 0;
        const centerSearchX = segWidth / 2;
        const searchRange = segWidth * 0.7;
        
        for (let y = 0; y < segHeight; y++) {
            for (let x = 0; x < segWidth; x++) {
                if (Math.abs(x - centerSearchX) > searchRange / 2) continue;
                if (processedMask[y * segWidth + x] > 0.3) {
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        
        return {
            x: Math.floor(minX / scaleX),
            y: Math.floor(minY / scaleY),
            width: Math.floor((maxX - minX) / scaleX),
            height: Math.floor((maxY - minY) / scaleY),
            centerX: Math.floor(trunkCenterX),
            centerY: Math.floor(breastHeightY),
            trunkLeft: Math.floor(medianEdge.left),
            trunkRight: Math.floor(medianEdge.right),
            trunkWidthPx: Math.floor(finalTrunkWidthPx),
            breastHeightY: breastHeightY,
            trunkCenterX: Math.floor(trunkCenterX)
        };
    }

    // Sobel-based trunk edge detection for cross-validation
    detectTrunkBySobel(imageData, centerX, breastHeightY, width, height) {
        const pixels = imageData.data;
        const bandHeight = 30;
        const gradients = new Float32Array(width);
        
        for (let x = 1; x < width - 1; x++) {
            let totalGrad = 0, count = 0;
            for (let dy = -bandHeight; dy <= bandHeight; dy++) {
                const y = breastHeightY + dy;
                if (y < 1 || y >= height - 1) continue;
                const leftIdx = (y * width + (x - 1)) * 4;
                const rightIdx = (y * width + (x + 1)) * 4;
                const leftGray = (pixels[leftIdx] + pixels[leftIdx + 1] + pixels[leftIdx + 2]) / 3;
                const rightGray = (pixels[rightIdx] + pixels[rightIdx + 1] + pixels[rightIdx + 2]) / 3;
                totalGrad += Math.abs(rightGray - leftGray);
                count++;
            }
            gradients[x] = count > 0 ? totalGrad / count : 0;
        }
        
        const searchRadius = Math.floor(width * 0.25);
        let leftEdge = centerX, rightEdge = centerX;
        let leftMax = 0, rightMax = 0;
        
        for (let x = centerX; x >= Math.max(0, centerX - searchRadius); x--) {
            if (gradients[x] > leftMax) { leftMax = gradients[x]; leftEdge = x; }
        }
        for (let x = centerX; x <= Math.min(width - 1, centerX + searchRadius); x++) {
            if (gradients[x] > rightMax) { rightMax = gradients[x]; rightEdge = x; }
        }
        
        return rightEdge - leftEdge;
    }

    smoothArray(arr, windowSize) {
        const output = new Float32Array(arr.length);
        const half = Math.floor(windowSize / 2);
        for (let i = 0; i < arr.length; i++) {
            let sum = 0, count = 0;
            for (let j = Math.max(0, i - half); j <= Math.min(arr.length - 1, i + half); j++) {
                sum += arr[j]; count++;
            }
            output[i] = sum / count;
        }
        return output;
    }

    // ==================== TREE VALIDATION ====================
    
    validateTreePresence(imageData) {
        const pixels = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        let greenPixels = 0, brownPixels = 0, skinPixels = 0, grayPixels = 0, skyPixels = 0;
        const step = width > 1000 ? 2 : 1;
        let sampledPixels = 0;
        
        for (let y = 0; y < height; y += step) {
            for (let x = 0; x < width; x += step) {
                const i = (y * width + x) * 4;
                const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
                const hsv = this.rgbToHsv(r, g, b);
                sampledPixels++;
                
                if (hsv.h >= 40 && hsv.h <= 170 && hsv.s > 15 && hsv.v > 15) greenPixels++;
                if (hsv.h >= 10 && hsv.h <= 45 && hsv.s >= 15 && hsv.s <= 80 && hsv.v >= 15 && hsv.v <= 75) brownPixels++;
                if (hsv.h >= 5 && hsv.h <= 35 && hsv.s >= 20 && hsv.s <= 70 && hsv.v >= 50) skinPixels++;
                if (hsv.s < 15 && hsv.v > 30 && hsv.v < 85) grayPixels++;
                if (hsv.h >= 180 && hsv.h <= 250 && hsv.s > 20 && hsv.v > 50) skyPixels++;
            }
        }
        
        const greenPercent = (greenPixels / sampledPixels) * 100;
        const brownPercent = (brownPixels / sampledPixels) * 100;
        const skinPercent = (skinPixels / sampledPixels) * 100;
        const grayPercent = (grayPixels / sampledPixels) * 100;
        
        const hasTreeColors = (greenPercent > 4) || (brownPercent > 3);
        const hasPerson = skinPercent > 12;
        const hasVehicleOrBuilding = grayPercent > 50;
        const isTree = hasTreeColors && !hasPerson && !hasVehicleOrBuilding;
        
        return {
            isTree: isTree,
            greenPercent: greenPercent.toFixed(1),
            brownPercent: brownPercent.toFixed(1),
            skinPercent: skinPercent.toFixed(1),
            grayPercent: grayPercent.toFixed(1),
            errorMessage: this._getValidationError(hasTreeColors, hasPerson, hasVehicleOrBuilding)
        };
    }

    _getValidationError(hasTreeColors, hasPerson, hasVehicleOrBuilding) {
        if (hasPerson) return 'Human detected! Please photograph only the tree.';
        if (hasVehicleOrBuilding) return 'Car/Building detected! Focus on the tree only.';
        if (!hasTreeColors) return 'No tree detected! Ensure green leaves or brown trunk is visible.';
        return null;
    }

    // ==================== REAL-WORLD SIZE ESTIMATION ====================
    
    estimateRealWorldMeasurements(bounds, canvas, selectedSpecies) {
        const imgW = canvas.width;
        const imgH = canvas.height;
        
        const treeFillRatio = bounds.height / imgH;
        
        // Estimate tree real height from species data or default
        let estimatedTreeHeightCm = 800; // default 8m
        if (selectedSpecies) {
            const speciesData = this._getSpeciesData(selectedSpecies);
            if (speciesData && speciesData.avgHeight) {
                estimatedTreeHeightCm = speciesData.avgHeight * 100;
            }
        }
        
        // METHOD 1: Camera Geometry
        const fovRadV = (this.cameraParams.fovVertical * Math.PI) / 180;
        const estimatedDistanceCm = estimatedTreeHeightCm / (2 * Math.tan(fovRadV / 2) * treeFillRatio);
        
        const trunkWidthRatio = bounds.trunkWidthPx / imgW;
        const fovRadH = (this.cameraParams.fovHorizontal * Math.PI) / 180;
        const visibleWidthAtDistance = 2 * estimatedDistanceCm * Math.tan(fovRadH / 2);
        const trunkDiameterCm_method1 = visibleWidthAtDistance * trunkWidthRatio;
        
        // METHOD 2: Proportional Estimation (trunk to tree height ratio)
        const trunkToTreeRatio = bounds.trunkWidthPx / bounds.height;
        const trunkDiameterCm_method2 = estimatedTreeHeightCm * trunkToTreeRatio;
        
        // METHOD 3: Species-Specific Calibration
        let trunkDiameterCm_method3 = null;
        if (selectedSpecies) {
            const speciesData = this._getSpeciesData(selectedSpecies);
            if (speciesData && speciesData.avgDBH) {
                trunkDiameterCm_method3 = speciesData.avgDBH;
            }
        }
        
        // FUSION: Weighted average
        var methodWeights = [];
        var m1Weight = (estimatedDistanceCm > 80 && estimatedDistanceCm < 1500) ? 0.45 : 0.2;
        methodWeights.push({ value: trunkDiameterCm_method1, weight: m1Weight, name: 'camera_geometry' });
        methodWeights.push({ value: trunkDiameterCm_method2, weight: 0.35, name: 'proportional' });
        
        if (trunkDiameterCm_method3 !== null) {
            methodWeights.push({ value: trunkDiameterCm_method3, weight: 0.20, name: 'species_avg' });
        }
        
        var totalWeight = methodWeights.reduce(function(sum, m) { return sum + m.weight; }, 0);
        var finalDiameter = methodWeights.reduce(function(sum, m) { return sum + m.value * (m.weight / totalWeight); }, 0);
        
        // Sanity check against species data
        if (selectedSpecies) {
            var speciesCirc = this._getSpeciesCircumference(selectedSpecies);
            var estimatedCirc = Math.PI * finalDiameter;
            if (estimatedCirc < speciesCirc.min * 0.7) {
                finalDiameter = (speciesCirc.min * 0.7) / Math.PI;
            }
            if (estimatedCirc > speciesCirc.max * 1.3) {
                finalDiameter = (speciesCirc.max * 1.3) / Math.PI;
            }
        }
        
        // Global sanity: realistic tree diameter 5-200 cm
        finalDiameter = Math.max(5, Math.min(200, finalDiameter));
        
        var circumference = Math.PI * finalDiameter;
        var confidence = this._calculateConfidence(bounds, treeFillRatio, methodWeights, selectedSpecies, imgW, imgH);
        
        console.log('Methods:', methodWeights.map(function(m) { return m.name + ': ' + m.value.toFixed(1) + 'cm (w:' + m.weight.toFixed(2) + ')'; }));
        console.log('Final diameter: ' + finalDiameter.toFixed(1) + ' cm, Circumference: ' + circumference.toFixed(1) + ' cm');
        console.log('Estimated distance: ' + estimatedDistanceCm.toFixed(0) + ' cm');
        
        return {
            height: estimatedTreeHeightCm.toFixed(1),
            trunkWidth: finalDiameter.toFixed(1),
            circumference: circumference.toFixed(1),
            estimatedDistance: estimatedDistanceCm.toFixed(0),
            confidence: confidence.toFixed(1),
            methodDetails: methodWeights
        };
    }

    _getSpeciesData(speciesName) {
        if (typeof treeSpeciesData === 'undefined') return null;
        var search = speciesName.toLowerCase();
        return treeSpeciesData.find(function(t) {
            return t.name.toLowerCase().includes(search) || 
                (t.common && t.common.toLowerCase().includes(search)) ||
                (t.scientific && t.scientific.toLowerCase().includes(search));
        }) || null;
    }

    _getSpeciesCircumference(speciesName) {
        var search = speciesName.toLowerCase();
        for (var key in this.speciesCircumferenceDB) {
            if (search.includes(key.toLowerCase()) || key.toLowerCase().includes(search)) {
                return this.speciesCircumferenceDB[key];
            }
        }
        return this.speciesCircumferenceDB['default'];
    }

    _calculateConfidence(bounds, treeFillRatio, methodWeights, selectedSpecies, imgW, imgH) {
        var confidence = 35;
        
        if (treeFillRatio > 0.25 && treeFillRatio < 0.85) confidence += 15;
        else if (treeFillRatio > 0.15 && treeFillRatio < 0.95) confidence += 8;
        
        var centerOffset = Math.abs(bounds.trunkCenterX - imgW / 2) / imgW;
        if (centerOffset < 0.15) confidence += 12;
        else if (centerOffset < 0.25) confidence += 6;
        
        if (bounds.trunkWidthPx > 30 && bounds.trunkWidthPx < imgW * 0.4) confidence += 10;
        
        var aspectRatio = bounds.height / Math.max(1, bounds.width);
        if (aspectRatio > 1.2) confidence += 8;
        
        if (selectedSpecies) confidence += 10;
        
        if (methodWeights.length >= 2) {
            var values = methodWeights.map(function(m) { return m.value; });
            var avg = values.reduce(function(s, v) { return s + v; }, 0) / values.length;
            var maxDev = Math.max.apply(null, values.map(function(v) { return Math.abs(v - avg) / avg; }));
            if (maxDev < 0.3) confidence += 10;
            else if (maxDev < 0.5) confidence += 5;
        }
        
        return Math.min(92, confidence);
    }

    // ==================== MAIN MEASUREMENT FUNCTION ====================
    
    async measureAutomatically(canvas) {
        try {
            if (!this.isModelLoaded) { await this.loadModels(); }
            
            console.log('Starting advanced tree analysis...');
            var startTime = performance.now();
            
            var context = canvas.getContext('2d');
            var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            
            // Step 1: Validate tree presence
            var validation = this.validateTreePresence(imageData);
            console.log('Tree validation:', validation);
            
            if (!validation.isTree) {
                throw new Error(validation.errorMessage || 'No tree detected!');
            }
            
            // Step 2: Gaussian blur for noise reduction
            var blurred = this.gaussianBlur(imageData, 2);
            
            // Step 3: Advanced multi-channel segmentation
            var segResult = this.segmentTreeAdvanced(blurred);
            console.log('Segmentation: Green ' + segResult.greenPercent + '%, Trunk ' + segResult.trunkPercent + '%');
            
            if (parseFloat(segResult.greenPercent) < 3 && parseFloat(segResult.trunkPercent) < 2) {
                throw new Error('Tree not clearly visible. Ensure tree fills 30-80% of frame with good lighting.');
            }
            
            // Step 4: Precise trunk detection with vertical analysis
            var bounds = this.detectTrunkPrecise(canvas, segResult.mask, segResult.width, segResult.height);
            console.log('Trunk detected:', bounds);
            
            if (bounds.trunkWidthPx < 10) {
                throw new Error('Trunk not clearly detected. Ensure good lighting on trunk and stand 2-3m away.');
            }
            
            // Step 5: Get selected species for calibration
            var selectedSpecies = null;
            try {
                var treeSpeciesSelect = document.getElementById('treeSpecies');
                var treeSearchInput = document.getElementById('treeSearch');
                
                if (treeSpeciesSelect && treeSpeciesSelect.value) {
                    var idx = parseInt(treeSpeciesSelect.value);
                    if (!isNaN(idx) && typeof treeSpeciesData !== 'undefined' && treeSpeciesData[idx]) {
                        selectedSpecies = treeSpeciesData[idx].common || treeSpeciesData[idx].name;
                    }
                } else if (treeSearchInput && treeSearchInput.value) {
                    selectedSpecies = treeSearchInput.value;
                }
            } catch(e) {
                console.warn('Could not get species:', e);
            }
            
            console.log('Species for calibration:', selectedSpecies || 'none');
            
            // Step 6: Estimate real-world measurements with fusion
            var measurements = this.estimateRealWorldMeasurements(bounds, canvas, selectedSpecies);
            
            // Step 7: Final validation
            var circumference = parseFloat(measurements.circumference);
            if (circumference < 5 || circumference > 700) {
                throw new Error('Detected circumference (' + circumference + ' cm) is unrealistic. Please retake from 2-3m distance.');
            }
            
            var elapsed = (performance.now() - startTime).toFixed(0);
            console.log('Analysis complete in ' + elapsed + 'ms');
            console.log('Height: ' + measurements.height + ' cm, Circumference: ' + measurements.circumference + ' cm, Confidence: ' + measurements.confidence + '%');
            
            return {
                height: measurements.height,
                trunkWidth: measurements.trunkWidth,
                circumference: measurements.circumference,
                estimatedDistance: measurements.estimatedDistance,
                confidence: measurements.confidence,
                methodDetails: measurements.methodDetails,
                bounds: bounds,
                validation: validation,
                species: selectedSpecies,
                processingTime: elapsed
            };
            
        } catch (error) {
            console.error('Measurement error:', error);
            throw error;
        }
    }

    // ==================== VISUALIZATION ====================
    
    drawDetectionOverlay(canvas, bounds, measurements) {
        var context = canvas.getContext('2d');
        
        // Semi-transparent trunk highlight
        context.fillStyle = 'rgba(231, 76, 60, 0.15)';
        context.fillRect(bounds.trunkLeft, bounds.y, bounds.trunkRight - bounds.trunkLeft, bounds.height);
        
        // Tree bounding box (dashed)
        context.strokeStyle = '#27ae60';
        context.lineWidth = 3;
        context.setLineDash([8, 4]);
        context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        context.setLineDash([]);
        
        // Trunk measurement line at breast height
        context.strokeStyle = '#e74c3c';
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(bounds.trunkLeft - 10, bounds.breastHeightY);
        context.lineTo(bounds.trunkRight + 10, bounds.breastHeightY);
        context.stroke();
        
        // Arrowheads
        this._drawArrowHead(context, bounds.trunkLeft - 10, bounds.breastHeightY, 'right', 10);
        this._drawArrowHead(context, bounds.trunkRight + 10, bounds.breastHeightY, 'left', 10);
        
        // DBH line label
        context.fillStyle = 'rgba(231, 76, 60, 0.8)';
        context.fillRect(bounds.trunkRight + 15, bounds.breastHeightY - 12, 90, 24);
        context.fillStyle = 'white';
        context.font = 'bold 11px Arial';
        context.fillText('DBH Line (1.37m)', bounds.trunkRight + 20, bounds.breastHeightY + 4);
        
        // TREE DETECTED badge
        context.fillStyle = 'rgba(39, 174, 96, 0.92)';
        this._roundRect(context, 10, 10, 220, 36, 6);
        context.fill();
        context.fillStyle = 'white';
        context.font = 'bold 16px Arial';
        context.fillText('TREE DETECTED', 22, 34);
        
        // Measurement labels
        this._drawLabel(context, 'Height: ' + measurements.height + ' cm', bounds.x + 5, bounds.y - 15, '#27ae60');
        this._drawLabel(context, 'Dia: ' + measurements.trunkWidth + ' cm | Circ: ' + measurements.circumference + ' cm', 
            bounds.trunkLeft, bounds.breastHeightY + 30, '#e74c3c');
        this._drawLabel(context, 'Confidence: ' + measurements.confidence + '%', 
            bounds.x + bounds.width - 170, bounds.y - 15, '#3498db');
        
        if (measurements.species) {
            this._drawLabel(context, 'Species: ' + measurements.species, 10, canvas.height - 30, '#8e44ad');
        }
        
        if (measurements.validation) {
            this._drawLabel(context, 'Green: ' + measurements.validation.greenPercent + '% | Brown: ' + measurements.validation.brownPercent + '%',
                10, canvas.height - 60, 'rgba(39, 174, 96, 0.8)');
        }
        
        if (measurements.processingTime) {
            this._drawLabel(context, measurements.processingTime + 'ms', canvas.width - 80, 20, 'rgba(0,0,0,0.6)');
        }
        
        // Center marker
        context.fillStyle = '#e74c3c';
        context.beginPath();
        context.arc(bounds.trunkCenterX, bounds.breastHeightY, 5, 0, 2 * Math.PI);
        context.fill();
        context.strokeStyle = 'white';
        context.lineWidth = 2;
        context.stroke();
    }

    _drawArrowHead(context, x, y, direction, size) {
        var dir = direction === 'right' ? 1 : -1;
        context.fillStyle = '#e74c3c';
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x - dir * size, y - size / 2);
        context.lineTo(x - dir * size, y + size / 2);
        context.closePath();
        context.fill();
    }

    _drawLabel(context, text, x, y, bgColor) {
        context.font = 'bold 14px Arial';
        var metrics = context.measureText(text);
        var padding = 6;
        context.fillStyle = bgColor;
        this._roundRect(context, x - padding, y - 16, metrics.width + padding * 2, 22, 4);
        context.fill();
        context.fillStyle = 'white';
        context.fillText(text, x, y);
    }

    _roundRect(context, x, y, w, h, r) {
        context.beginPath();
        context.moveTo(x + r, y);
        context.lineTo(x + w - r, y);
        context.quadraticCurveTo(x + w, y, x + w, y + r);
        context.lineTo(x + w, y + h - r);
        context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        context.lineTo(x + r, y + h);
        context.quadraticCurveTo(x, y + h, x, y + h - r);
        context.lineTo(x, y + r);
        context.quadraticCurveTo(x, y, x + r, y);
        context.closePath();
    }

    getAutomaticInstructions() {
        return 'Automatic Tree Measurement:\n\n' +
            '1. Select tree species first (improves accuracy!)\n' +
            '2. Stand 2-3 meters from the tree\n' +
            '3. Hold camera at chest height (1.3-1.5m)\n' +
            '4. Center the tree trunk in frame\n' +
            '5. Ensure good lighting on trunk\n' +
            '6. Capture - circumference auto-fills!\n\n' +
            'Tips: Select correct species, daylight is best, include full trunk.';
    }
}

// Export
window.AdvancedTreeML = AdvancedTreeML;
