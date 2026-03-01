/* Camera Photo Taking Guide - Visual Instructions */

// Show visual guide when camera opens
function showCameraGuide() {
    const guide = document.createElement('div');
    guide.id = 'cameraGuide';
    guide.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(10, 22, 40, 0.98);
        z-index: 10002;
        display: flex;
        flex-direction: column;
        align-items: center;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        padding: 20px;
        animation: fadeIn 0.3s ease-out;
    `;
    
    guide.innerHTML = `
        <div style="max-width: 600px; text-align: center; color: white; margin: auto; padding: 20px 0;">
            <h2 style="color: #10b981; font-size: 1.8rem; margin-bottom: 20px;">
                <i class="fas fa-camera"></i> How to Take the Right Photo?
            </h2>

            <div style="background: rgba(16,185,129,0.1); border: 2px solid rgba(16,185,129,0.3); border-radius: 16px; padding: 20px; margin: 20px 0;">
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 500'%3E%3Crect fill='%236ee7b7' opacity='0.1' width='400' height='500'/%3E%3Cline x1='50' y1='200' x2='350' y2='200' stroke='%2310b981' stroke-width='3' stroke-dasharray='5,5'/%3E%3Ctext x='360' y='205' fill='%2310b981' font-size='14' font-weight='bold'%3E1.37m%3C/text%3E%3Cellipse cx='200' cy='250' rx='40' ry='60' fill='%238b4513' stroke='%23654321' stroke-width='3'/%3E%3Ccircle cx='200' cy='200' r='8' fill='%23ef4444'/%3E%3Cpath d='M200,100 Q150,150 200,400' stroke='%2310b981' stroke-width='8' fill='none'/%3E%3Ctext x='200' y='470' fill='white' font-size='16' text-anchor='middle'%3ETree Trunk%3C/text%3E%3Ctext x='100' y='220' fill='%23fbbf24' font-size='18' font-weight='bold'%3E📸%3C/text%3E%3C/svg%3E"
                     style="width: 200px; height: auto; margin: 10px auto; display: block;">

                <div style="text-align: left; margin-top: 15px;">
                    <h3 style="color: #10b981; font-size: 1.2rem; margin-bottom: 12px;">
                        <i class="fas fa-check-circle"></i> Key Instructions:
                    </h3>

                    <div style="display: flex; align-items: start; margin: 10px 0; gap: 10px;">
                        <span style="color: #10b981; font-size: 1.5rem;">1️⃣</span>
                        <div>
                            <strong style="color: #34d399;">Distance:</strong> Stand <strong>2–3 meters away</strong> from the tree
                        </div>
                    </div>

                    <div style="display: flex; align-items: start; margin: 10px 0; gap: 10px;">
                        <span style="color: #10b981; font-size: 1.5rem;">2️⃣</span>
                        <div>
                            <strong style="color: #34d399;">Height:</strong> Hold phone at <strong>chest height (1.37m)</strong> — standard DBH level
                        </div>
                    </div>

                    <div style="display: flex; align-items: start; margin: 10px 0; gap: 10px;">
                        <span style="color: #10b981; font-size: 1.5rem;">3️⃣</span>
                        <div>
                            <strong style="color: #34d399;">Focus:</strong> Keep the tree <strong>trunk centered</strong> in the frame
                        </div>
                    </div>

                    <div style="display: flex; align-items: start; margin: 10px 0; gap: 10px;">
                        <span style="color: #10b981; font-size: 1.5rem;">4️⃣</span>
                        <div>
                            <strong style="color: #34d399;">Lighting:</strong> Take photo in <strong>good natural light</strong> (morning or evening is best)
                        </div>
                    </div>

                    <div style="display: flex; align-items: start; margin: 10px 0; gap: 10px;">
                        <span style="color: #10b981; font-size: 1.5rem;">5️⃣</span>
                        <div>
                            <strong style="color: #34d399;">Frame:</strong> Both the <strong>trunk and some leaves</strong> should be visible
                        </div>
                    </div>

                    <div style="display: flex; align-items: start; margin: 10px 0; gap: 10px;">
                        <span style="color: #10b981; font-size: 1.5rem;">6️⃣</span>
                        <div>
                            <strong style="color: #34d399;">Background:</strong> Person or bike in frame? <strong>No problem</strong> — AI ignores them automatically ✅
                        </div>
                    </div>
                </div>
            </div>

            <div style="background: rgba(239,68,68,0.1); border: 2px solid rgba(239,68,68,0.2); border-radius: 12px; padding: 15px; margin: 15px 0; text-align: left;">
                <h4 style="color: #f87171; margin-bottom: 8px;">
                    <i class="fas fa-exclamation-triangle"></i> Common Mistakes to Avoid:
                </h4>
                <div style="font-size: 0.9rem; color: rgba(255,255,255,0.8);">
                    ❌ Too close to the tree (causes distortion)<br>
                    ❌ Too far away (trunk becomes blurry)<br>
                    ❌ Only leaves in frame — trunk must be visible<br>
                    ❌ Dark or blurry photo<br>
                    ❌ Camera tilted sideways (keep it vertical)
                </div>
            </div>

            <div style="background: rgba(16,185,129,0.07); border: 1px solid rgba(16,185,129,0.2); border-radius: 12px; padding: 12px 16px; margin: 10px 0; text-align: left; font-size: 0.88rem; color: rgba(255,255,255,0.7);">
                <i class="fas fa-lightbulb" style="color:#fbbf24;"></i>
                <strong style="color:#fbbf24;"> Pro Tip:</strong>
                After detection, tap the <strong style="color:#10b981;">circumference value</strong> directly on screen to auto-fill it instantly.
            </div>

            <div style="display: flex; gap: 15px; justify-content: center; margin-top: 25px; flex-wrap: wrap;">
                <button onclick="closeCameraGuide()" style="padding: 14px 32px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 12px; font-size: 1rem; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(16,185,129,0.4); transition: all 0.3s;">
                    <i class="fas fa-check-circle"></i> Got it, Take Photo
                </button>
                <button onclick="viewExamplePhotos()" style="padding: 14px 32px; background: rgba(59,130,246,0.2); color: #60a5fa; border: 2px solid rgba(59,130,246,0.3); border-radius: 12px; font-size: 1rem; font-weight: 600; cursor: pointer;">
                    <i class="fas fa-images"></i> Example Photos
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(guide);
}

