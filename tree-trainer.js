// Tree Detection Training Module
// In-browser transfer learning using MobileNet feature extraction
// Trains a custom tree/not-tree classifier that improves detection accuracy
// Training data and model weights saved to localStorage for persistence

class TreeTrainer {
    constructor() {
        this.mobilenetModel = null;
        this.classifierModel = null;
        this.trainingData = { tree: [], notTree: [] };
        this.isModelTrained = false;
        this.isBaseLoaded = false;
    }

    // ==================== MODEL LOADING ====================

    async loadBase() {
        if (this.isBaseLoaded && this.mobilenetModel) return;

        console.log('🧠 Loading MobileNet for feature extraction...');

        if (typeof mobilenet === 'undefined') {
            throw new Error('MobileNet library not loaded. Check CDN script.');
        }

        this.mobilenetModel = await mobilenet.load({ version: 2, alpha: 0.5 });
        this.isBaseLoaded = true;
        console.log('✅ MobileNet v2 loaded — transfer learning ready');
    }

    // ==================== FEATURE EXTRACTION ====================

    extractFeatures(imageElement) {
        return tf.tidy(() => {
            // infer(img, embedding=true) returns the 1280-dim feature vector
            return this.mobilenetModel.infer(imageElement, true);
        });
    }

    // ==================== TRAINING DATA MANAGEMENT ====================

    async addExample(canvas, label) {
        await this.loadBase();

        var features = this.extractFeatures(canvas);
        var featureData = await features.data();
        features.dispose();

        var featureArray = Array.from(featureData);

        if (label === 'tree') {
            this.trainingData.tree.push(featureArray);
        } else {
            this.trainingData.notTree.push(featureArray);
        }

        this.saveTrainingData();

        console.log('📸 Added ' + label + ' example. Tree: ' + this.trainingData.tree.length + ', Not-Tree: ' + this.trainingData.notTree.length);

        return {
            treeCount: this.trainingData.tree.length,
            notTreeCount: this.trainingData.notTree.length,
            total: this.trainingData.tree.length + this.trainingData.notTree.length
        };
    }

    // ==================== MODEL TRAINING ====================

    async train(onProgress) {
        var treeCount = this.trainingData.tree.length;
        var notTreeCount = this.trainingData.notTree.length;

        if (treeCount < 3) {
            throw new Error('Need at least 3 tree photos. Currently have: ' + treeCount);
        }
        if (notTreeCount < 3) {
            throw new Error('Need at least 3 non-tree photos. Currently have: ' + notTreeCount);
        }

        console.log('🧠 Training classifier with ' + treeCount + ' tree + ' + notTreeCount + ' non-tree examples...');

        // Build training tensors
        var allFeatures = this.trainingData.tree.concat(this.trainingData.notTree);
        var allLabels = [];
        var i;
        for (i = 0; i < treeCount; i++) allLabels.push([1, 0]);
        for (i = 0; i < notTreeCount; i++) allLabels.push([0, 1]);

        var xs = tf.tensor2d(allFeatures);
        var ys = tf.tensor2d(allLabels);

        var featureDim = allFeatures[0].length;

        // Dispose old model
        if (this.classifierModel) {
            this.classifierModel.dispose();
            this.classifierModel = null;
        }

        // Build classifier head
        this.classifierModel = tf.sequential({
            layers: [
                tf.layers.dense({ inputShape: [featureDim], units: 128, activation: 'relu' }),
                tf.layers.dropout({ rate: 0.4 }),
                tf.layers.dense({ units: 64, activation: 'relu' }),
                tf.layers.dropout({ rate: 0.3 }),
                tf.layers.dense({ units: 2, activation: 'softmax' })
            ]
        });

        this.classifierModel.compile({
            optimizer: tf.train.adam(0.0005),
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });

        var totalEpochs = 50;
        var batchSize = Math.min(16, allFeatures.length);

        await this.classifierModel.fit(xs, ys, {
            epochs: totalEpochs,
            batchSize: batchSize,
            shuffle: true,
            validationSplit: allFeatures.length >= 10 ? 0.2 : 0,
            callbacks: {
                onEpochEnd: function(epoch, logs) {
                    if (onProgress) {
                        onProgress({
                            epoch: epoch + 1,
                            totalEpochs: totalEpochs,
                            loss: logs.loss.toFixed(4),
                            accuracy: (logs.acc * 100).toFixed(1),
                            valAccuracy: logs.val_acc ? (logs.val_acc * 100).toFixed(1) : '-'
                        });
                    }
                }
            }
        });

        xs.dispose();
        ys.dispose();

        this.isModelTrained = true;

        // Save model
        await this.saveModel();

        console.log('✅ Training complete! Model saved.');
        return {
            success: true,
            treeExamples: treeCount,
            notTreeExamples: notTreeCount
        };
    }

