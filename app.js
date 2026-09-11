const PAGE_SIZE = 20;

let videos = [];
let filteredVideos = [];

let selectedSeries = "ALL";
let currentPage = 1;


/* =========================
   Elements
========================= */

const searchInput = document.getElementById("search");
const seriesContainer = document.getElementById("series");
const titleElement = document.getElementById("title");
const videosContainer = document.getElementById("videos");
const paginationContainer = document.getElementById("pagination");

const modal = document.getElementById("video-modal");
const modalClose = document.getElementById("modal-close");
const playerContainer = document.getElementById("player-container");


/* =========================
   Load Data
========================= */

async function loadVideos() {
    try {
        const response = await fetch("data/videos.json", {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("videos.json must contain an array.");
        }

        videos = data.filter(video => {
            return String(video.status || "")
                .toLowerCase() !== "hidden";
        });

        renderSeries();
        applyFilters();

    } catch (error) {
        console.error("Failed to load videos:", error);

        videosContainer.innerHTML = `
      <div class="empty-state">
        Unable to load videos.
      </div>
    `;
    }
}


/* =========================
   Series
========================= */

function getSeriesList() {
    const series = videos
        .map(video => String(video.series || "").trim())
        .filter(Boolean);

    return [...new Set(series)];
}


function renderSeries() {
    const seriesList = getSeriesList();

    seriesContainer.innerHTML = "";

    const allButton = createSeriesButton("ALL", "ALL");
    seriesContainer.appendChild(allButton);

    seriesList.forEach(series => {
        const button = createSeriesButton(series, series);
        seriesContainer.appendChild(button);
    });
}


function createSeriesButton(label, value) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "series-button";
    button.textContent = label;

    button.addEventListener("click", () => {
        selectedSeries = value;
        currentPage = 1;

        applyFilters();
    });

    return button;
}


/* =========================
   Search + Filter
========================= */

function applyFilters() {
    const query = searchInput.value
        .trim()
        .toLowerCase();

    filteredVideos = videos.filter(video => {

        /* Series filter */
        if (
            selectedSeries !== "ALL" &&
            String(video.series || "").trim() !== selectedSeries
        ) {
            return false;
        }

        /* Free-text search */
        if (query) {
            const searchableText = Object.values(video)
                .map(value => {
                    if (Array.isArray(value)) {
                        return value.join(" ");
                    }

                    return String(value ?? "");
                })
                .join(" ")
                .toLowerCase();

            if (!searchableText.includes(query)) {
                return false;
            }
        }

        return true;
    });

    updateSectionTitle();
    renderVideos();
    renderPagination();
}


/* =========================
   Section Title
========================= */

function updateSectionTitle() {
    if (selectedSeries === "ALL") {
        titleElement.textContent = "All Videos";
    } else {
        titleElement.textContent = selectedSeries;
    }
}


/* =========================
   Render Videos
========================= */

function renderVideos() {
    videosContainer.innerHTML = "";

    const totalPages = Math.max(
        1,
        Math.ceil(filteredVideos.length / PAGE_SIZE)
    );

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;

    const pageVideos = filteredVideos.slice(start, end);

    if (pageVideos.length === 0) {
        videosContainer.innerHTML = `
      <div class="empty-state">
        No videos found.
      </div>
    `;

        return;
    }

    pageVideos.forEach(video => {
        videosContainer.appendChild(createVideoCard(video));
    });
}


/* =========================
   Video Card
========================= */

