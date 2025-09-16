// Enhanced Director Explorer Pro - JavaScript
// API Configuration
const API_BASE = "https://directorbackend.onrender.com";
const BLANK_IMG = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
const UNNAMED_IMG = "./unnamed.png";
const NOIMAGE_IMG = "./noimageavailable.jpg";
// Language mapping
const LANG_MAP = {
  en: "English", ta: "Tamil", hi: "Hindi", fr: "French", es: "Spanish",
  ja: "Japanese", ko: "Korean", de: "German", it: "Italian", ru: "Russian",
  zh: "Chinese", pt: "Portuguese", ar: "Arabic", th: "Thai", tr: "Turkish"
};

// Global state
let lastSearchResults = null;
let lastDirectorId = null;
let modalImgs = [];
let modalIdx = 0;
let searchTimeout = null;
let currentTheme = localStorage.getItem('theme') || 'light';

// Initialize app
document.addEventListener('DOMContentLoaded', function () {
  // Your initialization code here
  initializeApp();
});

function initializeApp() {
  // Setup scroll to top button
  setupScrollToTop();

  // Setup search suggestions
  setupEventListeners();

  // Show welcome message
  showToast('Welcome to Director Explorer Pro!', 'info');
}

function setupEventListeners() {
  // Search input events
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('keypress', handleSearchKeypress);
  searchInput.addEventListener('input', handleSearchInput);

  // Modal events
  const modal = document.getElementById('imgModal');
  modal.addEventListener('click', handleModalClick);

  // Keyboard navigation
  document.addEventListener('keydown', handleKeyboardNavigation);

  // Scroll events
  window.addEventListener('scroll', handleScroll);
}

// Theme Management
function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(currentTheme);
  localStorage.setItem('theme', currentTheme);

  const icon = document.querySelector('.theme-toggle i');
  icon.className = currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';

  showToast(`Switched to ${currentTheme} mode`, 'info');
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.querySelector('.theme-toggle i');
  if (icon) {
    icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
  }
}

// Utility Functions
function showLoading() {
  document.getElementById('loadingSpinner').style.display = 'flex';
  document.querySelector('.loading-text').textContent = "Lights, Camera, Action!";
}

function hideLoading() {
  document.getElementById('loadingSpinner').style.display = 'none';
}

function getImageUrl(path, size = 'w200') {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : UNNAMED_IMG;
}

function formatCurrency(amount) {
  if (!amount) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(amount);
}

function formatDate(dateString) {
  if (!dateString || dateString === "N/A") return 'N/A';
  // Accepts both yyyy-mm-dd and dd-mm-yyyy
  let dateObj;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    // yyyy-mm-dd
    dateObj = new Date(dateString);
  } else if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
    // dd-mm-yyyy
    const [day, month, year] = dateString.split('-');
    dateObj = new Date(`${year}-${month}-${day}`);
  } else {
    // fallback
    dateObj = new Date(dateString);
  }
  if (isNaN(dateObj)) return 'N/A';
  // Format: 15 September 2025
  return dateObj.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// Toast Notifications
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = type === 'success' ? 'check-circle' :
    type === 'error' ? 'exclamation-triangle' : 'info-circle';

  toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => container.removeChild(toast), 300);
  }, duration);
}

// Search Functionality
function handleSearchKeypress(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    searchDirector();
  }
}

function handleSearchInput(e) {
  clearTimeout(searchTimeout);
  const query = e.target.value.trim();

  if (query.length > 2) {
    searchTimeout = setTimeout(() => {
      // Show search suggestions (mock implementation)
      showSearchSuggestions(query);
    }, 300);
  } else {
    hideSearchSuggestions();
  }
}

function showSearchSuggestions(query) {
  // Mock suggestions - in real app, this would be an API call
  const suggestions = [
    'Christopher Nolan',
    'Martin Scorsese',
    'Quentin Tarantino',
    'Steven Spielberg',
    'Denis Villeneuve'
  ].filter(name => name.toLowerCase().includes(query.toLowerCase()));

  const container = document.getElementById('searchSuggestions');

  if (suggestions.length > 0) {
    container.innerHTML = suggestions.map(suggestion =>
      `<div class="suggestion-item" onclick="selectSuggestion('${suggestion}')">${suggestion}</div>`
    ).join('');
    container.style.display = 'block';
  } else {
    hideSearchSuggestions();
  }
}

