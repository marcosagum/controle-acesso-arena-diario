'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// Interface de retorno simplificada para a UI
export interface ColaboradorComStatus {
  id: string;
  nomeCompleto: string;
  cpf: string;
  fotoUrl: string | null;
  empresa: {
    id: string;
    nome: string;
  };
  status: 'DENTRO' | 'FORA';
  registroAtivo?: {
    id: string;
    timestampEntrada: Date;
    operadorEntrada: string;
    descricaoServico: string;
  };
}

// 1. Obter todos os colaboradores com seus status de acesso atuais
export async function getColaboradoresComStatus(searchQuery?: string): Promise<ColaboradorComStatus[]> {
  try {
    // Buscar todos os colaboradores
    const colaboradores = await prisma.colaborador.findMany({
      where: searchQuery ? {
        OR: [
          { nomeCompleto: { contains: searchQuery } },
          { cpf: { contains: searchQuery } },
          { empresa: { nome: { contains: searchQuery } } }
        ]
      } : undefined,
      include: {
        empresa: true,
        registros: {
          where: { status: 'DENTRO' },
          orderBy: { timestampEntrada: 'desc' },
          take: 1
        }
      },
      orderBy: { nomeCompleto: 'asc' }
    });

    // Mapear dados para retornar o status "DENTRO" ou "FORA" e o registro ativo
    return colaboradores.map(colab => {
      const registroAtivo = colab.registros[0];
      return {
        id: colab.id,
        nomeCompleto: colab.nomeCompleto,
        cpf: colab.cpf,
        fotoUrl: colab.fotoUrl,
        empresa: {
          id: colab.empresa.id,
          nome: colab.empresa.nome
        },
        status: registroAtivo ? 'DENTRO' : 'FORA',
        registroAtivo: registroAtivo ? {
          id: registroAtivo.id,
          timestampEntrada: registroAtivo.timestampEntrada,
          operadorEntrada: registroAtivo.operadorEntrada,
          descricaoServico: registroAtivo.descricaoServico
        } : undefined
      };
    });
  } catch (error) {
    console.error('Erro ao buscar colaboradores:', error);
    throw new Error('Falha ao recuperar base de colaboradores.');
  }
}

// 2. Realizar Check-in (Entrada de Colaborador)
export async function realizarCheckIn(
  colaboradorId: string,
  operadorEntrada: string,
  descricaoServico: string
): Promise<void> {
  try {
    // Garantir que não haja um check-in ativo aberto para essa mesma pessoa
    const checkInExistente = await prisma.registroAcesso.findFirst({
      where: {
        colaboradorId,
        status: 'DENTRO'
      }
    });

    if (checkInExistente) {
      throw new Error('Este colaborador já se encontra dentro da arena.');
    }

    // Criar o registro de entrada
    await prisma.registroAcesso.create({
      data: {
        colaboradorId,
        operadorEntrada,
        descricaoServico,
        status: 'DENTRO',
        timestampEntrada: new Date()
      }
    });

    revalidatePath('/');
  } catch (error: any) {
    console.error('Erro no check-in:', error);
    throw new Error(error.message || 'Falha ao processar o check-in.');
  }
}

// 3. Realizar Check-out (Saída de Colaborador)
export async function realizarCheckOut(
  colaboradorId: string,
  operadorSaida: string,
  servicosExtras?: string
): Promise<void> {
  try {
    // Buscar o registro ativo
    const registroAtivo = await prisma.registroAcesso.findFirst({
      where: {
        colaboradorId,
        status: 'DENTRO'
      }
    });

    if (!registroAtivo) {
      throw new Error('Nenhum check-in ativo encontrado para este colaborador.');
    }

    // Atualizar o registro fechando o ciclo
    await prisma.registroAcesso.update({
      where: { id: registroAtivo.id },
      data: {
        timestampSaida: new Date(),
        operadorSaida,
        servicosExtras: servicosExtras || null,
        status: 'FORA'
      }
    });

    revalidatePath('/');
    revalidatePath('/auditoria');
  } catch (error: any) {
    console.error('Erro no check-out:', error);
    throw new Error(error.message || 'Falha ao processar o check-out.');
  }
}

// 4. Obter logs de auditoria
export interface AuditLogItem {
  id: string;
  colaboradorId: string;
  colaboradorNome: string;
  colaboradorCpf: string;
  empresaNome: string;
  timestampEntrada: Date;
  operadorEntrada: string;
  descricaoServico: string;
  timestampSaida: Date | null;
  operadorSaida: string | null;
  servicosExtras: string | null;
  status: string;
}

export async function getAuditLogs(): Promise<AuditLogItem[]> {
  try {
    const logs = await prisma.registroAcesso.findMany({
      include: {
        colaborador: {
          include: {
            empresa: true
          }
        }
      },
      orderBy: { timestampEntrada: 'desc' }
    });

    return logs.map(log => ({
      id: log.id,
      colaboradorId: log.colaboradorId,
      colaboradorNome: log.colaborador.nomeCompleto,
      colaboradorCpf: log.colaborador.cpf,
      empresaNome: log.colaborador.empresa.nome,
      timestampEntrada: log.timestampEntrada,
      operadorEntrada: log.operadorEntrada,
      descricaoServico: log.descricaoServico,
      timestampSaida: log.timestampSaida,
      operadorSaida: log.operadorSaida,
      servicosExtras: log.servicosExtras,
      status: log.status
    }));
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    throw new Error('Falha ao recuperar histórico de auditoria.');
  }
}