    // ==================== PREDICTION ====================

    async predict(canvas) {
        if (!this.isModelTrained || !this.classifierModel) {
            return null; // No trained model
        }

        if (!this.isBaseLoaded) {
            await this.loadBase();
        }

        var features = this.extractFeatures(canvas);
        var prediction = this.classifierModel.predict(features);
        var probs = await prediction.data();

        features.dispose();
        prediction.dispose();

        var result = {
            isTree: probs[0] > probs[1],
            treeConfidence: parseFloat((probs[0] * 100).toFixed(1)),
            notTreeConfidence: parseFloat((probs[1] * 100).toFixed(1))
        };

        console.log('🧠 Custom classifier: ' + (result.isTree ? 'TREE' : 'NOT TREE') +
            ' (tree: ' + result.treeConfidence + '%, not-tree: ' + result.notTreeConfidence + '%)');

        return result;
    }

    // ==================== PERSISTENCE ====================

    saveTrainingData() {
        try {
            var dataStr = JSON.stringify(this.trainingData);
            localStorage.setItem('treeTrainerData', dataStr);
        } catch (e) {
            console.warn('Could not save training data:', e.message);
            // If localStorage is full, try trimming oldest examples
            if (e.name === 'QuotaExceededError') {
                console.warn('localStorage full — trimming training data...');
                while (this.trainingData.tree.length > 20) this.trainingData.tree.shift();
                while (this.trainingData.notTree.length > 20) this.trainingData.notTree.shift();
                try {
                    localStorage.setItem('treeTrainerData', JSON.stringify(this.trainingData));
                } catch (e2) {
                    console.error('Still cannot save training data');
                }
            }
        }
    }

    loadTrainingData() {
        try {
            var data = localStorage.getItem('treeTrainerData');
            if (data) {
                this.trainingData = JSON.parse(data);
                console.log('📂 Loaded training data: ' + this.trainingData.tree.length + ' tree, ' + this.trainingData.notTree.length + ' not-tree');
                return true;
            }
        } catch (e) {
            console.warn('Could not load training data:', e.message);
        }
        return false;
    }

    async saveModel() {
        try {
            await this.classifierModel.save('localstorage://tree-classifier-v1');
            localStorage.setItem('treeClassifierReady', 'true');
            console.log('✅ Trained model saved to localStorage');
        } catch (e) {
            console.warn('Could not save model:', e.message);
        }
    }

    async loadSavedModel() {
        try {
            if (localStorage.getItem('treeClassifierReady') === 'true') {
                this.classifierModel = await tf.loadLayersModel('localstorage://tree-classifier-v1');
                this.isModelTrained = true;
                console.log('✅ Loaded trained tree classifier from localStorage');
                return true;
            }
        } catch (e) {
            console.warn('Could not load saved model:', e.message);
            localStorage.removeItem('treeClassifierReady');
        }
        return false;
    }

    clearAllData() {
        this.trainingData = { tree: [], notTree: [] };
        localStorage.removeItem('treeTrainerData');
        localStorage.removeItem('treeClassifierReady');

        // Remove saved model keys
        try {
            var keys = Object.keys(localStorage);
            for (var i = 0; i < keys.length; i++) {
                if (keys[i].indexOf('tensorflowjs_models/tree-classifier') !== -1) {
                    localStorage.removeItem(keys[i]);
                }
            }
        } catch (e) { }

        if (this.classifierModel) {
            this.classifierModel.dispose();
            this.classifierModel = null;
        }
        this.isModelTrained = false;

        console.log('🗑️ All training data and model cleared');
    }

