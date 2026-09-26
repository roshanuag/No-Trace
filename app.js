// ==========================================
// 1. DOM Elements & State
// ==========================================
const myPinDisplay = document.getElementById('my-pin');
const targetPinInput = document.getElementById('target-pin');
const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const fileInput = document.getElementById('file-input');
const autoSeverToggle = document.getElementById('auto-sever-toggle');

const connectPanel = document.getElementById('connect-panel');
const transferPanel = document.getElementById('transfer-panel');
const remoteCore = document.getElementById('remote-core');
const tetherBeam = document.getElementById('tether-beam');
const targetIdDisplay = document.getElementById('target-id-display');
const reconnectWarning = document.getElementById('reconnect-warning');

const progressWrapper = document.getElementById('progress-wrapper');
const progressBar = document.getElementById('progress-bar');
const transferStatus = document.getElementById('transfer-status');
const transferPercent = document.getElementById('transfer-percent');
const queueStatus = document.getElementById('queue-status');

// WebRTC State
let peer;
let conn;
const CHUNK_SIZE = 256 * 1024; 
let lastTargetId = null;
let intentionalDisconnect = false;
let reconnectInterval = null;

// Multi-File Queue State
let fileQueue = [];
let totalFilesInQueue = 0;
let fileToSend = null;
let fileOffset = 0;
let fileReader = new FileReader();

// Receiver State
let incomingFileInfo = null;
let receivedBuffers = [];
let receivedBytes = 0;

// ==========================================
// 2. Initialize PeerJS & Connect Logic
// ==========================================
const myId = Math.random().toString(36).substring(2, 7).toUpperCase();

peer = new Peer(myId, { debug: 2 });

peer.on('open', (id) => {
    myPinDisplay.textContent = id;
});

peer.on('connection', (connection) => {
    if (conn && conn.open && connection.peer !== lastTargetId) {
        connection.close(); // Reject third wheels
        return;
    }
    setupConnection(connection);
});

connectBtn.addEventListener('click', () => {
    const targetId = targetPinInput.value.trim().toUpperCase();
    if (!targetId || targetId === myId) return alert('Invalid Target ID');
    
    lastTargetId = targetId;
    intentionalDisconnect = false;
    connectBtn.innerHTML = 'Establishing...';
    
    const connection = peer.connect(targetId, { reliable: true });
    setupConnection(connection);
});

// ==========================================
// 3. Connection & Ping-Pong Data Channel
// ==========================================
function setupConnection(connection) {
    conn = connection;

    conn.on('open', () => {
        clearInterval(reconnectInterval);
        tetherBeam.classList.remove('reconnecting');
        reconnectWarning.classList.add('hidden');
        showTetherUI(conn.peer);
        
        // If we reconnected and have a file hanging, request resume
        if (fileToSend && fileOffset > 0) {
            conn.send(JSON.stringify({ type: 'resume-check', name: fileToSend.name }));
        }
    });

    conn.on('data', (data) => {
        if (typeof data === 'string') {
            const msg = JSON.parse(data);
            
            // RECEIVER: Incoming new file
            if (msg.type === 'header') {
                incomingFileInfo = msg;
                receivedBuffers = [];
                receivedBytes = 0;
                showProgressUI();
                updateProgress(0, incomingFileInfo.size, "Receiving payload...");
                conn.send(JSON.stringify({ type: 'ack-header', offset: 0 }));
            }
            
            // RECEIVER: Sender is asking to resume a broken connection
            else if (msg.type === 'resume-check') {
                if (incomingFileInfo && msg.name === incomingFileInfo.name) {
                    // Send back how much we already downloaded
                    conn.send(JSON.stringify({ type: 'ack-header', offset: receivedBytes }));
                } else {
                    conn.send(JSON.stringify({ type: 'ack-header', offset: 0 }));
                }
            }
            
            // SENDER: Receiver acknowledges header/resume, start sending chunks
            else if (msg.type === 'ack-header') {
                fileOffset = msg.offset; // Fast-forward if resuming
                showProgressUI();
                readNextChunk();
            }

            // SENDER: Chunk received, send next
            else if (msg.type === 'ack-chunk') {
                readNextChunk();
            }

            // SENDER: Receiver successfully saved file
            else if (msg.type === 'file-complete') {
                processNextFileInQueue();
            }
        } 
        
        // RECEIVER: Processing incoming binary chunks
        else if (data instanceof ArrayBuffer) {
            receivedBuffers.push(data);
            receivedBytes += data.byteLength;
            
            updateProgress(receivedBytes, incomingFileInfo.size, "Downloading...");

            if (receivedBytes < incomingFileInfo.size) {
                conn.send(JSON.stringify({ type: 'ack-chunk' }));
            } else {
                finishDownload();
                conn.send(JSON.stringify({ type: 'file-complete' }));
            }
        }
    });

    conn.on('close', handleDisconnect);
    conn.on('error', handleDisconnect);
}

