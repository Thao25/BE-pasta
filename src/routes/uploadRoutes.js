// const express = require("express");
// const multer = require("multer");
// const path = require("path");
// const router = express.Router();

// // Cấu hình nơi lưu trữ và tên file
// const storage = multer.diskStorage({
//   destination(req, file, cb) {
//     cb(null, "uploads/"); // Lưu vào thư mục uploads ở root
//   },
//   filename(req, file, cb) {
//     // Đổi tên file: fieldname-thời_gian.extension (VD: image-17023456.jpg)
//     cb(
//       null,
//       `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`,
//     );
//   },
// });

// // Kiểm tra định dạng file (chỉ cho phép ảnh)
// function checkFileType(file, cb) {
//   const filetypes = /jpg|jpeg|png|webp/;
//   const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
//   const mimetype = filetypes.test(file.mimetype);

//   if (extname && mimetype) {
//     return cb(null, true);
//   } else {
//     cb("Lỗi:  File không đúng định dạng!");
//   }
// }

// const upload = multer({
//   storage,
//   fileFilter: function (req, file, cb) {
//     checkFileType(file, cb);
//   },
// });

// // POST /api/upload
// router.post("/", upload.single("image"), (req, res) => {
//   // Trả về đường dẫn file để Frontend hiển thị

//   res.send(`/${req.file.path.replace(/\\/g, "/")}`);
// });

// module.exports = router;

//----------------------------------------------------------

const express = require("express");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const router = express.Router();

// ==========================================================
// 1. CẤU HÌNH CLOUDINARY
// Các thông số này nên được để trong file .env để bảo mật
// ==========================================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME ,
  api_key: process.env.CLOUDINARY_KEY ,
  api_secret: process.env.CLOUDINARY_SECRET ,
});

// ==========================================================
// 2. CẤU HÌNH LƯU TRỮ (STORAGE) THAY THẾ CHO DISKSTORAGE
// ==========================================================
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "pasta_qr_order", // Thư mục sẽ tự tạo trên Cloudinary
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [{ width: 800, height: 800, crop: "limit" }], // Tự động resize ảnh cho nhẹ
  },
});

const uploadCloud = multer({ storage });

// POST /api/upload
router.post("/", uploadCloud.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Không có tệp nào được tải lên!" });
    }

   
    res.send(req.file.path);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
