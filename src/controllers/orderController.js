const Order = require("../models/order");
const Table = require("../models/table");
const Food = require("../models/Food");
const Restaurant = require("../models/restaurant");
const moment = require("moment-timezone");
const createOrder = async (req, res) => {
  try {
    const { BanId, KhachHangZaloId, ChiTietMon } = req.body;

    const [table, restaurant] = await Promise.all([
      Table.findById(BanId),
      Restaurant.findOne(),
    ]);

    if (!table) return res.status(404).json({ message: "Bàn không tồn tại" });
    const vatRate = restaurant?.CauHinh?.PhanTramVAT || 0;

    // 1. Xử lý danh sách món mới
    let tongTienMoiChuaThue = 0;
    const processedNewItems = [];

    for (const item of ChiTietMon) {
      const food = await Food.findById(item.FoodId);
      if (!food) continue;

      // CHỈ LẤY GIÁ GỐC MÓN
      const giaGocMon = food.Gia;
      let tongTienOptions = 0;

      // Tính riêng tiền options
      if (item.TuyChonDaChon && item.TuyChonDaChon.length > 0) {
        item.TuyChonDaChon.forEach((opt) => {
          tongTienOptions += Number(opt.Gia) || 0;
        });
      }

      // Tổng tiền của item = (Giá gốc + Tổng giá các option) * Số lượng
      const thanhTienCuaItemNay = (giaGocMon + tongTienOptions) * item.SoLuong;
      tongTienMoiChuaThue += thanhTienCuaItemNay;

      processedNewItems.push({
        FoodId: food._id,
        TenMon: food.TenMon,
        SoLuong: item.SoLuong,
        GiaDonVi: giaGocMon, // ✅ CHỈ LƯU GIÁ GỐC TẠI ĐÂY
        TuyChonDaChon: item.TuyChonDaChon, // Chi tiết giá từng option đã nằm trong mảng này
        GhiChu: item.GhiChu,
        TrangThaiMon: "ChoBep",
      });
    }

    const thueMoi = (tongTienMoiChuaThue * vatRate) / 100;
    const tongTienMoiCoThue = tongTienMoiChuaThue + thueMoi;

    let finalOrder;

    // 2. Kiểm tra gộp đơn (Logic giữ nguyên)
    if (
      (table.TrangThai === "Có Khách" ||
        table.TrangThai === "Chờ thanh toán") &&
      table.OrderHienTaiId
    ) {
      const existingOrder = await Order.findById(table.OrderHienTaiId);
      if (
        existingOrder &&
        existingOrder.ThanhToan.TrangThai === "ChuaThanhToan"
      ) {
        existingOrder.ChiTietMon.push(...processedNewItems);
        existingOrder.TongTien += Math.round(tongTienMoiCoThue);
        existingOrder.TrangThaiOrder = "ChoXuLy"; //
        existingOrder.TrangThai = "Có Khách"; // Đảm bảo trạng thái bàn vẫn là Có Khách
        finalOrder = await existingOrder.save();
      }
    }

    // 3. Tạo mới nếu không gộp
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

    if (global.io) {
      global.io.emit("update_order", finalOrder);
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

    // Lọc theo ngày (Mặc định lấy hôm nay nếu cần) sắp xếp mới nhất trước
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
// @desc    Lấy lịch sử đơn hàng của khách hàng
// @route   GET /api/orders/history/:zaloId
const getOrderHistory = async (req, res) => {
  try {
    const { zaloId } = req.params;

    const orders = await Order.find({ KhachHangZaloId: zaloId })
      .populate("BanId", "SoBan KhuVuc") // Để hiển thị khách ngồi bàn nào
      .sort({ createdAt: -1 }); // Mới nhất lên đầu

    res.status(200).json({ message: 0, data: orders });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi lấy lịch sử đơn hàng", error: error.message });
  }
};
// @desc    Hủy đơn hàng (Chỉ dành cho đơn đang chờ xử lý)
// @route   PATCH /api/orders/cancel/:id
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    // CHI KIỂM TRA: Nếu đơn chưa được bếp xác nhận mới cho hủy
    if (order.TrangThaiOrder !== "ChoXuLy") {
      return res
        .status(400)
        .json({ message: "Đơn hàng đã được chế biến, không thể hủy!" });
    }

    order.TrangThaiOrder = "DaHuy";
    await order.save();

    // Cập nhật lại bàn tương ứng để bàn đó trở về trạng thái trống
    await Table.findByIdAndUpdate(order.BanId, {
      TrangThai: "Trống",
      OrderHienTaiId: null,
    });

    if (global.io) {
      global.io.emit("order_cancelled", order);
    }

    res.status(200).json({ message: 0, data: order });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};

const updateStaffOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { role, newStatus } = req.body; // role: "Bep"/"Bar", newStatus: "DangLam"/"DaXong"

    const order = await Order.findById(orderId).populate("ChiTietMon.FoodId");
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn" });

    // 1. Nếu Bếp/Bar ấn "Bắt đầu làm" (DangLam) và đơn   -> Đổi thành "DangCheBien"
    if (newStatus === "DangLam") {
      order.TrangThaiOrder = "DangCheBien";
    }

    // 2. Cập nhật TrangThaiMon cho TẤT CẢ các món thuộc KhuVucCheBien của nhân viên đó
    order.ChiTietMon.forEach((item) => {
      if (item.FoodId?.KhuVucCheBien === role) {
        // Chỉ cập nhật những món chưa xong hoặc chưa hủy
        if (!["DaXong", "DaRaMon", "DaHuy"].includes(item.TrangThaiMon)) {
          item.TrangThaiMon = newStatus;
        }
      }
    });

    // 3. KIỂM TRA TỔNG THỂ: Nếu TẤT CẢ các món trong toàn bộ đơn đã là "DaXong" hoặc "DaRaMon"
    const isAllItemsDone = order.ChiTietMon.every((item) =>
      ["DaXong", "DaRaMon", "DaHuy"].includes(item.TrangThaiMon),
    );

    if (isAllItemsDone) {
      order.TrangThaiOrder = "DaLamXong";
    }

    const updatedOrder = await order.save();

    // 4. Socket Real-time
    if (global.io) {
      // Đảm bảo đơn hàng gửi đi đã có thông tin bàn để các màn hình khác cập nhật UI
      const orderForSocket = await Order.findById(order._id)
        .populate("BanId", "SoBan KhuVuc")
        .lean(); // Dùng lean để lấy object nhẹ hơn

      global.io.emit("order_updated", orderForSocket);

      // Thông báo riêng cho Phục vụ khi có món "DaXong"
      if (newStatus === "DaXong") {
        global.io.emit("notify_server_food_ready", {
          orderId: order._id,
          role: role, // "Bep" hoặc "Bar"
          ban: orderForSocket.BanId,
          message: `Món từ ${role} cho ${orderForSocket.BanId?.SoBan} đã sẵn sàng!`,
        });
      }
    }

    res.json({ message: 0, data: updatedOrder });
  } catch (error) {
    res.status(400).json({ message: "Lỗi", error: error.message });
  }
};

