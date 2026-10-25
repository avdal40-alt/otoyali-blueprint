export type SellAssistantCopy = {
  title: string; help: string; open: string; close: string; label: string; placeholder: string;
  send: string; sending: string; reset: string; summary: string; missing: string; apply: string; error: string;
  fields: { year: string; mileageKm: string; condition: string; fuelType: string; transmission: string; engineVolumeL: string; priceAmount: string; city: string };
};

const ru: SellAssistantCopy = { title: "Заполните объявление с помощником", help: "Опишите автомобиль обычными словами. Проверьте предложения и сами решите, применять ли их к форме.", open: "Открыть помощника", close: "Закрыть помощника", label: "Опишите автомобиль", placeholder: "Например: BMW 520i 2021 года, 75 тыс. км, автомат", send: "Отправить", sending: "Обработка", reset: "Сбросить сеанс", summary: "Предложенные значения", missing: "Не указано", apply: "Применить к форме", error: "Помощник сейчас не может обработать запрос. Повторите попытку.", fields: { year: "Год", mileageKm: "Пробег", condition: "Состояние", fuelType: "Топливо", transmission: "Коробка передач", engineVolumeL: "Двигатель", priceAmount: "Цена", city: "Город" } };
const kk: SellAssistantCopy = { title: "Хабарландыруды көмекшімен толтыру", help: "Көлікті еркін тілмен сипаттаңыз. Ұсыныстарды қарап, оларды пішінге қолдану-қолданбауды өзіңіз шешіңіз.", open: "Көмекшіні ашу", close: "Көмекшіні жабу", label: "Көлікті сипаттаңыз", placeholder: "Мысалы: 2021 жылғы BMW 520i, 75 мың км, автомат", send: "Жіберу", sending: "Өңделуде", reset: "Сеансты тазалау", summary: "Ұсынылған мәндер", missing: "Көрсетілмеген", apply: "Пішінге қолдану", error: "Көмекші қазір сұрауды өңдей алмайды. Қайталап көріңіз.", fields: { year: "Жыл", mileageKm: "Жүріс", condition: "Күйі", fuelType: "Отын", transmission: "Беріліс қорабы", engineVolumeL: "Қозғалтқыш", priceAmount: "Баға", city: "Қала" } };
const en: SellAssistantCopy = { title: "Fill the listing with an assistant", help: "Describe the vehicle naturally. Review the suggestions and decide whether to apply them to the form.", open: "Open assistant", close: "Close assistant", label: "Describe the vehicle", placeholder: "For example: 2021 BMW 520i, 75,000 km, automatic", send: "Send", sending: "Working", reset: "Reset session", summary: "Suggested values", missing: "Not specified", apply: "Apply to form", error: "The assistant cannot process this request right now. Please try again.", fields: { year: "Year", mileageKm: "Mileage", condition: "Condition", fuelType: "Fuel", transmission: "Transmission", engineVolumeL: "Engine", priceAmount: "Price", city: "City" } };
const zhCN: SellAssistantCopy = { title: "使用助手填写车辆信息", help: "用自然语言描述车辆。请查看建议后自行决定是否应用到表单。", open: "打开助手", close: "关闭助手", label: "描述车辆", placeholder: "例如：2021 年 BMW 520i，7.5 万公里，自动挡", send: "发送", sending: "正在处理", reset: "重置会话", summary: "建议的值", missing: "未填写", apply: "应用到表单", error: "助手暂时无法处理此请求，请重试。", fields: { year: "年份", mileageKm: "里程", condition: "车况", fuelType: "燃料", transmission: "变速箱", engineVolumeL: "发动机", priceAmount: "价格", city: "城市" } };

export function getSellAssistantCopy(locale?: string | null): SellAssistantCopy {
  const value = locale?.toLowerCase();
  if (value?.startsWith("kk")) return kk;
  if (value?.startsWith("en")) return en;
  if (value === "zh" || value === "zh-cn") return zhCN;
  return ru;
}