function hideSearchSuggestions() {
  document.getElementById('searchSuggestions').style.display = 'none';
}

function selectSuggestion(suggestion) {
  document.getElementById('searchInput').value = suggestion;
  hideSearchSuggestions();
  searchDirector();
}

function quickSearch(name) {
  document.getElementById('searchInput').value = name;
  searchDirector();
}

async function searchDirector() {
  const name = document.getElementById('searchInput').value.trim();
  if (!name) {
    showToast('Please enter a director name', 'error');
    return;
  }

  hideSearchSuggestions();
  showLoading();

  try {
    const res = await fetch(`${API_BASE}/search_director?name=${encodeURIComponent(name)}`);

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    lastSearchResults = data;
    renderSearchResults(data);

    if (data.results && data.results.length > 0) {
      showToast(`Found ${data.results.length} director(s)`, 'success');
    } else {
      showToast('No directors found', 'info');
    }

  } catch (error) {
    console.error('Search failed:', error);
    showToast('Search failed. Please check your connection and try again.', 'error');
    renderErrorState('Search failed. Please try again.');
  } finally {
    hideLoading();
  }
}

function renderSearchResults(data) {
  const resultsDiv = document.getElementById("results");

  if (data.results && data.results.length > 0) {
    resultsDiv.innerHTML = `
            <div class="director-grid">
                ${data.results.map(director => `
                    <div class="director-card" data-director-id="${director.id}">
                        <h3>${escapeHtml(director.name)}</h3>
                        <img src="${getImageUrl(director.profile_path)}" 
                             alt="${escapeHtml(director.name)}" 
                             class="director-avatar"
                             loading="lazy">
                        <p class="director-known-for">
                            ${director.known_for_department || 'Director'}
                        </p>
                        <button class="btn" onclick="loadDetails(${director.id})">
                            <i class="fas fa-eye"></i>
                            View Details
                        </button>
                    </div>
                `).join('')}
            </div>
        `;

    // Add animation to cards
    animateCards();
  } else {
    renderEmptyState();
  }
}

function renderEmptyState() {
  document.getElementById("results").innerHTML = `
        <div class="welcome-state">
            <div class="welcome-icon">
                <i class="fas fa-search"></i>
            </div>
            <h2>No directors found</h2>
            <p>Try searching with a different name or check the spelling</p>
        </div>
    `;
}

function renderErrorState(message) {
  document.getElementById("results").innerHTML = `
        <div class="welcome-state">
            <div class="welcome-icon" style="color: var(--destructive);">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h2>Something went wrong</h2>
            <p>${escapeHtml(message)}</p>
            <button class="btn" onclick="location.reload()">
                <i class="fas fa-refresh"></i>
                Refresh Page
            </button>
        </div>
    `;
}

// Director Details
async function loadDetails(id) {
  lastDirectorId = id;
  showLoading();

  try {
    const [resDetails, resMovies, resGenres, resCollab, resImages] = await Promise.all([
      fetch(`${API_BASE}/director/${id}`),
      fetch(`${API_BASE}/director/${id}/movies`),
      fetch(`${API_BASE}/director/${id}/genres`),
      fetch(`${API_BASE}/director/${id}/collaborators`),
      fetch(`${API_BASE}/director/${id}/images`)
    ]);

    // Check if all requests were successful
    const responses = [resDetails, resMovies, resGenres, resCollab, resImages];
    for (let res of responses) {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    }

    const [details, movies, genres, collabs, images] = await Promise.all(
      responses.map(res => res.json())
    );

    renderDirectorDetails(details, movies, genres, collabs, images);
    showToast('Director details loaded successfully', 'success');

  } catch (error) {
    console.error('Failed to load director details:', error);
    showToast('Failed to load director details', 'error');
    renderErrorState('Failed to load director details. Please try again.');
  } finally {
    hideLoading();
  }
}

