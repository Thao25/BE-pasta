const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Hàm tạo Token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "secret_key_tam_thoi", {
    expiresIn: "30d", // Token sống 30 ngày
  });
};

// @desc    Đăng nhập Nhân viên/Admin (Web Admin & Mobile App)
// @route   POST /api/users/login
const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Tìm user theo username
    const user = await User.findOne({ Username: username });

    // 2. Kiểm tra password (dùng bcrypt so sánh hash)
    if (user && (await bcrypt.compare(password, user.Password))) {
      res.json({
        message: 0,
        data: {
          _id: user._id,
          HoTen: user.HoTen,
          Role: user.Role,
          Token: generateToken(user._id), // Trả về chìa khóa đăng nhập
        },
      });
    } else {
      res
        .status(401)
        .json({ message: 1, error: "Sai tài khoản hoặc mật khẩu" });
    }
  } catch (error) {
    res.status(500).json({ message: 1, error: error.message });
  }
};

// @desc    Tạo nhân viên mới
// @route   POST /api/users/register
const registerUser = async (req, res) => {
  try {
    const { HoTen, Username, Password, Role } = req.body;

    const userExists = await User.findOne({ Username });
    if (userExists) {
      return res
        .status(400)
        .json({ message: 1, error: "Tên đăng nhập đã tồn tại" });
    }

    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(Password, salt);

    const user = await User.create({
      HoTen,
      Username,
      Password: hashedPassword,
      Role: Role || "NhanVien",
    });

    if (user) {
      res.status(201).json({
        message: 0,
        data: {
          _id: user._id,
          HoTen: user.HoTen,
          Role: user.Role,
        },
      });
    }
  } catch (error) {
    res.status(400).json({ message: 1, error: error.message });
  }
};

// @desc    Đăng nhập/Đăng ký Khách hàng Zalo (Zalo Mini App gọi)
// @route   POST /api/users/zalo-login
const loginZaloUser = async (req, res) => {
  try {
    const { ZaloId, HoTen, Avatar } = req.body;

    // Tìm xem khách này đã từng vào quán chưa
    let user = await User.findOne({ ZaloId });

    if (user) {
      // Nếu có rồi -> Cập nhật lại tên/avatar mới nhất
      user.HoTen = HoTen || user.HoTen;
      user.Avatar = Avatar || user.Avatar;
      await user.save();
    } else {
      // Nếu chưa -> Tạo khách hàng mới
      user = await User.create({
        HoTen: HoTen || "Khách Zalo",
        ZaloId,
        Avatar,
        Role: "KhachHang",
      });
    }

    res.json({ message: 0, data: user });
  } catch (error) {
    res.status(500).json({ message: 1, error: error.message });
  }
};

// @desc    Lấy danh sách nhân viên
// @route   GET /api/users
const getUsers = async (req, res) => {
  try {
    // Chỉ lấy nhân viên, không lấy khách hàng
    const users = await User.find({ Role: { $ne: "KhachHang" } }).select(
      "-Password",
    );
    res.json({ message: 0, data: users });
  } catch (error) {
    res.status(500).json({ message: 1, error: error.message });
  }
};

// @desc    Cập nhật quyền nhân viên
// @route   PUT /api/users/:id/role
const updateUserRole = async (req, res) => {
  try {
    const { Role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res
        .status(404)
        .json({ message: 1, error: "Không tìm thấy người dùng" });
    }

    // Bảo vệ tài khoản admin gốc
    if (user.Role === "QuanLy") {
      return res
        .status(403)
        .json({
          message: 1,
          error: "Không thể thay đổi quyền của tài khoản Admin ",
        });
    }

    user.Role = Role;
    const updatedUser = await user.save();

    // Loại bỏ Password trước khi trả về
    updatedUser.Password = undefined;

    res.json({ message: 0, data: updatedUser });
  } catch (error) {
    res.status(400).json({ message: 1, error: error.message });
  }
};

// @desc    Xóa tài khoản nhân viên
// @route   DELETE /api/users/:id
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res
        .status(404)
        .json({ message: 1, error: "Không tìm thấy người dùng" });
    }

    // Bảo vệ tài khoản admin gốc
    if (user.Role === "QuanLy") {
      return res
        .status(403)
        .json({ message: 1, error: "Không thể xóa tài khoản Admin" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 0, data: { success: true } });
  } catch (error) {
    res.status(400).json({ message: 1, error: error.message });
  }
};

module.exports = {
  loginUser,
  registerUser,
  loginZaloUser,
  getUsers,
  updateUserRole,
  deleteUser,
};
