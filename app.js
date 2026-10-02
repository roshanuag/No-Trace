/* =========================================================
   NO-TRACE
   Frontend / Hackathon Prototype
   ========================================================= */


/* =========================
   GLOBAL STATE
========================= */

const state = {

    roomId: generateRoomId(),

    files: [],

    connected: false,

    transferRunning: false,

    destroyAfter: true,

    requireApproval: true,

    expirySeconds: 600,

    transferProgress: 0,

    currentFile: null
};


/* =========================
   PAGE NAVIGATION
========================= */

function showPage(pageId) {

    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    const page = document.getElementById(pageId);

    if (page) {
        page.classList.add("active");
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================
   HOME BUTTONS
========================= */

document
    .getElementById("sendCard")
    .addEventListener("click", () => {

        initializeSender();

        showPage("sendPage");
    });


document
    .getElementById("receiveCard")
    .addEventListener("click", () => {

        showPage("receivePage");
    });


/* =========================
   ROOM ID
========================= */

function generateRoomId() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let id = "";

    for (let i = 0; i < 8; i++) {

        id += characters[
            Math.floor(
                Math.random() * characters.length
            )
        ];
    }

    return id;
}



function initializeSender() {
    state.roomId = generateRoomId();

    document.getElementById("roomId").textContent =
        state.roomId;

    createQRCode();
    startRoomTimer();

    if (
        signalingSocket &&
        signalingSocket.readyState === WebSocket.OPEN
    ) {
        signalingSocket.send(JSON.stringify({
            type: "create-room",
            roomId: state.roomId
        }));

        console.log("Creating room:", state.roomId);
        showToast("Room created: " + state.roomId);
    } else {
        showToast("Signaling server is not connected");
        console.error("Cannot create room: WebSocket is not open");
    }
}


/* =========================
   QR CODE
========================= */

function createQRCode() {

    const qrContainer =
        document.getElementById("qrcode");

    qrContainer.innerHTML = "";

    /*
        In the real application this should contain
        your signaling URL + room ID.

        Example:

        https://yourapp.com/connect?room=S2RSI8XK
    */

    const connectionURL =
        `${window.location.origin}${window.location.pathname}?room=${state.roomId}`;

    if (typeof QRCode !== "undefined") {

        new QRCode(qrContainer, {

            text: connectionURL,

            width: 95,

            height: 95,

            colorDark: "#111827",

            colorLight: "#ffffff",

            correctLevel: QRCode.CorrectLevel.M
        });
    }
}


/* =========================
   COPY ROOM
========================= */

function copyRoomId() {

    navigator.clipboard
        .writeText(state.roomId)
        .then(() => {

            showToast(
                "Room ID copied"
            );

        })
        .catch(() => {

            showToast(
                "Room ID: " + state.roomId
            );

        });
}


/* =========================
   ROOM EXPIRY
========================= */

let roomTimer;

function startRoomTimer() {

    clearInterval(roomTimer);

    state.expirySeconds = 600;

    updateExpiryDisplay();

    roomTimer = setInterval(() => {

        state.expirySeconds--;

        updateExpiryDisplay();

        if (state.expirySeconds <= 0) {

            clearInterval(roomTimer);

            showToast(
                "Transfer room expired"
            );

            state.connected = false;
        }

    }, 1000);
}


function updateExpiryDisplay() {

    const minutes =
        Math.floor(state.expirySeconds / 60);

    const seconds =
        state.expirySeconds % 60;

    document.getElementById(
        "expiryTimer"
    ).textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}


/* =========================
   FILE INPUT
========================= */

const fileInput =
    document.getElementById("fileInput");

const dropZone =
    document.getElementById("dropZone");


fileInput.addEventListener(
    "change",
    event => {

        addFiles(
            Array.from(event.target.files)
        );

    }
);


/* =========================
   DRAG & DROP
========================= */

dropZone.addEventListener(
    "dragover",
    event => {

        event.preventDefault();

        dropZone.classList.add("dragging");

    }
);


dropZone.addEventListener(
    "dragleave",
    () => {

        dropZone.classList.remove(
            "dragging"
        );

    }
);


dropZone.addEventListener(
    "drop",
    event => {

        event.preventDefault();

        dropZone.classList.remove(
            "dragging"
        );

        addFiles(
            Array.from(event.dataTransfer.files)
        );

    }
);


/* =========================
   ADD FILES
========================= */

function addFiles(newFiles) {

    state.files.push(...newFiles);

    renderFileList();

}


/* =========================
   FILE LIST
========================= */

function renderFileList() {

    const list =
        document.getElementById("fileList");

    const sendButton =
        document.getElementById("sendButton");


    list.innerHTML = "";


    if (state.files.length === 0) {

        list.classList.add("hidden");

        sendButton.classList.add("hidden");

        return;
    }


    list.classList.remove("hidden");

    sendButton.classList.remove("hidden");


    state.files.forEach(
        (file, index) => {

            const item =
                document.createElement("div");

            item.className =
                "file-item";


            item.innerHTML = `

                <div class="file-icon">
                    ${getFileIcon(file)}
                </div>

                <div class="file-info">

                    <strong>
                        ${escapeHTML(file.name)}
                    </strong>

                    <small>
                        ${formatBytes(file.size)}
                    </small>

                </div>

                <button
                    class="remove-file"
                    onclick="removeFile(${index})"
                >
                    ✕
                </button>

            `;


            list.appendChild(item);

        }
    );
}


/* =========================
   REMOVE FILE
========================= */

function removeFile(index) {

    state.files.splice(index, 1);

    renderFileList();
}


/* =========================
   FILE ICON
========================= */

function getFileIcon(file) {

    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();


    if (
        ["jpg", "jpeg", "png", "gif", "webp"]
            .includes(extension)
    ) {
        return "🖼️";
    }


    if (
        ["mp4", "mov", "avi", "mkv"]
            .includes(extension)
    ) {
        return "🎬";
    }


    if (
        ["mp3", "wav", "flac"]
            .includes(extension)
    ) {
        return "🎵";
    }


    if (
        ["zip", "rar", "7z"]
            .includes(extension)
    ) {
        return "📦";
    }


    if (
        ["pdf"]
            .includes(extension)
    ) {
        return "📕";
    }


    if (
        ["doc", "docx", "txt"]
            .includes(extension)
    ) {
        return "📄";
    }


    return "📁";
}


/* =========================
   FORMAT FILE SIZE
========================= */

function formatBytes(bytes) {

    if (bytes === 0)
        return "0 Bytes";


    const units = [
        "Bytes",
        "KB",
        "MB",
        "GB",
        "TB"
    ];


    const index =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );


    return (
        parseFloat(
            (bytes /
                Math.pow(1024, index)
            ).toFixed(2)
        )
        + " "
        + units[index]
    );
}