function renderDirectorDetails(details, movies, genres, collabs, images) {
  const galleryImgs = (images.profiles || []).slice(0, 12).map(img =>
    `https://image.tmdb.org/t/p/original${img.file_path}`
  );

  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = `
        <div class="director-details">
            <button class="btn back-btn" onclick="renderSearchResults(lastSearchResults)">
                <i class="fas fa-arrow-left"></i>
                Back to Results
            </button>
            
            <h2>${escapeHtml(details.name)}</h2>
            
            <div class="director-profile">
                <img src="${getImageUrl(details.profile_path, 'w500')}" 
                     alt="${escapeHtml(details.name)}"
                     loading="lazy">
                <div class="director-info">
                    <p><strong><i class="fas fa-birthday-cake"></i> Born:</strong> ${formatDate(details.birthday)}</p>
                    ${details.deathday ? `<p><strong><i class="fas fa-cross"></i> Died:</strong> ${formatDate(details.deathday)}</p>` : ''}
                    <p><strong><i class="fas fa-map-marker-alt"></i> Place of Birth:</strong> ${escapeHtml(details.place_of_birth) || "Unknown"}</p>
                    <p><strong><i class="fas fa-info-circle"></i> Biography:</strong></p>
                    <p class="biography">${escapeHtml(details.biography) || "No biography available."}</p>
                </div>
            </div>

            ${renderCollaborators(collabs)}
            ${renderFilmography(movies)}
            ${renderGenres(genres)}
            ${renderGallery(images, galleryImgs)}
        </div>
    `;

  // Scroll to top of details
  document.querySelector('.director-details').scrollIntoView({ behavior: 'smooth' });
}

function renderCollaborators(collabs) {
  return `
        <h3 class="section-header">
            <i class="fas fa-users"></i>
            Frequent Collaborators
        </h3>
        
        ${(collabs.actors && collabs.actors.length > 0) ? `
            <h4><i class="fas fa-theater-masks"></i> Actors</h4>
            <div class="swipe-scroll" style="margin-bottom: 2rem;">
                ${collabs.actors.slice(0, 8).map(actor => `
                    <div class="collab-card">
                        <img class="collab-img big-collab-img" 
                             src="${getImageUrl(actor.profile_path)}" 
                             alt="${escapeHtml(actor.name)}"
                             loading="lazy">
                        <div>
                            <strong>${escapeHtml(actor.name)}</strong>
                            <br>${actor.count} collaboration${actor.count !== 1 ? 's' : ''}
                        </div>
                    </div>
                `).join("")}
            </div>
        ` : ''}
        
        ${(collabs.writers && collabs.writers.length > 0) ? `
            <h4 style="margin-top: 2rem;"><i class="fas fa-pen"></i> Writers</h4>
            <div class="swipe-scroll">
                ${collabs.writers.slice(0, 8).map(writer => `
                    <div class="collab-card">
                        <img class="collab-img big-collab-img" 
                             src="${getImageUrl(writer.profile_path)}" 
                             alt="${escapeHtml(writer.name)}"
                             loading="lazy">
                        <div>
                            <strong>${escapeHtml(writer.name)}</strong>
                            <br>${writer.count} collaboration${writer.count !== 1 ? 's' : ''}
                        </div>
                    </div>
                `).join("")}
            </div>
        ` : ''}
    `;
}

