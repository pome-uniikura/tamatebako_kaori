import type { APIRoute } from 'astro';
import { certs, getQuestions, quizPayload } from '../../lib/data';

// 科目ごとの問題データ。演習と復習のページが必要なときに読み込む
export function getStaticPaths() {
  return certs.filter((c) => getQuestions(c.id).length > 0).map((c) => ({ params: { id: c.id } }));
}

export const GET: APIRoute = ({ params }) =>
  new Response(JSON.stringify(quizPayload(params.id!)), { headers: { 'Content-Type': 'application/json' } });
