const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Hàm tạo Token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "secret_key_tam_thoi", {
    expiresIn: "30d",
  });
};

// @desc    Đăng nhập Nhân viên/Admin (Web Admin & Mobile App)
// @route   POST /api/users/login
const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Tìm user theo username
    const user = await User.findOne({ Username: username });
    if (!user) {
      return res
        .status(401)
        .json({ message: 0, error: "Tài khoản không tồn tại" });
    }
    // 2. Kiểm tra password (dùng bcrypt so sánh hash)
    if (user && (await bcrypt.compare(password, user.Password))) {
      res.json({
        message: 0,
        data: {
          _id: user._id,
          HoTen: user.HoTen,
          Role: user.Role,
          Token: generateToken(user._id),
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

//  * @desc    Bật xác thực vân tay / khuôn mặt cho nhân viên
//  * @route   POST /api/users/enable-biometric
//  * @access  Private (Nhân viên đã đăng nhập)

const enableBiometric = async (req, res) => {
  try {
    const { deviceId } = req.body;
    const userId = req.user?.id || req.body.userId; // hỗ trợ cả 2 cách

    if (!deviceId) {
      return res.status(400).json({
        message: 1,
        error: "Thiếu Device ID",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: 1,
        error: "Không tìm thấy người dùng",
      });
    }

    // Chỉ cho phép nhân viên (không cho khách hàng)
    if (user.Role === "KhachHang") {
      return res.status(403).json({
        message: 1,
        error: "Chức năng này chỉ dành cho nhân viên",
      });
    }

    user.BaoMat = user.BaoMat || {};
    user.BaoMat.SuDungVanTay = true;
    user.BaoMat.DeviceId = deviceId;

    await user.save();

    res.json({
      message: 0,
      data: {
        success: true,
        message: "Đã bật đăng nhập sinh trắc học thành công",
      },
    });
  } catch (error) {
    res.status(500).json({ message: 1, error: error.message });
  }
};

//  * @desc    Đăng nhập bằng vân tay / khuôn mặt
//  * @route   POST /api/users/biometric-login
//  * @access  Public (nhưng kiểm tra DeviceId)

const biometricLogin = async (req, res) => {
  try {
    const { userId, deviceId } = req.body;

    if (!userId || !deviceId) {
      return res.status(400).json({
        message: 1,
        error: "Thiếu thông tin userId hoặc deviceId",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: 1,
        error: "Người dùng không tồn tại",
      });
    }

    // Kiểm tra có bật biometric chưa
    if (!user.BaoMat?.SuDungVanTay) {
      return res.status(403).json({
        message: 1,
        error: "Tài khoản chưa bật xác thực sinh trắc học",
      });
    }

    // Kiểm tra Device ID (bảo mật thiết bị)
    if (user.BaoMat.DeviceId !== deviceId) {
      return res.status(401).json({
        message: 1,
        error: "Thiết bị không hợp lệ. Vui lòng đăng nhập bằng mật khẩu",
      });
    }

    // Tạo token mới
    const token = generateToken(user._id);

    res.json({
      message: 0,
      data: {
        _id: user._id,
        HoTen: user.HoTen,
        Role: user.Role,
        Token: token,
        // Trả thêm thông tin biometric để frontend biết
        BaoMat: {
          SuDungVanTay: true,
        },
      },
    });
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
      return res.status(403).json({
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

/**
 * @desc    Xử lý đăng nhập/đăng ký tự động cho khách hàng từ Zalo
 * @route   POST /api/users/zalo-login
 */
const loginZalo = async (req, res) => {
  try {
    const { ZaloId, Username, Avatar } = req.body;

    if (!ZaloId) {
      return res.status(400).json({ message: 1, error: "Thiếu ZaloId" });
    }

    // Tìm khách hàng trong DB
    let user = await User.findOne({ ZaloId });

    if (user) {
      // Nếu đã tồn tại, cập nhật lại tên và ảnh mới nhất (phòng trường hợp khách đổi)
      user.Username = Username || user.Username;
      user.Avatar = Avatar || user.Avatar;
      await user.save();
    } else {
      // Nếu chưa có, tạo mới với vai trò KhachHang
      user = await User.create({
        ZaloId,
        Username: Username || "Khách hàng Zalo",
        Avatar: Avatar || "",
        Role: "KhachHang",
      });
    }

    res.json({ message: 0, data: user });
  } catch (error) {
    res.status(500).json({ message: 1, error: error.message });
  }
};

module.exports = {
  loginUser,
  registerUser,
  loginZaloUser,
  getUsers,
  updateUserRole,
  deleteUser,
  loginZalo,
  enableBiometric,
  biometricLogin,
};
