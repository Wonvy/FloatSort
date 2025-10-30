# 创建一个有效的 FloatSort 图标
# 尺寸: 1024x1024 PNG

Add-Type -AssemblyName System.Drawing

# 创建 1024x1024 的图像
$width = 1024
$height = 1024
$bmp = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bmp)

# 设置高质量渲染
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# 背景 - 渐变蓝色
$rect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [System.Drawing.Color]::FromArgb(255, 66, 153, 225),  # 浅蓝
    [System.Drawing.Color]::FromArgb(255, 29, 78, 216),   # 深蓝
    45
)
$graphics.FillRectangle($brush, $rect)

# 绘制圆角矩形背景
$cornerRadius = 150
$graphicsPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$graphicsPath.AddArc(0, 0, $cornerRadius * 2, $cornerRadius * 2, 180, 90)
$graphicsPath.AddArc($width - $cornerRadius * 2, 0, $cornerRadius * 2, $cornerRadius * 2, 270, 90)
$graphicsPath.AddArc($width - $cornerRadius * 2, $height - $cornerRadius * 2, $cornerRadius * 2, $cornerRadius * 2, 0, 90)
$graphicsPath.AddArc(0, $height - $cornerRadius * 2, $cornerRadius * 2, $cornerRadius * 2, 90, 90)
$graphicsPath.CloseFigure()

# 绘制文字 "FS"
$font = New-Object System.Drawing.Font("Arial", 400, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$text = "FS"
$stringFormat = New-Object System.Drawing.StringFormat
$stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
$stringFormat.LineAlignment = [System.Drawing.StringAlignment]::Center

$graphics.DrawString($text, $font, $textBrush, $width / 2, $height / 2, $stringFormat)

# 绘制底部小标签 "FloatSort"
$smallFont = New-Object System.Drawing.Font("Arial", 60, [System.Drawing.FontStyle]::Regular)
$smallText = "FloatSort"
$graphics.DrawString($smallText, $smallFont, $textBrush, $width / 2, $height - 120, $stringFormat)

# 保存为 PNG
$outputPath = Join-Path $PSScriptRoot "icon.png"
$bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "✓ 图标已创建: $outputPath" -ForegroundColor Green
Write-Host "  尺寸: 1024x1024" -ForegroundColor Gray
Write-Host "  格式: PNG" -ForegroundColor Gray

# 清理资源
$graphics.Dispose()
$brush.Dispose()
$textBrush.Dispose()
$font.Dispose()
$smallFont.Dispose()
$stringFormat.Dispose()
$graphicsPath.Dispose()
$bmp.Dispose()

# 显示文件信息
$fileInfo = Get-Item $outputPath
Write-Host "  大小: $([math]::Round($fileInfo.Length / 1KB, 2)) KB" -ForegroundColor Gray

