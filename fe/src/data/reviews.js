// Đánh giá THẬT của khách trên Tripadvisor — chép NGUYÊN VĂN từ widget Trustindex trên trang chủ web cũ
// (vietlooktravel.com, lấy ngày 12/11/2026): tên hiển thị công khai, tiêu đề và nội dung giữ đúng như khách viết
// (kể cả lỗi chính tả). Widget không hiện ngày đánh giá → website KHÔNG ghi ngày.
// Bỏ 2 đánh giá: 1 quá ngắn, 1 bị cắt dở câu. Thêm đánh giá mới: chép nguyên văn từ trang Tripadvisor / Google
// (không viết lại, không dịch thành lời khách), ghi đúng `source` + `url`.
// `trip` / `photo`: nhãn chuyến đi + ảnh minh hoạ do Vietlook gắn theo nội dung đánh giá (không phải của khách).

const TRIPADVISOR =
  "https://www.tripadvisor.com/Attraction_Review-g17733187-d27950353-Reviews-Vietlook_Travel-Ha_Dong_Hanoi.html";

const list = [
  {
    name: "Bhavik Shah",
    title: "Wonderful experience, Vietnam trip, family trip.",
    trip: {
      en: "Family trip · Hanoi & Da Nang",
      zh: "家庭游 · 河内与岘港",
      vi: "Du lịch gia đình · Hà Nội & Đà Nẵng",
    },
    text: "It was a wonderful experience. We enjoyed our stay in ha noi and Danang. The trip was well organised and both the guides MR. TINH (Ha noi) AND MS. ALANA (Da nang) were wonderful, knowledgeable and always smiling. Mr. Tinh gave us so much information about the rich culture and history of ha noi. Ms. Alana also gave us ample information about da nang, bana hills and hoi an. They both planned the the spots in such a way that we enjoyed the spots at their best time of the day. You will have wonderful time in Vietnam and having a guide is must.",
    photo: "/images/tours/v2/da-nang-19927758.jpg",
  },
  {
    name: "Ankil P",
    title: "Patel family",
    trip: { en: "Family tour · Phu Quoc", zh: "家庭游 · 富国岛", vi: "Tour gia đình · Phú Quốc" },
    text: "We had a wonderful experience on our Phu Quoc tour. The guide was very knowledgeable and explained the history and local culture in a way that was easy to understand and interesting. We felt very well taken care of the whole time — friendly, patient, and always checking on us. The trip was comfortable, safe, and well organized. Overall, we are very happy and would definitely recommend this tour.",
    photo: "/images/tours/v2/phu-quoc-14787924.jpg",
  },
  {
    name: "yogesh k",
    title: "Excellent in Da Nang",
    trip: { en: "Holiday · Da Nang", zh: "度假 · 岘港", vi: "Kỳ nghỉ · Đà Nẵng" },
    text: "I had a very good holiday in Da Nang city . The service is very good. And we were very happy to see Tracy our guide from Vietlooktravel . She is very helpful and friendly, take care of us well. And give us good information about DaNang city. Next time we will back again",
    photo: "/images/tours/v2/da-nang-20539373.jpg",
  },
  {
    name: "Niku P",
    title: "Phu Quoc",
    trip: { en: "Island tour · Phu Quoc", zh: "海岛游 · 富国岛", vi: "Tour đảo · Phú Quốc" },
    text: "We had such a great time in Phu Quoc! Thank you so much for being such a kind and thoughtful tour guide. You really made our trip easy and fun — from showing us all the beautiful spots to helping us try local food and learn more about the island. The kids had an amazing time too, and we all felt so well taken care of. We’ll definitely remember this trip and recommend you to anyone visiting Phu Quoc!",
    photo: "/images/tours/v2/phu-quoc-26742975.jpg",
  },
  {
    name: "Sherpa21575634518",
    title: "Da Nang trip",
    trip: {
      en: "City & beach · Da Nang",
      zh: "城市与海滩 · 岘港",
      vi: "Thành phố & biển · Đà Nẵng",
    },
    text: "I had one of the most unforgettable trips of my life — journey to Da Nang. From the moment I arrived, I was amazed by how beautiful and peaceful the city was. The combination of beaches, friendly locals, and delicious food made every moment special. Specailly thanks our tourguide Tracy, very kind person, she help us a lot during the tour",
    photo: "/images/tours/hd/cham-islands-da-nang.jpg",
  },
  {
    name: "Navigator49148771631",
    title: "Vietnam tour hanoi 3 days",
    trip: { en: "3-day tour · Hanoi", zh: "3天游 · 河内", vi: "Tour 3 ngày · Hà Nội" },
    text: "3 days tour at hanoi made us very memorable. Our tour guide me tinh explained us very well. Everything was made perfect for us.",
    photo: "/images/tours/v2/hanoi-920561.jpg",
  },
  {
    name: "Kruti G",
    title: "It was good Experience to explore the cities.",
    trip: { en: "City tours · Vietnam", zh: "城市游 · 越南", vi: "City tour · Việt Nam" },
    text: "It was nice trip. Perfectly organized. our guide was very knowledgable, had good English , and looked after us very well.",
    photo: "/images/tours/hd/hcm-tour-2-1.jpg",
  },
  {
    name: "Nisarg s",
    title: "Danang Trip",
    trip: { en: "Da Nang trip", zh: "岘港之旅", vi: "Chuyến đi Đà Nẵng" },
    text: "Nice Trip. Nice guidance and explanation by Alina (Tour Guide) about History of related places. Good Hotel & Dinner Restaurant. 😊👍👌",
    photo: "/images/tours/v2/hoi-an-20605047.jpg",
  },
];

// Lời khách giữ nguyên tiếng Anh ở mọi ngôn ngữ (không dịch thành lời khách)
export const reviews = list.map((r) => ({
  ...r,
  title: { en: r.title },
  text: { en: r.text },
  rating: 5,
  source: "tripadvisor",
  url: TRIPADVISOR,
  date: null,
}));
