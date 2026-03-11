const Order = require("../models/order");
const Table = require("../models/table");
const Food = require("../models/Food");

// @desc    Tạo đơn hàng mới (Khách đặt món từ Zalo)
// @route   POST /api/orders
const createOrder = async (req, res) => {
  try {
    const { BanId, KhachHangZaloId, ChiTietMon } = req.body;

    // 1. Kiểm tra bàn có tồn tại không
    const table = await Table.findById(BanId);
    if (!table) {
      return res.status(404).json({ message: "Bàn không tồn tại" });
    }

    // 2. Tính toán lại giá tiền từ Server (để tránh Client hack giá)
    let tongTien = 0;
    const processedItems = [];

    for (const item of ChiTietMon) {
      const food = await Food.findById(item.FoodId);
      if (!food) continue; // Bỏ qua nếu món không tồn tại

      // Snapshot dữ liệu (Lưu tên/giá tại thời điểm đặt)
      let giaDonVi = food.Gia;

      // Cộng tiền Option (Size, Topping)
      if (item.TuyChonDaChon && item.TuyChonDaChon.length > 0) {
        item.TuyChonDaChon.forEach((opt) => {
          giaDonVi += opt.Gia;
        });
      }

      tongTien += giaDonVi * item.SoLuong;

      processedItems.push({
        FoodId: food._id,
        TenMon: food.TenMon, // Lưu object song ngữ
        SoLuong: item.SoLuong,
        GiaDonVi: giaDonVi,
        TuyChonDaChon: item.TuyChonDaChon,
        GhiChu: item.GhiChu,
        TrangThaiMon: "ChoBep",
      });
    }

    // 3. Tạo đơn hàng mới
    const newOrder = new Order({
      BanId,
      KhachHangZaloId,
      ChiTietMon: processedItems,
      TongTien: tongTien,
      TrangThaiOrder: "ChoXuLy",
      ThanhToan: { TrangThai: "ChuaThanhToan" },
    });

    const savedOrder = await newOrder.save();

    // 4. Cập nhật trạng thái Bàn -> "Có Khách" & Gán Order ID
    table.TrangThai = "Có Khách";
    table.OrderHienTaiId = savedOrder._id;
    await table.save();

    // 5. Bắn Socket thông báo Real-time cho Bếp/Thu ngân
    if (global.io) {
      global.io.emit("new_order", savedOrder);
      global.io.emit("table_updated", table);
    }

    res.status(201).json({ message: 0, data: savedOrder });
  } catch (error) {
    res.status(400).json({ message: "Lỗi tạo đơn hàng", error: error.message });
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

// @desc    Cập nhật trạng thái đơn hàng (Bếp làm xong, hoặc Thu ngân xác nhận trả tiền)
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
