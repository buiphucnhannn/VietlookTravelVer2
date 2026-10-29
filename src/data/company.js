// Nội dung giới thiệu doanh nghiệp – tóm lược từ trang About Us của vietlooktravel.com.
export const about = {
  story: {
    en: [
      "Established in 2009 in Hanoi (formerly known as A Thai Travel), Vietlook Travel has grown into a trusted Vietnam tour operator focusing on private tours, tailor-made journeys and transport services for travellers from all over the world.",
      "Besides private programmes, we run daily shared tours across the country – Hanoi city tours, Ninh Binh, Halong Bay and Sapa in the North; Da Nang, the Coconut Forest, Hoi An and Ba Na Hills in the Centre; Ho Chi Minh City, Cu Chi and the Mekong Delta in the South.",
      "Our guides speak English, Chinese, French, German, Spanish, Japanese and Korean. We listen carefully to every guest to craft a holiday filled with exciting experiences – the kind of trip people tell their friends and family about again and again.",
    ],
    zh: [
      "Vietlook Travel 于2009年在河内成立（前身为 A Thai Travel），现已成为值得信赖的越南地接社，专注于为世界各地游客提供私人团、定制行程与交通服务。",
      "除私人行程外，我们还在全国运营每日拼团线路——北部的河内城市游、宁平、下龙湾与沙坝；中部的岘港、椰林、会安与巴拿山；南部的胡志明市、古芝地道与湄公河三角洲。",
      "我们的导游可使用英语、中文、法语、德语、西班牙语、日语与韩语。我们认真倾听每一位客人，打造充满惊喜的假期——让客人一次又一次向亲友讲述的旅程。",
    ],
  },
  vision: {
    en: "To become Asia's best travel company offering high-quality tailor-made holidays within Asia and beyond.",
    zh: "成为亚洲最好的旅游公司，提供高品质的亚洲及全球定制假期。",
  },
  mission: {
    en: "Create unique, personalised holidays for discerning travellers from around the world.",
    zh: "为来自世界各地的挑剔旅客打造独特的个性化假期。",
  },
  values: [
    {
      title: { en: "Pioneer service", zh: "先锋服务" },
      text: {
        en: "Speed, attention to detail, quality focus and guest-centred operations – heartfelt service from the start.",
        zh: "快速响应、关注细节、专注品质、以客为本——从一开始就用心服务。",
      },
    },
    {
      title: { en: "Business of humanity", zh: "人本经营" },
      text: {
        en: "We promote human-centred values that benefit our guests, our team and our country.",
        zh: "我们倡导以人为本的价值观，惠及客人、团队与国家。",
      },
    },
    {
      title: { en: "Wow experiences", zh: "惊喜体验" },
      text: {
        en: "Local gurus and on-site specialists creating memorable moments for our guests every day.",
        zh: "本地达人与现场专家，每天为客人创造难忘时刻。",
      },
    },
  ],
  people: {
    en: ["Integrity", "Proactivity", "Responsibility", "Creativity", "Happiness"],
    zh: ["诚信", "主动", "责任", "创新", "快乐"],
  },
  languages: ["English", "中文", "Français", "Deutsch", "Español", "日本語", "한국어"],
};

