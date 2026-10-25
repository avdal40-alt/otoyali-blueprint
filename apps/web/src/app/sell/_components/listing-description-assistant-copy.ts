export type ListingDescriptionAssistantCopy = { generate: string; generating: string; length: string; concise: string; standard: string; detailed: string; help: string; apply: string; discard: string; error: string; unavailable: string; previewLabel: string };

const ru: ListingDescriptionAssistantCopy = { generate: "Создать описание", generating: "Описание создаётся", length: "Длина описания", concise: "Краткое", standard: "Стандартное", detailed: "Подробное", help: "Отредактируйте черновик и примените его сами, прежде чем он попадёт в объявление.", apply: "Применить к описанию", discard: "Отменить", error: "Не удалось создать описание. Проверьте данные автомобиля и повторите попытку.", unavailable: "Укажите год, пробег, состояние, топливо и коробку передач, чтобы создать описание.", previewLabel: "Черновик созданного описания" };
const kk: ListingDescriptionAssistantCopy = { generate: "Сипаттама жасау", generating: "Сипаттама жасалуда", length: "Сипаттама ұзындығы", concise: "Қысқа", standard: "Стандартты", detailed: "Толық", help: "Черновикті өңдеп, хабарландыруға қоспас бұрын оны өзіңіз қолданыңыз.", apply: "Сипаттамаға қолдану", discard: "Болдырмау", error: "Сипаттама жасалмады. Көлік деректерін тексеріп, қайталап көріңіз.", unavailable: "Сипаттама жасау үшін жылын, жүрісін, күйін, отынын және беріліс қорабын көрсетіңіз.", previewLabel: "Жасалған сипаттама черновигі" };
const en: ListingDescriptionAssistantCopy = { generate: "Generate description", generating: "Generating description", length: "Description length", concise: "Concise", standard: "Standard", detailed: "Detailed", help: "Edit the draft, then apply it yourself before it is added to the listing.", apply: "Apply to description", discard: "Discard", error: "The description could not be generated. Check the vehicle details and try again.", unavailable: "Enter the year, mileage, condition, fuel, and transmission to generate a description.", previewLabel: "Generated description draft" };
const zhCN: ListingDescriptionAssistantCopy = { generate: "生成描述", generating: "正在生成描述", length: "描述长度", concise: "简短", standard: "标准", detailed: "详细", help: "请编辑草稿，并在添加到车辆信息前自行确认应用。", apply: "应用到描述", discard: "放弃", error: "无法生成描述。请检查车辆信息后重试。", unavailable: "请填写年份、里程、车况、燃料和变速箱后再生成描述。", previewLabel: "生成的描述草稿" };

export function getListingDescriptionAssistantCopy(locale?: string | null): ListingDescriptionAssistantCopy {
  const value = locale?.toLowerCase();
  if (value?.startsWith("kk")) return kk;
  if (value?.startsWith("en")) return en;
  if (value === "zh" || value === "zh-cn") return zhCN;
  return ru;
}
