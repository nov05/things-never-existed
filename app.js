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


    /* =========================
       Thumbnail Wrapper
    ========================= */

    const thumbnailWrapper = document.createElement("div");

    thumbnailWrapper.className = "thumbnail-wrapper";


    /* =========================
       YouTube Thumbnail
    ========================= */

    const thumbnail = document.createElement("img");

    thumbnail.className = "video-thumbnail";
    thumbnail.alt = video.title || "";


    /* =========================
       Fallback
    ========================= */

    const fallback = document.createElement("div");

    fallback.className = "thumbnail-fallback";


    const fallbackLogo = document.createElement("img");

    fallbackLogo.src = "assets/logo.png";
    fallbackLogo.alt = "";


    fallback.appendChild(fallbackLogo);


    /* =========================
       YouTube ID
    ========================= */

    const videoId = getYouTubeId(video);


    if (videoId) {

        thumbnail.src =
            `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;


        thumbnail.addEventListener(
            "error",
            () => {

                /*
                  First fallback:
                  Try hqdefault.
                */

                if (!thumbnail.dataset.hqTried) {

                    thumbnail.dataset.hqTried = "true";

                    thumbnail.src =
                        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

                    return;
                }


                /*
                  Second fallback:
                  Header background + logo.
                */

                thumbnail.style.display = "none";

                fallback.style.display = "flex";
            },
            { once: false }
        );

    } else {

        thumbnail.style.display = "none";

        fallback.style.display = "flex";
    }


    /*
      Put thumbnail and fallback
      inside the 3:4 wrapper.
    */

    thumbnailWrapper.appendChild(thumbnail);
    thumbnailWrapper.appendChild(fallback);


    /* =========================
       Title
    ========================= */

    const title = document.createElement("h3");

    title.className = "video-title";
    title.textContent = video.title || "";


    /* =========================
       Card
    ========================= */

    card.appendChild(thumbnailWrapper);
    card.appendChild(title);


    /*
      Entire card is clickable.
    */

    card.addEventListener("click", () => {
        openVideo(video);
    });


    return card;
}


/* =========================
   YouTube ID
========================= */

function getYouTubeId(video) {

    /*
      Preferred field:
      YouTube ID only.
    */

    if (video.youtube_id) {
        return String(video.youtube_id).trim();
    }


    /*
      Backward compatibility:
      Full YouTube URL.
    */

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


modalClose.addEventListener(
    "click",
    closeVideo
);


modal.querySelector(".modal-backdrop")
    .addEventListener(
        "click",
        closeVideo
    );


document.addEventListener(
    "keydown",
    event => {

        if (event.key === "Escape") {
            closeVideo();
        }
    }
);


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


    /* =========================
       Previous
    ========================= */

    const previous = createPageButton(
        "‹",
        currentPage - 1,
        currentPage === 1
    );

    paginationContainer.appendChild(previous);


    /* =========================
       Page Numbers
    ========================= */

    /*
      Small number of pages:

      1 2 3 4 5

      Many pages:

      1 ... 4 5 6 ... 20
    */

    const pages = getVisiblePages(
        totalPages,
        currentPage
    );


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


    /* =========================
       Next
    ========================= */

    const next = createPageButton(
        "›",
        currentPage + 1,
        currentPage === totalPages
    );

    paginationContainer.appendChild(next);
}


/* =========================
   Create Page Button
========================= */

function createPageButton(
    label,
    page,
    disabled
) {

    const button = document.createElement("button");

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


/* =========================
   Visible Pages
========================= */

function getVisiblePages(
    totalPages,
    current
) {

    if (totalPages <= 7) {

        return Array.from(
            {
                length: totalPages
            },
            (_, index) => index + 1
        );
    }


    const pages = [];


    pages.push(1);


    if (current > 4) {
        pages.push("...");
    }


    const start = Math.max(
        2,
        current - 1
    );


    const end = Math.min(
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
```

### 配套 CSS

**这里很重要：上面的 JS 增加了 `.thumbnail - wrapper`，所以你现有 CSS 里 thumbnail 那一段也需要对应替换。**

把原来的 `.video - thumbnail` / `.thumbnail - fallback` 相关部分换成：

```css
    .thumbnail - wrapper {
    position: relative;
    width: 100 %;
    aspect - ratio: 3 / 4;
    overflow: hidden;
    border - radius: 8px;
}

.video - thumbnail {
    position: absolute;

    /*
      YouTube thumbnail 本身是 16:9。

      高度撑满 3:4 card，
      左右超出的部分由 wrapper 裁掉。
    */

    height: 100 %;
    width: auto;

    left: 50 %;
    top: 50 %;

    transform: translate(-50 %, -50 %);

    object - fit: cover;
}

.thumbnail - fallback {
    position: absolute;
    inset: 0;

    display: none;

    align - items: center;
    justify - content: center;

    background - image:
    linear - gradient(
        rgba(0, 0, 0, 0.2),
        rgba(0, 0, 0, 0.35)
    ),
        url("assets/header-background.jpg");

    background - size: cover;
    background - position: center;
}

.thumbnail - fallback img {
    width: 28 %;
    height: auto;
    border - radius: 50 %;
}

