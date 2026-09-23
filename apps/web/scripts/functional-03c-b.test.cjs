const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,".."),read=(...p)=>fs.readFileSync(path.join(root,...p),"utf8");
const client=read("src","app","profile","listings","_components","MyListingsClient.tsx"),intent=read("src","app","api","listings","[id]","video","upload-intent","route.ts"),finalize=read("src","app","api","listings","[id]","video","finalize","route.ts"),remove=read("src","app","api","listings","[id]","video","remove","route.ts"),player=read("src","app","video","_components","PublicVideoPlayer.tsx");
assert.match(intent,/requireAuthenticatedRequest/);assert.match(intent,/issue_own_listing_video_upload_intent/);assert.match(intent,/createSignedUploadUrl/);assert.doesNotMatch(intent,/seller_user_id|owner_user_id|object_path.*body/);
assert.match(finalize,/finalize_own_listing_video_upload_intent/);assert.match(finalize,/replace_own_listing_video_upload_intent/);assert.match(finalize,/revoke_own_listing_video_upload_intent/);assert.doesNotMatch(finalize,/p_storage_path/);
assert.match(remove,/remove_own_listing_video/);assert.match(remove,/storage\.from\("listing-videos"\)\.remove/);
assert.match(client,/uploadToSignedUrl/);assert.match(client,/video\/upload-intent/);assert.match(client,/video\/finalize/);assert.doesNotMatch(client,/\.from\("listing_videos"\)\s*\.insert/);assert.doesNotMatch(client,/releaseStoragePath\(userId, item\.id/);
assert.match(player,/onError/);assert.match(player,/playsInline/);assert.match(player,/preload="none"/);assert.doesNotMatch(player,/autoplay/i);
console.log("FUNCTIONAL-03C-B controlled video orchestration contract passed");
