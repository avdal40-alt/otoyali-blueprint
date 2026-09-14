// The canonical verification record and its evidence remain private to the
// database. Public consumers may use only this derived signal.
export type PublicGaleriVerificationSignal = {
  isVerifiedGaleri: boolean;
};

// FUNCTIONAL-02H must enforce this database predicate before any import work.
export const VERIFIED_GALERI_PREDICATE = "public.is_verified_galeri" as const;
