"use client";

import { users } from "@/data/mocks";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ReviewCard } from "@/components/review/review-card";
import { useAppContext } from "@/hooks/use-app-context";

export default function ProfilePage() {
  const { currentUserId, reviews, lists } = useAppContext();
  const user = users.find((item) => item.id === currentUserId) ?? users[0];
  const ownReviews = reviews.filter((review) => review.userId === user.id);
  return <div className="mx-auto max-w-xl px-4 py-6 lg:py-10"><div className="flex items-center gap-4"><UserAvatar src={user.avatar} name={user.name} size="lg"/><div><h1 className="text-2xl font-black">{user.name}</h1><p className="text-sm text-stone-500">@{user.username} · {user.neighborhood}</p></div></div><p className="mt-5 text-sm leading-6 text-stone-600">{user.bio}</p><div className="mt-5 flex gap-8 text-sm"><span><b>{user.followers}</b> seguidores</span><span><b>{user.following}</b> seguindo</span></div><div className="mt-9"><h2 className="text-xl font-black">Experiências</h2><div className="mt-4 grid gap-4">{ownReviews.slice(0, 6).map((review) => <ReviewCard key={review.id} review={review} user={user}/>)}</div><p className="mt-6 text-sm font-semibold text-stone-500">{lists.filter((list) => list.ownerId === user.id).length} listas salvas</p></div></div>;
}
