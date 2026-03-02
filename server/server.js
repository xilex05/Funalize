require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow same-machine Vite dev servers across ports (e.g. 5173, 5174)
      if (!origin) {
        return callback(null, true);
      }

      const isLocalDevOrigin =
        /^http:\/\/localhost:\d+$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);

      if (isLocalDevOrigin) {
        return callback(null, true);
      }

      return callback(new Error("Socket.IO CORS blocked origin"), false);
    },
    methods: ["GET", "POST", "PUT"]
  }
});

app.use(cors());
app.use(express.json());

/* Routes */
const partyRoutes = require("./routes/party");
const authRoutes = require("./routes/auth");

app.use("/api/party", partyRoutes);
app.use("/api/auth", authRoutes);

/* MongoDB */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB Error:", err));

/* SOCKET LOGIC */
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinPartyRoom", (partyCode) => {
    socket.join(partyCode);
    console.log(`Socket ${socket.id} joined room ${partyCode}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

/* Export io so routes can use it */
app.set("io", io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
