/* =========================
Close Behavior
    Mobile: Phone Back → popstate → closeVideo()
    Desktop: Backdrop / Escape → closeVideo()

Test Mobile Back on Desktop
   1. Open Chrome, Press F12 → select a mobile device screen
   2. Open the video player
   3. Run history.back() in the Console
   4. Player should close via popstate → closeVideo()
========================= */


/* Number of videos per page */
const PAGE_SIZE = 14;
const isMobile = window.matchMedia("(max-width: 768px)").matches;

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
const playerContainer = document.getElementById("player-container");
/* Mobile */
// document.getElementById("mobile-player-close").addEventListener("click", closeVideo); // Close button
// modal.addEventListener("touchstart", () => {
//     console.log("👉 Mobile touch detected"); // Test mobile touch
// });


/* =========================
   Event Listeners
========================= */

/* Keyboard Hint */
document.addEventListener("DOMContentLoaded", () => {
    const keyboardHint = document.getElementById("keyboard-hint");
    if (!keyboardHint) return;

    const hideKeyboardHint = () => {
        keyboardHint.classList.add("hide");
    };

    document.addEventListener("mousemove", hideKeyboardHint, { once: true });
    document.addEventListener("mousedown", hideKeyboardHint, { once: true });
    document.addEventListener("wheel", hideKeyboardHint, { once: true });
    document.addEventListener("touchstart", hideKeyboardHint, { once: true });
    document.addEventListener("keydown", hideKeyboardHint, { once: true });
});

/* Mobile Player Back Navigation */
window.addEventListener("popstate", () => {
    if (isMobile && modal.classList.contains("open")) {
        closeVideo();
    }
});


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

function onPlayerReady(event, videoId, playerKeyboardHint) {
    /* Load the playlist and set loop when the player is ready. */
    // event.target.loadPlaylist(
    //     playlist,
    //     currentIndex
    // );
    // event.target.setLoop(false);
    /* Loop the single video instead of all the filtered videos. */
    event.target.loadPlaylist([videoId], 0);
    event.target.setLoop(true);

    // Display the keyboard hint when the player is ready.
    // Wait for user interaction to start the video
    const startPlayer = () => {
        if (playerKeyboardHint) {
            playerKeyboardHint.classList.add("hide");
        }
        event.target.playVideo();
        document.removeEventListener("mousemove", startPlayer);
        document.removeEventListener("mousedown", startPlayer);
        document.removeEventListener("wheel", startPlayer);
        document.removeEventListener("touchstart", startPlayer);
        document.removeEventListener("keydown", startPlayer);
    };
    document.addEventListener("mousemove", startPlayer);
    document.addEventListener("mousedown", startPlayer);
    document.addEventListener("wheel", startPlayer);
    document.addEventListener("touchstart", startPlayer);
    document.addEventListener("keydown", startPlayer);
}


/* YT.PlayerState.UNSTARTED = -1: Video has not started 
   YT.PlayerState.ENDED     =  0: Video ended 
   YT.PlayerState.PLAYING   =  1: Video is playing 
   YT.PlayerState.PAUSED    =  2: Video is paused 
   YT.PlayerState.BUFFERING =  3: Video is buffering 
   YT.PlayerState.CUED      =  5: Video is cued and ready to play */
const playerStates = {
    "-1": "UNSTARTED",
    "0": "ENDED",
    "1": "PLAYING",
    "2": "PAUSED",
    "3": "BUFFERING",
    "5": "CUED"
};


function onPlayerStateChange(event, playlist) {
    // console.log(
    //     "👉 onPlayerStateChange:",
    //     `${event.data} ${playerStates[event.data]}`
    // );
    /* When the playlist ends, check if the player is focused 
       and load the next video in the playlist. 
       Here, event.target === youtubePlayer */
    if (document.activeElement?.id !== "player-container") return;
    event.target.setLoop(false);
    if (event.data !== YT.PlayerState.ENDED) return;
    // const currentIndex = event.target.getPlaylistIndex(); // Always 0
    const videoId = event.target.getVideoData().video_id;
    const currentIndex = playlist.indexOf(videoId);
    const nextIndex = currentIndex < filteredVideos.length - 1 ? currentIndex + 1 : currentIndex;
    event.target.loadPlaylist(
        playlist,
        nextIndex
    );
}


function createYouTubePlayer(video) {
    const videoId = getYouTubeId(video);
    if (!videoId) return;
    const playlist = filteredVideos
        .map(item => getYouTubeId(item))
        .filter(Boolean);
    const currentIndex = playlist.indexOf(videoId);
    if (currentIndex === -1) return;
    if (youtubePlayer) {
        youtubePlayer.destroy();
        youtubePlayer = null;
    }
    playerContainer.innerHTML = "";
    /* Show the keyboard hint when the player is created. */
    const playerKeyboardHint = document.getElementById("player-keyboard-hint");
    if (playerKeyboardHint) {
        playerKeyboardHint.classList.remove("hide");
        playerKeyboardHint.classList.add("show");
    }
    /* When the player is created, it will loop the single video. */
    youtubePlayer = new YT.Player(
        "player-container",
        {
            width: "100%",
            height: "100%",
            videoId: videoId,
            /* https://developers.google.com/youtube/player_parameters */
            playerVars: {
                playsinline: 1,
                autoplay: 1,
                loop: 1,
                controls: 1,
                rel: 0,
                origin: window.location.origin,
            },
            events: {
                onReady: event => {
                    onPlayerReady(event, videoId, playerKeyboardHint);
                },
                onStateChange: event => {
                    onPlayerStateChange(event, playlist);
                },
                /* Important tests: 
                     Check what the active element is when the player is focused.
                     Check if the player is still focused when the video ends. 
                */
                // onStateChange: event => {
                //     console.log("👉 onStateChange fired:", event.data);
                //     if (event.data === YT.PlayerState.ENDED) {
                //         const iframe = document.querySelector("#player-container");
                //         console.log("👉 Video ended. Checking active element ...");
                //         console.log("👉 activeElement:", document.activeElement);
                //         console.log("👉 Is iframe the activeElement:", document.activeElement === iframe);
                //         console.log(
                //             "👉 Player focused:",
                //             document.activeElement?.id === "player-container"
                //         );
                //     }
                // },
            }
        }
    );
}


