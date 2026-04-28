

// FullCalendar setup, CSV parsing, and event mutation 
// Depends on FullCalendar loading first

document.addEventListener('DOMContentLoaded', function () {

    //Get the calendar element 
    var calendarElement = document.getElementById('calendar');

    //Create the actual object
    var calendar = new FullCalendar.Calendar(calendarElement, {

        //This gives it a smoother transition when you adjust the size of the app.
        //Not sure it was designed to be negative though lol
        handleWindowResize: true,
        windowResizeDelay: -100,
        editable: true,
        droppable: true,

        //This says which type of calendar to use
        /*
        | View         | Description           |
        | ------------ | --------------------- |
        | dayGridMonth | Classic month view    |
        | timeGridWeek | Week with time slots  |
        | timeGridDay  | Single day with hours |
        | listWeek     | List format           |
        */
        initialView: 'dayGridMonth',



        //Add any event dropped from outside the calendar
        //Significant AI assistance for the drag and drop feature
        eventReceive: function (info) {

            info.event.remove();
            const droppedDate = info.event.startStr.split('T')[0]; // YYYY-MM-DD
            const parts = droppedDate.split('-');
            const csvDate = `${parseInt(parts[1])}/${parseInt(parts[2])}/${parts[0]}`;
            const title = info.event.title;

            const chip = document.getElementById('event-chip');

            // Preserve any description/time already on the chip's pending CSV row
            const chipCsv = chip.dataset.csvRow || '';
            const chipFields = chipCsv.split(',');
            const description = chipFields[5] ? chipFields[5].trim() : '';
            const startTm = chipFields[1] ? chipFields[1].trim() : '0';
            const endTm = chipFields[2] ? chipFields[2].trim() : '0';

            const csvRow = `${title},${startTm},${endTm},${csvDate},${csvDate},${description}`;

            if (csvRow)
                window.addEventToCSV(window.csvData, csvRow + '\n');

            // Clear the form fields
            document.getElementById('Event name').value = '';
            document.getElementById('Start time').value = '';
            document.getElementById('End time').value = '';
            document.getElementById('Start Day').value = '';
            document.getElementById('End Day').value = '';
            document.getElementById('Description').value = '';
            document.querySelectorAll('.form-field__input, .form-field__textarea').forEach(el => setActive(el, false));
            document.querySelectorAll('.ampm-btn').forEach(btn => { btn.textContent = 'AM'; btn.classList.remove('pm'); });

            // Reset chip
            chip.className = 'event-chip pending';
            chip.removeAttribute('data-event');
            chip.dataset.csvRow = '';
            document.getElementById('chip-title').textContent = 'No Event';
            document.getElementById('chip-info').textContent = '';
        },


        // Persist drag-to-reschedule to the CSV. Without this, events visually
        // move but the underlying csvData is unchanged — the next re-render
        // (e.g. after adding a new event) snaps them back to the old date.
        eventDrop: function (info) {
            const toCsvDate = (iso) => {
                const [y, m, d] = iso.split('T')[0].split('-');
                return `${parseInt(m)}/${parseInt(d)}/${y}`;
            };
            const oldDate = toCsvDate(info.oldEvent.startStr);
            const newDate = toCsvDate(info.event.startStr);
            const dayDiff = Math.round((info.event.start - info.oldEvent.start) / 86400000);
            const title = info.event.title;

            const lines = window.csvData.split('\n');
            let updated = false;
            for (let i = 0; i < lines.length; i++) {
                const fields = lines[i].split(',');
                if (fields.length < 5) continue;
                if (fields[0].trim() === title && fields[3].trim() === oldDate) {
                    fields[3] = newDate;
                    // Shift end date by the same number of days so multi-day events keep their span
                    const endParts = fields[4].trim().split('/');
                    if (endParts.length === 3) {
                        const d = new Date(+endParts[2], +endParts[0] - 1, +endParts[1]);
                        d.setDate(d.getDate() + dayDiff);
                        fields[4] = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
                    } else {
                        fields[4] = newDate;
                    }
                    lines[i] = fields.join(',');
                    updated = true;
                    break;
                }
            }

            if (!updated) {
                // No matching CSV row — snap the event back so what you see matches what's saved.
                info.revert();
                return;
            }

            window.csvData = lines.join('\n');
            window.chrome.webview.postMessage(window.csvData);

            // Re-render from updated CSV to stay in sync
            calendar.getEventSources().forEach(s => s.remove());
            calendar.addEventSource({ events: parseCSV(window.csvData) });
        },


        //Largely written by AI
        eventMouseEnter: function (info) {
            const ev = info.event;

            // Clone the tooltip to wipe all event listeners (like the X button) without affecting future tooltips
            const old = document.getElementById('event-tooltip');
            const tooltip = old.cloneNode(false);
            old.parentNode.replaceChild(tooltip, old);
            tooltip.id = 'event-tooltip';

            const start = ev.start;
            const dateStr = start ? `${start.getMonth() + 1}/${start.getDate()}/${start.getFullYear()}` : '';

            const endDateRaw = ev.extendedProps && ev.extendedProps.endDateRaw ? ev.extendedProps.endDateRaw : '';

            // Only show end date if it differs from start date
            const endDateStr = (endDateRaw && endDateRaw !== dateStr) ? endDateRaw : '';

            let timeStr = '';
            if (!ev.allDay && ev.start) {
                const fmt = (d) => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
                timeStr = fmt(ev.start);
                if (ev.end)
                    timeStr += ` – ${fmt(ev.end)}`;
            }

            const description = ev.extendedProps && ev.extendedProps.description ? ev.extendedProps.description : '';

            let html = `<div class="tooltip-header"> <span class="chip-title">${ev.title}</span>  <button class="tooltip-close-btn" id="tooltip-close-btn">✕</button> </div>`;
            if (dateStr)
                html += `<div class="chip-row"><span class="chip-row-label">Start</span><span class="chip-row-value">${dateStr}</span></div>`;
            if (endDateStr)
                html += `<div class="chip-row"><span class="chip-row-label">End</span><span class="chip-row-value">${endDateStr}</span></div>`;
            if (timeStr)
                html += `<div class="chip-row"><span class="chip-row-label">Time</span><span class="chip-row-value">${timeStr}</span></div>`;
            if (description)
                html += `<div class="chip-row"><span class="chip-row-label">Note</span><span class="chip-row-value">${description}</span></div>`;

            tooltip.innerHTML = html;
            tooltip.style.display = 'flex';

            // Position just below the event bar
            const rect = info.el.getBoundingClientRect();
            tooltip.style.left = `${rect.left}px`;
            tooltip.style.top = `${rect.bottom + 2}px`;

            // X button — delete by title match
            document.getElementById('tooltip-close-btn').addEventListener('click', function () {
                const title = ev.title;
                const lines = window.csvData.split('\n').filter(line => {
                    const f = line.split(',');
                    return f[0].trim() !== title;
                });
                window.csvData = lines.join('\n');
                window.chrome.webview.postMessage(window.csvData);
                calendar.getEventSources().forEach(s => s.remove());
                calendar.addEventSource({ events: parseCSV(window.csvData) });
                tooltip.style.display = 'none';
            });

            // Hide on event leave unless tooltip is hovered
            info.el._tooltipMouseLeave = function () {
                setTimeout(() => {
                    if (!tooltip.matches(':hover'))
                        tooltip.style.display = 'none';
                }, 80);
            };
            info.el.addEventListener('mouseleave', info.el._tooltipMouseLeave);

            // Hide on tooltip leave unless event is hovered
            tooltip.addEventListener('mouseleave', function () {
                setTimeout(() => {
                    if (!info.el.matches(':hover'))
                        tooltip.style.display = 'none';
                }, 80);
            });
        },


        eventMouseLeave: function (info) {
            if (info.el._tooltipMouseLeave)
                info.el.removeEventListener('mouseleave', info.el._tooltipMouseLeave);
        },

    });// End of calendar object creation



    calendar.render();



    // Draggable event chip initialized here
    new FullCalendar.Draggable(document.getElementById('draggable-pool'), {
        itemSelector: '.event-chip.ready',
        eventData: function (chipEl) {
            return JSON.parse(chipEl.getAttribute('data-event') || '{}');
        }
    });



    //We need to wait for the data to be sent from the main process
    const checkForData = setInterval(function () {

        if (window.csvData) {
            clearInterval(checkForData); // Stop checking once found
            console.log('CSV Data received:', window.csvData);

            //From here we can parse the CSV
            //Format: name, start-hour, end-hour, start date, end date, description
            //Format: name, 0-1440minutes, 0-1440, 1/1/2026,  1/1/2026, description
            //Note: Time is base 60, so lets just divide it by that later.
            //If needed, remember to keep the commas consistent for parsing. IE 5 each.

            const events = parseCSV(window.csvData);
            console.log('Parsed events:', events);
            calendar.addEventSource({
                events: events
            });

        }
    }, 100); // Check every 100ms


    function parseCSV(csvString) {
        // Remove any leading/trailing whitespace and split into lines based on *newlines*
        const lines = csvString.trim().split('\n');
        const events = [];

        //For each line
        for (let i = 0; i < lines.length; i++) {
            const fields = lines[i].split(',');


            // Transform fields into FullCalendar event format

            if (fields.length >= 5) { // Ensure there are enough fields
                

                // Validate date format (MM/DD/YYYY)
                const dateRange = /^\d{1,2}\/\d{1,2}\/\d{4}$/;

                // Convert time fields to numbers
                let startTm = parseInt(fields[1], 10);
                let endTm = parseInt(fields[2], 10);

                if (dateRange.test(fields[3])) {

                    //The end date isn't required, so we can just set it to the start date
                    if (!fields[4] || !dateRange.test(fields[4].trim())) 
                        fields[4] = fields[3].trim();

                    startTm = Math.max(0, Math.min(1440, startTm)); // Clamp to 0-1440
                    endTm = Math.max(0, Math.min(1440, endTm)); // Clamp to 0-1440

                    // Ensure end time is not before start time
                    if (endTm < startTm)
                        endTm = startTm;

                    // Convert minutes to hours:minutes format (HH:MM)
                    const hours = Math.floor(startTm / 60);
                    const minutes = startTm % 60;
                    const startTimeFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

                    const endHours = Math.floor(endTm / 60);
                    const endMinutes = endTm % 60;
                    const endTimeFormatted = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

                    // Convert date format from MM/DD/YYYY to YYYY-MM-DD
                    //Creates an array of the date parts, and then rearranges them into the correct format for FullCalendar. It also pads the month and day with leading zeros if necessary to ensure they are always two digits.
                    const startParts = fields[3].trim().split('/');
                    const startDateFormatted = `${startParts[2]}-${String(startParts[0]).padStart(2, '0')}-${String(startParts[1]).padStart(2, '0')}`;

                    const endParts = fields[4].trim().split('/');
                    const endDateFormatted = `${endParts[2]}-${String(endParts[0]).padStart(2, '0')}-${String(endParts[1]).padStart(2, '0')}`;

                    events.push({

                        title: fields[0].trim(),
                        start: `${startDateFormatted}T${startTimeFormatted}:00`,
                        end: `${endDateFormatted}T${endTimeFormatted}:00`,

                        extendedProps: {
                            description: fields[5] ? fields[5].trim() : '',
                            endDateRaw: fields[4] ? fields[4].trim() : ''
                        }
                    });

                } else {
                    continue; // Skip this line if the date format is invalid
                }

            } else {
                console.warn(`Skipping line ${i + 1}: Not enough fields`);
            }
        }
        return events;
    }


    function addEventToCSV(csvString, newEvent) {

        if (!window.csvData)
            window.csvData = '';

        if (!window.csvData.endsWith('\n') && window.csvData.length > 0)
            window.csvData += '\n';

        window.csvData += newEvent;

        //This posts the changes to the C# main process, which will then write it to the file.
        window.chrome.webview.postMessage(window.csvData);

        //This removes the old events from the calendar
        calendar.getEventSources().forEach(source => source.remove());

        const newEvents = parseCSV(window.csvData);
        calendar.addEventSource({ events: newEvents });
    }
    window.addEventToCSV = addEventToCSV;
});
