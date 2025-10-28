# 创建一个最小的有效 ICO 文件
$iconPath = "icon.ico"

# ICO 文件头 (6 字节)
$header = [byte[]]@(
    0x00, 0x00,  # 保留，必须是 0
    0x01, 0x00,  # 图像类型 (1 = ICO)
    0x01, 0x00   # 图像数量 (1)
)

# 图像目录条目 (16 字节) - 16x16 图像
$dirEntry = [byte[]]@(
    0x10,        # 宽度 (16)
    0x10,        # 高度 (16)
    0x00,        # 调色板颜色数 (0 = 不使用调色板)
    0x00,        # 保留，必须是 0
    0x01, 0x00,  # 颜色平面数 (1)
    0x20, 0x00,  # 每像素位数 (32 = RGBA)
    0x00, 0x00, 0x00, 0x00,  # 图像数据大小 (稍后填充)
    0x16, 0x00, 0x00, 0x00   # 图像数据偏移 (22)
)

# 创建 16x16 的纯色图像数据 (蓝色)
# BMP 格式：40字节头 + 像素数据
$bmpHeader = [byte[]]@(
    0x28, 0x00, 0x00, 0x00,  # 头大小 (40)
    0x10, 0x00, 0x00, 0x00,  # 宽度 (16)
    0x20, 0x00, 0x00, 0x00,  # 高度 (32 = 16*2, 包含 AND 掩码)
    0x01, 0x00,              # 平面数 (1)
    0x20, 0x00,              # 位深度 (32)
    0x00, 0x00, 0x00, 0x00,  # 压缩 (0 = 无)
    0x00, 0x00, 0x00, 0x00,  # 图像大小 (0 = 无压缩)
    0x00, 0x00, 0x00, 0x00,  # X 分辨率
    0x00, 0x00, 0x00, 0x00,  # Y 分辨率
    0x00, 0x00, 0x00, 0x00,  # 使用的颜色数
    0x00, 0x00, 0x00, 0x00   # 重要颜色数
)

# 16x16 像素数据 (蓝色 BGRA 格式，从下到上)
$pixels = New-Object byte[] (16 * 16 * 4)
for ($i = 0; $i -lt $pixels.Length; $i += 4) {
    $pixels[$i] = 0xFF      # B (蓝色)
    $pixels[$i + 1] = 0x80  # G
    $pixels[$i + 2] = 0x00  # R
    $pixels[$i + 3] = 0xFF  # A (不透明)
}

# AND 掩码 (16x16 位 = 32 字节，全透明)
$andMask = New-Object byte[] 32

# 组合图像数据
$imageData = $bmpHeader + $pixels + $andMask

# 更新目录条目中的图像大小
$imageSize = $imageData.Length
$dirEntry[8] = [byte]($imageSize -band 0xFF)
$dirEntry[9] = [byte](($imageSize -shr 8) -band 0xFF)
$dirEntry[10] = [byte](($imageSize -shr 16) -band 0xFF)
$dirEntry[11] = [byte](($imageSize -shr 24) -band 0xFF)

# 写入文件
$allBytes = $header + $dirEntry + $imageData
[System.IO.File]::WriteAllBytes($iconPath, $allBytes)

Write-Host "图标文件已创建: $iconPath ($($allBytes.Length) 字节)"

