export type CategorySeoKind = "used" | "new" | "electric" | "automatic" | "suv";

export type CategorySeoCopy = Readonly<Record<CategorySeoKind, Readonly<{
  h1: string;
  description: string;
  ctaLabel: string;
  summaryLabel: string;
  summaryValue: string;
  scopeLabel?: string;
  scopeValue?: string;
  seoText: string;
}>>>;

const ru: CategorySeoCopy = {
  used: { h1: "Объявления об автомобилях с пробегом", description: "Изучайте объявления об автомобилях с пробегом в Казахстане по марке, модели, городу, цене и техническим характеристикам.", ctaLabel: "Смотреть объявления", summaryLabel: "Состояние", summaryValue: "С пробегом", scopeLabel: "Рынок", scopeValue: "Казахстан", seoText: "На этой странице собраны активные объявления об автомобилях с пробегом. Используйте поиск, чтобы уточнить марку, модель, город и технические характеристики." },
  new: { h1: "Объявления о новых автомобилях", description: "Сравнивайте объявления о новых автомобилях в Казахстане по марке, модели, городу и цене.", ctaLabel: "Смотреть новые автомобили", summaryLabel: "Состояние", summaryValue: "Новый", scopeLabel: "Рынок", scopeValue: "Казахстан", seoText: "Сравнивайте активные объявления о новых автомобилях по марке, модели, городу и цене. Дополнительные параметры доступны в поиске." },
  electric: { h1: "Объявления об электромобилях", description: "Изучайте объявления об электромобилях в Казахстане по запасу хода, цене, городу и марке.", ctaLabel: "Смотреть электромобили", summaryLabel: "Топливо", summaryValue: "Электричество", scopeLabel: "Рынок", scopeValue: "Казахстан", seoText: "В этой категории собраны активные объявления об электромобилях. Сравнивайте цену, год выпуска, пробег и доступные технические сведения." },
  automatic: { h1: "Объявления об автомобилях с автоматической коробкой", description: "Сравнивайте автомобили с автоматической коробкой в Казахстане по цене, городу, марке и модели.", ctaLabel: "Смотреть автомобили с автоматической коробкой", summaryLabel: "Коробка передач", summaryValue: "Автоматическая", scopeLabel: "Рынок", scopeValue: "Казахстан", seoText: "Эта страница помогает найти активные объявления об автомобилях с автоматической коробкой. Для более точного выбора используйте фильтры поиска." },
  suv: { h1: "Объявления о внедорожниках", description: "Изучайте объявления о внедорожниках в Казахстане по городу, цене, марке, модели и характеристикам.", ctaLabel: "Смотреть внедорожники", summaryLabel: "Тип кузова", summaryValue: "Внедорожник", scopeLabel: "Рынок", scopeValue: "Казахстан", seoText: "На этой странице собраны активные объявления о внедорожниках. Сужайте результаты по марке, модели, городу и цене с помощью поиска." }
};

const kk: CategorySeoCopy = {
  used: { h1: "Жүрілген көлік хабарландырулары", description: "Қазақстандағы жүрілген көлік хабарландыруларын маркасы, моделі, қаласы, бағасы және техникалық сипаттамалары бойынша қараңыз.", ctaLabel: "Хабарландыруларды көру", summaryLabel: "Күйі", summaryValue: "Жүрілген", scopeLabel: "Нарық", scopeValue: "Қазақстан", seoText: "Бұл бетте жүрілген көліктердің белсенді хабарландырулары берілген. Марканы, модельді, қаланы және техникалық сипаттамаларды нақтылау үшін іздеуді пайдаланыңыз." },
  new: { h1: "Жаңа көлік хабарландырулары", description: "Қазақстандағы жаңа көлік хабарландыруларын маркасы, моделі, қаласы және бағасы бойынша салыстырыңыз.", ctaLabel: "Жаңа көліктерді көру", summaryLabel: "Күйі", summaryValue: "Жаңа", seoText: "Жаңа көліктердің белсенді хабарландыруларын маркасы, моделі, қаласы және бағасы бойынша салыстырыңыз. Қосымша параметрлер іздеуде қолжетімді." },
  electric: { h1: "Электр көлігі хабарландырулары", description: "Қазақстандағы электр көлігі хабарландыруларын жүріс қоры, бағасы, қаласы және маркасы бойынша қараңыз.", ctaLabel: "Электр көліктерін көру", summaryLabel: "Отын", summaryValue: "Электр", seoText: "Бұл санатта электр көліктерінің белсенді хабарландырулары жиналған. Бағасын, шығарылған жылын, жүрген жолын және қолжетімді техникалық мәліметтерін салыстырыңыз." },
  automatic: { h1: "Автоматты берілісті көлік хабарландырулары", description: "Қазақстандағы автоматты берілісті көліктерді бағасы, қаласы, маркасы және моделі бойынша салыстырыңыз.", ctaLabel: "Автоматты берілісті көліктерді көру", summaryLabel: "Беріліс қорабы", summaryValue: "Автоматты", seoText: "Бұл бет автоматты берілісті көліктердің белсенді хабарландыруларын табуға көмектеседі. Нақты таңдау үшін іздеу сүзгілерін қолданыңыз." },
  suv: { h1: "Жол талғамайтын көлік хабарландырулары", description: "Қазақстандағы жол талғамайтын көлік хабарландыруларын қаласы, бағасы, маркасы, моделі және сипаттамалары бойынша қараңыз.", ctaLabel: "Жол талғамайтын көліктерді көру", summaryLabel: "Кузов түрі", summaryValue: "Жол талғамайтын көлік", seoText: "Бұл бетте жол талғамайтын көліктердің белсенді хабарландырулары берілген. Іздеу арқылы маркасы, моделі, қаласы және бағасы бойынша нәтижелерді тарылтыңыз." }
};

