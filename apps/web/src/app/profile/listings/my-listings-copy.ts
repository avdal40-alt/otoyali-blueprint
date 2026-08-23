import { normalizeLocale } from "@/i18n/config";
import type { Locale } from "@/i18n/types";

const tr = {
  loading: "Yükleniyor",
  emptyTitle: "Henüz ilanınız yok",
  emptyBody: "İlk ilanınızı oluşturmak için araç bilgilerinizi ekleyin.",
  publishListing: "İlan yayınla",
  missingSupabaseEnv: "Supabase ortam değişkenleri eksik.",
  vehicleInformation: "Araç bilgileri",
  listingQuality: "İlan kalitesi",
  image: "Görsel",
  imageError: "Hata",
  view: "Görüntüle",
  previewComingSoon: "Önizle · Yakında",
  editRejected: "Tekrar düzenle",
  editComingSoon: "Düzenle · Yakında",
  submitForReview: "İncelemeye gönder",
  resubmitForReview: "Tekrar incelemeye gönder",
  sending: "Gönderiliyor",
  pause: "Duraklat",
  pausing: "Duraklatılıyor",
  archive: "Arşivle",
  archiving: "Arşivleniyor",
  addVideo: "Video ekle",
  videoIntro: "60 saniyeye kadar aracınızı tanıtın.",
  videoPending: "İnceleme bekler",
  videoTitle: "Video başlığı",
  videoDescription: "Açıklama",
  videoDescriptionPlaceholder: "Kısa tanıtım, öne çıkan özellikler veya kullanım notları",
  videoFile: "Video dosyası",
  videoRequirements: "60 saniyeye kadar video yükleyin. Dikey video önerilir. En fazla 100 MB. MP4, WebM veya tarayıcınız destekliyorsa MOV/QuickTime kullanabilirsiniz.",
  videoModerationHelp: "Video içeriği satıcı tarafından sağlanır. Plakanızı gizlemek istiyorsanız videoyu yüklemeden önce düzenleyebilirsiniz. Yayınlanmadan önce manuel inceleme yapılır.",
  videoLoginRequired: "Video yüklemek için giriş yapmanız gerekir.",
  videoFileRequired: "Video dosyası seçin.",
  videoUploadFailure: "Video yüklenemedi. Lütfen tekrar deneyin.",
  videoTooLarge: "Video dosyası çok büyük.",
  videoTooLong: "Video en fazla 60 saniye olabilir.",
  videoSuccess: "Videonuz incelenmek üzere alındı.",
  uploading: "Yükleniyor",
  close: "Kapat",
  statusPendingReview: "Onay bekliyor",
  statusPendingReviewBody: "İlanınız moderasyon kontrolünde. Onaylandıktan sonra yayına alınacaktır.",
  statusRejected: "Reddedildi",
  statusRejectedBody: "İlanınız yayın kurallarına uygun olmadığı için reddedildi.",
  statusArchived: "Arşivlendi",
  statusArchivedBody: "Bu ilan yayından kaldırıldı ve herkese açık sayfalarda görünmez.",
  statusActive: "Yayında",
  statusPaused: "Duraklatıldı",
  statusPausedBody: "İlanınız geçici olarak yayında değil.",
  statusSold: "Satıldı",
  statusSoldBody: "Bu ilan satıldı olarak işaretlenmiş.",
  statusDraft: "Taslak",
  statusDraftBody: "Taslak ilanlar herkese açık sayfalarda görünmez.",
  authenticationRequired: "İlanı yönetmek için giriş yapın.",
  ownershipRequired: "Yalnızca kendi ilanlarınızı yönetebilirsiniz.",
  listingNotFound: "İlan bulunamadı.",
  listingStateChanged: "İlan durumu değişti. Sayfayı yenileyip tekrar deneyin.",
  invalidAction: "Bu ilan işlemi geçerli değil.",
  mutationFailure: "İlan durumu güncellenemedi. Lütfen tekrar deneyin.",
  loadFailure: "İlanlarınız yüklenemedi. Lütfen tekrar deneyin."
};

const en: typeof tr = {
  loading: "Loading",
  emptyTitle: "You have no listings yet",
  emptyBody: "Add your vehicle details to create your first listing.",
  publishListing: "Publish listing",
  missingSupabaseEnv: "Supabase environment variables are missing.",
  vehicleInformation: "Vehicle information",
  listingQuality: "Listing quality",
  image: "Image",
  imageError: "Error",
  view: "View",
  previewComingSoon: "Preview · Coming soon",
  editRejected: "Edit again",
  editComingSoon: "Edit · Coming soon",
  submitForReview: "Submit for review",
  resubmitForReview: "Resubmit for review",
  sending: "Sending",
  pause: "Pause",
  pausing: "Pausing",
  archive: "Archive",
  archiving: "Archiving",
  addVideo: "Add video",
  videoIntro: "Introduce your vehicle in a video up to 60 seconds long.",
  videoPending: "Pending review",
  videoTitle: "Video title",
  videoDescription: "Description",
  videoDescriptionPlaceholder: "A short introduction, highlights, or usage notes",
  videoFile: "Video file",
  videoRequirements: "Upload a video up to 60 seconds long. Vertical video is recommended. Maximum size: 100 MB. Use MP4, WebM, or MOV/QuickTime if supported by your browser.",
  videoModerationHelp: "Video content is provided by the seller. If you want to hide your license plate, edit the video before uploading it. Videos are reviewed manually before publication.",
  videoLoginRequired: "Please sign in to upload a video.",
  videoFileRequired: "Select a video file.",
  videoUploadFailure: "The video could not be uploaded. Please try again.",
  videoTooLarge: "The video file is too large.",
  videoTooLong: "The video can be up to 60 seconds long.",
  videoSuccess: "Your video was submitted for review.",
  uploading: "Uploading",
  close: "Close",
  statusPendingReview: "Pending review",
  statusPendingReviewBody: "Your listing is under moderation review. It will be published after approval.",
  statusRejected: "Rejected",
  statusRejectedBody: "Your listing was rejected because it did not meet the listing rules.",
  statusArchived: "Archived",
  statusArchivedBody: "This listing has been removed from publication and is not visible on public pages.",
  statusActive: "Active",
  statusPaused: "Paused",
  statusPausedBody: "Your listing is temporarily not published.",
  statusSold: "Sold",
  statusSoldBody: "This listing has been marked as sold.",
  statusDraft: "Draft",
  statusDraftBody: "Draft listings are not visible on public pages.",
  authenticationRequired: "Please sign in to manage this listing.",
  ownershipRequired: "You can only manage your own listings.",
  listingNotFound: "Listing could not be found.",
  listingStateChanged: "This listing state changed. Refresh the page and try again.",
  invalidAction: "This listing action is not valid.",
  mutationFailure: "Listing status could not be updated. Please try again.",
  loadFailure: "Your listings could not be loaded. Please try again."
};

export type MyListingsCopy = typeof tr;

const copies: Record<Locale, MyListingsCopy> = { tr, en };

export function getMyListingsCopy(locale?: string | null): MyListingsCopy {
  return copies[normalizeLocale(locale)];
}

export function getMyListingsLifecycleErrorMessage(error: unknown, copy: MyListingsCopy): string {
  const code = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";

  if (code === "OT401") return copy.authenticationRequired;
  if (code === "OT403") return copy.ownershipRequired;
  if (code === "OT404") return copy.listingNotFound;
  if (code === "OT409") return copy.listingStateChanged;
  if (code === "OT422") return copy.invalidAction;
  return copy.mutationFailure;
}
