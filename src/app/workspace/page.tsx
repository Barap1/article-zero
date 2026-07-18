import { ArticleZeroCommandCenter } from "../../components/article-zero/article-zero-command-center";
import { RequireAuth } from "../../auth/require-auth";

export default function WorkspacePage() {
  return <RequireAuth><ArticleZeroCommandCenter /></RequireAuth>;
}
