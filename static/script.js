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
var g_settings = {};
var g_prog = {};

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


/**
   * @brief  Connect to the WebSocket server
   * @param  None
   * @return {WebSocket} The WebSocket connection
   */
function connect() {
   ws = new WebSocket('ws://' + location.host + '/ws');
   ws.onopen = function() {
      console.log('Socket is open');
      setStatus("Connected", "green");
   };

   ws.onmessage = function(e) {
      try {
         const status = JSON.parse(e.data);
         state = new ControllerState(status);
         updateReadings(state);
      }
      catch {
         console.log(e.data)
         const log = document.getElementById("log");
         const level = e.data.split(" ")[0];
         var color = "black";
         switch (level) {
            case "INFO":
               color = "green";
               break;
            case "WARNING":
               color = "orange";
               break;
            case "ERROR":
               color = "red";
               break;
            default:
               color = "black";
         }
         const span = document.createElement("span");
         span.innerHTML = e.data
         span.style.color = color;
         log.appendChild(span);
         log.appendChild(document.createElement("br"));
         const autoscroll = document.getElementById("autoscroll").checked;
         if (autoscroll) {
            log.scrollTop = log.scrollHeight;
         }
      }
   };

   ws.onclose = function(e) {
      console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
      setTimeout(function() {
         g_ws = connect();
      }, 1000);
      setStatus("Disconnected", "red");
   };

   ws.onerror = function(err) {
      console.log('Socket encountered error: ' + err.message);
      setStatus("Error: " + err.message, "red");
      ws.close();
   };

   return ws;
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

   Plotly.redraw('canvas');
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

   Plotly.redraw('canvas');
   onResize();

}

/**
   * @brief  Round a number to a specified number of decimal places
   * @param {number} value: The number to round
   * @param {number} decimals: The number of decimal places to round to
   * @return {number} The rounded number
   */
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

   const runtimeString = toTime(status.runtime);
   document.getElementById("runtime").innerHTML = `Runtime: ${runtimeString}`;

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
   const canvas = document.getElementById("canvas");
   const table = document.getElementById("livetable");
   const availableHeight = window.innerHeight - canvas.offsetTop;
   const tableHeight = table.offsetHeight;
   var canvasHeight = availableHeight - tableHeight;
   if (canvasHeight / availableHeight < 0.5) {
      canvasHeight = availableHeight / 2;
   }
   canvas.style.height = canvasHeight + "px";
   Plotly.Plots.resize('canvas');
   Plotly.Plots.resize('proggraph');

   const log = document.getElementById("log");
   const logHeight = window.innerHeight - log.offsetTop - 40;
   log.style.height = logHeight + "px";
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
         setStatus("Error loading program", "red");
         select.selectedIndex = 0;
      });
}

/**
   * @brief  Set the setpoint
   * @param  None
   * @return None
   */
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
   * @brief  Delete a file from the server
   * @param  {string} path: The path to the file
   * @return None
   */
function deleteFile(path) {
   const url = '/delete';
   fetch(url, {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: path }),
   }).then(data => {
      console.log(data);
   }).catch(error => {
      console.error('Error deleting file:', error);
   });
}

/**
   * @brief  Create a new program
   * @param  {string} name: The name of the program
   * @param  {object} instructions: The program data
   * @return None
   */
function createProgram(name, instructions = []) {
   var filename = name
   if (!filename.endsWith(".json")) {
      filename += ".json";
   }
   console.log(`Creating program: '${filename}'`, instructions);
   const data = { name: filename, instructions: instructions };
   const file = new File([JSON.stringify(data)], filename, { type: 'application/json' });
   fileUploader(file, "prog/" + filename);
   getPrograms();
}

/**
   * @brief  Create a new program row
   * @param  {number} temp: The temperature
   * @param  {number} duration: The duration
   * @param  {number} time: The time
   * @return {HTMLElement} The program row element
   */
