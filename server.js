const WebSocket = require("ws");

const PORT = 3000;

const wss = new WebSocket.Server({
    port: PORT
});

const rooms = new Map();

console.log(`No-Trace signaling server running on port ${PORT}`);


wss.on("connection", (socket) => {

    console.log("New device connected");

    socket.on("message", (message) => {

        try {

            const data = JSON.parse(message);

            console.log("Received:", data.type);


            // CREATE ROOM
            if (data.type === "create-room") {

                const roomId = data.roomId;

                rooms.set(roomId, {
                    sender: socket,
                    receiver: null
                });

                socket.roomId = roomId;
                socket.role = "sender";

                socket.send(JSON.stringify({
                    type: "room-created",
                    roomId: roomId
                }));

                console.log(
                    `Room created: ${roomId}`
                );
            }


            // JOIN ROOM
            else if (data.type === "join-room") {

                const roomId = data.roomId;

                const room = rooms.get(roomId);


                if (!room) {

                    socket.send(JSON.stringify({
                        type: "error",
                        message: "Room not found"
                    }));

                    return;
                }


                if (room.receiver) {

                    socket.send(JSON.stringify({
                        type: "error",
                        message: "Room is already occupied"
                    }));

                    return;
                }


                room.receiver = socket;

                socket.roomId = roomId;
                socket.role = "receiver";


                // Tell sender
                room.sender.send(JSON.stringify({
                    type: "peer-joined"
                }));


                // Tell receiver
                socket.send(JSON.stringify({
                    type: "joined-room",
                    roomId: roomId
                }));


                console.log(
                    `Receiver joined room: ${roomId}`
                );
            }


            // WEBRTC SIGNALING
            else if (
                data.type === "offer" ||
                data.type === "answer" ||
                data.type === "ice-candidate"
            ) {

                const room =
                    rooms.get(socket.roomId);


                if (!room) return;


                const otherPeer =
                    socket.role === "sender"
                        ? room.receiver
                        : room.sender;


                if (otherPeer) {

                    otherPeer.send(
                        JSON.stringify(data)
                    );
                }
            }


            // LEAVE ROOM
            else if (data.type === "leave-room") {

                removeFromRoom(socket);
            }

        } catch (error) {

            console.error(
                "Message error:",
                error
            );
        }

    });


    socket.on("close", () => {

        console.log("Device disconnected");

        removeFromRoom(socket);

    });

});


function removeFromRoom(socket) {

    const roomId = socket.roomId;

    if (!roomId) return;


    const room = rooms.get(roomId);

    if (!room) return;


    const otherPeer =
        socket.role === "sender"
            ? room.receiver
            : room.sender;


    if (otherPeer) {

        otherPeer.send(JSON.stringify({
            type: "peer-left"
        }));
    }


    rooms.delete(roomId);

    console.log(
        `Room destroyed: ${roomId}`
    );
}