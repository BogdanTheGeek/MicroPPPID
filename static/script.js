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
      this.p = data.p || 0;
      this.i = data.i || 0;
      this.d = data.d || 0;
      return;
   }
}

//------------------------------------------------------------------------------
// Module constant defines
//------------------------------------------------------------------------------

//------------------------------------------------------------------------------
// Module global variables
//------------------------------------------------------------------------------

var g_ws = null;

var state = new ControllerState({});

var traces = [{
   name: 'Temperature',
   x: [new Date()], y: [0],
   mode: 'lines',
   line: { color: '#4934ec', shape: 'spline' }
}, {
   name: 'Target',
   x: [new Date()], y: [0],
   mode: 'lines',
   line: { color: '#ecc734', shape: 'spline' }
}, {
   name: 'Current',
   x: [new Date()], y: [0],
   mode: 'lines',
   line: { color: '#ec6b34', shape: 'spline' },
   yaxis: 'y2'
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
      try {
         const status = JSON.parse(e.data);
         state = new ControllerState(status);
         updateReadings(state);
      }
      catch {
         log(e.data)
      }
   };

   ws.onclose = function(e) {
      console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
      setTimeout(function() {
         g_ws = connect();
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
   traces[3].x.push(timestamp);

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
   document.getElementById("p").innerHTML = "P: " + round(status.p, 3);
   document.getElementById("i").innerHTML = "I: " + round(status.i, 3);
   document.getElementById("d").innerHTML = "D: " + round(status.d, 3);

   const hours = Math.floor(status.runtime / 3600);
   const minutes = Math.floor((status.runtime % 3600) / 60);
   const seconds = Math.floor(status.runtime % 60);
   document.getElementById("runtime").innerHTML = `Runtime: ${hours}h ${minutes}m ${seconds}s`;

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
   Plotly.Plots.resize('canvas');
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
      .then(data => {
         console.log(data);
         console.log("Program loaded: " + program);
      })
      .catch(error => {
         console.error('Error loading program:', error);
         select.selectedIndex = 0;
      });
}

function setSetpoint() {
   const setpoint = parseFloat(document.getElementById("setpoint").value);
   if (isNaN(setpoint)) {
      console.error("Invalid setpoint");
      return;
   }
   const data = { setpoint: setpoint };
   const url = '/setpoint';
   fetch(url, {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
   }).then(data => {
      console.log(data);
      console.log("Setpoint set: " + setpoint);
      updateStartStopButton();
   }).catch(error => {
      console.error('Error setting setpoint:', error);
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

/**
   * @brief  Upload a file to the server
   * @param  {Event} ev: The event
   * @return None
   */
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

/**
   * @brief  Create a setting field
   * @param  {string} key: The setting key
   * @param  {string|number|boolean} value: The setting value
   * @return {HTMLElement} The setting field element
   */
function createSettingField(key, value) {
   const row = document.createElement("tr");
   const label = document.createElement("label");
   label.innerHTML = key;
   label.setAttribute("for", key);
   const input = document.createElement("input");
   input.name = key;
   switch (typeof value) {
      case "string":
         input.type = "text";
         input.value = value;
         break;
      case "number":
         input.type = "number";
         input.value = value;
         break;
      case "boolean":
         input.type = "checkbox";
         input.checked = value;
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

   return row;
}

function createSettingGroup(name, data) {
   const group = document.createElement("fieldset");
   group.name = name;
   const legend = document.createElement("legend");
   legend.innerHTML = name;
   group.appendChild(legend);

   const table = document.createElement("table");
   for (const key in data) {
      table.appendChild(createSettingField(key, data[key]));
   }

   group.appendChild(table);

   return group
}


/**
   * @brief  Get the settings from the controller
   * @param  None
   * @return None
   */
function getSettings() {
   const url = '/settings';
   console.log("Fetching settings");
   fetch(url)
      .then(response => response.json())
      .then(data => {
         console.log("Settings received", data);
         // sort alphabetically
         const keys = Object.keys(data);
         keys.sort();
         const sortedData = {};
         for (const key of keys) {
            sortedData[key] = data[key];
         }
         data = sortedData;
         const settings = document.getElementById("settings");
         settings.innerHTML = "";
         const form = document.createElement("form");
         form.id = "settingsform";

         for (const [name, values] of Object.entries(data)) {
            const group = createSettingGroup(name, values);
            form.appendChild(group);
         }

         settings.appendChild(form);
      })
      .catch(error => {
         console.error('Error fetching programs:', error);
      });
}

/**
   * @brief  Save the settings onto the controller
   * @param  None
   * @return None
   */
function saveSettings() {
   const form = document.getElementById("settingsform");
   const data = {};
   let groupname = null;
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
         case "fieldset":
            groupname = p.name;
            continue;
         default:
            console.log("Unknown type: ", p.type);
            continue;
      }
      if (groupname == null) {
         console.error("No group name");
         continue;
      }
      data[groupname] = data[groupname] || {};
      data[groupname][p.name] = value;
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
         sendCommand(g_ws, "reset");
      } else {
         console.log("Error saving settings");
      }
   });
}

/**
   * @brief  Reset the settings to default
   * @param  None
   * @return None
   */
function resetSettings() {
   getSettings();
}

/**
   * @brief  Download the settings locally as a JSON file
   * @param  None
   * @return None
   */
function downloadSettings() {
   const url = '/settings';
   fetch(url)
      .then(response => response.json())
      .then(data => {
         const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = 'settings.json';
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
      })
      .catch(error => {
         console.error('Error downloading settings:', error);
      });
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
      margin: { t: 40, b: 40, l: 40, r: 40 },
      legend: { x: 0, y: 1, traceorder: 'normal', font: { size: 16 } },
      yaxis: {
         automargin: true,
         ticksuffix: '°C',
         side: 'right',
      },
      yaxis2: {
         automargin: true,
         overlaying: 'y',
         side: 'left',
         showgrid: false,
         zeroline: false,
         ticksuffix: ' A',
      },
   }
   const config = { responsive: true }
   Plotly.newPlot('canvas', traces, layout, config);

   const tab = document.location.hash || "#live";
   switchTab(null, tab.substring(1));

   onResize();
   updateReadings(state);

   g_ws = connect();

   document.getElementById('startstop').onclick = () => {
      if (state.running) {
         command = "stop";
      }
      else {
         command = "start";
      }
      sendCommand(g_ws, command);
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
      sendCommand(g_ws, command);
   }

   document.getElementById('fileform').addEventListener('submit', upload);
   getPrograms();
   getSettings();

}

