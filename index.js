// Global variable to hold subtitle divs and corresponding subtitles
let subtitleDivs = [];

// Timer for checking subtitle times
let timer;

// Current subtitle index
let currentSubtitleIndex = 0;

// Track play/pause state
let isPlaying = false;

// Track the start time of playback
let lastUpdate;

// The total elapsed time
let totalTimestamp;

// Event listener for clicking on subtitles to highlight them
document.addEventListener('click', function (e) {
  if (e.target.classList.contains('subtitle')) {
    document.querySelectorAll('.currentSubtitle').forEach(el => el.classList.remove('currentSubtitle'));
    e.target.classList.add('currentSubtitle');
    const clickedIndex = subtitleDivs.findIndex(item => item.div === e.target);
    if (clickedIndex !== -1) {
      highlightSubtitle(clickedIndex);
      pauseHighlighting();
      startHighlighting();
    }
  }
});


//
// EVENT LISTNERS
//


// Event listener for play/pause button click
document.getElementById('playPauseButton').addEventListener('click', () => {
  if (subtitleDivs.length == 0) {
    alert("No lyrics loaded.");
    return;
  }

  if (isPlaying) {
    pauseHighlighting();
  } else {
    startHighlighting();
  }
});

// Event listener for settings icon click
document.getElementById('settingsIcon').addEventListener('click', () => {
  let speed = parseFloat(getCookie("playbackSpeed") || 1);
  let newSpeed;

  // the user needs to enter a valid playback speed, this will be saved in a cookie
  while (true) {
    newSpeed = prompt("Change playback speed factor", speed);
    if (newSpeed === null) break;
    if (newSpeed && !Number.isNaN(newSpeed) && parseFloat(newSpeed) > 0) {
      setCookie("playbackSpeed", newSpeed, 365);
      break;
    }
    alert("Please enter a valid number.");
  }
});

// Event listener for subtitle file input change
document.getElementById('subtitleFile').addEventListener('change', function (e) {
  window.onbeforeunload = function () {
    return "Bist du sicher, dass du die Seite verlassen willst?";
  };
  // document.getElementById('subtitleFile').style.display = 'none';
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      parseSrt(e.target.result);
    };
    reader.readAsText(file);
  }

  currentSubtitleIndex = 0;
});


//
// PARSING/FORMATTING
//


/**
 * Formats a given time in seconds to HH:mm:ss format.
 * @param {number} seconds - The time in seconds.
 * @return {string} - The formatted time string.
 */
function formatTime(seconds) {
  const date = new Date(null);
  date.setSeconds(seconds);

  // Format HH:mm:ss
  return date.toISOString().slice(11, 19);
}

/**
 * Parses a timestamp string to total seconds.
 * @param {string} timestamp - The timestamp string in HH:mm:ss,SSS format.
 * @return {number} - The total seconds.
 */
function parseTime(timestamp) {
  let [hours, minutes, seconds] = timestamp.split(':');
  seconds = seconds.replace(',', '.');
  return parseFloat(hours) * 3600 + parseFloat(minutes) * 60 + parseFloat(seconds);
}

/**
 * Parses the SRT file text to extract subtitles.
 * @param {string} srtText - The raw string from the SRT file.
 */
function parseSrt(srtText) {
  const lines = srtText.split('\n');
  const subtitles = [];
  let subtitle = null;
  lines.forEach(line => {
    line = line.trim();
    // Sequence identifier
    if (/^\d+$/.test(line)) {
      // Push previous subtitle
      if (subtitle) subtitles.push(subtitle);
      // Initialize new subtitle with empty text
      subtitle = { sequence: parseInt(line, 10), text: '' };
    // Timestamps
    } else if (line.includes(' --> ')) {
      let timestamp = line.split(" --> ");
      subtitle.timestamps = { start: timestamp[0], end: timestamp[1] };
    // Subtitle text
    } else if (line.trim()) {
      subtitle.text += line.trim() + '\n';
    }
  });
  // Push last subtitle
  if (subtitle) subtitles.push(subtitle);
  // Trim extra spaces from text
  subtitles.forEach(subtitle => {
    subtitle.text = subtitle.text.trim().replace("\n", "<br>");
  });
  displaySubtitles(subtitles);
}