// 5. Obter empresas cadastrados
export async function getEmpresas() {
  return prisma.empresa.findMany({
    orderBy: { nome: 'asc' }
  });
}

// Imagem SVG padrão de avatar temporário para perfis sem foto carregada
const FOTO_TEMPORARIA_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2364748b'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";

// 6. Cadastrar novo colaborador
export async function cadastrarColaborador(data: {
  nomeCompleto: string;
  cpf: string;
  empresaId: string;
  fotoUrl?: string;
}): Promise<void> {
  try {
    // Validar CPF duplicado
    const existente = await prisma.colaborador.findUnique({
      where: { cpf: data.cpf }
    });

    if (existente) {
      throw new Error('Já existe um colaborador cadastrado com este CPF.');
    }

    await prisma.colaborador.create({
      data: {
        nomeCompleto: data.nomeCompleto,
        cpf: data.cpf,
        empresaId: data.empresaId,
        fotoUrl: data.fotoUrl || FOTO_TEMPORARIA_AVATAR
      }
    });

    revalidatePath('/colaboradores');
    revalidatePath('/');
  } catch (error: any) {
    console.error('Erro ao cadastrar colaborador:', error);
    throw new Error(error.message || 'Falha ao salvar colaborador.');
  }
}

// 7. Cadastrar nova empresa
export async function cadastrarEmpresa(nome: string): Promise<void> {
  try {
    const existente = await prisma.empresa.findUnique({
      where: { nome }
    });

    if (existente) {
      throw new Error('Já existe uma empresa cadastrada com este nome.');
    }

    await prisma.empresa.create({
      data: { nome }
    });

    revalidatePath('/colaboradores');
  } catch (error: any) {
    console.error('Erro ao cadastrar empresa:', error);
    throw new Error(error.message || 'Falha ao cadastrar empresa.');
  }
}

// 8. Importar colaboradores em lote (planilha/CSV)
export async function importarColaboradoresLote(
  colaboradores: { nomeCompleto: string; cpf: string; empresaId?: string; empresaNome?: string; fotoUrl?: string }[]
): Promise<{ criados: number; ignorados: number }> {
  try {
    let criados = 0;
    let ignorados = 0;

    for (const colab of colaboradores) {
      // Validar CPF duplicado
      const existente = await prisma.colaborador.findUnique({
        where: { cpf: colab.cpf }
      });

      if (existente) {
        ignorados++;
        continue;
      }

      // Determinar ID da empresa de destino
      let targetEmpresaId = colab.empresaId;

      if (!targetEmpresaId && colab.empresaNome) {
        const nomeEmpresaLimpo = colab.empresaNome.trim();
        if (nomeEmpresaLimpo) {
          // Buscar ou criar a empresa no banco de dados dinamicamente
          let empExistente = await prisma.empresa.findUnique({
            where: { nome: nomeEmpresaLimpo }
          });
          if (!empExistente) {
            empExistente = await prisma.empresa.create({
              data: { nome: nomeEmpresaLimpo }
            });
          }
          targetEmpresaId = empExistente.id;
        }
      }

      // Se não houver empresa (fallback seguro), ignoramos o registro
      if (!targetEmpresaId) {
        ignorados++;
        continue;
      }

      await prisma.colaborador.create({
        data: {
          nomeCompleto: colab.nomeCompleto,
          cpf: colab.cpf,
          empresaId: targetEmpresaId,
          fotoUrl: colab.fotoUrl || FOTO_TEMPORARIA_AVATAR
        }
      });
      criados++;
    }

    revalidatePath('/colaboradores');
    revalidatePath('/');
    return { criados, ignorados };
  } catch (error: any) {
    console.error('Erro na importação em lote:', error);
    throw new Error(error.message || 'Falha ao importar colaboradores em lote.');
  }
}

// 9. Atualizar dados de colaborador existente
export async function atualizarColaborador(
  id: string,
  data: {
    nomeCompleto: string;
    cpf: string;
    empresaId: string;
    fotoUrl?: string;
  }
): Promise<void> {
  try {
    // Validar se o CPF alterado pertence a outro colaborador
    const cpfExistente = await prisma.colaborador.findFirst({
      where: {
        cpf: data.cpf,
        id: { not: id }
      }
    });

    if (cpfExistente) {
      throw new Error('Já existe outro colaborador cadastrado com este CPF.');
    }

    await prisma.colaborador.update({
      where: { id },
      data: {
        nomeCompleto: data.nomeCompleto,
        cpf: data.cpf,
        empresaId: data.empresaId,
        fotoUrl: data.fotoUrl || undefined
      }
    });

    revalidatePath('/colaboradores');
    revalidatePath('/');
  } catch (error: any) {
    console.error('Erro ao atualizar colaborador:', error);
    throw new Error(error.message || 'Falha ao atualizar colaborador.');
  }
}

// 10. Deletar colaborador
export async function deletarColaborador(id: string): Promise<void> {
  try {
    // Deletar registros de acesso vinculados primeiro
    await prisma.registroAcesso.deleteMany({
      where: { colaboradorId: id }
    });

    // Deletar o colaborador
    await prisma.colaborador.delete({
      where: { id }
    });

    revalidatePath('/colaboradores');
    revalidatePath('/');
  } catch (error: any) {
    console.error('Erro ao deletar colaborador:', error);
    throw new Error(error.message || 'Falha ao deletar colaborador.');
  }
}
