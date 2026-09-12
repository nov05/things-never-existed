// Number of videos per page
// const PAGE_SIZE = 20;
const PAGE_SIZE = 14;

let videos = [];
let filteredVideos = [];

let selectedSeries = "ALL";
let currentPage = 1;


/* =========================
   YouTube Player API
========================= */

// YouTube Player API variables
let youtubePlayer = null;
let youtubeApiReady = false;
let pendingVideo = null;


/*
  Load the YouTube IFrame Player API.
*/
const youtubeScript = document.createElement("script");

youtubeScript.src = "https://www.youtube.com/iframe_api";

document.head.appendChild(youtubeScript);


/*
  Called by the YouTube API when it is ready.
*/
window.onYouTubeIframeAPIReady = function () {
    youtubeApiReady = true;

    if (pendingVideo) {
        createYouTubePlayer(pendingVideo);
        pendingVideo = null;
    }
};


/* =========================
   Elements
========================= */

const searchInput = document.getElementById("search");
const seriesContainer = document.getElementById("series");
const titleElement = document.getElementById("title");
const videosContainer = document.getElementById("videos");
const paginationContainer = document.getElementById("pagination");

const modal = document.getElementById("video-modal");
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
        loadUrlState();
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

    // return [...new Set(series)];
    return [...new Set(series)].sort((a, b) =>
        a.localeCompare(b)
    );
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

    const params = new URLSearchParams();

    /* Store the selected category in the URL first. */
    if (selectedSeries !== "ALL") {
        params.set("category", selectedSeries);
    }

    /* Store the search query in the URL. */
    if (query) {
        params.set("search", searchInput.value.trim());
    }

    const queryString = params.toString();

    /* Update the URL without reloading the page. */
    history.replaceState(
        null,
        "",
        queryString
            ? `?${queryString}`
            : window.location.pathname
    );

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
            /* Search only in the title for better performance */
            if (
                !String(video.title || "")
                    .toLowerCase()
                    .includes(query)
            ) {
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
        videosContainer.appendChild(
            createVideoCard(video)
        );
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

    const videoId = getYouTubeId(video);

    /*
      If a valid YouTube ID is found,
      set the thumbnail image source.
      Otherwise, display the fallback content.
    */
    if (videoId && videoId !== "-") {

        thumbnail.src =
            `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

        /*
          Test fallback by using a non-existent image URL.

          thumbnail.src =
              "https://example.com/does-not-exist.jpg";
        */

        thumbnail.addEventListener(
            "error",
            () => {

                /* Fallback: header background */
                thumbnail.style.display = "none";
                fallback.style.display = "flex";

            },
            { once: true }
        );

    } else {

        /* Fallback: header background */
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
   YouTube Player
========================= */

function createYouTubePlayer(video) {

    const videoId = getYouTubeId(video);

    if (!videoId) {
        return;
    }


    /*
      Use the already filtered videos
      as the YouTube playlist.
    */
    const playlist = filteredVideos
        .map(item => getYouTubeId(item))
        .filter(Boolean);


    /*
      Find the clicked video inside
      the filtered playlist.
    */
    const currentIndex = playlist.indexOf(videoId);

    if (currentIndex === -1) {
        return;
    }


    /*
      Destroy the previous player.
    */
    if (youtubePlayer) {
        youtubePlayer.destroy();
        youtubePlayer = null;
    }

    playerContainer.innerHTML = "";


    /*
      Create the YouTube player.
    */
    youtubePlayer = new YT.Player(
        "player-container",
        {
            width: "100%",
            height: "100%",

            videoId: videoId,

            playerVars: {
                autoplay: 1,
                rel: 0,
                playsinline: 1
            },

            events: {

                /*
                  Load the filtered playlist after
                  the player is ready.
                */
                onReady: event => {

                    event.target.loadPlaylist(
                        playlist,
                        currentIndex
                    );

                }

            }
        }
    );


    /*
      Open the modal.
    */
    modal.classList.add("open");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow = "hidden";
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
      Wait for the YouTube API if it
      has not loaded yet.
    */
    if (!youtubeApiReady) {

        pendingVideo = video;

        return;
    }


    createYouTubePlayer(video);
}


/* =========================
   Close Video
========================= */

function closeVideo() {

    modal.classList.remove("open");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    /*
      Destroy the YouTube player.
    */
    if (youtubePlayer) {

        youtubePlayer.destroy();

        youtubePlayer = null;
    }

    playerContainer.innerHTML = "";

    document.body.style.overflow = "";
}


/*
  Close modal when clicking outside the player.
*/
modal.querySelector(".modal-backdrop")
    .addEventListener(
        "click",
        closeVideo
    );


/*
  Close modal with Escape.
*/
document.addEventListener(
    "keydown",
    event => {

        if (event.key === "Escape") {
            closeVideo();
        }

    }
);


/* =========================
   URL State
========================= */

function loadUrlState() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const category = params.get("category");
    const search = params.get("search");

    if (category) {
        selectedSeries = category;
    }

    if (search) {
        searchInput.value = search;
    }
}


/* =========================
   Search
========================= */

searchInput.addEventListener(
    "input",
    () => {

        currentPage = 1;

        applyFilters();

    }
);


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

    paginationContainer.appendChild(
        previous
    );


    /*
      Show page numbers.

      For a small number of pages:
      1 2 3 4 5

      For many pages:
      1 ... 4 5 6 ... 20
    */
    const pages = getVisiblePages(
        totalPages,
        currentPage
    );

    pages.forEach(page => {

        if (page === "...") {

            const dots =
                document.createElement("span");

            dots.textContent = "…";
            dots.style.color = "#666";
            dots.style.padding = "0 4px";

            paginationContainer.appendChild(
                dots
            );

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

        paginationContainer.appendChild(
            button
        );

    });


    /* Next */
    const next = createPageButton(
        "›",
        currentPage + 1,
        currentPage === totalPages
    );

    paginationContainer.appendChild(
        next
    );
}


function createPageButton(
    label,
    page,
    disabled
) {

    const button =
        document.createElement("button");

    button.type = "button";
    button.className = "page-button";
    button.textContent = label;
    button.disabled = disabled;

    button.addEventListener(
        "click",
        () => {

            currentPage = page;

            renderVideos();
            renderPagination();

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        }
    );

    return button;
}


function getVisiblePages(
    totalPages,
    current
) {

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

    const start =
        Math.max(
            2,
            current - 1
        );

    const end =
        Math.min(
            totalPages - 1,
            current + 1
        );

    for (
        let page = start;
        page <= end;
        page++
    ) {

        pages.push(page);

    }

    if (
        current <
        totalPages - 3
    ) {

        pages.push("...");

    }

    pages.push(totalPages);

    return pages;
}

// Use left and right arrows to navigate between pages.
document.getElementById("page-prev").addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        renderVideos();
        renderPagination();
    }
});
document.getElementById("page-next").addEventListener("click", () => {
    const totalPages = Math.ceil(
        filteredVideos.length / PAGE_SIZE
    );

    if (currentPage < totalPages) {
        currentPage++;
        renderVideos();
        renderPagination();
    }
});


/* =========================
   Start
========================= */

loadVideos();