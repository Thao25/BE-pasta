const express = require("express");
const router = express.Router();
const {
  loginUser,
  registerUser,
  loginZaloUser,
  getUsers,
  updateUserRole,
  deleteUser,
  loginZalo,
} = require("../controllers/userController");

// Đăng nhập quản trị
router.post("/login", loginUser);

// Tạo nhân viên mới
router.post("/register", registerUser);

// Đăng nhập từ Zalo
router.post("/zalo-login", loginZaloUser);

// Lấy danh sách nhân viên
router.get("/", getUsers);

// Cập nhật quyền (Role) nhân viên
router.put("/:id/role", updateUserRole);

// Thu hồi (Xóa) tài khoản nhân viên
router.delete("/:id", deleteUser);

// Đăng nhập từ Zalo
router.post("/zalo-login", loginZalo);
module.exports = router;
