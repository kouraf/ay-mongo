const electron = require("electron");
const path = require("path");
const url = require("url");
const MongoClient = require("mongodb").MongoClient;
const fs = require("fs");
const json2mongo = require("json2mongo");

// SET ENV
process.env.NODE_ENV = "development";

const { app, BrowserWindow, Menu, ipcMain } = electron;

let mainWindow;

// Listen for app to be ready
app.on("ready", function () {
  // Create new window
  mainWindow = new BrowserWindow({
    height: 700,
  });
  // Load html in window
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "mainWindow.html"),
      protocol: "file:",
      slashes: true,
    })
  );
  mainWindow.webContents.toggleDevTools();
  // Quit app when closed
  mainWindow.on("closed", function () {
    app.quit();
  });

  // Build menu from template
  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
  // Insert menu
  Menu.setApplicationMenu(mainMenu);
});

// Catch item:add
ipcMain.on("populate", async function (e, data) {
  console.log("data : ", JSON.stringify(data, null, 2));
  try {
    const conn = await MongoClient.connect(data.url.toString(), {
      poolSize: 10,
      bufferMaxEntries: 0,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    if (!conn) throw "db not found!";

    const db = await conn.db(data.db);
    if (!db) throw "Oups! couldn't return your db";

    const jsonNotParsed = fs.readFileSync(data.jsonPath);
    const json = JSON.parse(jsonNotParsed);

    const documents = await db
      .collection(data.collection)
      .insertMany(json2mongo(json));
    if (!documents) throw "AYAYAY!, tkhelteeet couldn't add your documents";

    e.sender.send("populate-reply", { ok: 1 });
    conn.close();
  } catch (err) {
    console.log("Error : ", err);
    e.sender.send("populate-reply", { err });
    conn.close();
    throw err;
  }
});

// Create menu template
const mainMenuTemplate = [
  // Each object is a dropdown
  {
    label: "File",
    submenu: [
      {
        label: "Quit",
        accelerator: process.platform == "darwin" ? "Command+Q" : "Ctrl+Q",
        click() {
          app.quit();
        },
      },
    ],
  },
];

// If OSX, add empty object to menu
if (process.platform == "darwin") {
  mainMenuTemplate.unshift({});
}

// Add developer tools option if in dev
if (process.env.NODE_ENV !== "production") {
  mainMenuTemplate.push({
    label: "Developer Tools",
    submenu: [
      {
        role: "reload",
      },
      {
        label: "Toggle DevTools",
        accelerator: process.platform == "darwin" ? "Command+I" : "Ctrl+I",
        click(item, focusedWindow) {
          focusedWindow.toggleDevTools();
        },
      },
    ],
  });
}
