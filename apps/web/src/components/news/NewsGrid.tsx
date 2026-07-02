import type { NewsArticle } from "@/data/news";
import { NewsCard } from "./NewsCard";

export function NewsGrid({ articles }: { articles: NewsArticle[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {articles.map((article) => (
        <NewsCard key={article.slug} article={article} />
      ))}
    </div>
  );
}
