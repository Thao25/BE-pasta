const Food = require("../models/Food");
const Restaurant = require("../models/Restaurant");
const Order = require("../models/Order");

// --- PHẦN 1: AI "TỰ CHẾ" (BACKUP PLAN) ---
// Giữ nguyên logic chat thông minh đã làm ở bước trước
function localAIResponse(message, foods, restaurantInfo, currentOrder) {
  const msg = message.toLowerCase();

  // Phát hiện tiếng Anh
  const isEnglish =
    msg.includes("hello") ||
    msg.includes("hi ") ||
    msg.includes("english") ||
    msg.includes("wifi pass") ||
    msg.includes("price") ||
    msg.includes("order");

  // 1. HỎI VỀ ĐƠN HÀNG
  if (
    msg.includes("đơn") ||
    msg.includes("món của tôi") ||
    msg.includes("lâu") ||
    msg.includes("khi nào") ||
    msg.includes("xong chưa") ||
    msg.includes("order") ||
    msg.includes("status") ||
    msg.includes("long time")
  ) {
    if (!currentOrder) {
      return {
        text: isEnglish
          ? "I couldn't find any active orders for you. Have you placed an order yet? 🤔"
          : "Dạ hiện tại mình chưa thấy đơn hàng nào của bạn đang hoạt động trên hệ thống ạ. Bạn đã đặt món chưa nhỉ? 🤔",
        suggestions: [],
      };
    }

    const status = currentOrder.TrangThaiOrder;
    const items = currentOrder.ChiTietMon.map((i) =>
      isEnglish ? i.TenMon.en : i.TenMon.vi,
    ).join(", ");

    if (status === "ChoXuLy") {
      return {
        text: isEnglish
          ? `Your order (${items}) has been sent. The kitchen will confirm it shortly! ⏳`
          : `Dạ đơn hàng (${items}) của bạn đã được gửi đi rồi ạ. Bếp sẽ xác nhận ngay thôi, bạn chờ xíu nhé! ⏳`,
        suggestions: [],
      };
    }
    if (status === "DangCheBien") {
      return {
        text: isEnglish
          ? `The kitchen is preparing your dishes (${items}) 🔥. It will be ready very soon!`
          : `Bếp đang tập trung chế biến món (${items}) cho bạn rồi ạ 🔥. Món ngon đáng để chờ đợi, xíu xiu nữa là có ngay!`,
        suggestions: [],
      };
    }
    if (status === "DaPhucVu") {
      return {
        text: isEnglish
          ? `Your food has been served. Enjoy your meal! 😋`
          : `Theo hệ thống thì món ăn đã được mang ra bàn rồi ạ. Chúc bạn ngon miệng nhé! 😋 Nếu cần hỗ trợ gì cứ nhắn mình nha.`,
        suggestions: [],
      };
    }
    if (status === "HoanTat") {
      return {
        text: isEnglish
          ? `Your order is completed and paid. Thank you! 🥰`
          : `Đơn hàng của bạn đã hoàn tất thanh toán rồi ạ. Cảm ơn bạn đã ủng hộ quán! 🥰`,
        suggestions: [],
      };
    }
  }

  // 2. Hỏi về WIFI
  if (
    msg.includes("wifi") ||
    msg.includes("pass") ||
    msg.includes("mật khẩu") ||
    msg.includes("internet")
  ) {
    const wifi = restaurantInfo?.CauHinh?.WifiPassword || "12345678";
    return {
      text: isEnglish
        ? `The Wifi password is: ${wifi}. Connect and enjoy! 📶`
        : `Dạ, mật khẩu Wifi của quán là: ${wifi} ạ. Bạn kết nối để lướt web cho mượt nhé! 📶`,
      suggestions: [],
    };
  }

  // 3. Hỏi về GIỜ MỞ CỬA
  if (
    msg.includes("giờ") ||
    msg.includes("mở cửa") ||
    msg.includes("đóng cửa") ||
    msg.includes("open") ||
    msg.includes("close")
  ) {
    const open = restaurantInfo?.CauHinh?.GioMoCua || "08:00";
    const close = restaurantInfo?.CauHinh?.GioDongCua || "22:00";
    return {
      text: isEnglish
        ? `We are open daily from ${open} to ${close}. Happy to serve you! ⏰`
        : `Quán bên mình mở cửa từ ${open} đến ${close} hằng ngày ạ. Rất hân hạnh được phục vụ bạn! ⏰`,
      suggestions: [],
    };
  }

  // 4. Hỏi về ĐỊA CHỈ
  if (
    msg.includes("địa chỉ") ||
    msg.includes("ở đâu") ||
    msg.includes("address") ||
    msg.includes("location")
  ) {
    const addr = restaurantInfo?.DiaChi || "Hà Nội";
    return {
      text: isEnglish
        ? `We are located at: ${addr}. You can check Zalo maps! 📍`
        : `Địa chỉ quán ở: ${addr} ạ. Bạn có thể xem bản đồ trên Zalo nhé! 📍`,
      suggestions: [],
    };
  }

  // 5. Chào hỏi
  if (msg.includes("chào") || msg.includes("hi ") || msg.includes("hello")) {
    const name = restaurantInfo?.TenNhaHang || "Pasta";
    return {
      text: isEnglish
        ? `Hello! 👋 I'm the AI assistant of ${name}. Need help with Wifi, Order status, or Food recommendations?`
        : `Chào bạn! 👋 Mình là trợ lý ảo của ${name}. Bạn cần kiểm tra đơn hàng hay tìm món ngon ạ?`,
      suggestions: [],
    };
  }

  // 6. Tìm kiếm món ăn
  const keywords = msg.split(" ").filter((w) => w.length > 2);
  const suggestedFoods = foods
    .filter((f) => {
      const textCheck = (
        f.TenMon.vi +
        " " +
        f.TenMon.en +
        " " +
        f.MoTa.vi +
        " " +
        f.MoTa.en
      ).toLowerCase();
      return keywords.some((k) => textCheck.includes(k));
    })
    .slice(0, 3);

  if (suggestedFoods.length > 0) {
    const names = suggestedFoods
      .map((f) => (isEnglish ? f.TenMon.en : f.TenMon.vi))
      .join(", ");
    return {
      text: isEnglish
        ? `I found some matches for you: ${names}. Check them out! 😋`
        : `Mình tìm thấy mấy món này hợp ý bạn nè: ${names}. Bạn xem thử nhé! 😋`,
      suggestions: suggestedFoods,
    };
  }

  return {
    text: isEnglish
      ? "I didn't quite get that. You can ask about Order status, Wifi, or specific food names."
      : "Dạ mình chưa hiểu ý bạn lắm. Bạn có thể hỏi về tình trạng đơn hàng, Wifi, hoặc tên món ăn cụ thể được không ạ?",
    suggestions: [],
  };
}

