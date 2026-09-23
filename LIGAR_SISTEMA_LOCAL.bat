@echo off
title SERVIDOR DE EMERGENCIA - SGQ ERP
echo Inicializando Banco de Dados e Serviços Locais via Docker...
call npx supabase start
echo Inicializando Front-End Local...
call npm run dev
pause