// Close guide
function closeCameraGuide() {
    const guide = document.getElementById('cameraGuide');
    if (guide) {
        guide.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => guide.remove(), 300);
    }
}

// Show example photos
function viewExamplePhotos() {
    alert('✅ GOOD Photo:\n• Tree 2-3 meters away\n• Trunk centered in frame\n• Good natural lighting\n• Camera at chest height (1.37m)\n• Trunk + leaves both visible\n\n❌ BAD Photo:\n• Too close or too far\n• Only leaves, no trunk\n• Dark or blurry\n• Camera tilted sideways\n• Indoor / non-tree objects');
}

// Add animation styles
if (!document.getElementById('cameraGuideStyles')) {
    const style = document.createElement('style');
    style.id = 'cameraGuideStyles';
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeOut {
            from { opacity: 1; transform: scale(1); }
            to { opacity: 0; transform: scale(0.95); }
        }
    `;
    document.head.appendChild(style);
}

// Auto-show guide when camera button is clicked
window.addEventListener('DOMContentLoaded', () => {
    // v2 = English guide — show once for updated version
    const GUIDE_VERSION = 'cameraGuideShown_v2';

    const openCameraBtn = document.getElementById('openCameraBtn');
    if (openCameraBtn) {
        const originalOnClick = openCameraBtn.onclick;
        openCameraBtn.addEventListener('click', (e) => {
            // Check if user has seen guide before
            const hasSeenGuide = localStorage.getItem(GUIDE_VERSION);
            if (!hasSeenGuide) {
                e.stopPropagation();
                e.preventDefault();
                showCameraGuide();
                localStorage.setItem(GUIDE_VERSION, 'true');
                
                // After guide is closed, trigger original camera open
                document.getElementById('cameraGuide').addEventListener('click', (evt) => {
                    if (evt.target.tagName === 'BUTTON' && (evt.target.textContent.includes('Photo') || evt.target.textContent.includes('Got it'))) {
                        setTimeout(() => {
                            document.getElementById('cameraFileInput').click();
                        }, 400);
                    }
                });
            }
        }, { capture: true });
    }
});

// Add "Show Guide Again" option
window.showCameraGuideAgain = function() {
    localStorage.removeItem('cameraGuideShown_v2');
    showCameraGuide();
};
