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

// The elapsed time before pause was pressed
let elapsedTimeBeforePause = 0;

// The total elapsed time
let totalTimestamp;

// play and pause icons
const PLAY_ICON = '<i class="fas fa-play"></i>';
const PAUSE_ICON = '<i class="fas fa-pause"></i>';


//
// EVENT LISTNERS
//


// Event listener for subtitle file input change
document.getElementById('subtitleFile').addEventListener('change', function (e) {
  window.onbeforeunload = () => "Bist du sicher, dass du die Seite verlassen willst?";

  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      currentSubtitleIndex = 0;
      
      // parsing successful?
      if (parseSrt(e.target.result)) {
        startHighlighting();
        highlightSubtitle(currentSubtitleIndex, true);
        highlightSubtitles();
        pauseHighlighting();
      }
    };
    reader.readAsText(file);
  }
});

// Event listener for clicking on subtitles to highlight them
document.addEventListener('click', function (e) {
  if (e.target.classList.contains('subtitle')) {
    document.querySelectorAll('.currentSubtitle').forEach(el => el.classList.remove('currentSubtitle'));
    e.target.classList.add('currentSubtitle');
    const clickedIndex = subtitleDivs.findIndex(item => item.div === e.target);
    if (clickedIndex !== -1) {
      highlightSubtitle(clickedIndex);
      elapsedTimeBeforePause = 0;
      startHighlighting();
      document.getElementById('scrollToCurrentSubtitle').classList.remove('visible');
    }
  }
});

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
document.getElementById('settingsButton').addEventListener('click', () => {
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

document.getElementById("scrollToCurrentSubtitle").addEventListener('click', () => {
  this.highlightSubtitle(currentSubtitleIndex, true);
});

document.getElementById('subtitlesContainer').addEventListener('scroll', () => {
  if (isScrolledIntoView(subtitleDivs[currentSubtitleIndex].div)) {
    // hide the jump to current subtitle button
    document.getElementById('scrollToCurrentSubtitle').classList.remove('visible');
  } else {
    // show the jump to current subtitle button
    document.getElementById('scrollToCurrentSubtitle').classList.add('visible');
  }
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
 * Adds a subtitle to the subtitles array.
 * @param {Array<Object>} subtitles - The array of parsed subtitles.
 * @param {Object|null} subtitle - The current subtitle object.
 * @returns {void}
 */
function addSubtitle(subtitles, subtitle) {
  if (subtitle) {
    subtitles.push(subtitle);
    subtitle.text = subtitle.text.trim().replace("\n", "<br>");
  }
}

/**
 * Parses the SRT file text to extract subtitles.
 * @param {string} srtText - The raw string from the SRT file.
 * @returns {boolean} whether the parsing was successful or not
 */
function parseSrt(srtText) {
  const lines = srtText.split('\n');
  const subtitles = [];
  let subtitle = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // sequence identifier
    if (/^\d+$/.test(line)) {
      // push previous subtitle
      addSubtitle(subtitles, subtitle);
      subtitle = null;

      let nextLine = lines[++i].trim();

      // the next line has to be a timestamp
      if (/^\d+:\d+:\d+,\d+(?: --> \d+:\d+:\d+,\d+)?$/.test(nextLine)) {
        let timestamps = nextLine.split(" --> ");
        subtitle = {
          sequence: parseInt(line, 10),
          text: '',
          timestamps: {
            start: timestamps[0],
            end: timestamps.length > 1 ? timestamps[1] : timestamps[0]
          }
        };
      } else {
        console.warn(`Expected timestamp(s), not '${timestamps}'`);

        // reset the index, maybe a seq id was duplicated
        i--;
      }
    // subtitle text
    } else if (subtitle && line.trim()) {
      subtitle.text += line.trim() + '\n';
    } else if (!subtitle) {
      console.warn(`Expected sequence identifier, not '${line}'`);
    }
  }

  // push last subtitle
  addSubtitle(subtitles, subtitle);
  
  displaySubtitles(subtitles);

  if (subtitles.length == 0) {
    alert("Failed to parse SRT file. See browser console.");
    return false;
  }

  return true;
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
  playPauseButton.innerHTML = PAUSE_ICON;
  lastUpdate = (Date.now() / 1000) - elapsedTimeBeforePause;
  elapsedTimeBeforePause = 0;
  lockWakeState();

  // Check every 50 milliseconds (20 times per second)
  clearInterval(timer);
  timer = setInterval(highlightSubtitles, 50);
}

/**
 * Pauses the highlighting of subtitles.
 */
function pauseHighlighting() {
  const playPauseButton = document.getElementById('playPauseButton');
  isPlaying = false;
  playPauseButton.innerHTML = PLAY_ICON;
  releaseWakeState();
  elapsedTimeBeforePause = ((Date.now() / 1000) - lastUpdate);

  clearInterval(timer);
}

/**
 * Highlights the current subtitle based on the elapsed time.
 */
function highlightSubtitles() {
  if (currentSubtitleIndex == subtitleDivs.length - 1) {
    pauseHighlighting();
    return;
  }

  if (isPlaying) {
    const currentTime = Date.now() / 1000;
    // Calculate time elapsed in seconds, also the time is faster by the playbackSpeed factor
    const elapsedTime = (currentTime - lastUpdate) * parseFloat(this.getCookie("playbackSpeed") || 1);

    const currentSubtitleTime = parseTime(subtitleDivs[currentSubtitleIndex].subtitle.timestamps.start);
    let totalTime = currentSubtitleTime + elapsedTime;

    // loop threw all subtitles until we find one that has a start time greater than the total time.
    // then use the index before that.
    let newIndex = -1;
    let newTime = 0;
    subtitleDivs.forEach(subtitleDiv => {
      const timestamps = subtitleDiv.subtitle.timestamps;

      if (parseTime(timestamps.start) > totalTime) {
        return;
      } else {
        newTime = totalTime - parseTime(timestamps.start)
        newIndex++;
      }
    });

    if (newIndex > currentSubtitleIndex) {
      lastUpdate = currentTime - newTime;
      currentSubtitleIndex = newIndex;
      totalTime = parseTime(subtitleDivs[currentSubtitleIndex].subtitle.timestamps.start);
      highlightSubtitle(currentSubtitleIndex);
    }

    // Format and save total timestamp in HH:mm:ss format
    totalTimestamp = formatTime(totalTime);
    document.getElementById('timestamp').innerText = totalTimestamp;
  }
}

/**
 * Highlights a specific subtitle and updates the current index.
 * @param {number} idx The index of the subtitle to highlight.
 * @param {boolean} force force scrolling to the current subtitle
 */
function highlightSubtitle(idx, force = false) {
  document.querySelectorAll('.currentSubtitle').forEach(el => el.classList.remove('currentSubtitle'));
  subtitleDivs[idx].div.classList.add('currentSubtitle');
  currentSubtitleIndex = idx;

  // check if the subtitle is visible
  if (isScrolledIntoView(subtitleDivs[idx].div) || force) {
    // scroll the new one into view
    subtitleDivs[idx].div.scrollIntoView({
      behavior: 'auto',
      block: 'center',
      inline: 'center'
    });
  }
}

/**
 * Check if an element is (partly) scrolled into view
 * @param {Object} el an HTML element
 * @param {boolean} partly if this should return true when the element is only partly visible
 * @returns {boolean}
 */
function isScrolledIntoView(el, partly = true) {
  var rect = el.getBoundingClientRect();
  var elemTop = rect.top;
  var elemBottom = rect.bottom;

  var isVisible = partly
      ? elemTop < window.innerHeight && elemBottom >= 0
      : (elemTop >= 0) && (elemBottom <= window.innerHeight);
  return isVisible;
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


//
// WAKELOCK
//


const canWakeLock = () => 'wakeLock' in navigator;

let wakelock;
async function lockWakeState() {
  if (!canWakeLock()) {
    return;
  }

  try {
    wakelock = await navigator.wakeLock.request();
  } catch (e) {
    console.warn('Failed to lock wake state with reason:', e.message);
  }
}

function releaseWakeState() {
  if (wakelock) {
    wakelock.release();
  }

  wakelock = null;
}