//  PHỤC VỤ XÁC NHẬN BƯNG MÓN ---
const serverConfirmServed = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { itemId } = req.body;

    const order = await Order.findById(orderId).populate("ChiTietMon.FoodId");
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn" });

    // 1. CHỈ CẬP NHẬT MÓN ĐƯỢC CLICK
    let itemFound = false;
    order.ChiTietMon.forEach((item) => {
      // So sánh ID của item trong mảng ChiTietMon
      if (item._id.toString() === itemId) {
        item.TrangThaiMon = "DaRaMon";
        itemFound = true;
      }
    });

    if (!itemFound)
      return res
        .status(400)
        .json({ message: "Không tìm thấy món này trong đơn" });

    // 2. KIỂM TRA TỔNG THỂ: Nếu toàn bộ đơn đã là "DaRaMon" (hoặc DaHuy)
    const isAllServed = order.ChiTietMon.every((item) =>
      ["DaRaMon", "DaHuy"].includes(item.TrangThaiMon),
    );

    if (isAllServed) {
      order.TrangThaiOrder = "DaPhucVu";

      const table = await Table.findById(order.BanId);
      if (table) {
        table.TrangThai = "Chờ thanh toán"; // Đồng bộ với database của bạn
        await table.save();
        if (global.io) global.io.emit("table_updated", table);
      }
    }

    const savedOrder = await order.save();
    if (global.io) global.io.emit("order_updated", savedOrder);

    res.json({ message: 0, data: savedOrder });
  } catch (error) {
    res.status(400).json({ message: "Lỗi", error: error.message });
  }
};
const getOrdersForStaff = async (req, res) => {
  try {
    const { role } = req.query;

    let query = {
      TrangThaiOrder: { $in: ["ChoXuLy", "DangCheBien", "DaLamXong"] },
    };

    const orders = await Order.find(query)
      .populate("BanId", "SoBan KhuVuc")
      .populate("ChiTietMon.FoodId", "KhuVucCheBien")
      .sort({ updatedAt: 1 }); //đơn cũ nhất lên trước

    for (let order of orders) {
      let displayItems = [];

      for (let item of order.ChiTietMon) {
        // Tìm thông tin món ăn để biết khu vực chế biến
        const foodData = await Food.findById(item.FoodId)
          .select("KhuVucCheBien")
          .lean();

        if (foodData) {
          item.FoodId = foodData; // Gán data vào để App dùng (nếu cần)

          if (role === "PhucVu") {
            // ROLE PHỤC VỤ: Thấy tất cả các món để biết tiến độ bàn đó
            displayItems.push(item);
          } else if (foodData.KhuVucCheBien === role) {
            // ROLE BẾP/BAR: Chỉ thấy món thuộc khu vực mình
            displayItems.push(item);
          }
        }
      }
      order.ChiTietMon = displayItems;
    }

    // Chỉ trả về những đơn hàng có món cần hiển thị
    const finalData = orders.filter((order) => order.ChiTietMon.length > 0);

    res.status(200).json({ success: true, message: 0, data: finalData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getOrdersToday = async (req, res) => {
  try {
    // 1. Lấy thời điểm hiện tại theo múi giờ Việt Nam
    const nowVN = moment().tz("Asia/Ho_Chi_Minh");

    // 2. Xác định điểm bắt đầu ngày (00:00:00) và kết thúc ngày (23:59:59) của VN
    // Sau đó .toDate() sẽ tự động chuyển về định dạng UTC mà MongoDB hiểu
    const startOfDay = nowVN.clone().startOf("day").toDate();
    const endOfDay = nowVN.clone().endOf("day").toDate();

    console.log("Tìm đơn từ (UTC):", startOfDay);
    console.log("Đến (UTC):", endOfDay);

    const orders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate("BanId", "SoBan KhuVuc")
      .sort({ createdAt: -1 });

    // Tính tổng doanh thu
    const totalRevenue = orders
      .filter((o) => o.ThanhToan.TrangThai === "DaThanhToan")
      .reduce((sum, o) => sum + (o.TongTien || 0), 0);

    res.status(200).json({
      success: true,
      message: 0,
      data: orders,
      summary: {
        totalOrders: orders.length,
        totalRevenue: totalRevenue,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  getOrdersToday,
  updateOrderStatus,
  updateStaffOrderStatus,
  serverConfirmServed,
  cancelOrder,
  getOrderHistory,
  getOrdersForStaff,
};
