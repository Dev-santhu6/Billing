/**
 * Barcode Scanner Module
 * Uses ZXing library for barcode scanning via camera
 * Optimized for mobile devices
 */

let codeReader = null;
let scanning = false;
let videoElement = null;
let canvasElement = null;
let stream = null;

/**
 * Initialize the barcode scanner
 */
function initScanner() {
    if (typeof ZXing === 'undefined') {
        console.error('ZXing library not loaded');
        return false;
    }

    try {
        codeReader = new ZXing.BrowserMultiFormatReader();
        videoElement = document.getElementById('scannerVideo');
        canvasElement = document.getElementById('scannerCanvas');
        
        // Set video attributes for mobile
        if (videoElement) {
            videoElement.setAttribute('playsinline', 'true');
            videoElement.setAttribute('webkit-playsinline', 'true');
            videoElement.setAttribute('autoplay', 'true');
            videoElement.setAttribute('muted', 'true');
        }
        
        return true;
    } catch (error) {
        console.error('Failed to initialize scanner:', error);
        return false;
    }
}

/**
 * Start scanning barcode from camera
 */
async function startScanning(onSuccess, onError) {
    if (!codeReader) {
        if (!initScanner()) {
            onError('Scanner not available');
            return;
        }
    }

    if (scanning) {
        stopScanning();
    }

    try {
        // Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            onError('Camera access not supported. Please use HTTPS or localhost.');
            return;
        }

        // Get available video devices
        let videoInputDevices = [];
        try {
            videoInputDevices = await codeReader.listVideoInputDevices();
        } catch (error) {
            console.log('Could not list devices, will use default constraints');
        }
        
        if (videoInputDevices.length === 0) {
            // Try to get camera with default constraints (for mobile)
            console.log('No devices listed, using default camera');
        }

        // Select camera device (prefer rear camera on mobile)
        let selectedDeviceId = null;
        if (videoInputDevices.length > 0) {
            // Try to find rear camera first
            const rearCamera = videoInputDevices.find(device => {
                const label = device.label.toLowerCase();
                return label.includes('back') || 
                       label.includes('rear') || 
                       label.includes('environment') ||
                       label.includes('facing back');
            });
            
            selectedDeviceId = rearCamera ? rearCamera.deviceId : videoInputDevices[0].deviceId;
        }

        scanning = true;
        const statusElement = document.getElementById('scannerStatus');
        if (statusElement) {
            statusElement.textContent = 'Scanning... Point camera at barcode';
        }

        // Mobile-friendly video constraints
        const constraints = {
            video: {
                facingMode: { ideal: 'environment' }, // Prefer rear camera
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };

        // If we have a device ID, use it
        if (selectedDeviceId) {
            constraints.video.deviceId = { exact: selectedDeviceId };
        }

        // Request camera access with constraints
        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            if (videoElement) {
                videoElement.srcObject = stream;
                await videoElement.play();
            }
        } catch (mediaError) {
            console.error('Media access error:', mediaError);
            // Try with simpler constraints
            try {
                const simpleConstraints = {
                    video: {
                        facingMode: { ideal: 'environment' }
                    }
                };
                stream = await navigator.mediaDevices.getUserMedia(simpleConstraints);
                if (videoElement) {
                    videoElement.srcObject = stream;
                    await videoElement.play();
                }
            } catch (simpleError) {
                scanning = false;
                onError('Camera access denied. Please allow camera permissions.');
                return;
            }
        }

        // Wait a bit for video to be ready
        await new Promise(resolve => setTimeout(resolve, 300));

        // Start decoding from video stream
        // Use decodeFromVideoDevice if we have a device ID, otherwise use decodeFromVideoElement
        if (selectedDeviceId && videoInputDevices.length > 0) {
            codeReader.decodeFromVideoDevice(
                selectedDeviceId,
                videoElement,
                (result, error) => {
                    if (result) {
                        const barcode = result.getText();
                        stopScanning();
                        onSuccess(barcode);
                    }
                    if (error && error.name !== 'NotFoundException' && error.name !== 'NotFoundError') {
                        console.error('Scan error:', error);
                    }
                }
            );
        } else {
            // Fallback: Use continuous decode from video element (better for mobile)
            const decodeContinuously = async () => {
                if (!scanning || !videoElement) return;
                
                try {
                    const result = await codeReader.decodeFromVideoElement(videoElement);
                    if (result) {
                        const barcode = result.getText();
                        stopScanning();
                        onSuccess(barcode);
                        return;
                    }
                } catch (error) {
                    // NotFoundError is expected when no barcode is visible
                    if (error.name !== 'NotFoundException' && error.name !== 'NotFoundError') {
                        console.error('Decode error:', error);
                    }
                }
                
                // Continue scanning
                if (scanning) {
                    setTimeout(decodeContinuously, 100);
                }
            };
            
            // Start continuous decoding after video is ready
            setTimeout(() => {
                if (scanning) {
                    decodeContinuously();
                }
            }, 500);
        }
    } catch (error) {
        console.error('Failed to start scanning:', error);
        scanning = false;
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            onError('Camera permission denied. Please allow camera access in browser settings.');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            onError('No camera found on this device.');
        } else {
            onError(error.message || 'Failed to start camera. Please try again.');
        }
    }
}

/**
 * Stop scanning
 */
function stopScanning() {
    if (scanning) {
        scanning = false;
        
        // Stop video stream
        if (stream) {
            stream.getTracks().forEach(track => {
                track.stop();
            });
            stream = null;
        }
        
        // Clear video element
        if (videoElement) {
            videoElement.srcObject = null;
            videoElement.pause();
        }
        
        // Reset code reader
        if (codeReader) {
            try {
                codeReader.reset();
            } catch (error) {
                console.error('Error resetting code reader:', error);
            }
        }
        
        const statusElement = document.getElementById('scannerStatus');
        if (statusElement) {
            statusElement.textContent = 'Scanner stopped';
        }
    }
}

/**
 * Scan barcode from image file
 */
async function scanFromImage(file, onSuccess, onError) {
    if (!codeReader) {
        if (!initScanner()) {
            onError('Scanner not available');
            return;
        }
    }

    try {
        const result = await codeReader.decodeFromImageFile(file);
        onSuccess(result.getText());
    } catch (error) {
        onError('Could not read barcode from image');
    }
}

// Make functions globally available
window.initScanner = initScanner;
window.startScanning = startScanning;
window.stopScanning = stopScanning;
window.scanFromImage = scanFromImage;

// Export functions for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initScanner, startScanning, stopScanning, scanFromImage };
}

