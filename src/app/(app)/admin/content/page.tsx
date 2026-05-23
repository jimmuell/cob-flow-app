import { withCurrentSession } from '@/lib/db/client';
import { courseSequences, courses, quizzes } from '@/lib/db/schema/content';
import { eq, desc } from 'drizzle-orm';
import { CatalogClient } from '@/features/content-manager/components/catalog-client';

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const { sequences, courseList, quizList } = await withCurrentSession(async (tx) => {
    // Sequences: platform scope only
    const seqRows = await tx
      .select({
        id: courseSequences.id,
        name: courseSequences.name,
        audience: courseSequences.audience,
        status: courseSequences.status,
        updatedAt: courseSequences.updated_at,
      })
      .from(courseSequences)
      .where(eq(courseSequences.content_type, 'platform'))
      .orderBy(desc(courseSequences.updated_at));

    // Courses: platform scope with optional sequence join
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
      .where(eq(courses.content_type, 'platform'))
      .orderBy(desc(courses.updated_at));

    // Quizzes: all platform-scope quizzes via their parent course
    const quizRows = await tx
      .select({
        id: quizzes.id,
        title: quizzes.title,
        quizType: quizzes.quiz_type,
        status: quizzes.status,
        courseId: quizzes.course_id,
        moduleId: quizzes.module_id,
        updatedAt: quizzes.updated_at,
      })
      .from(quizzes)
      .orderBy(desc(quizzes.updated_at));

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
    <CatalogClient
      sequences={sequencesWithCount}
      courses={coursesForClient}
      quizzes={quizzesForClient}
      defaultTab={tab}
    />
  );
}
