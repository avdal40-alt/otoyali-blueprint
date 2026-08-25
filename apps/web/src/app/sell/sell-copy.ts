import { normalizeLocale } from "@/i18n/config";
import type { Locale } from "@/i18n/types";
import type { PreparedImageVariantName } from "@/lib/media/client-image-processing";

type SellMakeCatalogItem = {
  make_name?: string | null;
  make_slug?: string | null;
};

type SellModelCatalogItem = {
  model_name?: string | null;
  model_slug?: string | null;
};

type SellCatalogDisplayInput =
  | { kind: "make"; item: SellMakeCatalogItem; locale: Locale }
  | { kind: "model"; item: SellModelCatalogItem; locale: Locale };

const tr = {
  steps: ["Satıcı bilgileri", "Araç bilgileri", "Donanım ve açıklama", "Fotoğraflar", "Fiyat ve konum", "Önizleme"],
  colors: { empty: "Renk", white: "Beyaz", black: "Siyah", gray: "Gri", blue: "Mavi", red: "Kırmızı", silver: "Gümüş" },
  photoChecklist: ["Ön 3/4 görünüm", "Arka 3/4 görünüm", "İç mekan", "Gösterge paneli", "Kilometre ekranı", "Motor bölümü", "Lastikler", "Hasar / çizik varsa yakın çekim"],
  listingUnavailable: "Düzenlenebilir ilan bulunamadı veya ilan artık düzenlemeye uygun değil.",
  missingSupabaseEnv: "Supabase ortam değişkenleri eksik.",
  authenticationRequired: "İlanı düzenlemek için giriş yapın.",
  staleConflict: "İlan siz düzenlerken değişti. Sayfayı yenileyip tekrar deneyin.",
  invalidVehicleFields: "Araç alanlarını kontrol edin; motor hacmi yalnızca tam elektrikli araçlarda boş olabilir.",
  saveProgress: "Değişiklikler kaydediliyor.",
  saveSuccess: "Değişiklikler kaydedildi. İlan reddedilmiş ve gizli durumda kaldı.",
  resubmitProgress: "İlanınız tekrar incelemeye gönderiliyor.",
  resubmitSuccess: "Değişiklikler kaydedildi. İlan onay bekliyor ve yönetici onayına kadar gizli kalacak.",
  resubmitFailure: "İlan incelemeye gönderilemedi. Lütfen tekrar deneyin.",
  saveButton: "Değişiklikleri kaydet",
  savingButton: "Kaydediliyor",
  resubmitButton: "Kaydet ve incelemeye gönder",
  resubmittingButton: "Gönderiliyor",
  rejectionReasonHeading: "Reddedilme nedeni",
  mediaPreserved: "Mevcut fotoğraflar, sıraları ve kapak fotoğrafı değişmeden korunur. Bu düzenleme akışında fotoğraf düzenleme şu anda kullanılamıyor.",
  existingPhotoAlt: "Mevcut ilan fotoğrafı",
  existingCoverPhoto: "Mevcut kapak fotoğrafı",
  existingPhoto: "Mevcut fotoğraf",
  electricDisplacement: "Tam elektrikli araçlarda motor hacmi boş bırakılmalıdır.",
  combustionDisplacement: "Motor hacmi benzinli, dizel, LPG ve hibrit araçlar için zorunludur.",
  profileIncomplete: "Satıcı bilgilerinizi tamamlayın.",
  modelsLoadFailure: "Modeller yüklenemedi. Lütfen tekrar deneyin.",
  profileSaveFailure: "Satıcı bilgileriniz kaydedilemedi. Lütfen tekrar deneyin.",
  tooManyPhotos: "En fazla 20 fotoğraf yükleyebilirsiniz.",
  invalidPhoto: "Fotoğraf yüklenemedi. Lütfen JPEG, PNG veya WebP formatında ve 10 MB altında dosya seçin.",
  optimizingImages: "Görseller optimize ediliyor",
  photoReady: "Fotoğraf hazır",
  photoProcessingFailed: "Fotoğraf işlenemedi",
  photoProcessingFallback: "Görsel işlenemedi. Orijinal dosya güvenli yedek olarak kullanılacak.",
  completeProfileBeforePublish: "İlan yayınlamadan önce satıcı profilinizi tamamlayın.",
  acceptRules: "Devam etmek için ilan yayınlama kurallarını kabul edin.",
  checkingSeller: "Satıcı bilgileriniz kontrol ediliyor.",
  creatingVehicleProfile: "Araç profili oluşturuluyor.",
  vehicleSaveFailure: "Araç bilgileri kaydedilemedi. Lütfen tekrar deneyin.",
  verifyingOwnership: "Araç sahipliği doğrulanıyor.",
  ownershipSaveFailure: "Araç sahipliği kaydedilemedi. Lütfen tekrar deneyin.",
  creatingDraft: "İlan taslağı oluşturuluyor.",
  draftCreateFailure: "İlan taslağı oluşturulamadı. Lütfen tekrar deneyin.",
  photosUploading: (current: number, total: number) => `Fotoğraflar yükleniyor (${current}/${total}).`,
  photosUploadingShort: "Fotoğraflar yükleniyor",
  uploading: "yükleniyor",
  photoUploadFailure: "Fotoğraf yüklenemedi. Lütfen tekrar deneyin.",
  photoSaveFailure: "Fotoğraflar kaydedilemedi. Lütfen tekrar deneyin.",
  submittingForModeration: "İlanınız moderasyon kontrolüne gönderiliyor.",
  submitFailure: "İlanınız incelemeye gönderilemedi. Lütfen tekrar deneyin.",
  checkingSession: "Oturum kontrol ediliyor",
  completeProfileTitle: "Satıcı profilinizi tamamlayın",
  completeProfileBody: "İlan yayınlamak için yalnızca gerekli satıcı bilgilerini tamamlayın. Telefonunuz misafir kullanıcılara açık gösterilmez.",
  continue: "Devam et",
  back: "Geri",
  next: "Devam",
  sellerInformation: "Satıcı bilgileri",
  sellerInformationHelp: "Bu bilgiler ilan yönetimi ve güvenli iletişim için kullanılır. Telefon numaranız ilan kartlarında açık gösterilmez.",
  dealerVerificationHelp: "Galeri doğrulaması ileride eklenecek. MVP kapsamında yalnızca galeri adı ve yetkili kişi bilgisi alınır.",
  saveInformation: "Bilgileri kaydet",
  finalReviewHelp: "Son adımda bilgiler yeniden kontrol edilir.",
  vehicleInformation: "Araç bilgileri",
  make: "Marka",
  selectMake: "Marka seçin",
  model: "Model",
  catalogOther: "Diğer",
  selectModel: "Model seçin",
  modelsLoading: "Modeller yükleniyor",
  year: "Yıl",
  condition: "Durum",
  missingCatalogHelp: "Eksik marka veya modeli destek ekibine bildirebilirsiniz.",
  equipmentAndDescription: "Donanım ve açıklama",
  mileage: "Kilometre",
  fuelType: "Yakıt tipi",
  transmission: "Vites",
  bodyType: "Kasa tipi",
  selectBodyType: "Kasa tipi seçin",
  driveType: "Çekiş",
  selectDriveType: "Çekiş seçin",
  color: "Renk",
  engineDisplacement: "Motor hacmi",
  damageState: "Hasar durumu",
  ownerCount: "Sahip sayısı",
  damageDisclaimer: "Hasar bilgileri satıcı beyanıdır; OTOYALI doğrulama iddiasında bulunmaz.",
  description: "Açıklama",
  aiDescriptionSoon: "AI ile açıklama hazırla · Yakında",
  descriptionPlaceholder: "Örnek: Aracım düzenli bakımlı, iç-dış kondisyonu iyi. Bilinen hasar ve değişen parçalar açıklamada belirtilmiştir. Ek donanımlar ve satış nedeni hakkında kısa bilgi paylaşabilirsiniz.",
  descriptionPrompts: ["Aracın genel durumu", "Bakım geçmişi", "Bilinen hasar / değişen parçalar", "Donanım ve aksesuarlar", "Satış nedeni", "Takas düşünceniz"],
  photos: "Fotoğraflar",
  photoGuide: "Fotoğraf rehberi",
  addPhoto: "Fotoğraf ekle",
  photoRequirements: "JPEG, PNG veya WebP kullanın. Görseller büyük, kart ve küçük önizleme boyutlarına optimize edilir. Her fotoğraf en fazla 10 MB olabilir.",
  photoCount: (count: number, max: number) => `${count}/${max} fotoğraf.`,
  minimumPhotosHelp: "En az 3 fotoğraf eklemeniz önerilir.",
  listingPhotoAlt: "İlan fotoğrafı",
  coverPhoto: "Kapak fotoğrafı",
  makeCover: "Kapak yap",
  remove: "Kaldır",
  tryAgain: "Tekrar dene",
  priceAndLocation: "Fiyat ve konum",
  fillFromPlate: "Plaka/VIN ile doldur",
  automaticFillSoon: "Araç bilgilerini otomatik doldurma yakında.",
  comingSoon: "Yakında",
  price: "Fiyat",
  currency: "Para birimi",
  city: "Şehir",
  selectCity: "Şehir seçin",
  requiredCity: "Şehir seçin.",
  negotiable: "Pazarlık var",
  estimatedMarketPrice: "Tahmini piyasa fiyatı",
  similarListingRange: "Benzer ilan aralığı",
  fasterSalePrice: "Daha hızlı satış için önerilen fiyat",
  comparableBasis: (count: number) => `${count} benzer ilan üzerinden hesaplandı. Garanti edilen satış fiyatı değildir.`,
  noPriceSuggestion: "Yeterli benzer ilan yok. Fiyat önerisi yakında daha güçlü olacak.",
  previewAndPublish: "Önizleme ve yayınla",
  listingPreviewAlt: "İlan önizleme",
  listingTitleFallback: "İlan başlığı",
  noSellerDescription: "Satıcı açıklama eklememiş.",
  agreementPrefix: "İlanı yayınlayarak",
  terms: "Kullanım Şartları",
  agreementMiddle: "ve",
  listingRules: "İlan Yayınlama Kuralları",
  agreementSuffix: "metinlerini kabul etmiş olursunuz.",
  publishing: "Yayınlanıyor",
  publish: "İlanı yayınla",
  quality: "İlan kalitesi",
  qualityVeryGood: "Çok iyi",
  qualityGood: "İyi",
  qualityIncomplete: "Eksik",
  complete: "Tamamlandı",
  incomplete: "Eksik",
  qualityDisclaimer: "Bu skor ilan tamlığı içindir; araç doğrulaması veya güven raporu anlamına gelmez.",
  qualityItems: ["Satıcı bilgileri", "Araç bilgileri", "Fiyat girildi", "Şehir seçildi", "Açıklama eklendi", "En az 3 fotoğraf", "Kapak fotoğrafı seçildi", "Hasar bilgisi açıklandı"],
  successTitle: "İlanınız alındı",
  successBody: "İlanınız moderasyon kontrolüne gönderildi. Onaylandıktan sonra yayına alınacaktır.",
  viewListing: "İlanımı görüntüle",
  myListings: "İlanlarım",
  backHome: "Ana sayfaya dön",
  createNew: "Yeni ilan oluştur",
  sellerType: "Satıcı türü",
  phone: "Telefon",
  verifiedPhone: "Giriş telefonunuz üzerinden doğrulanmıştır.",
  authorizedPersonName: "Yetkili kişi adı",
  yourName: "Adınız",
  dealerName: "Galeri adı",
  displayName: "Görünen ad",
  selectSellerType: "Satıcı türünü seçin.",
  missingPhone: "Telefon bilginiz eksik. Lütfen tekrar giriş yapın.",
  enterAuthorizedPerson: "Yetkili kişi adını girin.",
  enterYourName: "Adınızı girin.",
  enterDealerName: "Galeri adını girin.",
  enterDisplayName: "Görünen adınızı girin.",
  requiredVehicleIdentity: "Marka, model ve yıl alanlarını doldurun.",
  invalidYear: "Geçerli bir yıl girin.",
  usedMileageRequired: "İkinci el araçlar için kilometre girin.",
  invalidMileage: "Geçerli bir kilometre girin.",
  invalidPrice: "Geçerli bir fiyat girin.",
  variantLabels: { original: "Orijinal görsel", large: "Detay görseli", card: "Kart görseli", thumb: "Küçük önizleme" }
};

