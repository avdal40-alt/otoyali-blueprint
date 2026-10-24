export type SellEntryCopy = {
  eyebrow: string;
  title: string;
  checking: string;
  phoneVerificationTitle: string;
  phoneVerificationBody: string;
  phoneVerificationIndependent: string;
  phoneLabel: string;
  sendCode: string;
  sendingCode: string;
  codeSent: string;
  otpLabel: string;
  verifyAndContinue: string;
  verifyingCode: string;
  changeNumber: string;
  retry: string;
  invalidPhone: string;
  rateLimited: string;
  expiredCode: string;
  invalidCode: string;
  unavailable: string;
  alreadyUsed: string;
  genericError: string;
};

const ru: SellEntryCopy = {
  eyebrow: "Размещение объявления", title: "Продать автомобиль", checking: "Проверяем возможность размещения объявления.",
  phoneVerificationTitle: "Подтвердите номер телефона для публикации", phoneVerificationBody: "Подтверждённый номер Казахстана +7 будет использоваться для связи с вами по объявлению.", phoneVerificationIndependent: "Это не изменит номер вашего аккаунта или входа.", phoneLabel: "Номер телефона Казахстана", sendCode: "Отправить код подтверждения", sendingCode: "Отправляем код.", codeSent: "Мы отправили код подтверждения на номер:", otpLabel: "Код подтверждения", verifyAndContinue: "Подтвердить и продолжить", verifyingCode: "Проверяем код.", changeNumber: "Изменить номер", retry: "Попробовать снова", invalidPhone: "Введите корректный номер телефона Казахстана.", rateLimited: "Слишком много попыток. Попробуйте позже.", expiredCode: "Срок действия кода истёк. Запросите новый код.", invalidCode: "Неверный код подтверждения. Попробуйте ещё раз.", unavailable: "Подтверждение телефона сейчас недоступно. Попробуйте позже.", alreadyUsed: "Этот номер телефона уже подтверждён для другого аккаунта продавца.", genericError: "Не удалось выполнить запрос. Попробуйте ещё раз."
};

const kk: SellEntryCopy = {
  eyebrow: "Хабарландыру жариялау", title: "Көлікті сату", checking: "Хабарландыру жариялау мүмкіндігі тексерілуде.",
  phoneVerificationTitle: "Жариялау үшін телефон нөміріңізді растаңыз", phoneVerificationBody: "Расталған Қазақстанның +7 нөмірі хабарландыру бойынша сізбен байланысу үшін пайдаланылады.", phoneVerificationIndependent: "Бұл аккаунтыңыздың немесе кіру нөміріңіздің нөмірін өзгертпейді.", phoneLabel: "Қазақстан телефон нөмірі", sendCode: "Растау кодын жіберу", sendingCode: "Код жіберілуде.", codeSent: "Растау кодын мына нөмірге жібердік:", otpLabel: "Растау коды", verifyAndContinue: "Растап, жалғастыру", verifyingCode: "Код тексерілуде.", changeNumber: "Нөмірді өзгерту", retry: "Қайталап көру", invalidPhone: "Қазақстанның дұрыс телефон нөмірін енгізіңіз.", rateLimited: "Тым көп әрекет жасалды. Кейінірек қайталап көріңіз.", expiredCode: "Кодтың мерзімі аяқталды. Жаңа код сұраңыз.", invalidCode: "Растау коды қате. Қайталап көріңіз.", unavailable: "Телефонды растау қазір қолжетімсіз. Кейінірек қайталап көріңіз.", alreadyUsed: "Бұл телефон нөмірі басқа сатушы аккаунты үшін расталған.", genericError: "Сұрауды орындау мүмкін болмады. Қайталап көріңіз."
};

const en: SellEntryCopy = {
  eyebrow: "Create a listing", title: "Sell a vehicle", checking: "Checking whether you can publish a listing.",
  phoneVerificationTitle: "Verify your phone to publish", phoneVerificationBody: "Your verified Kazakhstan +7 number will be used as the contact number for this listing.", phoneVerificationIndependent: "This does not change your account or sign-in phone number.", phoneLabel: "Kazakhstan phone number", sendCode: "Send verification code", sendingCode: "Sending code.", codeSent: "We sent a verification code to:", otpLabel: "Verification code", verifyAndContinue: "Verify and continue", verifyingCode: "Verifying code.", changeNumber: "Change number", retry: "Try again", invalidPhone: "Enter a valid Kazakhstan phone number.", rateLimited: "Too many attempts. Please try again later.", expiredCode: "The verification code has expired. Request a new code.", invalidCode: "The verification code is invalid. Try again.", unavailable: "Phone verification is unavailable right now. Please try again later.", alreadyUsed: "This phone number is already verified for another seller account.", genericError: "We could not complete the request. Please try again."
};

const zhCN: SellEntryCopy = {
  eyebrow: "发布房源", title: "出售车辆", checking: "正在检查您是否可以发布房源。",
  phoneVerificationTitle: "发布前请验证您的电话号码", phoneVerificationBody: "已验证的哈萨克斯坦 +7 电话号码将作为此房源的联系号码。", phoneVerificationIndependent: "这不会更改您的账户或登录电话号码。", phoneLabel: "哈萨克斯坦电话号码", sendCode: "发送验证码", sendingCode: "正在发送验证码。", codeSent: "我们已将验证码发送至：", otpLabel: "验证码", verifyAndContinue: "验证并继续", verifyingCode: "正在验证验证码。", changeNumber: "更改号码", retry: "重试", invalidPhone: "请输入有效的哈萨克斯坦电话号码。", rateLimited: "尝试次数过多，请稍后再试。", expiredCode: "验证码已过期，请请求新验证码。", invalidCode: "验证码无效，请重试。", unavailable: "当前无法进行电话验证，请稍后再试。", alreadyUsed: "此电话号码已用于验证另一个卖家账户。", genericError: "无法完成请求，请重试。"
};

export function getSellEntryCopy(locale?: string | null): SellEntryCopy {
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
