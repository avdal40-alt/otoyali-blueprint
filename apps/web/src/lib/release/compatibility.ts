export const YOLMOD_RELEASE = "2026082801";
export const YOLMOD_RELEASE_HEADER = "x-yolmod-release";
export const YOLMOD_STORAGE_RELEASE_SEGMENT = `prod04a-${YOLMOD_RELEASE}`;

export function releaseHeaders() {
  return {
    [YOLMOD_RELEASE_HEADER]: YOLMOD_RELEASE
  };
}

export function releaseStoragePath(userId: string, ...segments: string[]) {
  return [userId, YOLMOD_STORAGE_RELEASE_SEGMENT, ...segments].join("/");
}
