' =====================================================
' NUCLEO.VBS - Launcher Silencioso para Windows
' Sistema Núcleo - Gestão de CMV para Restaurantes
' =====================================================
'
' Este script inicia o sistema de forma mais elegante,
' sem mostrar a janela preta do CMD primeiro.
'
' Uso: Duplo clique neste arquivo
'

Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

' Obter diretório do script
scriptPath = FSO.GetParentFolderName(WScript.ScriptFullName)
launchBat = scriptPath & "\launch.bat"

' Verificar se launch.bat existe
If Not FSO.FileExists(launchBat) Then
    MsgBox "Erro: launch.bat não encontrado!" & vbCrLf & vbCrLf & _
           "Certifique-se de que este arquivo está na pasta raiz do projeto.", _
           vbCritical, "Núcleo - Erro"
    WScript.Quit 1
End If

' Executar launch.bat
WshShell.Run """" & launchBat & """", 1, False
