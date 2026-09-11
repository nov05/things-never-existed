# 🟢 things-never-existed


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

## 👉 Google Sheet 

| Title                                | YouTube ID                                                | Series                                   | Tags                                      | Description                                                          | Added Date                                    | Status                                                 |
| ------------------------------------ | --------------------------------------------------------- | ---------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------ |
| Video title. Maximum 100 characters. | YouTube video ID only. Do not enter the full YouTube URL. | The single Series this video belongs to. | Searchable keywords, separated by commas. | Short description of the video. Used for search and future metadata. | Date the video was added. Format: YYYY-MM-DD. | `Published` to show the video, or `Hidden` to hide it. |

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