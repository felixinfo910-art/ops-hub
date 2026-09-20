import { prisma } from '@/lib/prisma'
import FormDetailClient from './FormDetailClient'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function FormDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const formId = parseInt(id, 10)
  if (isNaN(formId)) notFound()

  const form = await prisma.form.findUnique({
    where: { id: formId },
    include: { 
      company: { select: { id: true, name: true } },
      website: { select: { id: true, name: true, domain: true } },
      _count: { select: { submissions: true } }
    },
  })

  if (!form) notFound()

  return <FormDetailClient initialForm={JSON.parse(JSON.stringify(form))} />
}