function renderFilmography(movies) {
  if (!movies.filmography || movies.filmography.length === 0) {
    return `
            <h3 class="section-header">
                <i class="fas fa-film"></i>
                Filmography
            </h3>
            <p>No filmography available.</p>
        `;
  }

  return `
        <h3 class="section-header">
            <i class="fas fa-film"></i>
            Filmography (${movies.filmography.length} films)
        </h3>
        <div class="flex-grid">
            ${movies.filmography.map((movie, idx) => `
                <div class="movie-card${idx === 0 ? ' latest-film' : ''}" onclick="loadMovie(${movie.id}, ${lastDirectorId})">
                    ${idx === 0 ? `<div style="position:absolute;top:0;left:0;width:100%;height:100%;border:3px solid var(--accent);border-radius:var(--radius);pointer-events:none;z-index:1;"></div>` : ''}
                    <h4>${escapeHtml(movie.title)}</h4>
                    <p style="color: var(--muted-foreground); margin-bottom: 1rem;">
                        ${formatDate(movie.release_date)}
                    </p>
                    <img class="poster" 
                         src="${getImageUrl(movie.poster_path)}" 
                         alt="${escapeHtml(movie.title)}"
                         loading="lazy">
                    <div style="margin-top: 1rem;">
                        <span style="color: var(--accent);">
                            <i class="fas fa-star"></i> 
                            ${movie.vote_average ? Math.round(movie.vote_average * 10) + ' % user score' : 'N/A'}
                        </span>
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}

function renderGenres(genres) {
  if (!genres || Object.keys(genres).length === 0) {
    return '';
  }

  // Prepare data for Chart.js
  const labels = Object.keys(genres);
  const data = Object.values(genres);

  // Generate a random color for each genre
  const backgroundColors = labels.map(() =>
    `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`
  );

  // Chart container and canvas
  setTimeout(() => {
    const ctx = document.getElementById('genrePieChart');
    if (ctx) {
      new Chart(ctx, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: backgroundColors,
            borderWidth: 1
          }]
        },
        options: {
          plugins: {
            legend: {
              position: 'bottom'
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  return `${label}: ${value}`;
                }
              }
            }
          }
        }
      });
    }
  }, 0);

  return `
    <h3 class="section-header">
      <i class="fas fa-tags"></i>
      Favorite Genres
    </h3>
    <div style="width:100%;max-width:400px;margin:auto;">
      <canvas id="genrePieChart" width="400" height="400"></canvas>
    </div>
  `;
}

function renderGallery(images, galleryImgs) {
  if (!images.profiles || images.profiles.length === 0) {
    return '';
  }

  return `
        <h3 class="section-header">
            <i class="fas fa-images"></i>
            Photo Gallery (${images.profiles.length} photos)
        </h3>
        <div class="gallery-grid">
            ${images.profiles.slice(0, 12).map((img, idx) => `
                <img class="gallery-img" 
                     src="${getImageUrl(img.file_path, 'w300')}" 
                     alt="Gallery photo ${idx + 1}" 
                     onclick="openModal([${galleryImgs.map(url => `'${url}'`).join(',')}], ${idx})"
                     loading="lazy">
            `).join("")}
        </div>
    `;
}

