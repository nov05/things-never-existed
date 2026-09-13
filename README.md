# 🟢 **Things Never Existed**

* Built by Nov05 on Sep 12, 2026

## 👉 Website Layout on PC and Mobile

<img src="https://raw.githubusercontent.com/nov05/pictures/refs/heads/master/pic001/imgonline-com-ua-twotoone-NqEQKE7aFny.jpg" width=800>  

## 👉 Features

### Video Gallery

* Display AI fantasy videos in a clean dark gallery.
* Use a TikTok-style 3:4 video grid.
* Display 7 videos per row on desktop.
* Display 14 videos per page.
* Automatically adapt the grid layout for mobile devices.
* Show video titles as white text in the bottom-left corner.
* Limit video titles to 3 lines.

### YouTube Integration

* Use YouTube as the video hosting platform.
* Use YouTube thumbnails for video cards.
* Load the YouTube player only when a video is clicked.
* Play videos in a centered modal window.
* Destroy the YouTube iframe when the modal is closed.
* Support closing the player with the close button, backdrop click, or Escape key.

### Search

* Search videos by title.
* Search updates the results instantly.
* Search state is stored in the URL.
* Example: `?search=Mushroom`

### Series Filter

* Automatically generate Series buttons from the video data.
* Each video belongs to one Series.
* Filter videos by Series.
* The selected Series is stored in the URL.
* Example: `?category=Food+City`

### URL State

* Store Search and Series filters in the URL.
* Support Search and Series filters at the same time.
* Example: `?search=Mushroom&category=Food+City`
* Clear the corresponding URL parameter when a filter is removed.
* Reloading the page restores the Search and Series state.

### Pagination

* Display 14 videos per page.
* Automatically create pagination when there are more than 14 videos.
* Provide Previous and Next buttons.
* Provide page numbers with ellipsis for large numbers of pages.
* Scroll to the top when changing pages.

### Video Data

* Load video data from `data/videos.json`.
* Hide videos with `Status = Hidden`.
* Generate Series automatically from the JSON data.
* Keep additional metadata such as Tags, Description, Added Date, and Status for future use.

### Google Sheet Sync

* Use Google Sheets as the main content management source.
* Automatically sync the Sheet to `videos.json`.
* Run the synchronization through GitHub Actions.
* Preserve the Google Sheet row order while reading data.
* Reverse the data when generating JSON so newly added videos appear first on the website.
* Do not overwrite the existing JSON if the Sheet data is invalid.

### Thumbnail Fallback

* Use the YouTube `maxresdefault` thumbnail.
* If a thumbnail cannot be loaded, use `header-background.jpg` as the fallback image.

### Navigation

* Clicking the logo returns to the homepage.
* The homepage URL is:
  `https://nov05.github.io/things-never-existed/`


## 👉 Project Directory

```text
<repo>/
│
├── index.html
├── style.css
├── app.js
│
├── assets/
│   ├── logo.jpg
│   └── header-background.jpg
│
├── data/
│   └── videos.json
│
├── scripts/
│   └── sync_sheet.py
│
└── .github/
    └── workflows/
        └── sync.yml
```

## 👉 Google Sheet (as Database)

| Title                                | YouTube ID                                                | Series                                   | Tags                                      | Description                                                          | Added Date                                    | Status                                                 |
| ------------------------------------ | --------------------------------------------------------- | ---------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------ |
| Video title. Maximum 100 characters. | YouTube video ID only. Do not enter the full YouTube URL. | The single Series this video belongs to. | Searchable keywords, separated by commas. | Short description of the video. Used for search and future metadata. | Date the video was added. Format: YYYY-MM-DD. | `Published` to show the video, or `Hidden` to hide it. |

## 👉 URL State Rules

* `category` — selected category
* `search` — search query

Examples:  
`/?category=Food%20City`  
`/?search=Mushroom`  
`/?category=Food%20City&search=Mushroom`  

Rules:

* `ALL` removes `category`
* Clearing search removes `search`
* Pagination is not stored in the URL
* URL changes do not reload the page
* Reloading the page restores the search and category state


## 👉 YouTube Shorts Thumbnail

<img src="https://img.youtube.com/vi/ophsFyVPkhc/maxresdefault.jpg" width=400>

In `style.css`, display the central 9:16 area of the 16:9 YouTube thumbnail in a 3:4 TikTok-style card.  

```text
/*
    YouTube thumbnail is a 16:9 horizontal image.
    The actual Shorts video is centered inside it.
    We enlarge the full image so that the central
    9:16 area fills the card width.
*/
 .video-thumbnail {
    position: absolute;
    width: 316.05%;
    height: 133.333%;
    max-width: none;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    display: block;
    object-fit: fill;
    transition: transform 0.25s ease;
}

.video-card:hover .video-thumbnail {
    transform: translate(-50%, -50%) scale(1.025);
}
```

Fallback display

<img src="https://raw.githubusercontent.com/nov05/pictures/refs/heads/master/pic001/2026-09-11%2005_23_13-Greenshot.png" width=600>  