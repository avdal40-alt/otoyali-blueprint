import { normalizeLocale } from "@/i18n/config";

export type ListingDetailCopy = {
  noInfo: string;
  reviewOwners: string;
  negotiable: string;
  vehicleSpecs: string;
  make: string;
  model: string;
  year: string;
  mileage: string;
  fuel: string;
  transmission: string;
  bodyType: string;
  driveType: string;
  color: string;
  engineVolume: string;
  damageState: string;
  ownerCount: string;
  city: string;
  publishedAt: string;
  videos: string;
  videoDescription: string;
  watchVideo: string;
  vehicleVideo: string;
  openVideo: string;
  description: string;
  noDescription: string;
  similarListings: string;
  similarEmpty: string;
  seller: string;
  defaultSeller: string;
  sellerLoginCopy: string;
  safetyCopy: string;
  listingRules: string;
  safeShopping: string;
};

const ru: ListingDetailCopy = {
  noInfo: "Нет данных", reviewOwners: "Посмотреть отзывы владельцев об этом автомобиле", negotiable: "Торг уместен", vehicleSpecs: "Характеристики автомобиля", make: "Марка", model: "Модель", year: "Год", mileage: "Пробег", fuel: "Топливо", transmission: "Коробка передач", bodyType: "Тип кузова", driveType: "Привод", color: "Цвет", engineVolume: "Объём двигателя", damageState: "Состояние повреждений", ownerCount: "Количество владельцев", city: "Город", publishedAt: "Дата публикации", videos: "Видео автомобиля", videoDescription: "Смотрите короткие видеообзоры автомобиля от продавца в Jolmod Video.", watchVideo: "Смотреть видео", vehicleVideo: "Видео автомобиля", openVideo: "Открыть видео", description: "Описание", noDescription: "Продавец не добавил описание.", similarListings: "Похожие объявления", similarEmpty: "Похожие объявления появятся здесь по мере роста активных предложений.", seller: "Продавец", defaultSeller: "Продавец Jolmod", sellerLoginCopy: "Войдите, чтобы безопасно связаться с продавцом.", safetyCopy: "Jolmod помогает покупать и продавать автомобили безопаснее и проще.", listingRules: "Правила размещения объявлений", safeShopping: "Советы по безопасной покупке"
};

const kk: ListingDetailCopy = {
  noInfo: "Ақпарат жоқ", reviewOwners: "Осы көлікке қатысты иелер пікірін қарау", negotiable: "Саудаласуға болады", vehicleSpecs: "Көлік сипаттамалары", make: "Марка", model: "Модель", year: "Жыл", mileage: "Жүріс", fuel: "Отын", transmission: "Беріліс қорабы", bodyType: "Кузов түрі", driveType: "Жетек", color: "Түс", engineVolume: "Қозғалтқыш көлемі", damageState: "Зақым күйі", ownerCount: "Иелер саны", city: "Қала", publishedAt: "Жарияланған күні", videos: "Көлік видеолары", videoDescription: "Jolmod Video ішінде сатушының көлік туралы қысқа таныстырылымдарын қараңыз.", watchVideo: "Видеода көру", vehicleVideo: "Көлік видеосы", openVideo: "Видеоны ашу", description: "Сипаттама", noDescription: "Сатушы сипаттама қоспады.", similarListings: "Ұқсас хабарландырулар", similarEmpty: "Белсенді ұсыныстар көбейген сайын ұқсас хабарландырулар осында көрсетіледі.", seller: "Сатушы", defaultSeller: "Jolmod сатушысы", sellerLoginCopy: "Сатушымен қауіпсіз байланысу үшін кіріңіз.", safetyCopy: "Jolmod көлік сатып алу мен сатуды қауіпсіз әрі жеңіл етеді.", listingRules: "Хабарландыру ережелері", safeShopping: "Қауіпсіз сатып алу кеңестері"
};

