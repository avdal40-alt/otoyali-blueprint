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
  unsavedChangesTitle: "Kaydedilmemiş değişiklikler",
  unsavedChangesBody: "Bu sayfadan ayrılmadan önce değişikliklerinizi nasıl ele almak istediğinizi seçin.",
  continueEditing: "Düzenlemeye devam et",
  saveDraftAndLeave: "Taslağı kaydet ve ayrıl",
  discardAndLeave: "Değişiklikleri sil ve ayrıl",
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
  tooManyPhotos: "En fazla 15 fotoğraf yükleyebilirsiniz.",
  invalidPhoto: "Fotoğraf yüklenemedi. Lütfen JPEG, PNG veya WebP formatında ve 10 MB altında dosya seçin.",
  optimizingImages: "Görseller optimize ediliyor",
  photoReady: "Fotoğraf hazır",
  photoProcessingFailed: "Fotoğraf işlenemedi",
  photoProcessingFallback: "Fotoğraf işlenemedi. Kaldırıp yeniden yüklemeyi deneyin.",
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
  photoProtecting: "Fotoğraf güvenli şekilde işleniyor",
  photoProtected: (count: number): string => count > 1 ? "Görünür plakalar gizliliğiniz için otomatik olarak bulanıklaştırıldı." : "Görünür plaka gizliliğiniz için otomatik olarak bulanıklaştırıldı.",
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
  dealerVerificationHelp: "Galeri erişimi davetle verilir; doğrulama yalnızca platform incelemesinden sonra atanır.",
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
  damageDisclaimer: "Hasar bilgileri satıcı beyanıdır; Jolcar doğrulama iddiasında bulunmaz.",
  description: "Açıklama",
  aiDescriptionSoon: "AI ile açıklama hazırla · Yakında",
  descriptionPlaceholder: "Örnek: Aracım düzenli bakımlı, iç-dış kondisyonu iyi. Bilinen hasar ve değişen parçalar açıklamada belirtilmiştir. Ek donanımlar ve satış nedeni hakkında kısa bilgi paylaşabilirsiniz.",
  descriptionPrompts: ["Aracın genel durumu", "Bakım geçmişi", "Bilinen hasar / değişen parçalar", "Donanım ve aksesuarlar", "Satış nedeni", "Takas düşünceniz"],
  photos: "Fotoğraflar",
  photoGuide: "Fotoğraf rehberi",
  addPhoto: "Fotoğraf ekle",
  photoRequirements: "JPEG, PNG veya WebP kullanın. Görseller büyük, kart ve küçük önizleme boyutlarına optimize edilir. Her fotoğraf en fazla 10 MB olabilir.",
  photoCount: (count: number, max: number) => `${count}/${max} fotoğraf.`,
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
  previewAndPublish: "Önizleme ve ilanı yayınla",
  listingPreviewAlt: "İlan önizleme",
  listingTitleFallback: "İlan başlığı",
  noSellerDescription: "Satıcı açıklama eklememiş.",
  agreementPrefix: "İlanı yayınlayarak",
  terms: "Kullanım Şartları",
  agreementMiddle: "ve",
  listingRules: "İlan Yayınlama Kuralları",
  agreementSuffix: "metinlerini kabul etmiş olursunuz.",
  publishing: "İlan yayınlanıyor",
  publish: "İlanı yayınla",
  quality: "İlan kalitesi",
  qualityVeryGood: "Çok iyi",
  qualityGood: "İyi",
  qualityIncomplete: "Eksik",
  complete: "Tamamlandı",
  incomplete: "Eksik",
  qualityDisclaimer: "Bu skor ilan tamlığı içindir; araç doğrulaması veya güven raporu anlamına gelmez.",
  qualityItems: ["Satıcı bilgileri", "Araç bilgileri", "Fiyat girildi", "Şehir seçildi", "Açıklama eklendi", "Fotoğraflar (isteğe bağlı)", "Kapak fotoğrafı (isteğe bağlı)", "Hasar bilgisi açıklandı"],
  successTitle: "İlanınız alındı",
  successBody: "İlanınız moderasyon incelemesi bekliyor ve onaylanana kadar gizli tutulacak.",
  viewListing: "İlanımı görüntüle",
  myListings: "İlanlarım",
  backHome: "Ana sayfaya dön",
  createNew: "Yeni ilan oluştur",
  sellerContactTitle: "Doğrulanmış satıcı iletişimi", sellerContactLabel: "İletişim numarası", sellerContactMissing: "İlan oluşturmadan önce doğrulanmış bir iletişim numarası ekleyin.", sellerContactManage: "Numaraları yönet", sellerContactAccount: "Hesap telefonu", sellerContactRequired: "İlan oluşturmadan önce doğrulanmış bir satıcı iletişim numarası seçin.", listingContactTitle: "İlan iletişim numarası", listingContactHelp: "Alıcıların kullanacağı doğrulanmış numarayı seçin.", listingContactUnavailable: "Doğrulanmış iletişim numarası yok.", listingContactLabel: "İletişim numarası", keepCurrentContact: "Mevcut seçimi koru", existingContact: "Mevcut iletişim numarası", existingContactHelp: "Bu ilan mevcut iletişim numarasını kullanıyor.", contactUpdateFailure: "İlan değişiklikleri kaydedildi, ancak iletişim numarası güncellenemedi. Lütfen iletişim numarasını tekrar güncelleyin.",
  sellerType: "Satıcı türü",
  sellerTypeVerification: "Galeri durumu doğrulama sonrasında atanır.",
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
  tooManyPhotos: "You can upload up to 15 photos.", invalidPhoto: "The photo could not be uploaded. Choose a JPEG, PNG, or WebP file under 10 MB.", optimizingImages: "Optimizing images", photoReady: "Photo ready", photoProcessingFailed: "Photo processing failed", photoProcessingFallback: "The photo could not be processed. Remove it and try uploading it again.",
  completeProfileBeforePublish: "Complete your seller profile before publishing the listing.", acceptRules: "Accept the listing rules to continue.", checkingSeller: "Checking your seller information.", creatingVehicleProfile: "Creating vehicle profile.", vehicleSaveFailure: "Vehicle information could not be saved. Please try again.", verifyingOwnership: "Verifying vehicle ownership.", ownershipSaveFailure: "Vehicle ownership could not be saved. Please try again.", creatingDraft: "Creating listing draft.", draftCreateFailure: "The listing draft could not be created. Please try again.",
  photosUploading: (current, total) => `Uploading photos (${current}/${total}).`, photosUploadingShort: "Uploading photos", photoProtecting: "Processing photo securely", photoProtected: (count) => count > 1 ? "Visible license plates were automatically blurred for privacy." : "A visible license plate was automatically blurred for privacy.", uploading: "uploading", photoUploadFailure: "The photo could not be uploaded. Please try again.", photoSaveFailure: "Photos could not be saved. Please try again.", submittingForModeration: "Sending your listing for moderation.", submitFailure: "Your listing could not be sent for review. Please try again.", checkingSession: "Checking session",
  completeProfileTitle: "Complete your seller profile", completeProfileBody: "Complete only the seller information required to publish. Your phone number is not shown publicly to guest users.", continue: "Continue", back: "Back", next: "Continue",
  unsavedChangesTitle: "Unsaved changes", unsavedChangesBody: "Choose what to do with your changes before leaving this page.", continueEditing: "Continue editing", saveDraftAndLeave: "Save draft and leave", discardAndLeave: "Discard changes and leave",
  sellerInformation: "Seller information", sellerInformationHelp: "This information is used for listing management and secure communication. Your phone number is not shown publicly on listing cards.", dealerVerificationHelp: "Dealer access is invite-only; verification is assigned only after platform review.", saveInformation: "Save information", finalReviewHelp: "Your information will be checked again in the final step.",
  vehicleInformation: "Vehicle information", make: "Make", selectMake: "Select make", model: "Model", catalogOther: "Other", selectModel: "Select model", modelsLoading: "Loading models", year: "Year", condition: "Condition", missingCatalogHelp: "You can report a missing make or model to support.",
  equipmentAndDescription: "Features and description", mileage: "Mileage", fuelType: "Fuel type", transmission: "Transmission", bodyType: "Body type", selectBodyType: "Select body type", driveType: "Drive type", selectDriveType: "Select drive type", color: "Color", engineDisplacement: "Engine displacement", damageState: "Damage status", ownerCount: "Number of owners", damageDisclaimer: "Damage information is provided by the seller; Jolcar does not claim to verify it.",
  description: "Description", aiDescriptionSoon: "Write with AI · Coming soon", descriptionPlaceholder: "Example: The vehicle has been serviced regularly and is in good condition inside and out. Known damage and replaced parts are disclosed here, along with notable features and the reason for sale.", descriptionPrompts: ["Overall condition", "Service history", "Known damage or replaced parts", "Features and accessories", "Reason for sale", "Trade-in preference"],
  photos: "Photos", photoGuide: "Photo guide", addPhoto: "Add photos", photoRequirements: "Use JPEG, PNG, or WebP. Images are optimized into large, card, and thumbnail sizes. Each photo can be up to 10 MB.", photoCount: (count, max) => `${count}/${max} photos.`, listingPhotoAlt: "Listing photo", coverPhoto: "Cover photo", makeCover: "Make cover", remove: "Remove", tryAgain: "Try again",
  priceAndLocation: "Price and location", fillFromPlate: "Fill from plate/VIN", automaticFillSoon: "Automatic vehicle information entry is coming soon.", comingSoon: "Coming soon", price: "Price", currency: "Currency", city: "City", selectCity: "Select city", requiredCity: "Select a city.", negotiable: "Negotiable",
  previewAndPublish: "Preview and publish listing", listingPreviewAlt: "Listing preview", listingTitleFallback: "Listing title", noSellerDescription: "The seller has not added a description.", agreementPrefix: "By publishing this listing, you accept the", terms: "Terms of Use", agreementMiddle: "and", listingRules: "Listing Rules", agreementSuffix: ".", publishing: "Publishing listing", publish: "Publish listing",
  quality: "Listing quality", qualityVeryGood: "Very good", qualityGood: "Good", qualityIncomplete: "Incomplete", complete: "Complete", incomplete: "Incomplete", qualityDisclaimer: "This score measures listing completeness; it does not verify the vehicle or constitute a trust report.", qualityItems: ["Seller information", "Vehicle information", "Price entered", "City selected", "Description added", "Photos (optional)", "Cover photo (optional)", "Damage information provided"],
  successTitle: "Listing received", successBody: "Your listing is awaiting moderation and remains hidden until approved.", viewListing: "View my listing", myListings: "My listings", backHome: "Back to home", createNew: "Create another listing", sellerContactTitle: "Verified seller contact", sellerContactLabel: "Contact number", sellerContactMissing: "Add and verify a contact number before creating a listing.", sellerContactManage: "Manage phone numbers", sellerContactAccount: "Account phone", sellerContactRequired: "Select a verified seller contact number before creating the listing.", listingContactTitle: "Listing contact phone", listingContactHelp: "Select the verified phone buyers will use to contact you.", listingContactUnavailable: "No verified contact is available.", listingContactLabel: "Contact phone", keepCurrentContact: "Keep current selection", existingContact: "Existing contact number", existingContactHelp: "This listing currently uses its existing contact number.", contactUpdateFailure: "Listing changes were saved, but the contact phone could not be updated. Please try updating the contact again.",
  sellerType: "Seller type", sellerTypeVerification: "Dealer status is assigned after verification.", phone: "Phone", verifiedPhone: "Verified through your sign-in phone.", authorizedPersonName: "Authorized contact name", yourName: "Your name", dealerName: "Dealer name", displayName: "Display name", selectSellerType: "Select a seller type.", missingPhone: "Your phone number is missing. Please log in again.", enterAuthorizedPerson: "Enter the authorized contact name.", enterYourName: "Enter your name.", enterDealerName: "Enter the dealer name.", enterDisplayName: "Enter a display name.",
  requiredVehicleIdentity: "Complete the make, model, and year fields.", invalidYear: "Enter a valid year.", usedMileageRequired: "Enter the mileage for a used vehicle.", invalidMileage: "Enter a valid mileage.", invalidPrice: "Enter a valid price.",
  variantLabels: { original: "Original image", large: "Large image", card: "Card image", thumb: "Thumbnail" }
};

