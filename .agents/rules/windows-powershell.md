# Windows PowerShell 指令規範

這台機器使用 Windows + PowerShell 作為 shell 環境。

## 指令串接
- ✅ 使用 `;` 串接多個指令：`cmd1; cmd2; cmd3`
- ❌ 不可使用 `&&`（PowerShell 預設語法不支援）

## 其他 PowerShell 注意事項
- 換行輸入用 `` `n ``，不是 `\n`
- 目錄切換用 `Set-Location` 或 `cd`，不是 `&&`
- 若需要判斷前一指令成功再執行，可用：
  `if ($LASTEXITCODE -eq 0) { cmd2 }`

## 外部工具（gh CLI 等）
- `gh` CLI 在新安裝後，需要使用者重新開啟終端才能在 PATH 中找到
- 若 `gh` 不可用，改用 GitHub REST API 或引導使用者手動操作網頁

