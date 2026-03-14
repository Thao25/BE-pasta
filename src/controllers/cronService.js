const cron = require("node-cron");
const Food = require("../models/Food");
const Restaurant = require("../models/restaurant");
const Table = require("../models/table");

const startCronJobs = () => {
  // 1. Reset trạng thái món "Hết hàng" về "Đang bán" vào lúc 00:00 hằng ngày
  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        await Food.updateMany(
          { TrangThai: "HetHang" },
          { $set: { TrangThai: "DangBan" } },
        );
        console.log("⏰ [CRON] Đã reset trạng thái món ăn cho ngày mới.");
      } catch (error) {
        console.error("❌ [CRON] Lỗi reset món ăn:", error);
      }
    },
    { scheduled: true, timezone: "Asia/Ho_Chi_Minh" },
  );

  // 2. Tác vụ kiểm tra mỗi phút: Quản lý Đóng/Mở cửa và Dọn bàn tự động
  cron.schedule("* * * * *", async () => {
    try {
      const res = await Restaurant.findOne();
      if (!res) return;

      const now = new Date();
      // Chuyển đổi sang múi giờ Việt Nam
      const vnTime = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
      );
      const curTimeStr = `${vnTime.getHours().toString().padStart(2, "0")}:${vnTime.getMinutes().toString().padStart(2, "0")}`;

      // A. KIỂM TRA TỰ ĐỘNG MỞ CỬA LẠI (Nếu đang trong thời gian tạm ngưng 30p/1h/Hôm nay)
      if (
        !res.TrangThaiHoatDong &&
        res.TamNgungDen &&
        vnTime >= res.TamNgungDen
      ) {
        res.TrangThaiHoatDong = true;
        res.TamNgungDen = null;
        await res.save();
        if (global.io)
          global.io.emit("restaurant_status_changed", { isOpen: true });
        console.log(
          "🔓 [CRON] Nhà hàng đã tự động mở cửa trở lại sau thời gian tạm ngưng.",
        );
      }

      // =========================================================================
      // B. KIỂM TRA DỌN BÀN TỰ ĐỘNG (TRƯỚC GIỜ MỞ CỬA 10 PHÚT)
      // =========================================================================
      const gioMoCua = res.CauHinh.GioMoCua || "08:00";
      const [h, m] = gioMoCua.split(":").map(Number);

      const openingDate = new Date(vnTime);
      openingDate.setHours(h, m, 0, 0);

      // Tính mốc thời gian dọn dẹp (Giờ mở cửa - 10 phút)
      const cleanupThreshold = new Date(openingDate.getTime() - 10 * 60000);

      // Nếu bây giờ trùng khớp với phút dọn dẹp (Ví dụ mở cửa 8:00 -> dọn lúc 7:50)
      if (
        vnTime.getHours() === cleanupThreshold.getHours() &&
        vnTime.getMinutes() === cleanupThreshold.getMinutes()
      ) {
        const result = await Table.updateMany(
          { TrangThai: { $ne: "Trống" } },
          {
            $set: {
              TrangThai: "Trống",
              OrderHienTaiId: null,
              ThoiGianCho: null,
            },
          },
        );
        if (result.modifiedCount > 0) {
          if (global.io)
            global.io.emit("tables_reset_all", {
              message: "Chuẩn bị mở cửa, tất cả bàn đã được dọn sạch.",
            });
          console.log(
            `🧹 [CRON] Đã dọn dẹp ${result.modifiedCount} bàn trước giờ mở cửa 10 phút.`,
          );
        }
      }

      // C. TỰ ĐỘNG CẬP NHẬT TRẠNG THÁI THEO GIỜ HÀNH CHÍNH (Nếu không có lệnh đóng cửa thủ công)
      if (!res.TamNgungDen) {
        const { GioMoCua, GioDongCua } = res.CauHinh;
        // Logic kiểm tra giờ mở cửa (xử lý cả trường hợp mở xuyên đêm)
        let shouldBeOpen =
          GioMoCua < GioDongCua
            ? curTimeStr >= GioMoCua && curTimeStr < GioDongCua
            : curTimeStr >= GioMoCua || curTimeStr < GioDongCua;

        if (res.TrangThaiHoatDong !== shouldBeOpen) {
          res.TrangThaiHoatDong = shouldBeOpen;
          await res.save();
          if (global.io)
            global.io.emit("restaurant_status_changed", {
              isOpen: shouldBeOpen,
            });
        }
      }
    } catch (error) {
      console.error("❌ [CRON] Lỗi trong tác vụ quản lý cửa hàng:", error);
    }
  });

  // 3. Tác vụ dọn bàn "treo" (Khách quét QR quá 20 phút mà không đặt món)
  cron.schedule("* * * * *", async () => {
    try {
      const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);

      const idleTables = await Table.find({
        TrangThai: { $in: ["Có Khách", "Chờ thanh toán"] },
        OrderHienTaiId: null,
        ThoiGianCho: { $lte: twentyMinutesAgo },
      });

      if (idleTables.length > 0) {
        for (let table of idleTables) {
          table.TrangThai = "Trống";
          table.ThoiGianCho = null;
          await table.save();
          if (global.io) global.io.emit("table_updated", table);
          console.log(
            `🧹 [CRON] Reset bàn treo do không gọi món: ${table.SoBan}`,
          );
        }
      }
    } catch (error) {
      console.error("❌ [CRON] Lỗi dọn dẹp bàn treo:", error);
    }
  });

  console.log("⚙️ [CRON] Hệ thống quản lý vận hành tự động đã sẵn sàng.");
};

module.exports = startCronJobs;
