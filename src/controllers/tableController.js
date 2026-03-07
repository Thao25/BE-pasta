const Table = require("../models/Table");
const ZALO_MINI_APP_ID = process.env.ZALO_APP_ID || "TEST_APP_ID";
// @desc    Lấy danh sách tất cả các bàn
// @route   GET /api/tables
// @access
const getTables = async (req, res) => {
  try {
    const tables = await Table.find().sort({ SoBan: 1 }); // Sắp xếp theo tên bàn
    res.json({ message: 0, data: tables });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// @desc    Tạo bàn mới (Tự động sinh MaQR)
// @route   POST /api/tables
// @access  Private (Admin)
const createTable = async (req, res) => {
  try {
    const { SoBan, KhuVuc } = req.body;

    const tableExists = await Table.findOne({ SoBan });
    if (tableExists) {
      return res.status(400).json({ message: "Tên bàn đã tồn tại" });
    }

    // 1. Tạo đối tượng bàn trước để lấy _id
    const newTable = new Table({
      SoBan,
      KhuVuc,
      TrangThai: "Trống",
    });

    const savedTable = await newTable.save();

    // 2. Sau khi có _id, tạo Deep Link chuẩn Zalo
    // Format: https://zalo.me/s/{AppID}/?tableId={_id}
    const deepLink = `https://zalo.me/s/${ZALO_MINI_APP_ID}/?tableId=${savedTable._id}`;

    // 3. Cập nhật lại MaQR cho bàn đó
    savedTable.MaQR = deepLink;
    await savedTable.save();

    res.status(201).json({ message: 0, data: savedTable });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Dữ liệu không hợp lệ", error: error.message });
  }
};

// @desc    Cập nhật THÔNG TIN bàn (Tên, Khu vực) - Chỉ được sửa khi bàn TRỐNG
// @route   PUT /api/tables/:id
const updateTableInfo = async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);

    if (!table) {
      return res.status(404).json({ message: "Không tìm thấy bàn" });
    }

    // Chỉ cho phép sửa thông tin khi bàn đang TRỐNG
    if (table.TrangThai !== "Trống") {
      return res.status(400).json({
        message:
          "Bàn đang có khách hoặc chờ thanh toán, không thể sửa thông tin.",
      });
    }

    // Cập nhật thông tin
    table.SoBan = req.body.SoBan || table.SoBan;
    table.KhuVuc = req.body.KhuVuc || table.KhuVuc;

    const updatedTable = await table.save();
    res.json({ message: 0, data: updatedTable });
  } catch (error) {
    res.status(400).json({ message: "Lỗi cập nhật", error: error.message });
  }
};

// @desc    Cập nhật TRẠNG THÁI bàn (Trống, Có khách, Chờ thanh toán)
// @route   PUT /api/tables/status/:id
const updateTableStatus = async (req, res) => {
  try {
    const { TrangThai } = req.body;
    const table = await Table.findById(req.params.id);

    if (!table) {
      return res.status(404).json({ message: "Không tìm thấy bàn" });
    }

    // Cập nhật trạng thái
    table.TrangThai = TrangThai;

    // Logic nghiệp vụ: Nếu chuyển về 'Trống', xóa liên kết đơn hàng hiện tại
    if (TrangThai === "Trống") {
      table.OrderHienTaiId = null;
    }

    const updatedTable = await table.save();
    if (global.io) global.io.emit("table_updated", updatedTable);
    // global.io.emit('table_updated', updatedTable);

    res.json({ message: 0, data: updatedTable });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Lỗi cập nhật trạng thái", error: error.message });
  }
};

module.exports = {
  getTables,
  createTable,
  updateTableInfo,
  updateTableStatus,
};