function createProgramRow(temp, duration, time) {

   const row = document.createElement("tr");
   row.draggable = true;
   var cell = null;
   var input = null;

   cell = document.createElement("td");
   const deleteButton = document.createElement("button");
   deleteButton.innerHTML = "❌";
   deleteButton.className = "icon";
   deleteButton.onclick = (ev) => {
      const index = ev.target.parentElement.parentElement.rowIndex;
      console.log("Deleting program row: " + index);
      const confirmDelete = confirm("Are you sure you want to delete the program row " + index + "?");
      if (confirmDelete) {
         document.getElementById("progtable").deleteRow(index);
      }
   };
   cell.appendChild(deleteButton);
   row.appendChild(cell);

   cell = document.createElement("td");
   input = document.createElement("input");
   input.type = "number";
   input.value = temp;
   input.onchange = recomputeProgram;
   input.min = 0;
   input.step = 1;
   cell.appendChild(input);
   cell.appendChild(document.createTextNode("°C"));
   row.appendChild(cell);

   cell = document.createElement("td");
   input = document.createElement("input");
   input.type = "number";
   input.value = duration;
   input.onchange = recomputeProgram;
   input.min = 0;
   input.step = 1;
   cell.appendChild(input);
   row.appendChild(cell);

   cell = document.createElement("td");
   cell.innerHTML = toTime(time);
   row.appendChild(cell);

   row.appendChild(cell);

   return row;
}

/**
   * @brief  Create the program table
   * @param  {object} prog: The program object
   * @return None
   */
function createProgramTable(prog) {
   const table = document.getElementById("progtable");
   table.innerHTML = "";
   table.className = "dragtable";
   const header = document.createElement("thead");
   const headerRow = document.createElement("tr");
   const columns = ["", "Temperature", "Duration", "Time"];
   for (const col of columns) {
      const th = document.createElement("th");
      th.innerHTML = col;
      headerRow.appendChild(th);
   }
   header.appendChild(headerRow);
   table.appendChild(header);
   const body = document.createElement("tbody");
   for (var i = 0; i < prog.instructions.length; i++) {
      const instruction = prog.instructions[i];

      if (instruction.duration == undefined) {
         var duration = instruction.time;
         if (i > 0) {
            duration = instruction.time - prog.instructions[i - 1].time;
         }
         instruction.duration = duration;
      }

      const row = createProgramRow(instruction.temp, instruction.duration, instruction.time);
      body.appendChild(row);
   }
   table.appendChild(body);

   const tableBodyRow = Array.from(table.children[1].children);
   Array.from(table.children[0].children[0].children).forEach(function(header, index) {
      new ResizeObserver(function() {
         tableBodyRow.forEach(function(cell) {
            cell.children[index].style.width = header.offsetWidth + 'px'
         })
      }).observe(header)
   });

   tableBodyRow.forEach(function(cell) {
      cell.addEventListener('dragstart', function() {
         cell.classList.add('dragging')
      })
      cell.addEventListener('dragend', function() {
         cell.classList.remove('dragging')
      })
   });
   body.addEventListener('dragover', function(e) {
      e.preventDefault()
      const newElement = body.querySelector('.dragging')
      const refElement = Array.from(body.children).find(function(item) {
         const bound = item.getBoundingClientRect()
         return e.clientY <= bound.y + bound.height / 2
      })
      body.insertBefore(newElement, refElement)
   });
   body.addEventListener('dragend', recomputeProgram);

   const addButton = document.getElementById("progaddrow");
   addButton.onclick = () => {
      const row = createProgramRow(0, 0, 0);
      body.appendChild(row);
      row.children[1].children[0].focus();
      recomputeProgram();
   }

   const saveButton = document.getElementById("progsave");
   saveButton.onclick = () => {
      const name = prompt("Enter program name", prog.name);
      createProgram(name, g_prog.instructions);
   }
}

/**
   * @brief  Recompute the program
   * @param {Event} ev: The event
   * @return None
   */
