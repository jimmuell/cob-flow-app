import { withCurrentSession } from '@/lib/db/client';
import { courseSequences, courses, quizzes } from '@/lib/db/schema/content';
import { eq, ne, and, desc } from 'drizzle-orm';
import { CatalogClient } from '@/features/content-manager/components/catalog-client';

type StatusFilter = 'active' | 'archived' | 'all';

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string }>;
}) {
  const { tab, status: rawStatus } = await searchParams;
  const statusFilter: StatusFilter =
    rawStatus === 'archived' || rawStatus === 'all' ? rawStatus : 'active';

  const { sequences, courseList, quizList } = await withCurrentSession(async (tx) => {
    // Build per-table status conditions
    const seqWhere =
      statusFilter === 'all'
        ? eq(courseSequences.content_type, 'platform')
        : statusFilter === 'archived'
        ? and(eq(courseSequences.content_type, 'platform'), eq(courseSequences.status, 'archived'))
        : and(eq(courseSequences.content_type, 'platform'), ne(courseSequences.status, 'archived'));

    const courseWhere =
      statusFilter === 'all'
        ? eq(courses.content_type, 'platform')
        : statusFilter === 'archived'
        ? and(eq(courses.content_type, 'platform'), eq(courses.status, 'archived'))
        : and(eq(courses.content_type, 'platform'), ne(courses.status, 'archived'));

    // Sequences: platform scope + status filter
    const seqRows = await tx
      .select({
        id: courseSequences.id,
        name: courseSequences.name,
        audience: courseSequences.audience,
        status: courseSequences.status,
        updatedAt: courseSequences.updated_at,
      })
      .from(courseSequences)
      .where(seqWhere)
      .orderBy(desc(courseSequences.updated_at));

    // Courses: platform scope + status filter
    const courseRows = await tx
      .select({
        id: courses.id,
        title: courses.title,
        audience: courses.audience,
        status: courses.status,
        estimatedHours: courses.estimated_hours,
        updatedAt: courses.updated_at,
      })
      .from(courses)
      .where(courseWhere)
      .orderBy(desc(courses.updated_at));

    // Quizzes: status filter only (no content_type column on quizzes)
    const quizBase = tx
      .select({
        id: quizzes.id,
        title: quizzes.title,
        quizType: quizzes.quiz_type,
        status: quizzes.status,
        courseId: quizzes.course_id,
        moduleId: quizzes.module_id,
        updatedAt: quizzes.updated_at,
      })
      .from(quizzes);

    const quizRows = await (
      statusFilter === 'all'
        ? quizBase.orderBy(desc(quizzes.updated_at))
        : statusFilter === 'archived'
        ? quizBase.where(eq(quizzes.status, 'archived')).orderBy(desc(quizzes.updated_at))
        : quizBase.where(ne(quizzes.status, 'archived')).orderBy(desc(quizzes.updated_at))
    );

    return { sequences: seqRows, courseList: courseRows, quizList: quizRows };
  });

  const sequencesWithCount = sequences.map((s) => ({
    ...s,
    updatedAt: s.updatedAt,
    courseCount: 0, // populated once courses have sequence_id
  }));

  const coursesForClient = courseList.map((c) => ({
    ...c,
    updatedAt: c.updatedAt,
    sequenceName: null as string | null,
  }));

  const quizzesForClient = quizList.map((q) => ({
    ...q,
    updatedAt: q.updatedAt,
    parentLabel: q.courseId ? 'Course quiz' : 'Module quiz',
  }));

  return (
    // key forces remount when statusFilter changes so useState(defaultTab) re-initializes
    <CatalogClient
      key={statusFilter}
      sequences={sequencesWithCount}
      courses={coursesForClient}
      quizzes={quizzesForClient}
      defaultTab={tab}
      statusFilter={statusFilter}
    />
  );
}
