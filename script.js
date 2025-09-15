// API Configuration
const API_BASE = "http://127.0.0.1:5000";
const BLANK_IMG = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
const UNNAMED_IMG = "./unnamed.png";
const NOIMAGE_IMG = "noimageavailable.jpg";

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

// Utility functions
function showLoading() {
    document.getElementById('loadingSpinner').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loadingSpinner').style.display = 'none';
}

function getImageUrl(path, size = 'w200') {
    return path ? `https://image.tmdb.org/t/p/${size}${path}` : UNNAMED_IMG;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
    }).format(amount);
}

// Modal functions
function openModal(imgArr, idx) {
    modalImgs = imgArr;
    modalIdx = idx;
    document.getElementById('imgModal').style.display = 'flex';
    showModalImg();
}

function showModalImg() {
    document.getElementById('modalImg').src = modalImgs[modalIdx];
}

function closeModal() {
    document.getElementById('imgModal').style.display = 'none';
    modalImgs = [];
    modalIdx = 0;
}

function prevModalImg() {
    if (modalImgs.length) {
        modalIdx = (modalIdx - 1 + modalImgs.length) % modalImgs.length;
        showModalImg();
    }
}

function nextModalImg() {
    if (modalImgs.length) {
        modalIdx = (modalIdx + 1) % modalImgs.length;
        showModalImg();
    }
}

// Search functionality
async function searchDirector() {
    const name = document.getElementById("searchInput").value.trim();
    if (!name) return;

    showLoading();
    try {
        const res = await fetch(`${API_BASE}/search_director?name=${encodeURIComponent(name)}`);
        const data = await res.json();
        lastSearchResults = data;
        renderSearchResults(data);
    } catch (error) {
        console.error('Search failed:', error);
        document.getElementById("results").innerHTML = `
      <div class="director-card">
        <p style="color: #e74c3c;"><i class="fas fa-exclamation-triangle"></i> Search failed. Please try again.</p>
      </div>
    `;
    } finally {
        hideLoading();
    }
}

function renderSearchResults(data) {
    const resultsDiv = document.getElementById("results");

    if (data.results && data.results.length > 0) {
        resultsDiv.innerHTML = data.results.map(director => `
      <div class="director-card">
        <h3>${director.name}</h3>
        <img src="${getImageUrl(director.profile_path)}" alt="${director.name}">
        <button class="btn" onclick="loadDetails(${director.id})">
          <i class="fas fa-eye"></i>
          View Details
        </button>
      </div>
    `).join('');
    } else {
        resultsDiv.innerHTML = `
      <div class="director-card">
        <i class="fas fa-search" style="font-size: 3rem; color: #ccc; margin-bottom: 20px;"></i>
        <p>No directors found. Try a different search term.</p>
      </div>
    `;
    }
}

// Director details
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

        const details = await resDetails.json();
        const movies = await resMovies.json();
        const genres = await resGenres.json();
        const collabs = await resCollab.json();
        const images = await resImages.json();

        renderDirectorDetails(details, movies, genres, collabs, images);
    } catch (error) {
        console.error('Failed to load director details:', error);
        document.getElementById("results").innerHTML = `
      <div class="director-card">
        <p style="color: #e74c3c;"><i class="fas fa-exclamation-triangle"></i> Failed to load director details.</p>
      </div>
    `;
    } finally {
        hideLoading();
    }
}

