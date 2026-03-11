const cron = require("node-cron");
const Food = require("../models/Food");
const Restaurant = require("../models/restaurant");

const startCronJobs = () => {
  // =========================================================================
  // 1. TÁC VỤ 1: RESET TRẠNG THÁI MÓN "HẾT HÀNG" THÀNH "ĐANG BÁN" LÚC NỬA ĐÊM
  // =========================================================================
  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        console.log(
          "⏰ [CRON JOB] Đang chạy tác vụ kiểm tra và reset trạng thái món ăn...",
        );
        const result = await Food.updateMany(
          { TrangThai: "HetHang" },
          { $set: { TrangThai: "DangBan" } },
        );
        console.log(
          `✅ [CRON JOB] Hoàn tất! Đã tự động mở bán lại ${result.modifiedCount} món ăn.`,
        );
      } catch (error) {
        console.error("❌ [CRON JOB] Lỗi khi reset trạng thái món ăn:", error);
      }
    },
    {
      scheduled: true,
      timezone: "Asia/Ho_Chi_Minh",
    },
  );

  // =========================================================================
  // 2. TÁC VỤ 2: TỰ ĐỘNG ĐÓNG/MỞ CỬA THEO GIỜ CÀI ĐẶT (CHẠY MỖI PHÚT)
  // =========================================================================
  // '* * * * *' nghĩa là chạy mỗi phút một lần
  cron.schedule("* * * * *", async () => {
    try {
      const restaurant = await Restaurant.findOne();

      if (!restaurant || !restaurant.CauHinh) return;

      const { GioMoCua, GioDongCua } = restaurant.CauHinh;
      if (!GioMoCua || !GioDongCua) return;

      // Lấy giờ phút hiện tại theo chuẩn múi giờ Việt Nam
      const now = new Date();
      const vnTime = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
      );

      const currentHour = vnTime.getHours();
      const currentMinute = vnTime.getMinutes();

      // Format thành chuỗi HH:mm (VD: "08:05", "22:30") để so sánh chuỗi trực tiếp
      const currentTimeStr = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;

      let isOpen = false;

      // Logic tính toán trạng thái mở cửa
      if (GioMoCua < GioDongCua) {
        isOpen = currentTimeStr >= GioMoCua && currentTimeStr < GioDongCua;
      } else {
        // Trường hợp bán xuyên đêm qua ngày hôm sau (VD: Mở 18:00, Đóng 02:00)
        isOpen = currentTimeStr >= GioMoCua || currentTimeStr < GioDongCua;
      }

      // So sánh với trạng thái hiện tại trong DB, nếu khác thì mới cập nhật
      if (restaurant.TrangThaiHoatDong !== isOpen) {
        restaurant.TrangThaiHoatDong = isOpen;
        await restaurant.save();

        console.log(
          `⚙️ [CRON JOB - TỰ ĐỘNG] Chuyển trạng thái quán thành: ${isOpen ? "MỞ CỬA 🟢" : "ĐÓNG CỬA 🔴"} (Lúc ${currentTimeStr})`,
        );

        // Bắn Socket để App Khách hàng & Web Admin tự đổi giao diện (Nếu bạn có cấu hình Socket)
        if (global.io) {
          global.io.emit("restaurant_status_changed", { isOpen });
        }
      }
    } catch (error) {
      console.error(
        "❌ [CRON JOB] Lỗi khi tự động cập nhật đóng/mở cửa:",
        error,
      );
    }
  });

  console.log(
    "⚙️  [CRON JOB] Hệ thống tác vụ tự động (Reset Món & Đóng/Mở cửa) đã được kích hoạt.",
  );
};

module.exports = startCronJobs;
