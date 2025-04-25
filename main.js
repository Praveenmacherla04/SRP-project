async function checkLoginStatus() {
  try {
    const response = await fetch('/api/profile');
    if (!response.ok) {
      if (response.status === 401) {
        isLoggedIn = false;
        currentUser = null;
      } else {
        console.error('Error checking login status:', response.statusText);
      }
      return;
    }
    const userData = await response.json();
    isLoggedIn = true;
    currentUser = userData;
    updateUI();
  } catch (error) {
    console.error('Error checking login status:', error);
    isLoggedIn = false;
    currentUser = null;
  }
} 