/* =========================
   SEND BUTTON
========================= */

document
    .getElementById("sendButton")
    .addEventListener(
        "click",
        beginTransfer
    );


/* =========================
   DEMO CONNECTION
========================= */

function simulateConnection() {

    const connectionState =
        document.getElementById(
            "connectionState"
        );


    connectionState.classList.add(
        "connected"
    );


    connectionState.innerHTML = `
        <span></span>
        CONNECTED
    `;


    document.getElementById(
        "receiverDevice"
    ).textContent =
        "REMOTE DEVICE";


    state.connected = true;
}


/*
    This is intentionally simulated for the
    frontend prototype.

    Replace this function with your actual
    WebRTC connection event.
*/

setTimeout(() => {

    /*
        We don't automatically connect because
        the real app should wait for another device.
    */

}, 1000);



/* =========================
   TRANSFER REQUEST / APPROVAL
========================= */

let pendingIncomingRequest = null;

function beginTransfer() {
    if (!state.files || state.files.length === 0) {
        showToast("Select at least one file");
        return;
    }

    if (!dataChannel || dataChannel.readyState !== "open") {
        showToast("Connect to the receiver first");
        return;
    }

    if (state.transferRunning) {
        showToast("A transfer is already in progress");
        return;
    }

    // Ask the RECEIVER for permission.
    // Do not show the approval modal on the sender.
    dataChannel.send(JSON.stringify({
        type: "transfer-request",
        files: state.files.map(file => ({
            name: file.name,
            size: file.size,
            mimeType: file.type || "application/octet-stream"
        }))
    }));

    showToast("Transfer request sent to receiver");
}