// ==========================================
// 4. Disconnect & Ghost Reconnect Logic
// ==========================================
function handleDisconnect() {
    if (intentionalDisconnect) {
        hideTetherUI();
        return;
    }
    
    // Ghost Reconnect: Visual warning and auto-ping
    tetherBeam.classList.add('reconnecting');
    reconnectWarning.classList.remove('hidden');
    transferStatus.textContent = "Connection lost. Attempting reconnect...";
    
    clearInterval(reconnectInterval);
    reconnectInterval = setInterval(() => {
        if (lastTargetId) {
            console.log("Attempting ghost reconnect to:", lastTargetId);
            const connection = peer.connect(lastTargetId, { reliable: true });
            setupConnection(connection);
        }
    }, 3000);
}

disconnectBtn.addEventListener('click', executeSever);

function executeSever() {
    intentionalDisconnect = true;
    clearInterval(reconnectInterval);
    if (conn) conn.close();
    hideTetherUI();
    fileQueue = []; // Clear queue on abort
}

// ==========================================
// 5. Sender Logic: Queue & Slicing
// ==========================================
function queueFiles(files) {
    if (!conn || !conn.open) return;
    
    for (let file of files) {
        fileQueue.push(file);
    }
    
    if (!fileToSend) {
        totalFilesInQueue = fileQueue.length;
        processNextFileInQueue();
    } else {
        totalFilesInQueue += files.length;
        updateQueueUI();
    }
}

function processNextFileInQueue() {
    if (fileQueue.length === 0) {
        // Queue is empty. Check Auto-Sever.
        fileToSend = null;
        updateProgress(1, 1, "All files transferred!");
        setTimeout(resetProgressUI, 2000);
        
        if (autoSeverToggle.checked) {
            setTimeout(executeSever, 1000);
        }
        return;
    }

    fileToSend = fileQueue.shift();
    fileOffset = 0;
    updateQueueUI();
    
    conn.send(JSON.stringify({
        type: 'header',
        name: fileToSend.name,
        size: fileToSend.size,
        mime: fileToSend.type
    }));
}

function updateQueueUI() {
    const current = totalFilesInQueue - fileQueue.length;
    queueStatus.textContent = `File ${current} of ${totalFilesInQueue}`;
}

function readNextChunk() {
    if (fileOffset >= fileToSend.size) return; // Wait for 'file-complete' ping

    const slice = fileToSend.slice(fileOffset, fileOffset + CHUNK_SIZE);
    fileReader.readAsArrayBuffer(slice);
}

fileReader.onload = (e) => {
    const chunk = e.target.result;
    conn.send(chunk);
    fileOffset += chunk.byteLength;
    updateProgress(fileOffset, fileToSend.size, `Encrypting ${fileToSend.name}...`);
};

// ==========================================
// 6. Receiver Logic: File Assembly
// ==========================================
function finishDownload() {
    updateProgress(incomingFileInfo.size, incomingFileInfo.size, "Assembling File...");
    
    const blob = new Blob(receivedBuffers, { type: incomingFileInfo.mime });
    const downloadUrl = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = incomingFileInfo.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(downloadUrl);
}

// ==========================================
// 7. UI Management & Drag-and-Drop
// ==========================================
function showTetherUI(targetId) {
    lastTargetId = targetId;
    targetIdDisplay.textContent = targetId;
    connectPanel.classList.add('hidden');
    transferPanel.classList.remove('hidden');
    remoteCore.classList.remove('hidden');
    tetherBeam.classList.remove('hidden');
    connectBtn.innerHTML = 'Engage Link <i class="ph-bold ph-arrow-right"></i>';
}

function hideTetherUI() {
    connectPanel.classList.remove('hidden');
    transferPanel.classList.add('hidden');
    remoteCore.classList.add('hidden');
    tetherBeam.classList.add('hidden');
    targetPinInput.value = '';
    resetProgressUI();
}

function showProgressUI() { progressWrapper.classList.remove('hidden'); }

function resetProgressUI() {
    progressWrapper.classList.add('hidden');
    progressBar.value = 0;
    transferPercent.textContent = '0%';
}

function updateProgress(current, total, message) {
    const percent = Math.round((current / total) * 100);
    progressBar.value = percent;
    transferPercent.textContent = percent + '%';
    transferStatus.textContent = message;
}

// Drag & Drop
const stage = document.body;
stage.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (conn && conn.open) stage.style.opacity = '0.7';
});

stage.addEventListener('dragleave', (e) => {
    e.preventDefault();
    stage.style.opacity = '1';
});

stage.addEventListener('drop', (e) => {
    e.preventDefault();
    stage.style.opacity = '1';
    if (!conn || !conn.open) return;
    if (e.dataTransfer.files.length > 0) queueFiles(e.dataTransfer.files);
});

// Button Input fallback
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) queueFiles(e.target.files);
});