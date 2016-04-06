// Imports
require('js-utility');
var ajax = require('ajax');
var UI = require('ui');
var Voice = require('ui/voice');
var Vector2 = require('vector2');
var WunderlistSDK = require('wunderlist-sdk');
var Settings = require('settings');

// Resources
var Images = {
   INBOX_ICON: "images/inbox_icon.png",
   FOLDER_ICON: "images/folder_icon.png",
   CHECK_ICON: "images/checklist_icon.png",
   SETTINGS_ICON: "images/settings_icon.png",
   ERROR_ICON: "images/error_icon.png",
   ACTION_COMPLETED_ICON: "images/action_completed_icon.png",
   COMPLETED_ICON: "images/completed_icon.png"
};

var Colors = {
   Black: "#000000",
   Blue: "#2B88D9",
   Red: "#DB4C3F",
   Green: "#65B01B",
   Yellow: "#E6B035"
};

// Constants
var DEBUG = true;
var MAX_TITLE_LENGTH_IN_DETAILS = 25; // maximum title length in detail card
var backendURL = "http://kirk-pebble.azurewebsites.net";

// Internal state
// Current list displayed. Used to go back after the user complete a task
var currentListMenu = null;


// show splash screen while loading Inbox
var splashWindow = new UI.Window();
var text = new UI.Text({
   position: new Vector2(0, 0),
   size: new Vector2(144, 168),
   text: "Loading Wunderlist data...",
   font: "GOTHIC_28_BOLD",
   color: "black",
   textOverflow: "wrap",
   textAlign: "center",
   backgroundColor: "white"
});
splashWindow.add(text);
splashWindow.show();

// manage Settings from Pebble app
Settings.config
(
   {
      url: backendURL + "/Wunderlist/Index"
   },
   function(e) {
      // webview opened
      console.log("settings opened");
   },
   function(e) {
      // webview closed
      console.log("settings closed (data: " + JSON.stringify(e.response) + " )");
      // check for a token. If one exists, we need to refresh internal data of WunderlistSDK
      var response = JSON.parse(e.response);
      if (response.token) {
         WunderlistSDK.refreshToken();
         startApp();
      }
   }
);

// check for saved token
function checkRequriedData() {
   var token = Settings.option("token");
   
   if (token || DEBUG){
      startApp();
   } else {
      splashWindow.hide();
      var errorCard = new UI.Card({
         banner: Images.SETTINGS_ICON,
         body: "Before start, we need a little configuration. Open Kirk's Settings in Pebble app."
      });
      errorCard.show();
   }
}
checkRequriedData();


// load main menu
function startApp() {
   WunderlistSDK.createMainMenu
      (
      function(menu) {
         // elaborate results
         // move Inbox as first item
         var inbox = WunderlistSDK.findInboxList(menu);
         inbox.isInbox = true;
         menu.removeElement(inbox);
         menu.unshift(inbox);

         // add create task item
         menu.unshift({ title: "Create a task..." });

         // display menu
         var items = menu.map(function(menuItem) {
            if (menuItem instanceof WunderlistSDK.Folder) {
               // folder
               return {
                  title: menuItem.folder.title,
                  icon: Images.FOLDER_ICON
               };
            } else if (menuItem instanceof WunderlistSDK.List) {
               // list
               return {
                  title: menuItem.list.title.capitalizeWord(),
                  icon: menuItem.isInbox ? Images.INBOX_ICON : Images.CHECK_ICON
               };
            } else {
               return menuItem;
            }
         });
         // create main menu
         var mainMenu = new UI.Menu({
            highlightBackgroundColor: Colors.Blue,
            highlightTextColor: Colors.Black,
            sections: [{
               items: items
            }]
         });
         splashWindow.hide();
         mainMenu.show();
         // attach event to handle selection
         mainMenu.on('select', function(e) {
            var menuItem = menu[e.itemIndex];
            if (menuItem instanceof WunderlistSDK.Folder) {
               displayListsForFolder(menuItem);
            } else if (menuItem instanceof WunderlistSDK.List) {
               displayList(menuItem.list);
            } else {
               var inbox = WunderlistSDK.findInboxList(menu);
               createTask(inbox.list.id);
            }
         });
      },
      errorHandler
      );
}