function showApprovalModal(request) {
    pendingIncomingRequest = request;

    const files = request.files || [];
    const firstFile = files[0];

    document.getElementById("incomingFileName").textContent =
        files.length > 1
            ? `${firstFile.name} and ${files.length - 1} more file(s)`
            : firstFile.name;

    document.getElementById("incomingFileSize").textContent =
        files.length > 1
            ? `${files.length} files · ${formatBytes(
                files.reduce((total, file) => total + file.size, 0)
            )}`
            : formatBytes(firstFile.size);

    document.getElementById("approvalModal").classList.remove("hidden");
}

function rejectTransfer() {
    document.getElementById("approvalModal").classList.add("hidden");

    if (dataChannel && dataChannel.readyState === "open") {
        dataChannel.send(JSON.stringify({
            type: "transfer-reject"
        }));
    }

    pendingIncomingRequest = null;
    showToast("Transfer declined");
}

function acceptTransfer() {
    if (!pendingIncomingRequest) {
        showToast("No pending transfer request");
        return;
    }

    document.getElementById("approvalModal").classList.add("hidden");

    if (!dataChannel || dataChannel.readyState !== "open") {
        pendingIncomingRequest = null;
        showToast("Sender disconnected");
        return;
    }

    dataChannel.send(JSON.stringify({
        type: "transfer-accept"
    }));

    pendingIncomingRequest = null;
    showToast("Transfer accepted");
}


/* =========================
   START TRANSFER
========================= */


function startTransfer() {
    if (state.files.length === 0) return;

    if (!dataChannel || dataChannel.readyState !== "open") {
        showToast("Data channel is not connected");
        return;
    }

    const file = state.files[0];

    state.transferRunning = true;
    state.transferProgress = 0;
    state.currentFile = file;

    document.getElementById("transferFileName").textContent = file.name;
    document.getElementById("transferFileSize").textContent = formatBytes(file.size);

    showPage("transferPage");
    renderTransferQueue();

    sendFile(file).catch((error) => {
        console.error("File transfer failed:", error);
        state.transferRunning = false;
        showToast("Transfer failed: " + error.message);
    });
}

