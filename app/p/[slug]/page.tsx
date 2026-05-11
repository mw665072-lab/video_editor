import { CmsPageView } from '@/components/cms/CmsPageView'

interface CmsPageRouteProps {
  params: Promise<{ slug: string }>
}

export default async function CmsDynamicPage({ params }: CmsPageRouteProps) {
  const { slug } = await params
  return <CmsPageView slug={slug} />
}