const ru: typeof tr = {
  steps: ["Данные продавца", "Данные автомобиля", "Оснащение и описание", "Фотографии", "Цена и местоположение", "Предпросмотр"],
  colors: { empty: "Цвет", white: "Белый", black: "Чёрный", gray: "Серый", blue: "Синий", red: "Красный", silver: "Серебристый" },
  photoChecklist: ["Передний ракурс 3/4", "Задний ракурс 3/4", "Салон", "Панель приборов", "Одометр", "Подкапотное пространство", "Шины", "Крупные планы повреждений или царапин"],
  listingUnavailable: "Редактируемое объявление не найдено или больше недоступно для редактирования.", unsavedChangesTitle: "Несохранённые изменения", unsavedChangesBody: "Выберите, что сделать с изменениями перед уходом со страницы.", continueEditing: "Продолжить редактирование", saveDraftAndLeave: "Сохранить черновик и выйти", discardAndLeave: "Отменить изменения и выйти",
  missingSupabaseEnv: "Отсутствуют переменные окружения Supabase.", authenticationRequired: "Войдите, чтобы редактировать это объявление.", staleConflict: "Объявление изменилось во время редактирования. Обновите страницу и попробуйте снова.", invalidVehicleFields: "Проверьте данные автомобиля; объём двигателя можно не указывать только для полностью электрических автомобилей.",
  saveProgress: "Сохранение изменений.", saveSuccess: "Изменения сохранены. Объявление остаётся отклонённым и скрытым.", resubmitProgress: "Объявление повторно отправляется на проверку.", resubmitSuccess: "Изменения сохранены. Объявление ожидает проверки и останется скрытым до одобрения.", resubmitFailure: "Не удалось отправить объявление на проверку. Попробуйте снова.", saveButton: "Сохранить изменения", savingButton: "Сохранение", resubmitButton: "Сохранить и отправить на проверку", resubmittingButton: "Отправка", rejectionReasonHeading: "Причина отклонения",
  mediaPreserved: "Существующие фотографии, их порядок и обложка останутся без изменений. Редактирование фотографий в этом сценарии пока недоступно.", existingPhotoAlt: "Существующая фотография объявления", existingCoverPhoto: "Существующая фотография обложки", existingPhoto: "Существующая фотография", electricDisplacement: "Для полностью электрического автомобиля объём двигателя должен быть пустым.", combustionDisplacement: "Объём двигателя обязателен для бензиновых, дизельных, LPG- и гибридных автомобилей.",
  profileIncomplete: "Заполните данные продавца.", modelsLoadFailure: "Не удалось загрузить модели. Попробуйте снова.", profileSaveFailure: "Не удалось сохранить данные продавца. Попробуйте снова.", tooManyPhotos: "Можно загрузить до 15 фотографий.", invalidPhoto: "Не удалось загрузить фотографию. Выберите файл JPEG, PNG или WebP размером до 10 МБ.", optimizingImages: "Оптимизация изображений", photoReady: "Фотография готова", photoProcessingFailed: "Не удалось обработать фотографию", photoProcessingFallback: "Не удалось обработать фотографию. Удалите её и попробуйте загрузить снова.",
  completeProfileBeforePublish: "Заполните профиль продавца перед публикацией объявления.", acceptRules: "Примите правила публикации объявлений, чтобы продолжить.", checkingSeller: "Проверка данных продавца.", creatingVehicleProfile: "Создание профиля автомобиля.", vehicleSaveFailure: "Не удалось сохранить данные автомобиля. Попробуйте снова.", verifyingOwnership: "Проверка владения автомобилем.", ownershipSaveFailure: "Не удалось сохранить данные о владении автомобилем. Попробуйте снова.", creatingDraft: "Создание черновика объявления.", draftCreateFailure: "Не удалось создать черновик объявления. Попробуйте снова.",
  photosUploading: (current, total) => `Загрузка фотографий (${current}/${total}).`, photosUploadingShort: "Загрузка фотографий", photoProtecting: "Безопасная обработка фотографии", photoProtected: (count) => count > 1 ? "Видимые номерные знаки автоматически размыты для защиты конфиденциальности." : "Видимый номерной знак автоматически размыт для защиты конфиденциальности.", uploading: "загрузка", photoUploadFailure: "Не удалось загрузить фотографию. Попробуйте снова.", photoSaveFailure: "Не удалось сохранить фотографии. Попробуйте снова.", submittingForModeration: "Объявление отправляется на модерацию.", submitFailure: "Не удалось отправить объявление на проверку. Попробуйте снова.", checkingSession: "Проверка сеанса",
  completeProfileTitle: "Заполните профиль продавца", completeProfileBody: "Заполните только данные продавца, необходимые для публикации. Ваш номер телефона не показывается гостям.", continue: "Продолжить", back: "Назад", next: "Далее", sellerInformation: "Данные продавца", sellerInformationHelp: "Эти сведения используются для управления объявлениями и безопасного общения. Номер телефона не отображается публично в карточках объявлений.", dealerVerificationHelp: "Доступ дилера предоставляется по приглашению; подтверждение присваивается только после проверки платформой.", saveInformation: "Сохранить данные", finalReviewHelp: "На последнем шаге данные будут проверены ещё раз.",
  vehicleInformation: "Данные автомобиля", make: "Марка", selectMake: "Выберите марку", model: "Модель", catalogOther: "Другое", selectModel: "Выберите модель", modelsLoading: "Загрузка моделей", year: "Год", condition: "Состояние", missingCatalogHelp: "Вы можете сообщить службе поддержки об отсутствующей марке или модели.", equipmentAndDescription: "Оснащение и описание", mileage: "Пробег", fuelType: "Тип топлива", transmission: "Коробка передач", bodyType: "Тип кузова", selectBodyType: "Выберите тип кузова", driveType: "Привод", selectDriveType: "Выберите привод", color: "Цвет", engineDisplacement: "Объём двигателя", damageState: "Состояние повреждений", ownerCount: "Количество владельцев", damageDisclaimer: "Информация о повреждениях указана продавцом; Jolmod не заявляет о её проверке.",
  description: "Описание", aiDescriptionSoon: "Создать описание с ИИ · Скоро", descriptionPlaceholder: "Пример: Автомобиль регулярно обслуживался и находится в хорошем состоянии снаружи и внутри. Известные повреждения и заменённые детали указаны в описании. Можно кратко рассказать об оснащении и причине продажи.", descriptionPrompts: ["Общее состояние автомобиля", "История обслуживания", "Известные повреждения или заменённые детали", "Оснащение и аксессуары", "Причина продажи", "Возможность обмена"], photos: "Фотографии", photoGuide: "Руководство по фотографиям", addPhoto: "Добавить фотографии", photoRequirements: "Используйте JPEG, PNG или WebP. Изображения оптимизируются для большого, карточного и миниатюрного форматов. Размер каждой фотографии — до 10 МБ.", photoCount: (count, max) => `${count}/${max} фотографий.`, listingPhotoAlt: "Фотография объявления", coverPhoto: "Фотография обложки", makeCover: "Сделать обложкой", remove: "Удалить", tryAgain: "Попробовать снова",
  priceAndLocation: "Цена и местоположение", fillFromPlate: "Заполнить по номеру/VIN", automaticFillSoon: "Автоматическое заполнение данных автомобиля появится скоро.", comingSoon: "Скоро", price: "Цена", currency: "Валюта", city: "Город", selectCity: "Выберите город", requiredCity: "Выберите город.", negotiable: "Торг возможен", previewAndPublish: "Предпросмотр и публикация объявления", listingPreviewAlt: "Предпросмотр объявления", listingTitleFallback: "Заголовок объявления", noSellerDescription: "Продавец не добавил описание.", agreementPrefix: "Публикуя это объявление, вы принимаете", terms: "Условия использования", agreementMiddle: "и", listingRules: "Правила публикации объявлений", agreementSuffix: ".", publishing: "Публикация объявления", publish: "Опубликовать объявление",
  quality: "Качество объявления", qualityVeryGood: "Очень хорошее", qualityGood: "Хорошее", qualityIncomplete: "Неполное", complete: "Готово", incomplete: "Не заполнено", qualityDisclaimer: "Этот показатель отражает полноту объявления; он не подтверждает автомобиль и не является отчётом о доверии.", qualityItems: ["Данные продавца", "Данные автомобиля", "Цена указана", "Город выбран", "Описание добавлено", "Фотографии (необязательно)", "Фотография обложки (необязательно)", "Информация о повреждениях указана"], successTitle: "Объявление принято", successBody: "Ваше объявление ожидает модерации и будет скрыто до одобрения.", viewListing: "Открыть моё объявление", myListings: "Мои объявления", backHome: "Вернуться на главную", createNew: "Создать ещё одно объявление",
  sellerContactTitle: "Подтверждённый контакт продавца", sellerContactLabel: "Контактный номер", sellerContactMissing: "Добавьте и подтвердите контактный номер перед созданием объявления.", sellerContactManage: "Управление номерами", sellerContactAccount: "Телефон аккаунта", sellerContactRequired: "Выберите подтверждённый контактный номер продавца перед созданием объявления.", listingContactTitle: "Контактный телефон объявления", listingContactHelp: "Выберите подтверждённый номер, по которому покупатели смогут связаться с вами.", listingContactUnavailable: "Нет доступного подтверждённого контакта.", listingContactLabel: "Контактный телефон", keepCurrentContact: "Оставить текущий выбор", existingContact: "Текущий контактный номер", existingContactHelp: "В этом объявлении используется текущий контактный номер.", contactUpdateFailure: "Изменения объявления сохранены, но не удалось обновить контактный телефон. Попробуйте обновить его снова.",
  sellerType: "Тип продавца", sellerTypeVerification: "Статус дилера присваивается после проверки.", phone: "Телефон", verifiedPhone: "Подтверждён через номер, использованный при входе.", authorizedPersonName: "Имя уполномоченного лица", yourName: "Ваше имя", dealerName: "Название дилерского центра", displayName: "Отображаемое имя", selectSellerType: "Выберите тип продавца.", missingPhone: "Номер телефона отсутствует. Войдите снова.", enterAuthorizedPerson: "Введите имя уполномоченного лица.", enterYourName: "Введите ваше имя.", enterDealerName: "Введите название дилерского центра.", enterDisplayName: "Введите отображаемое имя.", requiredVehicleIdentity: "Заполните поля марки, модели и года.", invalidYear: "Введите корректный год.", usedMileageRequired: "Укажите пробег для автомобиля с пробегом.", invalidMileage: "Введите корректный пробег.", invalidPrice: "Введите корректную цену.", variantLabels: { original: "Исходное изображение", large: "Большое изображение", card: "Изображение карточки", thumb: "Миниатюра" }
};

