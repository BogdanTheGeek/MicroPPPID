//------------------------------------------------------------------------------
//       Filename: script.js
//------------------------------------------------------------------------------
//       Bogdan Ionescu (c) 2025
//------------------------------------------------------------------------------
//       Purpose : Programable PID Controller UI
//------------------------------------------------------------------------------
//       Notes : None
//------------------------------------------------------------------------------

//------------------------------------------------------------------------------
// Module type definitions
//------------------------------------------------------------------------------

class ControllerState {
   constructor(data) {
      this.temp = data.temp || 0;
      this.target = data.target || 0;
      this.current = data.current || 0;
      this.duty = data.duty || 0;
      this.runtime = data.runtime || 0;
      this.running = data.running || false;
      this.paused = data.paused || false;
      return;
   }
}

//------------------------------------------------------------------------------
// Module constant defines
//------------------------------------------------------------------------------

//------------------------------------------------------------------------------
// Module global variables
//------------------------------------------------------------------------------

var interval;

var state = new ControllerState({});

var traces = [{
   name: 'Tempearture',
   ...generateSamples(),
   mode: 'lines',
   line: { color: '#4934ec', shape: 'spline' }
}, {
   name: 'Target',
   ...generateSamples(),
   mode: 'lines',
   line: { color: '#ecc734', shape: 'spline' }
}, {
   name: 'Current',
   ...generateSamples(),
   mode: 'lines',
   line: { color: '#ec6b34', shape: 'spline' }
}];

console.log(traces)

//------------------------------------------------------------------------------
// Module externally exported functions
//------------------------------------------------------------------------------

/**
 * @brief  Generate samples for the plot
 * @return {object} {x: number[], y: number[]}
 */
function generateSamples() {
   return { x: [new Date()], y: [0] };
}


function connect() {
   ws = new WebSocket('ws://' + location.host + '/ws');
   ws.onopen = function() {
      console.log('Socket is open');
   };

   ws.onmessage = function(e) {
      console.log('Message:' + e.data);
      const status = JSON.parse(e.data);
      state = new ControllerState(status);
      updateReadings(state);
   };

   ws.onclose = function(e) {
      console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
      setTimeout(function() {
         ws = connect();
      }, 1000);
   };

   ws.onerror = function(err) {
      console.log('Socket encountered error: ' + err.message);
      ws.close();
   };

   return ws;
}

/**
 * @brief  Update the layout of the plot
 * @param  None
 * @return None
 */
function updateLayout() {

   Plotly.redraw('canvas');
   return;

   const start = traces[0].x
   const end = traces[0].x[traces[0].x.length - 1];

   Plotly.relayout('canvas', {
      xaxis: {
         range: [start, end]
      },
   });
}

/**
 * @brief  Add data to the plot
 * @param {ControllerState} status: The power supply status
 * @return None
 */
function addData(status) {

   timestamp = new Date()

   traces[0].x.push(timestamp);
   traces[0].y.push(status.temp);
   traces[1].x.push(timestamp);
   traces[1].y.push(status.target);
   traces[2].x.push(timestamp);
   traces[2].y.push(status.current);

   updateLayout();
}

/**
 * @brief  Switch tabs
 * @param {Event} event: The event
 * @param {string} newTabName: The new tab name
 * @return None
 */
function switchTab(_, newTabName) {
   document.location.href = "#" + newTabName;

   const tabLabels = document.getElementsByClassName("tl");
   for (e of tabLabels) {
      e.className = "tl";
   }

   const tabContents = document.getElementsByClassName("tc");
   for (e of tabContents) {
      e.className = "tc";
   }

   document.getElementById("tc-" + newTabName).className += " active";
   document.getElementById("tl-" + newTabName).className += " active";

   onResize();
   updateLayout();

}

function round(value, decimals) {
   return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}

/**
 * @brief  Update the readings on the page
 * @param {ControllerState} status: The power supply status
 * @return None
 */
function updateReadings(status) {
   document.getElementById("temp").innerHTML = "Temperature: " + round(status.temp, 0) + '°C';
   document.getElementById("target").innerHTML = "Target: " + round(status.target, 0) + '°C';
   document.getElementById("current").innerHTML = "Current: " + round(status.current, 1) + 'A';
   document.getElementById("duty").innerHTML = "Duty: " + round(status.duty * 100, 1) + '%';

   updateStartStopButton();
   updatePauseResumeButton();

   addData(status);
}

/*
 * @brief  Resize event handler
 * @param  None
 * @return None
 */
function onResize() {
   const tab = document.getElementById("tc-live");
   tab.style.height = window.innerHeight - tab.offsetTop - 10 + "px";
}

/**
   * @brief  Send command to the server
   * @param {WebSocket} ws: The WebSocket connection
   * @param {string} command: The command to send
   * @return None
   */
function sendCommand(ws, command) {
   ws.send(JSON.stringify({ command: command }));
}

/**
   * @brief  Update the start/stop button
   * @param  None
   * @return None
   */
function updateStartStopButton() {
   var s = document.getElementById("startstop");
   if (state.running) {
      s.style.backgroundColor = "red";
      s.value = "STOP";
   } else {
      s.style.backgroundColor = "green";
      s.value = "Start";
   }
}

/**
   * @brief  Update the pause/resume button
   * @param  None
   * @return None
   */
function updatePauseResumeButton() {
   var s = document.getElementById("pauseresume");
   if (state.paused) {
      s.value = "Resume";
   } else {
      s.value = "Pause";
   }
}

/**
   * @brief  Load the selected program
   * @param  None
   * @return None
   */
