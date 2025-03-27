<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

class UpdateHandler
{
    private $tempDir = 'temp';
    private $backupDir = 'backups';
    private $versionFile = 'config/version.json';
    private $githubApi = 'https://api.github.com/repos/drascom/inventory-system-supabase/releases/latest';

    public function __construct()
    {
        foreach ([$this->tempDir, $this->backupDir] as $dir) {
            if (!file_exists($dir)) {
                mkdir($dir, 0755, true);
            }
        }
    }

    public function checkForUpdates()
    {
        // Get current version
        $currentVersion = $this->getCurrentVersion();

        // Get latest release info from GitHub
        $latestRelease = $this->getLatestRelease();

        if (!$latestRelease) {
            return [
                'success' => false,
                'message' => 'Failed to fetch release information'
            ];
        }

        // Clean up version number from GitHub (remove 'v' prefix if present)
        $latestVersion = ltrim($latestRelease['tag_name'], 'v');

        return [
            'success' => true,
            'currentVersion' => $currentVersion,
            'latestVersion' => $latestVersion,
            'updateAvailable' => version_compare($latestVersion, $currentVersion, '>'),
            'releaseNotes' => $latestRelease['body'],
            'downloadUrl' => $latestRelease['zipball_url']
        ];
    }

    public function performUpdate()
    {
        try {
            $releaseInfo = $this->getLatestRelease();
            if (!$releaseInfo) {
                throw new Exception('Failed to get release information');
            }

            // Create backup
            $backupFile = $this->createBackup();
            if (!$backupFile) {
                throw new Exception('Failed to create backup');
            }

            // Download update
            $downloadPath = $this->tempDir . '/update.zip';
            if (!$this->downloadFile($releaseInfo['zipball_url'], $downloadPath)) {
                throw new Exception('Failed to download update');
            }

            // Extract and apply update
            if (!$this->extractAndApplyUpdate($downloadPath)) {
                // Restore from backup if update fails
                $this->extractZip($backupFile, '.');
                throw new Exception('Failed to apply update');
            }

            // Update version file
            $this->updateVersionFile([
                'version' => $releaseInfo['tag_name'],
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            // Cleanup
            $extractPath = $this->tempDir;
            $this->cleanup($downloadPath, $extractPath);

            return [
                'success' => true,
                'message' => 'Update completed successfully',
                'progress' => 100
            ];

        } catch (Exception $e) {
            $this->logMessage($e->getMessage());
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'progress' => 0
            ];
        }
    }

    private function getCurrentVersion()
    {
        if (!file_exists($this->versionFile)) {
            return '0.0.0';
        }
        $data = json_decode(file_get_contents($this->versionFile), true);
        // Remove 'v' prefix if present
        return ltrim($data['version'] ?? '0.0.0', 'v');
    }

    private function getLatestRelease()
    {
        $ch = curl_init($this->githubApi);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERAGENT => 'Inventory-System-Updater/1.0',
            CURLOPT_HTTPHEADER => ['Accept: application/vnd.github.v3+json']
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$response) {
            return null;
        }

        return json_decode($response, true);
    }

    private function logMessage($message)
    {
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[$timestamp] $message\n";
        file_put_contents('update.log', $logMessage, FILE_APPEND);

        // Also log to PHP error log for server monitoring
        error_log("Update System: $message");
    }

    private function downloadFile($url, $path)
    {
        $this->logMessage("Starting download from URL: $url");

        $fp = fopen($path, 'w+');
        $ch = curl_init($url);

        curl_setopt_array($ch, [
            CURLOPT_FILE => $fp,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_PROGRESSFUNCTION => function ($ch, $downloadSize, $downloaded) {
                if ($downloadSize > 0) {
                    $progress = round(($downloaded / $downloadSize) * 100);
                    echo json_encode([
                        'success' => true,
                        'progress' => $progress,
                        'message' => "Downloading: $progress%"
                    ]) . "\n";
                    ob_flush();
                    flush();
                }
            },
            CURLOPT_NOPROGRESS => false,
            CURLOPT_USERAGENT => 'Inventory-System-Updater/1.0',
            CURLOPT_HTTPHEADER => ['Accept: application/vnd.github.v3+json']
        ]);

        $success = curl_exec($ch);
        curl_close($ch);
        fclose($fp);

        return $success && file_exists($path);
    }

    private function isValidZip($file)
    {
        $zip = new ZipArchive();
        return $zip->open($file) === true;
    }

