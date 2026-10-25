import type { Locale } from "@/i18n/types";

export type VideoCopy = {
  label: string;
  title: string;
  subtitle: string;
  body: string;
  approvedVideos: string;
  moderationCopy: string;
  performanceCopy: string;
  emptyTitle: string;
  emptyBody: string;
  vehicleVideo: string;
  playbackError: string;
  retryPlayback: string;
  detailsComingSoon: string;
  seeListing: string;
  contactSeller: string;
  browseListings: string;
  publishListing: string;
  login: string;
  contentProvided: string;
  vehicleVideoBody: string;
  dealerDeals: string;
  dealerDealsBody: string;
  shortPromos: string;
  shortPromosBody: string;
  discover: string;
};

const ru: VideoCopy = {
  label: "Видео",
  title: "Видео автомобилей Jolmod",
  subtitle: "Смотрите автомобили и предложения продавцов из Казахстана.",
  body: "Короткие видео помогают оценить автомобиль до связи с продавцом.",
  approvedVideos: "В публикации только одобренные видео объявлений.",
  moderationCopy: "Видео проходят проверку перед публикацией.",
  performanceCopy: "Загружайте короткие понятные ролики о вашем автомобиле.",
  emptyTitle: "Видео пока нет",
  emptyBody: "Одобренные видео объявлений появятся здесь.",
  vehicleVideo: "Видео автомобиля",
  playbackError: "Не удалось воспроизвести видео.",
  retryPlayback: "Повторить",
  detailsComingSoon: "Характеристики появятся позже",
  seeListing: "Открыть объявление",
  contactSeller: "Связаться с продавцом",
  browseListings: "Смотреть объявления",
  publishListing: "Разместить объявление",
  login: "Войти",
  contentProvided: "Содержание предоставлено продавцом.",
  vehicleVideoBody: "Смотрите короткие видео автомобилей от продавцов.",
  dealerDeals: "Предложения дилеров",
  dealerDealsBody: "Изучайте видео от проверенных дилеров.",
  shortPromos: "Короткие обзоры",
  shortPromosBody: "Быстро оценивайте ключевые детали автомобиля.",
  discover: "Смотреть видео"
};

const kk: VideoCopy = {
  label: "Бейне",
  title: "Jolmod көлік бейнелері",
  subtitle: "Қазақстандағы көліктер мен сатушылардың ұсыныстарын қараңыз.",
  body: "Қысқа бейнелер сатушымен хабарласпай тұрып көлікті бағалауға көмектеседі.",
  approvedVideos: "Тек мақұлданған хабарландыру бейнелері жарияланады.",
  moderationCopy: "Бейнелер жарияланар алдында тексеріледі.",
  performanceCopy: "Көлігіңіз туралы қысқа әрі түсінікті бейнероликтер жүктеңіз.",
  emptyTitle: "Әзірге бейне жоқ",
  emptyBody: "Мақұлданған хабарландыру бейнелері осында пайда болады.",
  vehicleVideo: "Көлік бейнесі",
  playbackError: "Бейнені ойнату мүмкін болмады.",
  retryPlayback: "Қайталау",
  detailsComingSoon: "Сипаттамалары кейінірек қосылады",
  seeListing: "Хабарландыруды ашу",
  contactSeller: "Сатушымен байланысу",
  browseListings: "Хабарландыруларды көру",
  publishListing: "Хабарландыру жариялау",
  login: "Кіру",
  contentProvided: "Мазмұнды сатушы ұсынған.",
  vehicleVideoBody: "Сатушылар ұсынған көліктердің қысқа бейнелерін көріңіз.",
  dealerDeals: "Дилер ұсыныстары",
  dealerDealsBody: "Тексерілген дилерлердің бейнелерін қарап шығыңыз.",
  shortPromos: "Қысқа шолулар",
  shortPromosBody: "Көліктің негізгі сипаттарын жылдам бағалаңыз.",
  discover: "Бейнелерді көру"
};

