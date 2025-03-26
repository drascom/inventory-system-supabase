import { supabase } from './supabase.js';
import { showToast } from './utils.js';
import { getCurrentUser, getCurrentUserProfile, updateStoredProfile } from './supabase.js';

class ProfileManager {
    constructor() {
        this.avatarInput = null;
        this.avatarPreview = null;
        this.profileForm = null;
        this.user = getCurrentUser();
        this.profile = getCurrentUserProfile();
    }

    async initializeProfile() {
        // Get DOM elements
        this.avatarInput = document.getElementById('avatarInput');
        this.avatarPreview = document.getElementById('avatarPreview');
        this.profileForm = document.getElementById('profileForm');

        if (!this.user) {
            showToast('Error loading profile', 'error');
            return;
        }

        // Load profile data from localStorage
        await this.loadUserProfile();
    }

    setupEventListeners() {
        // Avatar upload handler
        this.avatarInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.handleAvatarUpload(file);
            }
        });

        // Form submission handler
        this.profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.updateProfile();
        });
    }

    async loadUserProfile() {
        try {
            // Set email from stored user data
            document.getElementById('profileEmail').textContent = this.user.email;

            // Set member since date
            const memberSince = new Date(this.user.created_at).toLocaleDateString();
            document.getElementById('memberSince').textContent = memberSince;

            // Set username if exists
            if (this.profile?.username) {
                document.getElementById('username').value = this.profile.username;
            }

            // Set avatar if exists
            if (this.profile?.avatar_url) {
                this.avatarPreview.src = this.profile.avatar_url;
            }

        } catch (error) {
            console.error('Error loading profile:', error);
            showToast('Error loading profile data', 'error');
        }
    }

    async handleAvatarUpload(file) {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${this.user.id}/${fileName}`;

            // Upload new file
            const { data, error: uploadError } = await supabase.storage
                .from('inventory-avatar')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('inventory-avatar')
                .getPublicUrl(filePath);

            // Update profile with new avatar URL
            const { error: updateError } = await supabase
                .from('profiles')
                .upsert({
                    id: this.user.id,
                    avatar_url: publicUrl,
                    updated_at: new Date()
                });

            if (updateError) throw updateError;

            // Update stored profile data
            await updateStoredProfile({ avatar_url: publicUrl });

            // Update preview
            this.avatarPreview.src = publicUrl;
            showToast('Avatar updated successfully', 'success');

        } catch (error) {
            console.error('Error uploading avatar:', error);
            showToast('Error uploading avatar', 'error');
        }
    }

    async updateProfile() {
        try {
            const username = document.getElementById('username').value.trim();
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Update username
            if (username) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: this.user.id,
                        username: username,
                        updated_at: new Date()
                    }, {
                        onConflict: 'id'
                    });

                if (profileError) throw profileError;

                const navUserName = document.getElementById('userName');
                if (navUserName) {
                    navUserName.textContent = username;
                }
            }

            // Update password if provided
            if (newPassword) {
                if (newPassword !== confirmPassword) {
                    showToast('New passwords do not match', 'warning');
                    return;
                }

                const { error: passwordError } = await supabase.auth.updateUser({
                    password: newPassword
                });

                if (passwordError) throw passwordError;

                // Clear password fields
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';
            }

            showToast('Profile updated successfully', 'success');

        } catch (error) {
            console.error('Error updating profile:', error);
            showToast('Error updating profile', 'error');
        }
    }
}

export default new ProfileManager();
