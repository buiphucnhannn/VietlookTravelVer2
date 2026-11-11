/**
 * Câu báo lỗi cho KHÁCH trên website (form đặt tour, liên hệ, báo giá…) theo ngôn ngữ trang (en / zh / vi).
 * Website hiện thẳng `error.details[0].message` (hoặc `error.message`) → câu phải dễ hiểu, không kỹ thuật.
 * Lỗi phía CMS vẫn dùng tiếng Việt như cũ.
 */
const MESSAGES = {
  en: {
    tooMany: "You have sent too many requests. Please try again in a few minutes.",
    captcha: "Please complete the security check and try again.",
    tourUnavailable: "This tour is no longer available. Please choose another tour or contact us.",
    name: "Please enter your name.",
    email: "Please enter a valid email address.",
    phone: "Please enter a valid phone number.",
    contact: "Please enter your email or phone number.",
    date: "Please choose a future date.",
    departureSchedule: "Please choose one of this tour's departure dates.",
    tour: "Please choose a tour.",
    tooLong: "Some fields are too long. Please shorten them and try again.",
    invalid: "Please check the information you entered and try again.",
    consent: "Please tick the box to let us contact you about your request.",
  },
  zh: {
    tooMany: "您提交的请求过多，请几分钟后再试。",
    captcha: "请完成安全验证后重试。",
    tourUnavailable: "该行程已停售，请选择其他行程或联系我们。",
    name: "请输入您的姓名。",
    email: "请输入有效的电子邮箱。",
    phone: "请输入有效的电话号码。",
    contact: "请填写电子邮箱或电话号码。",
    date: "请选择今天之后的日期。",
    departureSchedule: "请选择该行程的出发日期之一。",
    tour: "请选择行程。",
    tooLong: "部分内容过长，请缩短后重试。",
    invalid: "请检查您填写的信息后重试。",
    consent: "请勾选同意框，以便我们就您的咨询与您联系。",
  },
  vi: {
    tooMany: "Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau ít phút.",
    captcha: "Vui lòng hoàn tất bước xác minh rồi gửi lại.",
    tourUnavailable:
      "Tour này hiện không còn mở bán. Vui lòng chọn tour khác hoặc liên hệ với chúng tôi.",
    name: "Vui lòng nhập họ tên.",
    email: "Email chưa đúng định dạng.",
    phone: "Số điện thoại chưa đúng.",
    contact: "Vui lòng nhập email hoặc số điện thoại.",
    date: "Vui lòng chọn ngày từ hôm nay trở đi.",
    departureSchedule: "Vui lòng chọn một trong các ngày khởi hành của tour.",
    tour: "Vui lòng chọn tour.",
    tooLong: "Một số ô nhập quá dài, vui lòng rút gọn rồi gửi lại.",
    invalid: "Vui lòng kiểm tra lại thông tin đã nhập.",
    consent: "Vui lòng đánh dấu vào ô đồng ý để chúng tôi có thể liên hệ với bạn về yêu cầu này.",
  },
};

const DATE_FIELDS = new Set(["date", "returnDate", "entryDate", "arrival", "departureDate"]);

/** Ngôn ngữ của khách: body.lang (form gửi kèm) → mặc định tiếng Anh */
export function formLang(req) {
  const lang = req?.body?.lang;
  return lang === "zh" || lang === "vi" ? lang : "en";
}

export const formMessage = (lang, key) => (MESSAGES[lang] ?? MESSAGES.en)[key] ?? MESSAGES.en[key];

/**
 * Đổi chi tiết lỗi kiểm tra dữ liệu (field "body.email"…) sang câu dễ hiểu theo ngôn ngữ khách.
 * @param {{ field: string, message: string }[]} details
 */
export function localizeFormDetails(details, lang) {
  return (details ?? []).map((d) => {
    const field = String(d.field ?? "").split(".")[1] ?? "";
    let key = "invalid";
    if (field === "name") key = "name";
    else if (field === "email") key = /required/i.test(d.message) ? "contact" : "email";
    else if (field === "phone") key = "phone";
    else if (field === "tourSlug") key = "tour";
    else if (field === "consent") key = "consent";
    else if (DATE_FIELDS.has(field)) key = "date";
    else if (/too (big|long)|Tối đa|<=/i.test(d.message)) key = "tooLong";
    return { field: d.field, message: formMessage(lang, key) };
  });
}
