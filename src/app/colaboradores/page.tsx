'use client';

import { useState, useEffect, useTransition } from 'react';
import { 
  getColaboradoresComStatus, 
  getEmpresas, 
  cadastrarColaborador, 
  cadastrarEmpresa,
  importarColaboradoresLote,
  atualizarColaborador,
  deletarColaborador,
  realizarCheckIn,
  realizarCheckOut,
  ColaboradorComStatus
} from '../actions';
import * as XLSX from 'xlsx';

interface EmpresaInfo {
  id: string;
  nome: string;
}

export default function GestaoCadastros() {
  const [colaboradores, setColaboradores] = useState<ColaboradorComStatus[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaInfo[]>([]);
  const [activeTab, setActiveTab] = useState<'colab' | 'emp' | 'lote' | 'editar'>('colab');
  
  // Estados para formulário de Colaborador
  const [nomeColab, setNomeColab] = useState('');
  const [cpfColab, setCpfColab] = useState('');
  const [empresaIdColab, setEmpresaIdColab] = useState('');
  const [fotoUrlColab, setFotoUrlColab] = useState('');
  const [fotoBase64, setFotoBase64] = useState(''); // Estado para preview e upload da imagem
  const [erroColab, setErroColab] = useState('');
  const [sucessoColab, setSucessoColab] = useState('');

  // Estado de filtragem de colaboradores cadastrados
  const [filtroEmpresa, setFiltroEmpresa] = useState('');

  // Estados para formulário de Empresa
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [erroEmpresa, setErroEmpresa] = useState('');
  const [sucessoEmpresa, setSucessoEmpresa] = useState('');

  // Estados para Importação em Lote (Excel / CSV / PDF)
  const [loteArquivo, setLoteArquivo] = useState<File | null>(null);
  const [loteDadosExcel, setLoteDadosExcel] = useState<{ 
    nomeCompleto: string; 
    cpf: string; 
    empresaNome?: string; 
    fotoUrl?: string; 
  }[]>([]);
  const [empresaIdLote, setEmpresaIdLote] = useState('');
  const [criarEmpresaNoLote, setCriarEmpresaNoLote] = useState(false);
  const [novoNomeEmpresaLote, setNovoNomeEmpresaLote] = useState('');
  const [loteFeedback, setLoteFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);
  const [previaMapeamento, setPreviaMapeamento] = useState<{ nomeColunaNome: string; nomeColunaCpf: string } | null>(null);

  // Estados para Aba de Edição de Perfis
  const [colabSelecionadoId, setColabSelecionadoId] = useState('');
  const [editNome, setEditNome] = useState('');
  const [editCpf, setEditCpf] = useState('');
  const [editEmpresaId, setEditEmpresaId] = useState('');
  const [editFotoUrl, setEditFotoUrl] = useState('');
  const [editFotoBase64, setEditFotoBase64] = useState('');
  const [editFeedback, setEditFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);
  const [termoPesquisaEditar, setTermoPesquisaEditar] = useState('');

  // Estados para Conciliação de Empresas no Lote
  const [empresasDesconhecidasLote, setEmpresasDesconhecidasLote] = useState<string[]>([]);
  const [conciliacaoResolvida, setConciliacaoResolvida] = useState<{ [key: string]: { action: 'CRIAR' | 'EXISTENTE'; value: string } }>({});
  const [showConciliacaoModal, setShowConciliacaoModal] = useState(false);

  // Estados para Modal de Visualização de Perfil de Colaborador (Olho)
  const [colabVisualizando, setColabVisualizando] = useState<ColaboradorComStatus | null>(null);
  const [opEntradaVisualizando, setOpEntradaVisualizando] = useState('');
  const [descServicoVisualizando, setDescServicoVisualizando] = useState('');
  const [opSaidaVisualizando, setOpSaidaVisualizando] = useState('');
  const [servExtrasVisualizando, setServExtrasVisualizando] = useState('');

  const [isPending, startTransition] = useTransition();

  // Heurística de leitura estruturada de PDF por coordenadas geométricas
  const lerTextoDoPDFEstruturado = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const typedarray = new Uint8Array(e.target?.result as ArrayBuffer);
          // @ts-ignore
          const pdfjsLib = window['pdfjs-dist/build/pdf'];
          if (!pdfjsLib) {
            reject(new Error('Biblioteca de leitura de PDF ainda está sendo carregada. Aguarde 3 segundos.'));
            return;
          }
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
          
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
          const colaboradoresPdf: any[] = [];
          
          // Sinônimos comuns de títulos de colunas do cadastro
          const sinonimosNome = ['nome', 'colaborador', 'prestador', 'funcionário', 'name', 'completo'];
          const sinonimosCpf = ['cpf', 'cadastro', 'documento', 'identificação', 'id', 'taxid', 'number', 'doc'];
          const sinonimosEmpresa = ['empresa', 'companhia', 'company', 'organization', 'setor', 'org', 'filial'];
          const sinonimosFoto = ['foto', 'imagem', 'url', 'avatar', 'picture'];

          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const items = textContent.items as any[];
            
            // 1. Agrupar itens por Y com tolerância vertical de 10px (cobre desalinhamentos de linha)
            const linhasMap: { [key: number]: any[] } = {};
            items.forEach(item => {
              if (!item.str || !item.str.trim()) return;
              const y = item.transform[5];
              let foundY = Object.keys(linhasMap).map(Number).find(key => Math.abs(key - y) < 10);
              if (foundY !== undefined) {
                linhasMap[foundY].push(item);
              } else {
                linhasMap[y] = [item];
              }
            });
            
            // Ordenar linhas de cima para baixo
            const yCoordenadas = Object.keys(linhasMap).map(Number).sort((a, b) => b - a);
            
            // Mapearemos os X médios de cada coluna identificada
            let xNome = -1;
            let xCpf = -1;
            let xEmpresa = -1;
            let xFoto = -1;

            const linhasProcessadas: { y: number; itens: any[] }[] = [];
            
            yCoordenadas.forEach(y => {
              // Ordenar itens horizontalmente da esquerda para a direita (coordenada X)
              const itensLinha = linhasMap[y].sort((a, b) => a.transform[4] - b.transform[4]);
              linhasProcessadas.push({ y, itens: itensLinha });
            });

            // 2. Tentar detectar cabeçalho nas primeiras linhas da página
            for (let i = 0; i < Math.min(linhasProcessadas.length, 10); i++) {
              const { itens } = linhasProcessadas[i];
              let temNome = false;
              let temCpf = false;
              
              itens.forEach(item => {
                const txt = item.str.toLowerCase();
                const x = item.transform[4];
                
                if (sinonimosNome.some(s => txt === s || txt.includes(s))) {
                  xNome = x;
                  temNome = true;
                }
                if (sinonimosCpf.some(s => txt === s || txt.includes(s))) {
                  xCpf = x;
                  temCpf = true;
                }
                if (sinonimosEmpresa.some(s => txt === s || txt.includes(s))) {
                  xEmpresa = x;
                }
                if (sinonimosFoto.some(s => txt === s || txt.includes(s))) {
                  xFoto = x;
                }
              });

              if (temNome && temCpf) {
                linhasProcessadas.splice(0, i + 1); // remove linha do cabeçalho
                break;
              }
            }

            const usarOrdenacaoPadrao = (xNome === -1 || xCpf === -1);

            // 3. Processar as linhas de dados do PDF
            for (const { itens } of linhasProcessadas) {
              let nomeVal = '';
              let cpfVal = '';
              let empresaVal = '';
              let fotoVal = '';

              if (usarOrdenacaoPadrao) {
                if (itens.length >= 2) {
                  const indexPrimeiroTexto = itens.findIndex(it => !/^\d+$/.test(it.str.replace(/\D/g, '')));
                  if (indexPrimeiroTexto !== -1) {
                    nomeVal = itens[indexPrimeiroTexto].str.trim();
                  }
                  const indexCpf = itens.findIndex(it => it.str.replace(/\D/g, '').length === 11);
                  if (indexCpf !== -1) {
                    cpfVal = itens[indexCpf].str.replace(/\D/g, '');
                  }
                  const itensRestantes = itens.filter((it, idx) => idx !== indexPrimeiroTexto && idx !== indexCpf);
                  if (itensRestantes.length > 0) {
                    empresaVal = itensRestantes[0].str.trim();
                  }
                }
              } else {
                itens.forEach(item => {
                  const x = item.transform[4];
                  const val = item.str.trim();
                  if (!val) return;

                  const distNome = Math.abs(x - xNome);
                  const distCpf = Math.abs(x - xCpf);
                  const distEmpresa = xEmpresa !== -1 ? Math.abs(x - xEmpresa) : 99999;
                  const distFoto = xFoto !== -1 ? Math.abs(x - xFoto) : 99999;

                  const minDist = Math.min(distNome, distCpf, distEmpresa, distFoto);

                  if (minDist === distCpf) {
                    cpfVal = val.replace(/\D/g, '');
                  } else if (minDist === distNome) {
                    nomeVal = val;
                  } else if (minDist === distEmpresa) {
                    empresaVal = val;
                  } else if (minDist === distFoto) {
                    fotoVal = val;
                  }
                });
              }

              if (cpfVal.length === 11 && nomeVal) {
                const pLower = nomeVal.toLowerCase();
                const termosIgnorar = ['nome', 'cpf', 'rg', 'telefone', 'email', 'e-mail', 'cargo', 'função', 'funcao'];
                if (termosIgnorar.includes(pLower)) continue;

                const colab: any = {
                  nomeCompleto: nomeVal,
                  cpf: cpfVal
                };
                if (empresaVal) colab.empresaNome = empresaVal;
                if (fotoVal && (fotoVal.startsWith('http') || fotoVal.includes('.'))) colab.fotoUrl = fotoVal;
                
                if (!colaboradoresPdf.some(c => c.cpf === cpfVal)) {
                  colaboradoresPdf.push(colab);
                }
              }
            }
          }
          resolve(colaboradoresPdf);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  // Função para processar arquivo Excel/CSV/PDF localmente com mapeamento inteligente
  const handleProcessarPlanilha = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoteArquivo(file);
    setLoteFeedback(null);
    setLoteDadosExcel([]);
    setPreviaMapeamento(null);

    // Se o arquivo for PDF
    if (file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const colaboradoresPdf = await lerTextoDoPDFEstruturado(file);
        if (colaboradoresPdf.length === 0) {
          setLoteFeedback({ 
            tipo: 'erro', 
            msg: 'Não encontramos nenhuma tabela de cadastros estruturada no PDF. Verifique se o PDF contém dados de Nome e CPF válidos.' 
          });
          return;
        }

        setLoteDadosExcel(colaboradoresPdf);
        setPreviaMapeamento({
          nomeColunaNome: 'Extraído automaticamente por colunas no PDF',
          nomeColunaCpf: 'Extraído automaticamente por colunas no PDF'
        });
      } catch (err: any) {
        console.error(err);
        setLoteFeedback({ tipo: 'erro', msg: err.message || 'Erro ao processar o arquivo PDF.' });
      }
      return;
    }

    // Se for Planilha Excel/CSV
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        if (rows.length < 2) {
          setLoteFeedback({ tipo: 'erro', msg: 'A planilha está vazia ou sem cabeçalhos de dados.' });
          return;
        }

        // Procura dinâmica em qual linha está a linha de cabeçalho (varrendo as primeiras 15 linhas)
        let headerRowIndex = -1;
        let colIndexNome = -1;
        let colIndexCpf = -1;
        let colIndexEmpresa = -1;
        let colIndexFoto = -1;

        const sinonimosNome = ['nome', 'nome completo', 'colaborador', 'prestador', 'funcionário', 'nome_completo', 'name', 'full name', 'completo'];
        const sinonimosCpf = ['cpf', 'cadastro de pessoa física', 'documento', 'identificação', 'id', 'taxid', 'number', 'doc', 'cpf/cnpj'];
        const sinonimosEmpresa = ['empresa', 'companhia', 'company', 'organization', 'setor', 'org', 'filial'];
        const sinonimosFoto = ['foto', 'foto url', 'foto_url', 'image', 'picture', 'imagem', 'url', 'avatar'];

        for (let i = 0; i < Math.min(rows.length, 15); i++) {
          const row = rows[i];
          if (!row || !Array.isArray(row)) continue;
          
          const rowHeaders = Array.from(row, cell => String(cell || '').trim().toLowerCase());
          const indexNome = rowHeaders.findIndex(h => h && sinonimosNome.some(s => h === s || h.includes(s)));
          const indexCpf = rowHeaders.findIndex(h => h && sinonimosCpf.some(s => h === s || h.includes(s)));
          const indexEmpresa = rowHeaders.findIndex(h => h && sinonimosEmpresa.some(s => h === s || h.includes(s)));
          const indexFoto = rowHeaders.findIndex(h => h && sinonimosFoto.some(s => h === s || h.includes(s)));

          if (indexNome !== -1 && indexCpf !== -1) {
            headerRowIndex = i;
            colIndexNome = indexNome;
            colIndexCpf = indexCpf;
            colIndexEmpresa = indexEmpresa;
            colIndexFoto = indexFoto;
            break;
          }
        }

        // Fallback para linha 0 se não achar nada nas primeiras 15 linhas
        if (headerRowIndex === -1) {
          const headers = Array.from(rows[0] || [], h => String(h || '').trim().toLowerCase());
          colIndexNome = headers.findIndex(h => h && sinonimosNome.some(s => h === s || h.includes(s)));
          colIndexCpf = headers.findIndex(h => h && sinonimosCpf.some(s => h === s || h.includes(s)));
          colIndexEmpresa = headers.findIndex(h => h && sinonimosEmpresa.some(s => h === s || h.includes(s)));
          colIndexFoto = headers.findIndex(h => h && sinonimosFoto.some(s => h === s || h.includes(s)));
          headerRowIndex = 0;
        }

        if (colIndexNome === -1 || colIndexCpf === -1) {
          const colNomeSugerida = colIndexNome !== -1 ? rows[headerRowIndex][colIndexNome] : 'Não localizada';
          const colCpfSugerida = colIndexCpf !== -1 ? rows[headerRowIndex][colIndexCpf] : 'Não localizada';
          setLoteFeedback({ 
            tipo: 'erro', 
            msg: `Não conseguimos identificar as colunas de Nome e CPF. Identificado Nome: [${colNomeSugerida}], CPF: [${colCpfSugerida}]. Por favor, certifique-se de que a planilha possui cabeçalhos correspondentes.` 
          });
          return;
        }

        // Mapear linhas para JSON estruturado a partir da linha seguinte à do cabeçalho
        const colaboradoresMapeados: any[] = [];
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          
          const nomeBruto = String(row[colIndexNome] || '').trim();
          const cpfBruto = String(row[colIndexCpf] || '').replace(/\D/g, ''); // limpa caracteres especiais

          if (nomeBruto && cpfBruto.length === 11) {
            const item: any = {
              nomeCompleto: nomeBruto,
              cpf: cpfBruto
            };
            if (colIndexEmpresa !== -1 && row[colIndexEmpresa]) {
              item.empresaNome = String(row[colIndexEmpresa]).trim();
            }
            if (colIndexFoto !== -1 && row[colIndexFoto]) {
              item.fotoUrl = String(row[colIndexFoto]).trim();
            }
            colaboradoresMapeados.push(item);
          }
        }

        if (colaboradoresMapeados.length === 0) {
          setLoteFeedback({ tipo: 'erro', msg: 'Nenhum registro de colaborador com dados válidos (Nome e CPF de 11 dígitos) foi extraído do arquivo.' });
          return;
        }

        setLoteDadosExcel(colaboradoresMapeados);
        setPreviaMapeamento({
          nomeColunaNome: String(rows[headerRowIndex][colIndexNome]),
          nomeColunaCpf: String(rows[headerRowIndex][colIndexCpf])
        });
      } catch (err) {
        console.error(err);
        setLoteFeedback({ tipo: 'erro', msg: 'Houve uma falha ao ler o arquivo de planilha. Verifique a integridade do arquivo.' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Enviar a importação em lote para o servidor
  const handleImportarLoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loteDadosExcel.length === 0) {
      setLoteFeedback({ tipo: 'erro', msg: 'Nenhum colaborador carregado para cadastrar.' });
      return;
    }

    // Verificar se algum colaborador não tem empresa na planilha
    const precisaFallbackEmpresa = loteDadosExcel.some(c => !c.empresaNome);
    if (precisaFallbackEmpresa && !empresaIdLote && !criarEmpresaNoLote) {
      setLoteFeedback({ tipo: 'erro', msg: 'O arquivo contém colaboradores sem empresa definida. Por favor, selecione uma empresa ou defina a criação de uma nova.' });
      return;
    }
    if (criarEmpresaNoLote && !novoNomeEmpresaLote.trim()) {
      setLoteFeedback({ tipo: 'erro', msg: 'Digite o nome da nova empresa a ser cadastrada.' });
      return;
    }

    // Identificar empresas desconhecidas escritas no documento
    const nomesEmpresasLote = Array.from(new Set(
      loteDadosExcel
        .map(c => c.empresaNome?.trim())
        .filter((nome): nome is string => !!nome)
    ));

    const desconhecidas = nomesEmpresasLote.filter(
      nome => !empresas.some(e => e.nome.toLowerCase() === nome.toLowerCase())
    );

    if (desconhecidas.length > 0 && !showConciliacaoModal) {
      // Abre o modal de conciliação
      const resolucoesIniciais: typeof conciliacaoResolvida = {};
      desconhecidas.forEach(nome => {
        resolucoesIniciais[nome] = { action: 'CRIAR', value: nome };
      });
      setConciliacaoResolvida(resolucoesIniciais);
      setEmpresasDesconhecidasLote(desconhecidas);
      setShowConciliacaoModal(true);
      return;
    }

    setLoteFeedback(null);
    setShowConciliacaoModal(false);
    try {
      const payload = loteDadosExcel.map(c => {
        let finalEmpresaId = c.empresaNome ? undefined : empresaIdLote;
        let finalEmpresaNome = c.empresaNome || (criarEmpresaNoLote ? novoNomeEmpresaLote.trim() : undefined);

        // Aplicar resolução de conciliação se houver
        if (c.empresaNome && conciliacaoResolvida[c.empresaNome]) {
          const res = conciliacaoResolvida[c.empresaNome];
          if (res.action === 'EXISTENTE') {
            finalEmpresaId = res.value;
            finalEmpresaNome = undefined;
          } else {
            finalEmpresaId = undefined;
            finalEmpresaNome = res.value.trim();
          }
        }

        return {
          nomeCompleto: c.nomeCompleto,
          cpf: c.cpf,
          empresaId: finalEmpresaId || undefined,
          empresaNome: finalEmpresaNome || undefined,
          fotoUrl: c.fotoUrl || undefined
        };
      });

      const res = await importarColaboradoresLote(payload);
      setLoteFeedback({
        tipo: 'sucesso',
        msg: `Importação concluída! ${res.criados} novos colaboradores cadastrados com sucesso. ${res.ignorados} registros ignorados por já estarem cadastrados.`
      });
      // Resetar estados
      setLoteDadosExcel([]);
      setPreviaMapeamento(null);
      setLoteArquivo(null);
      setEmpresaIdLote('');
      setNovoNomeEmpresaLote('');
      setCriarEmpresaNoLote(false);
      setEmpresasDesconhecidasLote([]);
      setConciliacaoResolvida({});
      loadData(); // atualiza a listagem
    } catch (err: any) {
      setLoteFeedback({ tipo: 'erro', msg: err.message || 'Erro ao realizar a importação.' });
    }
  };

  // Ações de Edição de Cadastro
  const handleSelecionarColaboradorParaEditar = (colabId: string) => {
    const colab = colaboradores.find(c => c.id === colabId);
    if (!colab) return;

    setColabSelecionadoId(colab.id);
    setEditNome(colab.nomeCompleto);
    setEditCpf(colab.cpf);
    setEditEmpresaId(colab.empresa.id);
    setEditFotoUrl(colab.fotoUrl || '');
    setEditFotoBase64(colab.fotoUrl || '');
    setEditFeedback(null);
  };

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colabSelecionadoId) return;

    const cpfLimpo = editCpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      setEditFeedback({ tipo: 'erro', msg: 'O CPF deve possuir exatamente 11 dígitos.' });
      return;
    }

    if (!editNome.trim() || !editEmpresaId) {
      setEditFeedback({ tipo: 'erro', msg: 'Nome Completo e Empresa são obrigatórios.' });
      return;
    }

    setEditFeedback(null);
    try {
      await atualizarColaborador(colabSelecionadoId, {
        nomeCompleto: editNome.trim(),
        cpf: cpfLimpo,
        empresaId: editEmpresaId,
        fotoUrl: editFotoBase64 || editFotoUrl || undefined
      });

      setEditFeedback({ tipo: 'sucesso', msg: 'Cadastro atualizado com sucesso!' });
      loadData();
    } catch (err: any) {
      setEditFeedback({ tipo: 'erro', msg: err.message || 'Falha ao salvar as alterações.' });
    }
  };

  const handleDeletarCadastro = async () => {
    if (!colabSelecionadoId) return;
    const confirmou = window.confirm('Deseja realmente excluir permanentemente este cadastro? Esta ação não pode ser desfeita.');
    if (!confirmou) return;

    setEditFeedback(null);
    try {
      await deletarColaborador(colabSelecionadoId);
      setEditFeedback({ tipo: 'sucesso', msg: 'Cadastro excluído permanentemente!' });
      
      // Limpar estados
      setColabSelecionadoId('');
      setEditNome('');
      setEditCpf('');
      setEditEmpresaId('');
      setEditFotoUrl('');
      setEditFotoBase64('');
      loadData();
    } catch (err: any) {
      setEditFeedback({ tipo: 'erro', msg: err.message || 'Erro ao deletar o cadastro.' });
    }
  };

  const handleEditFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditFotoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Ações de Fluxo Direto pelo Modal do Olho
  const handleAbrirCartaoVisualizacao = (colab: ColaboradorComStatus) => {
    setColabVisualizando(colab);
    setOpEntradaVisualizando('');
    setDescServicoVisualizando('');
    setOpSaidaVisualizando('');
    setServExtrasVisualizando('');
  };

  const handleCheckInVisualizando = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colabVisualizando) return;
    if (!opEntradaVisualizando.trim() || !descServicoVisualizando.trim()) {
      alert('Operador e descrição do serviço são obrigatórios.');
      return;
    }

    try {
      await realizarCheckIn(colabVisualizando.id, opEntradaVisualizando.trim(), descServicoVisualizando.trim());
      setColabVisualizando(prev => prev ? { ...prev, status: 'DENTRO' } : null);
      setOpEntradaVisualizando('');
      setDescServicoVisualizando('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao processar check-in.');
    }
  };

  const handleCheckOutVisualizando = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colabVisualizando) return;
    if (!opSaidaVisualizando.trim()) {
      alert('Operador de saída é obrigatório.');
      return;
    }

    try {
      await realizarCheckOut(colabVisualizando.id, opSaidaVisualizando.trim(), servExtrasVisualizando.trim() || undefined);
      setColabVisualizando(prev => prev ? { ...prev, status: 'FORA' } : null);
      setOpSaidaVisualizando('');
      setServExtrasVisualizando('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao processar check-out.');
    }
  };

  const loadData = () => {
    startTransition(async () => {
      try {
        const [colabsData, empresasData] = await Promise.all([
          getColaboradoresComStatus(),
          getEmpresas()
        ]);
        setColaboradores(colabsData);
        setEmpresas(empresasData);
      } catch (err) {
        console.error(err);
      }
    });
  };

  useEffect(() => {
    loadData();

    // Ler parâmetros da URL para preenchimento automático a partir do atalho de busca da Home
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const nomeParam = params.get('nome');
      const cpfParam = params.get('cpf');
      if (nomeParam) {
        setNomeColab(decodeURIComponent(nomeParam));
      }
      if (cpfParam) {
        setCpfColab(decodeURIComponent(cpfParam).replace(/\D/g, ''));
      }
    }
  }, []);

  // Filtrar colaboradores cadastrados localmente
  const colaboradoresFiltrados = colaboradores.filter(colab => {
    return !filtroEmpresa || colab.empresa.nome === filtroEmpresa;
  });

  const handleCadastrarColaborador = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroColab('');
    setSucessoColab('');

    // Validar CPF tamanho mínimo
    const cpfLimpo = cpfColab.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      setErroColab('O CPF deve conter exatamente 11 dígitos.');
      return;
    }

    if (!nomeColab.trim() || !empresaIdColab) {
      setErroColab('Nome completo e Empresa são campos obrigatórios.');
      return;
    }

    try {
      await cadastrarColaborador({
        nomeCompleto: nomeColab.trim(),
        cpf: cpfLimpo,
        empresaId: empresaIdColab,
        fotoUrl: fotoUrlColab.trim() || undefined
      });

      setSucessoColab('Colaborador cadastrado com sucesso!');
      setNomeColab('');
      setCpfColab('');
      setEmpresaIdColab('');
      setFotoUrlColab('');
      setFotoBase64(''); // Limpar preview de arquivo
      loadData();
    } catch (err: any) {
      setErroColab(err.message || 'Erro ao cadastrar colaborador.');
    }
  };

  const handleCadastrarEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroEmpresa('');
    setSucessoEmpresa('');

    if (!nomeEmpresa.trim()) {
      setErroEmpresa('O nome da empresa é obrigatório.');
      return;
    }

    try {
      await cadastrarEmpresa(nomeEmpresa.trim());
      setSucessoEmpresa('Empresa cadastrada com sucesso!');
      setNomeEmpresa('');
      loadData();
    } catch (err: any) {
      setErroEmpresa(err.message || 'Erro ao cadastrar empresa.');
    }
  };

  // Formatar CPF enquanto digita
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    if (rawVal.length <= 11) {
      setCpfColab(rawVal);
    }
  };

  const formatCpfDisplay = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  return (
    <div className="flex flex-col gap-8 animate-[fadeIn_0.4s_ease-out]">
      {/* Abas Superiores */}
      <div className="flex gap-4 border-b border-[rgba(255,255,255,0.03)] pb-px">
        <button
          onClick={() => setActiveTab('colab')}
          className={`px-6 py-3.5 text-[13px] font-bold uppercase tracking-[1.5px] border-b-2 cursor-pointer transition-all ${
            activeTab === 'colab'
              ? 'border-[var(--accent-red)] text-white'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Colaboradores & Prestadores
        </button>
        <button
          onClick={() => setActiveTab('emp')}
          className={`px-6 py-3.5 text-[13px] font-bold uppercase tracking-[1.5px] border-b-2 cursor-pointer transition-all ${
            activeTab === 'emp'
              ? 'border-[var(--accent-red)] text-white'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Empresas Credenciadas
        </button>
        <button
          onClick={() => setActiveTab('lote')}
          className={`px-6 py-3.5 text-[13px] font-bold uppercase tracking-[1.5px] border-b-2 cursor-pointer transition-all ${
            activeTab === 'lote'
              ? 'border-[var(--accent-red)] text-white'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Arquivo de Dados
        </button>
        <button
          onClick={() => setActiveTab('editar')}
          className={`px-6 py-3.5 text-[13px] font-bold uppercase tracking-[1.5px] border-b-2 cursor-pointer transition-all ${
            activeTab === 'editar'
              ? 'border-[var(--accent-red)] text-white'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Editar Perfis
        </button>
      </div>

      {activeTab === 'colab' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Formulário de Cadastro de Colaborador */}
          <div className="glass-card p-6 flex flex-col gap-6 lg:col-span-1">
            <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.03)] pb-3">
              <span className="material-symbols-outlined text-[var(--accent-red)]">person_add</span>
              <h3 className="text-[14px] font-black uppercase tracking-[1.5px] text-white">Cadastrar Colaborador</h3>
            </div>

            <form onSubmit={handleCadastrarColaborador} className="flex flex-col gap-5">
              {erroColab && (
                <div className="p-4 rounded-xl border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.05)] text-[12px] text-red-400 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {erroColab}
                </div>
              )}
              {sucessoColab && (
                <div className="p-4 rounded-xl border border-[rgba(52,211,153,0.2)] bg-[rgba(52,211,153,0.05)] text-[12px] text-[var(--status-active)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  {sucessoColab}
                </div>
              )}

              {/* Nome */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400">Nome Completo</label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Eduardo Souza"
                  value={nomeColab}
                  onChange={(e) => setNomeColab(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] transition-all"
                  required
                />
              </div>

              {/* CPF */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400">CPF (Apenas números)</label>
                <input
                  type="text"
                  placeholder="Ex: 12345678901"
                  value={cpfColab}
                  onChange={handleCpfChange}
                  className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] transition-all"
                  required
                />
                {cpfColab && (
                  <span className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Formatado: {formatCpfDisplay(cpfColab)}
                  </span>
                )}
              </div>

              {/* Empresa */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400">Empresa Associada</label>
                <select
                  value={empresaIdColab}
                  onChange={(e) => setEmpresaIdColab(e.target.value)}
                  className="px-4 py-3.5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] cursor-pointer transition-all"
                  required
                >
                  <option value="" disabled>Selecione a empresa...</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id} className="bg-[#0c122b] text-white">
                      {emp.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Foto do Colaborador */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400">Foto do Colaborador</label>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFotoBase64(reader.result as string);
                          setFotoUrlColab(reader.result as string); // Salva base64 na coluna de URL (suporta long text)
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-slate-300 text-[12px] file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-[var(--accent-red)] file:text-white file:cursor-pointer hover:file:bg-[var(--accent-red-hover)] transition-all cursor-pointer"
                  />
                  {fotoBase64 && (
                    <div className="w-16 h-16 rounded-xl border border-[rgba(255,255,255,0.1)] overflow-hidden bg-slate-900 mt-1 self-start">
                      <img src={fotoBase64} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3.5 rounded-xl text-[13px] font-bold bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white shadow-[0_0_20px_rgba(255,26,60,0.15)] flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Finalizar Cadastro
              </button>
            </form>
          </div>

          {/* Listagem de Colaboradores */}
          <div className="glass-card overflow-hidden lg:col-span-2">
            <div className="px-6 py-5 border-b border-[rgba(255,255,255,0.03)] bg-[rgba(255,255,255,0.01)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <span className="text-[12px] font-black uppercase tracking-[1.5px] text-slate-400">
                Colaboradores Cadastrados ({colaboradoresFiltrados.length})
              </span>
              
              <div className="w-full sm:w-48 shrink-0">
                <select
                  value={filtroEmpresa}
                  onChange={(e) => setFiltroEmpresa(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[12px] outline-none focus:border-[var(--accent-red)] cursor-pointer transition-all"
                >
                  <option value="">Todas as empresas</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.nome} className="bg-[#0c122b] text-white">
                      {emp.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.03)] bg-[rgba(255,26,60,0.01)] text-[9px] font-black uppercase tracking-[1.5px] text-slate-400">
                    <th className="px-6 py-4">Foto / Nome</th>
                    <th className="px-6 py-4">CPF</th>
                    <th className="px-6 py-4">Empresa</th>
                    <th className="px-6 py-4 text-center">Status Atual</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.02)] text-[13px]">
                  {colaboradoresFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-medium">
                        Nenhum colaborador cadastrado correspondente ao filtro.
                      </td>
                    </tr>
                  ) : (
                    colaboradoresFiltrados.map((colab) => (
                      <tr key={colab.id} className="hover:bg-[rgba(255,255,255,0.005)]">
                        <td className="px-6 py-3.5 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-[rgba(255,255,255,0.06)] bg-slate-900 shrink-0">
                            {colab.fotoUrl ? (
                              <img src={colab.fotoUrl} alt={colab.nomeCompleto} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-[rgba(255,26,60,0.05)] text-[var(--accent-red)] font-black text-[10px]">
                                {colab.nomeCompleto.split(' ').map(n => n[0]).slice(0, 2).join('')}
                              </div>
                            )}
                          </div>
                          <span className="font-bold text-white leading-tight">{colab.nomeCompleto}</span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-300 font-mono">
                          {formatCpfDisplay(colab.cpf)}
                        </td>
                        <td className="px-6 py-3.5 text-slate-300">
                          {colab.empresa.nome}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-[0.5px] ${
                            colab.status === 'DENTRO'
                              ? 'bg-[rgba(52,211,153,0.1)] text-[var(--status-active)]'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {colab.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <button
                            onClick={() => handleAbrirCartaoVisualizacao(colab)}
                            className="p-1.5 rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-white bg-[rgba(255,255,255,0.02)] text-slate-400 hover:text-white transition-all cursor-pointer inline-flex items-center justify-center"
                            title="Ver Perfil"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'emp' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Formulário de Cadastro de Empresa */}
          <div className="glass-card p-6 flex flex-col gap-6 lg:col-span-1">
            <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.03)] pb-3">
              <span className="material-symbols-outlined text-[var(--accent-red)]">domain_add</span>
              <h3 className="text-[14px] font-black uppercase tracking-[1.5px] text-white">Cadastrar Empresa</h3>
            </div>

            <form onSubmit={handleCadastrarEmpresa} className="flex flex-col gap-5">
              {erroEmpresa && (
                <div className="p-4 rounded-xl border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.05)] text-[12px] text-red-400 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {erroEmpresa}
                </div>
              )}
              {sucessoEmpresa && (
                <div className="p-4 rounded-xl border border-[rgba(52,211,153,0.2)] bg-[rgba(52,211,153,0.05)] text-[12px] text-[var(--status-active)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  {sucessoEmpresa}
                </div>
              )}

              {/* Nome da Empresa */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400">Nome da Empresa</label>
                <input
                  type="text"
                  placeholder="Ex: TI Soluções, Segurança Forte..."
                  value={nomeEmpresa}
                  onChange={(e) => setNomeEmpresa(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3.5 rounded-xl text-[13px] font-bold bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white shadow-[0_0_20px_rgba(255,26,60,0.15)] flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Cadastrar Empresa
              </button>
            </form>
          </div>

          {/* Listagem de Empresas */}
          <div className="glass-card overflow-hidden lg:col-span-2">
            <div className="px-6 py-5 border-b border-[rgba(255,255,255,0.03)] bg-[rgba(255,255,255,0.01)] flex justify-between items-center">
              <span className="text-[12px] font-black uppercase tracking-[1.5px] text-slate-400">Empresas Cadastradas ({empresas.length})</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.03)] bg-[rgba(255,26,60,0.01)] text-[9px] font-black uppercase tracking-[1.5px] text-slate-400">
                    <th className="px-6 py-4">Nome da Empresa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.02)] text-[13px]">
                  {empresas.length === 0 ? (
                    <tr>
                      <td className="px-6 py-8 text-center text-slate-500 font-medium">
                        Nenhuma empresa cadastrada. Use o formulário lateral.
                      </td>
                    </tr>
                  ) : (
                    empresas.map((emp) => (
                      <tr key={emp.id} className="hover:bg-[rgba(255,255,255,0.005)]">
                        <td className="px-6 py-3.5">
                          <button
                            onClick={() => {
                              setFiltroEmpresa(emp.nome);
                              setActiveTab('colab');
                            }}
                            className="text-white font-bold hover:text-[var(--accent-red)] hover:underline transition-all text-left cursor-pointer bg-transparent border-0 p-0"
                          >
                            {emp.nome}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'lote' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Formulário de Upload do Arquivo de Dados */}
          <div className="glass-card p-6 flex flex-col gap-6 lg:col-span-1">
            <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.03)] pb-3 text-slate-400">
              <span className="material-symbols-outlined text-[18px]">folder_open</span>
              <h3 className="text-[13px] font-bold uppercase tracking-[1.5px] text-slate-200">Arquivo de Dados</h3>
            </div>

            <form onSubmit={handleImportarLoteSubmit} className="flex flex-col gap-5">
              {loteFeedback && (
                <div className={`p-4 rounded-xl border text-[12px] flex items-start gap-2 ${
                  loteFeedback.tipo === 'sucesso' 
                    ? 'border-[rgba(52,211,153,0.2)] bg-[rgba(52,211,153,0.05)] text-[var(--status-active)]' 
                    : 'border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.05)] text-red-400'
                }`}>
                  <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">
                    {loteFeedback.tipo === 'sucesso' ? 'check_circle' : 'error'}
                  </span>
                  <span className="leading-normal">{loteFeedback.msg}</span>
                </div>
              )}

              {/* Empresa Destino */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400">Associar Colaboradores à Empresa</label>
                <select
                  value={criarEmpresaNoLote ? 'NOVA' : empresaIdLote}
                  onChange={(e) => {
                    if (e.target.value === 'NOVA') {
                      setCriarEmpresaNoLote(true);
                      setEmpresaIdLote('');
                    } else {
                      setCriarEmpresaNoLote(false);
                      setEmpresaIdLote(e.target.value);
                    }
                  }}
                  className="px-4 py-3.5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] cursor-pointer transition-all"
                >
                  <option value="" disabled={!criarEmpresaNoLote}>Selecione a empresa...</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id} className="bg-[#0c122b] text-white">
                      {emp.nome}
                    </option>
                  ))}
                  <option value="NOVA" className="bg-[#0c122b] text-[var(--accent-red)] font-bold">
                    + Criar uma Nova Empresa...
                  </option>
                </select>
              </div>

              {/* Nome da Nova Empresa */}
              {criarEmpresaNoLote && (
                <div className="flex flex-col gap-1.5 animate-[fadeIn_0.2s_ease-out]">
                  <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400">Nome da Nova Empresa</label>
                  <input
                    type="text"
                    placeholder="Ex: Farmasi TI, GL Staff..."
                    value={novoNomeEmpresaLote}
                    onChange={(e) => setNovoNomeEmpresaLote(e.target.value)}
                    className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] transition-all"
                    required
                  />
                </div>
              )}

              {/* Upload de Planilha / PDF */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400">Carregar Documento (Excel / CSV / PDF)</label>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv, .pdf"
                  onChange={handleProcessarPlanilha}
                  className="px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-slate-300 text-[12px] file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-[var(--accent-red)] file:text-white file:cursor-pointer hover:file:bg-[var(--accent-red-hover)] transition-all cursor-pointer"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isPending || loteDadosExcel.length === 0 || ((loteDadosExcel.some(c => !c.empresaNome) && !empresaIdLote) && !criarEmpresaNoLote)}
                className="w-full py-3.5 rounded-xl text-[13px] font-bold bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none text-white shadow-[0_0_20px_rgba(255,26,60,0.15)] flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
                Finalizar Cadastro ({loteDadosExcel.length} Pessoas)
              </button>
            </form>
          </div>

          {/* Listagem de Pré-visualização do Documento */}
          <div className="glass-card overflow-hidden lg:col-span-2">
            <div className="px-6 py-5 border-b border-[rgba(255,255,255,0.03)] bg-[rgba(255,255,255,0.01)]">
              <span className="text-[12px] font-black uppercase tracking-[1.5px] text-slate-400">Dados Identificados no Documento</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.03)] bg-[rgba(255,26,60,0.01)] text-[9px] font-black uppercase tracking-[1.5px] text-slate-400">
                    <th className="px-6 py-4">Nome Identificado</th>
                    <th className="px-6 py-4">CPF Identificado</th>
                    <th className="px-6 py-4">Empresa Mapeada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.02)] text-[13px]">
                  {loteDadosExcel.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-slate-500 font-medium">
                        Selecione a empresa e envie o arquivo Excel/CSV/PDF para visualizar a prévia dos colaboradores mapeados.
                      </td>
                    </tr>
                  ) : (
                    loteDadosExcel.map((colab, idx) => (
                      <tr key={idx} className="hover:bg-[rgba(255,255,255,0.005)]">
                        <td className="px-6 py-3 text-white font-bold">
                          {colab.nomeCompleto}
                        </td>
                        <td className="px-6 py-3 text-slate-300 font-mono">
                          {colab.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                        </td>
                        <td className="px-6 py-3 text-slate-300 font-medium">
                          {colab.empresaNome ? (
                            <span className="text-cyan-400 font-bold">{colab.empresaNome}</span>
                          ) : (
                            <span className="text-slate-500 italic">Usará Fallback</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'editar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Seletor de Colaborador */}
          <div className="glass-card p-6 flex flex-col gap-6 lg:col-span-1">
            <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.03)] pb-3 text-slate-400">
              <span className="material-symbols-outlined text-[18px]">search</span>
              <h3 className="text-[13px] font-bold uppercase tracking-[1.5px] text-slate-200">Selecionar Cadastro</h3>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400">Pesquisar por Nome ou CPF</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Digite para buscar..."
                    value={termoPesquisaEditar}
                    onChange={(e) => setTermoPesquisaEditar(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] transition-all"
                  />
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">search</span>
                </div>
              </div>

              {/* Lista filtrada de colaboradores para edição */}
              <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1 border border-[rgba(255,255,255,0.03)] rounded-xl p-2 bg-[rgba(0,0,0,0.2)]">
                {colaboradores
                  .filter(c => 
                    c.nomeCompleto.toLowerCase().includes(termoPesquisaEditar.toLowerCase()) || 
                    c.cpf.includes(termoPesquisaEditar)
                  )
                  .map(colab => (
                    <button
                      key={colab.id}
                      onClick={() => handleSelecionarColaboradorParaEditar(colab.id)}
                      className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all text-left ${
                        colabSelecionadoId === colab.id
                          ? 'bg-[rgba(255,26,60,0.1)] border border-[rgba(255,26,60,0.3)] text-white'
                          : 'hover:bg-[rgba(255,255,255,0.02)] border border-transparent text-slate-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-slate-800 border border-[rgba(255,255,255,0.05)]">
                        <img
                          src={colab.fotoUrl || '/avatar_placeholder.png'}
                          alt={colab.nomeCompleto}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-bold truncate leading-tight">{colab.nomeCompleto}</span>
                        <span className="text-[10px] text-slate-500 font-mono tracking-[0.5px]">
                          {colab.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                        </span>
                      </div>
                    </button>
                  ))
                }
                {colaboradores.filter(c => 
                  c.nomeCompleto.toLowerCase().includes(termoPesquisaEditar.toLowerCase()) || 
                  c.cpf.includes(termoPesquisaEditar)
                ).length === 0 && (
                  <span className="text-[11px] text-slate-500 text-center py-4">Nenhum colaborador encontrado.</span>
                )}
              </div>
            </div>
          </div>

          {/* Form de Edição e Detalhes */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {!colabSelecionadoId ? (
              <div className="glass-card p-12 flex flex-col items-center justify-center text-center gap-4">
                <span className="material-symbols-outlined text-[48px] text-slate-600">badge</span>
                <div className="flex flex-col gap-1">
                  <h4 className="text-[14px] font-bold text-slate-300">Nenhum Perfil Selecionado</h4>
                  <p className="text-[12px] text-slate-500 max-w-sm">Use o menu lateral esquerdo para pesquisar e selecionar o colaborador que deseja gerenciar.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                {/* Coluna do Preview Atual */}
                <div className="glass-card p-6 flex flex-col items-center text-center gap-5 md:col-span-1">
                  <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400 self-start">Perfil Atual</span>
                  <div className="w-[120px] h-[120px] rounded-full overflow-hidden border-2 border-[rgba(255,26,60,0.15)] shadow-[0_0_20px_rgba(255,26,60,0.1)] relative">
                    <img
                      src={editFotoBase64 || editFotoUrl || '/avatar_placeholder.png'}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[15px] font-black text-white leading-tight">{editNome || 'Nome do Colaborador'}</span>
                    <span className="text-[10px] text-slate-400 font-mono tracking-[0.5px]">
                      {editCpf ? editCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : 'CPF'}
                    </span>
                  </div>
                </div>

                {/* Coluna do Formulário de Edição */}
                <div className="glass-card p-6 md:col-span-2 flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.03)] pb-3">
                    <span className="text-[12px] font-black uppercase tracking-[1.5px] text-slate-400">Alterar Informações</span>
                    <button
                      onClick={() => setColabSelecionadoId('')}
                      className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-500 hover:text-slate-300 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span> Fechar
                    </button>
                  </div>

                  <form onSubmit={handleSalvarEdicao} className="flex flex-col gap-5">
                    {editFeedback && (
                      <div className={`p-4 rounded-xl border text-[12px] flex items-start gap-2 ${
                        editFeedback.tipo === 'sucesso' 
                          ? 'border-[rgba(52,211,153,0.2)] bg-[rgba(52,211,153,0.05)] text-[var(--status-active)]' 
                          : 'border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.05)] text-red-400'
                      }`}>
                        <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">
                          {editFeedback.tipo === 'sucesso' ? 'check_circle' : 'error'}
                        </span>
                        <span className="leading-normal">{editFeedback.msg}</span>
                      </div>
                    )}

                    {/* Nome Completo */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400">Nome Completo</label>
                      <input
                        type="text"
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] transition-all"
                        required
                      />
                    </div>

                    {/* CPF */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400">CPF (Somente Números)</label>
                      <input
                        type="text"
                        value={editCpf}
                        onChange={(e) => setEditCpf(e.target.value.replace(/\D/g, ''))}
                        maxLength={11}
                        className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] font-mono outline-none focus:border-[var(--accent-red)] transition-all"
                        required
                      />
                    </div>

                    {/* Empresa */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400">Empresa Associada</label>
                      <select
                        value={editEmpresaId}
                        onChange={(e) => setEditEmpresaId(e.target.value)}
                        className="px-4 py-3.5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] cursor-pointer transition-all"
                        required
                      >
                        {empresas.map((emp) => (
                          <option key={emp.id} value={emp.id} className="bg-[#0c122b] text-white">
                            {emp.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Foto */}
                    <div className="flex flex-col gap-3 border-t border-[rgba(255,255,255,0.03)] pt-4">
                      <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400">Alterar Foto do Perfil</label>
                      
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] text-slate-500 uppercase font-black">URL da Foto (Remota)</span>
                        <input
                          type="url"
                          placeholder="https://exemplo.com/foto.jpg"
                          value={editFotoUrl}
                          onChange={(e) => {
                            setEditFotoUrl(e.target.value);
                            setEditFotoBase64(''); 
                          }}
                          className="px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[12px] outline-none focus:border-[var(--accent-red)] transition-all"
                        />
                      </div>

                      <div className="flex items-center gap-4 py-2">
                        <div className="h-px flex-1 bg-[rgba(255,255,255,0.05)]"></div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-[1px]">Ou envie um arquivo local</span>
                        <div className="h-px flex-1 bg-[rgba(255,255,255,0.05)]"></div>
                      </div>

                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleEditFotoUpload}
                        className="px-4 py-2 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-slate-300 text-[12px] file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-slate-800 file:text-white hover:file:bg-slate-700 transition-all cursor-pointer"
                      />
                    </div>

                    <div className="flex gap-4 border-t border-[rgba(255,255,255,0.03)] pt-5 mt-2">
                      <button
                        type="button"
                        onClick={handleDeletarCadastro}
                        className="flex-1 py-3.5 rounded-xl text-[13px] font-bold border border-red-500/20 hover:border-red-500/50 bg-red-500/5 hover:bg-red-500/10 text-red-400 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                        Excluir Perfil
                      </button>

                      <button
                        type="submit"
                        disabled={isPending}
                        className="flex-[2] py-3.5 rounded-xl text-[13px] font-bold bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] disabled:bg-slate-800 disabled:text-slate-500 text-white shadow-[0_0_20px_rgba(255,26,60,0.15)] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px]">save</span>
                        Salvar Alterações
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Conciliação de Empresas */}
      {showConciliacaoModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="glass-card w-full max-w-xl p-6 flex flex-col gap-6 border border-[rgba(255,255,255,0.08)] bg-[#050812]/95 shadow-2xl rounded-2xl">
            <div className="flex items-center gap-2.5 border-b border-[rgba(255,255,255,0.05)] pb-4 text-slate-300">
              <span className="material-symbols-outlined text-[var(--accent-red)] text-[22px]">domain_verification</span>
              <div className="flex flex-col">
                <h3 className="text-[14px] font-black uppercase tracking-[1px] text-white">Conciliação de Empresas</h3>
                <span className="text-[11px] text-slate-400 leading-normal">Identificamos empresas no documento que ainda não estão registradas no sistema.</span>
              </div>
            </div>

            <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-1">
              {empresasDesconhecidasLote.map(nomeOriginal => {
                const res = conciliacaoResolvida[nomeOriginal] || { action: 'CRIAR', value: nomeOriginal };
                return (
                  <div key={nomeOriginal} className="p-4 rounded-xl border border-[rgba(255,255,255,0.03)] bg-[rgba(255,255,255,0.01)] flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-slate-400">Nome no arquivo:</span>
                      <strong className="text-[12px] text-cyan-400">"{nomeOriginal}"</strong>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setConciliacaoResolvida(prev => ({
                            ...prev,
                            [nomeOriginal]: { action: 'CRIAR', value: nomeOriginal }
                          }));
                        }}
                        className={`py-2 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center gap-1 ${
                          res.action === 'CRIAR'
                            ? 'border-[var(--accent-red)] bg-[rgba(255,26,60,0.08)] text-white'
                            : 'border-[rgba(255,255,255,0.06)] bg-transparent text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">add</span>
                        Criar Nova Empresa
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const primeiraEmp = empresas[0]?.id || '';
                          setConciliacaoResolvida(prev => ({
                            ...prev,
                            [nomeOriginal]: { action: 'EXISTENTE', value: primeiraEmp }
                          }));
                        }}
                        className={`py-2 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center gap-1 ${
                          res.action === 'EXISTENTE'
                            ? 'border-cyan-500/50 bg-cyan-500/10 text-white'
                            : 'border-[rgba(255,255,255,0.06)] bg-transparent text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">link</span>
                        Mapear para Existente
                      </button>
                    </div>

                    {res.action === 'CRIAR' ? (
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold uppercase tracking-[1px] text-slate-500">Nome para Cadastro</label>
                        <input
                          type="text"
                          value={res.value}
                          onChange={(e) => {
                            setConciliacaoResolvida(prev => ({
                              ...prev,
                              [nomeOriginal]: { ...res, value: e.target.value }
                            }));
                          }}
                          className="px-3 py-2 text-[12px] rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white outline-none focus:border-[var(--accent-red)] transition-all"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold uppercase tracking-[1px] text-slate-500">Selecione a Empresa Cadastrada</label>
                        <select
                          value={res.value}
                          onChange={(e) => {
                            setConciliacaoResolvida(prev => ({
                              ...prev,
                              [nomeOriginal]: { ...res, value: e.target.value }
                            }));
                          }}
                          className="px-3 py-2 text-[12px] rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white outline-none focus:border-cyan-500 cursor-pointer"
                        >
                          {empresas.map(emp => (
                            <option key={emp.id} value={emp.id} className="bg-[#0c122b] text-white">
                              {emp.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 border-t border-[rgba(255,255,255,0.05)] pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowConciliacaoModal(false);
                  setEmpresasDesconhecidasLote([]);
                  setConciliacaoResolvida({});
                }}
                className="flex-1 py-3 text-[12px] font-bold border border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.02)] rounded-xl text-slate-400 transition-all cursor-pointer"
              >
                Cancelar Importação
              </button>

              <button
                type="button"
                onClick={(e) => handleImportarLoteSubmit(e)}
                className="flex-1 py-3 text-[12px] font-bold bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white shadow-[0_0_20px_rgba(255,26,60,0.15)] rounded-xl transition-all cursor-pointer"
              >
                Confirmar e Cadastrar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal do Cartão Informativo de Perfil do Colaborador (Visualização & Fluxo) */}
      {colabVisualizando && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[99999] p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="glass-card w-full max-w-md p-6 flex flex-col gap-6 border border-[rgba(255,255,255,0.08)] bg-[#050812]/95 shadow-2xl rounded-2xl relative animate-[fadeIn_0.2s_ease-out]">
            
            {/* Fechar Modal */}
            <button
              onClick={() => setColabVisualizando(null)}
              className="absolute right-4 top-4 w-8 h-8 rounded-lg hover:bg-[rgba(255,255,255,0.05)] text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            {/* Layout de Crachá Operacional */}
            <div className="flex flex-col items-center text-center gap-4 mt-2">
              <span className="text-[9px] font-black uppercase tracking-[2px] text-slate-500">Credencial Operacional</span>
              
              {/* Foto com Mascaramento Suave */}
              <div className="w-[120px] h-[120px] rounded-full overflow-hidden border-2 border-[rgba(255,26,60,0.15)] shadow-[0_0_20px_rgba(255,26,60,0.1)] relative bg-slate-900 shrink-0">
                {colabVisualizando.fotoUrl ? (
                  <img
                    src={colabVisualizando.fotoUrl}
                    alt={colabVisualizando.nomeCompleto}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[rgba(255,26,60,0.05)] text-[var(--accent-red)] font-black text-[32px]">
                    {colabVisualizando.nomeCompleto.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-[16px] font-black text-white leading-tight">{colabVisualizando.nomeCompleto}</h3>
                <span className="text-[11px] text-slate-400 font-mono tracking-[0.5px]">{formatCpfDisplay(colabVisualizando.cpf)}</span>
                <span className="text-[12px] font-bold text-cyan-400 mt-0.5">{colabVisualizando.empresa.nome}</span>
              </div>

              {/* Status de Acesso */}
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  colabVisualizando.status === 'DENTRO'
                    ? 'bg-[var(--status-active)] animate-pulse'
                    : 'bg-red-500'
                }`}></span>
                <span className={`text-[11px] font-black uppercase tracking-[1px] ${
                  colabVisualizando.status === 'DENTRO' ? 'text-[var(--status-active)]' : 'text-red-400'
                }`}>
                  Status: {colabVisualizando.status === 'DENTRO' ? 'Dentro da Arena' : 'Fora da Arena'}
                </span>
              </div>
            </div>

            {/* Ações de Liberação Operacional */}
            <div className="border-t border-[rgba(255,255,255,0.05)] pt-5 flex flex-col gap-4">
              {colabVisualizando.status === 'FORA' ? (
                /* Formulário de Check-in */
                <form onSubmit={handleCheckInVisualizando} className="flex flex-col gap-4">
                  <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400 border-l-2 border-[var(--status-active)] pl-2 text-left">
                    Registrar Check-in (Entrada)
                  </div>
                  
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[9px] font-bold uppercase tracking-[1px] text-slate-500">Operador CCO Responsável</label>
                    <input
                      type="text"
                      placeholder="Ex: CCO João Silva..."
                      value={opEntradaVisualizando}
                      onChange={(e) => setOpEntradaVisualizando(e.target.value)}
                      className="px-3.5 py-2.5 text-[12px] rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white outline-none focus:border-[var(--status-active)] transition-all"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[9px] font-bold uppercase tracking-[1px] text-slate-500">Descrição do Serviço / Destino</label>
                    <input
                      type="text"
                      placeholder="Ex: Manutenção TI no Palco 3..."
                      value={descServicoVisualizando}
                      onChange={(e) => setDescServicoVisualizando(e.target.value)}
                      className="px-3.5 py-2.5 text-[12px] rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white outline-none focus:border-[var(--status-active)] transition-all"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl text-[12px] font-bold bg-[var(--status-active)] hover:bg-[#3bf5b6] text-[#050812] flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-[0_0_15px_rgba(52,211,153,0.15)] mt-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">login</span>
                    Confirmar Check-in de Entrada
                  </button>
                </form>
              ) : (
                /* Formulário de Check-out */
                <form onSubmit={handleCheckOutVisualizando} className="flex flex-col gap-4">
                  <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400 border-l-2 border-red-500 pl-2 text-left">
                    Registrar Check-out (Saída)
                  </div>
                  
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[9px] font-bold uppercase tracking-[1px] text-slate-500">Operador CCO Responsável</label>
                    <input
                      type="text"
                      placeholder="Ex: CCO João Silva..."
                      value={opSaidaVisualizando}
                      onChange={(e) => setOpSaidaVisualizando(e.target.value)}
                      className="px-3.5 py-2.5 text-[12px] rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white outline-none focus:border-red-500 transition-all"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[9px] font-bold uppercase tracking-[1px] text-slate-500">Serviços Extras / Observações (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: Entrega de chaves CCO..."
                      value={servExtrasVisualizando}
                      onChange={(e) => setServExtrasVisualizando(e.target.value)}
                      className="px-3.5 py-2.5 text-[12px] rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white outline-none focus:border-red-500 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl text-[12px] font-bold bg-red-500 hover:bg-red-400 text-white flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-[0_0_15px_rgba(239,68,68,0.15)] mt-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Confirmar Check-out de Saída
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