// Movie Details
async function loadMovie(movieId, directorId = null) {
  showLoading();

  try {
    const res = await fetch(`${API_BASE}/movie/${movieId}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const movie = await res.json();
    renderMovieDetails(movie, directorId);
    showToast('Movie details loaded successfully', 'success');

  } catch (error) {
    console.error('Failed to load movie details:', error);
    showToast('Failed to load movie details', 'error');
    renderErrorState('Failed to load movie details. Please try again.');
  } finally {
    hideLoading();
  }
}

function renderMovieDetails(movie, directorId) {
  const lang = LANG_MAP[movie.original_language] || movie.original_language;
  const posters = (movie.images?.posters || []).slice(0, 6).map(p =>
    `https://image.tmdb.org/t/p/original${p.file_path}`
  );
  const backdrops = (movie.images?.backdrops || []).slice(0, 6).map(b =>
    `https://image.tmdb.org/t/p/original${b.file_path}`
  );
  const allImgs = [...posters, ...backdrops];

  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = `
        <div class="director-details">
            <button class="btn back-btn" onclick="loadDetails(${directorId || lastDirectorId || 'null'})">
                <i class="fas fa-arrow-left"></i>
                Back to Director
            </button>
            
            <h2>${escapeHtml(movie.title)}</h2>
            
            <div class="director-profile">
                <img class="poster" 
                     src="${getImageUrl(movie.poster_path, 'w500')}" 
                     alt="${escapeHtml(movie.title)}"
                     loading="lazy">
                <div class="director-info">
                    <p><strong><i class="fas fa-calendar"></i> Release Date:</strong> ${formatDate(movie.release_date)}</p>
                    <p><strong><i class="fas fa-dollar-sign"></i> Budget:</strong> ${formatCurrency(movie.budget)}</p>
                    <p><strong><i class="fas fa-money-bill-wave"></i> Revenue:</strong> ${formatCurrency(movie.revenue)}</p>
                    <p><strong><i class="fas fa-clock"></i> Runtime:</strong> ${movie.runtime || 'N/A'} minutes</p>
                    <p><strong><i class="fas fa-language"></i> Language:</strong> ${escapeHtml(lang)}</p>
                    <p><strong><i class="fas fa-star"></i> User Score:</strong> ${movie.vote_average ? Math.round(movie.vote_average * 10) + ' % user score' : 'N/A'}</p>
                    <p><strong><i class="fas fa-users"></i> Vote Count:</strong> ${movie.vote_count?.toLocaleString() || 'N/A'}</p>
                    ${movie.overview ? `
                        <p><strong><i class="fas fa-info-circle"></i> Overview:</strong></p>
                        <p class="biography">${escapeHtml(movie.overview)}</p>
                    ` : ''}
                </div>
            </div>

            ${renderMovieGenres(movie.genres)}
            ${renderMovieCast(movie.credits?.cast)}
            ${renderMovieCrew(movie.credits?.crew)}
            ${renderSimilarMovies(movie.similar?.results, directorId)}
            ${renderMovieGallery(posters, backdrops, allImgs)}
        </div>
    `;

  // Scroll to top of details
  document.querySelector('.director-details').scrollIntoView({ behavior: 'smooth' });
}

function renderMovieGenres(genres) {
  if (!genres || genres.length === 0) return '';

  return `
        <h3 class="section-header">
            <i class="fas fa-tags"></i>
            Genres
        </h3>
        <ul class="genre-list">
            ${genres.map(g => `<li>${escapeHtml(g.name)}</li>`).join("")}
        </ul>
    `;
}

function renderMovieCast(cast) {
  if (!cast || cast.length === 0) return '';

  return `
        <h3 class="section-header">
            <i class="fas fa-users"></i>
            Cast
        </h3>
        <div class="swipe-scroll">
            ${cast.slice(0, 12).map(c => `
                <div class="collab-card">
                    <img class="collab-img big-collab-img" 
                         src="${getImageUrl(c.profile_path)}" 
                         alt="${escapeHtml(c.name)}"
                         loading="lazy">
                    <div>
                        <strong>${escapeHtml(c.name)}</strong>
                        <br>as ${escapeHtml(c.character || 'Unknown')}
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}

function renderMovieCrew(crew) {
  if (!crew || crew.length === 0) return '';

  return `
        <h3 class="section-header">
            <i class="fas fa-cogs"></i>
            Key Crew
        </h3>
        <div class="swipe-scroll">
            ${crew.slice(0, 12).map(c => `
                <div class="collab-card">
                    <img class="collab-img big-collab-img" 
                         src="${getImageUrl(c.profile_path)}" 
                         alt="${escapeHtml(c.name)}"
                         loading="lazy">
                    <div>
                        <strong>${escapeHtml(c.name)}</strong>
                        <br>${escapeHtml(c.job || 'Unknown')}
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}

function renderSimilarMovies(similar, directorId) {
  if (!similar || similar.length === 0) return '';

  return `
        <h3 class="section-header">
            <i class="fas fa-thumbs-up"></i>
            Similar Movies
        </h3>
        <div class="flex-grid">
            ${similar.slice(0, 8).map(s => `
                <div class="movie-card" onclick="loadMovie(${s.id}, ${directorId || lastDirectorId || 'null'})">
                    <h4>${escapeHtml(s.title)}</h4>
                    <p style="color: var(--muted-foreground); margin-bottom: 1rem;">
                        ${formatDate(s.release_date)}
                    </p>
                    <img class="poster" 
                         src="${getImageUrl(s.poster_path)}" 
                         alt="${escapeHtml(s.title)}"
                         loading="lazy">
                    <div style="margin-top: 1rem;">
                        <span style="color: var(--accent);">
                            <i class="fas fa-star"></i> 
                            ${s.vote_average ? Math.round(s.vote_average * 10) + ' % user score' : 'N/A'}
                        </span>
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}

function renderMovieGallery(posters, backdrops, allImgs) {
  if (allImgs.length === 0) return '';

  return `
        <h3 class="section-header">
            <i class="fas fa-images"></i>
            Posters & Backdrops (${allImgs.length} images)
        </h3>
        <div class="gallery-grid">
            ${posters.map((url, idx) => `
                <img class="gallery-img" 
                     src="${url.replace('/original', '/w300')}" 
                     alt="Movie poster ${idx + 1}"
                     onclick="openModal([${allImgs.map(u => `'${u}'`).join(',')}], ${idx})"
                     loading="lazy">
            `).join("")}
            ${backdrops.map((url, idx) => `
                <img class="gallery-img" 
                     src="${url.replace('/original', '/w300')}" 
                     alt="Movie backdrop ${idx + 1}"
                     onclick="openModal([${allImgs.map(u => `'${u}'`).join(',')}], ${posters.length + idx})"
                     loading="lazy">
            `).join("")}
        </div>
    `;
}

// Modal Functions
function openModal(imgArr, idx) {
  modalImgs = imgArr;
  modalIdx = idx;
  const modal = document.getElementById('imgModal');
  modal.style.display = 'flex';
  showModalImg();
  document.body.style.overflow = 'hidden';
}

function showModalImg() {
  const modalImg = document.getElementById('modalImg');
  const modalCounter = document.getElementById('modalCounter');

  modalImg.src = modalImgs[modalIdx];
  modalCounter.textContent = `${modalIdx + 1} of ${modalImgs.length}`;
}

function closeModal() {
  document.getElementById('imgModal').style.display = 'none';
  document.body.style.overflow = 'auto';
  modalImgs = [];
  modalIdx = 0;
}

function prevModalImg() {
  if (modalImgs.length > 0) {
    modalIdx = (modalIdx - 1 + modalImgs.length) % modalImgs.length;
    showModalImg();
  }
}

function nextModalImg() {
  if (modalImgs.length > 0) {
    modalIdx = (modalIdx + 1) % modalImgs.length;
    showModalImg();
  }
}

// Event Handlers
function handleModalClick(e) {
  if (e.target === e.currentTarget) {
    closeModal();
  }
}

function handleKeyboardNavigation(e) {
  const modal = document.getElementById('imgModal');
  if (modal.style.display === 'flex') {
    switch (e.key) {
      case 'Escape':
        closeModal();
        break;
      case 'ArrowLeft':
        prevModalImg();
        break;
      case 'ArrowRight':
        nextModalImg();
        break;
    }
  }
}

function handleScroll() {
  const scrollBtn = document.getElementById('scrollToTop');
  if (window.pageYOffset > 300) {
    scrollBtn.classList.add('visible');
  } else {
    scrollBtn.classList.remove('visible');
  }
}

// Scroll to Top
function setupScrollToTop() {
  const scrollBtn = document.getElementById('scrollToTop');
  if (scrollBtn) {
    scrollBtn.addEventListener('click', scrollToTop);
  }
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

// Animation Functions
function animateCards() {
  const cards = document.querySelectorAll('.director-card');
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';

    setTimeout(() => {
      card.style.transition = 'all 0.5s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, index * 100);
  });
}

// Utility Functions
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function toggleMobileMenu() {
  // Mobile menu functionality can be added here
  showToast('Mobile menu functionality coming soon!', 'info');
}

// Error Handling
window.addEventListener('error', function (e) {
  if (e.message && e.message.includes('An unexpected error occurred')) return;
  showToast('An unexpected error occurred', 'error');
});
window.addEventListener('unhandledrejection', function (e) {
  if (e.reason && e.reason.message && e.reason.message.includes('An unexpected error occurred')) return;
  showToast('An unexpected error occurred', 'error');
});