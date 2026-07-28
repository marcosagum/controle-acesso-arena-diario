const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Limpando o banco de dados...');
  await prisma.registroAcesso.deleteMany();
  await prisma.colaborador.deleteMany();
  await prisma.empresa.deleteMany();

  console.log('Iniciando o seeding de dados...');

  // 1. Criar Empresas
  const seguranca = await prisma.empresa.create({ data: { nome: 'Segurança Forte' } });
  const limpeza = await prisma.empresa.create({ data: { nome: 'Limpeza Express' } });
  const ti = await prisma.empresa.create({ data: { nome: 'TI Soluções' } });
  const manutencao = await prisma.empresa.create({ data: { nome: 'Manutenção Geral' } });
  const catering = await prisma.empresa.create({ data: { nome: 'Catering & Cia' } });

  console.log('Empresas criadas com sucesso.');

  // 2. Criar Colaboradores de Teste
  const c1 = await prisma.colaborador.create({
    data: {
      nomeCompleto: 'Carlos Eduardo Souza',
      cpf: '12345678901',
      fotoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&h=300&q=80',
      empresaId: seguranca.id,
    },
  });

  const c2 = await prisma.colaborador.create({
    data: {
      nomeCompleto: 'Mariana Medeiros Costa',
      cpf: '98765432101',
      fotoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&h=300&q=80',
      empresaId: seguranca.id,
    },
  });

  const c3 = await prisma.colaborador.create({
    data: {
      nomeCompleto: 'Roberto Albuquerque',
      cpf: '11122233344',
      fotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&h=300&q=80',
      empresaId: ti.id,
    },
  });

  const c4 = await prisma.colaborador.create({
    data: {
      nomeCompleto: 'Ana Paula Santos',
      cpf: '55566677788',
      fotoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=300&h=300&q=80',
      empresaId: limpeza.id,
    },
  });

  const c5 = await prisma.colaborador.create({
    data: {
      nomeCompleto: 'Fernando Oliveira',
      cpf: '22233344455',
      fotoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&h=300&q=80',
      empresaId: manutencao.id,
    },
  });

  const c6 = await prisma.colaborador.create({
    data: {
      nomeCompleto: 'Patrícia Fernandes Lima',
      cpf: '88899900011',
      fotoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&h=300&q=80',
      empresaId: catering.id,
    },
  });

  console.log('Colaboradores criados com sucesso.');

  // 3. Criar Histórico de Registros (Acessos passados/concluídos e um ativo)
  // Um acesso que ocorreu ontem
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  
  const ontemEntrada = new Date(ontem);
  ontemEntrada.setHours(8, 15, 0);
  const ontemSaida = new Date(ontem);
  ontemSaida.setHours(17, 30, 0);

  await prisma.registroAcesso.create({
    data: {
      colaboradorId: c1.id,
      timestampEntrada: ontemEntrada,
      operadorEntrada: 'CCO - Roberto',
      descricaoServico: 'Ronda perimetral e vistoria de portões de acesso',
      timestampSaida: ontemSaida,
      operadorSaida: 'CCO - Amanda',
      servicosExtras: 'Apoio extra solicitado no portão 3 durante descarga de materiais',
      status: 'FORA',
    },
  });

  await prisma.registroAcesso.create({
    data: {
      colaboradorId: c4.id,
      timestampEntrada: ontemEntrada,
      operadorEntrada: 'CCO - Amanda',
      descricaoServico: 'Limpeza pré-evento nos camarins do setor Leste',
      timestampSaida: ontemSaida,
      operadorSaida: 'CCO - Amanda',
      servicosExtras: null,
      status: 'FORA',
    },
  });

  // Um acesso ativo hoje (já entrou mas ainda não saiu)
  const hojeEntrada = new Date();
  hojeEntrada.setHours(13, 0, 0);

  await prisma.registroAcesso.create({
    data: {
      colaboradorId: c3.id,
      timestampEntrada: hojeEntrada,
      operadorEntrada: 'CCO - Thiago',
      descricaoServico: 'Manutenção preventiva no rack de rede central do CCO',
      status: 'DENTRO',
    },
  });

  console.log('Registros de acesso históricos semeados com sucesso.');
  console.log('Seeding concluído!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
