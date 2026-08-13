import { notFound } from "next/navigation";
import { reviews, users } from "@/data/mocks";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ReviewCard } from "@/components/review/review-card";

export default async function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = users.find((item) => item.username === username);
  if (!user) notFound();
  const userReviews = reviews.filter((review) => review.userId === user.id);
  return <div className="mx-auto max-w-xl px-4 py-6 lg:py-10"><div className="flex items-center gap-4"><UserAvatar src={user.avatar} name={user.name} size="lg"/><div><h1 className="text-2xl font-black">{user.name}</h1><p className="text-sm text-stone-500">@{user.username} · {user.neighborhood}</p></div></div><p className="mt-5 text-sm leading-6 text-stone-600">{user.bio}</p><div className="mt-5 flex gap-8 text-sm"><span><b>{user.followers}</b> seguidores</span><span><b>{user.following}</b> seguindo</span></div><h2 className="mt-9 text-xl font-black">Experiências</h2><div className="mt-4 grid gap-4">{userReviews.slice(0, 4).map((review) => <ReviewCard key={review.id} review={review} user={user}/>)}</div></div>;
}