function createVideoCard(video) {
    const card = document.createElement("article");

    card.className = "video-card";

    const thumbnail = document.createElement("img");

    thumbnail.className = "video-thumbnail";
    thumbnail.alt = video.title || "";

    const fallback = document.createElement("div");

    fallback.className = "thumbnail-fallback";

    const fallbackLogo = document.createElement("img");

    fallbackLogo.src = "assets/logo.png";
    fallbackLogo.alt = "";

    fallback.appendChild(fallbackLogo);

    const videoId = getYouTubeId(video);

    if (videoId) {
        thumbnail.src =
            `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        // Test fallback by using a non-existent image URL 
        thumbnail.src = "https://example.com/does-not-exist.jpg";

        thumbnail.addEventListener(
            "error",
            () => {
                // Fallback: header background + logo
                thumbnail.style.display = "none";
                fallback.style.display = "flex";
            },
            { once: true }
        );

    } else {
        // Fallback: header background + logo
        thumbnail.style.display = "none";
        fallback.style.display = "flex";
    }


    const title = document.createElement("h3");

    title.className = "video-title";
    title.textContent = video.title || "";

    card.appendChild(thumbnail);
    card.appendChild(fallback);
    card.appendChild(title);

    card.addEventListener("click", () => {
        openVideo(video);
    });

    return card;
}


/* =========================
   YouTube ID
========================= */

function getYouTubeId(video) {
    if (video.youtube_id) {
        return String(video.youtube_id).trim();
    }

    if (video.youtube) {
        const value = String(video.youtube).trim();

        const match = value.match(
            /(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([^?&/]+)/
        );

        if (match) {
            return match[1];
        }
    }

    return "";
}


/* =========================
   Open Video
========================= */

function openVideo(video) {
    const videoId = getYouTubeId(video);

    if (!videoId) {
        return;
    }

    /*
      iframe is created ONLY after clicking.
    */

    playerContainer.innerHTML = "";

    const iframe = document.createElement("iframe");

    iframe.src =
        `https://www.youtube.com/embed/${encodeURIComponent(videoId)}` +
        `?autoplay=1&rel=0`;

    iframe.title = video.title || "YouTube video";

    iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

    iframe.allowFullscreen = true;

    playerContainer.appendChild(iframe);

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";
}


/* =========================
   Close Video
========================= */

function closeVideo() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");

    /*
      Destroy iframe when closing.
    */
    playerContainer.innerHTML = "";

    document.body.style.overflow = "";
}


modalClose.addEventListener("click", closeVideo);

modal.querySelector(".modal-backdrop")
    .addEventListener("click", closeVideo);

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeVideo();
    }
});


/* =========================
   Search
========================= */

searchInput.addEventListener("input", () => {
    currentPage = 1;
    applyFilters();
});


/* =========================
   Pagination
========================= */

function renderPagination() {
    paginationContainer.innerHTML = "";

    const totalPages = Math.ceil(
        filteredVideos.length / PAGE_SIZE
    );

    if (totalPages <= 1) {
        return;
    }

    /* Previous */
    const previous = createPageButton(
        "‹",
        currentPage - 1,
        currentPage === 1
    );

    paginationContainer.appendChild(previous);


    /*
      Show page numbers.
  
      For a small number of pages:
      1 2 3 4 5
  
      For many pages:
      1 ... 4 5 6 ... 20
    */
    const pages = getVisiblePages(totalPages, currentPage);

    pages.forEach(page => {
        if (page === "...") {
            const dots = document.createElement("span");

            dots.textContent = "…";
            dots.style.color = "#666";
            dots.style.padding = "0 4px";

            paginationContainer.appendChild(dots);

            return;
        }

        const button = createPageButton(
            String(page),
            page,
            false
        );

        if (page === currentPage) {
            button.classList.add("current");
        }

        paginationContainer.appendChild(button);
    });


    /* Next */
    const next = createPageButton(
        "›",
        currentPage + 1,
        currentPage === totalPages
    );

    paginationContainer.appendChild(next);
}


function createPageButton(label, page, disabled) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "page-button";
    button.textContent = label;
    button.disabled = disabled;

    button.addEventListener("click", () => {
        currentPage = page;

        renderVideos();
        renderPagination();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });

    return button;
}


function getVisiblePages(totalPages, current) {
    if (totalPages <= 7) {
        return Array.from(
            { length: totalPages },
            (_, index) => index + 1
        );
    }

    const pages = [];

    pages.push(1);

    if (current > 4) {
        pages.push("...");
    }

    const start = Math.max(2, current - 1);
    const end = Math.min(totalPages - 1, current + 1);

    for (let page = start; page <= end; page++) {
        pages.push(page);
    }

    if (current < totalPages - 3) {
        pages.push("...");
    }

    pages.push(totalPages);

    return pages;
}


/* =========================
   Start
========================= */

loadVideos();