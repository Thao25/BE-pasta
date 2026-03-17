const Order = require("../models/order");
const User = require("../models/User");

// Hàm hỗ trợ tính toán khoảng thời gian (Start Date - End Date)
const getDateRange = (timeframe) => {
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();

  switch (timeframe) {
    case "day": // Hôm nay
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "week": // Tuần này (Từ Thứ 2 đến Chủ nhật)
      const day = now.getDay() || 7; // Get current day number, converting Sun(0) to 7
      if (day !== 1) startDate.setHours(-24 * (day - 1)); // Lùi về thứ 2
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "month": // Tháng này
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      break;
    case "quarter": // Quý này
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      endDate = new Date(
        now.getFullYear(),
        quarter * 3 + 3,
        0,
        23,
        59,
        59,
        999,
      );
      break;
    case "year": // Năm nay
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    default: // Mặc định là tuần này
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
  }

  return { startDate, endDate };
};

// @desc    Lấy dữ liệu thống kê Dashboard
// @route   GET /api/reports/dashboard
const getDashboardStats = async (req, res) => {
  try {
    const { timeframe = "week" } = req.query; // Nhận timeframe từ query param
    const { startDate, endDate } = getDateRange(timeframe);

    // Điều kiện lọc chung cho các đơn hàng ĐÃ THANH TOÁN trong khoảng thời gian
    const orderMatchCondition = {
      createdAt: { $gte: startDate, $lte: endDate },
      "ThanhToan.TrangThai": "DaThanhToan",
    };

    // 1. Tính Tổng Doanh Thu & Tổng Đơn Hàng
    const overviewStats = await Order.aggregate([
      { $match: orderMatchCondition },
      {
        $group: {
          _id: null,
          tongDoanhThu: { $sum: "$TongTien" },
          tongDonHang: { $sum: 1 },
        },
      },
    ]);

    const tongDoanhThu =
      overviewStats.length > 0 ? overviewStats[0].tongDoanhThu : 0;
    const tongDonHang =
      overviewStats.length > 0 ? overviewStats[0].tongDonHang : 0;

    // 2. Đếm Khách Hàng Mới
    const khachHangMoi = await User.countDocuments({
      Role: "KhachHang",
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // 3. Thống kê Top Món Bán Chạy Nhất
    const topFoods = await Order.aggregate([
      { $match: orderMatchCondition },
      { $unwind: "$ChiTietMon" },
      {
        $group: {
          _id: "$ChiTietMon.FoodId",
          ten: { $first: "$ChiTietMon.TenMon.vi" },
          sl: { $sum: "$ChiTietMon.SoLuong" },
          tongTien: {
            $sum: {
              $multiply: ["$ChiTietMon.GiaDonVi", "$ChiTietMon.SoLuong"],
            },
          },
        },
      },
      { $sort: { sl: -1 } }, // Sắp xếp giảm dần theo số lượng
      { $limit: 5 }, // Lấy top 5
    ]);

    // 4. Biểu đồ Doanh Thu
    let chartData = [];

    if (timeframe === "week" || timeframe === "day") {
      const dailyStats = await Order.aggregate([
        { $match: orderMatchCondition },
        {
          $group: {
            _id: { $dayOfWeek: "$createdAt" },
            tien: { $sum: "$TongTien" },
          },
        },
      ]);

      const dayNames = {
        2: "T2",
        3: "T3",
        4: "T4",
        5: "T5",
        6: "T6",
        7: "T7",
        1: "CN",
      };
      const maxRevenue = Math.max(...dailyStats.map((d) => d.tien), 1000000);

      chartData = [2, 3, 4, 5, 6, 7, 1].map((dayNum) => {
        const found = dailyStats.find((d) => d._id === dayNum);
        return {
          thu: dayNames[dayNum],
          tien: found ? found.tien : 0,
          max: maxRevenue,
        };
      });
    } else if (timeframe === "month") {
      const dailyStats = await Order.aggregate([
        { $match: orderMatchCondition },
        {
          $group: {
            _id: { $dayOfMonth: "$createdAt" },
            tien: { $sum: "$TongTien" },
          },
        },
      ]);

      const daysInMonth = endDate.getDate();
      const maxRevenue = Math.max(...dailyStats.map((d) => d.tien), 1000000);

      for (let i = 1; i <= daysInMonth; i++) {
        const found = dailyStats.find((d) => d._id === i);
        const label = i === 1 || i % 5 === 0 || i === daysInMonth ? `${i}` : "";
        chartData.push({
          thu: label,
          tien: found ? found.tien : 0,
          max: maxRevenue,
        });
      }
    } else if (timeframe === "quarter") {
      const monthlyStats = await Order.aggregate([
        { $match: orderMatchCondition },
        {
          $group: {
            _id: { $month: "$createdAt" },
            tien: { $sum: "$TongTien" },
          },
        },
      ]);

      const startMonth = startDate.getMonth() + 1;
      const maxRevenue = Math.max(...monthlyStats.map((m) => m.tien), 5000000);

      for (let i = 0; i < 3; i++) {
        const currentMonth = startMonth + i;
        const found = monthlyStats.find((m) => m._id === currentMonth);
        chartData.push({
          thu: `Th${currentMonth}`,
          tien: found ? found.tien : 0,
          max: maxRevenue,
        });
      }
    } else if (timeframe === "year") {
      const monthlyStats = await Order.aggregate([
        { $match: orderMatchCondition },
        {
          $group: {
            _id: { $month: "$createdAt" },
            tien: { $sum: "$TongTien" },
          },
        },
      ]);

      const maxRevenue = Math.max(...monthlyStats.map((m) => m.tien), 5000000);
      for (let i = 1; i <= 12; i++) {
        const found = monthlyStats.find((m) => m._id === i);
        chartData.push({
          thu: `Th${i}`,
          tien: found ? found.tien : 0,
          max: maxRevenue,
        });
      }
    }

    res.json({
      message: 0,
      data: {
        timeframe,
        tongDoanhThu,
        tongDonHang,
        khachHangMoi,
        monBanChay: topFoods,
        bieuDoDoanhThu: chartData,
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu báo cáo:", error);
    res.status(500).json({ message: 1, error: error.message });
  }
};

// @desc    Xuất báo cáo chi tiết dạng Excel
// @route   GET /api/reports/export
const exportDetailedReport = async (req, res) => {
  try {
    const { timeframe } = req.query;
    const { startDate, endDate } = getDateRange(timeframe);

    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
      "ThanhToan.TrangThai": "DaThanhToan",
    })
      .populate("BanId", "SoBan KhuVuc")
      .sort({ createdAt: -1 })
      .lean();

    const khachHangMoi = await User.countDocuments({
      Role: "KhachHang",
      createdAt: { $gte: startDate, $lte: endDate },
    });
    let tongDoanhThu = 0;
    let tongDonHang = orders.length;
    const thongKeMon = {};

    orders.forEach((order) => {
      tongDoanhThu += order.TongTien;

      order.ChiTietMon.forEach((item) => {
        const tenMon = item.TenMon?.vi || item.TenMon || "Khác";
        if (!thongKeMon[tenMon]) {
          thongKeMon[tenMon] = { soLuong: 0, doanhThu: 0 };
        }
        thongKeMon[tenMon].soLuong += item.SoLuong;
        thongKeMon[tenMon].doanhThu += item.GiaDonVi * item.SoLuong;
      });
    });

    const mangThongKeMon = Object.keys(thongKeMon)
      .map((key) => ({
        tenMon: key,
        soLuong: thongKeMon[key].soLuong,
        doanhThu: thongKeMon[key].doanhThu,
      }))
      .sort((a, b) => b.soLuong - a.soLuong);

    const timeLabel =
      timeframe === "day"
        ? "Hôm nay"
        : timeframe === "week"
          ? "Tuần này"
          : timeframe === "month"
            ? "Tháng này"
            : timeframe === "quarter"
              ? "Quý này"
              : "Năm nay";

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; }
          .title { font-size: 24px; font-weight: bold; color: #004085; text-align: center; }
          .subtitle { font-size: 18px; font-style: normal; text-align: center; margin-bottom: 20px; }
          .summary-box { font-size: 16px; font-weight: bold; color: #155724; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 30px; }
          th, td { border: 1px solid #dee2e6; padding: 8px; text-align: left; }
          th { background-color: #0068ff; color: white; font-weight: bold; text-align: center; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .currency { font-weight: bold; color: #c82333; }
        </style>
      </head>
      <body>
        <div class="title">BÁO CÁO KẾT QUẢ KINH DOANH NHÀ HÀNG PASTA</div>
        <div class="subtitle">Kỳ báo cáo: ${timeLabel} (Từ ${startDate.toLocaleDateString("vi-VN")} đến ${endDate.toLocaleDateString("vi-VN")})</div>
        <div class="subtitle">Ngày xuất file: ${new Date().toLocaleString("vi-VN")}</div>
        
                     <h3   colspan="2" class="summary-box">TỔNG QUAN KINH DOANH</h3>

        <table>       

          <tr>
            <td><b>Tổng số đơn hàng thành công:</b></td>
            <td class="text-center"><b>${tongDonHang} đơn</b></td>
          </tr>
          <tr>
            <td><b>Tổng doanh thu thực tế:</b></td>
            <td class="text-center currency"> <b>${tongDoanhThu.toLocaleString("vi-VN")} VNĐ</b></td>
          </tr>
            <tr>
            <td><b>Khách hàng mới:</b></td>
            <td class="text-center"><b>${khachHangMoi} đơn</b></td>
          </tr>
        </table>

             <h3   colspan="2" class="summary-box">THỐNG KÊ MẶT HÀNG BÁN RA (TOP BÁN CHẠY)</h3>
        <table>
          <tr>
            <th style="width: 10px; text-align: center;">STT</th>
            <th style="width: 300px; text-align: center;">Món Ăn / Đồ Uống</th>
            <th style="width: 150px; text-align: center;">Số Lượng</th>
            <th style="width: 200px; text-align: center;">Doanh Thu </th>
          </tr>
          ${
            mangThongKeMon.length > 0
              ? mangThongKeMon
                  .map(
                    (mon, index) => `
            <tr>
              <td class="text-center">${index + 1}</td>
              <td>${mon.tenMon}</td>
              <td class="text-center"><b>${mon.soLuong}</b></td>
              <td class="text-right currency">${mon.doanhThu.toLocaleString("vi-VN")} VNĐ</td>
            </tr>
          `,
                  )
                  .join("")
              : `<tr><td colspan="4" class="text-center">Không có dữ liệu bán hàng</td></tr>`
          }
        </table>

             <h3   colspan="2" class="summary-box">CHI TIẾT DANH SÁCH ĐƠN HÀNG </h3>
        <table>
          <tr>
            <th style="width: 10px; text-align: center;">STT</th>
            <th style="width: 50px; text-align: center;">Mã Đơn</th>
            <th style="width: 180px; text-align: center;">Thời Gian</th>
            <th style="width: 120px; text-align: center;">Vị Trí Bàn</th>
            <th style="width: 350px; text-align: center;">Chi Tiết Đơn Hàng</th>
            <th style="width: 200px; text-align: center;">Thanh Toán </th>
            <th style="width: 180px; text-align: center;">Hình Thức TT</th>
          </tr>
          ${
            orders.length > 0
              ? orders
                  .map((order, index) => {
                    const maDon = order._id.toString().slice(-6).toUpperCase();
                    const ban = order.BanId
                      ? `${order.BanId.SoBan} (${order.BanId.KhuVuc})`
                      : "Bàn ảo/Đã xóa";

                    const chiTietList = order.ChiTietMon.map((m) => {
                      const tenMon = m.TenMon?.vi || m.TenMon || "Món ăn";
                      let opts = "";
                      if (m.TuyChonDaChon && m.TuyChonDaChon.length > 0) {
                        opts = ` [+ ${m.TuyChonDaChon.map((o) => o.Ten).join(", ")}]`;
                      }
                      return `- ${tenMon} (x${m.SoLuong})${opts}`;
                    }).join("<br/>");

                    const ptThanhToan =
                      order.ThanhToan.PhuongThuc === "TienMat"
                        ? "Tiền mặt"
                        : "Chuyển khoản";
                    const ngayDat = new Date(order.createdAt).toLocaleString(
                      "vi-VN",
                    );

                    return `
              <tr>
                <td class="text-center">${index + 1}</td>
                <td class="text-center font-bold">#${maDon}</td>
                <td class="text-center">${ngayDat}</td>
                <td>${ban}</td>
                <td>${chiTietList}</td>
                <td class="text-right currency">${order.TongTien.toLocaleString("vi-VN")} VNĐ</td>
                <td class="text-center">${ptThanhToan}</td>
              </tr>
            `;
                  })
                  .join("")
              : `<tr><td colspan="7" class="text-center">Không có đơn hàng nào trong khoảng thời gian này</td></tr>`
          }
        </table>
      </body>
      </html>
    `;

    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Bao_Cao_Nha_Hang_Pasta_${timeframe}_${Date.now()}.xls"`,
    );

    res.status(200).send(htmlContent);
  } catch (error) {
    console.error("Lỗi khi xuất báo cáo:", error);
    res.status(500).json({ message: 1, error: error.message });
  }
};

module.exports = {
  getDashboardStats,
  exportDetailedReport,
};
