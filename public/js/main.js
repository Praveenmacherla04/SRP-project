// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const profileBtn = document.getElementById('profileBtn');
const logoutBtn = document.getElementById('logoutBtn');
const postJobBtn = document.getElementById('postJobBtn');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('mainContent');
const darkModeToggle = document.getElementById('darkModeToggle');
const changePasswordBtn = document.getElementById('changePasswordBtn');
const changePasswordModal = document.getElementById('changePasswordModal');
const photoUpload = document.getElementById('photoUpload');

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const profileSection = document.getElementById('profileSection');
const jobPostingSection = document.getElementById('jobPostingSection');
const jobListings = document.getElementById('jobListings');

// State management
let isLoggedIn = false;
let currentUser = null;

// Location distances (approximate distances between major cities in km)
const cityDistances = {
    'Hyderabad': {
        'Bangalore': 570,
        'Chennai': 630,
        'Mumbai': 710,
        'Delhi': 1580,
        'Pune': 560,
        'Kolkata': 1480
    },
    'Bangalore': {
        'Hyderabad': 570,
        'Chennai': 350,
        'Mumbai': 980,
        'Delhi': 2150,
        'Pune': 840,
        'Kolkata': 1870
    },
    'Chennai': {
        'Hyderabad': 630,
        'Bangalore': 350,
        'Mumbai': 1340,
        'Delhi': 2210,
        'Pune': 1180,
        'Kolkata': 1670
    },
    'Mumbai': {
        'Hyderabad': 710,
        'Bangalore': 980,
        'Chennai': 1340,
        'Delhi': 1420,
        'Pune': 150,
        'Kolkata': 2050
    },
    'Delhi': {
        'Hyderabad': 1580,
        'Bangalore': 2150,
        'Chennai': 2210,
        'Mumbai': 1420,
        'Pune': 1530,
        'Kolkata': 1300
    },
    'Pune': {
        'Hyderabad': 560,
        'Bangalore': 840,
        'Chennai': 1180,
        'Mumbai': 150,
        'Delhi': 1530,
        'Kolkata': 1900
    },
    'Kolkata': {
        'Hyderabad': 1480,
        'Bangalore': 1870,
        'Chennai': 1670,
        'Mumbai': 2050,
        'Delhi': 1300,
        'Pune': 1900
    }
};

// Get distance between two cities
function getDistance(city1, city2) {
    city1 = city1.trim();
    city2 = city2.trim();
    
    // If cities are the same, distance is 0
    if (city1.toLowerCase() === city2.toLowerCase()) {
        return 0;
    }
    
    // Check if we have the distance in our map
    if (cityDistances[city1] && cityDistances[city1][city2]) {
        return cityDistances[city1][city2];
    }
    
    // If we don't have the exact distance, return a large number
    // This will put unknown locations at the end of the sorted list
    return 9999;
}

// Store jobs globally so we don't need to fetch them again when filtering
let allJobs = [];

// Show/Hide UI elements based on auth state
function updateUI() {
    // Navigation buttons
    loginBtn.classList.toggle('hidden', isLoggedIn);
    registerBtn.classList.toggle('hidden', isLoggedIn);
    profileBtn.classList.toggle('hidden', !isLoggedIn);
    logoutBtn.classList.toggle('hidden', !isLoggedIn);
    postJobBtn.classList.toggle('hidden', !isLoggedIn);
    
    // Sidebar and toggle button
    sidebarToggle.classList.toggle('hidden', !isLoggedIn);
    if (!isLoggedIn) {
        sidebar.classList.add('hidden', 'collapsed');
        mainContent.classList.remove('ml-[300px]');
    } else {
        sidebar.classList.remove('hidden');
    }
}

// Check login status on page load
async function checkLoginStatus() {
    try {
        const response = await fetch('/api/profile');
        if (response.ok) {
            const profile = await response.json();
            isLoggedIn = true;
            currentUser = profile;
            updateUI();
            loadProfile();
            loadUserJobs();
        }
    } catch (error) {
        console.error('Error checking login status:', error);
    }
}

// Navigation handlers
loginBtn.addEventListener('click', () => {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    profileSection.classList.add('hidden');
    jobPostingSection.classList.add('hidden');
});

registerBtn.addEventListener('click', () => {
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    profileSection.classList.add('hidden');
    jobPostingSection.classList.add('hidden');
});

profileBtn.addEventListener('click', () => {
    profileSection.classList.remove('hidden');
    loginForm.classList.add('hidden');
    registerForm.classList.add('hidden');
    jobPostingSection.classList.add('hidden');
    loadProfile();
});