function createMobileYouTubePlayer(video) {
    const videoId = getYouTubeId(video);
    if (!videoId) return;
    const playlist = filteredVideos
        .map(item => getYouTubeId(item))
        .filter(Boolean);
    const currentIndex = playlist.indexOf(videoId);
    if (currentIndex === -1) return;
    if (youtubePlayer) {
        youtubePlayer.destroy();
        youtubePlayer = null;
    }
    playerContainer.innerHTML = "";
    youtubePlayer = new YT.Player(
        "player-container",
        {
            width: "100%",
            height: "100%",
            videoId: videoId,
            /* https://developers.google.com/youtube/player_parameters */
            playerVars: {
                playsinline: 1,
                autoplay: 1,
                loop: 0,
                controls: 1,
                rel: 0,
                origin: window.location.origin,
                playlist: playlist.join(","),
            },
        }
    );
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
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    // createYouTubePlayer(video);
    if (isMobile) {
        /* Mobile Player History */
        history.pushState({ videoPlayer: true }, "");
        createMobileYouTubePlayer(video);
        document.getElementById("player-container").focus();
    } else {
        createYouTubePlayer(video);
    }
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
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeVideo();
        }
*/


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
            /* Scroll to the top of the page when navigating to a new page. */
            // window.scrollTo({
            //     top: 0,
            //     behavior: "smooth"
            // });
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

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeVideo();
        return;
    }

    /* Use spacebar to toggle play/pause if the player is not focused. 
       The player uses the same key for play/pause. */
    if (event.key === " ") {
        event.preventDefault();
        const state = youtubePlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
            youtubePlayer.pauseVideo();
        } else {
            youtubePlayer.playVideo();
        }
        return;
    }

    /* Use up and down arrows to navigate between videos in the modal if it is open.
       If the player is focused, the up and down arrows will not work. */
    if (modal.classList.contains("open")) {
        /* Check if the YouTube player exists before proceeding */
        if (!youtubePlayer) return;
        /* Proceed if the player is not focused */
        const playerFocused = document.activeElement?.id === "player-container";
        if (playerFocused) return;
        /* If the player is not focused, allow navigation with up and down arrows */
        if (event.key === "ArrowUp") {
            /* Prevent the browser from scrolling the page up. */
            event.preventDefault();
            /* If the playlist is a single video, the following code won't work.*/
            // youtubePlayer.previousVideo();
            const currentVideoId = youtubePlayer.getVideoData().video_id;
            const currentIndex = filteredVideos.findIndex(video => getYouTubeId(video) === currentVideoId);
            if (currentIndex > 0) {
                /* Switch to the previous video and loop it */
                const previousVideoId = getYouTubeId(filteredVideos[currentIndex - 1]);
                youtubePlayer.loadPlaylist([previousVideoId], 0);
                youtubePlayer.setLoop(true);
            }
            return;
        }
        if (event.key === "ArrowDown") {
            /* Prevent the browser from scrolling the page down. */
            event.preventDefault();
            /* If the playlist is a single video, the following code won't work.*/
            // youtubePlayer.nextVideo();
            const currentVideoId = youtubePlayer.getVideoData().video_id;
            const currentIndex = filteredVideos.findIndex(video => getYouTubeId(video) === currentVideoId);
            if (currentIndex < filteredVideos.length - 1) {
                /* Switch to the next video and play it */
                const nextVideoId = getYouTubeId(filteredVideos[currentIndex + 1]);
                youtubePlayer.loadPlaylist([nextVideoId], 0);
                youtubePlayer.setLoop(true);
            }
            return;
        }
        return;
    }

    /* Use left and right arrows to navigate between pages if the modal is not open. 
       If the modal is open, YouTube player navigation will be added later. */
    if (event.key === "ArrowLeft") {
        if (currentPage > 1) {
            currentPage--;
            renderVideos();
            renderPagination();
            /* Scroll to the top of the page when navigating to a new page. */
            // window.scrollTo({
            //     top: 0,
            //     behavior: "smooth"
            // });
        }
    }
    if (event.key === "ArrowRight") {
        const totalPages = Math.ceil(
            filteredVideos.length / PAGE_SIZE
        );
        if (currentPage < totalPages) {
            currentPage++;
            renderVideos();
            renderPagination();
            /* Scroll to the top of the page when navigating to a new page. */
            // window.scrollTo({
            //     top: 0,
            //     behavior: "smooth"
            // });
        }
    }
});


/* =========================
   Start
========================= */

loadVideos();