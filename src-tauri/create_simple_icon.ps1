# 创建一个最小但有效的 16x16 ICO 文件
# ICO 文件头
$iconDir = [byte[]](
    0, 0,       # Reserved (must be 0)
    1, 0,       # Image type (1 = ICO)
    1, 0        # Number of images
)

# ICONDIRENTRY
$iconDirEntry = [byte[]](
    16,         # Width (16)
    16,         # Height (16)
    0,          # Color count (0 for true color)
    0,          # Reserved (must be 0)
    1, 0,       # Color planes
    32, 0,      # Bits per pixel
    0x68, 0x04, 0x00, 0x00,  # Size of image data (1128 bytes)
    0x16, 0x00, 0x00, 0x00   # Offset to image data (22 bytes)
)

# BITMAPINFOHEADER
$bmpHeader = [byte[]](
    40, 0, 0, 0,    # Header size
    16, 0, 0, 0,    # Width
    32, 0, 0, 0,    # Height (double for AND/XOR mask)
    1, 0,           # Planes
    32, 0,          # Bit count
    0, 0, 0, 0,     # Compression
    0, 0, 0, 0,     # Image size
    0, 0, 0, 0,     # X pixels per meter
    0, 0, 0, 0,     # Y pixels per meter
    0, 0, 0, 0,     # Colors used
    0, 0, 0, 0      # Colors important
)

# 创建 16x16 蓝色图像数据 (BGRA format, bottom-up)
$imageData = New-Object byte[] (16 * 16 * 4)
for ($i = 0; $i -lt $imageData.Length; $i += 4) {
    $imageData[$i] = 255      # Blue
    $imageData[$i + 1] = 0    # Green
    $imageData[$i + 2] = 0    # Red
    $imageData[$i + 3] = 255  # Alpha
}

# AND mask (all zeros for opaque)
$andMask = New-Object byte[] (16 * 16 / 8)

# 组合所有数据
$allBytes = $iconDir + $iconDirEntry + $bmpHeader + $imageData + $andMask

# 写入文件
$filePath = Join-Path $PSScriptRoot "icons\icon.ico"
[IO.File]::WriteAllBytes($filePath, $allBytes)

Write-Host "Valid ICO file created at: $filePath" -ForegroundColor Green

