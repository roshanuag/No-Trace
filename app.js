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
   BEGIN TRANSFER
========================= */

function beginTransfer() {

    if (state.files.length === 0) {

        showToast(
            "Select at least one file"
        );

        return;
    }


    /*
        DEMO:

        Pretend the receiver connected.

        In the real app this should only happen
        after WebRTC connection is established.
    */

    if (!state.connected) {

        simulateConnection();

        setTimeout(() => {

            if (state.requireApproval) {

                showApprovalModal();

            } else {

                startTransfer();

            }

        }, 900);

        return;
    }


    if (state.requireApproval) {

        showApprovalModal();

    } else {

        startTransfer();

    }
}


/* =========================
   APPROVAL MODAL
========================= */

function showApprovalModal() {

    const file =
        state.files[0];

    document.getElementById(
        "incomingFileName"
    ).textContent =
        file.name;

    document.getElementById(
        "incomingFileSize"
    ).textContent =
        formatBytes(file.size);


    document
        .getElementById("approvalModal")
        .classList.remove("hidden");
}


function rejectTransfer() {

    document
        .getElementById("approvalModal")
        .classList.add("hidden");


    showToast(
        "Transfer rejected"
    );
}


function acceptTransfer() {

    document
        .getElementById("approvalModal")
        .classList.add("hidden");


    startTransfer();
}


/* =========================
   START TRANSFER
========================= */

function startTransfer() {

    if (state.files.length === 0)
        return;


    state.transferRunning = true;

    state.transferProgress = 0;


    const firstFile =
        state.files[0];

    state.currentFile =
        firstFile;


    document.getElementById(
        "transferFileName"
    ).textContent =
        firstFile.name;


    document.getElementById(
        "transferFileSize"
    ).textContent =
        formatBytes(firstFile.size);


    showPage(
        "transferPage"
    );


    renderTransferQueue();


    /*
        DEMO TRANSFER

        This simulates the UI.

        Real implementation:

        File
          ↓
        ArrayBuffer / chunks
          ↓
        WebRTC DataChannel
          ↓
        Receiver
    */

    runDemoTransfer();
}


/* =========================
   DEMO TRANSFER
========================= */

function runDemoTransfer() {

    const file =
        state.currentFile;


    let progress = 0;

    const totalMB =
        file.size /
        (1024 * 1024);


    const progressBar =
        document.getElementById(
            "progressBar"
        );


    const progressText =
        document.getElementById(
            "progressText"
        );


    const progressAmount =
        document.getElementById(
            "progressAmount"
        );


    const speedElement =
        document.getElementById(
            "transferSpeed"
        );


    const interval =
        setInterval(() => {

            /*
                Simulated speed.
                Real app should calculate actual
                WebRTC throughput.
            */

            const speed =
                25 +
                Math.random() * 55;


            progress +=
                Math.random() * 4;


            if (progress >= 100) {

                progress = 100;

                clearInterval(interval);

                speedElement.textContent =
                    "DONE";

                progressBar.style.width =
                    "100%";

                progressText.textContent =
                    "100%";

                progressAmount.textContent =
                    `${formatBytes(file.size)} / ${formatBytes(file.size)}`;


                setTimeout(
                    transferFinished,
                    600
                );

                return;
            }


            progressBar.style.width =
                `${progress}%`;


            progressText.textContent =
                `${Math.floor(progress)}%`;


            const transferredMB =
                totalMB *
                (progress / 100);


            progressAmount.textContent =
                `${transferredMB.toFixed(1)} MB / ${totalMB.toFixed(1)} MB`;


            speedElement.textContent =
                `${speed.toFixed(1)} MB/s`;


        }, 180);
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

    console.log(
        "Creating WebRTC offer..."
    );

    createPeerConnection();


    dataChannel =
        peerConnection.createDataChannel(
            "file-transfer"
        );


    dataChannel.onopen = () => {

        console.log(
            "🔥 DATA CHANNEL OPEN"
        );

        showToast(
            "Peer-to-peer connection established"
        );

    };


    dataChannel.onclose = () => {

        console.log(
            "Data channel closed"
        );

    };


    const offer =
        await peerConnection.createOffer();


    await peerConnection.setLocalDescription(
        offer
    );


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


    peerConnection.ondatachannel =
        event => {

            dataChannel =
                event.channel;

            console.log(
                "Data channel received"
            );


            dataChannel.onopen = () => {

                console.log(
                    "🔥 DATA CHANNEL OPEN"
                );

                showToast(
                    "Peer-to-peer connection established"
                );

            };


            dataChannel.onmessage =
                event => {

                    console.log(
                        "Received data:",
                        event.data
                    );

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