function renderDirectorDetails(details, movies, genres, collabs, images) {
    const galleryImgs = (images.profiles || []).slice(0, 8).map(img =>
        `https://image.tmdb.org/t/p/original${img.file_path}`
    );

    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = `
    <div class="director-details">
      <button class="btn back-btn" onclick="renderSearchResults(lastSearchResults)">
        <i class="fas fa-arrow-left"></i>
        Back to Results
      </button>
      
      <h2>${details.name}</h2>
      
      <div class="director-profile">
        <img src="${getImageUrl(details.profile_path, 'w500')}" alt="${details.name}">
        <div class="director-info">
          <p><strong><i class="fas fa-birthday-cake"></i> Born:</strong> ${details.birthday || "N/A"}</p>
          <p><strong><i class="fas fa-map-marker-alt"></i> Place of Birth:</strong> ${details.place_of_birth || "Unknown"}</p>
          <p><strong><i class="fas fa-info-circle"></i> Biography:</strong></p>
          <p>${details.biography || "No biography available."}</p>
        </div>
      </div>

      <h3 class="section-header">
        <i class="fas fa-users"></i>
        Frequent Collaborators
      </h3>
      
      <h4><i class="fas fa-theater-masks"></i> Actors</h4>
      <div class="flex-grid">
        ${(collabs.actors || []).slice(0, 6).map(a => `
          <div class="collab-card">
            <img class="collab-img" src="${getImageUrl(a.profile_path)}" alt="${a.name}">
            <div><strong>${a.name}</strong><br>${a.count} collaborations</div>
          </div>
        `).join("")}
      </div>
      
      <h4><i class="fas fa-pen"></i> Writers</h4>
      <div class="flex-grid">
        ${(collabs.writers || []).slice(0, 6).map(w => `
          <div class="collab-card">
            <img class="collab-img" src="${getImageUrl(w.profile_path)}" alt="${w.name}">
            <div><strong>${w.name}</strong><br>${w.count} collaborations</div>
          </div>
        `).join("")}
      </div>

      <h3 class="section-header">
        <i class="fas fa-film"></i>
        Filmography
      </h3>
      <div class="flex-grid">
        ${movies.filmography.map(m => `
          <div class="movie-card">
            <h4>${m.title}</h4>
            <p style="color: #666; margin-bottom: 15px;">${m.release_date || "N/A"}</p>
            <img class="poster" src="${getImageUrl(m.poster_path)}" alt="${m.title}">
            <button class="btn" onclick="loadMovie(${m.id}, ${lastDirectorId})">
              <i class="fas fa-info"></i>
              Details
            </button>
          </div>
        `).join("")}
      </div>

      <h3 class="section-header">
        <i class="fas fa-tags"></i>
        Favorite Genres
      </h3>
      <ul class="genre-list">
        ${Object.entries(genres).map(([g, count]) => `<li>${g} (${count})</li>`).join("")}
      </ul>
      
      <h3 class="section-header">
        <i class="fas fa-images"></i>
        Photo Gallery
      </h3>
      <div class="gallery-grid">
        ${(images.profiles || []).slice(0, 8).map((img, idx) =>
        `<img class="gallery-img" src="${getImageUrl(img.file_path, 'w300')}" alt="Gallery" onclick="openModal(${JSON.stringify(galleryImgs)},${idx})">`
    ).join("")}
      </div>
    </div>
  `;
}

// Movie details
async function loadMovie(movieId, directorId = null) {
    showLoading();

    try {
        const res = await fetch(`${API_BASE}/movie/${movieId}`);
        const movie = await res.json();
        renderMovieDetails(movie, directorId);
    } catch (error) {
        console.error('Failed to load movie details:', error);
        document.getElementById("results").innerHTML = `
      <div class="director-card">
        <p style="color: #e74c3c;"><i class="fas fa-exclamation-triangle"></i> Failed to load movie details.</p>
      </div>
    `;
    } finally {
        hideLoading();
    }
}