function recomputeProgram(_) {
   const body = document.getElementById("progtable").children[1];
   const instructions = [];
   var time = 0;
   for (var i = 0; i < body.children.length; i++) {
      const row = body.children[i];
      const temp = parseFloat(row.children[1].children[0].value);
      const duration = parseInt(row.children[2].children[0].value);
      time += duration;
      row.children[3].innerHTML = toTime(time);
      instructions.push({ temp: temp, duration: duration, time: time });
   }
   g_prog.instructions = instructions;
   plotProgram(instructions);

};

/**
   * @brief  Convert time to string
   * @param  {number} time: The time in seconds
   * @return None
   */
function toTime(time) {
   const hours = String(Math.floor(time / 3600)).padStart(2, '0');
   const minutes = String(Math.floor((time % 3600) / 60)).padStart(2, '0');
   const seconds = String(Math.floor(time % 60)).padStart(2, '0');
   return `${hours}:${minutes}:${seconds}`;
}

/**
   * @brief  Plot the program
   * @param  {Array} instructions: The list of instructions
   * @return None
   */
function plotProgram(instructions) {
   const x = [];
   const y = [];
   const labels = [];
   for (const instruction of instructions) {
      x.push(instruction.time);
      y.push(instruction.temp);
      labels.push(toTime(instruction.time));
   }
   const traces = [{
      name: 'Program',
      x: x,
      y: y,
      mode: 'lines',
      line: { color: '#4934ec' }
   }];
   Plotly.newPlot('proggraph', traces, {
      autosize: true,
      margin: { t: 20, b: 40, l: 40, r: 40 },
      legend: { x: 0, y: 1, traceorder: 'normal', font: { size: 16 } },
      yaxis: {
         automargin: true,
         ticksuffix: '°C',
         side: 'left',
      },
      xaxis: {
         automargin: true,
         side: 'bottom',
         tickvals: x,
         ticktext: labels,
         visible: true,
      },
   }, { responsive: true });
}

/**
   * @brief  Generate an editable program
   * @param  {string} name: The name of the program
   * @return None
   */
