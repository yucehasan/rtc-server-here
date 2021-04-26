var express = require("express");

var app = (module.exports = express.createServer());

var io = require("socket.io")(app);

DEFAULT_PORT = process.env.PORT || 80;

var rooms = {};
io.sockets.on("connection", function (socket) {
  console.log(socket.id + " joined");
  socket.on("confirm", (data) => {
    if (rooms[data.roomID]) {
      console.log("room exists");
      rooms[data.roomID]["participants"].push(socket.id);
    } else {
      console.log("creating room");
      rooms[data.roomID] = {
        participants: [socket.id],
      };
    }
    console.log(rooms);
    console.log("joined from", data.roomID);
    io.sockets.emit(
      "user-joined",
      socket.id,
      io.engine.clientsCount,
      Object.keys(io.sockets.clients().sockets)
    );
  });

  socket.on("signal", (toId, message) => {
    io.to(toId).emit("signal", socket.id, message);
  });

  socket.on("message", function (data) {
    io.sockets.emit("broadcast-message", socket.id, data);
  });

  socket.on("disconnect", function (data) {
    console.log(socket.id + " left");
    io.sockets.emit("user-left", socket.id);
  });

  socket.on("disconnectFrom", function (data) {
    console.log("leaving from", data.roomID);
    // rooms[data.roomID]
    const index = rooms[data.roomID].participants.indexOf(socket.id);
    if (index > -1) {
		rooms[data.roomID].participants.splice(index, 1);
    }
  });

  socket.on("slideChange", function (number) {
    console.log("slide changed to", number);
    io.sockets.emit("slideChange", number);
  });
});

app.listen(DEFAULT_PORT, function () {
  console.log(
    "Express server listening on %s port %d in %s mode",
    app.address().address,
    app.address().port,
    app.settings.env
  );
});
