const Table = require("../models/table");
const ZALO_MINI_APP_ID = process.env.ZALO_APP_ID;
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

/**
 * @desc    Lấy thông tin chi tiết 1 bàn theo ID (Bổ sung cho Zalo App)
 * @route   GET /api/tables/:id
 */
const getTableById = async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);

    if (!table) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy thông tin bàn này." });
    }
    if (table.TrangThai === "Trống") {
      table.TrangThai = "Có Khách";
      table.ThoiGianCho = new Date();
      await table.save();

      if (global.io) global.io.emit("table_updated", table);
    }

    res.json({ message: 0, data: table });
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
    // if (table.TrangThai !== "Trống") {
    //   return res.status(400).json({
    //     message:
    //       "Bàn đang có khách hoặc chờ thanh toán, không thể sửa thông tin.",
    //   });
    // }

    // Quản lý có thể ép bàn về Trống bất cứ lúc nào
    if (req.body.TrangThai === "Trống") {
      table.TrangThai = "Trống";
      table.OrderHienTaiId = null;
      table.ThoiGianQuet = null;
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
      table.ThoiGianCho = null;
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
// @desc    Reset trạng thái gọi nhân viên của bàn
// @route   PUT /api/tables/:id/reset-call
// @access  Private (Nhân viên)
const resetTableCall = async (req, res) => {
  try {
    const tableId = req.params.id;

    const table = await Table.findByIdAndUpdate(
      tableId,
      {
        DangGoiNhanVien: false,
        YeuCauGanNhat: "",
      },
      { new: true },
    );

    if (!table) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy bàn" });
    }

    res.status(200).json({
      success: true,
      message: "Đã xử lý yêu cầu phục vụ",
      data: table,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// GET /api/tables/calling
const getCallingTables = async (req, res) => {
  try {
    // THÊM .lean() ở đây
    const callingTables = await Table.find({ DangGoiNhanVien: true }).lean();

    console.log("Dữ liệu từ DB:", callingTables); // Xem log ở terminal Backend nhé

    const formattedNotis = callingTables.map((t) => {
      const safeId = t._id ? String(t._id) : Math.random().toString();

      return {
        id: safeId,
        tableId: safeId,
        title: `Khách hàng ${t.SoBan || "ẩn danh"} đang gọi!`,
        body: t.YeuCauGanNhat || "Cần hỗ trợ",
        status: "pending",
      };
    });

    res.json({ success: true, data: formattedNotis });
  } catch (err) {
    console.error("Lỗi getCallingTables:", err);
    res.status(500).json({ success: false });
  }
};
module.exports = {
  getTables,
  getTableById,
  createTable,
  updateTableInfo,
  updateTableStatus,
  resetTableCall,
  getCallingTables,
};