function generateEditableProgram(name) {
   const url = '/prog/' + name;
   fetch(url)
      .then(response => response.json())
      .then(data => {
         console.log(data);
         createProgramTable(data);
         plotProgram(data.instructions);
      })
      .catch(error => {
         console.error('Error fetching program:', error);
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

      const editButton = document.createElement("button");
      editButton.className = "icon";
      editButton.innerHTML = "✏️";
      editButton.onclick = () => {
         console.log("Editing program: " + program);
         generateEditableProgram(program);
      };


      const downloadButton = document.createElement("a");
      downloadButton.className = "icon";
      downloadButton.innerHTML = "💾";
      downloadButton.href = "/prog/" + program;
      downloadButton.download = program;

      const deleteButton = document.createElement("button");
      deleteButton.innerHTML = "❌";
      deleteButton.className = "icon";
      deleteButton.onclick = () => {
         console.log("Deleting program: " + program);
         const confirmDelete = confirm("Are you sure you want to delete the program '" + program + "'?");
         if (confirmDelete) {
            deleteFile('prog/' + program);
            getPrograms();
         }
      };

      var cell = document.createElement("td");
      cell.appendChild(editButton);
      row.appendChild(cell);

      cell = document.createElement("td");
      cell.appendChild(downloadButton);
      row.appendChild(cell);

      cell = document.createElement("td");
      cell.appendChild(deleteButton);
      row.appendChild(cell);

      cell = document.createElement("td");
      cell.innerHTML = program;
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
async function uploadProg(ev) {
   ev.preventDefault();
   const file = document.getElementById('file').files[0];
   if (!file) {
      return;
   }
   fileUploader(file, "prog/" + file.name);
   getPrograms();
}

/**
   * @brief  Traverse the file tree
   * @param  {FileSystemEntry} entry: The file system entry
   * @param  {string} path: The path to the file
   * @param  {function} cb: The callback function
   * @return None
   */
function traverseFileTree(entry, path = "", cb) {
   path = path || "";
   if (entry.isFile) {
      // Get file contents
      entry.file(function(file) {
         cb(file, entry.fullPath);
      });
   } else if (entry.isDirectory) {
      // Get folder contents
      var dirReader = entry.createReader();
      dirReader.readEntries(function(entries) {
         for (entry of entries) {
            traverseFileTree(entry, path + entry.name + "/", cb);
         }
      });
   }
}

/**
   * @brief  Upload a file to the server
   * @param  {File} file: The file to upload
   * @param  {string} path: The path to the file
   * @return None
   */
function fileUploader(file, path = file.name) {
   const url = '/upload';
   fetch(url, {
      method: 'POST',
      body: file,
      headers: {
         'Content-Type': 'application/octet-stream',
         'Content-Disposition': `attachment; filename="${path}"`,
      },
   }).then(res => {
      if (res.ok) {
         setStatus("File uploaded", "green");
      } else {
         setStatus("Error uploading file", "red");
      }
   }).catch(error => {
      console.error('Error uploading file:', error);
      setStatus("Error uploading file", "red");
   });
}

/**
   * @brief  Drop event handler
   * @param  {Event} ev: The event
   * @return None
   */
function dropHandler(ev) {
   // Prevent default behavior (Prevent file from being opened)
   ev.preventDefault();

   var items = ev.dataTransfer.items;
   for (item of items) {
      const entry = item.webkitGetAsEntry();
      if (entry) {
         traverseFileTree(entry, "", (file, path) => {
            const size = Math.round(file.size / 1024, 2);
            console.log(`Uploading ${file.name}(${size}kb) to ${path}`);
            if (file.size > g_settings.ui.MaxContentLengthInKB * 1024) {
               console.log(`File too big: ${file.name}(${size}kb)`);
               alert(`File '${path}' too big (${size}kb)\nMax size: ${g_settings.ui.MaxContentLengthInKB}kb\nAdjust Settings.`);
               return;
            }
            fileUploader(file, path);
         });
      }
   }
}


/**
   * @brief  Create a setting field
   * @param  {string} group: The setting group
   * @param  {string} key: The setting key
   * @param  {string|number|boolean} value: The setting value
   * @return {HTMLElement} The setting field element
   */
function createSettingField(group, key, value) {
   const row = document.createElement("tr");
   const label = document.createElement("label");
   label.innerHTML = key;
   const id = group + "_" + key;
   label.setAttribute("for", id);
   const input = document.createElement("input");
   input.name = key;
   input.id = id;
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
   if (key === "PASSWORD") {
      input.type = "password";
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
      table.appendChild(createSettingField(name, key, data[key]));
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
   const url = '/settings.json';
   console.log("Fetching settings");
   fetch(url)
      .then(response => response.json())
      .then(data => {
         console.log("Settings received", data);
         g_settings = data;
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
         form.style.display = "flex";
         form.style.flexWrap = "wrap";

         for (const [name, values] of Object.entries(data)) {
            const group = createSettingGroup(name, values);
            form.appendChild(group);
         }

         settings.appendChild(form);
      })
      .catch(error => {
         console.error('Error fetching programs:', error);
         setStatus("Error fetching settings", "red");
      });
}

/**
   * @brief  Set the status message
   * @param  {string} str: The status message
   * @param  {string} color: The color of the message
   * @return None
   */
function setStatus(str, color = "black") {
   const status = document.getElementById("status");
   status.innerHTML = str;
   status.style.display = "block";
   status.style.color = color;
   setTimeout(() => {
      status.style.display = "none";
   }, 3000);
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
         case "password":
            value = p.value;
            break;
         default:
            console.log(`Unknown type: '${p.type}'`);
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
   fileUploader(new Blob([JSON.stringify(data)], { type: 'application/json' }), 'settings.json');

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

   updateReadings(state);
   onResize();

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

   document.getElementById('fileform').addEventListener('submit', uploadProg);
   getPrograms();
   getSettings();
   createProgramTable({ name: "program.json", instructions: [] });
   plotProgram([]);


   const filedropper = document.getElementById("filedropper");
   filedropper.ondrop = dropHandler;
   filedropper.ondragover = (e) => {
      e.preventDefault();
   }

}

