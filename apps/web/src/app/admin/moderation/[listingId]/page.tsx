import { ModeratorDetail } from "../../_components/ModeratorReviewClient";
export const dynamic="force-dynamic"; export const revalidate=0;
export default async function ModerationDetailPage({params,searchParams}:{params:Promise<{listingId:string}>;searchParams:Promise<{runId?:string}>}){const {listingId}=await params;const {runId=""}=await searchParams;return <ModeratorDetail listingId={listingId} runId={runId}/>;}
