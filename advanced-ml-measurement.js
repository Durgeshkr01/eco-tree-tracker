// Advanced ML Tree Measurement - Accurate Automatic Detection
// Uses Computer Vision + Species-Specific Calibration + Camera Geometry
// for real-world accurate circumference measurement

class AdvancedTreeML {
    constructor() {
        this.isModelLoaded = false;
        this.cocoModel = null;       // COCO-SSD AI object detection model
        this.deeplabModel = null;    // DeepLab v3 semantic segmentation (tree pixel detection)
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
            
            // Load COCO-SSD for REAL object detection
            if (!this.cocoModel && typeof cocoSsd !== 'undefined') {
                console.log('Loading COCO-SSD object detection model...');
                this.cocoModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
                console.log('COCO-SSD model loaded — can detect 80+ object types');
            }
            
            // Load DeepLab v3 ADE20K — pixel-level semantic segmentation
            // ADE20K class 5 = "tree", 9 = "grass", 17 = "plant"
            // This lets us detect tree pixels even when person/bike is in frame
            if (!this.deeplabModel && typeof deeplab !== 'undefined') {
                console.log('Loading DeepLab ADE20K segmentation model...');
                try {
                    this.deeplabModel = await deeplab.load({
                        base: 'ade20k',
                        quantizationBytes: 2   // Compressed weights — faster download
                    });
                    console.log('✅ DeepLab ADE20K loaded — tree pixel segmentation ACTIVE');
                } catch (dlErr) {
                    console.warn('DeepLab load failed, will use color-based fallback:', dlErr.message);
                }
            }
            
            this.isModelLoaded = true;
            console.log('Advanced CV + AI + DeepLab detection pipeline ready');
            return true;
        } catch (error) {
            console.warn('Model init warning:', error);
            this.isModelLoaded = true;
            return true;
        }
    }

    // ==================== AI OBJECT DETECTION (COCO-SSD) ====================
    
    async detectObjectsAI(canvas) {
        if (!this.cocoModel) {
            console.warn('COCO-SSD not loaded, skipping AI detection');
            return { isTree: true, objects: [] };
        }
        
        try {
            const predictions = await this.cocoModel.detect(canvas, 10, 0.25);
            console.log('COCO-SSD detections:', predictions.map(function(p) {
                return p.class + ' (' + (p.score * 100).toFixed(0) + '%)';
            }));
            
            // Objects that are DEFINITELY NOT trees
            const nonTreeObjects = [
                'person', 'laptop', 'cell phone', 'keyboard', 'mouse', 'remote',
                'tv', 'monitor', 'chair', 'couch', 'bed', 'dining table', 'toilet',
                'car', 'truck', 'bus', 'motorcycle', 'bicycle', 'airplane', 'train', 'boat',
                'book', 'bottle', 'cup', 'wine glass', 'fork', 'knife', 'spoon', 'bowl',
                'backpack', 'handbag', 'suitcase', 'tie', 'umbrella',
                'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
                'scissors', 'teddy bear', 'hair drier', 'toothbrush',
                'clock', 'vase', 'skateboard', 'surfboard', 'tennis racket',
                'frisbee', 'sports ball', 'baseball bat', 'baseball glove', 'kite',
                'pizza', 'donut', 'cake', 'sandwich', 'hot dog', 'banana', 'apple', 'orange',
                'broccoli', 'carrot',
                'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe',
                'bird', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'traffic light'
            ];
            
            // Check each detection
            var detectedNonTree = [];
            var hasPlant = false;
            
            for (var i = 0; i < predictions.length; i++) {
                var pred = predictions[i];
                if (pred.class === 'potted plant') {
                    hasPlant = true;
                }
                if (nonTreeObjects.indexOf(pred.class) !== -1 && pred.score > 0.30) {
                    detectedNonTree.push({
                        object: pred.class,
                        confidence: (pred.score * 100).toFixed(0)
                    });
                }
            }
            
            if (detectedNonTree.length > 0) {
                // Sort by confidence, highest first
                detectedNonTree.sort(function(a, b) { return b.confidence - a.confidence; });
                var topDetection = detectedNonTree[0];
                var allDetected = detectedNonTree.map(function(d) { return d.object; }).join(', ');
                
                // Only block if NO tree/plant signal at all
                // If person/bike is in frame BUT tree might also be there — let DeepLab decide
                var hasAnyPlantSignal = hasPlant || predictions.some(function(p) {
                    return ['potted plant', 'vase'].indexOf(p.class) !== -1;
                });
                
                // Hard-block on indoor objects — these confirm we're NOT outside near a tree
                var hardBlockObjects = [
                    'laptop', 'cell phone', 'keyboard', 'mouse', 'remote',
                    'tv', 'monitor', 'microwave', 'oven', 'refrigerator',
                    'book', 'toothbrush', 'hair drier',
                    'chair', 'couch', 'bed', 'dining table', 'toilet', 'sink',
                    'teddy bear', 'clock', 'scissors',
                    'cup', 'wine glass', 'fork', 'knife', 'spoon', 'bowl',
                    'pizza', 'donut', 'cake', 'sandwich', 'hot dog'
                ];
                var isHardBlock = detectedNonTree.some(function(d) {
                    return hardBlockObjects.indexOf(d.object) !== -1 && d.confidence > 40;
                });
                
                // Indoor scene detection: 2+ indoor objects = definitely NOT outdoor tree
                var indoorObjects = ['chair', 'couch', 'bed', 'dining table', 'toilet', 'sink',
                    'laptop', 'cell phone', 'keyboard', 'mouse', 'remote', 'tv', 'monitor',
                    'microwave', 'oven', 'refrigerator', 'toaster', 'cup', 'bowl',
                    'book', 'clock', 'vase', 'teddy bear'];
                var indoorCount = detectedNonTree.filter(function(d) {
                    return indoorObjects.indexOf(d.object) !== -1 && d.confidence > 30;
                }).length;
                var isIndoorScene = indoorCount >= 2;
                
                if (isHardBlock || isIndoorScene) {
                    var reason = isIndoorScene 
                        ? 'Indoor scene detected (' + indoorCount + ' indoor objects: ' + allDetected + '). This is NOT a tree!'
                        : 'AI detected: "' + topDetection.object + '" (' + topDetection.confidence + '% confidence). This is NOT a tree!';
                    return {
                        isTree: false,
                        objects: detectedNonTree,
                        isIndoor: true,
                        errorMessage: reason + '\n\n📸 Please take a photo of a REAL TREE outdoors.'
                    };
                }
                
                // Person/vehicle/bench in frame — warn but let DeepLab try to find the tree
                return {
                    isTree: true,   // Allow DeepLab to make final decision
                    hasDistraction: true,
                    distractionObjects: detectedNonTree,
                    warningMessage: 'Objects in frame: ' + allDetected + '. DeepLab will isolate tree pixels...',
                    objects: predictions
                };
            }
            
            return { isTree: true, hasPlant: hasPlant, objects: predictions };
            
        } catch (error) {
            console.warn('COCO-SSD detection error:', error);
            return { isTree: true, objects: [] };
        }
    }

    // ==================== DEEPLAB SEMANTIC SEGMENTATION ====================
    // Uses ADE20K model: class 5=tree, 9=grass, 17=plant
    // Gives pixel-level tree mask — person/bike/background are excluded
    
    async segmentWithDeepLab(canvas) {
        if (!this.deeplabModel) {
            console.warn('DeepLab not loaded, skipping semantic segmentation');
            return null;
        }
        
        try {
            console.log('🌳 Running DeepLab semantic segmentation...');
            const result = await this.deeplabModel.segment(canvas);
            const { segmentationMap, height, width } = result;
            
            // ADE20K class indices (0=background, 1=wall, 2=building, 3=sky, 4=floor,
            //   5=tree, 6=ceiling, 7=road, 9=grass, 17=plant, 69=vegetation)
            const TREE_CLASSES = new Set([5, 9, 17, 69, 70]);
            
            const mask = new Float32Array(width * height);
            let treePixelCount = 0;
            let totalPixels = width * height;
            
            for (let i = 0; i < segmentationMap.length; i++) {
                const cls = segmentationMap[i];
                if (TREE_CLASSES.has(cls)) {
                    mask[i] = 1.0;
                    treePixelCount++;
                } else {
                    mask[i] = 0.0;
                }
            }
            
            const treePercent = (treePixelCount / totalPixels * 100);
            console.log('✅ DeepLab: ' + treePixelCount + ' tree pixels (' + treePercent.toFixed(1) + '% of image)');
            
            // Apply light morphological dilation to fill gaps in tree mask
            const dilatedMask = this.dilate(mask, width, height, 3);
            
            return {
                mask: dilatedMask,
                width: width,
                height: height,
                treePercent: treePercent,
                treePixelCount: treePixelCount,
                source: 'deeplab_ade20k'
            };
        } catch (e) {
            console.warn('DeepLab segmentation error:', e);
            return null;
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
                
                // Dark bark - TIGHTER: require warm undertone typical of real bark
                if (hsv.v >= 8 && hsv.v <= 45 && hsv.s >= 5 && hsv.s <= 40) {
                    if (lab.a > -8 && lab.b > 0 && lab.L > 8 && lab.L < 45) {
                        treeProb = Math.max(treeProb, 0.6);
                        trunkPixels++;
                    }
                }
                
                // Light bark - TIGHTER: require warm tone, not just any gray
                if (hsv.s >= 5 && hsv.s < 25 && hsv.v > 55 && hsv.v < 85) {
                    if (lab.b > 3 && lab.b < 25 && lab.a > -3 && lab.a < 12) {
                        treeProb = Math.max(treeProb, 0.4);
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
                
                // Tighter trunk color: real bark, not blankets/fabric/plastic
                const isTrunk = (
                    (hsv.h >= 8 && hsv.h <= 42 && hsv.s >= 12 && hsv.s <= 70 && hsv.v >= 12 && hsv.v <= 65 &&
                     lab.a > -5 && lab.b > 2 && lab.L > 12 && lab.L < 65) ||
                    (hsv.v >= 8 && hsv.v <= 35 && hsv.s >= 5 && hsv.s <= 40 && lab.L > 8 && lab.L < 35 && lab.b > -5)
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
        
        let greenPixels = 0, brownPixels = 0, pureSkinPixels = 0, grayPixels = 0, skyPixels = 0;
        const step = width > 1000 ? 2 : 1;
        let sampledPixels = 0;
        
        // Spatial tracking: top half vs bottom half
        const midY = Math.floor(height / 2);
        let greenTop = 0, greenBottom = 0;
        let brownTop = 0, brownBottom = 0;
        
        // Texture variance tracking for brown/bark regions
        let trunkVarianceSum = 0, trunkVarianceCount = 0;
        
        // Skin region spatial tracking (grid-based clustering)
        const gridCols = 8, gridRows = 8;
        const skinGrid = new Float32Array(gridCols * gridRows);
        const gridW = Math.floor(width / gridCols);
        const gridH = Math.floor(height / gridRows);
        
        for (let y = 0; y < height; y += step) {
            for (let x = 0; x < width; x += step) {
                const i = (y * width + x) * 4;
                const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
                const hsv = this.rgbToHsv(r, g, b);
                sampledPixels++;
                
                const isTop = y < midY;
                
                // Green foliage
                const isGreen = hsv.h >= 40 && hsv.h <= 170 && hsv.s > 15 && hsv.v > 15;
                if (isGreen) {
                    greenPixels++;
                    if (isTop) greenTop++; else greenBottom++;
                }
                
                // Brown bark/trunk - TIGHTER ranges than before
                const isBrown = hsv.h >= 10 && hsv.h <= 45 && hsv.s >= 15 && hsv.s <= 75 && hsv.v >= 12 && hsv.v <= 70;
                if (isBrown) {
                    brownPixels++;
                    if (isTop) brownTop++; else brownBottom++;
                    
                    // Texture variance sampling (every 8th brown pixel for performance)
                    if (x % 8 === 0 && y % 8 === 0 && x > 2 && x < width - 2 && y > 2 && y < height - 2) {
                        let localSum = 0, localSqSum = 0, localN = 0;
                        for (let dy = -2; dy <= 2; dy++) {
                            for (let dx = -2; dx <= 2; dx++) {
                                const ni = ((y + dy) * width + (x + dx)) * 4;
                                const gray = (pixels[ni] + pixels[ni + 1] + pixels[ni + 2]) / 3;
                                localSum += gray;
                                localSqSum += gray * gray;
                                localN++;
                            }
                        }
                        const mean = localSum / localN;
                        const variance = (localSqSum / localN) - (mean * mean);
                        trunkVarianceSum += variance;
                        trunkVarianceCount++;
                    }
                }
                
                // Skin detection - STRICT: only count if NOT also brown/bark
                const isSkinHue = hsv.h >= 8 && hsv.h <= 28 && hsv.s >= 30 && hsv.s <= 65 && hsv.v >= 55 && hsv.v <= 90;
                const hasSkinRGB = r > 120 && g > 80 && b > 50 && r > g && g > b && (r - b) > 30;
                
                if (isSkinHue && hasSkinRGB && !isBrown) {
                    pureSkinPixels++;
                    const gx = Math.min(gridCols - 1, Math.floor(x / gridW));
                    const gy = Math.min(gridRows - 1, Math.floor(y / gridH));
                    skinGrid[gy * gridCols + gx]++;
                }
                
                if (hsv.s < 12 && hsv.v > 35 && hsv.v < 80) grayPixels++;
                if (hsv.h >= 190 && hsv.h <= 245 && hsv.s > 25 && hsv.v > 55) skyPixels++;
            }
        }
        
        const greenPercent = (greenPixels / sampledPixels) * 100;
        const brownPercent = (brownPixels / sampledPixels) * 100;
        const skinPercent = (pureSkinPixels / sampledPixels) * 100;
        const grayPercent = (grayPixels / sampledPixels) * 100;
        
        // Spatial arrangement score: green in top, brown in bottom (tree-like)
        let spatialScore = 0;
        if (greenPixels > 0 && brownPixels > 0) {
            const greenTopRatio = greenTop / greenPixels;
            const brownBottomRatio = brownBottom / brownPixels;
            spatialScore = (greenTopRatio + brownBottomRatio) / 2;
        } else if (greenPixels > 0) {
            spatialScore = (greenTop / greenPixels) * 0.5;
        }
        
        // Texture score: bark has high variance (~50+), flat surfaces (laptop, wall) have low (<20)
        const avgTrunkVariance = trunkVarianceCount > 0 ? trunkVarianceSum / trunkVarianceCount : 0;
        const hasNaturalTexture = avgTrunkVariance > 25;
        
        // Skin clustering
        let skinClusterScore = 0;
        const maxSkinCell = Math.max.apply(null, Array.from(skinGrid));
        const totalSkinCells = Array.from(skinGrid).filter(function(v) { return v > 0; }).length;
        if (pureSkinPixels > 0 && totalSkinCells > 0) {
            skinClusterScore = maxSkinCell / pureSkinPixels;
        }
        
        // === TREE DETECTION: Strict multi-signal scoring ===
        // Trees MUST have strong green AND brown, plus structural evidence
        
        const combinedTreeColor = greenPercent + brownPercent;
        // Require significant green foliage AND brown bark together
        const hasBothColors = greenPercent > 8 && brownPercent > 5 && combinedTreeColor > 18;
        // Or very dominant green (forest/tree fills frame)
        const hasHighGreen = greenPercent > 30;
        // Or high brown with strong texture AND some green present
        const hasHighBrownWithTexture = brownPercent > 15 && hasNaturalTexture && greenPercent > 3;
        
        const meetsColorCriteria = hasBothColors || hasHighGreen || hasHighBrownWithTexture;
        
        // Supporting structural signals — REQUIRE at least 2
        const hasGoodSpatial = spatialScore > 0.45;
        const notArtificial = grayPercent < 50;
        const hasStrongTexture = avgTrunkVariance > 35;
        const supportCount = (hasGoodSpatial ? 1 : 0) + (notArtificial ? 1 : 0) + (hasStrongTexture ? 1 : 0);
        
        const isTree = meetsColorCriteria && supportCount >= 2;
        
        // Human/vehicle detection
        const hasTreeColors = greenPercent > 5 || brownPercent > 5;
        const hasPerson = skinPercent > 30 && skinClusterScore > 0.15 && !hasTreeColors;
        const hasVehicleOrBuilding = grayPercent > 55 && !meetsColorCriteria;
        
        console.log('Tree validation: green=' + greenPercent.toFixed(1) + '%, brown=' + brownPercent.toFixed(1) + 
            '%, gray=' + grayPercent.toFixed(1) + '%, spatial=' + spatialScore.toFixed(2) + 
            ', texture=' + avgTrunkVariance.toFixed(0) + ', colorOK=' + meetsColorCriteria + 
            ', support=' + supportCount + ', isTree=' + isTree);
        
        return {
            isTree: isTree,
            greenPercent: greenPercent.toFixed(1),
            brownPercent: brownPercent.toFixed(1),
            skinPercent: skinPercent.toFixed(1),
            grayPercent: grayPercent.toFixed(1),
            spatialScore: spatialScore.toFixed(2),
            textureScore: avgTrunkVariance.toFixed(0),
            errorMessage: this._getTreeValidationError(isTree, meetsColorCriteria, hasPerson, hasVehicleOrBuilding, supportCount)
        };
    }

    _getTreeValidationError(isTree, meetsColorCriteria, hasPerson, hasVehicleOrBuilding, supportCount) {
        if (isTree) return null;
        if (hasPerson) return 'No tree found — A person is visible in the photo. Please take a photo of a tree. 📸';
        if (hasVehicleOrBuilding) return 'No tree found — This looks like a building/vehicle/object. Point camera at a tree. 🌳';
        if (!meetsColorCriteria) return 'No tree found — Both green leaves and brown trunk should be clearly visible. 🍃';
        if (supportCount < 1) return 'This does not appear to be a tree. Center the tree with natural bark texture visible. 🌲';
        return 'No tree found. Stand 2-3m away, ensure trunk + leaves are in frame. 📏';
    }

    // ==================== STRUCTURAL VALIDATION (Post-Detection) ====================
    
    validateTreeStructure(canvas, bounds) {
        var imgW = canvas.width;
        var imgH = canvas.height;
        
        // Check 1: Trunk must be NARROW — real tree trunks are thin relative to image
        var trunkWidthRatio = bounds.trunkWidthPx / imgW;
        console.log('Structure check: trunkWidthRatio=' + trunkWidthRatio.toFixed(3));
        if (trunkWidthRatio > 0.30) {
            return { valid: false, reason: 'Detected object is too wide (' + (trunkWidthRatio * 100).toFixed(0) + '% of frame). Stand 2-3m from the tree. 📏' };
        }
        
        // Check 2: Trunk must be narrow compared to overall bounding box
        var trunkToBboxRatio = bounds.trunkWidthPx / Math.max(1, bounds.width);
        console.log('Structure check: trunkToBboxRatio=' + trunkToBboxRatio.toFixed(3));
        if (trunkToBboxRatio > 0.60) {
            return { valid: false, reason: 'No narrow trunk detected. The trunk should be thinner than the canopy. 🌲' };
        }
        
        // Check 3: Bounding box should be taller than wide (trees are vertical)
        var aspectRatio = bounds.height / Math.max(1, bounds.width);
        console.log('Structure check: aspectRatio=' + aspectRatio.toFixed(3));
        if (aspectRatio < 0.6) {
            return { valid: false, reason: 'Detected object appears horizontal, but trees are vertical. Full trunk should be visible. 📐' };
        }
        
        // Check 4: Verify vertical continuity — trunk pixels must form a continuous vertical column
        var context = canvas.getContext('2d');
        var trunkX = bounds.trunkCenterX || Math.floor((bounds.trunkLeft + bounds.trunkRight) / 2);
        var trunkHalfW = Math.max(5, Math.floor(bounds.trunkWidthPx / 2));
        var startY = Math.floor(imgH * 0.3);
        var endY = Math.floor(imgH * 0.85);
        var trunkRegionH = endY - startY;
        
        if (trunkRegionH > 20 && trunkX > trunkHalfW && trunkX < imgW - trunkHalfW) {
            var trunkCol = context.getImageData(trunkX - trunkHalfW, startY, trunkHalfW * 2, trunkRegionH);
            var colW = trunkHalfW * 2;
            var verticalBrownRuns = 0;
            var maxConsecutive = 0;
            var currentConsecutive = 0;
            var rowStep = 3;
            
            for (var vy = 0; vy < trunkRegionH; vy += rowStep) {
                var rowBrown = 0;
                var rowTotal = 0;
                for (var vx = 0; vx < colW; vx += 2) {
                    var pi = (vy * colW + vx) * 4;
                    var r = trunkCol.data[pi], g = trunkCol.data[pi + 1], b = trunkCol.data[pi + 2];
                    var hsv = this.rgbToHsv(r, g, b);
                    if (hsv.h >= 8 && hsv.h <= 50 && hsv.s >= 10 && hsv.s <= 80 && hsv.v >= 10 && hsv.v <= 75) {
                        rowBrown++;
                    }
                    rowTotal++;
                }
                
                if (rowTotal > 0 && (rowBrown / rowTotal) > 0.3) {
                    currentConsecutive++;
                    maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
                } else {
                    currentConsecutive = 0;
                }
            }
            
            var totalRows = Math.floor(trunkRegionH / rowStep);
            var continuityRatio = totalRows > 0 ? maxConsecutive / totalRows : 0;
            console.log('Structure check: vertical continuity=' + continuityRatio.toFixed(3) + ' (maxRun=' + maxConsecutive + '/' + totalRows + ')');
            
            // Real tree trunk: continuous vertical brown band for at least 40% of scan height
            if (continuityRatio < 0.35) {
                return { valid: false, reason: 'No continuous vertical trunk structure found. Tree trunk should be clearly visible from 2-3m. 🌳' };
            }
        }
        
        // Check 5: Verify green canopy ABOVE the trunk region
        var upperY = Math.max(0, bounds.y);
        var upperH = Math.min(Math.floor(bounds.height * 0.35), imgH - upperY);
        var upperX = Math.max(0, bounds.x);
        var upperW = Math.min(bounds.width, imgW - upperX);
        
        if (upperW > 0 && upperH > 0) {
            var upperRegion = context.getImageData(upperX, upperY, upperW, upperH);
            var greenCount = 0;
            var totalSampled = 0;
            var step = 3;
            for (var p = 0; p < upperRegion.data.length; p += 4 * step) {
                var r = upperRegion.data[p], g = upperRegion.data[p + 1], b = upperRegion.data[p + 2];
                var hsv = this.rgbToHsv(r, g, b);
                if (hsv.h >= 40 && hsv.h <= 170 && hsv.s > 15 && hsv.v > 15) {
                    greenCount++;
                }
                totalSampled++;
            }
            
            var greenInUpperPercent = totalSampled > 0 ? (greenCount / totalSampled) * 100 : 0;
            console.log('Structure check: greenInUpper=' + greenInUpperPercent.toFixed(1) + '%');
            
            // Must have meaningful green above (canopy)
            if (greenInUpperPercent < 5) {
                return { valid: false, reason: 'No green canopy found above the trunk. Tree + leaves should be in frame. 🍃' };
            }
        }
        
        // Check 6: Bounding box should not cover entire image
        var boundWidthRatio = bounds.width / imgW;
        var boundHeightRatio = bounds.height / imgH;
        if (boundWidthRatio > 0.85 && boundHeightRatio > 0.85) {
            return { valid: false, reason: 'Detection covers the entire image. Stand further from the tree (2-3m recommended). 📸' };
        }
        
        return { valid: true, reason: null };
    }

    // ==================== REAL-WORLD SIZE ESTIMATION ====================
    
    async estimateRealWorldMeasurements(bounds, canvas, selectedSpecies, cocoModel, imageFile) {
        const imgW = canvas.width;
        const imgH = canvas.height;
        
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // USE REAL-WORLD MEASUREMENT ENGINE (Photogrammetry + ML)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        if (typeof realWorldEngine !== 'undefined') {
            console.log('🔬 Using Real-World Measurement Engine...');
            
            // Find trunk base Y for ground plane estimation
            const trunkBaseY = bounds.y + bounds.height;
            
            // Full measurement pipeline: EXIF + References + Photogrammetry + Bayesian Fusion
            // Pass species data so tree-only measurement can use species height for distance
            let speciesData = null;
            if (selectedSpecies) {
                speciesData = this._getSpeciesData(selectedSpecies);
            }
            
            const rwResult = await realWorldEngine.fullMeasurement(
                canvas, bounds, this.cocoModel, imageFile, trunkBaseY, speciesData
            );
            
            console.log('🎯 Real-World Result:', rwResult);
            
            // Validate against species data (soft constraint, NOT override)
            let finalDiameter = rwResult.trunkDiameter;
            let finalCircumference = rwResult.circumference;
            let confidence = rwResult.confidence;
            
            if (selectedSpecies) {
                const speciesCirc = this._getSpeciesCircumference(selectedSpecies);
                // Only warn if WAY outside range (2x), don't force-clamp
                if (finalCircumference < speciesCirc.min * 0.5 || finalCircumference > speciesCirc.max * 2.0) {
                    console.warn(`⚠️ Measurement (${finalCircumference.toFixed(1)}cm) is unusual for ${selectedSpecies} (range: ${speciesCirc.min}-${speciesCirc.max}cm)`);
                    confidence = Math.max(20, confidence - 15); // Reduce confidence, but keep the measurement
                }
            }
            
            // Get accuracy improvement tips
            const tips = realWorldEngine.getAccuracyTips(rwResult);
            
            // Build method details for display
            const methodDetails = [];
            if (rwResult.allMethods) {
                for (const m of rwResult.allMethods) {
                    if (m.method.startsWith('reference_')) {
                        methodDetails.push({
                            name: m.method.replace('reference_', '🎯 '),
                            value: m.trunkDiameter,
                            weight: m.weight,
                            label: `${m.method.replace('reference_', '')} detected`
                        });
                    } else if (m.method === 'ground_plane') {
                        methodDetails.push({
                            name: '📐 Ground Plane',
                            value: m.trunkDiameter,
                            weight: m.weight,
                            label: `Distance: ${m.distance.toFixed(0)}cm`
                        });
                    } else if (m.method === 'species_height') {
                        methodDetails.push({
                            name: '🌳 Species Height',
                            value: m.trunkDiameter,
                            weight: m.weight,
                            label: m.details
                        });
                    } else if (m.method === 'bark_texture') {
                        methodDetails.push({
                            name: '🌿 Bark Texture',
                            value: m.trunkDiameter,
                            weight: m.weight,
                            label: `Texture analysis → ${m.distance.toFixed(0)}cm`
                        });
                    } else if (m.method === 'crown_allometry') {
                        methodDetails.push({
                            name: '🌲 Crown Analysis',
                            value: m.trunkDiameter,
                            weight: m.weight,
                            label: m.details
                        });
                    }
                }
            }
            
            // If no good methods, add a low-confidence entry
            if (methodDetails.length === 0) {
                methodDetails.push({
                    name: '📷 Camera FOV',
                    value: finalDiameter,
                    weight: 0.2,
                    label: 'Camera geometry (lower accuracy)'
                });
            }
            
            return {
                height: null, // We don't measure height
                trunkWidth: finalDiameter.toFixed(1),
                circumference: finalCircumference.toFixed(1),
                estimatedDistance: rwResult.primaryDistance ? rwResult.primaryDistance.toFixed(0) : 'Unknown',
                confidence: confidence.toFixed(1),
                methodDetails: methodDetails,
                realWorldData: rwResult,
                accuracyTips: tips,
                species: selectedSpecies
            };
        }
        
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // FALLBACK: Basic camera geometry (if real-world engine not loaded)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        console.warn('⚠️ Real-World Engine not loaded, using basic estimation');
        
        const treeFillRatio = bounds.height / imgH;
        const fovRadH = (this.cameraParams.fovHorizontal * Math.PI) / 180;
        
        // Assume 250cm distance as fallback
        const assumedDist = 250;
        const visibleWidth = 2 * assumedDist * Math.tan(fovRadH / 2);
        const trunkDiameter = visibleWidth * (bounds.trunkWidthPx / imgW);
        const circumference = Math.PI * trunkDiameter;
        
        return {
            height: null,
            trunkWidth: trunkDiameter.toFixed(1),
            circumference: circumference.toFixed(1),
            estimatedDistance: assumedDist.toFixed(0),
            confidence: '35.0',
            methodDetails: [{ name: '📷 Basic FOV', value: trunkDiameter, label: 'Assumed distance (low accuracy)' }],
            species: selectedSpecies
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
        var confidence = 40;
        
        if (treeFillRatio > 0.25 && treeFillRatio < 0.85) confidence += 12;
        else if (treeFillRatio > 0.15 && treeFillRatio < 0.95) confidence += 6;
        
        var centerOffset = Math.abs(bounds.trunkCenterX - imgW / 2) / imgW;
        if (centerOffset < 0.15) confidence += 10;
        else if (centerOffset < 0.25) confidence += 5;
        
        if (bounds.trunkWidthPx > 20 && bounds.trunkWidthPx < imgW * 0.45) confidence += 8;
        
        var aspectRatio = bounds.height / Math.max(1, bounds.width);
        if (aspectRatio > 1.0) confidence += 6;
        
        if (selectedSpecies) confidence += 12;
        
        if (methodWeights.length >= 2) {
            var values = methodWeights.map(function(m) { return m.value; });
            var avg = values.reduce(function(s, v) { return s + v; }, 0) / values.length;
            var maxDev = Math.max.apply(null, values.map(function(v) { return Math.abs(v - avg) / avg; }));
            if (maxDev < 0.25) confidence += 10;
            else if (maxDev < 0.4) confidence += 5;
        }
        
        return Math.min(95, confidence);
    }

    // ==================== MAIN MEASUREMENT FUNCTION ====================
    
    async measureAutomatically(canvas, imageFile) {
        try {
            if (!this.isModelLoaded) { await this.loadModels(); }
            
            console.log('🔬 Starting DeepLab + Real-World Tree Analysis...');
            var startTime = performance.now();
            
            var context = canvas.getContext('2d');
            var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            
            // ============================================================
            // STEP 0-A: DeepLab Semantic Segmentation (PRIMARY METHOD)
            // Detects actual tree pixels, ignores person/bike/background
            // ============================================================
            var deeplabResult = await this.segmentWithDeepLab(canvas);
            var usingDeepLab = false;
            
            if (deeplabResult && deeplabResult.treePercent >= 4) {
                console.log('✅ DeepLab found tree pixels: ' + deeplabResult.treePercent.toFixed(1) + '% — using as primary mask');
                usingDeepLab = true;
            } else if (deeplabResult) {
                console.log('⚠️ DeepLab found only ' + deeplabResult.treePercent.toFixed(1) + '% tree pixels — falling back to color');
            } else {
                console.log('⚠️ DeepLab unavailable — using color-based detection');
            }
            
            // ============================================================
            // STEP 0-B: COCO-SSD check (block indoor objects)
            // ============================================================
            var aiDetection = await this.detectObjectsAI(canvas);
            console.log('AI Object Detection:', aiDetection);
            
            if (!aiDetection.isTree) {
                // Hard block — indoor object / indoor scene detected
                throw new Error(aiDetection.errorMessage);
            }
            
            // ============================================================
            // STEP 0-C: DeepLab MANDATORY GATE — if DeepLab loaded but found
            // almost no tree pixels, this is NOT a tree photo
            // ============================================================
            if (deeplabResult && deeplabResult.treePercent < 2) {
                // DeepLab loaded & ran successfully but found <2% tree pixels
                // This means the photo contains almost no tree — block it
                throw new Error('No tree detected in this photo!\n\nDeepLab AI found only ' + 
                    deeplabResult.treePercent.toFixed(1) + '% tree pixels.\n\n' +
                    '📸 Tips:\n• Take the photo OUTDOORS near a real tree\n• Tree trunk should fill 30-80% of the frame\n• Ensure good lighting');
            }
            
            if (aiDetection.hasDistraction && aiDetection.warningMessage) {
                console.log('ℹ️ Distraction warning:', aiDetection.warningMessage);
                // Continue — DeepLab will isolate tree pixels from background
            }
            
            // ============================================================
            // STEP 1: Color validation (only if DeepLab didn't find tree)
            // ============================================================
            var validation = null;
            if (!usingDeepLab) {
                validation = this.validateTreePresence(imageData);
                console.log('Color validation:', validation);
                
                if (!validation.isTree) {
                    const hindiMsg = validation.errorMessage + '\n\n🌳 No tree found! The trunk and leaves should be clearly visible.';
                    throw new Error(hindiMsg);
                }
            } else {
                // DeepLab found tree — create a pass-through validation result
                validation = { isTree: true, greenPercent: '?', brownPercent: '?', source: 'deeplab' };
            }
            
            // ============================================================
            // STEP 2: Gaussian blur for noise reduction
            // ============================================================
            var blurred = this.gaussianBlur(imageData, 2);
            
            // ============================================================
            // STEP 3: Build segmentation mask
            // PRIMARY: DeepLab pixel mask (tree only, no background)
            // FALLBACK: Color-based segmentation
            // ============================================================
            var segResult;
            if (usingDeepLab) {
                // Use DeepLab mask directly — scale it to canvas size
                segResult = {
                    mask: deeplabResult.mask,
                    width: deeplabResult.width,
                    height: deeplabResult.height,
                    greenPercent: deeplabResult.treePercent.toFixed(1),
                    trunkPercent: deeplabResult.treePercent.toFixed(1),
                    source: 'deeplab'
                };
                console.log('🌳 Using DeepLab mask for trunk detection');
            } else {
                segResult = this.segmentTreeAdvanced(blurred);
                console.log('Color Segmentation: Green ' + segResult.greenPercent + '%, Trunk ' + segResult.trunkPercent + '%');
                
                if (parseFloat(segResult.greenPercent) < 1 && parseFloat(segResult.trunkPercent) < 1) {
                    throw new Error('Tree not clearly visible! The tree should fill 30-80% of the frame with good lighting. 📸');
                }
            }
            
            // ============================================================
            // STEP 4: Precise trunk detection with vertical analysis
            // ============================================================
            var bounds = this.detectTrunkPrecise(canvas, segResult.mask, segResult.width, segResult.height);
            console.log('Trunk detected:', bounds);
            
            if (bounds.trunkWidthPx < 5) {
                if (usingDeepLab) {
                    throw new Error('DeepLab detected a tree but could not find trunk width! 💡\n• Keep the tree trunk in the center of the camera\n• Ensure direct sunlight on the trunk\n• Stand 2-3 meters away from the tree');
                }
                throw new Error('Trunk not detected clearly! 💡 Tips:\n• Ensure good lighting on the trunk\n• Stand 2-3 meters away from the tree\n• Keep the camera level and straight');
            }
            
            // Step 4b: Structural validation — skip strict checks if DeepLab confirmed tree
            var structureCheck;
            if (usingDeepLab) {
                // DeepLab already confirmed these are tree pixels — only check extreme cases
                var trunkWidthRatio = bounds.trunkWidthPx / canvas.width;
                if (trunkWidthRatio > 0.50) {
                    structureCheck = { valid: false, reason: 'Trunk appears too large. Stand 2-3m away from the tree. 📏' };
                } else {
                    structureCheck = { valid: true };
                }
            } else {
                structureCheck = this.validateTreeStructure(canvas, bounds);
            }
            if (!structureCheck.valid) {
                throw new Error(structureCheck.reason);
            }
            
            // Step 5: Get selected species for validation (soft constraint only)
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
            
            console.log('Species for validation:', selectedSpecies || 'none');
            
            // Step 6: REAL-WORLD MEASUREMENT (Photogrammetry + Reference Objects + Bayesian Fusion)
            var measurements = await this.estimateRealWorldMeasurements(bounds, canvas, selectedSpecies, this.cocoModel, imageFile);
            
            // Step 7: Final validation
            var circumference = parseFloat(measurements.circumference);
            if (circumference < 5 || circumference > 700) {
                throw new Error('Detected circumference (' + circumference + ' cm) is impossible! 🔄 Retake the photo:\n• Stand 2-3 meters from the tree\n• Hold camera at chest height\n• Keep trunk in the center of the frame');
            }
            
            var elapsed = (performance.now() - startTime).toFixed(0);
            console.log('✅ Analysis complete in ' + elapsed + 'ms');
            console.log('Circumference: ' + measurements.circumference + ' cm, Confidence: ' + measurements.confidence + '%');
            console.log('Segmentation source: ' + (usingDeepLab ? 'DeepLab ADE20K 🌳' : 'Color-based fallback'));
            
            // Calculate additional measurements
            var circumferenceVal = parseFloat(measurements.circumference);
            var diameterVal = Math.round((circumferenceVal / Math.PI) * 10) / 10;
            var girthVal = circumferenceVal; // Girth = circumference at breast height
            var heightVal = parseFloat(measurements.height) || this._estimateHeightFromCanvas(canvas, bounds.breastHeightY);
            
            // Add DeepLab badge to method details if used
            if (usingDeepLab && measurements.methodDetails) {
                measurements.methodDetails.unshift({
                    name: '🌳 DeepLab ADE20K',
                    value: parseFloat(measurements.circumference),
                    weight: 0,
                    label: deeplabResult.treePercent.toFixed(1) + '% tree pixels isolated'
                });
            }
            
            return {
                height: heightVal,
                trunkWidth: measurements.trunkWidth,
                circumference: measurements.circumference,
                diameter: diameterVal,
                girth: girthVal.toFixed(1),
                estimatedDistance: measurements.estimatedDistance,
                confidence: measurements.confidence,
                methodDetails: measurements.methodDetails,
                realWorldData: measurements.realWorldData,
                accuracyTips: measurements.accuracyTips,
                bounds: bounds,
                validation: validation,
                species: selectedSpecies,
                processingTime: elapsed,
                deeplabUsed: usingDeepLab,
                deeplabTreePercent: usingDeepLab ? deeplabResult.treePercent.toFixed(1) : null,
                isManual: false
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
        context.fillStyle = 'rgba(46, 204, 113, 0.12)';
        context.fillRect(bounds.trunkLeft, bounds.y, bounds.trunkRight - bounds.trunkLeft, bounds.height);
        
        // Tree bounding box (dashed, green)
        context.strokeStyle = '#27ae60';
        context.lineWidth = 2.5;
        context.setLineDash([10, 5]);
        context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        context.setLineDash([]);
        
        // Trunk measurement line at breast height (red)
        context.strokeStyle = '#e74c3c';
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(bounds.trunkLeft - 15, bounds.breastHeightY);
        context.lineTo(bounds.trunkRight + 15, bounds.breastHeightY);
        context.stroke();
        
        // Arrowheads
        this._drawArrowHead(context, bounds.trunkLeft - 15, bounds.breastHeightY, 'right', 10);
        this._drawArrowHead(context, bounds.trunkRight + 15, bounds.breastHeightY, 'left', 10);
        
        // DBH line label (clean pill)
        var dbhLabelX = bounds.trunkRight + 20;
        var dbhLabelY = bounds.breastHeightY;
        context.fillStyle = 'rgba(231, 76, 60, 0.85)';
        this._roundRect(context, dbhLabelX, dbhLabelY - 13, 100, 26, 13);
        context.fill();
        context.fillStyle = 'white';
        context.font = 'bold 11px Arial';
        context.textAlign = 'center';
        context.fillText('DBH (1.37m)', dbhLabelX + 50, dbhLabelY + 4);
        context.textAlign = 'left';
        
        // TREE DETECTED badge (top-left, professional)
        context.fillStyle = 'rgba(39, 174, 96, 0.9)';
        this._roundRect(context, 10, 10, 190, 34, 17);
        context.fill();
        // White border
        context.strokeStyle = 'rgba(255,255,255,0.5)';
        context.lineWidth = 1.5;
        this._roundRect(context, 10, 10, 190, 34, 17);
        context.stroke();
        context.fillStyle = 'white';
        context.font = 'bold 14px Arial';
        context.fillText('TREE DETECTED', 38, 32);
        // Check icon
        context.font = 'bold 16px Arial';
        context.fillText('✓', 18, 33);
        
        // Measurement labels (professional pills)
        this._drawPillLabel(context, 'Height: ' + measurements.height + ' cm', bounds.x + 5, bounds.y - 18, '#27ae60');
        this._drawPillLabel(context, 'Diameter: ' + measurements.trunkWidth + ' cm  |  Circumference: ' + measurements.circumference + ' cm', 
            bounds.trunkLeft, bounds.breastHeightY + 28, '#c0392b');
        this._drawPillLabel(context, 'Confidence: ' + measurements.confidence + '%', 
            bounds.x + bounds.width - 180, bounds.y - 18, '#2980b9');
        
        if (measurements.species) {
            this._drawPillLabel(context, 'Species: ' + measurements.species, 10, canvas.height - 30, '#8e44ad');
        }
        
        if (measurements.processingTime) {
            this._drawPillLabel(context, measurements.processingTime + 'ms', canvas.width - 75, 20, 'rgba(0,0,0,0.55)');
        }
        
        // Center marker (crosshair style)
        var cx = bounds.trunkCenterX, cy = bounds.breastHeightY;
        context.strokeStyle = '#e74c3c';
        context.lineWidth = 2;
        context.beginPath();
        context.arc(cx, cy, 8, 0, 2 * Math.PI);
        context.stroke();
        context.beginPath();
        context.moveTo(cx - 12, cy); context.lineTo(cx + 12, cy);
        context.moveTo(cx, cy - 12); context.lineTo(cx, cy + 12);
        context.stroke();
        context.fillStyle = '#e74c3c';
        context.beginPath();
        context.arc(cx, cy, 3, 0, 2 * Math.PI);
        context.fill();
    }

    _drawPillLabel(context, text, x, y, bgColor) {
        context.font = 'bold 13px Arial';
        var metrics = context.measureText(text);
        var padding = 8;
        var height = 22;
        var radius = height / 2;
        context.fillStyle = bgColor;
        this._roundRect(context, x - padding, y - height + 4, metrics.width + padding * 2, height, radius);
        context.fill();
        context.fillStyle = 'white';
        context.fillText(text, x, y);
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

    // ==================== MANUAL TRUNK SELECTION ====================
    // User taps two points on trunk edges → calculate real-world measurements
    
    manualMeasureFromPoints(canvas, point1, point2, imageFile) {
        var trunkWidthPx = Math.abs(point2.x - point1.x);
        var midY = (point1.y + point2.y) / 2;
        var trunkCenterX = (point1.x + point2.x) / 2;
        
        if (trunkWidthPx < 3) {
            throw new Error('Points are too close! Tap the LEFT and RIGHT edges of the trunk.');
        }
        
        // Estimate distance from camera
        var imgW = canvas.width;
        var imgH = canvas.height;
        var fov = this.cameraParams.fovHorizontal || 65;
        var fovRad = (fov * Math.PI) / 180;
        
        // Default assumed distance (if no reference)
        var distanceCm = this.DEFAULT_DISTANCE_CM;
        
        // Calculate real-world trunk width using pinhole camera model
        // trunkRealWidth = (trunkWidthPx / imgW) * 2 * distance * tan(fov/2)
        var fieldOfViewWidth = 2 * distanceCm * Math.tan(fovRad / 2);
        var trunkWidthCm = (trunkWidthPx / imgW) * fieldOfViewWidth;
        
        // Circumference from diameter (assuming roughly circular trunk)
        var circumferenceCm = trunkWidthCm * Math.PI;
        
        // Height estimation: if user selected breast height area, 
        // estimate full tree height from image proportions
        var estimatedHeightCm = this._estimateHeightFromCanvas(canvas, midY);
        
        // Get species info for calibration
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
        } catch(e) {}
        
        // Species calibration
        if (selectedSpecies) {
            var speciesData = this._getSpeciesCircumference(selectedSpecies);
            if (circumferenceCm < speciesData.min * 0.5) {
                circumferenceCm = Math.max(circumferenceCm, speciesData.min * 0.7);
            } else if (circumferenceCm > speciesData.max * 1.5) {
                circumferenceCm = Math.min(circumferenceCm, speciesData.max * 1.2);
            }
        }
        
        circumferenceCm = Math.round(circumferenceCm * 10) / 10;
        var diameterCm = Math.round((circumferenceCm / Math.PI) * 10) / 10;
        
        // Draw manual selection overlay
        this._drawManualOverlay(canvas, point1, point2, circumferenceCm, diameterCm, estimatedHeightCm);
        
        return {
            height: estimatedHeightCm,
            trunkWidth: diameterCm,
            circumference: circumferenceCm.toFixed(1),
            diameter: diameterCm,
            girth: circumferenceCm.toFixed(1),
            estimatedDistance: (distanceCm / 100).toFixed(1),
            confidence: 70, // Manual selection is moderately reliable
            methodDetails: [{
                name: '✋ Manual Selection',
                value: circumferenceCm,
                weight: 1,
                label: 'User-selected trunk edges (' + trunkWidthPx + 'px width)'
            }],
            realWorldData: {
                measurementBasis: 'Manual trunk edge selection',
                estimatedDistance: distanceCm / 100
            },
            accuracyTips: [
                'For better accuracy, place a reference object (coin/card) on the trunk',
                'Take the photo at chest height (1.37m) for standard DBH measurement'
            ],
            bounds: {
                x: Math.min(point1.x, point2.x) - 20,
                y: 0,
                width: trunkWidthPx + 40,
                height: imgH,
                trunkLeft: Math.min(point1.x, point2.x),
                trunkRight: Math.max(point1.x, point2.x),
                trunkCenterX: trunkCenterX,
                trunkWidthPx: trunkWidthPx,
                breastHeightY: midY
            },
            validation: null,
            species: selectedSpecies,
            processingTime: '0',
            deeplabUsed: false,
            deeplabTreePercent: null,
            isManual: true
        };
    }
    
    _estimateHeightFromCanvas(canvas, measurementY) {
        // Rough height estimation based on where measurement was taken
        // Assumes photo captures most of the tree
        var imgH = canvas.height;
        
        // If measurement point is at ~65% of image height (typical breast height)
        // and camera was held at ~1.37m, estimate proportional height
        var fractionFromTop = measurementY / imgH;
        
        // Use the breast height reference: if measurement is at fractionFromTop,
        // we assume that point ≈ 1.37m high, and top of image ≈ tree top
        if (fractionFromTop > 0.1 && fractionFromTop < 0.95) {
            var breastHeightCm = 137;
            var estimatedTreeHeight = breastHeightCm / fractionFromTop;
            return Math.round(estimatedTreeHeight);
        }
        
        return 500; // Default estimate
    }
    
    _drawManualOverlay(canvas, point1, point2, circumference, diameter, height) {
        var context = canvas.getContext('2d');
        var midY = (point1.y + point2.y) / 2;
        var leftX = Math.min(point1.x, point2.x);
        var rightX = Math.max(point1.x, point2.x);
        
        // Draw measurement line
        context.strokeStyle = '#e74c3c';
        context.lineWidth = 3;
        context.setLineDash([]);
        context.beginPath();
        context.moveTo(leftX - 10, midY);
        context.lineTo(rightX + 10, midY);
        context.stroke();
        
        // Arrow heads
        this._drawArrowHead(context, leftX - 10, midY, 'right', 10);
        this._drawArrowHead(context, rightX + 10, midY, 'left', 10);
        
        // Point markers
        [point1, point2].forEach(function(pt) {
            context.fillStyle = '#e74c3c';
            context.beginPath();
            context.arc(pt.x, pt.y, 8, 0, 2 * Math.PI);
            context.fill();
            context.strokeStyle = 'white';
            context.lineWidth = 2;
            context.beginPath();
            context.arc(pt.x, pt.y, 8, 0, 2 * Math.PI);
            context.stroke();
        });
        
        // Labels
        this._drawPillLabel(context, 'MANUAL MEASUREMENT', 10, 32, 'rgba(142, 68, 173, 0.9)');
        this._drawPillLabel(context, 'Circumference: ' + circumference + ' cm', leftX, midY + 30, '#c0392b');
        this._drawPillLabel(context, 'Diameter: ' + diameter + ' cm', leftX, midY + 56, '#2980b9');
        this._drawPillLabel(context, 'Est. Height: ' + height + ' cm', leftX, midY - 30, '#27ae60');
        
        // Center marker
        var cx = (leftX + rightX) / 2;
        context.strokeStyle = '#e74c3c';
        context.lineWidth = 2;
        context.beginPath();
        context.arc(cx, midY, 6, 0, 2 * Math.PI);
        context.stroke();
        context.fillStyle = '#e74c3c';
        context.beginPath();
        context.arc(cx, midY, 3, 0, 2 * Math.PI);
        context.fill();
    }
}

// Export
window.AdvancedTreeML = AdvancedTreeML;
