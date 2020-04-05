const { ipcRenderer } = require('electron')
console.log("ios", ipcRenderer)
window.ipcRenderer = ipcRenderer