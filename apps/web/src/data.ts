export type Product = {
  id: number;
  name: string;
  subtitle: string;
  category: string;
  tags: string[];
  price: number;
  image: string;
  fallbackImage: string;
  alt: string;
  badge?: string;
  stemCount: string;
  scent: string;
  longevity: string;
  story: string;
  flowers: string[];
  palette: [string, string, string];
};

export const products: Product[] = [
  {
    id: 1,
    name: "Juliet",
    subtitle: "Hoa hồng vườn Anh Quốc, sắc hồng phấn sương mai",
    category: "Hoa hồng",
    tags: ["Tình yêu", "Sinh nhật", "Kỷ niệm"],
    price: 890000,
    image: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=1000&q=85",
    fallbackImage: "/images/p-rose.svg",
    alt: "Bó hoa hồng Juliet màu hồng phấn nở rộ",
    badge: "Được yêu nhất",
    stemCount: "18 cành tuyển",
    scent: "Hương trà bá tước dịu nhẹ",
    longevity: "Tươi 5 – 7 ngày",
    story:
      "Những đóa hồng Juliet xếp lớp cánh dày như váy lụa, mang sắc hồng phấn ấm áp — dành cho những lời thương dịu dàng nhưng sâu đậm.",
    flowers: ["Hồng Juliet Đà Lạt", "Mao lương trắng kem", "Lá bạc Eucalyptus"],
    palette: ["#f9d5de", "#e27d96", "#6b8c78"],
  },
  {
    id: 2,
    name: "Mây Trắng",
    subtitle: "Tulip Hà Lan trắng kem & hồng pastel",
    category: "Tulip",
    tags: ["Sinh nhật", "Tặng mẹ", "Tình yêu"],
    price: 650000,
    image: "https://images.unsplash.com/photo-1520763185298-1b434c919102?auto=format&fit=crop&w=1000&q=85",
    fallbackImage: "/images/p-tulip.svg",
    alt: "Bó tulip trắng và hồng phấn trong nắng sớm",
    badge: "Mới hái sáng nay",
    stemCount: "20 cành",
    scent: "Hương cỏ sớm thanh khiết",
    longevity: "Tươi 5 – 6 ngày",
    story:
      "Hai mươi nhành tulip còn khép nụ sẽ từ từ hé nở trong bình nước mát, như một buổi sáng mùa xuân trong trẻo ghé qua bàn làm việc.",
    flowers: ["Tulip trắng Hà Lan", "Tulip hồng pastel", "Lá tùng nho mảnh"],
    palette: ["#ffffff", "#f6ccd7", "#74947c"],
  },
  {
    id: 3,
    name: "Vườn Của Mẹ",
    subtitle: "Hoa đồng nội phối màu pastel tự nhiên",
    category: "Hoa vườn",
    tags: ["Tặng mẹ", "Tân gia", "Sinh nhật"],
    price: 720000,
    image: "https://images.unsplash.com/photo-1563241527-3004b7be0ffd?auto=format&fit=crop&w=1000&q=85",
    fallbackImage: "/images/p-mixed.svg",
    alt: "Bó hoa đồng nội rực rỡ sắc hồng và kem",
    badge: "Tặng Mẹ",
    stemCount: "22 – 25 cành",
    scent: "Hương thảo mộc & cúc mật",
    longevity: "Tươi 6 – 8 ngày",
    story:
      "Gợi nhớ khu vườn nhỏ ngập nắng của mẹ mỗi sáng sớm: tự nhiên, phóng khoáng với cúc mẫu đơn, hồng bụi và cỏ đồng nội ngát hương.",
    flowers: ["Cúc họa mi kép", "Hồng bụi Ohara", "Phi yến trắng"],
    palette: ["#fff6ea", "#f09cb0", "#9582b8"],
  },
  {
    id: 4,
    name: "Lụa Là",
    subtitle: "Mẫu đơn hồng Coral & hồng nhung kiêu kỳ",
    category: "Mẫu đơn",
    tags: ["Tình yêu", "Kỷ niệm"],
    price: 1150000,
    image: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=1000&q=85",
    fallbackImage: "/images/p-peony.svg",
    alt: "Bó mẫu đơn hồng nhung kiêu sa",
    badge: "Phiên bản giới hạn",
    stemCount: "12 cành lớn",
    scent: "Hương mẫu đơn ngọt quyến rũ",
    longevity: "Tươi 5 – 7 ngày",
    story:
      "Sắc hồng nhung kiêu kỳ của mẫu đơn bung nở tròn đầy như mây chiều — món quà sang trọng bậc nhất cho ngày kỷ niệm đáng nhớ.",
    flowers: ["Mẫu đơn Coral Charm", "Hồng Ohara đỏ hồng", "Lá bạc hoàng kim"],
    palette: ["#f7b5c4", "#d14b68", "#3d3431"],
  },
  {
    id: 5,
    name: "Mộc Tinh Khôi",
    subtitle: "Cẩm tú cầu trắng & hồng kem tinh khiết",
    category: "Hoa trắng",
    tags: ["Tân gia", "Tặng mẹ", "Sinh nhật"],
    price: 580000,
    image: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?auto=format&fit=crop&w=1000&q=85",
    fallbackImage: "/images/p-white.svg",
    alt: "Bó hoa trắng tinh khôi gói giấy mỹ thuật",
    stemCount: "15 cành",
    scent: "Thanh mát tự nhiên",
    longevity: "Tươi 6 – 8 ngày",
    story:
      "Bình yên và tinh khôi như đúng tên gọi của tiệm. Những cụm hoa trắng muốt ôm lấy lớp giấy lụa mờ, bừng sáng mọi góc nhà mới.",
    flowers: ["Cẩm tú cầu trắng", "Hồng trắng Avalanche", "Cúc Tana điểm xuyết"],
    palette: ["#ffffff", "#dce8df", "#e5d2b8"],
  },
  {
    id: 6,
    name: "Khô Mộng",
    subtitle: "Hoa khô nghệ thuật tông nắng mật ong",
    category: "Hoa khô",
    tags: ["Tân gia", "Hoa khô"],
    price: 490000,
    image: "https://images.unsplash.com/photo-1508610048659-a06b669e3321?auto=format&fit=crop&w=1000&q=85",
    fallbackImage: "/images/p-dried.svg",
    alt: "Bó hoa nghệ thuật tông vàng nắng ấm áp",
    badge: "Bền 12 tháng",
    stemCount: "Bó lớn",
    scent: "Hương lúa mạch & oải hương khô",
    longevity: "Giữ đẹp 6 – 12 tháng",
    story:
      "Được xử lý giữ sắc tự nhiên tại xưởng của tiệm, lưu giữ nguyên vẹn phom dáng và sắc nắng mật ong ấm áp suốt bốn mùa không tàn.",
    flowers: ["Hồng sấy khô tự nhiên", "Cúc bất tử vàng kem", "Lúa mạch & cỏ đuôi thỏ"],
    palette: ["#f9efe0", "#e6b87a", "#b08f68"],
  },
];