const en: CategorySeoCopy = {
  used: { h1: "Used car listings", description: "Explore used car listings across Kazakhstan by make, model, city, price, and technical details.", ctaLabel: "Browse listings", summaryLabel: "Condition", summaryValue: "Used", seoText: "This page brings together active used car listings. Use search to refine by make, model, city, and technical details." },
  new: { h1: "New car listings", description: "Compare new car listings across Kazakhstan by make, model, city, and price.", ctaLabel: "Browse new cars", summaryLabel: "Condition", summaryValue: "New", seoText: "Compare active new car listings by make, model, city, and price. Additional criteria are available in search." },
  electric: { h1: "Electric vehicle listings", description: "Explore electric vehicle listings across Kazakhstan by range, price, city, and make.", ctaLabel: "Browse electric vehicles", summaryLabel: "Fuel", summaryValue: "Electric", seoText: "This category brings together active electric vehicle listings. Compare price, year, mileage, and available technical details." },
  automatic: { h1: "Automatic car listings", description: "Compare automatic cars across Kazakhstan by price, city, make, and model.", ctaLabel: "Browse automatic cars", summaryLabel: "Transmission", summaryValue: "Automatic", seoText: "This page helps you find active automatic car listings. Use search filters to narrow the selection." },
  suv: { h1: "SUV listings", description: "Explore SUV listings across Kazakhstan by city, price, make, model, and technical details.", ctaLabel: "Browse SUVs", summaryLabel: "Body type", summaryValue: "SUV", seoText: "This page brings together active SUV listings. Use search to narrow results by make, model, city, and price." }
};

const zhCN: CategorySeoCopy = {
  used: { h1: "二手车信息", description: "按品牌、车型、城市、价格和技术参数浏览哈萨克斯坦的二手车信息。", ctaLabel: "浏览车辆信息", summaryLabel: "车况", summaryValue: "二手", seoText: "此页面汇集在售二手车信息。您可通过搜索按品牌、车型、城市和技术参数进一步筛选。" },
  new: { h1: "新车信息", description: "按品牌、车型、城市和价格比较哈萨克斯坦的新车信息。", ctaLabel: "浏览新车", summaryLabel: "车况", summaryValue: "新车", seoText: "按品牌、车型、城市和价格比较在售新车信息。更多条件可在搜索页面中使用。" },
  electric: { h1: "电动车信息", description: "按续航、价格、城市和品牌浏览哈萨克斯坦的电动车信息。", ctaLabel: "浏览电动车", summaryLabel: "能源", summaryValue: "电力", seoText: "此分类汇集在售电动车信息。可比较价格、年份、里程及可用技术参数。" },
  automatic: { h1: "自动挡车辆信息", description: "按价格、城市、品牌和车型比较哈萨克斯坦的自动挡车辆。", ctaLabel: "浏览自动挡车辆", summaryLabel: "变速箱", summaryValue: "自动", seoText: "此页面帮助您查找在售自动挡车辆信息。请使用搜索筛选缩小选择范围。" },
  suv: { h1: "SUV 信息", description: "按城市、价格、品牌、车型和技术参数浏览哈萨克斯坦的 SUV 信息。", ctaLabel: "浏览 SUV", summaryLabel: "车身类型", summaryValue: "SUV", seoText: "此页面汇集在售 SUV 信息。请使用搜索按品牌、车型、城市和价格缩小结果范围。" }
};

export function getCategorySeoCopy(locale?: string | null): CategorySeoCopy {
  switch (locale?.toLowerCase().replace("_", "-")) {
    case "kk": return kk;
    case "en": case "en-us": return en;
    case "zh": case "zh-cn": return zhCN;
    case "ru": case "ru-ru": default: return ru;
  }
}
