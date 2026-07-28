@echo off
title Controle de Acesso - Farmasi Arena - CCO Console
echo =========================================================
echo       CONTROLE DE ACESSO DIARIO - FARMASI ARENA
echo =========================================================
echo.
echo Carregando ambiente portatil do Node.js...
set PATH=C:\Users\marcos.agum\.gemini\antigravity\node;%PATH%

echo Abrindo o navegador em http://localhost:3000...
start http://localhost:3000

echo Iniciando o servidor de desenvolvimento...
npm run dev
