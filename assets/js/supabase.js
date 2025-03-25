import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
import { config } from './config.js'
import { showToast } from './utils.js'

export const supabase = createClient(config.supabaseUrl, config.supabaseKey)

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
        const { user, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        })
        if (error) throw error
        window.location.href = 'dashboard.html'
        return user
    } catch (error) {
        alert(error.message)
        return null
    }
}

async function signOut() {
    try {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        window.location.href = 'login.html'
    } catch (error) {
        alert(error.message)
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
    // First check if there's a magic link token
    if (window.location.hash.includes('access_token')) {
        await handleMagicLinkAuth();
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const currentPage = window.location.pathname.split('/').pop();

    // If we're not on the index page and there's no user, redirect to index
    if (!user && currentPage !== 'login.html') {
        window.location.href = 'login.html';
        return null;
    }

    // If we're on the index page and there is a user, redirect to dashboard
    if (user && currentPage === 'login.html') {
        window.location.href = 'dashboard.html';
        return user;
    }

    return user;
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

// Initialize auth check only on specific pages
const currentPage = window.location.pathname.split('/').pop();
if (currentPage === 'login.html' || currentPage === 'dashboard.html') {
    checkAuth();
}

export { signIn, signUp, signOut, checkAuth, requestMagicLink };