export const occasions = ["Tất cả", "Tình yêu", "Sinh nhật", "Tặng mẹ", "Tân gia", "Hoa khô"];

export const processSteps = [
  {
    number: "01",
    title: "Tuyển hoa lúc sương sớm",
    badge: "5:30 sáng tại vườn",
    copy: "Mỗi sáng tinh mơ, Mộc tự tay chọn từng cành hoa hạng A còn ngậm sương từ nông trại Đà Lạt và hoa nhập khẩu.",
  },
  {
    number: "02",
    title: "Thiết kế 3D & Gói lụa",
    badge: "Đa tầng không gian",
    copy: "Cắm theo cấu trúc vòm 3D thoáng khí để từng bông hoa có không gian bung nở, bọc giấy lụa Hàn và thắt nơ satin.",
  },
  {
    number: "03",
    title: "Giao siêu tốc giữ mát",
    badge: "Nội thành trong 2 giờ",
    copy: "Bó hoa được cấp ẩm gốc và vận chuyển bằng đội ngũ giao hoa riêng trong 2 giờ, giữ nguyên phom dáng hoàn hảo.",
  },
  {
    number: "04",
    title: "Gửi ảnh & Lưu khoảnh khắc",
    badge: "Cam kết 100% hài lòng",
    copy: "Chụp ảnh thực tế gửi bạn duyệt trước khi đi và gửi thông báo ngay khi hoa đã trao tận tay người thương.",
  },
];

