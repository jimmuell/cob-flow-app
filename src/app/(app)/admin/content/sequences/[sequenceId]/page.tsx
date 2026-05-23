import { notFound } from 'next/navigation';
import { eq, asc } from 'drizzle-orm';
import { withCurrentSession } from '@/lib/db/client';
import { courseSequences, courses } from '@/lib/db/schema/content';
import { getCurrentUser } from '@/lib/auth/session';
import { isAdmin } from '@/lib/authority/roles';
import { SequenceDetailClient } from '@/features/content-manager/components/sequence-detail-client';

export default async function SequenceDetailPage({
  params,
}: {
  params: Promise<{ sequenceId: string }>;
}) {
  const { sequenceId } = await params;

  const [data, user] = await Promise.all([
    withCurrentSession(async (tx) => {
      const [seq] = await tx
        .select({
          id:          courseSequences.id,
          name:        courseSequences.name,
          slug:        courseSequences.slug,
          description: courseSequences.description,
          audience:    courseSequences.audience,
          status:      courseSequences.status,
          createdAt:   courseSequences.created_at,
          updatedAt:   courseSequences.updated_at,
        })
        .from(courseSequences)
        .where(eq(courseSequences.id, sequenceId));

      if (!seq) return null;

      const courseRows = await tx
        .select({
          id:            courses.id,
          title:         courses.title,
          status:        courses.status,
          sequenceOrder: courses.sequence_order,
        })
        .from(courses)
        .where(eq(courses.sequence_id, sequenceId))
        .orderBy(asc(courses.sequence_order));

      return { seq, courseRows };
    }),
    getCurrentUser(),
  ]);

  if (!data) notFound();

  const { seq, courseRows } = data;

  return (
    <SequenceDetailClient
      id={seq.id}
      name={seq.name}
      slug={seq.slug}
      description={seq.description ?? null}
      audience={seq.audience}
      status={seq.status}
      createdAt={seq.createdAt.toISOString()}
      updatedAt={seq.updatedAt.toISOString()}
      courses={courseRows.map((c) => ({
        id:            c.id,
        title:         c.title,
        status:        c.status,
        sequenceOrder: c.sequenceOrder ?? 0,
      }))}
      isAdmin={user ? isAdmin(user) : false}
    />
  );
}
