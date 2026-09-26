# 🕵️‍♂️ No-Trace

A blazing-fast, serverless peer-to-peer (P2P) file-sharing web application built for instant data transfer. No databases, no file storage limits, and absolutely no data retention. Files move directly from one browser to another through a secure WebRTC tunnel.

## ✨ Features
* **Zero Backend:** Entirely serverless architecture utilizing WebRTC data channels.
* **Instant Connections:** Generates unique Peer IDs on the fly for immediate pairing.
* **Drag & Drop:** Intuitive, dark-mode file drop zone for seamless user experience.
* **No Size Limits:** Bypasses traditional server upload limits by streaming data directly between clients.

## 🛠️ Tech Stack
* **Frontend:** HTML5, modern CSS (Tailwind CSS via CDN)
* **Networking:** WebRTC API
* **Signaling Library:** [PeerJS](https://peerjs.com/) (v1.5.5)

## 🚀 How to Run Locally
Since this app is strictly frontend and serverless, getting it running takes seconds:
1. Clone this repository.
2. Open the project folder in VS Code.
3. Launch `index.html` using the **Live Server** extension.
4. Open the localhost URL in two separate browser tabs to simulate a P2P connection, copy the ID from one tab to the other, and drop a file!

## 💡 Hackathon Note
This project was developed rapidly to demonstrate the power of decentralized browser-to-browser data transfer without relying on expensive cloud storage infrastructure.