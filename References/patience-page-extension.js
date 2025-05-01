const EXTENSION_ID = 'afkpnpkodeiolpnfnbdokgkclljpgmcm';

async function waitForListener(maxRetries = 20, initialDelay = 100) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        let delay = initialDelay;
        let timeoutId;

        function sendPing() {
            if (attempts >= maxRetries) {
                console.warn("❌ No listener detected after maximum retries.");
                clearTimeout(timeoutId)
                reject(new Error("Listener not found"));
                return;
            }

            console.log(`🔄 Sending ping attempt ${attempts + 1}/${maxRetries}...`);

            chrome.runtime.sendMessage(EXTENSION_ID, 
                {
                    type: 'ping',
                },
                (response) => {
                    if (response?.result === 'pong') {
                        console.log("✅ Listener detected!");
                        clearTimeout(timeoutId);
                        resolve(true);
                    } else {
                        console.warn("❌ No listener detected, retrying...");
                        timeoutId = setTimeout(() => {
                            attempts++;
                            delay *= 2; // Exponential backoff (100ms → 200ms → 400ms...)
                            sendPing();
                        }, delay);
                    }
                }
            );
        }

        sendPing(); // Start the first attempt
    });
}

function createCoolScienceElement() {
    // Create container
    const container = document.createElement('div');
    container.style.justifyContent = 'center';
    container.style.alignItems = 'center';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.textAlign = 'center';
    container.style.height = '100vh'; // Full viewport height
    container.style.color = '#ffffff';
    container.style.backgroundColor = '#282c34'; // Dark background
    container.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)'; // Shadow effect
    container.style.animation = 'fadeIn 2s ease-in-out'; // Fade-in animation
    container.setAttribute('tabindex', '0'); // To allow focus

    // Add header
    const header = document.createElement('h2');
    header.style.paddingTop = '100px';
    header.innerText = 'We’re setting things up…';
    header.style.fontSize = '36px';
    container.appendChild(header);

    // Add message
    const message = document.createElement('p');
    message.innerHTML = '<strong>Please do not navigate away from this page until setup is complete.</strong>';
    message.style.fontSize = '30px';
    container.appendChild(message);

    // Create dots wrapper
    const dotsWrapper = document.createElement('div');
    dotsWrapper.style.display = 'flex';
    dotsWrapper.style.justifyContent = 'center';
    dotsWrapper.style.gap = '15px';
    dotsWrapper.style.marginTop = '30px';
    container.appendChild(dotsWrapper);

    // Create and style dots
    const dots = [];
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.style.width = '16px';
        dot.style.height = '16px';
        dot.style.borderRadius = '50%';
        dot.style.backgroundColor = '#ccc';
        dotsWrapper.appendChild(dot);
        dots.push(dot);
    }

    // Animation logic
    let activeIndex = 0;
    setInterval(() => {
    dots.forEach((dot, i) => {
        dot.style.backgroundColor = (i !== activeIndex) ? '#333' : '#ccc';
    });
    activeIndex = (activeIndex + 1) % dots.length;
    }, 400); // Change dot every 400ms

    return container;
}

function createOverlay() {
    // Check if the overlay already exists
    if (document.getElementById('overlay')) {
        console.log('Overlay already exists.');
        return;
    }

    // Create a new div element for the overlay
    var overlay = document.createElement('div');
    overlay.id = 'overlay';

    // Set styles to cover the entire viewport
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // Semi-transparent black
    overlay.style.zIndex = '9999'; // Ensure it is on top
    overlay.style.display = 'block'; // Make it visible

    return overlay;
}

class Body {
    constructor() {
        this.element = document.querySelector("body");
        this.parent = this.element && this.element.parentElement;
        this.overlay = createOverlay();
        this.doingScience = createCoolScienceElement();

        this.element.appendChild(this.overlay);
    }

    remove() {
        if (this.element) {
            if (document.activeElement) {
                document.activeElement.blur();
            }

            this.overlay.style.display = 'block';
            this.overlay.appendChild(this.doingScience);

            this.doingScience.addEventListener('keydown', (e) => {
                // Prevent Tab key from navigating out
                if (e.key === 'Tab') {
                    e.preventDefault();
                }
            });
            this.doingScience.focus();
            this.doingScience.onblur = () => {
                this.doingScience.focus();
            }
        }
    }

    add() {
        if (this.parent) {
            this.doingScience.remove();
            this.overlay.style.display = 'none';
        }
    }
}

// FIXME: For some reason the the `onDisconnect` block is running multiple times in parallel
async function removeUntilListener(body) {
    body.remove();
    let port = chrome.runtime.connect(EXTENSION_ID, { name: 'cenlar-loan-checker' });
    port.onDisconnect.addListener(async () => {
        console.log('Port disconnected');
        if (chrome.runtime.lastError) {
            console.error('Connection error:', chrome.runtime.lastError);
        }
        await removeUntilListener(body);
    });
    await waitForListener();
    body.add();
}

$(document.body).ready(async function() {
    const body = new Body();
    await removeUntilListener(body);
});