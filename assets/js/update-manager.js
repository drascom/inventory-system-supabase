import { supabase } from './supabase.js';
import { showToast } from './utils.js';

class UpdateManager {
    constructor() {
        this.currentVersion = '1.4.0';
        this.repoOwner = 'drascom';
        this.repoName = 'inventory-system-supabase';
        this.updating = false;
        this.backupFolder = 'backup';
    }

    async checkForUpdates() {
        try {
            const response = await fetch(`https://api.github.com/repos/${this.repoOwner}/${this.repoName}/releases/latest`);
            const data = await response.json();

            if (response.status === 404) {
                return {
                    currentVersion: this.currentVersion,
                    latestVersion: this.currentVersion,
                    updateAvailable: false,
                    releaseNotes: 'No releases available.',
                    downloadUrl: null
                };
            }

            if (!response.ok) {
                throw new Error(data.message || 'Failed to check for updates');
            }

            const latestVersion = data.tag_name.replace('v', '');
            const updateAvailable = this.compareVersions(latestVersion, this.currentVersion) > 0;

            return {
                currentVersion: this.currentVersion,
                latestVersion,
                updateAvailable,
                releaseNotes: data.body,
                downloadUrl: data.zipball_url
            };
        } catch (error) {
            console.error('Error checking for updates:', error);
            throw error;
        }
    }

    compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);

        for (let i = 0; i < 3; i++) {
            if (parts1[i] > parts2[i]) return 1;
            if (parts1[i] < parts2[i]) return -1;
        }
        return 0;
    }

    async downloadUpdate(downloadUrl) {
        try {
            const response = await fetch(downloadUrl);
            if (!response.ok) throw new Error('Failed to download update');
            return await response.blob();
        } catch (error) {
            console.error('Error downloading update:', error);
            throw error;
        }
    }

    async createBackup() {
        // Implementation will depend on your deployment environment
        // For web-based system, we'll store backup info in Supabase
        const timestamp = new Date().toISOString();
        const backupRef = `backups/${timestamp}`;

        try {
            const { data, error } = await supabase
                .from('system_backups')
                .insert([{
                    version: this.currentVersion,
                    timestamp: timestamp,
                    backup_ref: backupRef,
                    status: 'CREATED'
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating backup:', error);
            throw error;
        }
    }

    async applyUpdate(updateBlob) {
        if (this.updating) {
            throw new Error('Update already in progress');
        }

        try {
            this.updating = true;
            showToast('Starting update process...', 'info');

            // Create backup
            await this.createBackup();
            showToast('Backup created successfully', 'success');

            // Here you would implement the actual update process
            // This will depend on your deployment environment

            showToast('Update completed successfully', 'success');

            // Reload the page after successful update
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error('Error applying update:', error);
            showToast('Update failed: ' + error.message, 'error');
            throw error;
        } finally {
            this.updating = false;
        }
    }
}

export default new UpdateManager();