postJobBtn.addEventListener('click', () => {
    jobPostingSection.classList.remove('hidden');
    profileSection.classList.add('hidden');
    loginForm.classList.add('hidden');
    registerForm.classList.add('hidden');
});

// Sidebar Toggle
sidebarToggle.addEventListener('click', () => {
    if (!isLoggedIn) return;
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('ml-[300px]');
});

// Dark Mode Toggle
darkModeToggle.addEventListener('change', () => {
    document.documentElement.classList.toggle('dark');
    if (isLoggedIn) {
        fetch('/api/settings/theme', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme: darkModeToggle.checked ? 'dark' : 'light' })
        });
    }
});

// Profile Photo Upload
photoUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    try {
        const response = await fetch('/api/profile/photo', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('profilePhoto').src = data.photoUrl;
        } else {
            alert('Failed to upload photo');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while uploading photo');
    }
});

// Change Password
changePasswordBtn.addEventListener('click', () => {
    changePasswordModal.classList.remove('hidden');
    changePasswordModal.classList.add('flex');
});

document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = e.target.elements[0].value;
    const newPassword = e.target.elements[1].value;
    const confirmPassword = e.target.elements[2].value;

    if (newPassword !== confirmPassword) {
        alert('New passwords do not match');
        return;
    }

    try {
        const response = await fetch('/api/settings/password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        if (response.ok) {
            alert('Password changed successfully');
            changePasswordModal.classList.add('hidden');
            e.target.reset();
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to change password');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred');
    }
});

// Profile Update
document.getElementById('saveProfile').addEventListener('click', async () => {
    const username = document.getElementById('profileName').textContent;
    const whatsappNumber = document.getElementById('whatsappNumber').value;
    const skills = document.getElementById('skills').value;

    try {
        const response = await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, whatsapp_number: whatsappNumber, skills })
        });

        if (response.ok) {
            alert('Profile updated successfully');
        } else {
            alert('Failed to update profile');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred');
    }
});

// Login form handler
document.getElementById('loginFormElement').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.elements[0].value;
    const password = e.target.elements[1].value;

    console.log('Attempting login for email:', email);

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        console.log('Login response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Login successful, received user data:', data);
            
            isLoggedIn = true;
            currentUser = data.user;
            
            // Update UI first
            updateUI();
            loginForm.classList.add('hidden');
            
            // Then load all the user-specific data
            await Promise.all([
                loadJobs(),
                loadProfile(),
                loadUserJobs()
            ]);
            
            // Show sidebar after successful login
            sidebar.classList.remove('hidden');
            sidebarToggle.classList.remove('hidden');
            
            e.target.reset();
        } else {
            const errorData = await response.json();
            console.error('Login failed:', errorData);
            alert(errorData.error || 'Invalid credentials');
        }
    } catch (error) {
        console.error('Error during login:', error);
        alert('An error occurred during login');
    }
});

document.getElementById('registerFormElement').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = e.target.elements[0].value;
    const email = e.target.elements[1].value;
    const password = e.target.elements[2].value;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        if (response.ok) {
            alert('Registration successful! Please login.');
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            e.target.reset();
        } else {
            alert('Registration failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred');
    }
});

// Logout handler
logoutBtn.addEventListener('click', async () => {
    try {
        await fetch('/api/logout', { method: 'POST' });
        isLoggedIn = false;
        currentUser = null;
        updateUI();
        loadJobs();
        
        // Hide sidebar on logout
        sidebar.classList.add('hidden', 'collapsed');
        mainContent.classList.remove('ml-[300px]');
        
        // Reset forms and UI state
        document.getElementById('profilePhoto').src = '/images/default-avatar.png';
        document.getElementById('whatsappNumber').value = '';
        document.getElementById('skills').value = '';
        darkModeToggle.checked = false;
        document.documentElement.classList.remove('dark');
    } catch (error) {
        console.error('Error:', error);
    }
});

// Job handlers
document.getElementById('jobForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = e.target.elements[0].value;
    const company = e.target.elements[1].value;
    const location = e.target.elements[2].value;
    const description = e.target.elements[3].value;

    try {
        const response = await fetch('/api/jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, company, location, description })
        });

        if (response.ok) {
            alert('Job posted successfully');
            jobPostingSection.classList.add('hidden');
            e.target.reset();
            loadJobs();
        } else {
            alert('Failed to post job');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred');
    }
});

