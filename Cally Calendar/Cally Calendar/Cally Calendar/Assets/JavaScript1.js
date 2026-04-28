let timerInterval;
let remainingTime;
let totalDuration;
let isPaused = false;

// Get references to DOM elements
const durationInput = document.getElementById('durationInput');
const progressBar = document.getElementById('progressBar');
const alarm = document.getElementById('alarm');
const timeDisplay = document.getElementById('timeDisplay');

// Initialize display
function updateProgressBar() {


    // Progress bar logic
    const percentage = (remainingTime / totalDuration) * 100;
    progressBar.style.width = Math.max(percentage, 0) + '%';

    if (percentage <= 10 && totalDuration > 0) {
        progressBar.classList.add('warning');
        timeDisplay.style.color = "#ff4d4d"; // Numbers turn red in last 10% too
    } else {
        progressBar.classList.remove('warning');
        timeDisplay.style.color = "Navy"; // Back to digital green
    }

    // Traditional MM:SS formatting
    const displayTime = Math.max(0, Math.ceil(remainingTime));
    const mins = Math.floor(displayTime / 60);
    const secs = displayTime % 60;

    // Update the time display with leading zeros
    timeDisplay.textContent =
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}


// Update the stop button to reset the display
document.getElementById('stopBtn').addEventListener('click', () => {
    clearInterval(timerInterval);
    alarm.pause();
    alarm.currentTime = 0;
    remainingTime = 0;
    isPaused = false;
    updateProgressBar();
    timeDisplay.textContent = "00:00"; // Reset text
});


// Start button logic
document.getElementById('startBtn').addEventListener('click', () => {
    if (!isPaused) {
        const minutes = parseFloat(durationInput.value);
        if (isNaN(minutes) || minutes <= 0) return;

        totalDuration = minutes * 60; //To seconds
        remainingTime = totalDuration;
    }

    isPaused = false;
    clearInterval(timerInterval);

    // Update every 50ms for "60fps" style smoothness
    timerInterval = setInterval(() => {
        remainingTime -= 0.05; // Matches the 50ms interval
        updateProgressBar();

        if (remainingTime <= 0) {
            clearInterval(timerInterval);
            remainingTime = 0; // Snap to zero
            updateProgressBar();
            alarm.play();
        }
    }, 50);
});


// Pause button logic
document.getElementById('pauseBtn').addEventListener('click', () => {
    clearInterval(timerInterval);
    isPaused = true;
});


// Stop button logic
document.getElementById('stopBtn').addEventListener('click', () => {
    clearInterval(timerInterval);
    alarm.pause();
    alarm.currentTime = 0;
    remainingTime = 0;
    isPaused = false;
    updateProgressBar();
});
