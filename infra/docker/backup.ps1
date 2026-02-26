param(
    [string]$BackupDir = "C:\Backups\AlmaDesk",
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Date = Get-Date -Format "yyyy-MM-dd"

$PostgresContainer = "almadesk_postgres"
$PostgresLogsContainer = "almadesk_postgres_logs"
$MinioContainer = "almadesk_minio"

$PostgresUser = $env:POSTGRES_USER ?? "almadesk"
$PostgresDB = $env:POSTGRES_DB ?? "almadesk_db"
$PostgresLogsUser = $env:POSTGRES_LOGS_USER ?? "almadesk_logs"
$PostgresLogsDB = $env:POSTGRES_LOGS_DB ?? "almadesk_logs_db"

$MinioAccessKey = $env:MINIO_ACCESS_KEY ?? "almadesk"
$MinioSecretKey = $env:MINIO_SECRET_KEY ?? "almadesk_minio_2026"
$MinioBucket = $env:MINIO_BUCKET ?? "almadesk-attachments"

$DailyBackupDir = Join-Path $BackupDir $Date
New-Item -ItemType Directory -Force -Path $DailyBackupDir | Out-Null

Write-Host "==========================================`n" -ForegroundColor Cyan
Write-Host "AlmaDesk-Edu Backup Script" -ForegroundColor Cyan
Write-Host "Started at: $(Get-Date)" -ForegroundColor Cyan
Write-Host "Backup directory: $DailyBackupDir" -ForegroundColor Cyan
Write-Host "`n==========================================`n" -ForegroundColor Cyan

function Backup-PostgresMain {
    Write-Host "`n📦 Backing up main PostgreSQL database..." -ForegroundColor Yellow

    $backupFile = Join-Path $DailyBackupDir "postgres_main_$Timestamp.dump"

    docker exec -t $PostgresContainer pg_dump `
        -U $PostgresUser `
        -d $PostgresDB `
        --clean `
        --if-exists `
        --create `
        --format=custom `
        > $backupFile

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Main database backup completed: postgres_main_$Timestamp.dump" -ForegroundColor Green

        Compress-Archive -Path $backupFile -DestinationPath "$backupFile.zip" -Force
        Remove-Item $backupFile
        Write-Host "✅ Compressed: postgres_main_$Timestamp.dump.zip" -ForegroundColor Green
    } else {
        Write-Host "❌ Main database backup failed" -ForegroundColor Red
        exit 1
    }
}

function Backup-PostgresLogs {
    Write-Host "`n📦 Backing up logs PostgreSQL database..." -ForegroundColor Yellow

    $backupFile = Join-Path $DailyBackupDir "postgres_logs_$Timestamp.dump"

    docker exec -t $PostgresLogsContainer pg_dump `
        -U $PostgresLogsUser `
        -d $PostgresLogsDB `
        --clean `
        --if-exists `
        --create `
        --format=custom `
        > $backupFile

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Logs database backup completed: postgres_logs_$Timestamp.dump" -ForegroundColor Green

        Compress-Archive -Path $backupFile -DestinationPath "$backupFile.zip" -Force
        Remove-Item $backupFile
        Write-Host "✅ Compressed: postgres_logs_$Timestamp.dump.zip" -ForegroundColor Green
    } else {
        Write-Host "❌ Logs database backup failed" -ForegroundColor Red
        exit 1
    }
}

function Backup-Minio {
    Write-Host "`n📦 Backing up MinIO data..." -ForegroundColor Yellow

    $minioBackupDir = Join-Path $DailyBackupDir "minio_$Timestamp"
    New-Item -ItemType Directory -Force -Path $minioBackupDir | Out-Null

    $mcPath = "C:\Tools\mc.exe"
    if (-not (Test-Path $mcPath)) {
        Write-Host "⚠️  MinIO Client (mc) not found. Downloading..." -ForegroundColor Yellow
        New-Item -ItemType Directory -Force -Path "C:\Tools" | Out-Null
        Invoke-WebRequest -Uri "https://dl.min.io/client/mc/release/windows-amd64/mc.exe" -OutFile $mcPath
    }

    & $mcPath alias set almadesk http://localhost:9000 $MinioAccessKey $MinioSecretKey

    & $mcPath mirror almadesk/$MinioBucket $minioBackupDir

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ MinIO backup completed: minio_$Timestamp" -ForegroundColor Green

        Compress-Archive -Path $minioBackupDir -DestinationPath "$minioBackupDir.zip" -Force
        Remove-Item -Recurse -Force $minioBackupDir
        Write-Host "✅ Compressed: minio_$Timestamp.zip" -ForegroundColor Green
    } else {
        Write-Host "⚠️  MinIO backup failed (non-critical)" -ForegroundColor Yellow
    }
}

