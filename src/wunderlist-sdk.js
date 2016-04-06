var ajax = require('ajax');
var Settings = require('settings');

// configurations
var requestHeaders  = { 
   "X-Access-Token"  :  Settings.option("token"), 
   "X-Client-ID"     :  "fb2763ae31dc03b8a2fe", 
   "Content-Type"    :  "application/json;" 
};

// API URLs
var APIURL = {
   Lists    :  "https://a.wunderlist.com/api/v1/lists",
   Folders  :  "https://a.wunderlist.com/api/v1/folders",
   Tasks    :  "https://a.wunderlist.com/api/v1/tasks",
   Notes    :  "https://a.wunderlist.com/api/v1/notes"
};

// Classes
var List = function (list) {
   this.isInbox = false;
   this.list = list;
};
var Folder = function (folder, lists) {
   this.folder = folder;
   this.lists = lists;
};

// Utility
function refreshToken(){
   var token = Settings.option("token");
   requestHeaders["X-Access-Token"] = token;
}

// Create main menu (folders and lists)
function createMainMenu(onSuccess, onError) {
   // retrieve all folders
   getFolders(
      function (folders) {
         getLists(
            // retrieve all lists
            function (lists) {
               var menu = [];               
               // for every folder, create a menu item with related lists
               folders.forEach(function(folder, index){
                  var listsForFolder = [];
                  folder.list_ids.forEach(function (listId) {
                     var list = lists.find(function (list) { return list.id == listId; });
                     listsForFolder.push(list);
                     lists = lists.removeElement(list);
                  });
                  var aFolder = new Folder(folder, listsForFolder);
                  menu.push(aFolder);
               });
               // add remaining lists
               lists.forEach(function (list) {
                  var aList = new List(list);
                  menu.push(aList);
               });               
               onSuccess(menu);
            },
            onError);
      },
      onError
   );
}

function getFolders(onSuccess, onError) {
   ajax(
        {
            url: APIURL.Folders,
            type: 'json',
            headers: requestHeaders
        },
        onSuccess, 
        onError
      );
}

function getLists(onSuccess, onError) {
    ajax(
        {
            url: APIURL.Lists,
            type: 'json',
            headers: requestHeaders
        },
        onSuccess, 
        onError
      );
}

// Returns all the tasks of a specific list
function getTasksForList(listId, onSuccess, onError){
  // get list of tasks  
  ajax(
    {
        url: APIURL.Tasks + "?list_id=" + listId,
        type: 'json',
        headers: requestHeaders
    },
    function (tasks) {
      // get notes for the list
      ajax(
        {
          url: APIURL.Notes + "?list_id=" + listId,
          type: 'json',
          headers: requestHeaders
        },
        function(notes){
          notes.forEach(function (note, index){
            var task = tasks.find(function(task){ return note.task_id == task.id; });
            if (task !== null){
              task.note = note.content;
            }
          });
          onSuccess(tasks);
        }, 
        onError
      );
    },
    onError
  );
}

function getTask(taskId, onSuccess, onError) {
  // get list of tasks  
  ajax(
    {
        url: APIURL.Tasks + "/" + taskId,
        type: 'json',
        headers: requestHeaders
    },
    onSuccess,
    onError
  ); 
}

// Create a new task
function createTask(listId, title, onSuccess, onError){
  var newTask = {
    list_id: listId,
    title: title,
    completed: false,
    starred: false
  };
  
  ajax(
    {
      url: APIURL.Tasks,
      type: 'json',
      headers: requestHeaders,
      method: "post",
      data: newTask
    },
    onSuccess,
    onError
  );
}

// Mark a task as completed
function markTaskAsCompleted(originalTask, onSuccess, onError) {
   var task = {
      revision: originalTask.revision,
      completed: true
   };
   ajax(
      {
         url: APIURL.Tasks + "/" + originalTask.id,
         type: 'json',
         headers: requestHeaders,
         method: 'patch',
         data: task
      },
      onSuccess,
      onError
   );
}

// Utility

function findInboxList(menuList){
   var inbox = menuList.filter(function (menuItem) {
      if ((menuItem instanceof List) && (menuItem.list.list_type == "inbox")){
         return true;
      }
      return false;
   });
   return inbox[0];
}

// Public APIs

module.exports.Folder = Folder;
module.exports.List = List;

module.exports.refreshToken = refreshToken;

module.exports.createMainMenu = createMainMenu;
module.exports.getFolders = getFolders;
module.exports.getLists = getLists;
module.exports.findInboxList = findInboxList;
module.exports.getTask = getTask
module.exports.getTasksForList = getTasksForList;
module.exports.createTask = createTask;
module.exports.markTaskAsCompleted = markTaskAsCompleted;