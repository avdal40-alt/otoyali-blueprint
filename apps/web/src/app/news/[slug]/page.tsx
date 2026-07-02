import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { formatDate } from "@/lib/format";
import { getArticle } from "@/data/news";

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const article = getArticle(params.slug);

  if (!article) {
    notFound();
  }

  return (
    <>
      <AppHeader />
      <PageContainer className="max-w-4xl">
        <Badge>{article.category}</Badge>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-oto-text">{article.title}</h1>
        <p className="mt-3 text-sm font-semibold text-oto-muted">{formatDate(article.publishedAt)} - OTOYALI</p>
        <div className="mt-6 aspect-[16/9] overflow-hidden rounded-oto bg-oto-surface">
          <img src={article.imageUrl} alt={article.title} className="h-full w-full object-cover" />
        </div>
        <article className="mt-8 space-y-5 text-base leading-8 text-oto-muted">
          {article.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </article>
        <ButtonLink href="/search" className="mt-8">
          Piyasadaki ilanlara bak
        </ButtonLink>
      </PageContainer>
    </>
  );
}