const en: ListingDetailCopy = {
  noInfo: "No information", reviewOwners: "Read owner reviews for this vehicle", negotiable: "Negotiable", vehicleSpecs: "Vehicle specifications", make: "Make", model: "Model", year: "Year", mileage: "Mileage", fuel: "Fuel", transmission: "Transmission", bodyType: "Body type", driveType: "Drivetrain", color: "Colour", engineVolume: "Engine displacement", damageState: "Damage condition", ownerCount: "Number of owners", city: "City", publishedAt: "Published", videos: "Vehicle videos", videoDescription: "Watch short vehicle introductions from the seller in Jolmod Video.", watchVideo: "Watch video", vehicleVideo: "Vehicle video", openVideo: "Open video", description: "Description", noDescription: "The seller has not added a description.", similarListings: "Similar listings", similarEmpty: "Similar listings will appear here as active inventory grows.", seller: "Seller", defaultSeller: "Jolmod seller", sellerLoginCopy: "Sign in to contact the seller securely.", safetyCopy: "Jolmod helps make buying and selling vehicles safer and simpler.", listingRules: "Listing rules", safeShopping: "Safe buying advice"
};

const zhCN: ListingDetailCopy = {
  noInfo: "暂无信息", reviewOwners: "查看这辆车的车主评价", negotiable: "可议价", vehicleSpecs: "车辆参数", make: "品牌", model: "车型", year: "年份", mileage: "里程", fuel: "燃料", transmission: "变速箱", bodyType: "车身类型", driveType: "驱动方式", color: "颜色", engineVolume: "发动机排量", damageState: "损伤状况", ownerCount: "车主数量", city: "城市", publishedAt: "发布时间", videos: "车辆视频", videoDescription: "在 Jolmod Video 中观看卖家发布的简短车辆介绍。", watchVideo: "观看视频", vehicleVideo: "车辆视频", openVideo: "打开视频", description: "描述", noDescription: "卖家尚未添加描述。", similarListings: "相似房源", similarEmpty: "随着在售房源增加，类似房源会显示在这里。", seller: "卖家", defaultSeller: "Jolmod 卖家", sellerLoginCopy: "登录后可安全联系卖家。", safetyCopy: "Jolmod 让买卖车辆更安全、更简单。", listingRules: "房源发布规则", safeShopping: "安全购车建议"
};

const tr: ListingDetailCopy = {
  noInfo: "Bilgi yok", reviewOwners: "Bu araçla ilgili sahip yorumlarını görüntüle", negotiable: "Pazarlık var", vehicleSpecs: "Araç özellikleri", make: "Marka", model: "Model", year: "Yıl", mileage: "Kilometre", fuel: "Yakıt", transmission: "Vites", bodyType: "Kasa tipi", driveType: "Çekiş", color: "Renk", engineVolume: "Motor hacmi", damageState: "Hasar durumu", ownerCount: "Sahip sayısı", city: "Şehir", publishedAt: "Yayın tarihi", videos: "Araç videoları", videoDescription: "Satıcının kısa araç tanıtımlarını Jolmod Video içinde izleyin.", watchVideo: "Videoda izle", vehicleVideo: "Araç videosu", openVideo: "Videoyu aç", description: "Açıklama", noDescription: "Satıcı açıklama eklememiş.", similarListings: "Benzer ilanlar", similarEmpty: "Benzer ilanlar aktif veri arttıkça burada görünecek.", seller: "Satıcı", defaultSeller: "Jolmod satıcısı", sellerLoginCopy: "Satıcıyla güvenli şekilde iletişime geçmek için giriş yapın.", safetyCopy: "Jolmod, araç alım satımını daha güvenli ve kolay hale getirir.", listingRules: "İlan kurallarını incele", safeShopping: "Güvenli alışveriş önerileri"
};

export function getListingDetailCopy(locale?: string | null): ListingDetailCopy {
  const normalized = locale?.toLowerCase().replace("_", "-");
  if (normalized?.startsWith("ru")) return ru;
  if (normalized?.startsWith("kk")) return kk;
  if (normalized === "zh-cn" || normalized === "zh") return zhCN;
  if (normalized?.startsWith("en")) return en;
  return normalizeLocale(locale) === "en" ? en : tr;
}
