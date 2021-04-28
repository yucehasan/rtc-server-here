var express = require("express");

var app = (module.exports = express.createServer());

var io = require("socket.io")(app);

DEFAULT_PORT = process.env.PORT || 80;


var rooms = {};
io.sockets.on("connection", function (socket) {
  console.log(socket.id + " joined");
  var id = socket.id
  console.log("type: ", typeof id);
  socket.on("confirm", (data) => {
	var username = data.username;
	console.log(username, "joined")
    if (rooms[data.roomID]) {
      rooms[data.roomID]["participants"].push({"socketID": id, "username": username, "socket": socket});
    } else {
      rooms[data.roomID] = {
        participants: [{"socketID": id, "socket": socket}],
      };
    }
	var allInRoom = [];
	for(var i = 0; i < rooms[data.roomID].participants.length; i++){
		allInRoom.push({"socketID": rooms[data.roomID].participants[i]["socketID"], "username": rooms[data.roomID].participants[i]["username"]});
	}
	for(var i = 0; i < rooms[data.roomID].participants.length; i++){
		console.log("Sending to people in", data.roomID, "participant", i);
		rooms[data.roomID].participants[i].socket.emit("user-joined", id, rooms[data.roomID].participants.length, allInRoom) // "user-joined", id, rooms[data.roomID].participants.length, allInRoom 
		//io.sockets.emit( "user-joined", id, io.engine.clientsCount, Object.keys(io.sockets.clients().sockets));
	}
  });

  socket.on("print", () => {
    console.log(rooms)
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
	for(var i = 0; i < rooms[data.roomID].participants.length; i += 1) {
        if(rooms[data.roomID].participants[i].socketID === socket.id) {
            index = i;
        }
    }
    if (index > -1) {
		rooms[data.roomID].participants.splice(index, 1);
    }
	else{
		console.error("Unable to remove participant")
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
