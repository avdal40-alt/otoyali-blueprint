import type { Dictionary } from "../types";

export const en = {
  common: {
    appName: "OTOYALI",
    continue: "Continue",
    cancel: "Cancel",
    save: "Save",
    loading: "Loading",
    back: "Back",
    close: "Close",
    search: "Search",
    reset: "Reset",
    clear: "Clear",
    showAll: "View all",
    publishListing: "Publish listing",
    comingSoon: "Coming soon",
    noInfo: "No information",
    locationUnknown: "Location not specified",
    priceNotProvided: "Price not provided",
    language: "Language",
    turkish: "Türkçe",
    english: "English"
  },
  navigation: {
    buyVehicle: "Buy a vehicle",
    vehicles: "Vehicles",
    newCars: "New cars",
    usedCars: "Used cars",
    video: "Video",
    categories: "Categories",
    favorites: "Favorites",
    profile: "Profile",
    notifications: "Notifications",
    parts: "Spare parts",
    services: "Services",
    insurance: "Insurance",
    myListings: "My listings",
    settings: "Settings",
    admin: "Admin"
  },
  footer: {
    description: "An AI-first transport ecosystem for vehicle search, listing discovery, automotive content, and publishing in one place.",
    about: "About",
    trustCenter: "Trust Center",
    contact: "Contact",
    marketplace: "Marketplace",
    buyVehicle: "Buy a vehicle",
    sell: "Publish listing",
    listingRules: "Listing Rules",
    policies: "Policies",
    terms: "Terms of Use",
    privacy: "Privacy Policy",
    cookies: "Cookie Policy",
    moderation: "Moderation Policy",
    content: "Content",
    news: "News",
    mobileApp: "Mobile app"
  },
  home: {
    eyebrow: "OTOYALI",
    title: "Turkey's intelligent vehicle marketplace",
    subtitle: "Cars, commercial vehicles, marine vehicles, spare parts, insurance, and vehicle videos in one platform.",
    popularBrands: "Popular brands",
    explore: "Explore",
    featuredListings: "Featured listings",
    recommendations: "Recommended",
    latestListings: "Latest listings",
    marketplace: "Marketplace",
    newsTitle: "Automotive news",
    newsEyebrow: "Highlights",
    noActiveListingsTitle: "No active listings",
    noActiveListingsBody: "New listings will appear here when they are added.",
    hotEyebrow: "Showcase",
    hotTitle: "Featured listings",
    hotSubtitle: "Discover standout vehicles quickly and save the listings you do not want to miss.",
    hotEmptyTitle: "No featured listings yet",
    hotEmptyBody: "This area will fill automatically when active listings are available.",
    popularCities: "Popular cities",
    turkey: "Turkey",
    allListings: "All listings",
    cityListings: "{city} vehicle listings",
    popularSearches: "Popular searches",
    discoverFast: "Discover vehicles faster",
    ecosystem: "OTOYALI ecosystem",
    trustEyebrow: "Safer experience",
    trustTitle: "A simple and trustworthy place for vehicle decisions.",
    trustBody: "OTOYALI keeps vehicle search and comparison clear, direct, and free from unnecessary barriers.",
    appEyebrow: "Mobile app",
    appTitle: "Download the OTOYALI app soon",
    appBody: "Track listings, save favorites, and manage your vehicle on mobile with ease.",
    appStoreSoon: "App Store - Coming soon",
    googlePlaySoon: "Google Play - Coming soon"
  },
  search: {
    title: "Search vehicles",
    eyebrow: "Marketplace",
    resultsCount: "{count} listings found",
    advanced: "Advanced",
    advancedFilters: "Advanced filters",
    saveSearch: "Save search",
    brand: "Brand",
    model: "Model",
    city: "City",
    allBrands: "All brands",
    allModels: "All models",
    allCities: "All cities",
    priceMin: "Min price",
    priceMax: "Max price",
    yearMin: "Min year",
    yearMax: "Max year",
    mileageMax: "Max mileage",
    fuelType: "Fuel type",
    allFuelTypes: "All fuel types",
    transmission: "Transmission",
    allTransmissions: "All transmissions",
    bodyType: "Body type",
    allBodyTypes: "All body types",
    driveType: "Drivetrain",
    allDriveTypes: "All drivetrains",
    color: "Color",
    allColors: "All colors",
    condition: "Condition",
    sellerType: "Seller type",
    allSellerTypes: "All",
    trade: "Trade-in",
    withPhotos: "Listings with photos",
    sort: "Sort",
    newest: "Newest",
    priceAsc: "Lowest price first",
    priceDesc: "Highest price first",
    yearDesc: "Newest model year",
    mileageAsc: "Lowest mileage first",
    noResultsTitle: "No listings found",
    noResultsBody: "Try changing the filters and searching again."
  },
  listing: {
    details: "Listing details",
    vehicleSpecs: "Vehicle specifications",
    make: "Make",
    model: "Model",
    year: "Year",
    mileage: "Mileage",
    fuel: "Fuel",
    transmission: "Transmission",
    bodyType: "Body type",
    driveType: "Drivetrain",
    color: "Color",
    engineVolume: "Engine volume",
    damageState: "Damage status",
    ownerCount: "Owner count",
    city: "City",
    publishedAt: "Published",
    negotiable: "Negotiable",
    videos: "Vehicle videos",
    videoDescription: "Watch the seller's short vehicle introductions in OTOYALI Video.",
    watchVideo: "Watch in Video",
    openVideo: "Open video",
    description: "Description",
    noDescription: "The seller has not added a description.",
    similarListings: "Similar listings",
    similarEmpty: "Similar listings will appear here as active inventory grows.",
    seller: "Seller",
    defaultSeller: "OTOYALI seller",
    sellerLoginCopy: "Log in to contact the seller securely.",
    contactSeller: "Contact seller",
    messageSoon: "Message · Coming soon",
    message: "Message",
    share: "Share",
    safetyCopy: "OTOYALI helps make vehicle buying and selling safer and easier.",
    listingRules: "Review listing rules",
    safeShopping: "Safe shopping tips",
    reportListing: "Report listing"
  },
  sell: {
    title: "Publish listing",
    eyebrow: "Sell",
    agreementPrefix: "By publishing a listing, you agree to share accurate and up-to-date information under the",
    agreementMiddle: "and",
    agreementSuffix: ".",
    listingRules: "Listing Rules",
    terms: "Terms of Use"
  },
  profile: {
    title: "Profile",
    account: "Account",
    loginRequiredTitle: "Log in to view your profile",
    loginRequiredBody: "You need to log in to edit your profile and manage your listings."
  },
  favorites: {
    title: "Favorites",
    eyebrow: "Account",
    emptyTitle: "No favorite listings yet",
    emptyBody: "Save vehicles you like and access them quickly here."
  },
  myListings: {
    title: "My listings",
    eyebrow: "Account",
    emptyTitle: "You have no listings yet",
    emptyBody: "Add your vehicle details to create your first listing."
  },
  auth: {
    loginTitle: "Log in with your phone number",
    loginBody: "We will send you a one-time verification code.",
    phoneHint: "Use a Turkish mobile phone format: +90 5xx xxx xx xx.",
    sendCode: "Send code",
    sending: "Sending",
    verifyTitle: "Verification code",
    verifyBody: "Enter the 6-digit code sent to {phone}.",
    verifyCode: "Log in",
    verifying: "Verifying",
    resendCode: "Resend code",
    loginRequired: "Login required"
  },
  video: {
    label: "Video Listings",
    title: "OTOYALI Video",
    subtitle: "Vehicle videos, dealer opportunities, and short showcases.",
    body: "Sellers can introduce their vehicles with short videos up to 60 seconds.",
    discover: "Explore videos",
    vehicleVideo: "Vehicle video",
    dealerDeals: "Dealer opportunities",
    shortPromos: "Short showcases",
    vehicleVideoBody: "Discover short introduction details before viewing the listing.",
    dealerDealsBody: "Browse standout vehicles from dealers quickly.",
    shortPromosBody: "Vehicle videos prepared by sellers, up to 60 seconds.",
    approvedVideos: "Approved short videos are shown here.",
    moderationCopy: "Seller videos are reviewed before publication.",
    performanceCopy: "Home and search cards do not load video files; they only show a Video badge.",
    emptyTitle: "No videos yet.",
    emptyBody: "Short vehicle videos from sellers will appear here soon.",
    seeListing: "View listing",
    browseListings: "Browse listings",
    login: "Log in",
    contentProvided: "Video content is provided by the seller."
  },
  services: {
    seo: {
      title: "Services",
      description: "The OTOYALI service network is being prepared for inspection, maintenance, repair, and vehicle services."
    },
    hero: {
      badge: "Service marketplace",
      title: "OTOYALI service network",
      subtitle: "A trusted discovery layer is being prepared for inspection, maintenance, repair, tires, EV service, towing, and other vehicle services."
    },
    discoveryEyebrow: "Discovery",
    categoriesTitle: "Service categories",
    specializationsEyebrow: "Vehicle and need type",
    specializationsTitle: "Prepared specializations",
    filters: {
      clearCategory: "All services"
    },
    providers: {
      eyebrow: "Approved providers",
      title: "Service providers",
      summaryFallback: "This provider has not added a public summary yet.",
      branchCount: "{count} branch"
    },
    empty: {
      title: "The OTOYALI service network is being prepared.",
      body: "Approved providers will appear here as they are added. For now, you can review the category structure or apply to join the network."
    },
    currentAvailability: {
      badge: "Current state",
      title: "No booking or price guarantee",
      body: "SERVICE-01 prepares only the service marketplace foundation. Real bookings, availability, work orders, payments, guaranteed prices, and reviews are not enabled at this stage."
    },
    joinNetwork: {
      cta: "Join the service network"
    },
    trust: {
      cta: "Trust Center"
    },
    rif: {
      badge: "Rif ready",
      title: "Rif can provide general service guidance",
      body: "Rif can explain maintenance, inspection, and safer service decisions. It does not create bookings, invent prices, or recommend providers that do not exist.",
      cta: "Ask Rif"
    },
    contact: {
      requestSoon: "Service request coming soon"
    },
    provider: {
      notFoundTitle: "Service provider not found",
      notFoundDescription: "This service provider is not published or does not exist.",
      seoDescriptionFallback: "Approved service provider profile on OTOYALI.",
      publicProfile: "Service profile",
      platformReviewed: "Platform reviewed",
      branchesTitle: "Branches and services",
      trustDisclaimer: "This profile shows only published public provider information. OTOYALI does not guarantee bookings, prices, working hours, or service outcomes at this stage."
    },
    offerings: {
      empty: "No active public service offerings have been added for this branch yet."
    },
    status: {
      activeProvider: "Active provider",
      activeBranch: "Active branch",
      pendingReview: "Pending review",
      temporarilyClosed: "Temporarily closed",
      unavailable: "Unavailable",
      suspended: "Suspended",
      rejected: "Rejected",
      archived: "Archived"
    },
    pricing: {
      quoteRequired: "Price by quote",
      startingFrom: "Starting from {price}",
      unavailable: "No price information"
    },
    duration: {
      notProvided: "No duration provided",
      minutes: "{minutes} min",
      rangeMinutes: "{min}-{max} min"
    },
    booking: {
      requestOnly: "Ready for request model",
      instantFuture: "Instant booking is a future stage",
      contactProvider: "Contact provider",
      unavailable: "No booking"
    },
    apply: {
      seoTitle: "Service network application",
      seoDescription: "Apply to join the OTOYALI service marketplace network.",
      badge: "Provider application",
      title: "Join our service network",
      subtitle: "Submitting an application does not publish a provider profile automatically. OTOYALI will review the information before future approved providers go live.",
      truthfulTitle: "No automatic publishing",
      truthfulBody: "The application only enters a review queue; no public profile is created without admin approval.",
      reviewTitle: "Moderation ready",
      reviewBody: "Provider, branch, and offering states are designed to be managed through admin review.",
      noBookingTitle: "No bookings",
      noBookingBody: "This stage does not create calendars, availability, work orders, or payments.",
      progressiveAuthBadge: "Phone login required",
      loginTitle: "Log in to submit an application.",
      loginBody: "Service applications contain contact details, so they are accepted after secure phone login.",
      loginCta: "Log in with phone",
      backToServices: "Back to services",
      pendingBadge: "Pending review",
      successTitle: "Your application entered the review queue.",
      successBody: "This does not mean the provider is published. The OTOYALI team will review the information and proceed with suitable candidates.",
      submit: "Submit application",
      reviewNote: "Submissions are stored as pending-review applications.",
      categoryHelper: "Select the main service types you currently provide.",
      verticalHelper: "Select the vehicle types you support.",
      notesHelper: "Briefly describe your specializations, equipment, or city coverage.",
      fields: {
        businessName: "Business name",
        contactPersonName: "Contact person",
        contactPhone: "Phone",
        city: "City",
        district: "District",
        websiteUrl: "Website",
        categories: "Service categories",
        supportedVerticals: "Supported vehicle types",
        notes: "Notes",
        consentAccuracy: "I confirm the submitted information is accurate."
      },
      verticals: {
        cars: "Cars",
        commercial: "Commercial vehicles",
        motorcycles: "Motorcycles",
        marine: "Marine vehicles"
      }
    },
    validation: {
      businessNameRequired: "Enter the business name.",
      contactNameRequired: "Enter the contact person name.",
      phoneInvalid: "Check the phone number.",
      cityRequired: "Enter the city.",
      categoryRequired: "Select at least one service category.",
      verticalRequired: "Select at least one vehicle type.",
      websiteInvalid: "Enter a valid secure website.",
      consentRequired: "Accuracy confirmation is required.",
      tooLong: "This field is too long."
    },
    categories: {
      periodic_maintenance: { label: "Scheduled maintenance", description: "Oil, filter, and regular maintenance checks." },
      diagnostics: { label: "Diagnostics", description: "Electronic and mechanical fault diagnosis." },
      engine_repair: { label: "Engine repair", description: "Engine performance, mechanical repair, and overhaul needs." },
      transmission: { label: "Transmission", description: "Automatic and manual transmission services." },
      brakes: { label: "Brakes", description: "Brake pads, discs, and safety checks." },
      suspension: { label: "Suspension", description: "Shock absorbers, alignment, balance, and running gear." },
      electrical: { label: "Electrical", description: "Vehicle electronics, lighting, and electrical faults." },
      air_conditioning: { label: "Air conditioning", description: "AC maintenance, gas filling, and fault checks." },
      tires: { label: "Tires", description: "Tire replacement, balancing, and seasonal tire services." },
      battery: { label: "Battery", description: "Battery checks, replacement, and charging systems." },
      oil_change: { label: "Oil change", description: "Engine oil and filter replacement." },
      body_repair: { label: "Body repair", description: "Body repair and panel correction." },
      paint: { label: "Paint", description: "Paint, touch-up, and surface renewal services." },
      glass: { label: "Glass", description: "Glass repair and replacement services." },
      detailing: { label: "Detailing", description: "Interior/exterior detailing, paint protection, and care." },
      car_wash: { label: "Car wash", description: "Basic wash and cleaning services." },
      inspection: { label: "Inspection", description: "Pre-purchase vehicle checks and reporting." },
      towing: { label: "Towing", description: "Roadside assistance and towing services." },
      ev_service: { label: "EV service", description: "Electric vehicle maintenance and electrical-system expertise." },
      marine_service: { label: "Marine service", description: "Boat and marine-engine service needs." },
      commercial_vehicle_service: { label: "Commercial vehicle service", description: "Van, truck, and fleet-oriented service needs." },
      motorcycle_service: { label: "Motorcycle service", description: "Motorcycle maintenance and repair services." },
      other: { label: "Other services", description: "Other specialized vehicle services." }
    },
    specializations: {
      passenger_cars: { label: "Cars", description: "Passenger-car focused maintenance and service." },
      commercial_vehicles: { label: "Commercial", description: "Commercial vehicle and fleet needs." },
      motorcycles: { label: "Motorcycles", description: "Motorcycle maintenance and repair." },
      marine: { label: "Marine", description: "Service preparation for marine vehicles." },
      electric_vehicles: { label: "Electric", description: "Electric vehicle service expertise." },
      hybrid_vehicles: { label: "Hybrid", description: "Service for hybrid systems." },
      body_repair: { label: "Body/paint", description: "Body, paint, and glass work." },
      tires: { label: "Tires", description: "Tire and road-grip services." },
      detailing: { label: "Detailing", description: "Protection and cleaning-focused services." },
      roadside_towing: { label: "Roadside", description: "Towing and emergency coverage." }
    },
    admin: {
      nav: "Services",
      title: "Service applications",
      empty: "No pending service applications.",
      approve: "Approve",
      review: "Reviewing",
      reject: "Reject",
      archive: "Archive",
      approvedNote: "Application approved; a public provider profile must be created through a separate admin step."
    }
  },
  admin: {
    title: "Admin",
    accessRequiredTitle: "Log in to access the admin panel.",
    accessRequiredBody: "This area is only for authorized OTOYALI team members.",
    login: "Log in",
    listings: "Listings",
    videos: "Videos",
    services: "Services",
    reports: "Reports",
    users: "Users",
    settings: "Settings"
  },
  legal: {
    note: "Note",
    disclaimer: "This page contains general information prepared for the MVP stage. It should be updated with professional legal review before public launch.",
    terms: "Terms of Use",
    privacy: "Privacy Policy",
    cookies: "Cookie Policy",
    moderation: "Moderation Policy",
    listingRules: "Listing Rules",
    trust: "Trust Center"
  },
  trust: {
    title: "Trust Center",
    reportSoon: "OTOYALI trust report is coming soon",
    provisional: "Trust and legal information is provisional during the MVP stage."
  },
  errors: {
    generic: "We could not complete the action. Please try again.",
    smsUnavailable: "SMS login is not configured right now. Please try again later.",
    invalidOtp: "The code could not be verified. Please try again.",
    missingSession: "No session was found. Please log in again.",
    missingSupabaseEnv: "Supabase environment variables are missing."
  },
  validation: {
    phoneInvalid: "Please check the phone number.",
    required: "This field is required.",
    minLength: "Please enter more characters."
  },
  status: {
    draft: "Draft",
    pending: "Pending",
    pendingReview: "Pending review",
    active: "Active",
    rejected: "Rejected",
    archived: "Archived",
    featured: "Featured",
    gallery: "Dealer",
    new: "New",
    used: "Used",
    private: "Individual seller",
    individual: "Individual seller",
    dealer: "Dealer",
    corporate: "Dealer",
    automatic: "Automatic",
    manual: "Manual",
    semiAutomatic: "Semi-automatic",
    gasoline: "Petrol",
    diesel: "Diesel",
    lpg: "LPG",
    electric: "Electric",
    hybrid: "Hybrid",
    other: "Other"
  },
  seo: {
    defaultTitle: "OTOYALI - Turkey's intelligent vehicle marketplace",
    defaultDescription: "Cars, commercial vehicles, marine vehicles, spare parts, insurance, and vehicle videos in one platform.",
    homeTitle: "Turkey's intelligent vehicle marketplace",
    homeDescription: "Vehicle listings, OTOYALI Video, safe publishing, and automotive content in one platform.",
    searchTitle: "Search vehicles",
    searchDescription: "Search active vehicle listings in Turkey by brand, model, city, price, and specifications.",
    videoTitle: "OTOYALI Video",
    videoDescription: "Vehicle videos, dealer opportunities, and short showcases."
  },
  verticals: {
    status: {
      active: "Active",
      preview: "Preview",
      coming_soon: "Coming soon",
      disabled: "Disabled"
    },
    capabilities: {
      available: "Available",
      comingSoon: "Coming soon",
      browse: "Browse listings",
      search: "Search",
      publish: "Publishing",
      learnMore: "Learn more",
      uploadVideo: "Video upload",
      supportsAttributes: "Attribute model"
    },
    landing: {
      browseCars: "Browse car listings",
      publishCars: "Publish a car listing",
      publishUnavailable: "Publishing is not open for this category yet. OTOYALI is preparing it with a separate data model and moderation rules.",
      activeDisclaimer: "This category runs on the current marketplace infrastructure. Public visibility requires an active listing and active moderation.",
      availableFeatures: "Prepared scope",
      attributeModel: "Future attribute model",
      filterReady: "Can become a search filter.",
      publishOnly: "Validated in the publishing flow.",
      related: "Related categories"
    },
    cars: {
      label: "Cars",
      shortLabel: "Cars",
      description: "Search used and new car listings, compare options, and contact sellers securely.",
      shortDescription: "Used and new vehicle listings.",
      seoTitle: "Car Listings",
      seoDescription: "Search car listings on OTOYALI by make, model, city, price, and specifications.",
      highlights: {
        search: "Advanced search",
        publish: "Listing publishing",
        video: "Vehicle video"
      }
    },
    commercial: {
      label: "Commercial vehicles",
      shortLabel: "Commercial",
      description: "A future marketplace area for vans, trucks, minibuses, buses, tractors, and work machines with a dedicated data model.",
      shortDescription: "Vans, trucks, minibuses, and work machines.",
      seoTitle: "Commercial Vehicles",
      seoDescription: "OTOYALI is preparing a commercial vehicles area for vans, trucks, minibuses, buses, and work machines.",
      highlights: {
        lightCommercial: "Light commercial",
        trucks: "Trucks and tractors",
        machinery: "Work machines"
      }
    },
    marine: {
      label: "Marine vehicles",
      shortLabel: "Marine",
      description: "A marine-focused marketplace area for boats, yachts, jet skis, and marine engines with dedicated fields and media.",
      shortDescription: "Boats, yachts, jet skis, and marine engines.",
      seoTitle: "Marine Vehicles",
      seoDescription: "OTOYALI is preparing a marine vehicles area for boats, yachts, jet skis, and marine engines.",
      highlights: {
        boats: "Boats",
        yachts: "Yachts",
        engines: "Marine engines"
      }
    },
    parts: {
      label: "Spare parts",
      shortLabel: "Parts",
      description: "A compatibility-focused marketplace area for tires, wheels, accessories, care products, and vehicle parts.",
      shortDescription: "Parts, accessories, tires, and wheels.",
      seoTitle: "Spare Parts",
      seoDescription: "OTOYALI is preparing a spare parts area for tires, wheels, accessories, care products, and vehicle parts.",
      highlights: {
        tires: "Tires and wheels",
        body: "Body parts",
        electronics: "Electronics"
      }
    },
    services: {
      label: "Services",
      shortLabel: "Services",
      description: "A provider-focused category for inspection, maintenance, repair, tire changes, and EV service options.",
      shortDescription: "Inspection, maintenance, and vehicle services.",
      seoTitle: "Services",
      seoDescription: "OTOYALI is preparing a services area for inspection, maintenance, repair, and vehicle services.",
      highlights: {
        inspection: "Inspection",
        maintenance: "Scheduled maintenance",
        evService: "EV service"
      }
    },
    insurance: {
      label: "Insurance",
      shortLabel: "Insurance",
      description: "A future safe comparison experience for traffic insurance, casco, and claim-history related decisions.",
      shortDescription: "Traffic insurance and casco solutions.",
      seoTitle: "Insurance",
      seoDescription: "OTOYALI is preparing an insurance area for traffic insurance, casco, and claim-history related solutions.",
      highlights: {
        traffic: "Traffic insurance",
        casco: "Casco",
        claims: "Claim history"
      }
    },
    motorcycles: {
      label: "Motorcycles",
      shortLabel: "Motorcycles",
      description: "Reserved future motorcycle marketplace area.",
      shortDescription: "Reserved future area for motorcycle listings.",
      seoTitle: "Motorcycles",
      seoDescription: "OTOYALI motorcycle marketplace is reserved for a future stage."
    },
    machinery: {
      label: "Construction and agricultural machinery",
      shortLabel: "Machinery",
      description: "Reserved future machinery marketplace area.",
      shortDescription: "Reserved future area for machinery listings.",
      seoTitle: "Construction and Agricultural Machinery",
      seoDescription: "OTOYALI machinery marketplace is reserved for a future stage."
    },
    mobility: {
      label: "Mobility products",
      shortLabel: "Mobility",
      description: "Reserved future mobility products marketplace area.",
      shortDescription: "Reserved future area for mobility products.",
      seoTitle: "Mobility Products",
      seoDescription: "OTOYALI mobility products marketplace is reserved for a future stage."
    },
    attributes: {
      make: "Make",
      model: "Model",
      year: "Year",
      mileage: "Mileage",
      fuel: "Fuel",
      transmission: "Transmission",
      vehicleSubtype: "Vehicle subtype",
      payloadCapacity: "Payload capacity",
      axleCount: "Axle count",
      grossWeight: "Gross weight",
      cabinType: "Cabin type",
      vesselType: "Vessel type",
      length: "Length",
      engineType: "Engine type",
      hullMaterial: "Hull material",
      category: "Category",
      condition: "Condition",
      brand: "Brand",
      partOrigin: "OEM / aftermarket",
      compatibleVehicles: "Compatible vehicles",
      partNumber: "Part number",
      serviceCategory: "Service category",
      city: "City",
      mobileService: "Mobile service",
      appointmentSupport: "Appointment support",
      insuranceType: "Insurance type",
      coverageScope: "Coverage scope",
      engineVolume: "Engine volume",
      machineType: "Machine type",
      workingHours: "Working hours",
      productType: "Product type",
      range: "Range"
    }
  },
  ai: {
    title: "Rif",
    subtitle: "OTOYALI AI preview",
    launcher: "Rif",
    open: "Open Rif assistant",
    close: "Close",
    clear: "Clear conversation",
    send: "Send",
    loading: "Rif is preparing a response...",
    placeholder: "Ask Rif...",
    inputLabel: "Message to Rif",
    introMessage: "Rif is a safe preview for OTOYALI's future AI assistant. It currently provides only general deterministic guidance; it does not perform real valuation, accident-history checks, or seller verification.",
    disclaimer: "Rif provides guidance. Independently verify the vehicle, price, seller and documents.",
    openTrustCenter: "Trust Center",
    featureNotConnected: "Advanced AI features are not connected yet.",
    status: {
      localPreview: "Local preview",
      planned: "Planned",
      unavailable: "Unavailable"
    },
    actions: {
      openSearch: "Search listings",
      openCars: "Open car listings",
      openSell: "Publish a listing",
      openTrustCenter: "Open Trust Center",
      openServices: "Open services",
      joinServiceNetwork: "Join service network"
    },
    responses: {
      intro: "Rif currently runs as a safe local preview inside OTOYALI. I can provide general guidance for search filters, listing preparation, and safer marketplace behavior. Advanced AI, real valuation, accident-history lookup, TRAMER/VIN checks, and seller verification are not connected yet.",
      disabled: "Rif's advanced AI features are not enabled yet.",
      verticalComingSoon: "AI support for this vertical is still being prepared. For now I can help with active car listings and general safety guidance.",
      searchGuidance: "For better search results, start with make/model, city, budget, year and mileage range. Then narrow with fuel type, transmission and body type. This is guidance for using existing filters, not an automatic AI search result.",
      listingGuidance: "When reviewing a listing, look at photos, description, mileage, price, city and seller type together. Do not treat missing fields as verified.",
      listingGuidanceWithContext: "For this listing page, only the public information shown on screen should be considered. Rif cannot fill missing fields, know accident history, or guarantee that the price is fair.",
      publishingGuidance: "A stronger listing usually includes clear photos, accurate technical details, a plain description, realistic price, and honest damage/history disclosure. This is not automatic publication or a moderation decision.",
      trustGuidance: "For safer transactions, verify documents, seller details and vehicle information through independent sources. Do not send deposits to unknown people and consider an inspection or independent review.",
      serviceGuidance: "When choosing a service, first clarify the need: inspection, scheduled maintenance, diagnostics, tires, body repair, or EV service. OTOYALI does not create bookings, guarantee prices, or produce provider verification outcomes yet; I can only guide you to public service areas.",
      ownershipPlanned: "Ownership reminders and personalized maintenance guidance are planned, but they are not enabled in AI-01."
    },
    errors: {
      invalidRequest: "The request format is invalid.",
      malformedJson: "The request could not be read. Please try again.",
      payloadTooLarge: "The request is too large. Please send a shorter message.",
      emptyMessage: "Please write a short message.",
      messageTooLong: "Message is too long. Please shorten it.",
      conversationTooLong: "The conversation is too long. Please clear it and try again.",
      contextTooLarge: "The page context is too large. Please try again.",
      unsupportedLocale: "This language is not supported yet.",
      unsupportedIntent: "This request type is not supported yet.",
      invalidVertical: "This marketplace vertical is not supported yet."
    },
    suggestions: {
      home: {
        findVehicle: "How can I find the right vehicle?",
        usedCarChecks: "What should I check when buying a used car?",
        whatCanRifDo: "What can Rif help with?"
      },
      search: {
        filters: "Which filters should I use?"
      },
      listing: {
        review: "What should I review in this listing?"
      },
      sell: {
        betterListing: "How can I create a better listing?"
      },
      trust: {
        safety: "What should I check for a safer transaction?"
      },
      services: {
        category: "Which service category should I look at?",
        booking: "Can I book a service appointment?"
      }
    },
    capabilities: {
      assistant_chat: {
        label: "General guidance",
        description: "Local preview chat."
      },
      natural_language_search: {
        label: "Natural-language search",
        description: "Requires a future real AI provider."
      },
      listing_explanation: {
        label: "Listing explanation",
        description: "Future public listing guidance."
      },
      vehicle_comparison: {
        label: "Vehicle comparison",
        description: "Future comparison support."
      },
      price_interpretation: {
        label: "Price interpretation",
        description: "Future safe price interpretation."
      },
      listing_copy_improvement: {
        label: "Listing copy improvement",
        description: "Future seller writing support."
      },
      publishing_assistance: {
        label: "Listing checklist",
        description: "Deterministic publishing guidance."
      },
      trust_guidance: {
        label: "Trust guidance",
        description: "Static safer-marketplace guidance."
      },
      ownership_assistance: {
        label: "Ownership reminders",
        description: "Future maintenance and ownership support."
      }
    },
    intents: {
      general_help: { label: "General help", description: "Explains Rif's current scope." },
      search_vehicles: { label: "Vehicle search", description: "Guidance for using search filters." },
      compare_vehicles: { label: "Compare vehicles", description: "Future comparison intent." },
      explain_listing: { label: "Explain listing", description: "Safe listing review guidance." },
      interpret_price: { label: "Interpret price", description: "Future price interpretation intent." },
      improve_listing: { label: "Improve listing", description: "Future listing copy intent." },
      publishing_help: { label: "Publishing help", description: "Listing preparation checklist." },
      trust_and_safety: { label: "Trust and safety", description: "Safer transaction guidance." },
      ownership_guidance: { label: "Ownership", description: "Future ownership guidance." },
      unsupported: { label: "Unsupported", description: "This request is not supported yet." }
    }
  },
  futureVerticals: {
    comingSoon: "Coming soon",
    backHome: "Back to home",
    disclaimer: "This area is prepared for the future OTOYALI ecosystem. It does not currently provide active listings, offers, service bookings, or AI results.",
    commercialVehicles: "Commercial vehicles",
    marineVehicles: "Marine vehicles",
    spareParts: "Spare parts",
    insurance: "Insurance",
    services: "Services",
    aiAssistant: "OTOYALI AI Assistant"
  },
  format: {
    priceNotProvided: "Price not provided",
    noInfo: "No information",
    locationUnknown: "Location not specified"
  }
} satisfies Dictionary;
