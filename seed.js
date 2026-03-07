const mongoose = require("mongoose");
require("dotenv").config(); // Load biến môi trường từ file .env

// Import các Models
const Restaurant = require("./src/models/Restaurant");
const User = require("./src/models/User");
const Food = require("./src/models/Food");
const Table = require("./src/models/Table");
const Order = require("./src/models/Order");

// Kết nối Database
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Đã kết nối MongoDB để tạo dữ liệu mẫu!"))
  .catch((err) => {
    console.error("❌ Lỗi kết nối MongoDB:", err);
    process.exit(1);
  });

const seedDatabase = async () => {
  try {
    console.log("🗑️ Đang xóa dữ liệu cũ...");
    await Promise.all([
      Restaurant.deleteMany(),
      User.deleteMany(),
      Food.deleteMany(),
      Table.deleteMany(),
      Order.deleteMany(),
    ]);

    // 1. TẠO CẤU HÌNH NHÀ HÀNG
    console.log("🏠 Đang tạo Cấu hình nhà hàng...");
    const restaurant = await Restaurant.create({
      TenNhaHang: "Nhà Hàng Pasta Demo",
      DiaChi: "141 Chiến Thắng, Thanh Trì, HN",
      ToaDo: { Lat: 20.980123, Lng: 105.790456 },
      CauHinh: {
        WifiPassword: "nhahangpasta",
        BanKinhChoPhep: 50,
        GioMoCua: "08:00",
        GioDongCua: "22:00",
      },
      ThongTinNganHang: {
        BankId: "MB",
        AccountNo: "0123456789",
        AccountName: "NGUYEN VAN A",
      },
      DanhSachKhuVuc: ["Tầng 1", "Tầng 2", "Sân Vườn", "Phòng VIP"],
    });

    // 2. TẠO TÀI KHOẢN NGƯỜI DÙNG & NHÂN VIÊN
    console.log("👥 Đang tạo Tài khoản nhân viên & khách hàng...");
    const users = await User.insertMany([
      {
        HoTen: "Nguyễn Văn Admin",
        Username: "admin",
        Password: "hashed_password",
        Role: "QuanLy",
      },
      {
        HoTen: "Trần Thu Ngân",
        Username: "thungan1",
        Password: "123",
        Role: "ThuNgan",
      },
      {
        HoTen: "Lê Bếp Trưởng",
        Username: "bep1",
        Password: "123",
        Role: "Bep",
      },
      // Mock vài khách hàng để thống kê "Khách Hàng Mới"
      {
        HoTen: "Khách Zalo 1",
        ZaloId: "zalo_user_1",
        Role: "KhachHang",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        HoTen: "Khách Zalo 2",
        ZaloId: "zalo_user_2",
        Role: "KhachHang",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        HoTen: "Khách Zalo 3",
        ZaloId: "zalo_user_3",
        Role: "KhachHang",
        createdAt: new Date(),
      },
    ]);

    // 3. TẠO THỰC ĐƠN MÓN ĂN
    console.log("🍔 Đang tạo Thực đơn món ăn...");
    const foods = await Food.insertMany([
      {
        TenMon: { vi: "Trà Sữa Trân Châu", en: "Pearl Milk Tea" },
        MoTa: { vi: "Thơm ngon đậm vị", en: "Delicious" },
        Gia: 30000,
        LoaiMon: "DoUong",
        KhuVucCheBien: "Bar",
        TrangThai: "DangBan",
        AnhMinhHoa: "https://placehold.co/300x300/e2e8f0/475569?text=Tra+Sua",
      },
      {
        TenMon: { vi: "Hồng Trà Macchiato", en: "Black Tea Macchiato" },
        Gia: 35000,
        LoaiMon: "DoUong",
        KhuVucCheBien: "Bar",
        TrangThai: "DangBan",
        AnhMinhHoa: "https://placehold.co/300x300/e2e8f0/475569?text=Macchiato",
      },
      {
        TenMon: { vi: "Steak Bò Mỹ", en: "Beef Steak" },
        Gia: 250000,
        LoaiMon: "MonChinh",
        KhuVucCheBien: "Bep",
        TrangThai: "DangBan",
        AnhMinhHoa: "https://placehold.co/300x300/e2e8f0/475569?text=Steak",
      },
      {
        TenMon: { vi: "Bánh Tiramisu", en: "Tiramisu Cake" },
        Gia: 45000,
        LoaiMon: "TrangMieng",
        KhuVucCheBien: "Bep",
        TrangThai: "DangBan",
        AnhMinhHoa: "https://placehold.co/300x300/e2e8f0/475569?text=Tiramisu",
      },
      {
        TenMon: { vi: "Bún Chả Hà Nội", en: "Hanoi Grilled Pork" },
        Gia: 50000,
        LoaiMon: "MonChinh",
        KhuVucCheBien: "Bep",
        TrangThai: "DangBan",
        AnhMinhHoa: "https://placehold.co/300x300/e2e8f0/475569?text=Bun+Cha",
      },
    ]);

    // 4. TẠO BÀN
    console.log("🪑 Đang tạo Danh sách bàn...");
    const tables = await Table.insertMany([
      {
        SoBan: "Bàn 01",
        KhuVuc: "Tầng 1",
        TrangThai: "Trống",
        MaQR: "https://zalo.me/s/123/?tableId=t1",
      },
      {
        SoBan: "Bàn 02",
        KhuVuc: "Tầng 1",
        TrangThai: "Trống",
        MaQR: "https://zalo.me/s/123/?tableId=t2",
      },
      {
        SoBan: "VIP 1",
        KhuVuc: "Phòng VIP",
        TrangThai: "Trống",
        MaQR: "https://zalo.me/s/123/?tableId=t3",
      },
      {
        SoBan: "Bàn Ngoài Trời",
        KhuVuc: "Sân Vườn",
        TrangThai: "Trống",
        MaQR: "https://zalo.me/s/123/?tableId=t4",
      },
    ]);

    // 5. TẠO DỮ LIỆU ĐƠN HÀNG GIẢ (MOCK ORDERS CHO DASHBOARD)
    console.log("🧾 Đang tạo dữ liệu Đơn hàng ngẫu nhiên (Cho 7 ngày qua)...");
    const mockOrders = [];
    const now = new Date();

    // Sinh ra 50 đơn hàng rải rác trong 7 ngày gần đây
    for (let i = 0; i < 50; i++) {
      // Chọn ngẫu nhiên 1 ngày trong 7 ngày qua
      const randomDaysAgo = Math.floor(Math.random() * 7);
      const orderDate = new Date();
      orderDate.setDate(now.getDate() - randomDaysAgo);
      // Giả lập giờ đặt ngẫu nhiên từ 10h sáng -> 21h tối
      orderDate.setHours(
        Math.floor(Math.random() * 11) + 10,
        Math.floor(Math.random() * 60),
        0,
      );

      // Chọn ngẫu nhiên 1 đến 3 món cho đơn hàng này
      const numItems = Math.floor(Math.random() * 3) + 1;
      const orderItems = [];
      let totalAmount = 0;

      for (let j = 0; j < numItems; j++) {
        const randomFood = foods[Math.floor(Math.random() * foods.length)];
        const qty = Math.floor(Math.random() * 2) + 1; // Số lượng từ 1-2

        totalAmount += randomFood.Gia * qty;

        orderItems.push({
          FoodId: randomFood._id,
          TenMon: randomFood.TenMon,
          SoLuong: qty,
          GiaDonVi: randomFood.Gia,
          TrangThaiMon: "DaRaMon",
        });
      }

      mockOrders.push({
        BanId: tables[Math.floor(Math.random() * tables.length)]._id,
        KhachHangZaloId: `zalo_user_${Math.floor(Math.random() * 5)}`,
        ChiTietMon: orderItems,
        TongTien: totalAmount,
        TrangThaiOrder: "HoanTat",
        ThanhToan: {
          TrangThai: "DaThanhToan",
          PhuongThuc: Math.random() > 0.5 ? "TienMat" : "ChuyenKhoan",
          ThoiGian: orderDate,
        },
        createdAt: orderDate, // Đặt thời gian lùi về quá khứ
        updatedAt: orderDate,
      });
    }

    await Order.insertMany(mockOrders);

    console.log("🎉 Xong! Đã nạp thành công toàn bộ dữ liệu mẫu vào Database.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Có lỗi xảy ra trong quá trình nạp dữ liệu:", error);
    process.exit(1);
  }
};

seedDatabase();
