import type { Metadata } from "next";
import Link from "next/link";
import { InviteLanding } from "@/components/invites/invite-landing";
import { firstPublicName, inviteByCode } from "@/lib/personal-invites";
import { SITE_URL } from "@/lib/seo";

type Props = { params: Promise<{ code: string }> };
const description = "Descubra lugares e compartilhe suas experiências com seus amigos no GODINNER.";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const inviter = await inviteByCode(code);
  const title = inviter ? `${firstPublicName(inviter.name)} convidou você para o GODINNER` : "Conheça o GODINNER";
  return {
    title, description, robots: { index: false, follow: false },
    openGraph: { title, description, type: "website", siteName: "GODINNER", url: `${SITE_URL}/i/${code}`, images: [{ url: `${SITE_URL}/opengraph-image`, alt: "GODINNER" }] },
    twitter: { card: "summary_large_image", title, description, images: [`${SITE_URL}/opengraph-image`] },
  };
}

export default async function InvitePage({ params }: Props) {
  const { code } = await params;
  const inviter = await inviteByCode(code);
  if (!inviter) return <div className="mx-auto max-w-lg px-4 py-20 text-center"><h1 className="text-3xl font-black">Convite indisponível</h1><p className="mt-4 text-stone-600">Este link não está ativo. Você ainda pode conhecer o GODINNER.</p><Link href="/" className="mt-7 inline-grid min-h-12 place-items-center rounded-full bg-orange-600 px-6 font-black text-white">Explorar GODINNER</Link></div>;
  const avatar = inviter.avatar?.startsWith(`${inviter.inviterId}/`) ? `/api/profile-avatar/${inviter.inviterId}` : null;
  return <InviteLanding code={code} firstName={firstPublicName(inviter.name)} avatar={avatar}/>;
}
