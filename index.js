document.getElementById('subtitleFile').addEventListener('change', function(e) {
  window.onbeforeunload = function() {
    return "Bist du sicher, dass du die Seite verlassen willst?";
  };
  document.getElementById('subtitleFile').style.display = 'none';
  const file = e.target.files[0];
  if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
          parseSrt(e.target.result);
      };
      reader.readAsText(file);
  }
});

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
          subtitle.timestamps = {start: timestamp[0], end: timestamp[1]}
      } else if (line.trim()) { // Subtitle text
          subtitle.text += line.trim() + '\n';
      }
  });
  if (subtitle) subtitles.push(subtitle); // Push last subtitle
  subtitles.forEach(subtitle => { // Trim extra spaces from text
      subtitle.text = subtitle.text.trim().replace("\n", "<br>");
  });
  console.log(subtitles);
  displaySubtitles(subtitles);
}

function displaySubtitles(subtitles) {
  const container = document.getElementById('subtitlesContainer');
  container.innerHTML = '';
  subtitles.forEach((subtitle, index) => {
      const div = document.createElement('div');
      div.innerHTML = subtitle.text;
      div.classList.add('subtitle');
      if (index === 0) div.classList.add('currentSubtitle'); // Highlight first subtitle
      container.appendChild(div);
  });
}

// Placeholder for play/pause functionality
document.getElementById('playPauseButton').addEventListener('click', () => {
  // Implement play/pause logic here
});

// Placeholder for settings functionality
document.getElementById('settingsIcon').addEventListener('click', () => {
  // Implement settings modal/dialog here
});