function loadProgram() {
   const select = document.getElementById("program");
   if (select.selectedIndex == 0) {
      return;
   }
   const program = select.options[select.selectedIndex].value;
   const url = '/load/' + program;
   fetch(url)
      .then(response => response.json())
      .then(data => {
         console.log(data);
         console.log("Program loaded: " + program);
      })
      .catch(error => {
         console.error('Error loading program:', error);
         select.selectedIndex = 0;
      });
}

/**
   * @brief  Create the list of programs
   * @param  {Array} programs: The list of programs
   * @return None
   */
function createProgramList(programs) {
   const table = document.getElementById("programs");
   table.innerHTML = "";
   table.className = "table";
   for (const program of programs) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.innerHTML = program;
      const cell2 = document.createElement("td");
      const deleteButton = document.createElement("button");
      deleteButton.innerHTML = "❌";
      deleteButton.onclick = () => {
         const url = '/delete/' + program;
         fetch(url)
            .then(data => {
               console.log(data);
               console.log("Program deleted: " + program);
               getPrograms();
            })
            .catch(error => {
               console.error('Error deleting program:', error);
            });
      };
      cell2.appendChild(deleteButton);
      row.appendChild(cell2);
      row.appendChild(cell);
      table.appendChild(row);
   }
}

/**
   * @brief  Get the list of programs
   * @param  None
   * @return None
   */
function getPrograms() {
   const url = '/progs';
   fetch(url)
      .then(response => response.json())
      .then(data => {
         console.log(data);
         const select = document.getElementById("program");
         select.onchange = loadProgram;
         select.innerHTML = '<option value="0">None</option>';
         for (const program of data) {
            const option = document.createElement("option");
            option.value = program;
            option.text = program;
            select.appendChild(option);
         }
         createProgramList(data);
      })
      .catch(error => {
         console.error('Error fetching programs:', error);
      });
}
async function upload(ev) {
   ev.preventDefault();
   const file = document.getElementById('file').files[0];
   if (!file) {
      return;
   }
   await fetch('/upload', {
      method: 'POST',
      body: file,
      headers: {
         'Content-Type': 'application/octet-stream',
         'Content-Disposition': `attachment; filename="${file.name}"`,
      },
   }).then(res => {
      if (res.ok) {
         console.log("File uploaded");
         getPrograms();
      } else {
         console.log("Error uploading file");
      }
   });
}

function getSettings() {
   const url = '/settings';
   console.log("Fetching settings");
   fetch(url)
      .then(response => response.json())
      .then(data => {
         console.log("Settings received", data);
         const settings = document.getElementById("settings");
         settings.innerHTML = "";
         const form = document.createElement("form");
         form.id = "settingsform";
         const table = document.createElement("table");
         for (const key in data) {
            const row = document.createElement("tr");
            const label = document.createElement("label");
            label.innerHTML = key;
            label.setAttribute("for", key);
            const input = document.createElement("input");
            input.name = key;
            switch (typeof data[key]) {
               case "string":
                  input.type = "text";
                  input.value = data[key];
                  break;
               case "number":
                  input.type = "number";
                  input.value = data[key];
                  break;
               case "boolean":
                  input.type = "checkbox";
                  input.checked = data[key];
                  break;
               default:
                  console.log("Unknown type: ", typeof data[key]);
            }
            const cell1 = document.createElement("td");
            cell1.appendChild(label);
            row.appendChild(cell1);
            const cell2 = document.createElement("td");
            cell2.appendChild(input);
            row.appendChild(cell2);
            table.appendChild(row);
         }
         form.appendChild(table);
         settings.appendChild(form);
      })
      .catch(error => {
         console.error('Error fetching programs:', error);
      });
}

function saveSettings() {
   const form = document.getElementById("settingsform");
   const data = {};
   for (const p of form) {
      value = null;
      switch (p.type) {
         case "checkbox":
            value = p.checked;
            break;
         case "number":
            value = parseFloat(p.value);
            break;
         case "text":
            value = p.value;
            break;
         default:
            console.log("Unknown type: ", p.type);
            continue;
      }
      data[p.name] = value;
   }
   console.log("Saving settings", data);
   const url = '/settings';
   fetch(url, {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
   }).then(res => {
      if (res.ok) {
         console.log("Settings saved");
         getSettings();
      } else {
         console.log("Error saving settings");
      }
   });
}

function resetSettings() {
   getSettings();
}

/**
 * @brief  On load event handler
 * @param  None
 * @return None
 */
function onLoad() {
   console.log("Loading page");

   const layout = {
      autosize: true,
      margin: { t: 20, b: 20, l: 40, r: 0 },
      legend: { x: 0, y: 1, traceorder: 'normal', font: { size: 16 } },
      yaxis: { automargin: true },
   }
   const config = { responsive: true }
   Plotly.newPlot('canvas', traces, layout, config);

   const tab = document.location.hash || "#live";
   switchTab(null, tab.substring(1));

   onResize();
   updateReadings(state);

   ws = connect();

   document.getElementById('startstop').onclick = () => {
      if (state.paused) {
         console.log("Controller is paused");
         return;
      }
      if (state.running) {
         command = "stop";
      }
      else {
         command = "start";
      }
      sendCommand(ws, command);
   }
   document.getElementById('pauseresume').onclick = () => {
      if (!state.running) {
         console.log("Controller is not running");
         return;
      }
      if (state.paused) {
         command = "resume";
      }
      else {
         command = "pause";
      }
      sendCommand(ws, command);
   }

   document.getElementById('fileform').addEventListener('submit', upload);
   getPrograms();
   getSettings();

}

