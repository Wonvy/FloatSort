# 创建简单的占位图标
Add-Type -AssemblyName System.Drawing

# 创建 32x32 位图
$bmp = New-Object System.Drawing.Bitmap(32,32)
$g = [System.Drawing.Graphics]::FromImage($bmp)

# 绘制蓝色背景
$g.FillRectangle([System.Drawing.Brushes]::DodgerBlue, 0, 0, 32, 32)

# 绘制白色文字 FS (FloatSort)
$font = New-Object System.Drawing.Font("Arial", 12, [System.Drawing.FontStyle]::Bold)
$g.DrawString("FS", $font, [System.Drawing.Brushes]::White, 4, 8)

# 保存为 ICO
$icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
$file = [System.IO.File]::Create("$PSScriptRoot\icons\icon.ico")
$icon.Save($file)
$file.Close()

Write-Host "Icon created successfully at icons/icon.ico" -ForegroundColor Green

# 清理
$g.Dispose()
$bmp.Dispose()

