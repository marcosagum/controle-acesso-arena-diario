-- =========================================================
-- SCRIPT DE RESTAURAÇÃO E SEEDING DO CONTROLE DE ACESSO ARENA
-- =========================================================

CREATE SCHEMA IF NOT EXISTS "acesso";
SET search_path TO "acesso";

-- 1. CRIAÇÃO DAS TABELAS
CREATE TABLE "tb_empresas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    CONSTRAINT "tb_empresas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tb_colaboradores" (
    "id" TEXT NOT NULL,
    "nome_completo" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "foto_url" TEXT,
    "id_empresa" TEXT NOT NULL,
    CONSTRAINT "tb_colaboradores_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tb_registro_acesso" (
    "id" TEXT NOT NULL,
    "id_colaborador" TEXT NOT NULL,
    "timestamp_entrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operador_entrada" TEXT NOT NULL,
    "descricao_servico" TEXT NOT NULL,
    "timestamp_saida" TIMESTAMP(3),
    "operador_saida" TEXT,
    "servicos_extras" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DENTRO',
    CONSTRAINT "tb_registro_acesso_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tb_chaves" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISPONIVEL',
    "observacao" TEXT,
    "emprestada_para" TEXT,
    "timestamp_retirada" TIMESTAMP(3),
    "operador_liberacao" TEXT,
    CONSTRAINT "tb_chaves_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tb_registro_chaves" (
    "id" TEXT NOT NULL,
    "chave_codigo" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "responsavel" TEXT NOT NULL,
    "operador" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacao" TEXT,
    CONSTRAINT "tb_registro_chaves_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tb_nvrs" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ONLINE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tb_nvrs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tb_cameras_cftv" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nvr_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ONLINE',
    "latencia" INTEGER NOT NULL DEFAULT 0,
    "ntpDrift" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "uptimeContinuo" INTEGER NOT NULL DEFAULT 0,
    "ultimo_heartbeat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tb_cameras_cftv_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tb_historico_quedas_cftv" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nvr_id" TEXT,
    "camera_id" TEXT,
    "timestamp_queda" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timestamp_retorno" TIMESTAMP(3),
    "duracao_segundos" INTEGER,
    "operador_cco" TEXT,
    "observacao" TEXT,
    CONSTRAINT "tb_historico_quedas_cftv_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tb_auditorias_imagens" (
    "id" TEXT NOT NULL,
    "camera_nome" TEXT NOT NULL,
    "timestamp_trecho" TIMESTAMP(3) NOT NULL,
    "descricao_fato" TEXT NOT NULL,
    "operador" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'AUDITORIA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tb_auditorias_imagens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tb_controle_extintores" (
    "id" TEXT NOT NULL,
    "tipo_movimentacao" TEXT NOT NULL,
    "responsavel_externo" TEXT NOT NULL,
    "operador_cco" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tb_controle_extintores_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tb_ocorrencias" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'GERAL',
    "nome_evento" TEXT,
    "operador" TEXT NOT NULL,
    "detalhes" TEXT NOT NULL,
    "foto_url" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tb_ocorrencias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tb_empresas_nome_key" ON "tb_empresas"("nome");
CREATE UNIQUE INDEX "tb_colaboradores_cpf_key" ON "tb_colaboradores"("cpf");
CREATE UNIQUE INDEX "tb_chaves_codigo_key" ON "tb_chaves"("codigo");
CREATE UNIQUE INDEX "tb_nvrs_codigo_key" ON "tb_nvrs"("codigo");
CREATE UNIQUE INDEX "tb_cameras_cftv_codigo_key" ON "tb_cameras_cftv"("codigo");

ALTER TABLE "tb_colaboradores" ADD CONSTRAINT "tb_colaboradores_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "tb_empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tb_registro_acesso" ADD CONSTRAINT "tb_registro_acesso_id_colaborador_fkey" FOREIGN KEY ("id_colaborador") REFERENCES "tb_colaboradores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tb_cameras_cftv" ADD CONSTRAINT "tb_cameras_cftv_nvr_id_fkey" FOREIGN KEY ("nvr_id") REFERENCES "tb_nvrs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =========================================================
-- 2. INSERÇÃO DOS DADOS DE SEEDING DA APLICAÇÃO
-- =========================================================

-- tb_empresas
INSERT INTO "tb_empresas" ("id", "nome") VALUES ('3b2d1847-f584-406a-a820-d3c2fa3d6232', 'Segurança Forte') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "tb_empresas" ("id", "nome") VALUES ('4c3d2847-f584-406a-a820-d3c2fa3d6233', 'Limpeza Express') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "tb_empresas" ("id", "nome") VALUES ('5d4d3847-f584-406a-a820-d3c2fa3d6234', 'TI Soluções') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "tb_empresas" ("id", "nome") VALUES ('6e5d4847-f584-406a-a820-d3c2fa3d6235', 'Manutenção Geral') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "tb_empresas" ("id", "nome") VALUES ('7f6d5847-f584-406a-a820-d3c2fa3d6236', 'Catering & Cia') ON CONFLICT ("id") DO NOTHING;

-- tb_colaboradores
INSERT INTO "tb_colaboradores" ("id", "nome_completo", "cpf", "foto_url", "id_empresa") VALUES ('a1b1c1d1-e1f1-406a-a820-d3c2fa3d6241', 'Carlos Eduardo Souza', '12345678901', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300', '3b2d1847-f584-406a-a820-d3c2fa3d6232') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "tb_colaboradores" ("id", "nome_completo", "cpf", "foto_url", "id_empresa") VALUES ('a2b2c2d2-e2f2-406a-a820-d3c2fa3d6242', 'Mariana Medeiros Costa', '98765432101', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300', '3b2d1847-f584-406a-a820-d3c2fa3d6232') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "tb_colaboradores" ("id", "nome_completo", "cpf", "foto_url", "id_empresa") VALUES ('a3b3c3d3-e3f3-406a-a820-d3c2fa3d6243', 'Roberto Albuquerque', '11122233344', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300', '5d4d3847-f584-406a-a820-d3c2fa3d6234') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "tb_colaboradores" ("id", "nome_completo", "cpf", "foto_url", "id_empresa") VALUES ('a4b4c4d4-e4f4-406a-a820-d3c2fa3d6244', 'Ana Paula Santos', '55566677788', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300', '4c3d2847-f584-406a-a820-d3c2fa3d6233') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "tb_colaboradores" ("id", "nome_completo", "cpf", "foto_url", "id_empresa") VALUES ('a5b5c5d5-e5f5-406a-a820-d3c2fa3d6245', 'Fernando Oliveira', '22233344455', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300', '6e5d4847-f584-406a-a820-d3c2fa3d6235') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "tb_colaboradores" ("id", "nome_completo", "cpf", "foto_url", "id_empresa") VALUES ('a6b6c6d6-e6f6-406a-a820-d3c2fa3d6246', 'Patrícia Fernandes Lima', '88899900011', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300', '7f6d5847-f584-406a-a820-d3c2fa3d6236') ON CONFLICT ("id") DO NOTHING;

-- tb_registro_acesso
INSERT INTO "tb_registro_acesso" ("id", "id_colaborador", "timestamp_entrada", "operador_entrada", "descricao_servico", "timestamp_saida", "operador_saida", "servicos_extras", "status") VALUES ('r1-uuid-val', 'a1b1c1d1-e1f1-406a-a820-d3c2fa3d6241', '2026-08-04T11:15:00.747Z', 'CCO - Roberto', 'Ronda perimetral e vistoria de portões de acesso', '2026-08-04T20:30:00.747Z', 'CCO - Amanda', 'Apoio extra no portão 3', 'FORA') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "tb_registro_acesso" ("id", "id_colaborador", "timestamp_entrada", "operador_entrada", "descricao_servico", "timestamp_saida", "operador_saida", "servicos_extras", "status") VALUES ('r2-uuid-val', 'a4b4c4d4-e4f4-406a-a820-d3c2fa3d6244', '2026-08-04T11:15:00.747Z', 'CCO - Amanda', 'Limpeza pré-evento nos camarins', '2026-08-04T20:30:00.747Z', 'CCO - Amanda', NULL, 'FORA') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "tb_registro_acesso" ("id", "id_colaborador", "timestamp_entrada", "operador_entrada", "descricao_servico", "timestamp_saida", "operador_saida", "servicos_extras", "status") VALUES ('r3-uuid-val', 'a3b3c3d3-e3f3-406a-a820-d3c2fa3d6243', '2026-08-05T16:00:00.748Z', 'CCO - Thiago', 'Manutenção preventiva no rack', NULL, NULL, NULL, 'DENTRO') ON CONFLICT ("id") DO NOTHING;

