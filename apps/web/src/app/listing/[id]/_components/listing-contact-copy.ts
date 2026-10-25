
type ListingContactCopy = {
  loading: string;
  contactSeller: string;
  contactUnavailable: string;
  environmentUnavailable: string;
};

const ru: ListingContactCopy = {
  loading: "Загрузка", contactSeller: "Связаться с продавцом", contactUnavailable: "Связь с продавцом недоступна для этого объявления.", environmentUnavailable: "Подключение к сервису сейчас недоступно."
};

const kk: ListingContactCopy = {
  loading: "Жүктелуде", contactSeller: "Сатушымен байланысу", contactUnavailable: "Бұл хабарландыру үшін сатушымен байланыс қолжетімсіз.", environmentUnavailable: "Сервиске қосылу қазір қолжетімсіз."
};

const en: ListingContactCopy = {
  loading: "Loading", contactSeller: "Contact seller", contactUnavailable: "Seller contact is unavailable for this listing.", environmentUnavailable: "The service connection is unavailable right now."
};

const zhCN: ListingContactCopy = {
  loading: "加载中", contactSeller: "联系卖家", contactUnavailable: "此房源暂时无法联系卖家。", environmentUnavailable: "当前无法连接到服务。"
};

const tr: ListingContactCopy = {
  loading: "Yükleniyor", contactSeller: "Satıcı ile iletişime geç", contactUnavailable: "Satıcı iletişimi bu ilan için kullanılamıyor.", environmentUnavailable: "Hizmet bağlantısı şu anda kullanılamıyor."
};

export function getListingContactCopy(locale?: string | null): ListingContactCopy {
  const normalized = locale?.toLowerCase().replace("_", "-");
  if (normalized?.startsWith("ru")) return ru;
  if (normalized?.startsWith("kk")) return kk;
  if (normalized === "zh-cn" || normalized === "zh") return zhCN;
  if (normalized?.startsWith("en")) return en;
  return { ...ru };
}