export const testimonials = [
  {
    quote:
      "Mình đã rất bối rối khi chọn hoa cho lễ cưới. Mộc nhắn lại chỉ sau mười phút, hỏi mình muốn kể câu chuyện gì. Ngày hôm ấy, bó hoa cầm tay đẹp hơn cả giấc mơ mình viết ra.",
    name: "Chị Hà My",
    meta: "Hà Nội · Hoa cưới",
    occasion: "Hoa cưới",
    avatar: 0,
    featured: true,
  },
  {
    quote:
      "Đặt mừng kỷ niệm 5 năm từ Sài Gòn. Hoa đến đúng giờ, thiệp viết đúng lời mình nhờ. Vợ mình tưởng mình bay ra Hà Nội tự cắm.",
    name: "Anh Minh Quân",
    meta: "TP. Hồ Chí Minh · Kỷ niệm",
    occasion: "Kỷ niệm",
    avatar: 1,
  },
  {
    quote:
      "Mẹ mình giữ lại cả tờ giấy gói và treo nhành hoa khô lên tường. Bó hoa thì tàn, còn cảm giác được thương thì vẫn ở đó.",
    name: "Chị Thảo Linh",
    meta: "Đà Nẵng · Quà tặng mẹ",
    occasion: "Tặng mẹ",
    avatar: 2,
  },
];

export const faqs = [
  {
    q: "Hoa có đủ tươi để giao trong ngày không?",
    a: "Mỗi bó hoa được cắm và gói ngay trong ngày giao. Chúng mình nhập hoa từ vườn mỗi sáng, giữ trong kho mát 16°C và chỉ chọn những cành đủ mùa để đi xa. Nếu hoa chưa kịp nở như ý, Mộc sẽ thay bằng cành tương đương và nhắn bạn trước.",
  },
  {
    q: "Mình ở ngoài Hà Nội thì đặt thế nào?",
    a: "Bạn vẫn đặt được bình thường. Chúng mình nhận giao toàn quốc bằng chuyển phát hoa tươi giữ mát; với nội thành Hà Nội, shipper riêng của tiệm sẽ giao trong 2 giờ. Bạn chọn ngày, khung giờ và để lại lời nhắn cho người nhận trong phần thanh toán.",
  },
  {
    q: "Có được đổi mẫu hoa hoặc màu giấy không?",
    a: "Có. Bạn có thể tự phối trực tiếp ở mục “Xưởng Hoa 3D” ngay trên web hoặc để lại ghi chú. Mộc sẽ gửi 2–3 phương án cùng khoảng giá trước khi làm để bạn hoàn toàn yên tâm.",
  },
  {
    q: "Hoa giao đến không đúng như mong muốn thì sao?",
    a: "Chúng mình nhận trách nhiệm đến cùng. Nếu có cành héo, gãy hoặc mẫu hoa khác mô tả, bạn gửi ảnh trong vòng 4 giờ sau khi nhận — Mộc sẽ làm lại và giao bù trong ngày, hoàn toàn miễn phí.",
  },
  {
    q: "Có thể đặt một bó hoa nhỏ, ngân sách vừa phải không?",
    a: "Được. Tiệm có những bó từ 350.000đ với hoa theo mùa. Bạn nhắn Mộc ngân sách dự kiến, dịp tặng và sắc hoa yêu thích, mình sẽ gợi ý phương án phù hợp nhất — đẹp không nằm ở số cành.",
  },
];

export const navLinks = [
  { label: "Bộ sưu tập", href: "#bo-suu-tap" },
  { label: "Xưởng phối 3D", href: "#xuong-hoa-3d" },
  { label: "Quy trình", href: "#quy-trinh" },
  { label: "Câu chuyện", href: "#nguoi-giu-vuon" },
  { label: "Đánh giá", href: "#chuyen-hoa" },
  { label: "Hỏi đáp", href: "#hoi-dap" },
];

export function formatPrice(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(value)}₫`;
}

export const FREE_SHIPPING_THRESHOLD = 1000000;
