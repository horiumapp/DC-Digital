@echo off
title Backup DC Digital
cd /d "%~dp0.."
echo.
echo Iniciando backup do banco (PC + OneDrive + Google Drive)...
echo Aguarde cerca de 2 minutos. Nao feche esta janela.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0backup-banco.ps1" -Destino "C:\Backups-DC-Digital,C:\Users\JACKISON\OneDrive\Backups-DC-Digital,G:\Meu Drive\Backups-DC-Digital"
echo.
if %ERRORLEVEL% equ 0 (
  echo Backup concluido com sucesso.
) else (
  echo Backup falhou. Veja as mensagens acima ou o arquivo backup.log
)
echo.
pause
