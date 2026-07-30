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

// Função auxiliar para fazer upload da imagem comprimida para o Supabase Storage
async function uploadFotoParaSupabaseStorage(colaboradorCpf: string, fotoBase64: string): Promise<string> {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return fotoBase64;
  }

  if (fotoBase64.startsWith('http') || fotoBase64.startsWith('data:image/svg+xml')) {
    return fotoBase64;
  }

  try {
    const match = fotoBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return fotoBase64;
    
    const contentType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    const extension = contentType.split('/')[1] || 'jpg';
    const fileName = `${colaboradorCpf}.${extension}`;
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/fotos-colaboradores/${fileName}`;
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'API-KEY': SUPABASE_KEY,
        'Content-Type': contentType,
        'x-upsert': 'true'
      },
      body: buffer
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.warn('Erro ao fazer upload no Supabase Storage:', errorText);
      return fotoBase64;
    }

    return `${SUPABASE_URL}/storage/v1/object/public/fotos-colaboradores/${fileName}`;
  } catch (err) {
    console.error('Erro na integração do Supabase Storage:', err);
    return fotoBase64;
  }
}

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

    const fotoFinal = data.fotoUrl 
      ? await uploadFotoParaSupabaseStorage(data.cpf, data.fotoUrl)
      : FOTO_TEMPORARIA_AVATAR;

    await prisma.colaborador.create({
      data: {
        nomeCompleto: data.nomeCompleto,
        cpf: data.cpf,
        empresaId: data.empresaId,
        fotoUrl: fotoFinal
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

      const fotoFinal = colab.fotoUrl 
        ? await uploadFotoParaSupabaseStorage(colab.cpf, colab.fotoUrl)
        : FOTO_TEMPORARIA_AVATAR;

      await prisma.colaborador.create({
        data: {
          nomeCompleto: colab.nomeCompleto,
          cpf: colab.cpf,
          empresaId: targetEmpresaId,
          fotoUrl: fotoFinal
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

    const fotoFinal = data.fotoUrl 
      ? await uploadFotoParaSupabaseStorage(data.cpf, data.fotoUrl)
      : undefined;

    await prisma.colaborador.update({
      where: { id },
      data: {
        nomeCompleto: data.nomeCompleto,
        cpf: data.cpf,
        empresaId: data.empresaId,
        fotoUrl: fotoFinal
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

// ==========================================
// MÓDULO DE CONTROLE DE CHAVES (CAUTELA CCO)
// ==========================================

const LISTA_OFICIAL_CHAVES = [
  "ABELARDO P1", "ALMOXARIFADO-CCO", "AREA TECNICA ELETRICA-CCO", 
  "AREA TECNICA N/1 SALA SEGURANÇA GL", "AREA TECNICA AR CONDICIONADO-CCO", 
  "ARMAZEM NIVEL LOJA 1", "AUDITORIO ANTIGO - CCO", "AUDITORIO GL ( INTERNA )", 
  "AUTOMAÇÃO MANUTENÇÃO", "BANHEIRO DE SERVIÇO CCO", "BILHETERIA-CCO", 
  "C.A.G / T.I / C. P D -CCO", "CAÇAMBAS DE LIXO-CCO", "CAÇAMBA RECICLAVEL-CCO", 
  "CALDEIRA-CCO", "CAMAROTES-CCO", "CAMARINS 1 2 3 4 5 E 6-CCO", "CANCELA P5", 
  "CATWALK ESCADAS 2 E 5", "CAUTELA-CCO", "CERCADO COZINHA-CCO", 
  "CERCADO LATERAL CAUTELA - CCO", "CERCADO SUBSTAÇAO-CCO", "CLUBE CINZA NIVEL 2", 
  "CONTROLE DOCAS-CCO", "CASA DE MAQUINAS-CCO", "COZINHA NIVEL 0 -CCO", 
  "COZINHA NIVEL 3(A&B-PIPOCA)", "COZINHA PORTAS EXTERNA-CCO", "CREDENCIAMENTO - CCO", 
  "DEPOSITO MESAS(T-20)-CCO", "DG-01", "DOCAS A&B-CCO", "GAS-CCO", 
  "GUARITA PORTAO 1-CCO", "LETREIRO JEUNESSE ARENA-CCO", "LOJA 1 NIVEL 1-CCO", 
  "LOJA 2 NIVEL 1(BASE LIMPEZA)CCO", "LOJA 2 NIVEL 2-CCO", "LOJA 4 NIVEL 1-CCO", 
  "LOJA 5 NIVEL1-CCO", "LOJA 13 NIVEL 1-CCO", "LOUDNESS SALA EXTERNA", 
  "PORTA ADM LADO COZINHA-CCO", "PORTA DE FERRO(ADM)-CCO", "PORTA EXTERNA DEPOSITO ARENA 1", 
  "PORTA EXT ESCRITORIO GSH-CCO", "PORTA(PRETA)COZINHA-CCO", "PORTAS NIVEL 0 - CCO", 
  "PORTAS NIVEL 01-CCO", "PORTAO 01-CCO", "PORTAO P. OLIMPICO / DOCAS-CCO", 
  "PORTOES ALFACEM-CCO", "POSTO MEDICO NIVEL 0-CCO", "POSTO MEDICO NIVEL 1-CCO", 
  "QDG QUADRA-CCO", "RACK NIVEL 2-CCO", "RACK P1-CCO", "RACK P5-CCO", 
  "RETRATIL-CCO", "SALA DE PRODUÇÃO T-06 CCO", "SALA DE PRODUÇÃO T-07 CCO", 
  "SALA DE PRODUÇÃO T-08 CCO", "SALA DE PRODUÇÃO T-48 CCO", 
  "SALA DE PRODUÇÃO 51 52 53 E 54-CCO", "SALA GL LIVE-CCO", "SALA T-19-CCO", 
  "SALA T-20 CCO", "SALA T-32 CCO", "SALA T-35-CCO", "SALA T-36 CCO", 
  "SALAS T-36/37 PORTA EXTERNA", "SALA T-39 CCO", "SALA T-40 CCO", 
  "SALA T-41 CCO", "SALA T-49 CCO", "SALA T-50 CCO", "SALA T-56 CCO", 
  "SANITARIOS NIVEL 0-CCO", "SANITARIOS NIVEL 1-CCO", "SANITARIOS NIVEL 2-CCO", 
  "SANITARIOS NIVEL 3-CCO", "T - 27", "T-47(LADO PRODUÇAO) CCO", 
  "TAPUME-CCO", "VESTIARIO 01 CCO", "VESTIARIO 4 CCO"
];

export interface ChaveInfo {
  id: string;
  codigo: string;
  status: string;
  observacao: string | null;
  emprestadaPara: string | null;
  timestampRetirada: Date | null;
  operadorLiberacao: string | null;
}

export interface HistoricoChaveInfo {
  id: string;
  chaveCodigo: string;
  acao: string;
  responsavel: string;
  operador: string;
  timestamp: Date;
  observacao: string | null;
}

// 11. Obter todas as chaves (com seeding automático se estiver vazio)
export async function getChaves(): Promise<ChaveInfo[]> {
  try {
    let chaves = await prisma.chave.findMany({
      orderBy: { codigo: 'asc' }
    });

    // Se o banco estiver vazio, fazemos o seeding automático
    if (chaves.length === 0) {
      console.log('Populando tabela tb_chaves com a lista oficial de 86 chaves...');
      await prisma.chave.createMany({
        data: LISTA_OFICIAL_CHAVES.map(codigo => ({
          codigo,
          status: 'DISPONIVEL'
        }))
      });

      // Busca novamente
      chaves = await prisma.chave.findMany({
        orderBy: { codigo: 'asc' }
      });
    }

    return chaves;
  } catch (error: any) {
    console.error('Erro ao buscar chaves:', error);
    throw new Error('Falha ao recuperar base de chaves.');
  }
}

// 12. Emprestar chave
export async function emprestarChave(
  id: string,
  emprestadaPara: string,
  operadorLiberacao: string
): Promise<void> {
  try {
    const chave = await prisma.chave.findUnique({ where: { id } });
    if (!chave) throw new Error('Chave não encontrada.');
    if (chave.status !== 'DISPONIVEL') throw new Error('Esta chave não está disponível.');

    // Atualizar chave
    await prisma.chave.update({
      where: { id },
      data: {
        status: 'EMPRESTADA',
        emprestadaPara,
        timestampRetirada: new Date(),
        operadorLiberacao
      }
    });

    // Gravar log de auditoria de chaves
    await prisma.registroChave.create({
      data: {
        chaveCodigo: chave.codigo,
        acao: 'RETIRADA',
        responsavel: emprestadaPara,
        operador: operadorLiberacao,
        timestamp: new Date()
      }
    });

    revalidatePath('/chaves');
  } catch (error: any) {
    console.error('Erro ao emprestar chave:', error);
    throw new Error(error.message || 'Falha ao registrar empréstimo de chave.');
  }
}

// 13. Devolver chave
export async function devolverChave(
  id: string,
  operador: string,
  observacao?: string
): Promise<void> {
  try {
    const chave = await prisma.chave.findUnique({ where: { id } });
    if (!chave) throw new Error('Chave não encontrada.');
    if (chave.status !== 'EMPRESTADA') throw new Error('Esta chave não está marcada como emprestada.');

    const responsavelOriginal = chave.emprestadaPara || 'NÃO IDENTIFICADO';

    // Atualizar chave limpando campos
    await prisma.chave.update({
      where: { id },
      data: {
        status: 'DISPONIVEL',
        emprestadaPara: null,
        timestampRetirada: null,
        operadorLiberacao: null,
        observacao: observacao || null
      }
    });

    // Gravar log de devolução
    await prisma.registroChave.create({
      data: {
        chaveCodigo: chave.codigo,
        acao: 'DEVOLVIDA',
        responsavel: responsavelOriginal,
        operador: operador,
        timestamp: new Date(),
        observacao: observacao || null
      }
    });

    revalidatePath('/chaves');
  } catch (error: any) {
    console.error('Erro ao devolver chave:', error);
    throw new Error(error.message || 'Falha ao registrar devolução de chave.');
  }
}

// 14. Atualizar status e observação de chave (Perdida / Quebrada / Forçar Disponível)
export async function atualizarStatusChave(
  id: string,
  status: 'DISPONIVEL' | 'PERDIDA' | 'QUEBRADA',
  observacao: string,
  operador: string,
  responsavelReporte: string
): Promise<void> {
  try {
    const chave = await prisma.chave.findUnique({ where: { id } });
    if (!chave) throw new Error('Chave não encontrada.');

    let acaoReg = 'DISPONIBILIZADA';
    if (status === 'PERDIDA') acaoReg = 'INDISPONIVEL_PERDIDA';
    if (status === 'QUEBRADA') acaoReg = 'INDISPONIVEL_QUEBRADA';

    // Atualizar a chave
    await prisma.chave.update({
      where: { id },
      data: {
        status,
        observacao: observacao || null,
        // Limpar empréstimos se estiver marcando como perdida/quebrada
        emprestadaPara: status === 'DISPONIVEL' ? chave.emprestadaPara : null,
        timestampRetirada: status === 'DISPONIVEL' ? chave.timestampRetirada : null,
        operadorLiberacao: status === 'DISPONIVEL' ? chave.operadorLiberacao : null
      }
    });

    // Gravar log no histórico
    await prisma.registroChave.create({
      data: {
        chaveCodigo: chave.codigo,
        acao: acaoReg,
        responsavel: responsavelReporte || 'SISTEMA',
        operador,
        timestamp: new Date(),
        observacao: observacao || null
      }
    });

    revalidatePath('/chaves');
  } catch (error: any) {
    console.error('Erro ao alterar status da chave:', error);
    throw new Error(error.message || 'Falha ao alterar status físico da chave.');
  }
}

// 15. Obter histórico completo de chaves
export async function getHistoricoChaves(): Promise<HistoricoChaveInfo[]> {
  try {
    return prisma.registroChave.findMany({
      orderBy: { timestamp: 'desc' }
    });
  } catch (error: any) {
    console.error('Erro ao buscar histórico de chaves:', error);
    throw new Error('Falha ao recuperar histórico de auditoria de chaves.');
  }
}

// ==========================================
// MÓDULO DE ATIVOS E OPERAÇÕES DO CCO
// ==========================================

export interface EquipamentoCftvInfo {
  id: string;
  nome: string;
  tipo: string;
  status: string;
  createdAt: Date;
}

export interface DefeitoCftvInfo {
  id: string;
  equipamentoNome: string;
  descricao: string;
  operador: string;
  dataHora: Date;
}

export interface AuditoriaImagemInfo {
  id: string;
  cameraNome: string;
  timestampTrecho: Date;
  descricaoFato: string;
  operador: string;
  tipo: string;
  createdAt: Date;
}

export interface ControleExtintorInfo {
  id: string;
  tipoMovimentacao: string;
  responsavelExterno: string;
  operadorCco: string;
  motivo: string;
  timestamp: Date;
}

export interface OcorrenciaInfo {
  id: string;
  tipo: string;
  nomeEvento: string | null;
  operador: string;
  detalhes: string;
  timestamp: Date;
}

const CAMERAS_PADRAO_SEED = [
  { nome: "Câmera Portão 1 (LPR)", tipo: "LPR" },
  { nome: "Câmera Entrada Social (Facial)", tipo: "RECONHECIMENTO_FACIAL" },
  { nome: "Sensor Estacionamento CCO (Movimento)", tipo: "ALARME_MOVIMENTO" },
  { nome: "Câmera Cabine Principal (Áudio)", tipo: "CAMERA_AUDIO" },
  { nome: "Body Cam Supervisor CCO 1", tipo: "BODY_CAM" },
  { nome: "Câmera Geral Docas P5", tipo: "CFTV_PADRAO" },
  { nome: "Câmera Adm Corredor Central", tipo: "CFTV_PADRAO" }
];

// 16. Obter equipamentos de CFTV (com seeding automático)
export async function getEquipamentosCftv(): Promise<EquipamentoCftvInfo[]> {
  try {
    let equipamentos = await prisma.equipamentoCftv.findMany({
      orderBy: { nome: 'asc' }
    });

    if (equipamentos.length === 0) {
      console.log('Populando tabela tb_equipamentos_cftv com seeding inicial...');
      await prisma.equipamentoCftv.createMany({
        data: CAMERAS_PADRAO_SEED.map(cam => ({
          nome: cam.nome,
          tipo: cam.tipo,
          status: 'DISPONIVEL'
        }))
      });

      equipamentos = await prisma.equipamentoCftv.findMany({
        orderBy: { nome: 'asc' }
      });
    }

    return equipamentos;
  } catch (error: any) {
    console.error('Erro ao buscar CFTVs:', error);
    throw new Error('Falha ao carregar câmeras.');
  }
}

// 17. Cadastrar equipamento de CFTV
export async function cadastrarEquipamentoCftv(
  nome: string,
  tipo: string
): Promise<void> {
  try {
    const existente = await prisma.equipamentoCftv.findUnique({
      where: { nome }
    });

    if (existente) {
      throw new Error('Já existe um equipamento cadastrado com este nome.');
    }

    await prisma.equipamentoCftv.create({
      data: {
        nome,
        tipo,
        status: 'DISPONIVEL'
      }
    });

    revalidatePath('/operacoes');
  } catch (error: any) {
    console.error('Erro ao cadastrar câmera:', error);
    throw new Error(error.message || 'Falha ao salvar câmera.');
  }
}

// 18. Registrar defeito em equipamento (Abertura de Chamado)
export async function registrarDefeitoCftv(
  equipamentoNome: string,
  descricao: string,
  operador: string
): Promise<void> {
  try {
    const equipamento = await prisma.equipamentoCftv.findFirst({
      where: { nome: equipamentoNome }
    });

    if (!equipamento) throw new Error('Equipamento não encontrado.');

    // Atualiza status do equipamento para MANUTENCAO
    await prisma.equipamentoCftv.update({
      where: { id: equipamento.id },
      data: { status: 'MANUTENCAO' }
    });

    // Grava registro de defeito
    await prisma.defeitoCftv.create({
      data: {
        equipamentoNome,
        descricao,
        operador,
        dataHora: new Date()
      }
    });

    revalidatePath('/operacoes');
  } catch (error: any) {
    console.error('Erro ao registrar defeito:', error);
    throw new Error(error.message || 'Falha ao registrar defeito.');
  }
}

// 19. Resolver defeito em equipamento (Retorno ao funcionamento)
export async function resolverDefeitoCftv(
  id: string,
  operador: string
): Promise<void> {
  try {
    const equipamento = await prisma.equipamentoCftv.findUnique({
      where: { id }
    });
    if (!equipamento) throw new Error('Equipamento não encontrado.');

    // Voltar status do equipamento para DISPONIVEL
    await prisma.equipamentoCftv.update({
      where: { id },
      data: { status: 'DISPONIVEL' }
    });

    // Deletar o registro de defeito ativo
    await prisma.defeitoCftv.deleteMany({
      where: { equipamentoNome: equipamento.nome }
    });

    revalidatePath('/operacoes');
  } catch (error: any) {
    console.error('Erro ao resolver defeito:', error);
    throw new Error(error.message || 'Falha ao resolver defeito.');
  }
}

// 20. Listar todos os defeitos reportados
export async function getDefeitosCftv(): Promise<DefeitoCftvInfo[]> {
  try {
    return prisma.defeitoCftv.findMany({
      orderBy: { dataHora: 'desc' }
    });
  } catch (error: any) {
    console.error('Erro ao buscar defeitos:', error);
    throw new Error('Falha ao recuperar histórico de defeitos.');
  }
}

// 21. Obter auditorias e sinalizações de imagens
export async function getAuditoriasImagens(): Promise<AuditoriaImagemInfo[]> {
  try {
    return prisma.auditoriaImagem.findMany({
      orderBy: { createdAt: 'desc' }
    });
  } catch (error: any) {
    console.error('Erro ao buscar auditorias de imagem:', error);
    throw new Error('Falha ao carregar auditorias de imagens.');
  }
}

// 22. Cadastrar auditoria ou sinalização de imagem
export async function cadastrarAuditoriaImagem(data: {
  cameraNome: string;
  timestampTrecho: Date;
  descricaoFato: string;
  operador: string;
  tipo: 'AUDITORIA' | 'SINALIZACAO_IMPORTANTE';
}): Promise<void> {
  try {
    await prisma.auditoriaImagem.create({
      data: {
        cameraNome: data.cameraNome,
        timestampTrecho: data.timestampTrecho,
        descricaoFato: data.descricaoFato,
        operador: data.operador,
        tipo: data.tipo
      }
    });

    revalidatePath('/operacoes');
  } catch (error: any) {
    console.error('Erro ao cadastrar auditoria:', error);
    throw new Error('Falha ao salvar auditoria de imagem.');
  }
}

// 23. Obter movimentações de extintores
export async function getControleExtintores(): Promise<ControleExtintorInfo[]> {
  try {
    return prisma.controleExtintor.findMany({
      orderBy: { timestamp: 'desc' }
    });
  } catch (error: any) {
    console.error('Erro ao buscar controle de extintores:', error);
    throw new Error('Falha ao carregar controle de extintores.');
  }
}

// 24. Cadastrar movimentação de extintor
export async function registrarMovimentacaoExtintor(data: {
  tipoMovimentacao: 'ENTREGA' | 'RECEBIMENTO';
  responsavelExterno: string;
  operadorCco: string;
  motivo: string;
}): Promise<void> {
  try {
    await prisma.controleExtintor.create({
      data: {
        tipoMovimentacao: data.tipoMovimentacao,
        responsavelExterno: data.responsavelExterno,
        operadorCco: data.operadorCco,
        motivo: data.motivo
      }
    });

    revalidatePath('/operacoes');
  } catch (error: any) {
    console.error('Erro ao registrar extintor:', error);
    throw new Error('Falha ao registrar movimentação do extintor.');
  }
}

// 25. Obter ocorrências
export async function getOcorrencias(): Promise<OcorrenciaInfo[]> {
  try {
    return prisma.ocorrencia.findMany({
      orderBy: { timestamp: 'desc' }
    });
  } catch (error: any) {
    console.error('Erro ao buscar ocorrências:', error);
    throw new Error('Falha ao carregar livro de ocorrências.');
  }
}

// 26. Cadastrar ocorrência
export async function cadastrarOcorrencia(data: {
  tipo: 'GERAL' | 'EVENTO';
  nomeEvento?: string;
  operador: string;
  detalhes: string;
}): Promise<void> {
  try {
    await prisma.ocorrencia.create({
      data: {
        tipo: data.tipo,
        nomeEvento: data.tipo === 'EVENTO' ? data.nomeEvento : null,
        operador: data.operador,
        detalhes: data.detalhes
      }
    });

    revalidatePath('/operacoes');
  } catch (error: any) {
    console.error('Erro ao cadastrar ocorrência:', error);
    throw new Error('Falha ao registrar ocorrência.');
  }
}

// 27. Obter dados unificados para o relatório da Arena
export async function getDadosRelatorioUnificado(dataInicio: Date, dataFim: Date) {
  try {
    const checkins = await prisma.registroAcesso.findMany({
      where: {
        timestampEntrada: {
          gte: dataInicio,
          lte: dataFim
        }
      },
      include: {
        colaborador: {
          include: {
            empresa: true
          }
        }
      },
      orderBy: { timestampEntrada: 'desc' }
    });

    const chavesMovimentadas = await prisma.registroChave.findMany({
      where: {
        timestamp: {
          gte: dataInicio,
          lte: dataFim
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    const ocorrencias = await prisma.ocorrencia.findMany({
      where: {
        timestamp: {
          gte: dataInicio,
          lte: dataFim
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    const auditorias = await prisma.auditoriaImagem.findMany({
      where: {
        createdAt: {
          gte: dataInicio,
          lte: dataFim
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const defeitos = await prisma.defeitoCftv.findMany({
      where: {
        dataHora: {
          gte: dataInicio,
          lte: dataFim
        }
      },
      orderBy: { dataHora: 'desc' }
    });

    const extintores = await prisma.controleExtintor.findMany({
      where: {
        timestamp: {
          gte: dataInicio,
          lte: dataFim
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    return {
      checkins,
      chavesMovimentadas,
      ocorrencias,
      auditorias,
      defeitos,
      extintores
    };
  } catch (error) {
    console.error('Erro ao obter relatório unificado:', error);
    throw new Error('Falha ao carregar relatório da Arena.');
  }
}