// Load and filter jobs
async function loadJobs() {
    try {
        if (allJobs.length === 0) {
            const response = await fetch('/api/jobs');
            allJobs = await response.json();
        }

        const selectedLocation = document.getElementById('locationFilter').value;
        let jobsToDisplay = [...allJobs];

        if (selectedLocation) {
            // Sort jobs by distance from selected location
            jobsToDisplay.sort((a, b) => {
                const distanceA = getDistance(selectedLocation, a.location);
                const distanceB = getDistance(selectedLocation, b.location);
                return distanceA - distanceB;
            });
        }
        
        jobListings.innerHTML = jobsToDisplay.map(job => `
            <div class="bg-white p-6 rounded-lg shadow-md">
                <div class="flex justify-between items-start">
                    <div class="w-full">
                        <h3 class="text-xl font-bold text-blue-600">${job.title}</h3>
                        <p class="text-gray-600">${job.company} - ${job.location}</p>
                        <p class="text-gray-500 text-sm">Posted by ${job.username}</p>
                        <p class="mt-2">${job.description}</p>
                        ${selectedLocation ? `
                            <p class="text-sm text-gray-500 mt-2">
                                Distance: ${getDistance(selectedLocation, job.location)} km
                            </p>
                        ` : ''}
                        <div class="mt-4 flex justify-between items-center">
                            <button onclick="showContactInfo(${job.user_id})" class="button-3d bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                                Contact Poster
                            </button>
                            ${isLoggedIn && job.user_id === getUserId() ? `
                                <button onclick="deleteJob(${job.id})" class="button-3d text-red-600 hover:text-red-800">
                                    Delete
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading jobs:', error);
    }
}

// Add event listener for location filter
document.getElementById('locationFilter').addEventListener('change', loadJobs);

async function deleteJob(jobId) {
    if (!confirm('Are you sure you want to delete this job?')) return;

    try {
        const response = await fetch(`/api/jobs/${jobId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadJobs();
        } else {
            alert('Failed to delete job');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred');
    }
}

// Load User's Jobs
async function loadUserJobs() {
    if (!isLoggedIn) return;

    try {
        const response = await fetch('/api/user/jobs');
        const jobs = await response.json();
        
        const userJobsContainer = document.getElementById('userJobs');
        userJobsContainer.innerHTML = jobs.map(job => `
            <div class="card-3d glass p-4 rounded-lg">
                <h4 class="font-bold">${job.title}</h4>
                <p class="text-sm text-gray-600">${job.company}</p>
                <button onclick="deleteJob(${job.id})" class="text-red-500 text-sm mt-2">Delete</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
    }
}

// Load Profile
async function loadProfile() {
    if (!isLoggedIn) return;

    try {
        const response = await fetch('/api/profile');
        if (response.ok) {
            const profile = await response.json();
            currentUser = profile;
            
            document.getElementById('profileName').textContent = profile.username;
            document.getElementById('whatsappNumber').value = profile.whatsapp_number || '';
            document.getElementById('skills').value = profile.skills || '';
            
            if (profile.profile_photo) {
                document.getElementById('profilePhoto').src = profile.profile_photo;
            }
            
            // Set theme
            if (profile.theme_preference === 'dark') {
                darkModeToggle.checked = true;
                document.documentElement.classList.add('dark');
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Helper function to get user ID
function getUserId() {
    return currentUser ? currentUser.id : null;
}

// Show contact information
async function showContactInfo(userId) {
    if (!userId) {
        console.error('No user ID provided');
        return;
    }
    console.log('Showing contact info for user:', userId); // Debug log
    
    try {
        const response = await fetch(`/api/users/${userId}/contact`);
        if (!response.ok) {
            throw new Error('Failed to fetch contact information');
        }
        
        const userData = await response.json();
        console.log('Received user data:', userData); // Debug log
        
        // Update modal content
        document.getElementById('contactName').textContent = userData.username;
        document.getElementById('contactWhatsapp').textContent = userData.whatsapp_number || 'Not provided';
        document.getElementById('contactSkills').textContent = userData.skills || 'Not specified';
        
        // Update WhatsApp link
        const whatsappLink = document.getElementById('whatsappLink');
        if (userData.whatsapp_number) {
            const cleanNumber = userData.whatsapp_number.replace(/\D/g, '');
            whatsappLink.href = `https://wa.me/${cleanNumber}`;
            whatsappLink.style.display = 'inline-block';
        } else {
            whatsappLink.style.display = 'none';
        }
        
        // Show modal
        const modal = document.getElementById('contactModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    } catch (error) {
        console.error('Error fetching contact info:', error);
        alert('Failed to fetch contact information');
    }
}

// Initialize
checkLoginStatus();
loadJobs(); 