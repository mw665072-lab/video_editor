import { BlogDetailPage } from '@/components/blogs/BlogDetailPage'

export default async function BlogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <BlogDetailPage slug={slug} />
}