export const policies = {
  payment: {
    title: { en: "Payment & refund", zh: "付款与退款" },
    subtitle: {
      en: "How to pay for your trip – international card online or bank transfer – and how refunds are made.",
      zh: "如何支付行程费用——在线国际银行卡或银行转账——以及退款方式。",
    },
    image: "/images/tours/hd/hcm-tour-2-1.jpg",
    // Nội dung khung; mức đặt cọc/hoàn tiền cụ thể chờ Vietlook cung cấp (tài liệu yêu cầu mục 2b, 9 #10)
    body: {
      en: `<p>After you send a booking request, our team confirms availability and sends you a written confirmation with the final price in USD. You only pay once you have agreed to that confirmation.</p><h2>How to pay</h2><ul><li><strong>International card online</strong> – Visa, Mastercard and JCB through the secure 9Pay payment gateway on this website.</li><li><strong>Bank transfer</strong> – to the company account of Vietlook Travel and Trading Company Limited stated on your confirmation. Please only transfer to the account shown on your latest confirmation.</li><li><strong>In person</strong> – at our office in Hanoi.</li></ul><h2>Deposit and balance</h2><p>The deposit and the due date for the balance are stated on your written confirmation and depend on the services booked (hotels, cruises, flights).</p><h2>Refunds</h2><ul><li>Refunds are made to the original payment method – card refunds via the 9Pay gateway, transfers back to the sending account.</li><li>The refundable amount follows our cancellation & change policy and the conditions on your confirmation.</li><li>Bank and card fees charged by third parties may be deducted.</li></ul><h2>Travel agents (B2B)</h2><p>Partner agencies receive net-rate confirmations and invoice-based payment terms agreed in the partnership contract.</p>`,
      zh: `<p>您提交预订需求后，我们会先确认资源，并以美元发送含最终价格的书面确认。您确认后才需付款。</p><h2>付款方式</h2><ul><li><strong>在线国际银行卡</strong>——通过本网站安全的 9Pay 支付网关使用 Visa、Mastercard、JCB 付款。</li><li><strong>银行转账</strong>——转入确认单所列 Vietlook Travel and Trading Company Limited 公司账户。请仅转账至最新确认单上的账户。</li><li><strong>线下付款</strong>——在河内办公室支付。</li></ul><h2>定金与尾款</h2><p>定金金额及尾款支付期限以书面确认单为准，视所订服务（酒店、游轮、机票）而定。</p><h2>退款</h2><ul><li>退款将原路退回——银行卡经 9Pay 网关退回，转账退回至汇款账户。</li><li>可退金额依据取消与变更政策及确认单条款。</li><li>第三方收取的银行或刷卡手续费可能会被扣除。</li></ul><h2>同业伙伴（B2B）</h2><p>合作旅行社享受净价确认，并按合作协议约定的账期结算。</p>`,
    },
  },
  cancellation: {
    title: { en: "Cancellation & changes", zh: "取消与变更" },
    subtitle: {
      en: "How to cancel or change your booking – and what happens with weather or force majeure.",
      zh: "如何取消或变更预订，以及天气或不可抗力情况下的处理方式。",
    },
    image: "/images/tours/v2/halong-bay-5041966.jpg",
    // Mức hoàn & thời hạn hủy cụ thể: CHỜ nội dung thật của Vietlook – không tự đặt số liệu (yêu cầu 2b)
    body: {
      en: `<p>We understand plans change. Every booking has its own cancellation conditions, written on your confirmation before you pay – cruises, flights and peak-season hotels often have stricter supplier rules.</p><h2>How to cancel or change</h2><ul><li>Send your request in writing by email, WhatsApp, Zalo or WeChat, quoting your booking code.</li><li>We reply with the confirmed cancellation or change and any amount refundable or payable.</li><li>Date or itinerary changes are subject to availability and supplier conditions.</li></ul><h2>Refund levels</h2><p>The refundable amount depends on how many days before departure you cancel and on the conditions stated in your written confirmation. Refunds are paid as described in our payment & refund policy.</p><h2>Airport fast-track</h2><ul><li>Prices do not include the government visa fee.</li><li>If guests do not fly or do not meet our staff at the name sign, a 100% surcharge applies unless the service was cancelled in advance.</li></ul><h2>Force majeure</h2><p>If weather (typhoons, closure of Halong Bay) or the authorities cancel a service, we offer an alternative or refund the unused part.</p>`,
      zh: `<p>我们理解计划会有变化。每笔预订的取消条件均在付款前写明于确认单——游轮、机票与旺季酒店通常适用更严格的供应商规定。</p><h2>如何取消或变更</h2><ul><li>请通过邮件、WhatsApp、Zalo 或微信以书面形式提出，并注明预订编号。</li><li>我们将回复确认取消或变更结果，以及可退或需补的金额。</li><li>变更日期或行程视资源及供应商条件而定。</li></ul><h2>退款标准</h2><p>可退金额取决于您在出发前多少天取消，以及书面确认单中的条件。退款方式详见付款与退款政策。</p><h2>机场快速通关</h2><ul><li>价格不含政府签证费。</li><li>如旅客未搭乘航班或未与举牌人员会合，且未提前取消，将收取 100% 费用。</li></ul><h2>不可抗力</h2><p>如因天气（台风、下龙湾封航）或政府原因取消服务，我们将提供替代方案或退还未使用部分。</p>`,
    },
  },
  terms: {
    title: { en: "Terms of use", zh: "使用条款" },
    subtitle: {
      en: "The conditions for using this website and booking services with Vietlook Travel.",
      zh: "使用本网站及向 Vietlook Travel 预订服务的条件。",
    },
    image: "/images/tours/v2/hoi-an-92090.jpg",
    body: {
      en: `<p>By using vietlooktravel.com or sending us a booking request you agree to the terms below. Please read them together with our payment, cancellation and privacy policies.</p><h2>Our services</h2><ul><li>Vietlook Travel and Trading Company Limited is a licensed Vietnamese tour operator providing tours, car hire with driver, visa support and airport fast-track services.</li><li>All prices are quoted in US dollars per person unless stated otherwise and are confirmed in writing before any payment.</li><li>Itineraries may be adjusted for weather, safety or local conditions; we always offer an equivalent alternative.</li></ul><h2>Bookings and travel documents</h2><ul><li>A booking is confirmed only after you receive our written confirmation and pay the deposit stated in it.</li><li>You are responsible for a valid passport (6 months validity), visas, travel insurance and health requirements.</li><li>Government visa fees are not included in our service fees unless clearly stated.</li></ul><h2>Website content</h2><ul><li>Texts, photos and videos on this website belong to Vietlook Travel or are used under free, royalty-free licences. They may not be reused without permission.</li><li>We do our best to keep information accurate but cannot guarantee that third-party details (flight times, opening hours) are always up to date.</li></ul><h2>Governing law</h2><p>These terms are governed by the laws of Vietnam. Any dispute will first be resolved by friendly negotiation with our customer-care team.</p>`,
      zh: `<p>使用 vietlooktravel.com 或向我们提交预订需求，即表示您同意以下条款。请结合我们的付款、取消与隐私政策一并阅读。</p><h2>我们的服务</h2><ul><li>Vietlook Travel and Trading Company Limited 是持牌越南旅行社，提供旅游线路、含司机包车、签证协助及机场快速通关服务。</li><li>除另有说明外，所有价格均以美元按人报价，并在付款前以书面形式确认。</li><li>行程可能因天气、安全或当地情况调整；我们始终提供同等替代方案。</li></ul><h2>预订与旅行证件</h2><ul><li>仅在您收到我们的书面确认并支付其中注明的定金后，预订方才生效。</li><li>您需自行确保护照有效（6 个月以上）、签证、旅行保险及健康要求。</li><li>除明确说明外，我们的服务费不含政府签证费。</li></ul><h2>网站内容</h2><ul><li>本网站的文字、照片和视频归 Vietlook Travel 所有或依据免版税的免费许可使用。未经许可不得转载。</li><li>我们尽力保证信息准确，但无法保证第三方信息（航班时间、营业时间）始终最新。</li></ul><h2>适用法律</h2><p>本条款受越南法律管辖。任何争议将首先通过与客服团队友好协商解决。</p>`,
    },
  },
  privacy: {
    title: { en: "Privacy policy", zh: "隐私政策" },
    subtitle: {
      en: "What personal data we collect, how we use it to arrange your trip and how we keep it safe.",
      zh: "我们收集哪些个人信息、如何用于安排您的行程，以及如何保障信息安全。",
    },
    image: "/images/tours/v2/hanoi-32123175.jpg",
    body: {
      en: `<p>Vietlook Travel respects your privacy. This policy explains what we collect and how we use it.</p><h2>Information we collect</h2><ul><li>Contact details you send via our forms: name, email, phone/WhatsApp/WeChat, nationality.</li><li>Trip details: dates, number of travellers, children's ages, flight numbers and special requests.</li><li>Passport details only when needed for visas, flights, cruises or hotel registration.</li></ul><h2>How we use it</h2><p>Only to answer your enquiry, arrange and operate your services, and send booking confirmations. We share necessary details with hotels, cruises, airlines and immigration services that deliver your trip – never for marketing by third parties.</p><h2>Security & retention</h2><p>Requests are stored in our protected management system and kept only as long as needed for your booking and legal obligations.</p><h2>Your rights</h2><p>Email us at any time to access, correct or delete your personal data.</p>`,
      zh: `<p>Vietlook Travel 尊重您的隐私。本政策说明我们收集哪些信息以及如何使用。</p><h2>我们收集的信息</h2><ul><li>您通过表单提交的联系方式：姓名、邮箱、电话/WhatsApp/微信、国籍。</li><li>行程信息：日期、人数、儿童年龄、航班号与特殊要求。</li><li>仅在办理签证、机票、游轮或酒店登记时需要护照信息。</li></ul><h2>信息用途</h2><p>仅用于回复您的咨询、安排与执行服务、发送预订确认。我们只向提供服务的酒店、游轮、航空公司与出入境服务方提供必要信息——绝不用于第三方营销。</p><h2>安全与保存</h2><p>需求信息保存在受保护的管理系统中，仅在预订及法律义务所需期间保留。</p><h2>您的权利</h2><p>您可随时发邮件要求查询、更正或删除个人数据。</p>`,
    },
  },
};