function renderMovieDetails(movie, directorId) {
    const lang = LANG_MAP[movie.original_language] || movie.original_language;
    const posters = (movie.images.posters || []).slice(0, 5).map(p => `https://image.tmdb.org/t/p/original${p.file_path}`);
    const backdrops = (movie.images.backdrops || []).slice(0, 5).map(b => `https://image.tmdb.org/t/p/original${b.file_path}`);
    const allImgs = posters.concat(backdrops);

    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = `
    <div class="director-details">
      <button class="btn back-btn" onclick="loadDetails(${directorId || lastDirectorId || 'null'})">
        <i class="fas fa-arrow-left"></i>
        Back to Director
      </button>
      
      <h2>${movie.title}</h2>
      
      <div class="director-profile">
        <img class="poster" src="${getImageUrl(movie.poster_path, 'w500')}" alt="${movie.title}">
        <div class="director-info">
          <p><strong><i class="fas fa-calendar"></i> Release Date:</strong> ${movie.release_date}</p>
          <p><strong><i class="fas fa-dollar-sign"></i> Budget:</strong> ${formatCurrency(movie.budget)}</p>
          <p><strong><i class="fas fa-clock"></i> Runtime:</strong> ${movie.runtime} minutes</p>
          <p><strong><i class="fas fa-language"></i> Language:</strong> ${lang}</p>
          <p><strong><i class="fas fa-star"></i> Rating:</strong> ${movie.vote_average}/10</p>
        </div>
      </div>

      <h3 class="section-header">
        <i class="fas fa-tags"></i>
        Genres
      </h3>
      <ul class="genre-list">
        ${(movie.genres || []).map(g => `<li>${g.name}</li>`).join("")}
      </ul>

      <h3 class="section-header">
        <i class="fas fa-users"></i>
        Cast
      </h3>
      <div class="flex-grid">
        ${(movie.credits.cast || []).slice(0, 8).map(c => `
          <div class="collab-card">
            <img class="collab-img" src="${getImageUrl(c.profile_path)}" alt="${c.name}">
            <div><strong>${c.name}</strong><br>as ${c.character}</div>
          </div>
        `).join("")}
      </div>

      <h3 class="section-header">
        <i class="fas fa-cogs"></i>
        Crew
      </h3>
      <div class="flex-grid">
        ${(movie.credits.crew || []).slice(0, 8).map(c => `
          <div class="collab-card">
            <img class="collab-img" src="${getImageUrl(c.profile_path)}" alt="${c.name}">
            <div><strong>${c.name}</strong><br>${c.job}</div>
          </div>
        `).join("")}
      </div>

      <h3 class="section-header">
        <i class="fas fa-thumbs-up"></i>
        Similar Movies
      </h3>
      <div class="flex-grid">
        ${(movie.similar.results || []).slice(0, 6).map(s => `
          <div class="movie-card" style="cursor:pointer" onclick="loadMovie(${s.id}, ${directorId || lastDirectorId || 'null'})">
            <h4>${s.title}</h4>
            <img class="poster" src="${getImageUrl(s.poster_path)}" alt="${s.title}">
          </div>
        `).join("")}
      </div>

      <h3 class="section-header">
        <i class="fas fa-images"></i>
        Posters & Backdrops
      </h3>
      <div class="gallery-grid">
        ${posters.map((url, idx) => `
          <img class="gallery-img" src="${url.replace('/original', '/w300')}" onclick="openModal(${JSON.stringify(allImgs)},${idx})">
        `).join("")}
        ${backdrops.map((url, idx) => `
          <img class="gallery-img" src="${url.replace('/original', '/w300')}" onclick="openModal(${JSON.stringify(allImgs)},${posters.length + idx})">
        `).join("")}
      </div>
    </div>
  `;
}

// Event listeners
document.addEventListener('DOMContentLoaded', function () {
    // Enter key search
    document.getElementById('searchInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            searchDirector();
        }
    });

    // Modal keyboard navigation
    document.addEventListener('keydown', function (e) {
        if (document.getElementById('imgModal').style.display === 'flex') {
            if (e.key === 'Escape') closeModal();
            if (e.key === 'ArrowLeft') prevModalImg();
            if (e.key === 'ArrowRight') nextModalImg();
        }
    });

    // Close modal on background click
    document.getElementById('imgModal').addEventListener('click', function (e) {
        if (e.target === this) {
            closeModal();
        }
    });
});