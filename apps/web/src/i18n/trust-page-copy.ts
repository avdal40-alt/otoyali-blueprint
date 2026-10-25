import type { LegalSection } from "@/components/legal/LegalPage";

export type TrustPageCopy = Readonly<{
  title: string;
  description: string;
  sections: LegalSection[];
  listingRules: string;
  moderationPolicy: string;
  disclaimer: string;
}>;

const ru: TrustPageCopy = {
  title: "Центр доверия Jolmod",
  description: "Прозрачное описание подхода Jolmod к безопасности, текущих ограничений и будущих направлений проверки.",
  sections: [
    { title: "Безопасный выбор автомобиля", body: "Jolmod помогает принимать более взвешенные решения. Перед сделкой самостоятельно проверьте документы, автомобиль, оплату и сведения о продавце." },
    { title: "Качество объявлений", body: "Поля объявления, медиа, анализ цены и модерация помогают сделать объявления понятнее и сопоставимее." },
    { title: "Профили продавцов", body: "Профили дают контекст, но Jolmod не гарантирует историю или официальный статус каждого продавца." },
    { title: "Жалобы и сообщения", body: "Подозрительные объявления можно сообщать команде. Проверка не означает, что каждый риск будет выявлен заранее." },
    { title: "История автомобиля", body: "Интеграции с государственными, страховыми или инспекционными данными пока не заявлены как активные проверки." },
    { title: "Анализ цены", body: "Анализ основан на доступных объявлениях и не является гарантированной оценкой. При недостатке сравнимых данных показывается безопасное пустое состояние." },
    { title: "Безопасность медиа", body: "Фото и видео предоставляются продавцами. Перед загрузкой рекомендуется скрыть номера и личные данные, если это необходимо." }
  ],
  listingRules: "Правила объявлений",
  moderationPolicy: "Политика модерации",
  disclaimer: "Jolmod может добавлять проверки и интеграции позже. Перед покупкой самостоятельно проверьте документы, состояние автомобиля и сведения о продавце."
};

const kk: TrustPageCopy = {
  title: "Jolmod сенім орталығы",
  description: "Jolmod қауіпсіздік тәсілі, қазіргі шектеулері және болашақ тексеру бағыттары туралы ашық ақпарат.",
  sections: [
    { title: "Көлікті қауіпсіз таңдау", body: "Jolmod саналы шешім қабылдауға көмектеседі. Мәміле алдында құжаттарды, көлікті, төлемді және сатушы мәліметтерін өзіңіз тексеріңіз." },
    { title: "Хабарландыру сапасы", body: "Хабарландыру өрістері, медиа, баға талдауы және модерация хабарландыруларды түсініктірек әрі салыстыруға ыңғайлы етеді." },
    { title: "Сатушы профильдері", body: "Профильдер қосымша мәлімет береді, бірақ Jolmod әр сатушының тарихына немесе ресми мәртебесіне кепілдік бермейді." },
    { title: "Шағымдар мен хабарламалар", body: "Күдікті хабарландырулар туралы командаға хабарлауға болады. Тексеру барлық тәуекел алдын ала анықталады дегенді білдірмейді." },
    { title: "Көлік тарихы", body: "Мемлекеттік, сақтандыру немесе тексеру деректерімен интеграциялар әзірге белсенді тексеру ретінде ұсынылмайды." },
    { title: "Бағаны талдау", body: "Талдау қолжетімді хабарландыруларға негізделеді және кепілденген бағалау емес. Ұқсас дерек жеткіліксіз болса, қауіпсіз бос күй көрсетіледі." },
    { title: "Медиа қауіпсіздігі", body: "Фото мен бейнені сатушылар ұсынады. Қажет болса, жүктемес бұрын нөмірлер мен жеке деректерді жасырыңыз." }
  ],
  listingRules: "Хабарландыру ережелері",
  moderationPolicy: "Модерация саясаты",
  disclaimer: "Jolmod кейінірек тексерулер мен интеграцияларды қоса алады. Сатып алмас бұрын құжаттарды, көлік жағдайын және сатушы мәліметтерін өзіңіз тексеріңіз."
};

const en: TrustPageCopy = {
  title: "Jolmod Trust Center",
  description: "A transparent overview of Jolmod's safety approach, current limits, and future verification areas.",
  sections: [
    { title: "Safer vehicle decisions", body: "Jolmod helps users make more informed decisions. Before a transaction, independently check documents, the vehicle, payment steps, and seller information." },
    { title: "Listing quality", body: "Listing fields, media, price analysis, and moderation help make listings easier to understand and compare." },
    { title: "Seller profiles", body: "Profiles provide context, but Jolmod does not guarantee each seller's history or official status." },
    { title: "Reports and complaints", body: "Suspicious listings can be reported to the team. Review does not mean that every risk can be detected in advance." },
    { title: "Vehicle history", body: "Integrations with government, insurance, or inspection data are not currently presented as active checks." },
    { title: "Price analysis", body: "Analysis uses available listings and is not a guaranteed valuation. A safe empty state is shown when comparable data is insufficient." },
    { title: "Media safety", body: "Photos and videos are provided by sellers. Hide plates or personal information before uploading when needed." }
  ],
  listingRules: "Listing rules",
  moderationPolicy: "Moderation policy",
  disclaimer: "Jolmod may add verification and data integrations later. Before buying, independently check documents, the vehicle's condition, and seller information."
};

const zhCN: TrustPageCopy = {
  title: "Jolmod 信任中心",
  description: "透明说明 Jolmod 的安全方法、当前限制和未来验证方向。",
  sections: [
    { title: "更安全地选择车辆", body: "Jolmod 帮助用户作出更明智的决定。交易前请自行核实文件、车辆、付款流程和卖家信息。" },
    { title: "车辆信息质量", body: "车辆信息字段、媒体、价格分析和审核有助于使信息更清晰、更便于比较。" },
    { title: "卖家资料", body: "资料可提供背景信息，但 Jolmod 不保证每位卖家的历史或官方身份。" },
    { title: "举报和投诉", body: "可向团队举报可疑车辆信息。审核并不意味着所有风险都会被提前发现。" },
    { title: "车辆历史", body: "目前未将政府、保险或检测数据集成作为有效核验展示。" },
    { title: "价格分析", body: "分析基于可用车辆信息，并非保证估值。可比数据不足时会显示安全的空状态。" },
    { title: "媒体安全", body: "照片和视频由卖家提供。如有需要，请在上传前遮挡车牌或个人信息。" }
  ],
  listingRules: "发布规则",
  moderationPolicy: "审核政策",
  disclaimer: "Jolmod 未来可能增加验证和数据集成。购买前请自行核实文件、车辆状况和卖家信息。"
};

export function getTrustPageCopy(locale?: string | null): TrustPageCopy {
  switch (locale?.toLowerCase().replace("_", "-")) {
    case "kk": return kk;
    case "en": case "en-us": return en;
    case "zh": case "zh-cn": return zhCN;
    case "ru": case "ru-ru": default: return ru;
  }
}