    getStats() {
        return {
            treeExamples: this.trainingData.tree.length,
            notTreeExamples: this.trainingData.notTree.length,
            total: this.trainingData.tree.length + this.trainingData.notTree.length,
            isTrained: this.isModelTrained
        };
    }
}

// ==================== TRAINING UI CONTROLLER ====================

var treeTrainer = null;

function initTrainer() {
    if (treeTrainer) return treeTrainer;
    treeTrainer = new TreeTrainer();
    treeTrainer.loadTrainingData();
    treeTrainer.loadSavedModel();
    return treeTrainer;
}

function openTrainingModal() {
    initTrainer();

    var modal = document.getElementById('trainingModal');
    if (modal) {
        modal.style.display = 'flex';
        updateTrainingUI();
        return;
    }

    // Create modal
    modal = document.createElement('div');
    modal.id = 'trainingModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(8px);';

    modal.innerHTML = `
        <div style="background:linear-gradient(145deg,#0f172a,#1e293b);border:1px solid rgba(255,255,255,0.1);border-radius:20px;max-width:440px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.5);">
            <!-- Header -->
            <div style="padding:20px 20px 0;display:flex;justify-content:space-between;align-items:center;">
                <h3 style="color:#e2e8f0;font-size:18px;margin:0;"><i class="fas fa-brain" style="color:#a78bfa;"></i> Train Tree Detector</h3>
                <button onclick="document.getElementById('trainingModal').style.display='none'" style="background:none;border:none;color:#94a3b8;font-size:22px;cursor:pointer;padding:4px 8px;">&times;</button>
            </div>

            <!-- Explanation -->
            <div style="padding:12px 20px;color:rgba(255,255,255,0.5);font-size:13px;">
                Teach the AI to recognize trees better by adding example photos. Add tree photos and non-tree photos (rooms, objects, etc.), then train the model.
            </div>

            <!-- Stats -->
            <div id="trainingStats" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 20px;">
                <div style="padding:14px;background:rgba(16,185,129,0.1);border-radius:12px;border:1px solid rgba(16,185,129,0.2);text-align:center;">
                    <div style="font-size:28px;font-weight:800;color:#10b981;" id="treeExCount">0</div>
                    <div style="font-size:11px;color:#6ee7b7;text-transform:uppercase;letter-spacing:0.5px;">Tree Photos</div>
                </div>
                <div style="padding:14px;background:rgba(239,68,68,0.1);border-radius:12px;border:1px solid rgba(239,68,68,0.2);text-align:center;">
                    <div style="font-size:28px;font-weight:800;color:#ef4444;" id="notTreeExCount">0</div>
                    <div style="font-size:11px;color:#fca5a5;text-transform:uppercase;letter-spacing:0.5px;">Non-Tree Photos</div>
                </div>
            </div>

            <!-- Add buttons -->
            <div style="display:flex;gap:10px;padding:16px 20px;">
                <button onclick="addTrainingPhoto('tree')" style="flex:1;padding:14px;background:linear-gradient(135deg,#059669,#10b981);color:white;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;">
                    <i class="fas fa-tree"></i> Add Tree
                </button>
                <button onclick="addTrainingPhoto('notTree')" style="flex:1;padding:14px;background:linear-gradient(135deg,#dc2626,#ef4444);color:white;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;">
                    <i class="fas fa-ban"></i> Add Non-Tree
                </button>
            </div>

            <!-- Hidden file input for training photos -->
            <input type="file" id="trainPhotoInput" accept="image/*" capture="environment" style="display:none;">

            <!-- Training preview canvas (hidden) -->
            <canvas id="trainPreviewCanvas" style="display:none;"></canvas>

            <!-- Training progress -->
            <div id="trainingProgress" style="display:none;padding:0 20px;">
                <div style="background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.2);border-radius:12px;padding:14px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <span style="color:#a78bfa;font-weight:600;font-size:13px;" id="trainStatusText">Training...</span>
                        <span style="color:#c4b5fd;font-size:12px;" id="trainEpochText">0/50</span>
                    </div>
                    <div style="background:rgba(0,0,0,0.3);border-radius:8px;height:8px;overflow:hidden;">
                        <div id="trainProgressBar" style="width:0%;height:100%;background:linear-gradient(90deg,#7c3aed,#a78bfa);border-radius:8px;transition:width 0.3s;"></div>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-top:8px;">
                        <span style="color:rgba(255,255,255,0.4);font-size:11px;">Accuracy: <b id="trainAccText" style="color:#10b981;">-</b></span>
                        <span style="color:rgba(255,255,255,0.4);font-size:11px;">Loss: <b id="trainLossText" style="color:#f59e0b;">-</b></span>
                    </div>
                </div>
            </div>

            <!-- Train button -->
            <div style="padding:12px 20px;">
                <button id="startTrainBtn" onclick="startTraining()" style="width:100%;padding:16px;background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:white;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(139,92,246,0.3);">
                    <i class="fas fa-graduation-cap"></i> Start Training
                </button>
            </div>

            <!-- Model status -->
            <div id="modelStatus" style="padding:0 20px 12px;">
                <div id="modelStatusBadge" style="padding:10px 14px;border-radius:10px;font-size:12px;text-align:center;"></div>
            </div>

            <!-- Clear data -->
            <div style="padding:0 20px 20px;text-align:center;">
                <button onclick="clearTrainingData()" style="background:none;border:none;color:rgba(255,255,255,0.3);font-size:12px;cursor:pointer;text-decoration:underline;">
                    <i class="fas fa-trash"></i> Clear All Training Data
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Setup file input handler
    setupTrainingFileInput();
    updateTrainingUI();
}

var pendingTrainLabel = null;

function setupTrainingFileInput() {
    var fileInput = document.getElementById('trainPhotoInput');
    if (!fileInput) return;

    fileInput.addEventListener('change', async function(e) {
        var file = e.target.files[0];
        if (!file || !pendingTrainLabel) return;

        var label = pendingTrainLabel;
        pendingTrainLabel = null;

        var reader = new FileReader();
        reader.onload = async function(evt) {
            var img = new Image();
            img.onload = async function() {
                var canvas = document.getElementById('trainPreviewCanvas');
                var w = img.width, h = img.height;
                var maxW = 224; // MobileNet input size
                if (w > maxW) {
                    h = Math.round(h * (maxW / w));
                    w = maxW;
                }
                canvas.width = w;
                canvas.height = h;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);

                try {
                    await initTrainer().loadBase();
                    var stats = await treeTrainer.addExample(canvas, label);
                    updateTrainingUI();

                    // Show quick confirmation
                    var msg = label === 'tree' ? '🌳 Tree photo added!' : '🚫 Non-tree photo added!';
                    showTrainNotification(msg, label === 'tree' ? '#10b981' : '#ef4444');
                } catch (err) {
                    alert('Error adding example: ' + err.message);
                }
            };
            img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function addTrainingPhoto(label) {
    pendingTrainLabel = label;
    var fileInput = document.getElementById('trainPhotoInput');
    if (fileInput) {
        fileInput.value = '';
        fileInput.click();
    }
}

async function startTraining() {
    if (!treeTrainer) initTrainer();

    var btn = document.getElementById('startTrainBtn');
    var progressEl = document.getElementById('trainingProgress');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Training...';
    btn.style.opacity = '0.6';
    progressEl.style.display = 'block';

    try {
        await treeTrainer.loadBase();

        var result = await treeTrainer.train(function(info) {
            document.getElementById('trainEpochText').textContent = info.epoch + '/' + info.totalEpochs;
            document.getElementById('trainProgressBar').style.width = ((info.epoch / info.totalEpochs) * 100) + '%';
            document.getElementById('trainAccText').textContent = info.accuracy + '%';
            document.getElementById('trainLossText').textContent = info.loss;
            document.getElementById('trainStatusText').textContent = 'Epoch ' + info.epoch + '/' + info.totalEpochs;
        });

        btn.innerHTML = '<i class="fas fa-check-circle"></i> Training Complete!';
        btn.style.background = 'linear-gradient(135deg, #059669, #10b981)';
        document.getElementById('trainStatusText').textContent = '✅ Training Complete!';

        showTrainNotification('🧠 Model trained! ' + result.treeExamples + ' tree + ' + result.notTreeExamples + ' non-tree examples', '#10b981');

        updateTrainingUI();

    } catch (err) {
        btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ' + err.message;
        btn.style.background = 'linear-gradient(135deg, #dc2626, #ef4444)';
    }

    setTimeout(function() {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-graduation-cap"></i> Start Training';
        btn.style.background = 'linear-gradient(135deg,#7c3aed,#8b5cf6)';
        btn.style.opacity = '1';
    }, 3000);
}

function clearTrainingData() {
    if (!confirm('Clear ALL training data and the trained model? This cannot be undone.')) return;

    if (treeTrainer) treeTrainer.clearAllData();
    updateTrainingUI();

    document.getElementById('trainingProgress').style.display = 'none';
    showTrainNotification('🗑️ Training data cleared', '#f59e0b');
}

function updateTrainingUI() {
    if (!treeTrainer) return;

    var stats = treeTrainer.getStats();

    var treeEl = document.getElementById('treeExCount');
    var notTreeEl = document.getElementById('notTreeExCount');
    var statusBadge = document.getElementById('modelStatusBadge');

    if (treeEl) treeEl.textContent = stats.treeExamples;
    if (notTreeEl) notTreeEl.textContent = stats.notTreeExamples;

    if (statusBadge) {
        if (stats.isTrained) {
            statusBadge.style.background = 'rgba(16,185,129,0.15)';
            statusBadge.style.border = '1px solid rgba(16,185,129,0.3)';
            statusBadge.style.color = '#10b981';
            statusBadge.innerHTML = '<i class="fas fa-check-circle"></i> Custom model ACTIVE — detection improved with ' + stats.total + ' training examples';
        } else if (stats.total > 0) {
            statusBadge.style.background = 'rgba(245,158,11,0.15)';
            statusBadge.style.border = '1px solid rgba(245,158,11,0.3)';
            statusBadge.style.color = '#f59e0b';
            statusBadge.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + stats.total + ' examples added — need to train (' + (Math.max(0, 3 - stats.treeExamples)) + ' more tree, ' + (Math.max(0, 3 - stats.notTreeExamples)) + ' more non-tree needed)';
        } else {
            statusBadge.style.background = 'rgba(255,255,255,0.05)';
            statusBadge.style.border = '1px solid rgba(255,255,255,0.1)';
            statusBadge.style.color = 'rgba(255,255,255,0.4)';
            statusBadge.innerHTML = '<i class="fas fa-info-circle"></i> No training data yet — add tree & non-tree photos to start';
        }
    }

    // Update main page badge
    var mainBadge = document.getElementById('trainStatusBadge');
    if (mainBadge) {
        if (stats.isTrained) {
            mainBadge.style.display = 'inline-block';
            mainBadge.innerHTML = '<i class="fas fa-brain"></i> Trained';
            mainBadge.style.background = 'rgba(16,185,129,0.15)';
            mainBadge.style.color = '#10b981';
        } else {
            mainBadge.style.display = 'none';
        }
    }
}

function showTrainNotification(msg, color) {
    var existing = document.getElementById('trainNotif');
    if (existing) existing.remove();

    var notif = document.createElement('div');
    notif.id = 'trainNotif';
    notif.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:' + color + ';color:white;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:600;z-index:10002;box-shadow:0 8px 30px rgba(0,0,0,0.3);animation:slideDownNotif 0.3s ease-out;max-width:90vw;text-align:center;';
    notif.textContent = msg;
    document.body.appendChild(notif);

    setTimeout(function() {
        if (notif.parentNode) {
            notif.style.transition = 'opacity 0.4s';
            notif.style.opacity = '0';
            setTimeout(function() { if (notif.parentNode) notif.remove(); }, 400);
        }
    }, 2500);
}

// Export
window.TreeTrainer = TreeTrainer;
window.treeTrainer = null;
window.initTrainer = initTrainer;
window.openTrainingModal = openTrainingModal;