const en: typeof tr = {
  ...tr,
  steps: ["Seller information", "Vehicle information", "Features and description", "Photos", "Price and location", "Preview"],
  colors: { empty: "Color", white: "White", black: "Black", gray: "Gray", blue: "Blue", red: "Red", silver: "Silver" },
  photoChecklist: ["Front three-quarter view", "Rear three-quarter view", "Interior", "Dashboard", "Odometer", "Engine bay", "Tires", "Close-ups of any damage or scratches"],
  listingUnavailable: "No editable listing was found, or the listing is no longer eligible for editing.", missingSupabaseEnv: "Supabase environment variables are missing.",
  authenticationRequired: "Log in to edit this listing.", staleConflict: "The listing changed while you were editing. Refresh the page and try again.",
  invalidVehicleFields: "Check the vehicle fields; engine displacement may be empty only for fully electric vehicles.", saveProgress: "Saving changes.", saveSuccess: "Changes saved. The listing remains rejected and hidden.",
  resubmitProgress: "Sending your listing for review again.", resubmitSuccess: "Changes saved. The listing is awaiting review and remains hidden until approved.", resubmitFailure: "The listing could not be sent for review. Please try again.",
  saveButton: "Save changes", savingButton: "Saving", resubmitButton: "Save and send for review", resubmittingButton: "Sending", rejectionReasonHeading: "Reason for rejection",
  mediaPreserved: "Existing photos, their order, and the cover photo will remain unchanged. Photo editing is not currently available in this edit flow.", existingPhotoAlt: "Existing listing photo", existingCoverPhoto: "Existing cover photo", existingPhoto: "Existing photo",
  electricDisplacement: "Engine displacement must be empty for fully electric vehicles.", combustionDisplacement: "Engine displacement is required for petrol, diesel, LPG, and hybrid vehicles.",
  profileIncomplete: "Complete your seller information.", modelsLoadFailure: "Models could not be loaded. Please try again.", profileSaveFailure: "Your seller information could not be saved. Please try again.",
  tooManyPhotos: "You can upload up to 20 photos.", invalidPhoto: "The photo could not be uploaded. Choose a JPEG, PNG, or WebP file under 10 MB.", optimizingImages: "Optimizing images", photoReady: "Photo ready", photoProcessingFailed: "Photo processing failed", photoProcessingFallback: "The image could not be processed. The original file will be used as a safe fallback.",
  completeProfileBeforePublish: "Complete your seller profile before publishing the listing.", acceptRules: "Accept the listing rules to continue.", checkingSeller: "Checking your seller information.", creatingVehicleProfile: "Creating vehicle profile.", vehicleSaveFailure: "Vehicle information could not be saved. Please try again.", verifyingOwnership: "Verifying vehicle ownership.", ownershipSaveFailure: "Vehicle ownership could not be saved. Please try again.", creatingDraft: "Creating listing draft.", draftCreateFailure: "The listing draft could not be created. Please try again.",
  photosUploading: (current, total) => `Uploading photos (${current}/${total}).`, photosUploadingShort: "Uploading photos", uploading: "uploading", photoUploadFailure: "The photo could not be uploaded. Please try again.", photoSaveFailure: "Photos could not be saved. Please try again.", submittingForModeration: "Sending your listing for moderation.", submitFailure: "Your listing could not be sent for review. Please try again.", checkingSession: "Checking session",
  completeProfileTitle: "Complete your seller profile", completeProfileBody: "Complete only the seller information required to publish. Your phone number is not shown publicly to guest users.", continue: "Continue", back: "Back", next: "Continue",
  sellerInformation: "Seller information", sellerInformationHelp: "This information is used for listing management and secure communication. Your phone number is not shown publicly on listing cards.", dealerVerificationHelp: "Dealer verification will be added later. For now, only the dealer name and authorized contact are required.", saveInformation: "Save information", finalReviewHelp: "Your information will be checked again in the final step.",
  vehicleInformation: "Vehicle information", make: "Make", selectMake: "Select make", model: "Model", catalogOther: "Other", selectModel: "Select model", modelsLoading: "Loading models", year: "Year", condition: "Condition", missingCatalogHelp: "You can report a missing make or model to support.",
  equipmentAndDescription: "Features and description", mileage: "Mileage", fuelType: "Fuel type", transmission: "Transmission", bodyType: "Body type", selectBodyType: "Select body type", driveType: "Drive type", selectDriveType: "Select drive type", color: "Color", engineDisplacement: "Engine displacement", damageState: "Damage status", ownerCount: "Number of owners", damageDisclaimer: "Damage information is provided by the seller; OTOYALI does not claim to verify it.",
  description: "Description", aiDescriptionSoon: "Write with AI · Coming soon", descriptionPlaceholder: "Example: The vehicle has been serviced regularly and is in good condition inside and out. Known damage and replaced parts are disclosed here, along with notable features and the reason for sale.", descriptionPrompts: ["Overall condition", "Service history", "Known damage or replaced parts", "Features and accessories", "Reason for sale", "Trade-in preference"],
  photos: "Photos", photoGuide: "Photo guide", addPhoto: "Add photos", photoRequirements: "Use JPEG, PNG, or WebP. Images are optimized into large, card, and thumbnail sizes. Each photo can be up to 10 MB.", photoCount: (count, max) => `${count}/${max} photos.`, minimumPhotosHelp: "We recommend adding at least 3 photos.", listingPhotoAlt: "Listing photo", coverPhoto: "Cover photo", makeCover: "Make cover", remove: "Remove", tryAgain: "Try again",
  priceAndLocation: "Price and location", fillFromPlate: "Fill from plate/VIN", automaticFillSoon: "Automatic vehicle information entry is coming soon.", comingSoon: "Coming soon", price: "Price", currency: "Currency", city: "City", selectCity: "Select city", requiredCity: "Select a city.", negotiable: "Negotiable",
  estimatedMarketPrice: "Estimated market price", similarListingRange: "Similar listing range", fasterSalePrice: "Suggested price for a faster sale", comparableBasis: (count) => `Calculated from ${count} similar listings. This is not a guaranteed sale price.`, noPriceSuggestion: "There are not enough similar listings yet. Price suggestions will improve as more data becomes available.",
  previewAndPublish: "Preview and publish", listingPreviewAlt: "Listing preview", listingTitleFallback: "Listing title", noSellerDescription: "The seller has not added a description.", agreementPrefix: "By publishing this listing, you accept the", terms: "Terms of Use", agreementMiddle: "and", listingRules: "Listing Rules", agreementSuffix: ".", publishing: "Publishing", publish: "Publish listing",
  quality: "Listing quality", qualityVeryGood: "Very good", qualityGood: "Good", qualityIncomplete: "Incomplete", complete: "Complete", incomplete: "Incomplete", qualityDisclaimer: "This score measures listing completeness; it does not verify the vehicle or constitute a trust report.", qualityItems: ["Seller information", "Vehicle information", "Price entered", "City selected", "Description added", "At least 3 photos", "Cover photo selected", "Damage information provided"],
  successTitle: "Listing received", successBody: "Your listing was sent for moderation. It will be published after approval.", viewListing: "View my listing", myListings: "My listings", backHome: "Back to home", createNew: "Create another listing",
  sellerType: "Seller type", phone: "Phone", verifiedPhone: "Verified through your sign-in phone.", authorizedPersonName: "Authorized contact name", yourName: "Your name", dealerName: "Dealer name", displayName: "Display name", selectSellerType: "Select a seller type.", missingPhone: "Your phone number is missing. Please log in again.", enterAuthorizedPerson: "Enter the authorized contact name.", enterYourName: "Enter your name.", enterDealerName: "Enter the dealer name.", enterDisplayName: "Enter a display name.",
  requiredVehicleIdentity: "Complete the make, model, and year fields.", invalidYear: "Enter a valid year.", usedMileageRequired: "Enter the mileage for a used vehicle.", invalidMileage: "Enter a valid mileage.", invalidPrice: "Enter a valid price.",
  variantLabels: { original: "Original image", large: "Large image", card: "Card image", thumb: "Thumbnail" }
};

export type SellCopy = typeof tr;

const sellCopies: Record<Locale, SellCopy> = { tr, en };

export function getSellCopy(locale?: string | null): SellCopy {
  return sellCopies[normalizeLocale(locale)];
}

export function getVariantUploadStatus(copy: SellCopy, name: PreparedImageVariantName) {
  return `${copy.variantLabels[name]} ${copy.uploading}`;
}

export function isSellCatalogOther(item: SellMakeCatalogItem | SellModelCatalogItem): boolean {
  return ("make_slug" in item && item.make_slug === "diger") || ("model_slug" in item && item.model_slug === "diger");
}

export function getSellCatalogDisplayName(input: SellCatalogDisplayInput): string {
  const { item, locale } = input;
  if (isSellCatalogOther(item)) return getSellCopy(locale).catalogOther;
  return input.kind === "make" ? input.item.make_name ?? "" : input.item.model_name ?? "";
}

export function getSellModelRequestContextKey(routeKey: string, locale: Locale): string {
  return `route:${routeKey}:locale:${locale}`;
}
