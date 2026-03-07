const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();

// Cấu hình nơi lưu trữ và tên file
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "uploads/"); // Lưu vào thư mục uploads ở root
  },
  filename(req, file, cb) {
    // Đổi tên file: fieldname-thời_gian.extension (VD: image-17023456.jpg)
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`,
    );
  },
});

// Kiểm tra định dạng file (chỉ cho phép ảnh)
function checkFileType(file, cb) {
  const filetypes = /jpg|jpeg|png|webp/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb("Lỗi:  File không đúng định dạng!");
  }
}

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

// POST /api/upload
router.post("/", upload.single("image"), (req, res) => {
  // Trả về đường dẫn file để Frontend hiển thị

  res.send(`/${req.file.path.replace(/\\/g, "/")}`);
});

module.exports = router;
