import type { LocaleId } from "@/i18n/types";

type LocalProviderLocale = Extract<LocaleId, "tr" | "en" | "ru" | "kk" | "zh-CN">;

type LocalProviderMessages = {
  serviceCategories: readonly string[];
  unavailableServiceFeatures: readonly string[];
  searchFilters: readonly string[];
  publishingChecklist: readonly string[];
  trustChecklist: readonly string[];
};

const messages = {
  tr: {
    serviceCategories: ["Ekspertiz", "Periyodik bakım", "Arıza tespit", "Lastik", "Kaporta/boya", "Elektrikli araç servisi"],
    unavailableServiceFeatures: ["Randevu oluşturma", "Müsaitlik kontrolü", "Fiyat garantisi", "Servis sonucu doğrulaması"],
    searchFilters: ["Marka ve model", "Şehir", "Fiyat aralığı", "Yıl ve kilometre", "Yakıt tipi ve vites"],
    publishingChecklist: ["Net ve güncel fotoğraflar ekleyin", "Araç bilgilerini doğru girin", "Açıklamayı açık ve dürüst yazın", "Hasar/geçmiş bilgilerini saklamayın", "Fiyatı benzer ilanlarla karşılaştırarak belirleyin"],
    trustChecklist: ["Araç ve ruhsat bilgilerini karşılaştırın", "Ekspertiz veya bağımsız kontrol yaptırın", "Satıcı bilgilerini görüşme öncesi doğrulayın", "Bilinmeyen kişilere kapora göndermeyin", "Hasar, sigorta ve borç durumunu bağımsız kaynaklardan kontrol edin"]
  },
  en: {
    serviceCategories: ["Inspection", "Scheduled maintenance", "Diagnostics", "Tires", "Body/paint", "EV service"],
    unavailableServiceFeatures: ["Booking creation", "Availability checks", "Price guarantees", "Service-outcome verification"],
    searchFilters: ["Make and model", "City", "Price range", "Year and mileage", "Fuel type and transmission"],
    publishingChecklist: ["Add clear and recent photos", "Enter vehicle details accurately", "Write a clear and honest description", "Do not hide damage or history details", "Set the price by reviewing comparable listings"],
    trustChecklist: ["Compare the vehicle and registration details", "Use an inspection or independent check", "Verify seller information before meeting", "Do not send deposits to unknown people", "Check damage, insurance and lien status through independent sources"]
  },
  ru: {
    serviceCategories: ["Диагностика перед покупкой", "Плановое ТО", "Диагностика неисправностей", "Шины", "Кузов и покраска", "Сервис электромобилей"],
    unavailableServiceFeatures: ["Создание записи", "Проверка доступности", "Гарантия цены", "Подтверждение результата сервиса"],
    searchFilters: ["Марка и модель", "Город", "Диапазон цены", "Год и пробег", "Тип топлива и коробка передач"],
    publishingChecklist: ["Добавьте чёткие и актуальные фотографии", "Точно укажите сведения об автомобиле", "Напишите понятное и честное описание", "Не скрывайте сведения о повреждениях и истории", "Определите цену, сравнив похожие объявления"],
    trustChecklist: ["Сверьте сведения об автомобиле и документах", "Закажите диагностику или независимую проверку", "Проверьте сведения о продавце до встречи", "Не отправляйте задаток незнакомым людям", "Проверьте историю повреждений, страховку и обременения по независимым источникам"]
  },
  kk: {
    serviceCategories: ["Сатып алу алдындағы тексеріс", "Жоспарлы техникалық қызмет", "Ақауды анықтау", "Шиналар", "Кузов және бояу", "Электромобильдерге қызмет"],
    unavailableServiceFeatures: ["Кездесуді брондау", "Қолжетімділікті тексеру", "Баға кепілдігі", "Қызмет нәтижесін растау"],
    searchFilters: ["Маркасы мен моделі", "Қала", "Баға ауқымы", "Шығарылған жылы мен жүрген жолы", "Жанармай түрі мен беріліс қорабы"],
    publishingChecklist: ["Анық және өзекті фотосуреттерді қосыңыз", "Көлік мәліметтерін дәл енгізіңіз", "Түсінікті әрі адал сипаттама жазыңыз", "Зақымдар мен тарих туралы мәліметті жасырмаңыз", "Ұқсас хабарландыруларды салыстырып, бағаны белгілеңіз"],
    trustChecklist: ["Көлік пен құжаттардағы деректерді салыстырыңыз", "Диагностикадан немесе тәуелсіз тексеруден өткізіңіз", "Кездесуге дейін сатушы туралы мәліметті тексеріңіз", "Бейтаныс адамдарға кепілақы жібермеңіз", "Зақым, сақтандыру және ауыртпалықтар жайын тәуелсіз дереккөздерден тексеріңіз"]
  },
  "zh-CN": {
    serviceCategories: ["购前检测", "定期保养", "故障诊断", "轮胎", "钣金喷漆", "电动车维修"],
    unavailableServiceFeatures: ["创建预约", "查询可用时间", "价格保证", "核实服务结果"],
    searchFilters: ["品牌和车型", "城市", "价格区间", "年份和里程", "燃料类型和变速箱"],
    publishingChecklist: ["添加清晰的近期照片", "准确填写车辆信息", "撰写清楚且诚实的描述", "不要隐瞒损伤或历史信息", "参考相似车源确定价格"],
    trustChecklist: ["核对车辆与证件信息", "进行检测或独立检查", "见面前核实卖家信息", "不要向陌生人支付定金", "通过独立渠道核查损伤、保险和抵押状态"]
  }
} as const satisfies Record<LocalProviderLocale, LocalProviderMessages>;

export function getAiLocalProviderMessages(locale: LocalProviderLocale): LocalProviderMessages {
  return messages[locale];
}
