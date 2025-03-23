import { supabase } from './supabase.js';
import { showToast } from './utils.js';

class ProfileManager {
    constructor() {
        this.avatarInput = null;
        this.avatarPreview = null;
        this.profileForm = null;
        this.user = null;
    }

    async initializeProfile() {
        // Get DOM elements
        this.avatarInput = document.getElementById('avatarInput');
        this.avatarPreview = document.getElementById('avatarPreview');
        this.profileForm = document.getElementById('profileForm');

        // Get current user
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
            showToast('Error loading profile', 'error');
            return;
        }
        this.user = user;

        // Check if profile exists, if not create one
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', this.user.id)
            .single();

        if (profileError && profileError.code === 'PGRST116') {
            // Get public URL for default avatar
            const { data: { publicUrl: defaultAvatarUrl } } = supabase.storage
                .from('inventory-avatar')
                .getPublicUrl('default/avatar.png');

            // Profile doesn't exist, create one with default avatar
            const { error: createError } = await supabase
                .from('profiles')
                .insert({
                    id: this.user.id,
                    username: null,
                    avatar_url: defaultAvatarUrl,
                    created_at: new Date(),
                    updated_at: new Date()
                });

            if (createError) {
                console.error('Error creating profile:', createError);
                showToast('Error creating profile', 'error');
                return;
            }
        } else if (profileError) {
            console.error('Error checking profile:', profileError);
            showToast('Error checking profile', 'error');
            return;
        }

        // Initialize form
        this.setupEventListeners();
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
            // Set email
            document.getElementById('profileEmail').textContent = this.user.email;

            // Set member since date
            const memberSince = new Date(this.user.created_at).toLocaleDateString();
            document.getElementById('memberSince').textContent = memberSince;

            // Get profile data from profiles table
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', this.user.id)
                .single();

            if (error) throw error;

            // Set username if exists
            if (profile?.username) {
                document.getElementById('username').value = profile.username;
            }

            // Set avatar if exists
            if (profile?.avatar_url) {
                this.avatarPreview.src = profile.avatar_url;
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
            // Include user ID in the path
            const filePath = `${this.user.id}/${fileName}`;

            // Delete old avatar if exists
            const { data: oldAvatar } = await supabase
                .from('profiles')
                .select('avatar_url')
                .eq('id', this.user.id)
                .single();

            if (oldAvatar?.avatar_url) {
                try {
                    const oldPath = new URL(oldAvatar.avatar_url).pathname.split('inventory-avatar/')[1];
                    if (oldPath) {
                        await supabase.storage
                            .from('inventory-avatar')
                            .remove([oldPath]);
                    }
                } catch (error) {
                    console.error('Error removing old avatar:', error);
                    // Continue with upload even if delete fails
                }
            }

            // Upload new file to Supabase Storage
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
            const username = document.getElementById('username').value.trim(); // Add trim()
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
                        onConflict: 'id'  // Add this to ensure proper upsert
                    });

                if (profileError) throw profileError;

                // Update the username in navbar if we're on the dashboard
                const navUserName = document.getElementById('userName');
                if (navUserName) {
                    navUserName.textContent = username;
                }
            }

            // Update password if provided
            if (newPassword) {
                if (newPassword !== confirmPassword) {
                    showToast('New passwords do not match', 'error');
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
