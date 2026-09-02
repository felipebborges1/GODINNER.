import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de Uso | GODINNER",
  description: "Regras de uso do GODINNER durante o período Beta.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-10"><h2 className="text-xl font-black tracking-tight text-stone-900 sm:text-2xl">{title}</h2><div className="mt-3 space-y-4 text-sm leading-7 text-stone-700 sm:text-base">{children}</div></section>;
}

export default function TermsPage() {
  return <article className="mx-auto max-w-3xl px-4 py-10 pb-32 sm:px-6 sm:py-14 lg:pb-16">
    <p className="text-sm font-black uppercase tracking-wide text-orange-600">GODINNER</p>
    <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-950 sm:text-4xl">Termos de Uso do GODINNER</h1>
    <p className="mt-3 text-sm text-stone-500">Última atualização: 1º de setembro de 2026</p>
    <p className="mt-8 text-base leading-7 text-stone-700">Estes Termos regulam o uso do GODINNER, uma plataforma em Beta para descobrir, compartilhar e avaliar experiências em restaurantes, bares e outros estabelecimentos gastronômicos.</p>

    <Section title="1. Aceitação dos Termos"><p>Ao usar o GODINNER, você concorda com estes Termos e com a <Link className="font-bold text-orange-600 underline underline-offset-4" href="/privacy">Política de Privacidade</Link>, quando juridicamente aplicável. Caso não concorde, não utilize a plataforma.</p></Section>
    <Section title="2. Conta e acesso"><p>Você é responsável pelas informações fornecidas e pelo uso da sua conta. O acesso pode ocorrer por e-mail e senha ou por uma conta Google. Mantenha suas credenciais protegidas e comunique-nos caso suspeite de uso indevido.</p></Section>
    <Section title="3. Conteúdo criado por usuários"><p>Você continua responsável pelo conteúdo que publica, incluindo reviews, fotos, comentários, respostas, listas e demais contribuições. Ao publicar, concede ao GODINNER uma licença limitada, não exclusiva e necessária para hospedar, armazenar, reproduzir e exibir esse conteúdo dentro da plataforma e para operar as funcionalidades relacionadas.</p><p>Essa licença não transfere a propriedade do seu conteúdo ao GODINNER.</p></Section>
    <Section title="4. Conduta esperada"><p>Não use o GODINNER para publicar ou praticar conteúdo ilegal, fraudulento, assediante, ameaçador, enganoso, spam, falsificação de identidade, violação de direitos de terceiros ou de propriedade intelectual. Também não é permitido manipular artificialmente avaliações ou tentar comprometer a segurança da plataforma.</p></Section>
    <Section title="5. Reviews e interações"><p>Reviews, notas e comentários representam opiniões e experiências de seus autores. O GODINNER não garante que elas reflitam a qualidade objetiva de um estabelecimento, nem que uma experiência se repetirá da mesma forma para todas as pessoas.</p></Section>
    <Section title="6. Informações de restaurantes"><p>As informações sobre estabelecimentos podem ser fornecidas por usuários, pelos próprios estabelecimentos, por fontes externas ou pelo Google Places e Google Maps, quando aplicável. Dados como horário, preço, endereço, disponibilidade e cardápio podem mudar; confirme informações importantes diretamente com o estabelecimento.</p></Section>
    <Section title="7. Gastos e faixas de preço"><p>O gasto por pessoa informado pela comunidade é apenas indicativo, pode variar conforme consumo e não constitui preço garantido. Quando exibida, a faixa editorial de preço ($, $$, $$$ ou $$$$) também é uma referência aproximada do catálogo.</p></Section>
    <Section title="8. Moderação e suspensão"><p>O GODINNER pode moderar ou remover conteúdo que viole estes Termos, a legislação ou direitos de terceiros. Em situações de abuso, fraude ou violação relevante, a conta poderá ser restringida para proteger a comunidade e a plataforma.</p></Section>
    <Section title="9. Serviços externos"><p>O GODINNER pode depender de serviços de terceiros para autenticação, mapas, busca de estabelecimentos, hospedagem e armazenamento. Esses serviços possuem suas próprias condições e políticas.</p></Section>
    <Section title="10. Beta, disponibilidade e responsabilidade"><p>O GODINNER está em Beta. Funcionalidades podem mudar, conter falhas ou ficar temporariamente indisponíveis. Buscamos manter o serviço útil e seguro, sem afastar responsabilidades que não possam ser excluídas pela legislação aplicável.</p></Section>
    <Section title="11. Alterações e contato"><p>Estes Termos podem ser atualizados conforme o produto evoluir. A data da versão mais recente será exibida no início desta página.</p><p>Para dúvidas sobre estes Termos, utilize <a className="font-bold text-orange-600 underline underline-offset-4" href="mailto:suportegodinner@gmail.com">suportegodinner@gmail.com</a>.</p><p>Leia também a <Link className="font-bold text-orange-600 underline underline-offset-4" href="/privacy">Política de Privacidade do GODINNER</Link>.</p></Section>
  </article>;
}
