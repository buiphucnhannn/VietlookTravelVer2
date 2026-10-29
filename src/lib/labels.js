/** Gom nhãn dịch dùng cho thẻ tour (truyền xuống client component). */
export function cardLabels(dict) {
  const c = dict.common;
  return {
    from: c.from,
    days: c.days,
    nights: c.nights,
    night: c.night,
    day: c.day,
    halfDay: c.halfDay,
    viewTour: c.viewTour,
    priceOnRequest: c.priceOnRequest,
    contactPrice: c.contactPrice,
    bookNow: c.bookNow,
  };
}