const en: VideoCopy = {
  label: "Video",
  title: "Jolmod vehicle videos",
  subtitle: "Explore vehicles and seller offers from Kazakhstan.",
  body: "Short videos help you assess a vehicle before contacting the seller.",
  approvedVideos: "Only approved listing videos are published.",
  moderationCopy: "Videos are reviewed before publication.",
  performanceCopy: "Upload short, clear videos about your vehicle.",
  emptyTitle: "No videos yet",
  emptyBody: "Approved listing videos will appear here.",
  vehicleVideo: "Vehicle video",
  playbackError: "The video could not be played.",
  retryPlayback: "Try again",
  detailsComingSoon: "Details will be available soon",
  seeListing: "View listing",
  contactSeller: "Contact seller",
  browseListings: "Browse listings",
  publishListing: "Publish listing",
  login: "Sign in",
  contentProvided: "Content provided by the seller.",
  vehicleVideoBody: "Watch short vehicle videos from sellers.",
  dealerDeals: "Dealer offers",
  dealerDealsBody: "Explore videos from verified dealers.",
  shortPromos: "Short highlights",
  shortPromosBody: "Quickly review the vehicle's key details.",
  discover: "Watch videos"
};

const zhCN: VideoCopy = {
  label: "视频",
  title: "Jolmod 车辆视频",
  subtitle: "查看来自哈萨克斯坦的车辆和卖家发布内容。",
  body: "短视频可帮助您在联系卖家前了解车辆状况。",
  approvedVideos: "仅发布已审核通过的车辆信息视频。",
  moderationCopy: "视频会在发布前接受审核。",
  performanceCopy: "请上传简短、清晰的车辆视频。",
  emptyTitle: "暂无视频",
  emptyBody: "已审核通过的车辆视频将显示在这里。",
  vehicleVideo: "车辆视频",
  playbackError: "无法播放该视频。",
  retryPlayback: "重试",
  detailsComingSoon: "详细信息即将提供",
  seeListing: "查看车辆信息",
  contactSeller: "联系卖家",
  browseListings: "浏览车辆信息",
  publishListing: "发布车辆",
  login: "登录",
  contentProvided: "内容由卖家提供。",
  vehicleVideoBody: "观看卖家发布的车辆短视频。",
  dealerDeals: "经销商优惠",
  dealerDealsBody: "查看认证经销商发布的视频。",
  shortPromos: "短视频精选",
  shortPromosBody: "快速了解车辆的主要信息。",
  discover: "观看视频"
};

const tr: VideoCopy = {
  label: "Video",
  title: "Yolmod araç videoları",
  subtitle: "Türkiye'deki araçları ve satıcı tekliflerini inceleyin.",
  body: "Kısa videolar, satıcıyla iletişime geçmeden önce aracı değerlendirmenize yardımcı olur.",
  approvedVideos: "Yalnızca onaylanan ilan videoları yayınlanır.",
  moderationCopy: "Videolar yayınlanmadan önce incelenir.",
  performanceCopy: "Aracınız hakkında kısa ve net videolar yükleyin.",
  emptyTitle: "Henüz video yok",
  emptyBody: "Onaylanan ilan videoları burada görünecek.",
  vehicleVideo: "Araç videosu",
  playbackError: "Video oynatılamadı.",
  retryPlayback: "Tekrar dene",
  detailsComingSoon: "Ayrıntılar yakında eklenecek",
  seeListing: "İlanı görüntüle",
  contactSeller: "Satıcı ile iletişime geç",
  browseListings: "İlanlara göz at",
  publishListing: "İlan yayınla",
  login: "Giriş yap",
  contentProvided: "İçerik satıcı tarafından sağlanmıştır.",
  vehicleVideoBody: "Satıcılardan kısa araç videolarını izleyin.",
  dealerDeals: "Galeri fırsatları",
  dealerDealsBody: "Doğrulanmış galerilerin videolarını inceleyin.",
  shortPromos: "Kısa tanıtımlar",
  shortPromosBody: "Aracın önemli ayrıntılarını hızla inceleyin.",
  discover: "Videoları izle"
};

export function getVideoCopy(locale: Locale | string): VideoCopy {
  switch (locale.toLowerCase()) {
    case "kk":
      return kk;
    case "en":
    case "en-us":
      return en;
    case "zh":
    case "zh-cn":
      return zhCN;
    case "tr":
    case "tr-tr":
      return tr;
    case "ru":
    case "ru-ru":
    default:
      return ru;
  }
}
