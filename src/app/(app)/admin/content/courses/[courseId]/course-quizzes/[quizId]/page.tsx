import { notFound } from 'next/navigation';
import { eq, asc } from 'drizzle-orm';
import Link from 'next/link';
import { withCurrentSession } from '@/lib/db/client';
import { quizzes, quizQuestions, courses } from '@/lib/db/schema/content';
import { getCurrentUser } from '@/lib/auth/session';
import { isAdmin } from '@/lib/authority/roles';
import { AdminDeleteSection } from '@/features/content-manager/components/admin-delete-section';
import { deleteQuiz } from '@/features/content-manager/actions/quiz';
import { QuizEditor, type QuestionRow } from '@/features/content-manager/components/quiz-editor';

export default async function CourseQuizPage({
  params,
}: {
  params: Promise<{ courseId: string; quizId: string }>;
}) {
  const { courseId, quizId } = await params;

  const [data, user] = await Promise.all([
    withCurrentSession(async (tx) => {
      const [quiz] = await tx
        .select({
          id:            quizzes.id,
          title:         quizzes.title,
          quizType:      quizzes.quiz_type,
          passThreshold: quizzes.pass_threshold,
          status:        quizzes.status,
          updatedAt:     quizzes.updated_at,
        })
        .from(quizzes)
        .where(eq(quizzes.id, quizId));

      if (!quiz) return null;

      const [course, questions] = await Promise.all([
        tx
          .select({ id: courses.id, title: courses.title })
          .from(courses)
          .where(eq(courses.id, courseId))
          .then((rows) => rows[0] ?? null),
        tx
          .select({
            id:                         quizQuestions.id,
            question_order:             quizQuestions.question_order,
            question_type:              quizQuestions.question_type,
            topic:                      quizQuestions.topic,
            stem_markdown:              quizQuestions.stem_markdown,
            mc_options:                 quizQuestions.mc_options,
            mc_correct_option:          quizQuestions.mc_correct_option,
            mc_explanation_markdown:    quizQuestions.mc_explanation_markdown,
            fr_model_answer_markdown:   quizQuestions.fr_model_answer_markdown,
            fr_grading_rubric_markdown: quizQuestions.fr_grading_rubric_markdown,
          })
          .from(quizQuestions)
          .where(eq(quizQuestions.quiz_id, quizId))
          .orderBy(asc(quizQuestions.question_order)),
      ]);

      return { quiz, course, questions };
    }),
    getCurrentUser(),
  ]);

  if (!data) notFound();

  const { quiz, course, questions } = data;
  const userIsAdmin = user ? isAdmin(user) : false;
  const courseHref = `/admin/content/courses/${courseId}`;

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        <Link href="/admin/content" className="hover:underline">Content</Link>
        {course && (
          <>
            {' › '}
            <Link href={courseHref} className="hover:underline">{course.title}</Link>
          </>
        )}
        {' › '}
        {quiz.title}
      </p>

      <QuizEditor
        quizId={quiz.id}
        quizType={quiz.quizType as 'multiple_choice' | 'free_response'}
        quizStatus={quiz.status}
        initialPassThreshold={quiz.passThreshold}
        initialQuestions={questions as QuestionRow[]}
        initialUpdatedAt={quiz.updatedAt.toISOString()}
        quizTitle={quiz.title}
        parentTitle={course?.title ?? 'Course'}
        parentHref={courseHref}
      />

      {userIsAdmin && quiz.status === 'archived' && (
        <AdminDeleteSection
          entityType="Quiz"
          entityName={quiz.title}
          onDelete={deleteQuiz.bind(null, quizId)}
          redirectTo={courseHref}
        />
      )}
    </div>
  );
}