/**
 * Displays the parsed subtitles on the webpage.
 * @param {Array} subtitles - The list of subtitle objects.
 */
function displaySubtitles(subtitles) {
  const container = document.getElementById('subtitlesContainer');
  container.innerHTML = '';
  // Clear the global variable
  subtitleDivs = [];
  subtitles.forEach((subtitle, index) => {
    const div = document.createElement('div');
    div.innerHTML = subtitle.text;
    div.classList.add('subtitle');
    // Highlight first subtitle
    if (index === 0) div.classList.add('currentSubtitle');
    // Store div and subtitle in global variable
    subtitleDivs.push({ div: div, subtitle: subtitle });
    container.appendChild(div);
  });
}


//
// AUTOMATIC HIGHLIGHTING
//


/**
 * Starts the highlighting of subtitles.
 */
function startHighlighting() {
  const playPauseButton = document.getElementById('playPauseButton');
  isPlaying = true;
  playPauseButton.textContent = 'Pause';
  lastUpdate = Date.now();

  // Check every 250 milliseconds (4 times per second)
  timer = setInterval(highlightSubtitles, 250);
}

/**
 * Pauses the highlighting of subtitles.
 */
function pauseHighlighting() {
  const playPauseButton = document.getElementById('playPauseButton');
  isPlaying = false;
  playPauseButton.textContent = 'Play';
  clearInterval(timer);
}

/**
 * Highlights the current subtitle based on the elapsed time.
 */
function highlightSubtitles() {
  if (currentSubtitleIndex == subtitleDivs.length) {
    pauseHighlighting();
    return;
  }

  if (isPlaying) {
    const currentTime = Date.now();
    // Calculate time elapsed in seconds, also the time is faster by the playbackspeed factor
    const elapsedTime = ((currentTime - lastUpdate) / 1000) * parseFloat(this.getCookie("playbackSpeed") || 1);

    const currentSubtitleTime = parseTime(subtitleDivs[currentSubtitleIndex].subtitle.timestamps.start);
    const totalTime = currentSubtitleTime + elapsedTime;

    // loop threw all subtitles until we find one that has a start time greater than the total time. then use the index before that.
    let newIndex = -1;
    subtitleDivs.forEach(subtitleDiv => {
      const timestamps = subtitleDiv.subtitle.timestamps;

      if (parseTime(timestamps.start) >= totalTime) {
        return;
      } else {
        newIndex++;
      }
    });

    if (newIndex > currentSubtitleIndex) {
      lastUpdate = currentTime;
      currentSubtitleIndex = newIndex;
      highlightSubtitle(currentSubtitleIndex);
    }

    // Format and save total timestamp in HH:mm:ss format
    totalTimestamp = formatTime(totalTime);
    document.getElementById('timestamp').innerText = totalTimestamp;
  }
}

/**
 * Highlights a specific subtitle and updates the current index.
 * @param {number} idx - The index of the subtitle to highlight.
 */
function highlightSubtitle(idx) {
  document.querySelectorAll('.currentSubtitle').forEach(el => el.classList.remove('currentSubtitle'));
  subtitleDivs[idx].div.classList.add('currentSubtitle');
  subtitleDivs[idx].div.scrollIntoView({
    behavior: 'auto',
    block: 'center',
    inline: 'center'
  });
  currentSubtitleIndex = idx;
}


//
// COOKIES
//


/**
 * Retrieves a cookie value by its name.
 * @param {string} name - The name of the cookie.
 * @return {string|null} - The cookie value or null if not found.
 */
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

/**
 * Sets a cookie with a specific name, value, and expiration days.
 * @param {string} name - The name of the cookie.
 * @param {string} value - The value of the cookie.
 * @param {number} days - The number of days until the cookie expires.
 */
function setCookie(name, value, days) {
  let date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = name + "=" + encodeURIComponent(value) + ";expires=" + date.toUTCString() + ";path=/";
}