export type SellCopy = typeof tr;

const kk: typeof tr = {
  steps: ["Сатушы деректері", "Көлік деректері", "Жабдық және сипаттама", "Фотосуреттер", "Баға және орналасқан жері", "Алдын ала қарау"],
  colors: { empty: "Түс", white: "Ақ", black: "Қара", gray: "Сұр", blue: "Көк", red: "Қызыл", silver: "Күміс" }, photoChecklist: ["Алдыңғы 3/4 көрініс", "Артқы 3/4 көрініс", "Салон", "Аспаптар панелі", "Одометр", "Қозғалтқыш бөлігі", "Дөңгелектер", "Зақымдар не сызаттардың ірі жоспары"],
  listingUnavailable: "Өңдеуге болатын хабарландыру табылмады немесе ол енді өңдеуге қолжетімсіз.", unsavedChangesTitle: "Сақталмаған өзгерістер", unsavedChangesBody: "Беттен шықпас бұрын өзгерістермен не істеу керегін таңдаңыз.", continueEditing: "Өңдеуді жалғастыру", saveDraftAndLeave: "Нобайды сақтап шығу", discardAndLeave: "Өзгерістерден бас тартып шығу", missingSupabaseEnv: "Supabase орта айнымалылары жоқ.", authenticationRequired: "Осы хабарландыруды өңдеу үшін кіріңіз.", staleConflict: "Хабарландыру сіз өңдеп жатқанда өзгертілді. Бетті жаңартып, қайталап көріңіз.", invalidVehicleFields: "Көлік өрістерін тексеріңіз; қозғалтқыш көлемін тек толық электрлі көліктерде бос қалдыруға болады.",
  saveProgress: "Өзгерістер сақталуда.", saveSuccess: "Өзгерістер сақталды. Хабарландыру қабылданбаған және жасырын күйде қалады.", resubmitProgress: "Хабарландыру қайта тексеруге жіберілуде.", resubmitSuccess: "Өзгерістер сақталды. Хабарландыру тексеруді күтеді және мақұлданғанға дейін жасырын болады.", resubmitFailure: "Хабарландыруды тексеруге жіберу мүмкін болмады. Қайталап көріңіз.", saveButton: "Өзгерістерді сақтау", savingButton: "Сақталуда", resubmitButton: "Сақтап, тексеруге жіберу", resubmittingButton: "Жіберілуде", rejectionReasonHeading: "Қабылданбау себебі",
  mediaPreserved: "Бар фотосуреттер, олардың реті және мұқаба фотосуреті өзгеріссіз қалады. Бұл өңдеу ағынында фотосуреттерді өңдеу әзірге қолжетімсіз.", existingPhotoAlt: "Хабарландырудың бар фотосуреті", existingCoverPhoto: "Бар мұқаба фотосуреті", existingPhoto: "Бар фотосурет", electricDisplacement: "Толық электрлі көлік үшін қозғалтқыш көлемі бос болуы тиіс.", combustionDisplacement: "Қозғалтқыш көлемі бензин, дизель, LPG және гибрид көліктері үшін міндетті.",
  profileIncomplete: "Сатушы деректерін толтырыңыз.", modelsLoadFailure: "Модельдерді жүктеу мүмкін болмады. Қайталап көріңіз.", profileSaveFailure: "Сатушы деректерін сақтау мүмкін болмады. Қайталап көріңіз.", tooManyPhotos: "15 фотосуретке дейін жүктей аласыз.", invalidPhoto: "Фотосуретті жүктеу мүмкін болмады. Өлшемі 10 МБ-тан аспайтын JPEG, PNG немесе WebP файлын таңдаңыз.", optimizingImages: "Кескіндер оңтайландырылуда", photoReady: "Фотосурет дайын", photoProcessingFailed: "Фотосуретті өңдеу мүмкін болмады", photoProcessingFallback: "Фотосуретті өңдеу мүмкін болмады. Оны жойып, қайта жүктеп көріңіз.",
  completeProfileBeforePublish: "Хабарландыруды жарияламас бұрын сатушы профилін толтырыңыз.", acceptRules: "Жалғастыру үшін хабарландыру жариялау ережелерін қабылдаңыз.", checkingSeller: "Сатушы деректері тексерілуде.", creatingVehicleProfile: "Көлік профилі жасалуда.", vehicleSaveFailure: "Көлік деректерін сақтау мүмкін болмады. Қайталап көріңіз.", verifyingOwnership: "Көлік иелігі тексерілуде.", ownershipSaveFailure: "Көлік иелігі туралы деректерді сақтау мүмкін болмады. Қайталап көріңіз.", creatingDraft: "Хабарландыру нобайы жасалуда.", draftCreateFailure: "Хабарландыру нобайын жасау мүмкін болмады. Қайталап көріңіз.",
  photosUploading: (current, total) => `Фотосуреттер жүктелуде (${current}/${total}).`, photosUploadingShort: "Фотосуреттер жүктелуде", photoProtecting: "Фотосурет қауіпсіз өңделуде", photoProtected: (count) => count > 1 ? "Көрінетін нөмірлік белгілер құпиялылық үшін автоматты түрде бұлдырлатылды." : "Көрінетін нөмірлік белгі құпиялылық үшін автоматты түрде бұлдырлатылды.", uploading: "жүктелуде", photoUploadFailure: "Фотосуретті жүктеу мүмкін болмады. Қайталап көріңіз.", photoSaveFailure: "Фотосуреттерді сақтау мүмкін болмады. Қайталап көріңіз.", submittingForModeration: "Хабарландыру модерацияға жіберілуде.", submitFailure: "Хабарландыруды тексеруге жіберу мүмкін болмады. Қайталап көріңіз.", checkingSession: "Сеанс тексерілуде",
  completeProfileTitle: "Сатушы профилін толтырыңыз", completeProfileBody: "Жариялау үшін қажет сатушы деректерін ғана толтырыңыз. Телефон нөміріңіз қонақ пайдаланушыларға көрсетілмейді.", continue: "Жалғастыру", back: "Артқа", next: "Келесі", sellerInformation: "Сатушы деректері", sellerInformationHelp: "Бұл деректер хабарландыруларды басқару және қауіпсіз байланыс үшін пайдаланылады. Телефон нөміріңіз хабарландыру карточкаларында ашық көрсетілмейді.", dealerVerificationHelp: "Дилерге қолжетімділік шақырумен беріледі; растау тек платформа тексерісінен кейін тағайындалады.", saveInformation: "Деректерді сақтау", finalReviewHelp: "Соңғы қадамда деректер қайта тексеріледі.",
  vehicleInformation: "Көлік деректері", make: "Марка", selectMake: "Марка таңдаңыз", model: "Модель", catalogOther: "Басқа", selectModel: "Модель таңдаңыз", modelsLoading: "Модельдер жүктелуде", year: "Жыл", condition: "Күйі", missingCatalogHelp: "Жоқ марка немесе модель туралы қолдау қызметіне хабарлай аласыз.", equipmentAndDescription: "Жабдық және сипаттама", mileage: "Жүріс", fuelType: "Отын түрі", transmission: "Беріліс қорабы", bodyType: "Кузов түрі", selectBodyType: "Кузов түрін таңдаңыз", driveType: "Жетек", selectDriveType: "Жетекті таңдаңыз", color: "Түс", engineDisplacement: "Қозғалтқыш көлемі", damageState: "Зақым күйі", ownerCount: "Иелер саны", damageDisclaimer: "Зақым туралы ақпаратты сатушы береді; Jolmod оны тексереміз деп мәлімдемейді.",
  description: "Сипаттама", aiDescriptionSoon: "ЖИ көмегімен сипаттама жазу · Жақында", descriptionPlaceholder: "Мысал: Көлікке үнемі қызмет көрсетілген, іші мен сырты жақсы күйде. Белгілі зақымдар мен ауыстырылған бөлшектер сипаттамада көрсетілген. Жабдық пен сату себебі туралы қысқаша жаза аласыз.", descriptionPrompts: ["Көліктің жалпы күйі", "Қызмет көрсету тарихы", "Белгілі зақымдар не ауыстырылған бөлшектер", "Жабдықтар мен аксессуарлар", "Сату себебі", "Айырбастауға ниетіңіз"], photos: "Фотосуреттер", photoGuide: "Фотосурет нұсқаулығы", addPhoto: "Фотосурет қосу", photoRequirements: "JPEG, PNG немесе WebP пайдаланыңыз. Кескіндер үлкен, карточка және шағын алдын ала қарау өлшемдеріне оңтайландырылады. Әр фотосурет 10 МБ-тан аспауы тиіс.", photoCount: (count, max) => `${count}/${max} фотосурет.`, listingPhotoAlt: "Хабарландыру фотосуреті", coverPhoto: "Мұқаба фотосуреті", makeCover: "Мұқаба ету", remove: "Жою", tryAgain: "Қайта көру",
  priceAndLocation: "Баға және орналасқан жері", fillFromPlate: "Нөмір/VIN арқылы толтыру", automaticFillSoon: "Көлік деректерін автоматты толтыру жақында қолжетімді болады.", comingSoon: "Жақында", price: "Баға", currency: "Валюта", city: "Қала", selectCity: "Қаланы таңдаңыз", requiredCity: "Қаланы таңдаңыз.", negotiable: "Саудаласуға болады", previewAndPublish: "Алдын ала қарау және жариялау", listingPreviewAlt: "Хабарландыруды алдын ала қарау", listingTitleFallback: "Хабарландыру атауы", noSellerDescription: "Сатушы сипаттама қоспады.", agreementPrefix: "Осы хабарландыруды жариялай отырып, сіз", terms: "Пайдалану шарттарын", agreementMiddle: "және", listingRules: "Хабарландыру жариялау ережелерін", agreementSuffix: "қабылдайсыз.", publishing: "Хабарландыру жариялануда", publish: "Хабарландыруды жариялау",
  quality: "Хабарландыру сапасы", qualityVeryGood: "Өте жақсы", qualityGood: "Жақсы", qualityIncomplete: "Толық емес", complete: "Толық", incomplete: "Толық емес", qualityDisclaimer: "Бұл көрсеткіш хабарландырудың толықтығын көрсетеді; ол көлікті растамайды және сенім есебі болып табылмайды.", qualityItems: ["Сатушы деректері", "Көлік деректері", "Баға енгізілді", "Қала таңдалды", "Сипаттама қосылды", "Фотосуреттер (міндетті емес)", "Мұқаба фотосуреті (міндетті емес)", "Зақым туралы ақпарат берілді"], successTitle: "Хабарландыру қабылданды", successBody: "Хабарландыруыңыз модерацияны күтеді және мақұлданғанға дейін жасырын қалады.", viewListing: "Менің хабарландыруымды көру", myListings: "Менің хабарландыруларым", backHome: "Басты бетке оралу", createNew: "Тағы бір хабарландыру жасау",
  sellerContactTitle: "Расталған сатушы байланысы", sellerContactLabel: "Байланыс нөмірі", sellerContactMissing: "Хабарландыру жасамас бұрын байланыс нөмірін қосып, растаңыз.", sellerContactManage: "Нөмірлерді басқару", sellerContactAccount: "Тіркелгі телефоны", sellerContactRequired: "Хабарландыру жасамас бұрын расталған сатушы байланыс нөмірін таңдаңыз.", listingContactTitle: "Хабарландырудың байланыс телефоны", listingContactHelp: "Сатып алушылар сізбен байланысу үшін пайдаланатын расталған нөмірді таңдаңыз.", listingContactUnavailable: "Расталған байланыс жоқ.", listingContactLabel: "Байланыс телефоны", keepCurrentContact: "Ағымдағы таңдауды сақтау", existingContact: "Ағымдағы байланыс нөмірі", existingContactHelp: "Бұл хабарландыруда ағымдағы байланыс нөмірі қолданылады.", contactUpdateFailure: "Хабарландыру өзгерістері сақталды, бірақ байланыс телефонын жаңарту мүмкін болмады. Қайталап көріңіз.",
  sellerType: "Сатушы түрі", sellerTypeVerification: "Дилер мәртебесі тексеруден кейін тағайындалады.", phone: "Телефон", verifiedPhone: "Кіру кезінде пайдаланылған телефон арқылы расталды.", authorizedPersonName: "Уәкілетті тұлғаның аты", yourName: "Атыңыз", dealerName: "Дилерлік орталық атауы", displayName: "Көрсетілетін атау", selectSellerType: "Сатушы түрін таңдаңыз.", missingPhone: "Телефон нөмірі жоқ. Қайта кіріңіз.", enterAuthorizedPerson: "Уәкілетті тұлғаның атын енгізіңіз.", enterYourName: "Атыңызды енгізіңіз.", enterDealerName: "Дилерлік орталық атауын енгізіңіз.", enterDisplayName: "Көрсетілетін атауды енгізіңіз.", requiredVehicleIdentity: "Марка, модель және жыл өрістерін толтырыңыз.", invalidYear: "Дұрыс жыл енгізіңіз.", usedMileageRequired: "Қолданылған көлік үшін жүрісті енгізіңіз.", invalidMileage: "Дұрыс жүрісті енгізіңіз.", invalidPrice: "Дұрыс бағаны енгізіңіз.", variantLabels: { original: "Бастапқы кескін", large: "Үлкен кескін", card: "Карточка кескіні", thumb: "Нобай" }
};

