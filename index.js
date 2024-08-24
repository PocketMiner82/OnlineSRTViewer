document.getElementById('subtitleFile').addEventListener('change', function(e) {
    window.onbeforeunload = function() {
        return "Bist du sicher, dass du die Seite verlassen willst?";
    };
    //document.getElementById('subtitleFile').style.display = 'none';
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            parseSrt(e.target.result);
        };
        reader.readAsText(file);
    }
});

let subtitleDivs = []; // Global variable to hold subtitle divs and corresponding subtitles
let timer; // Timer for checking subtitle times
let currentSubtitleIndex = 0; // Current subtitle index
let isPlaying = false; // Track play/pause state
let startTime; // Track the start time of playback

function parseSrt(srtText) {
    const lines = srtText.split('\n');
    const subtitles = [];
    let subtitle = null;
    lines.forEach(line => {
        line = line.trim()
        console.log(line)
        if (/^\d+$/.test(line)) { // Sequence identifier
            if (subtitle) subtitles.push(subtitle); // Push previous subtitle
            subtitle = { sequence: parseInt(line, 10), text: '' }; // Initialize new subtitle with empty text
        } else if (line.includes(' --> ')) { // Timestamps
            let timestamp = line.split(" --> ")
            subtitle.timestamps = { start: timestamp[0], end: timestamp[1] }
        } else if (line.trim()) { // Subtitle text
            subtitle.text += line.trim() + '\n';
        }
    });
    if (subtitle) subtitles.push(subtitle); // Push last subtitle
    subtitles.forEach(subtitle => { // Trim extra spaces from text
        subtitle.text = subtitle.text.trim().replace("\n", "<br>");
    });
    displaySubtitles(subtitles);
}

function displaySubtitles(subtitles) {
    const container = document.getElementById('subtitlesContainer');
    container.innerHTML = '';
    subtitleDivs = []; // Clear the global variable
    subtitles.forEach((subtitle, index) => {
        const div = document.createElement('div');
        div.innerHTML = subtitle.text;
        div.classList.add('subtitle');
        if (index === 0) div.classList.add('currentSubtitle'); // Highlight first subtitle
        subtitleDivs.push({ div: div, subtitle: subtitle }); // Store div and subtitle in global variable
        container.appendChild(div);
    });
}

function startHighlighting(subtitles) {
    const playPauseButton = document.getElementById('playPauseButton');
    isPlaying = true;
    playPauseButton.textContent = 'Pause';
    startTime = Date.now();

    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toISOString().substr(11, 8); // Format HH:mm:ss
    }

    function highlightSubtitles() {
        if (isPlaying) {
            const currentTime = Date.now();
            const elapsedTime = (currentTime - startTime) / 1000; // Calculate time elapsed in seconds

            for (let i = 0; i < subtitles.length; i++) {
                const subtitleStartTime = parseTime(subtitles[i].timestamps.start);

                if (subtitleStartTime <= elapsedTime) {
                    if (currentSubtitleIndex > 0) {
                        subtitleDivs[currentSubtitleIndex - 1].div.classList.remove('currentSubtitle');
                    }

                    subtitleDivs[i].div.classList.add('currentSubtitle');
                    currentSubtitleIndex = i + 1;
                }
            }

            // Format and save current timestamp in HH:mm:ss format
            const currentTimestamp = formatTime(currentTime);
            console.log("Current Timestamp: ", currentTimestamp);
        }
    }

    timer = setInterval(highlightSubtitles, 250); // Check every 250 milliseconds (4 times per second)
}

function pauseHighlighting() {
    const playPauseButton = document.getElementById('playPauseButton');
    isPlaying = false;
    playPauseButton.textContent = 'Play';
    clearInterval(timer);
}

function parseTime(timestamp) {
    let [hours, minutes, seconds] = timestamp.split(':');
    seconds = seconds.replace(',', '.');
    return parseFloat(hours) * 3600 + parseFloat(minutes) * 60 + parseFloat(seconds);
}

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('subtitle')) {
        document.querySelectorAll('.currentSubtitle').forEach(el => el.classList.remove('currentSubtitle'));
        e.target.classList.add('currentSubtitle');
        const clickedIndex = subtitleDivs.findIndex(item => item.div === e.target);
        if (clickedIndex !== -1) {
            currentSubtitleIndex = clickedIndex;
            pauseHighlighting();
            startHighlighting(subtitleDivs.map(item => item.subtitle));
        }
    }
});

// Implement play/pause logic here
document.getElementById('playPauseButton').addEventListener('click', () => {
    if (subtitleDivs.length == 0) {
        alert("No lyrics loaded.");
        return;
    }

    if (isPlaying) {
        pauseHighlighting();
    } else {
        startHighlighting(subtitleDivs.map(item => item.subtitle));
    }
});

document.getElementById('settingsIcon').addEventListener('click', () => {
    // Implement settings modal/dialog here
    let speed = parseFloat(getCookie("playbackSpeed") || 1)
    let newSpeed;
    while (true) {
        newSpeed = prompt("Wiedergabegeschwindigkeit einstellen", speed);
        if (newSpeed === null) break;
        if (newSpeed && !isNaN(newSpeed) && parseFloat(newSpeed) > 0) {
            setCookie("playbackSpeed", newSpeed, 365);
            break;
        }
        alert("Please enter a valid number.");
    }
});

function getCookie(name) {
    let cookieArr = document.cookie.split(";");
    for (let i = 0; i < cookieArr.length; i++) {
        let cookiePair = cookieArr[i].split("=");
        if (name == cookiePair[0].trim()) {
            return decodeURIComponent(cookiePair[1]);
        }
    }
    return null;
}

function setCookie(name, value, days) {
    let date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = name + "=" + encodeURIComponent(value) + ";expires=" + date.toUTCString() + ";path=/";
}