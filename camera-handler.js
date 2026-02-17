// Camera Handler for Tree Measurement
// Uses native camera (file input) → ML analysis

let mlMeasurement = null;
let advancedML = null;

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

                // Start analysis
                await analyzePhoto(resultCanvas);
            };
            img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
    });

    // ===== Analyze the photo =====
    async function analyzePhoto(canvas) {
        const statusEl = document.getElementById('analysisStatus');
        const errorEl = document.getElementById('analysisError');
        const errorText = document.getElementById('analysisErrorText');
        const resultsEl = document.getElementById('measurementResults');
        const retakeTopEl = document.getElementById('retakeTopBtn');

        statusEl.style.display = 'block';
        errorEl.style.display = 'none';
        resultsEl.style.display = 'none';
        retakeTopEl.style.display = 'none';

        try {
            await advancedML.loadModels();
            const measurements = await advancedML.measureAutomatically(canvas);

            // Draw detection overlay on canvas
            advancedML.drawDetectionOverlay(canvas, measurements.bounds, measurements);

            // Fill results
            document.getElementById('detectedHeight').textContent = measurements.height;
            document.getElementById('detectedWidth').textContent = measurements.trunkWidth;
            document.getElementById('detectedCircumference').textContent = measurements.circumference;
            document.getElementById('detectedConfidence').textContent = measurements.confidence;

            statusEl.style.display = 'none';
            resultsEl.style.display = 'block';
            retakeTopEl.style.display = 'inline-block';

            // Add method details
            addMethodInfo(resultsEl, measurements);

        } catch (error) {
            console.error('Analysis error:', error);
            statusEl.style.display = 'none';
            errorEl.style.display = 'block';
            errorText.textContent = error.message || 'Could not analyze tree. Please retake photo.';
            retakeTopEl.style.display = 'none';
        }
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

        let methodText = '';
        if (measurements.methodDetails) {
            methodText = measurements.methodDetails.map(function(m) {
                return '<b>' + m.name.replace('_', ' ') + '</b>: ' + m.value.toFixed(1) + ' cm';
            }).join(' | ');
        }

        extraInfo.innerHTML = `
            <div style="margin-bottom: 5px;">
                <i class="fas fa-brain" style="color: #a78bfa;"></i>
                <b>Methods:</b> ${methodText}
            </div>
            ${measurements.species ? '<div><i class="fas fa-leaf" style="color: #10b981;"></i> Calibrated for: <b>' + measurements.species + '</b></div>' : '<div style="color: #f59e0b;"><i class="fas fa-exclamation-triangle"></i> Select species for better accuracy</div>'}
            <div style="margin-top: 4px;"><i class="fas fa-bolt" style="color: #f59e0b;"></i> Processed in ${measurements.processingTime || '?'}ms</div>
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
        const extraInfo = document.querySelector('.extra-measurement-info');
        if (extraInfo) extraInfo.remove();
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
            <div style="font-size: 22px;">${circumferenceValue.toFixed(1)} cm</div>
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
