const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const Table = require("./src/models/table");
const Order = require("./src/models/order");
const Notification = require("./src/models/Notification");
const startCronJobs = require("./src/controllers/cronService");

dotenv.config({ path: "./.env" });

const connectDB = require("./src/config/db");
connectDB();

const app = express();
const server = http.createServer(app);
app.use(express.json());
app.use(cors());

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

global.io = io;
const getActiveZaloIdByTable = async (tableId) => {
  const activeOrder = await Order.findOne({
    BanId: tableId,
    TrangThaiOrder: {
      $in: ["ChoXuLy", "DangCheBien", "DaLamXong", "DaPhucVu"],
    },
  }).sort({ createdAt: -1 });
  return activeOrder ? activeOrder.KhachHangZaloId : null;
};
io.on("connection", (socket) => {
  console.log("Thiết bị mới kết nối:", socket.id);

  socket.on("customer-call", async (data) => {
    console.log("Dữ liệu nhận từ Zalo:", data);
    try {
      // 1. Cập nhật trạng thái bàn
      await Table.findOneAndUpdate(
        { _id: data.tableId },
        { DangGoiNhanVien: true, YeuCauGanNhat: data.noiDung },
      );

      const zaloId = await getActiveZaloIdByTable(data.tableId);

      if (zaloId) {
        const title = "Đã gửi yêu cầu";
        const message = `Bạn đã yêu cầu hỗ trợ: "${data.noiDung || "Yêu cầu nhân viên hỗ trợ"}"`;

        // 2. Lưu vào Database
        const newNoti = await Notification.create({
          KhachHangZaloId: zaloId,
          Title: title,
          Message: message,
          Type: "SERVICE",
          IsRead: false, // Nên để false để app khách hàng hiện số thông báo chưa đọc nhé
        });

        // 🌟 FIX QUAN TRỌNG: Bắn realtime ngay lập tức về cho khách hàng vừa gọi
        io.emit(`notification-customer-${zaloId}`, {
          _id: newNoti._id, // Trả về ID thật từ DB để sau này xóa/đọc được đúng
          title: title,
          message: message,
          type: "SERVICE",
          createdAt: newNoti.createdAt || new Date(),
          IsRead: false,
        });
      }

      // 3. Bắn thông báo Real-time cho APP NHÂN VIÊN
      io.emit("new-notification", {
        id: String(data.tableId),
        tableId: String(data.tableId),
        title: `Khách hàng ${data.banId} đang gọi!`,
        body: data.noiDung || "Yêu cầu nhân viên hỗ trợ",
        status: "pending",
      });
    } catch (err) {
      console.error("Lỗi xử lý gọi món:", err);
    }
  });
  socket.on("staff-respond", async (data) => {
    await Table.findByIdAndUpdate(data.tableId, { DangGoiNhanVien: false });
    const zaloId = await getActiveZaloIdByTable(data.tableId);

    if (zaloId) {
      const title = "Nhân viên đang đến";
      const message =
        "Yêu cầu của bạn đã được tiếp nhận,vui lòng đợi nhân viên đến hỗ trợ !";

      // Lưu vào Database
      await Notification.create({
        KhachHangZaloId: zaloId,
        Title: title,
        Message: message,
        Type: "SERVICE",
        IsRead: false,
      });
      io.emit(`notification-customer-${zaloId}`, {
        title: title,
        message: message,
        type: "SERVICE",
        time: new Date(),
      });
    }

    io.emit("receive-response", {
      tableId: String(data.tableId),
      message: "Nhân viên đang đến, vui lòng đợi chút nhé!",
    });
    io.emit("call-handled", { tableId: data.tableId });
  });
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

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
app.use("/api/notifications", require("./src/routes/notification"));

startCronJobs();
// Truy cập ảnh qua link: http://localhost:5000/uploads/image-xxx.jpg
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

const PORT = process.env.PORT || 5000;

server.listen(
  PORT,
  console.log(`Server chạy ở chế độ Development trên cổng ${PORT}`),
);
