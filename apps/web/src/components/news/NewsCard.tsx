import Link from "next/link";
import type { NewsArticle } from "@/data/news";
import { Badge } from "@/components/ui/Badge";
import { SafeImage } from "@/components/ui/SafeImage";
import { formatDate } from "@/lib/format";

export function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <article className="overflow-hidden rounded-oto border border-oto-border bg-white shadow-soft transition hover:shadow-oto">
      <Link href={`/news/${article.slug}`}>
        <div className="aspect-[16/9] bg-oto-surface">
          <SafeImage src={article.imageUrl} alt={article.title} />
        </div>
        <div className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Badge>{article.category}</Badge>
            <span className="text-xs font-semibold text-oto-muted">{formatDate(article.publishedAt)}</span>
          </div>
          <h3 className="line-clamp-2 text-lg font-bold text-oto-text">{article.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-oto-muted">{article.excerpt}</p>
        </div>
      </Link>
    </article>
  );
}