// Display all lists of a folder
function displayListsForFolder(folder) {
   var lists = folder.lists;
   var items = lists.map(function(list) {
      return {
         title: list.title,
         icon: Images.CHECK_ICON
      };
   });
   var folderMenu = new UI.Menu({
      highlightBackgroundColor: Colors.Blue,
      highlightTextColor: Colors.Black,
      sections: [{
         items: items
      }]
   });
   folderMenu.show();

   // attach event on list selection
   folderMenu.on('select', function(e) {
      var list = lists[e.itemIndex];
      displayList(list);
   });
}

// display all tasks of a list
function displayList(list) {
   WunderlistSDK.getTasksForList
      (
      list.id,
      function(tasks) {
         var menuItems = createMenuItemsForTasks(tasks);
         var tasksMenu = new UI.Menu({
            highlightBackgroundColor: Colors.Blue,
            highlightTextColor: Colors.Black,
            sections: [{
               title: "Inbox tasks",
               items: menuItems
            }]
         });
         tasksMenu.on('select', function(e) {
            var task = tasks[e.itemIndex];
            displayTaskDetails(task);
         });
         tasksMenu.show();
         // save current menu for future usage. 
         // Save also the list id (we need this information to reload tasks)
         currentListMenu = tasksMenu;
         currentListMenu.wund_ListId = list.id;
      },
      errorHandler
      );
}

function createMenuItemsForTasks(originalTasks) {
   // sort
   var tasks = originalTasks.sort(function(task1, task2) { return task1.title.localeCompare(task2.title) > 0; });
   // create menu
   var menuItems = tasks.map(function(task) {
      return { title: task.title };
   });
   return menuItems;
}

// create a new task (with dictation)
function createTask(listId) {
   Voice.dictate('start', false, function(e) {
      if (e.err) {
         errorHandler(e.err);
         return;
      }
      // create task in Inbox
      var dictation = e.transcription;
      WunderlistSDK.createTask
         (
         listId,
         dictation,
         function(createdTask) {
            // read task just created
            WunderlistSDK.getTask
               (
               createdTask.id,
               function(task) {
                  displayTaskDetails(task);
               },
               errorHandler
               );
         },
         errorHandler
         );
   });
}

// display task details into a Card
function displayTaskDetails(task) {
   var title = task.title;
   var body = task.note ? task.note : "";
   if (title.length > MAX_TITLE_LENGTH_IN_DETAILS) {
      title = title.substr(0, MAX_TITLE_LENGTH_IN_DETAILS - 3) + "...";
      body = task.title + "\n" + body;
   }

   var taskCard = new UI.Card({
      title: title,
      subtitle: task.due_date ? task.due_date : "",
      body: body,
      scrollable: true,
   });
   // first select display actions, the second one complete the task
   taskCard.on('click', 'select', function () {
      taskCard.action({select: "images/action_completed_icon.png"});
      taskCard.on('click', 'select', function () {
          completeTask(task);
         // hide detail card, user will go back to List
         taskCard.hide();
      });
   });
   taskCard.show();
}



// Complete a specific task
function completeTask(task) {
   WunderlistSDK.markTaskAsCompleted(
      task,
      function () {
         displayCompletedTask();
      },
      errorHandler);
}

// Display card to inform user that a specific task has marked as completed
function displayCompletedTask() {
   var card = new UI.Card({
      banner: Images.COMPLETED_ICON,
      body: " Task completed!"
   });
   card.show();
   // wait few seconds and go back to original list. 
   // Before that we need to reload all the tasks
   setTimeout(function () {
      // reload tasks
      var listId = currentListMenu.wund_ListId;
      WunderlistSDK.getTasksForList(listId, function (tasks) {
         var menuItems = createMenuItemsForTasks(tasks);
         currentListMenu.items(0, menuItems);
      });
      
      card.hide();
   }, 2000);
}

function errorHandler(error) {
   // log error
   var errorData = {
      timestamp: new Date(),
      error: JSON.stringify(error)
   };
   ajax(
      {
         url: backendURL + "/Log/Insert",
         type: 'json',
         method: "post",
         data: errorData
      },
      function () {
         // nope
      },
      function (error) {
         console.log("Error during logging error. No way.");
         console.log("Original error: " + JSON.stringify(error));
      }
   );
      
   var errorCard = new UI.Card({
      banner: Images.ERROR_ICON,
      body: "We are sorry, an error is occurred.\nWe are working to solve this issue!"
   });
   errorCard.show();
}