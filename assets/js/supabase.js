import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
import { config } from './config.js'
import { showToast } from './utils.js'

export const supabase = createClient(config.supabaseUrl, config.supabaseKey)

// Constants for session management
const SESSION_KEY = 'app_session';
const REMEMBER_KEY = 'app_remember';

// Authentication functions
async function signUp(email, password) {
    try {
        const { user, error } = await supabase.auth.signUp({
            email: email,
            password: password
        })
        if (error) throw error
        alert('Signup successful! Please check your email for verification.')
        return user
    } catch (error) {
        alert(error.message)
        return null
    }
}

async function signIn(email, password) {
    try {
        const rememberMe = document.getElementById('rememberMe').checked;
        const { data: { user, session }, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        // Check if profile exists, if not create one
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        let userProfile;
        if (profileError && profileError.code === 'PGRST116') {
            // Get public URL for default avatar
            const { data: { publicUrl: defaultAvatarUrl } } = supabase.storage
                .from('inventory-avatar')
                .getPublicUrl('default/avatar.png');

            // Create profile with default values
            const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert({
                    id: user.id,
                    username: null,
                    avatar_url: defaultAvatarUrl,
                    created_at: new Date(),
                    updated_at: new Date()
                })
                .select()
                .single();

            if (createError) {
                console.error('Error creating profile:', createError);
            } else {
                userProfile = newProfile;
            }
        } else {
            userProfile = profile;
        }

        // Store session data with user profile
        const sessionData = {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            user: {
                id: user.id,
                email: user.email,
                created_at: user.created_at,
                profile: userProfile // Store the full profile data
            },
            expires_at: rememberMe
                ? new Date().getTime() + (365 * 24 * 60 * 60 * 1000) // 1 year
                : new Date().getTime() + (12 * 60 * 60 * 1000) // 12 hours
        };

        // Store session and remember preference
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        localStorage.setItem(REMEMBER_KEY, rememberMe);

        window.location.href = 'dashboard.html';
        return user;
    } catch (error) {
        showToast(error.message, 'error');
        return null;
    }
}

async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        // Clear local storage
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(REMEMBER_KEY);

        window.location.href = 'login.html';
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Add this function to handle magic link authentication
async function handleMagicLinkAuth() {
    try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');

        if (accessToken) {
            const { data: { user }, error } = await supabase.auth.getUser(accessToken);
            if (error) throw error;

            if (user) {
                // Set the session
                const session = {
                    access_token: accessToken,
                    refresh_token: hashParams.get('refresh_token'),
                    expires_in: parseInt(hashParams.get('expires_in')),
                    expires_at: parseInt(hashParams.get('expires_at')),
                    token_type: hashParams.get('token_type')
                };

                await supabase.auth.setSession(session);

                // Clear the hash from URL
                window.location.hash = '';

                // Redirect to dashboard
                window.location.href = 'dashboard.html';
                return;
            }
        }
    } catch (error) {
        console.error('Magic link authentication error:', error);
        alert('Failed to authenticate with magic link. Please try again.');
        window.location.href = 'login.html';
    }
}

// Check authentication status
async function checkAuth() {
    try {
        // First check if there's a magic link token
        if (window.location.hash.includes('access_token')) {
            await handleMagicLinkAuth();
            return;
        }

        // Check local storage session
        const sessionData = JSON.parse(localStorage.getItem(SESSION_KEY));
        const currentTime = new Date().getTime();

        if (!sessionData) {
            return null;
        }

        // Check if session has expired
        if (currentTime > sessionData.expires_at) {
            // Session expired, clear storage
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(REMEMBER_KEY);
            return null;
        }

        // Verify session with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(sessionData.access_token);

        if (error || !user) {
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(REMEMBER_KEY);
            return null;
        }

        return user;
    } catch (error) {
        console.error('Auth check failed:', error);
        return null;
    }
}

// Add function to request magic link
async function requestMagicLink(email) {
    try {
        const { error } = await supabase.auth.signInWithOtp({
            email: email,
            options: {
                emailRedirectTo: window.location.origin // Redirects back to your app
            }
        });

        if (error) throw error;
        alert('Check your email for the magic link!');
    } catch (error) {
        console.error('Error requesting magic link:', error);
        alert(error.message);
    }
}

// Add this function to refresh session
async function refreshSession() {
    try {
        const sessionData = JSON.parse(localStorage.getItem(SESSION_KEY));
        if (!sessionData || !sessionData.refresh_token) return null;

        const { data: { session }, error } = await supabase.auth.refreshSession({
            refresh_token: sessionData.refresh_token
        });

        if (error) throw error;

        // Update session in localStorage
        const rememberMe = localStorage.getItem(REMEMBER_KEY) === 'true';
        const updatedSessionData = {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            user: sessionData.user,
            expires_at: rememberMe
                ? new Date().getTime() + (365 * 24 * 60 * 60 * 1000)
                : new Date().getTime() + (12 * 60 * 60 * 1000)
        };

        localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSessionData));
        return session;
    } catch (error) {
        console.error('Session refresh failed:', error);
        return null;
    }
}

// Add an interval to check and refresh the session
setInterval(async () => {
    const sessionData = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (sessionData) {
        // Refresh 5 minutes before expiration
        const fiveMinutes = 5 * 60 * 1000;
        const currentTime = new Date().getTime();

        if (sessionData.expires_at - currentTime <= fiveMinutes) {
            await refreshSession();
        }
    }
}, 60000); // Check every minute

// Initialize auth check only on specific pages
const currentPage = window.location.pathname.split('/').pop();
if (currentPage === 'login.html' || currentPage === 'dashboard.html') {
    checkAuth();
}

// Add a helper function to get user data
function getCurrentUser() {
    const sessionData = JSON.parse(localStorage.getItem(SESSION_KEY));
    return sessionData?.user || null;
}

// Add a helper function to get user profile
function getCurrentUserProfile() {
    const sessionData = JSON.parse(localStorage.getItem(SESSION_KEY));
    return sessionData?.user?.profile || null;
}

// Update profile data in storage
async function updateStoredProfile(newProfileData) {
    const sessionData = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (sessionData && sessionData.user) {
        sessionData.user.profile = { ...sessionData.user.profile, ...newProfileData };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    }
}

export { signIn, signUp, signOut, checkAuth, requestMagicLink, getCurrentUser, getCurrentUserProfile, updateStoredProfile };
