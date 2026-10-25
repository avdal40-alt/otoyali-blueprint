export type DealerPageCopy = {
  verifiedDealer: string; locationUnavailable: string; about: string; publicProfile: string; stockCount: string; content: string;
  vehicle: string; video: string; noPostsTitle: string; noPostsBody: string; noVehiclesTitle: string; noVehiclesBody: string;
  noVideosTitle: string; noVideosBody: string; liveNow: string; pastLives: string; noLiveTitle: string; noLiveBody: string;
  live: string; ended: string; recordingUnavailable: string; tabs: { posts: string; cars: string; videos: string; live: string };
};

const ru: DealerPageCopy = { verifiedDealer: "Проверенный дилер", locationUnavailable: "Город не указан", about: "О дилере", publicProfile: "Публичный профиль дилера", stockCount: "В наличии: {count}", content: "Материалы дилера", vehicle: "Автомобиль", video: "Видео", noPostsTitle: "Публикаций пока нет", noPostsBody: "Этот дилер ещё не опубликовал публичные записи.", noVehiclesTitle: "Нет доступных автомобилей", noVehiclesBody: "Сейчас у этого дилера нет подходящих публичных объявлений.", noVideosTitle: "Видео нет", noVideosBody: "Сейчас у этого дилера нет подходящих видео объявлений.", liveNow: "Сейчас в эфире", pastLives: "Прошлые эфиры", noLiveTitle: "Сейчас нет эфиров", noLiveBody: "Здесь появятся текущие и прошлые доступные эфиры.", live: "ЭФИР", ended: "ЗАВЕРШЁН", recordingUnavailable: "Запись недоступна.", tabs: { posts: "Публикации", cars: "Автомобили", videos: "Видео", live: "Эфиры" } };
const kk: DealerPageCopy = { verifiedDealer: "Расталған дилер", locationUnavailable: "Қала көрсетілмеген", about: "Дилер туралы", publicProfile: "Дилердің ашық профилі", stockCount: "Қоймада: {count}", content: "Дилер мазмұны", vehicle: "Көлік", video: "Бейне", noPostsTitle: "Әзірге жарияланым жоқ", noPostsBody: "Бұл дилер әлі ашық жазбалар жарияламады.", noVehiclesTitle: "Қолжетімді көлік жоқ", noVehiclesBody: "Бұл дилерде қазір жарамды ашық хабарландырулар жоқ.", noVideosTitle: "Бейне жоқ", noVideosBody: "Бұл дилерде қазір жарамды хабарландыру бейнелері жоқ.", liveNow: "Қазір эфирде", pastLives: "Өткен эфирлер", noLiveTitle: "Қазір эфир жоқ", noLiveBody: "Мұнда қолжетімді ағымдағы және өткен эфирлер көрсетіледі.", live: "ЭФИР", ended: "АЯҚТАЛДЫ", recordingUnavailable: "Жазба қолжетімсіз.", tabs: { posts: "Жазбалар", cars: "Көліктер", videos: "Бейнелер", live: "Эфирлер" } };
const en: DealerPageCopy = { verifiedDealer: "Verified dealer", locationUnavailable: "Location unavailable", about: "About", publicProfile: "Public dealer profile", stockCount: "{count} vehicles in stock", content: "Dealer content", vehicle: "Vehicle", video: "Video", noPostsTitle: "No posts yet", noPostsBody: "This dealer has not published any public posts.", noVehiclesTitle: "No vehicles available", noVehiclesBody: "This dealer has no eligible public listings right now.", noVideosTitle: "No videos available", noVideosBody: "This dealer has no eligible public listing videos right now.", liveNow: "Live now", pastLives: "Past streams", noLiveTitle: "No live streams right now", noLiveBody: "Current and past eligible live streams will appear here.", live: "LIVE", ended: "ENDED", recordingUnavailable: "Recording unavailable.", tabs: { posts: "Posts", cars: "Cars", videos: "Videos", live: "Live" } };
const zhCN: DealerPageCopy = { verifiedDealer: "已认证经销商", locationUnavailable: "未提供城市", about: "关于经销商", publicProfile: "经销商公开资料", stockCount: "库存 {count} 辆", content: "经销商内容", vehicle: "车辆", video: "视频", noPostsTitle: "暂无动态", noPostsBody: "该经销商尚未发布公开动态。", noVehiclesTitle: "暂无可用车辆", noVehiclesBody: "该经销商目前没有符合条件的公开车辆信息。", noVideosTitle: "暂无视频", noVideosBody: "该经销商目前没有符合条件的车辆信息视频。", liveNow: "正在直播", pastLives: "历史直播", noLiveTitle: "当前没有直播", noLiveBody: "符合条件的当前和历史直播将显示在这里。", live: "直播中", ended: "已结束", recordingUnavailable: "没有可用录像。", tabs: { posts: "动态", cars: "车辆", videos: "视频", live: "直播" } };

export function getDealerPageCopy(locale?: string | null): DealerPageCopy {
  const value = locale?.toLowerCase();
  if (value?.startsWith("kk")) return kk;
  if (value?.startsWith("en")) return en;
  if (value === "zh" || value === "zh-cn") return zhCN;
  return ru;
}

export function getDealerPageValue(locale: string | null | undefined, key: string): string | undefined {
  const copy = getDealerPageCopy(locale);
  if (key === "profile.verifiedDealer") return copy.verifiedDealer;
  if (!key.startsWith("profile.dealerPage.")) return undefined;
  return key.slice("profile.dealerPage.".length).split(".").reduce<unknown>((value, part) => (
    value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined
  ), copy) as string | undefined;
}