const zhCN: typeof tr = {
  steps: ["卖家信息", "车辆信息", "配置与描述", "照片", "价格和地点", "预览"], colors: { empty: "颜色", white: "白色", black: "黑色", gray: "灰色", blue: "蓝色", red: "红色", silver: "银色" }, photoChecklist: ["前方 3/4 角度", "后方 3/4 角度", "内饰", "仪表盘", "里程表", "发动机舱", "轮胎", "损伤或划痕特写"],
  listingUnavailable: "未找到可编辑的房源，或该房源已无法编辑。", unsavedChangesTitle: "未保存的更改", unsavedChangesBody: "离开此页面前，请选择如何处理您的更改。", continueEditing: "继续编辑", saveDraftAndLeave: "保存草稿并离开", discardAndLeave: "放弃更改并离开", missingSupabaseEnv: "缺少 Supabase 环境变量。", authenticationRequired: "请登录后编辑此房源。", staleConflict: "您编辑期间房源已发生变化。请刷新页面后重试。", invalidVehicleFields: "请检查车辆字段；只有纯电动车可以不填写发动机排量。",
  saveProgress: "正在保存更改。", saveSuccess: "更改已保存。该房源仍被拒绝并保持隐藏。", resubmitProgress: "正在将房源重新提交审核。", resubmitSuccess: "更改已保存。房源正在等待审核，在获批前保持隐藏。", resubmitFailure: "无法将房源提交审核，请重试。", saveButton: "保存更改", savingButton: "正在保存", resubmitButton: "保存并提交审核", resubmittingButton: "正在提交", rejectionReasonHeading: "拒绝原因",
  mediaPreserved: "现有照片、排序和封面照片将保持不变。此编辑流程暂不支持编辑照片。", existingPhotoAlt: "现有房源照片", existingCoverPhoto: "现有封面照片", existingPhoto: "现有照片", electricDisplacement: "纯电动车的发动机排量必须留空。", combustionDisplacement: "汽油、柴油、LPG 和混合动力车辆必须填写发动机排量。", profileIncomplete: "请完善卖家信息。", modelsLoadFailure: "无法加载车型，请重试。", profileSaveFailure: "无法保存卖家信息，请重试。", tooManyPhotos: "最多可上传 15 张照片。", invalidPhoto: "无法上传照片。请选择不超过 10 MB 的 JPEG、PNG 或 WebP 文件。", optimizingImages: "正在优化图片", photoReady: "照片已就绪", photoProcessingFailed: "照片处理失败", photoProcessingFallback: "无法处理照片。请删除后重新上传。",
  completeProfileBeforePublish: "发布房源前请完善卖家资料。", acceptRules: "请接受房源发布规则以继续。", checkingSeller: "正在检查卖家信息。", creatingVehicleProfile: "正在创建车辆档案。", vehicleSaveFailure: "无法保存车辆信息，请重试。", verifyingOwnership: "正在验证车辆所有权。", ownershipSaveFailure: "无法保存车辆所有权信息，请重试。", creatingDraft: "正在创建房源草稿。", draftCreateFailure: "无法创建房源草稿，请重试。", photosUploading: (current, total) => `正在上传照片 (${current}/${total})。`, photosUploadingShort: "正在上传照片", photoProtecting: "正在安全处理照片", photoProtected: (count) => count > 1 ? "可见车牌已自动模糊处理以保护隐私。" : "可见车牌已自动模糊处理以保护隐私。", uploading: "正在上传", photoUploadFailure: "无法上传照片，请重试。", photoSaveFailure: "无法保存照片，请重试。", submittingForModeration: "正在将房源提交审核。", submitFailure: "无法将房源提交审核，请重试。", checkingSession: "正在检查会话",
  completeProfileTitle: "完善卖家资料", completeProfileBody: "仅填写发布房源所需的卖家信息。您的电话号码不会向访客公开显示。", continue: "继续", back: "返回", next: "下一步", sellerInformation: "卖家信息", sellerInformationHelp: "这些信息用于房源管理和安全沟通。您的电话号码不会在房源卡片中公开显示。", dealerVerificationHelp: "经销商访问仅限受邀；验证状态仅在平台审核后授予。", saveInformation: "保存信息", finalReviewHelp: "最后一步会再次检查您的信息。",
  vehicleInformation: "车辆信息", make: "品牌", selectMake: "选择品牌", model: "车型", catalogOther: "其他", selectModel: "选择车型", modelsLoading: "正在加载车型", year: "年份", condition: "车况", missingCatalogHelp: "您可以向客服报告缺失的品牌或车型。", equipmentAndDescription: "配置与描述", mileage: "里程", fuelType: "燃料类型", transmission: "变速箱", bodyType: "车身类型", selectBodyType: "选择车身类型", driveType: "驱动方式", selectDriveType: "选择驱动方式", color: "颜色", engineDisplacement: "发动机排量", damageState: "损伤状况", ownerCount: "车主数量", damageDisclaimer: "损伤信息由卖家提供；Jolmod 不声明已核实该信息。",
  description: "描述", aiDescriptionSoon: "使用 AI 编写描述 · 即将推出", descriptionPlaceholder: "示例：车辆定期保养，内外状况良好。已知损伤和更换部件已在描述中说明。您也可以简要介绍配置和出售原因。", descriptionPrompts: ["车辆整体状况", "保养历史", "已知损伤或更换部件", "配置和附件", "出售原因", "是否考虑置换"], photos: "照片", photoGuide: "拍照指南", addPhoto: "添加照片", photoRequirements: "请使用 JPEG、PNG 或 WebP。图片会优化为大图、卡片图和缩略图。每张照片最大为 10 MB。", photoCount: (count, max) => `${count}/${max} 张照片。`, listingPhotoAlt: "房源照片", coverPhoto: "封面照片", makeCover: "设为封面", remove: "删除", tryAgain: "重试",
  priceAndLocation: "价格和地点", fillFromPlate: "通过车牌/VIN 填写", automaticFillSoon: "自动填写车辆信息即将推出。", comingSoon: "即将推出", price: "价格", currency: "货币", city: "城市", selectCity: "选择城市", requiredCity: "请选择城市。", negotiable: "可议价", previewAndPublish: "预览并发布房源", listingPreviewAlt: "房源预览", listingTitleFallback: "房源标题", noSellerDescription: "卖家尚未添加描述。", agreementPrefix: "发布此房源即表示您接受", terms: "使用条款", agreementMiddle: "和", listingRules: "房源发布规则", agreementSuffix: "。", publishing: "正在发布房源", publish: "发布房源",
  quality: "房源质量", qualityVeryGood: "很好", qualityGood: "良好", qualityIncomplete: "不完整", complete: "已完成", incomplete: "未完成", qualityDisclaimer: "该评分衡量房源信息完整度；它不验证车辆，也不构成信任报告。", qualityItems: ["卖家信息", "车辆信息", "已填写价格", "已选择城市", "已添加描述", "照片（可选）", "封面照片（可选）", "已说明损伤信息"], successTitle: "房源已接收", successBody: "您的房源正在等待审核，在获批前将保持隐藏。", viewListing: "查看我的房源", myListings: "我的房源", backHome: "返回首页", createNew: "再创建一个房源",
  sellerContactTitle: "已验证的卖家联系方式", sellerContactLabel: "联系电话", sellerContactMissing: "创建房源前请添加并验证联系电话。", sellerContactManage: "管理电话号码", sellerContactAccount: "账户电话", sellerContactRequired: "创建房源前请选择已验证的卖家联系电话。", listingContactTitle: "房源联系电话", listingContactHelp: "请选择买家联系您时使用的已验证号码。", listingContactUnavailable: "没有可用的已验证联系方式。", listingContactLabel: "联系电话", keepCurrentContact: "保留当前选择", existingContact: "当前联系电话", existingContactHelp: "此房源当前使用现有联系电话。", contactUpdateFailure: "房源更改已保存，但无法更新联系电话。请再次尝试更新。", sellerType: "卖家类型", sellerTypeVerification: "经销商状态将在验证后授予。", phone: "电话", verifiedPhone: "已通过登录时使用的电话验证。", authorizedPersonName: "授权联系人姓名", yourName: "您的姓名", dealerName: "经销商名称", displayName: "显示名称", selectSellerType: "选择卖家类型。", missingPhone: "缺少电话号码，请重新登录。", enterAuthorizedPerson: "请输入授权联系人姓名。", enterYourName: "请输入您的姓名。", enterDealerName: "请输入经销商名称。", enterDisplayName: "请输入显示名称。", requiredVehicleIdentity: "请填写品牌、车型和年份。", invalidYear: "请输入有效年份。", usedMileageRequired: "请填写二手车的里程。", invalidMileage: "请输入有效里程。", invalidPrice: "请输入有效价格。", variantLabels: { original: "原始图片", large: "大图", card: "卡片图片", thumb: "缩略图" }
};

const sellCopies: Record<Locale, SellCopy> = { tr, en };

export function getSellCopy(locale?: string | null): SellCopy {
  if (locale?.toLowerCase().replace("_", "-").startsWith("ru")) return ru;
  if (locale?.toLowerCase().replace("_", "-").startsWith("kk")) return kk;
  if (locale?.toLowerCase().replace("_", "-").toLowerCase() === "zh-cn" || locale?.toLowerCase() === "zh") return zhCN;
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