    private function createBackup()
    {
        $backupFile = $this->backupDir . '/backup-' . date('Y-m-d-H-i-s') . '.zip';

        $zip = new ZipArchive();
        if ($zip->open($backupFile, ZipArchive::CREATE) !== true) {
            throw new Exception('Failed to create backup');
        }

        // Add files to backup
        $this->addFilesToZip($zip, '.', [
            $this->tempDir,
            $this->backupDir,
            '.git',
            'node_modules'
        ]);

        $zip->close();
        return $backupFile;
    }

    private function extractZip($zipFile, $extractPath)
    {
        $zip = new ZipArchive();
        if ($zip->open($zipFile) !== true) {
            return false;
        }

        $success = $zip->extractTo($extractPath);
        $zip->close();

        return $success;
    }

    private function applyUpdate($extractPath)
    {
        // Files to exclude from updates
        $excludeFiles = [
            'update-handler.php',
            'config/version.json',
            'assets/js/config.js',
            'pages/update.html',
            '.gitignore',
            'update.log',
            'temp',
            'backups'
        ];

        // Get the first directory in extract path (GitHub zip creates a root dir)
        $dirs = glob($extractPath . '/*', GLOB_ONLYDIR);
        if (empty($dirs)) {
            throw new Exception('Invalid update package structure');
        }

        $updateRoot = $dirs[0];

        // Copy files from update to current directory, excluding specified files
        $this->copyDirectory($updateRoot, '.', $excludeFiles);
    }

    private function copyDirectory($source, $dest, $excludeFiles = [])
    {
        $dir = opendir($source);
        @mkdir($dest);

        while (($file = readdir($dir)) !== false) {
            if ($file == '.' || $file == '..') {
                continue;
            }

            $sourcePath = $source . '/' . $file;
            $destPath = $dest . '/' . $file;

            // Skip excluded files and directories
            $relativePath = str_replace($source . '/', '', $sourcePath);
            foreach ($excludeFiles as $excludeFile) {
                if (strpos($relativePath, $excludeFile) === 0) {
                    continue 2; // Skip this file/directory
                }
            }

            if (is_dir($sourcePath)) {
                $this->copyDirectory($sourcePath, $destPath, $excludeFiles);
            } else {
                copy($sourcePath, $destPath);
            }
        }

        closedir($dir);
    }

    private function addFilesToZip($zip, $path, $exclude = [])
    {
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($path),
            RecursiveIteratorIterator::LEAVES_ONLY
        );

        foreach ($files as $file) {
            if ($file->isDir()) {
                continue;
            }

            $filePath = $file->getRealPath();
            $relativePath = substr($filePath, strlen(realpath('.')) + 1);

            // Check if path should be excluded
            $exclude_file = false;
            foreach ($exclude as $exc) {
                if (strpos($relativePath, $exc) === 0) {
                    $exclude_file = true;
                    break;
                }
            }

            if (!$exclude_file) {
                $zip->addFile($filePath, $relativePath);
            }
        }
    }

    private function cleanup($zipFile, $extractPath)
    {
        // Remove downloaded zip
        if (file_exists($zipFile)) {
            unlink($zipFile);
        }

        // Remove extracted files
        $this->removeDirectory($extractPath);
    }

    private function removeDirectory($path)
    {
        if (!is_dir($path)) {
            return;
        }

        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($path, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );

        foreach ($files as $file) {
            if ($file->isDir()) {
                rmdir($file->getRealPath());
            } else {
                unlink($file->getRealPath());
            }
        }

        rmdir($path);
    }

    private function updateVersionFile($data)
    {
        $versionFile = __DIR__ . '/config/version.json';
        if (!file_put_contents($versionFile, json_encode($data, JSON_PRETTY_PRINT))) {
            throw new Exception('Failed to update version file');
        }
        $this->logMessage("Version updated to: " . $data['version']);
    }

    private function extractAndApplyUpdate($downloadPath)
    {
        $extractPath = $this->tempDir . '/extract';
        if (!file_exists($extractPath)) {
            mkdir($extractPath, 0755, true);
        }

        if (!$this->extractZip($downloadPath, $extractPath)) {
            throw new Exception('Failed to extract update package');
        }

        try {
            $this->applyUpdate($extractPath);
            $this->cleanup($downloadPath, $extractPath);
            return true;
        } catch (Exception $e) {
            $this->cleanup($downloadPath, $extractPath);
            throw $e;
        }
    }
}

// Handle incoming requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (!$data || !isset($data['action'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid request']);
    exit;
}

$handler = new UpdateHandler();

switch ($data['action']) {
    case 'check':
        $result = $handler->checkForUpdates();
        break;

    case 'update':
        $result = $handler->performUpdate();
        break;

    default:
        $result = ['success' => false, 'message' => 'Invalid action'];
        http_response_code(400);
}

echo json_encode($result);
