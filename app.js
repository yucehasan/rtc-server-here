var express = require("express");

var app = (module.exports = express.createServer());

var io = require("socket.io")(app);

DEFAULT_PORT = process.env.PORT || 80;

var rooms = {};
var pairs = {};

io.sockets.on("connection", function (socket) {
  console.log(socket.id + " joined");
  var id = socket.id;
  console.log("type: ", typeof id);

  socket.on("raise-hand", (data) => {
	for (var i = 0; i < rooms[pairs[socket.id]].instructors.length; i++) {
        rooms[pairs[socket.id]].instructors[i].socket.emit("raise-hand", {
          username: data.username,
        });
	}
  })

  socket.on("screen-share", (data) => {
    for (var i = 0; i < rooms[data.roomID].instructors.length; i++) {
      if (socket.id != rooms[data.roomID].instructors[i].socketID)
        rooms[data.roomID].instructors[i].socket.emit("expect-screen", {
          username: data.username,
        });
    }
    for (var i = 0; i < rooms[data.roomID].students.length; i++) {
      if (socket.id != rooms[data.roomID].students[i].socketID)
        rooms[data.roomID].students[i].socket.emit("expect-screen", {
          username: data.username,
        });
    }
  });

  socket.on("slide-start", (data) => {
    for (var i = 0; i < rooms[data.roomID].instructors.length; i++) {
      rooms[data.roomID].instructors[i].socket.emit("slide-start");
    }
    for (var i = 0; i < rooms[data.roomID].students.length; i++) {
      rooms[data.roomID].students[i].socket.emit("slide-start");
    }
  });

  socket.on("slide-stop", (data) => {
    for (var i = 0; i < rooms[data.roomID].instructors.length; i++) {
      rooms[data.roomID].instructors[i].socket.emit("slide-stop");
    }
    for (var i = 0; i < rooms[data.roomID].students.length; i++) {
      rooms[data.roomID].students[i].socket.emit("slide-stop");
    }
  });

  socket.on("close-video", (data) => {
    var roomID = data.roomID;
    for (var i = 0; i < rooms[data.roomID].instructors.length; i++) {
      rooms[roomID].instructors[i].socket.emit("user-left", socket.id);
    }
    for (var i = 0; i < rooms[data.roomID].students.length; i++) {
      rooms[roomID].students[i].socket.emit("user-left", socket.id);
    }
  });

  socket.on("close-share", (data) => {
    var roomID = data.roomID;
    for (var i = 0; i < rooms[data.roomID].instructors.length; i++) {
      rooms[roomID].instructors[i].socket.emit("close-share", socket.id);
    }
    for (var i = 0; i < rooms[data.roomID].students.length; i++) {
      rooms[roomID].students[i].socket.emit("close-share", socket.id);
    }
  });

  socket.on("print", () => {
    console.log(rooms);
  });

  socket.on("chat-msg", (data) => {
    var roomID = data.roomID;
    var msg = data.message;
    var sender = data.sender;
    for (var i = 0; i < rooms[roomID].instructors.length; i += 1) {
      if (rooms[roomID].instructors[i].socketID != socket.id)
        rooms[roomID].instructors[i].socket.emit("chat-msg", {
          sender: sender,
          message: msg,
        });
    }
    for (var i = 0; i < rooms[roomID].students.length; i += 1) {
      if (rooms[roomID].students[i].socketID != socket.id)
        rooms[roomID].students[i].socket.emit("chat-msg", {
          sender: sender,
          message: msg,
        });
    }
  });

  socket.on("new-comer-stream", (data) => {
    console.log("sending to", data.toID);
    io.to(data.toId).emit("expect-screen", {
      username: data.username,
    });
    socket.emit("ack");
  });

  socket.on("signal", (toId, message) => {
    io.to(toId).emit("signal", socket.id, message);
  });

  socket.on("message", function (data) {
    io.sockets.emit("broadcast-message", socket.id, data);
  });

  socket.on("disconnect", function () {
    console.log(socket.id + " left");
    var roomID = pairs[socket.id];
    delete pairs[socket.id];
    for (var i = 0; i < rooms[roomID].instructors.length; i += 1) {
      rooms[roomID].instructors[i].socket.emit("user-left", socket.id);
    }
    for (var i = 0; i < rooms[roomID].students.length; i += 1) {
      rooms[roomID].students[i].socket.emit("user-left", socket.id);
    }

    var index = -1;
    for (var i = 0; i < rooms[roomID].instructors.length; i += 1) {
      if (rooms[roomID].instructors[i].socketID === socket.id) {
        index = i;
      }
    }
    if (index > -1) {
      console.log("removed", socket.id);
      rooms[roomID].instructors.splice(index, 1);
    } else {
      for (var i = 0; i < rooms[roomID].students.length; i += 1) {
        if (rooms[roomID].students[i].socketID === socket.id) {
          index = i;
        }
      }
      if (index > -1) {
        console.log("removed", socket.id);
        rooms[roomID].students.splice(index, 1);
      } else {
        console.error("Unable to remove participant");
      }
    }
  });

  socket.on("slideChange", function (number) {
    console.log("slide changed to", number);
    io.sockets.emit("slideChange", number);
  });
  
  socket.on("confirm", (data) => {
    var username = data.username;
    pairs[id] = data.roomID;
    console.log(username, "joined");
    if (rooms[data.roomID]) {
      if (data.userType === "student") {
        rooms[data.roomID].students.push({
          socketID: id,
          username: username,
          socket: socket,
        });
      } else if (data.userType === "instructor") {
        rooms[data.roomID].instructors.push({
          socketID: id,
          username: username,
          socket: socket,
        });
      } else {
        console.error("Error while creating room");
      }
    } else {
      if (data.userType === "student") {
        rooms[data.roomID] = {
          students: [{ socketID: id, socket: socket }],
          instructors: [],
        };
      } else if (data.userType === "instructor") {
        rooms[data.roomID] = {
          students: [],
          instructors: [{ socketID: id, socket: socket }],
        };
      } else {
        console.error("Error while creating room");
      }
    }
    var allInRoom = [];
    for (var i = 0; i < rooms[data.roomID].students.length; i++) {
      allInRoom.push({
        socketID: rooms[data.roomID].students[i]["socketID"],
        username: rooms[data.roomID].students[i]["username"],
      });
    }
    for (var i = 0; i < rooms[data.roomID].instructors.length; i++) {
      allInRoom.push({
        socketID: rooms[data.roomID].instructors[i]["socketID"],
        username: rooms[data.roomID].instructors[i]["username"],
      });
    }
    for (var i = 0; i < rooms[data.roomID].instructors.length; i++) {
      console.log("Sending to instructor in", data.roomID, "participant", i);
      rooms[data.roomID].instructors[i].socket.emit(
        "user-joined",
        id,
        rooms[data.roomID].instructors.length +
          rooms[data.roomID].students.length,
        allInRoom
      );
    }
    for (var i = 0; i < rooms[data.roomID].students.length; i++) {
      console.log("Sending to student in", data.roomID, "participant", i);
      rooms[data.roomID].students[i].socket.emit(
        "user-joined",
        id,
        rooms[data.roomID].instructors.length +
          rooms[data.roomID].students.length,
        allInRoom
      ); // "user-joined", id, rooms[data.roomID].participants.length, allInRoom
      //io.sockets.emit( "user-joined", id, io.engine.clientsCount, Object.keys(io.sockets.clients().sockets));
    }
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
