const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Lấy chuỗi kết nối từ biến môi trường
    const conn = await mongoose.connect(process.env.MONGO_URI, {});

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    // Thoát ứng dụng nếu kết nối thất bại
    process.exit(1);
  }
};

module.exports = connectDB;