async function sendFile(file) {
    const channel = dataChannel;
    const chunkSize = 64 * 1024;

    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");
    const progressAmount = document.getElementById("progressAmount");
    const speedElement = document.getElementById("transferSpeed");

    let sentBytes = 0;
    const startTime = Date.now();

    // Tell the receiver what file is coming.
    channel.send(JSON.stringify({
        type: "file-meta",
        name: file.name,
        size: file.size,
        mimeType: file.type || "application/octet-stream"
    }));

    for (let offset = 0; offset < file.size; offset += chunkSize) {
        if (channel.readyState !== "open") {
            throw new Error("Connection closed during transfer");
        }

        // Avoid building up too much buffered data.
        while (channel.bufferedAmount > 4 * 1024 * 1024) {
            if (channel.readyState !== "open") {
                throw new Error("Connection closed during transfer");
            }

            await new Promise(resolve => setTimeout(resolve, 20));
        }

        const chunk = await file.slice(
            offset,
            Math.min(offset + chunkSize, file.size)
        ).arrayBuffer();

        channel.send(chunk);
        sentBytes += chunk.byteLength;

        const progress = file.size === 0
            ? 100
            : (sentBytes / file.size) * 100;

        state.transferProgress = progress;

        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${Math.floor(progress)}%`;
        progressAmount.textContent =
            `${formatBytes(sentBytes)} / ${formatBytes(file.size)}`;

        const elapsedSeconds = Math.max(
            (Date.now() - startTime) / 1000,
            0.001
        );

        const speedMBps = sentBytes / elapsedSeconds / (1024 * 1024);
        speedElement.textContent = `${speedMBps.toFixed(2)} MB/s`;
    }

    // Wait for locally buffered data to be sent.
    while (channel.bufferedAmount > 0) {
        if (channel.readyState !== "open") {
            throw new Error("Connection closed before sending completed");
        }
        await new Promise(resolve => setTimeout(resolve, 20));
    }

    progressBar.style.width = "100%";
    progressText.textContent = "100%";
    progressAmount.textContent =
        `${formatBytes(file.size)} / ${formatBytes(file.size)}`;
    speedElement.textContent = "SENT";

    state.transferRunning = false;
    showToast("File sent successfully");

    setTimeout(transferFinished, 600);
}

/* =========================
   TRANSFER QUEUE
========================= */

function renderTransferQueue() {

    const queue =
        document.getElementById(
            "transferQueue"
        );


    queue.innerHTML = "";


    state.files.forEach(
        (file, index) => {

            const item =
                document.createElement("div");


            item.className =
                "queue-item";


            item.innerHTML = `

                <span>
                    ${getFileIcon(file)}
                </span>

                <strong>
                    ${escapeHTML(file.name)}
                </strong>

                <small>
                    ${index === 0
                        ? "TRANSFERRING"
                        : "WAITING"}
                </small>

            `;


            queue.appendChild(item);

        }
    );
}


/* =========================
   TRANSFER COMPLETE
========================= */

function transferFinished() {

    state.transferRunning = false;


    document
        .getElementById(
            "transferComplete"
        )
        .classList.remove(
            "hidden"
        );


    /*
        In the real implementation:

        If destroyAfter is true:

        1. Close WebRTC data channel
        2. Remove room
        3. Delete signaling state
        4. Clear temporary keys
    */

    if (
        document.getElementById(
            "destroyAfter"
        ).checked
    ) {

        showToast(
            "Transfer complete — room ready to destroy"
        );

    } else {

        showToast(
            "Transfer complete"
        );
    }
}


/* =========================
   DESTROY ROOM
========================= */

function destroyRoom() {

    state.connected = false;

    state.files = [];

    clearInterval(roomTimer);


    document.getElementById(
        "transferComplete"
    ).classList.add("hidden");


    showToast(
        "Connection destroyed"
    );


    setTimeout(() => {

        showPage("homePage");

    }, 1000);
}


/* =========================
   RECEIVE
========================= */


async function connectReceiver() {
    const input = document.getElementById("receiverRoomInput");
    const room = input.value.trim().toUpperCase();
    const status = document.getElementById("receiveStatus");

    if (room.length !== 8) {
        showToast("Enter the 8-character Room ID");
        return;
    }

    if (
        !signalingSocket ||
        signalingSocket.readyState !== WebSocket.OPEN
    ) {
        status.textContent = "Connecting to signaling server...";
        showToast("Signaling server is not connected");
        return;
    }

    status.textContent = "Joining room...";
    status.style.color = "#55b5ff";

    signalingSocket.send(JSON.stringify({
        type: "join-room",
        roomId: room
    }));

    console.log("Joining room:", room);
}


/* =========================
   SIMULATE QR SCAN
========================= */

function simulateScan() {

    showToast(
        "Camera scanner would open here"
    );

    /*
        For production:

        navigator.mediaDevices.getUserMedia({
            video: true
        })

        + QR decoding library.
    */
}


/* =========================
   TOAST
========================= */

let toastTimeout;

function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );


    toast.querySelector("p")
        .textContent =
        message;


    toast.classList.add("show");


    clearTimeout(toastTimeout);


    toastTimeout =
        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 2200);
}


/* =========================
   HTML ESCAPE
========================= */

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text;

    return div.innerHTML;
}


/* =========================================================
   IMPORTANT:
   REAL WEBRTC IMPLEMENTATION GOES HERE
   ========================================================= */


/*

    Architecture:

    SENDER
    ------

    File
      ↓
    Slice into chunks
      ↓
    WebRTC DataChannel
      ↓
    Receiver


    RECEIVER
    --------

    WebRTC DataChannel
      ↓
    Receive chunks
      ↓
    Reassemble Blob
      ↓
    Download file


    You will also need:

    SIGNALING SERVER

    Sender
       │
       │ SDP / ICE
       ↓
    Signaling Server
       │
       ↓
    Receiver


    IMPORTANT:

    The signaling server doesn't have to store
    the actual file.

    It can simply exchange connection information.

*/


/* =========================
   WEBRTC STARTER
========================= */


/*
async function createPeerConnection() {

    const configuration = {

        iceServers: [
            {
                urls: "stun:stun.l.google.com:19302"
            }
        ]

    };


    const peerConnection =
        new RTCPeerConnection(
            configuration
        );


    const dataChannel =
        peerConnection.createDataChannel(
            "file-transfer"
        );


    dataChannel.onopen = () => {

        console.log(
            "Secure data channel opened"
        );

    };


    dataChannel.onclose = () => {

        console.log(
            "Data channel closed"
        );

    };


    dataChannel.onmessage = event => {

        console.log(
            "Received chunk",
            event.data
        );

    };


    return peerConnection;
*/
// ==========================================
// No-Trace WebSocket Signaling
// ==========================================

const SIGNALING_SERVER = "ws://localhost:3000";

let signalingSocket = null;

function connectToSignalingServer() {

    console.log("Connecting to No-Trace signaling server...");

    signalingSocket = new WebSocket(SIGNALING_SERVER);

    signalingSocket.addEventListener("open", () => {

        console.log("✅ Connected to signaling server");

    });

    signalingSocket.addEventListener("message", async (event) => {

        const data = JSON.parse(event.data);

        console.log("📨 Signaling message:", data);

        if (data.type === "room-created") {

            console.log(
                "Room created:",
                data.roomId
            );

            return;
        }

        if (data.type === "peer-joined") {
            console.log("Receiver joined! Creating WebRTC offer...");

            await createOffer();

            return;
        
        }


        if (data.type === "joined-room") {
            console.log("Successfully joined room:", data.roomId);

            const status = document.getElementById("receiveStatus");
            if (status) {
                status.textContent = "Room found. Establishing peer connection...";
                status.style.color = "#55b5ff";
        }

        return;
        }

        if (data.type === "answer") {

            console.log(
                "Received WebRTC answer"
            );

            await peerConnection.setRemoteDescription(
                new RTCSessionDescription(data.answer)
            );

            return;
        }

        if (data.type === "offer") {

            console.log(
                "Received WebRTC offer"
            );

            await handleOffer(data.offer);

            return;
        }

        if (data.type === "ice-candidate") {

            if (
                peerConnection &&
                data.candidate
            ) {

                try {

                    await peerConnection.addIceCandidate(
                        new RTCIceCandidate(data.candidate)
                    );

                } catch (error) {

                    console.error(
                        "ICE candidate error:",
                        error
                    );

                }

            }

            return;
        }

        if (data.type === "error") {

            console.error(
                "Server error:",
                data.message
            );

            showToast(data.message);

        }

    });

    signalingSocket.addEventListener("error", (error) => {

        console.error(
            "❌ WebSocket error:",
            error
        );

    });

    signalingSocket.addEventListener("close", () => {

        console.log(
            "🔌 Disconnected from signaling server"
        );

    });

}

connectToSignalingServer();
/* =========================================================
   REAL WEBRTC CONNECTION
========================================================= */

let peerConnection = null;
let dataChannel = null;
let incomingTransfer = null;



function finishIncomingTransfer() {
    if (!incomingTransfer) return;

    const transfer = incomingTransfer;

    const blob = new Blob(transfer.chunks, {
        type: transfer.mimeType
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = transfer.name;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 60000);

    console.log("✅ File received:", transfer.name);
    showToast("File received: " + transfer.name);

    incomingTransfer = null;
}

function handleIncomingData(event) {
    // Text messages contain file metadata.
    if (typeof event.data === "string") {
        let message;

        try {
            message = JSON.parse(event.data);
        } catch (error) {
            console.error("Invalid transfer message:", error);
            return;
        }
        

        
    if (message.type === "transfer-request") {
        if (!Array.isArray(message.files) || message.files.length === 0) {
            console.error("Invalid transfer request");
            return;
        }

        console.log("Incoming transfer request:", message.files);
        showApprovalModal(message);
        return;
    }

    if (message.type === "transfer-accept" ||
        message.type === "transfer-reject") {
        return;
    }

    // KEEP YOUR EXISTING CODE BELOW
    if (message.type === "file-meta") {
        incomingTransfer = {
            name: message.name,
            size: message.size,
            mimeType: message.mimeType || "application/octet-stream",
            chunks: [],
            receivedBytes: 0
    };

    console.log(
        "📥 Receiving file:",
        message.name,
        formatBytes(message.size)
    );

    if (message.size === 0) {
        finishIncomingTransfer();
    }
}

return;
    }

    // Binary messages contain file chunks.
    if (!incomingTransfer) {
        console.warn("Received file data without metadata");
        return;
    }

    let chunk = event.data;

    if (chunk instanceof Blob) {
        chunk.arrayBuffer().then(buffer => {
            if (!incomingTransfer) return;
            incomingTransfer.chunks.push(buffer);
            incomingTransfer.receivedBytes += buffer.byteLength;

            if (incomingTransfer.receivedBytes >= incomingTransfer.size) {
                finishIncomingTransfer();
            }
        });
        return;
    }

    if (chunk instanceof ArrayBuffer) {
        incomingTransfer.chunks.push(chunk);
        incomingTransfer.receivedBytes += chunk.byteLength;

        if (incomingTransfer.receivedBytes >= incomingTransfer.size) {
            finishIncomingTransfer();
        }
    }
}

const rtcConfiguration = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302"
        }
    ]
};


/* =========================
   SEND SIGNALING MESSAGE
========================= */

function sendSignal(data) {

    if (
        signalingSocket &&
        signalingSocket.readyState === WebSocket.OPEN
    ) {
        signalingSocket.send(
            JSON.stringify(data)
        );
    }
}


/* =========================
   CREATE PEER CONNECTION
========================= */

function createPeerConnection() {

    console.log("Creating WebRTC peer connection...");

    peerConnection =
        new RTCPeerConnection(
            rtcConfiguration
        );


    /* ICE candidate */

    peerConnection.onicecandidate =
        event => {

            if (event.candidate) {

                sendSignal({
                    type: "ice-candidate",
                    candidate: event.candidate
                });

            }

        };


    /* Connection state */

    peerConnection.onconnectionstatechange =
        () => {

            console.log(
                "WebRTC state:",
                peerConnection.connectionState
            );

            if (
                peerConnection.connectionState ===
                "connected"
            ) {

                console.log(
                    "🔥 WEBRTC CONNECTED"
                );

                state.connected = true;

                const connectionState =
                    document.getElementById(
                        "connectionState"
                    );

                if (connectionState) {

                    connectionState.classList.add(
                        "connected"
                    );

                    connectionState.innerHTML = `
                        <span></span>
                        CONNECTED
                    `;
                }

                const receiverDevice =
                    document.getElementById(
                        "receiverDevice"
                    );

                if (receiverDevice) {

                    receiverDevice.textContent =
                        "REMOTE DEVICE";
                }

            }


            if (
                peerConnection.connectionState ===
                "failed"
            ) {

                console.error(
                    "WebRTC connection failed"
                );

                showToast(
                    "WebRTC connection failed"
                );

            }

        };


    return peerConnection;
}
/* =========================
   CREATE OFFER
========================= */

async function createOffer() {
    console.log("Creating WebRTC offer...");

    createPeerConnection();

    // Create the data channel FIRST
    dataChannel = peerConnection.createDataChannel("fileTransfer");

    // Handle transfer approval responses from receiver
    dataChannel.onmessage = (event) => {
        if (typeof event.data !== "string") return;

        let message;

        try {
            message = JSON.parse(event.data);
        } catch {
            return;
        }

        if (message.type === "transfer-accept") {
            console.log("Receiver accepted the transfer");
            startTransfer();
        }

        if (message.type === "transfer-reject") {
            console.log("Receiver declined the transfer");
            showToast("Receiver declined the transfer");
        }
    };

    dataChannel.onopen = () => {
        console.log("🔥 DATA CHANNEL OPEN");
        showToast("Peer-to-peer connection established");
    };

    dataChannel.onclose = () => {
        console.log("Data channel closed");
    };

    // Create and send WebRTC offer
    const offer = await peerConnection.createOffer();

    await peerConnection.setLocalDescription(offer);

    sendSignal({
        type: "offer",
        offer: peerConnection.localDescription
    });
}


/* =========================
   HANDLE OFFER
========================= */

async function handleOffer(offer) {

    console.log(
        "Handling WebRTC offer..."
    );

    createPeerConnection();


    
peerConnection.ondatachannel = (event) => {
    dataChannel = event.channel;
    dataChannel.binaryType = "arraybuffer";

    console.log("📡 Data channel received");

    dataChannel.onopen = () => {
        console.log("🔥 DATA CHANNEL OPEN");
        showToast("Peer-to-peer connection established");
    };

    dataChannel.onmessage = handleIncomingData;

    dataChannel.onclose = () => {
        console.log("Data channel closed");
    };
};



    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(
            offer
        )
    );


    const answer =
        await peerConnection.createAnswer();


    await peerConnection.setLocalDescription(
        answer
    );


    sendSignal({
        type: "answer",
        answer: peerConnection.localDescription
    });

}