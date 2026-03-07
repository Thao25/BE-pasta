const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const startCronJobs = require("./src/controllers/cronService");

// Tải các biến môi trường từ .env file
dotenv.config({ path: "./.env" });

// Cập nhật đường dẫn để kết nối đến config/db.js bên trong src
const connectDB = require("./src/config/db");

// Kết nối đến cơ sở dữ liệu MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json()); // Cho phép server chấp nhận dữ liệu JSON trong body
app.use(cors()); // Cho phép tất cả các nguồn gốc (Web, App, Zalo) truy cập API

//  Socket.io Setup (Real-time)
const io = new Server(server, {
  cors: {
    origin: "*", // Cho phép mọi nguồn (Zalo App, Web Admin) kết nối socket
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("User connected socket:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Biến toàn cục cho socket
global.io = io;

// Định tuyến API
app.get("/", (req, res) => {
  res.send("API Đang hoạt động...");
});

app.use("/api/foods", require("./src/routes/foodRoutes"));
app.use("/api/tables", require("./src/routes/tableRoutes"));
app.use("/api/orders", require("./src/routes/orderRoutes"));
app.use("/api/upload", require("./src/routes/uploadRoutes"));
app.use("/api/ai", require("./src/routes/aiRoutes"));
app.use("/api/restaurant", require("./src/routes/restaurantRoutes"));
app.use("/api/users", require("./src/routes/userRoutes"));
app.use("/api/reports", require("./src/routes/reportRoutes"));

startCronJobs();
// Truy cập ảnh qua link: http://localhost:5000/uploads/image-xxx.jpg
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

const PORT = process.env.PORT || 5000;

app.listen(
  PORT,
  console.log(`Server chạy ở chế độ Development trên cổng ${PORT}`),
);
