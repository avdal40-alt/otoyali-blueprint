export type SellerContactsCopy = { title: string; slots: string; account: string; error: string; retry: string; cancel: string; add: string; max: string; };

const ru: SellerContactsCopy = { title: "Контакты продавца", slots: "Подтверждённые номера: {count} из 3", account: "Номер аккаунта", error: "Не удалось загрузить контакты продавца.", retry: "Попробовать снова", cancel: "Отмена", add: "Добавить номер", max: "Достигнуто максимальное число подтверждённых контактов." };
const kk: SellerContactsCopy = { title: "Сатушы контактілері", slots: "Расталған нөмірлер: {count}/3", account: "Тіркелгі нөмірі", error: "Сатушы контактілерін жүктеу мүмкін болмады.", retry: "Қайталап көру", cancel: "Бас тарту", add: "Нөмір қосу", max: "Расталған контактілердің ең көп санына жеттіңіз." };
const en: SellerContactsCopy = { title: "Seller contacts", slots: "Verified numbers: {count} of 3", account: "Account number", error: "Seller contacts could not be loaded.", retry: "Try again", cancel: "Cancel", add: "Add a number", max: "You have reached the maximum number of verified contacts." };
const zhCN: SellerContactsCopy = { title: "卖家联系方式", slots: "已验证号码：{count}/3", account: "账户号码", error: "无法加载卖家联系方式。", retry: "重试", cancel: "取消", add: "添加号码", max: "您已达到已验证联系方式的最大数量。" };

export function getSellerContactsCopy(locale?: string | null): SellerContactsCopy {
  switch (locale?.toLowerCase().replace("_", "-")) {
    case "kk": return kk;
    case "en":
    case "en-us": return en;
    case "zh":
    case "zh-cn": return zhCN;
    case "ru":
    case "ru-ru":
    default: return ru;
  }
}