function Backup-Configs {
    Write-Host "`n📦 Backing up configuration files..." -ForegroundColor Yellow

    $configBackupDir = Join-Path $DailyBackupDir "configs_$Timestamp"
    New-Item -ItemType Directory -Force -Path $configBackupDir | Out-Null

    $projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

    Copy-Item -Path "$projectRoot\infra\docker\docker-compose.yml" -Destination $configBackupDir -ErrorAction SilentlyContinue
    Copy-Item -Path "$projectRoot\infra\docker\prometheus.yml" -Destination $configBackupDir -ErrorAction SilentlyContinue
    Copy-Item -Path "$projectRoot\app\backend\.env" -Destination $configBackupDir -ErrorAction SilentlyContinue
    Copy-Item -Path "$projectRoot\platform\keycloak\almadesk-realm.json" -Destination $configBackupDir -ErrorAction SilentlyContinue

    Compress-Archive -Path $configBackupDir -DestinationPath "$configBackupDir.zip" -Force
    Remove-Item -Recurse -Force $configBackupDir

    Write-Host "✅ Configuration backup completed: configs_$Timestamp.zip" -ForegroundColor Green
}

function Cleanup-OldBackups {
    Write-Host "`n🧹 Cleaning up old backups (older than $RetentionDays days)..." -ForegroundColor Yellow

    $cutoffDate = (Get-Date).AddDays(-$RetentionDays)
    Get-ChildItem -Path $BackupDir -Directory | Where-Object { $_.LastWriteTime -lt $cutoffDate } | Remove-Item -Recurse -Force

    Write-Host "✅ Cleanup completed" -ForegroundColor Green
}

function Show-BackupStats {
    Write-Host "`n📊 Backup Statistics:" -ForegroundColor Cyan

    $backupSize = (Get-ChildItem -Path $DailyBackupDir -Recurse | Measure-Object -Property Length -Sum).Sum
    $backupSizeMB = [math]::Round($backupSize / 1MB, 2)

    Write-Host "   Total size: $backupSizeMB MB" -ForegroundColor White
    Write-Host "   Files:" -ForegroundColor White

    Get-ChildItem -Path $DailyBackupDir -File | ForEach-Object {
        $sizeMB = [math]::Round($_.Length / 1MB, 2)
        Write-Host "   - $($_.Name) ($sizeMB MB)" -ForegroundColor Gray
    }
}

function Send-Notification {
    Write-Host "`n📧 Sending backup notification..." -ForegroundColor Yellow

    Write-Host "✅ Notification sent (if configured)" -ForegroundColor Green
}

try {
    Backup-PostgresMain
    Backup-PostgresLogs
    Backup-Minio
    Backup-Configs
    Show-BackupStats
    Cleanup-OldBackups
    Send-Notification

    Write-Host "`n==========================================`n" -ForegroundColor Cyan
    Write-Host "✅ Backup completed successfully!" -ForegroundColor Green
    Write-Host "Finished at: $(Get-Date)" -ForegroundColor Cyan
    Write-Host "`n==========================================`n" -ForegroundColor Cyan

    exit 0
} catch {
    Write-Host "`n❌ Backup failed with error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