// --- PHẦN 2: GROQ API (GỌI ONLINE) ---
async function callGroqAI(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Chưa cấu hình GROQ_API_KEY");

  const url = "https://api.groq.com/openai/v1/chat/completions";

  const payload = {
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "You are a professional restaurant waiter. Respond based on the language of the user's query. If checking order status, be precise. If recommending food, be creative.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.6,
    max_tokens: 400,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Groq Error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// --- PHẦN 3: CONTROLLERS ---

// @desc    Chat tư vấn (Text + Suggestions)
// @route   POST /api/ai/chat
const chatWithAI = async (req, res) => {
  try {
    const { message, zaloId } = req.body;

    const [foods, restaurantInfo] = await Promise.all([
      Food.find({ TrangThai: "DangBan" }).select(
        "TenMon MoTa Gia LoaiMon AnhMinhHoa",
      ),
      Restaurant.findOne(),
    ]);

    const info = restaurantInfo || {
      TenNhaHang: "Pasta",
      DiaChi: "HN",
      CauHinh: {},
    };

    let currentOrder = null;
    let orderContext = "Khách chưa có đơn hàng nào đang hoạt động.";

    if (zaloId) {
      currentOrder = await Order.findOne({
        KhachHangZaloId: zaloId,
        TrangThaiOrder: { $in: ["ChoXuLy", "DangCheBien", "DaPhucVu"] },
      }).sort({ createdAt: -1 });

      if (currentOrder) {
        const monAn = currentOrder.ChiTietMon.map(
          (m) => `${m.TenMon.vi} (${m.TenMon.en})`,
        ).join(", ");
        orderContext = `
            THÔNG TIN ĐƠN HÀNG CỦA KHÁCH:
            - Món: ${monAn}
            - Trạng thái: ${currentOrder.TrangThaiOrder} (ChoXuLy: Pending, DangCheBien: Cooking, DaPhucVu: Served).
            - Tổng tiền: ${currentOrder.TongTien}
            `;
      }
    }

    if (foods.length === 0)
      return res.json({
        message: 0,
        data: { text: "Menu đang cập nhật ạ.", suggestions: [] },
      });

    try {
      const infoContext = `
        Tên quán: ${info.TenNhaHang}
        Địa chỉ: ${info.DiaChi}
        Wifi Pass: ${info.CauHinh?.WifiPassword || "Không có"}
        Giờ mở cửa: ${info.CauHinh?.GioMoCua} - ${info.CauHinh?.GioDongCua}
        `;

      const menuContext = foods
        .map((f) => `ID:${f._id}|${f.TenMon.vi}/${f.TenMon.en}|${f.Gia}`)
        .join("\n");

      const prompt = `
          DATA CONTEXT:
          ${infoContext}
          ${orderContext}
          
          MENU (ID|Name_VI/Name_EN|Price):
          ${menuContext}

          CUSTOMER MESSAGE: "${message}"

          INSTRUCTIONS:
          1. Detect language (VN/EN). Reply in that language.
          2. Prioritize Info/Order Status questions.
          3. If suggesting food, append "SUGGEST_IDS: id1, id2".
        `;

      const rawText = await callGroqAI(prompt);

      let replyText = rawText;
      let suggestedFoods = [];

      if (rawText.includes("SUGGEST_IDS:")) {
        const parts = rawText.split("SUGGEST_IDS:");
        replyText = parts[0].trim();
        const idsString = parts[1].trim();
        const idList = idsString.split(",").map((id) => id.trim());
        suggestedFoods = foods.filter((f) => idList.includes(f._id.toString()));
      }

      return res.json({
        message: 0,
        data: { text: replyText, suggestions: suggestedFoods },
      });
    } catch (apiError) {
      console.warn("⚠️ AI Online lỗi:", apiError.message);
      const localResult = localAIResponse(message, foods, info, currentOrder);
      return res.json({ message: 0, data: localResult });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: 1, data: { text: "Lỗi hệ thống.", suggestions: [] } });
  }
};

// @desc    Gợi ý món ăn thông minh (Dựa trên lịch sử & Thời gian)
// @route   GET /api/ai/recommend
const recommendFood = async (req, res) => {
  try {
    const { zaloId } = req.query; // Lấy ID khách hàng từ URL (vd: ?zaloId=123)

    const foods = await Food.find({ TrangThai: "DangBan" });

    // Logic Random dự phòng (Có tính toán loại món)
    const getRandomSmart = () => {
      const drinks = foods.filter((f) => f.LoaiMon === "DoUong");
      const mainDishes = foods.filter((f) => f.LoaiMon === "MonChinh");

      const rDrink = drinks[Math.floor(Math.random() * drinks.length)];
      const rFood = mainDishes[Math.floor(Math.random() * mainDishes.length)];
      const others = foods.filter(
        (f) => f._id !== rDrink?._id && f._id !== rFood?._id,
      );
      const rOther = others[Math.floor(Math.random() * others.length)];

      return [rFood, rDrink, rOther].filter(Boolean);
    };

    try {
      // 1. Phân tích Lịch sử ăn uống (Personalization)
      let historyContext = "Khách hàng mới, chưa có lịch sử ăn uống.";
      if (zaloId) {
        // Lấy 5 đơn gần nhất
        const pastOrders = await Order.find({ KhachHangZaloId: zaloId })
          .sort({ createdAt: -1 })
          .limit(5);

        if (pastOrders.length > 0) {
          // Gom tất cả món đã từng ăn
          const eatenDishes = pastOrders.flatMap((o) =>
            o.ChiTietMon.map((i) => i.TenMon.vi),
          );
          // Đếm tần suất (Món nào ăn nhiều nhất)
          const frequency = {};
          eatenDishes.forEach((dish) => {
            frequency[dish] = (frequency[dish] || 0) + 1;
          });
          // Sắp xếp món ăn nhiều nhất
          const favorites = Object.keys(frequency)
            .sort((a, b) => frequency[b] - frequency[a])
            .slice(0, 3);

          historyContext = `Khách hàng này thích ăn: ${favorites.join(", ")}. Hãy ưu tiên gợi ý các món này hoặc món có hương vị tương tự.`;
        }
      }

      // 2. Phân tích Ngữ cảnh Thời gian
      const hour = new Date().getHours();
      let timeContext = "";
      if (hour >= 6 && hour < 11)
        timeContext =
          "Buổi sáng (cần năng lượng, tỉnh táo). Gợi ý Cà phê, Điểm tâm.";
      else if (hour >= 11 && hour < 14)
        timeContext = "Buổi trưa (cần no bụng). Gợi ý Cơm, Mì, Món mặn.";
      else if (hour >= 14 && hour < 18)
        timeContext = "Buổi chiều (ăn nhẹ/tráng miệng). Gợi ý Trà, Bánh ngọt.";
      else
        timeContext =
          "Buổi tối (thư giãn, ăn ngon). Gợi ý Lẩu, Món nướng, Rượu.";

      // 3. Gọi AI Groq
      const menuLite = foods
        .map((f) => `${f.TenMon.vi} (${f.LoaiMon})`)
        .join(", ");

      const prompt = `
          MENU QUÁN: ${menuLite}
          
          NGỮ CẢNH:
          - Thời gian: ${timeContext}
          - Lịch sử khách: ${historyContext}
          
          NHIỆM VỤ:
          Chọn ra đúng 3 món ăn phù hợp nhất từ MENU QUÁN.
          Kết hợp giữa sở thích cũ và món phù hợp khung giờ.
          
          OUTPUT:
          Chỉ trả về JSON Array chứa tên món chính xác trong Menu. Ví dụ: ["Cà phê sữa", "Cơm tấm", "Trà đào"]
        `;

      const text = await callGroqAI(prompt);
      const jsonMatch = text.match(/\[.*\]/s);

      if (jsonMatch) {
        const recommendedNames = JSON.parse(jsonMatch[0]);
        // Map tên về Object đầy đủ để hiển thị ảnh
        const finalSuggestions = foods.filter((f) =>
          recommendedNames.some(
            (name) => f.TenMon.vi.includes(name) || name.includes(f.TenMon.vi),
          ),
        );

        // Nếu AI gợi ý ít hơn 3 món (do lọc tên không khớp), bù bằng random
        if (finalSuggestions.length < 3) {
          const smartRandom = getRandomSmart();
          // Merge và loại bỏ trùng lặp
          const merged = [...finalSuggestions, ...smartRandom].filter(
            (v, i, a) => a.findIndex((t) => t._id === v._id) === i,
          );
          return res.json({ message: 0, data: merged.slice(0, 3) });
        }

        return res.json({ message: 0, data: finalSuggestions });
      } else {
        throw new Error("AI Format Error");
      }
    } catch (e) {
      console.warn("⚠️ AI Recommend lỗi:", e.message);
      return res.json({ message: 0, data: getRandomSmart() });
    }
  } catch (error) {
    res.status(500).json({ message: "Lỗi gợi ý" });
  }
};

module.exports = {
  chatWithAI,
  recommendFood,
};
