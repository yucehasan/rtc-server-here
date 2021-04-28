var express = require("express");

var app = (module.exports = express.createServer());

var io = require("socket.io")(app);

DEFAULT_PORT = process.env.PORT || 80;

var rooms = {};
io.sockets.on("connection", function (socket) {
  console.log(socket.id + " joined");
  var id = socket.id;
  console.log("type: ", typeof id);
  socket.on("confirm", (data) => {
    var username = data.username;
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
        rooms[data.roomID].instructors.length + rooms[data.roomID].students.length,
        allInRoom
      );
    }
	for (var i = 0; i < rooms[data.roomID].students.length; i++) {
		console.log("Sending to student in", data.roomID, "participant", i);
		rooms[data.roomID].students[i].socket.emit(
		  "user-joined",
		  id,
		  rooms[data.roomID].instructors.length + rooms[data.roomID].students.length,
		  allInRoom
		); // "user-joined", id, rooms[data.roomID].participants.length, allInRoom
		//io.sockets.emit( "user-joined", id, io.engine.clientsCount, Object.keys(io.sockets.clients().sockets));
	  }
  });

  socket.on("analyze-result", (data) => {
	//{roomID: this.roomID, username: this.username, result: res["task_result"]}
	//TODO: What about multiple hands?
	var handGesture = data.result["hand_result"][0].recognizedHandGesture
	if(handGesture == 1 || handGesture == 5){
		console.log(data.username, "from", data.roomID, "raised hand");
		for (var i = 0; i < rooms[data.roomID].instructors.length; i++) {
			rooms[data.roomID].instructors[i].socket.emit("raise-hand", {username: data.username})
		}
	}
  });

  socket.on("print", () => {
    console.log(rooms);
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
    var index;
    if (data.userType === "instructor") {
      for (var i = 0; i < rooms[data.roomID].instructors.length; i += 1) {
        if (rooms[data.roomID].participants[i].socketID === socket.id) {
          index = i;
        }
      }
      if (index > -1) {
        console.log("removed", socket.id);
        rooms[data.roomID].participants.splice(index, 1);
      } else {
        console.error("Unable to remove participant");
      }
    } else if (data.userType === "student") {
      for (var i = 0; i < rooms[data.roomID].students.length; i += 1) {
        if (rooms[data.roomID].participants[i].socketID === socket.id) {
          index = i;
        }
      }
      if (index > -1) {
        console.log("removed", socket.id);
        rooms[data.roomID].participants.splice(index, 1);
      } else {
        console.error("Unable to remove participant");
      }
    } else {
      console.error("Error while removing user");
    }
	console.log("remaining in room:", rooms[data.roomID]);
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
