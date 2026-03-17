const Order = require("../models/order");
const Table = require("../models/table");
const Food = require("../models/Food");
const Restaurant = require("../models/restaurant");

// @desc    Tạo đơn hàng mới hoặc Gộp vào đơn hiện tại
// @route   POST /api/orders
const createOrder = async (req, res) => {
  try {
    const { BanId, KhachHangZaloId, ChiTietMon } = req.body;

    const [table, restaurant] = await Promise.all([
      Table.findById(BanId),
      Restaurant.findOne(),
    ]);

    if (!table) return res.status(404).json({ message: "Bàn không tồn tại" });

    const vatRate = restaurant?.CauHinh?.PhanTramVAT || 0;

    // 1. Xử lý danh sách món mới gọi
    let tongTienMoiChuaThue = 0;
    const processedNewItems = [];

    for (const item of ChiTietMon) {
      const food = await Food.findById(item.FoodId);
      if (!food) continue;

      // Giá gốc của món ăn từ Database
      let giaGocMon = food.Gia;
      let giaOption = 0;

      // Tính tổng tiền các option
      if (item.TuyChonDaChon && item.TuyChonDaChon.length > 0) {
        item.TuyChonDaChon.forEach((opt) => {
          giaOption += Number(opt.Gia) || 0;
        });
      }

      // Giá đơn vị cuối cùng cho item này (Gồm món + topping)
      const giaCuoiCungCuaItem = giaGocMon + giaOption;
      const thanhTienItem = giaCuoiCungCuaItem * item.SoLuong;

      tongTienMoiChuaThue += thanhTienMon;

      processedNewItems.push({
        FoodId: food._id,
        TenMon: food.TenMon, // Lưu lại snapshot tên món
        SoLuong: item.SoLuong,
        GiaDonVi: giaCuoiCungCuaItem, // Đã bao gồm option để sau này in hóa đơn dễ tính
        TuyChonDaChon: item.TuyChonDaChon,
        GhiChu: item.GhiChu,
        TrangThaiMon: "ChoBep",
      });
    }

    // Tính thuế trên phần món mới gọi thêm
    const thueMoi = (tongTienMoiChuaThue * vatRate) / 100;
    const tongTienMoiCoThue = tongTienMoiChuaThue + thueMoi;

    let finalOrder;

    // 2. Kiểm tra gộp đơn
    if (table.TrangThai === "Có Khách" && table.OrderHienTaiId) {
      const existingOrder = await Order.findById(table.OrderHienTaiId);

      if (
        existingOrder &&
        existingOrder.ThanhToan.TrangThai === "ChuaThanhToan"
      ) {
        // GỘP: Đẩy món mới vào mảng hiện tại
        existingOrder.ChiTietMon.push(...processedNewItems);
        // CỘNG DỒN: Tổng tiền cũ + (Tiền món mới + thuế mới)
        existingOrder.TongTien += Math.round(tongTienMoiCoThue);
        finalOrder = await existingOrder.save();
      }
    }

    // 3. Tạo mới nếu không có đơn để gộp
    if (!finalOrder) {
      finalOrder = new Order({
        BanId,
        KhachHangZaloId,
        ChiTietMon: processedNewItems,
        TongTien: Math.round(tongTienMoiCoThue),
        TrangThaiOrder: "ChoXuLy",
        ThanhToan: {
          TrangThai: "ChuaThanhToan",
          PhanTramVAT: vatRate,
        },
      });

      await finalOrder.save();
      table.TrangThai = "Có Khách";
      table.OrderHienTaiId = finalOrder._id;
      await table.save();
    }

    // 4. Socket thông báo cập nhật
    if (global.io) {
      global.io.emit("update_order", finalOrder);
      global.io.emit("table_updated", table);
    }

    res.status(201).json({ message: 0, data: finalOrder });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Lỗi xử lý đơn hàng", error: error.message });
  }
};
// @desc    Lấy danh sách đơn hàng (Có lọc theo trạng thái)
// @route   GET /api/orders
const getOrders = async (req, res) => {
  try {
    const { status, date } = req.query;
    let query = {};

    // Lọc theo trạng thái (VD: ?status=ChoXuLy)
    if (status) {
      query.TrangThaiOrder = status;
    }

    // Lọc theo ngày (Mặc định lấy hôm nay nếu cần)
    // Code đơn giản lấy tất cả, sắp xếp mới nhất trước
    const orders = await Order.find(query)
      .populate("BanId", "SoBan KhuVuc") // Lấy thêm tên bàn
      .sort({ createdAt: -1 });

    res.json({ message: 0, data: orders });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// @desc    Lấy chi tiết đơn hàng
// @route   GET /api/orders/:id
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("BanId");
    if (order) {
      res.json({ message: 0, data: order });
    } else {
      res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// @desc    Cập nhật trạng thái đơn hàng (Bếp làm xong, Thu ngân xác nhận trả tiền)
// @route   PUT /api/orders/:id
const updateOrderStatus = async (req, res) => {
  try {
    const { TrangThaiOrder, ThanhToan } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    // Cập nhật trạng thái xử lý (Bếp/Bar)
    if (TrangThaiOrder) {
      order.TrangThaiOrder = TrangThaiOrder;
    }

    // --- LOGIC PHIÊN: Nếu trạng thái đơn hàng là 'DaPhucVu' (Phục vụ lên đủ món) ---
    // Thì bàn đó sẽ tự động chuyển sang trạng thái 'ChoThanhToan'
    if (TrangThaiOrder === "DaPhucVu") {
      const table = await Table.findById(order.BanId);
      if (table) {
        table.TrangThai = "ChoThanhToan";
        await table.save();
        if (global.io) global.io.emit("table_updated", table);
      }
    }

    // Cập nhật thanh toán (Thu ngân)
    if (ThanhToan) {
      order.ThanhToan = { ...order.ThanhToan, ...ThanhToan };

      // LOGIC QUAN TRỌNG: Nếu đã thanh toán -> Đóng bàn
      if (ThanhToan.TrangThai === "DaThanhToan") {
        order.TrangThaiOrder = "HoanTat"; // Đơn hàng hoàn tất

        // Giải phóng bàn
        const table = await Table.findById(order.BanId);
        if (table) {
          table.TrangThai = "Trống";
          table.OrderHienTaiId = null;
          table.ThoiGianCho = null;
          await table.save();

          // Real-time cập nhật bàn
          if (global.io) global.io.emit("table_updated", table);
        }
      }
    }

    const updatedOrder = await order.save();

    // Real-time cập nhật đơn hàng
    if (global.io) global.io.emit("order_updated", updatedOrder);

    res.json({ message: 0, data: updatedOrder });
  } catch (error) {
    res.status(400).json({ message: "Lỗi cập nhật", error: error.message });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
};
