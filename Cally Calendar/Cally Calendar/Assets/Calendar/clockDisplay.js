// this function starts the clock
function startClock(element) {
        
    // this function will display the time
    function displayTime() {

        const now = new Date();

        let hours = now.getHours();
        let minutes = now.getMinutes();
        let am_pm ;

        if (hours >= 12) {
        am_pm = 'PM'
        }
        else {
            am_pm = 'AM'
        }

        // convert to 12 hour format
        hours = (hours % 12) || 12;
        
        // add leading 0s ex) 09 instead of 9
        hours = hours.toString().padStart(2, '0');
        minutes = minutes.toString().padStart(2, '0');

        const timeString = `${hours}:${minutes} ${am_pm}`;

        document.getElementById(element).textContent = timeString;
    }

    // runs immediately so there is no delay
    displayTime();

    // update the time every second (1000 ms)
    setInterval(displayTime, 1000);
}