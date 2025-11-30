var localUsername = "";
var TimeOuts = [];
var ping = 0;

const httpsRedirect = () => {
  if (location.protocol !== "https:")
    location.replace("https://" + location.href.split("//")[1]);
};

// httpsRedirect();

// messages
$(function () {
  // called when DOM is ready

  const socket = io("/hub", {
    forceNew: true,
    reconnection: true,
    reconnectionDelay: 3000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    // transports: ["websocket"],
    query: {
      // username:
    },
  });

  setInterval(() => {
    const start = Date.now();
    const pingObject = { start };
    socket.volatile.emit("chPing", pingObject);
  }, 3000);

  socket.on("ping", () => {
    console.log("ping");
  });

  socket.on("pong", () => {
    console.log("pong");
  });

  socket.on("chPingBack", (data) => {
    const tempPing = Date.now() - data.start;
    if (tempPing !== ping) {
      $("#ping").text("Ping: " + tempPing + " ms");
      ping = tempPing;
    }
  });

  socket.on("serverMessage", (data) => {
    let varname = Math.floor(Math.random() * 1000).toString();
    let element = document.getElementById("serverMessage");
    // if (element === null) {
    let messageList = document.getElementById("incoming-messages");
    messageDisplay(varname, messageList, data.message);
    TimeOuts[varname] = startMessageFade(varname);
    // } else {
    // clearTimeout(TimeOuts[data.header]);
    // TimeOuts[data.header] = startMessageFade(data.header);
    // return false;
    // }
    // OLD
    // let varname = "serverMessage";
    // messageDisplay(
    //   "serverMessage",
    //   "#incoming-messages",
    //   "Server: " + data.message
    // );
    // TimeOuts[varname] = startMessageFade(varname);
  });

  socket.on("event", (data) => {
    let varname = data.header;
    var element = document.getElementById(removeSlash(varname));
    if (element === null) {
      let messageList = document.getElementById("incoming-messages");
      // // let varname = "in-mess" + messageCount.toString();
      let varname = data.header;
      messageDisplay(varname, messageList, varname);
      TimeOuts[varname] = startMessageFade(varname);
    } else {
      clearTimeout(TimeOuts[data.header]);
      TimeOuts[data.header] = startMessageFade(data.header);
      return false;
    }
  });

  socket.on("control", (data) => {
    let varname = data.header;
    var element = document.getElementById(removeSlash(varname));

    // **********************
    if (element == null) {
      let messageList = document.getElementById("incoming-messages");

      messageDisplay(varname, messageList, data.header + " " + data.values);
      TimeOuts[varname] = startMessageFade(varname);
      return false;
    } else {
      // $("#" + data.header).text(data.header + " - " + data.values);
      appendMessageDisplay(varname, data.header + " - " + data.values);
      clearTimeout(TimeOuts[data.header]);
      TimeOuts[data.header] = startMessageFade(data.header);
      return false;
    }
  });

  socket.on("allControls", (data) => {
    // eliminate duplicate users
    var listNode = document.getElementById("allControlsList");
    while (listNode.lastElementChild) {
      var listNode = document.getElementById("allControlsList");
      listNode.removeChild(listNode.lastElementChild);
      listNode = document.getElementById("allControlsList");
    }
    // create list of users
    for (var i = 0; i < Object.keys(data.controls).length; i++) {
      $(listNode).append(
        $("<div>")
          .attr({ class: "listItem" })
          .append(
            $("<div>")
              .attr({ class: "listItemName" })
              .text(data.controls[i].header)
          )
      );
    }
    return false;
  });

  socket.on("allEvents", (data) => {
    // eliminate duplicate users
    var eventsListNode = document.getElementById("allEventsList");
    while (eventsListNode.lastElementChild) {
      var eventsListNode = document.getElementById("allEventsList");
      eventsListNode.removeChild(eventsListNode.lastElementChild);
      eventsListNode = document.getElementById("allEventsList");
    }
    // create list of users
    for (var i = 0; i < Object.keys(data.events).length; i++) {
      $(eventsListNode).append(
        $("<div>")
          .attr({ class: "listItem" })
          .append(
            $("<div>")
              .attr({ class: "listItemName" })
              .text(data.events[i].header)
          )
      );
    }
    return false;
  });

  socket.on("myUsername", (data) => {
    if (data.username !== null) {
      let usernameElement = document.getElementById("webUsername");
      usernameElement.innerHTML = data.username;
      return false;
    }
    return false;
  });

  socket.on("observedControls", (data) => {
    // eliminate duplicate users
    var listNode = document.getElementById("observedControlsList");
    while (listNode.lastElementChild) {
      listNode.removeChild(listNode.lastElementChild);
      listNode = document.getElementById("observedControlsList");
    }
    // create list of users
    for (var i = 0; i < Object.keys(data.controls).length; i++) {
      const header = data.controls[i].header;
      $("<div>")
        .attr({ class: "listItem flex flex-row items-center" })
        .prependTo(listNode)
        .append(
          $("<div>")
            .attr({ class: "listItemName px-2" })
            .append($("<div>").text(header))
        )
        .append(
          $("<div>")
            .attr({ class: "listItemButton" })
            .append(
              $("<button>")
                .text("Leave")
                .addClass(
                  "inline-flex items-center justify-center rounded-md bg-slate-700 px-2 py-1 text-xs font-medium text-slate-100 hover:bg-slate-600"
                )
            )
            .on("click", function () {
              let obj = {
                header: header,
              };
              socket.emit("unobserveControl", obj);
              // prevents page reloading
              return false;
            })
        );
    }
    return false;
  });

  socket.on("observedEvents", (data) => {
    // eliminate duplicate users
    var listNode = document.getElementById("observedEventsList");
    while (listNode.lastElementChild) {
      listNode.removeChild(listNode.lastElementChild);
      listNode = document.getElementById("observedEventsList");
    }
    // create list of users
    for (var i = 0; i < Object.keys(data.events).length; i++) {
      const header = data.events[i].header;
      $("<div>")
        .attr({ class: "listItem flex flex-row items-center" })
        .prependTo(listNode)
        .append(
          $("<div>")
            .attr({ class: "listItemName px-2" })
            .append($("<div>").text(header))
        )
        .append(
          $("<div>")
            .attr({ class: "listItemButton" })
            .append(
              $("<button>")
                .text("Leave")
                .addClass(
                  "inline-flex items-center justify-center rounded-md bg-slate-700 px-2 py-1 text-xs font-medium text-slate-100 hover:bg-slate-600"
                )
            )
            .on("click", function () {
              let obj = {
                header: header,
              };
              socket.emit("unobserveEvent", obj);
              // prevents page reloading
              return false;
            })
        );
    }
    return false;
  });

  socket.on("availableRoomsList", (data) => {
    // eliminate duplicate users
    var listNode = document.getElementById("availableRoomsList");
    while (listNode.lastElementChild) {
      listNode.removeChild(listNode.lastElementChild);
      listNode = document.getElementById("availableRoomsList");
    }
    // create list of users
    for (var i = 0; i < Object.keys(data.rooms).length; i++) {
      const room = data.rooms[i];
      $("<div>")
        .attr({ class: "listItem flex flex-row items-center" })
        .prependTo(listNode)
        .append(
          $("<div>")
            .attr({ class: "listItemName px-2" })
            .append($("<div>").text(room))
        )
        .append(
          $("<div>")
            .attr({ class: "listItemButton" })
            .append(
              $("<button>")
                .text("Join")
                .addClass(
                  "inline-flex items-center justify-center rounded-md bg-slate-700 px-2 py-1 text-xs font-medium text-slate-100 hover:bg-slate-600"
                )
            )
            .on("click", function () {
              let obj = {
                room: room,
              };
              socket.emit("joinRoom", obj);
              // prevents page reloading
              return false;
            })
        );
    }
    return false;
  });

  socket.on("availableControls", (data) => {
    // eliminate duplicate users
    var listNode = document.getElementById("availableControlsList");
    while (listNode.lastElementChild) {
      listNode.removeChild(listNode.lastElementChild);
      listNode = document.getElementById("availableControlsList");
    }
    // create list of users
    for (var i = 0; i < Object.keys(data.controls).length; i++) {
      const header = data.controls[i].header;
      $("<div>")
        .attr({ class: "listItem flex flex-row items-center" })
        .prependTo(listNode)
        .append(
          $("<div>")
            .attr({ class: "listItemName px-2" })
            .append($("<div>").text(header))
        )
        .append(
          $("<div>")
            .attr({ class: "listItemButton" })
            .append(
              $("<button>")
                .text("Observe")
                .addClass(
                  "inline-flex items-center justify-center rounded-md bg-slate-700 px-2 py-1 text-xs font-medium text-slate-100 hover:bg-slate-600"
                )
            )
            .on("click", function () {
              // prevents page reloading
              let obj = {
                header: header,
              };
              socket.emit("observeControl", obj);
              return false;
            })
        );
    }
  });

  socket.on("availableEvents", (data) => {
    // eliminate previous event items
    var listNode = document.getElementById("availableEventsList");
    while (listNode.lastElementChild) {
      listNode.removeChild(listNode.lastElementChild);
      listNode = document.getElementById("availableEventsList");
    }
    // create list of users
    for (var i = 0; i < Object.keys(data.events).length; i++) {
      // create list items
      const header = data.events[i].header;
      $("<div>")
        .attr({ class: "listItem flex flex-row items-center" })
        .prependTo(listNode)
        .append(
          $("<div>")
            .attr({ class: "listItemName px-2" })
            .append($("<div>").text(header))
        )
        .append(
          $("<div>")
            .attr({ class: "listItemButton" })
            .append(
              $("<button>")
                .text("Observe")
                .addClass(
                  "inline-flex items-center justify-center rounded-md bg-slate-700 px-2 py-1 text-xs font-medium text-slate-100 hover:bg-slate-600"
                )
            )
            .on("click", function () {
              // prevents page reloading
              let obj = {
                header: header,
              };
              socket.emit("observeEvent", obj);
              return false;
            })
        );
    }
    return false;
  });

  socket.on("allUsers", function (users) {
    // eliminate duplicate users
    const listNode = document.getElementById("usersList");
    if (!listNode) return false;

    while (listNode.lastElementChild) {
      listNode.removeChild(listNode.lastElementChild);
    }

    for (var i = 0; i < Object.keys(users.users).length; i++) {
      const header = users.users[i];
      $("<div>")
        .attr({ class: "listItem" })
        .prependTo(listNode)
        .append(
          $("<div>")
            .attr({ class: "listItemName" })
            .append($("<div>").text(header))
        );
    }
    return false;
  });

  socket.on("allRooms", function (data) {
    const listNode = document.getElementById("allRoomsList");
    if (!listNode) return false;

    while (listNode.lastElementChild) {
      listNode.removeChild(listNode.lastElementChild);
    }

    const roomKeys = data.rooms || {};
    console.log("roomKeys:", data.rooms);
    for (let i = 0; i < roomKeys.length; i++) {
      const roomName = roomKeys[i];
      // const usersInRoom = data.rooms[roomName] || [];

      $(listNode).append(
        $("<div>")
          .attr({ class: "listItem" })
          .append($("<div>").attr({ class: "listItemName" }).text(roomName))
      );
    }
    return false;
  });

  socket.on("myRoomsList", function (data) {
    // eliminate duplicate users
    const listNode = document.getElementById("myRoomsList");
    if (!listNode) return false;

    while (listNode.lastElementChild) {
      listNode.removeChild(listNode.lastElementChild);
    }

    for (var i = 0; i < Object.keys(data.rooms).length; i++) {
      const room = data.rooms[i];
      $("<div>")
        .attr({ class: "listItem flex flex-row items-center" })
        .prependTo(listNode)
        .append(
          $("<div>")
            .attr({ class: "listItemName px-2" })
            .append($("<div>").text(room))
        )
        .append(
          $("<div>")
            .attr({ class: "listItemButton" })
            .append(
              $("<button>")
                .text("Leave")
                .addClass(
                  "inline-flex items-center justify-center rounded-md bg-slate-700 px-2 py-1 text-xs font-medium text-slate-100 hover:bg-slate-600"
                )
            )
            .on("click", function () {
              let obj = {
                room: room,
              };
              socket.emit("leaveRoom", obj);
              // prevents page reloading
              return false;
            })
        );
    }
    return false;
  });

  socket.on("otherUsers", function (users) {
    // eliminate duplicate users
    const listNode = document.getElementById("otherUserList");
    if (!listNode) return false;

    while (listNode.lastElementChild) {
      listNode.removeChild(listNode.lastElementChild);
    }

    for (var i = 0; i < Object.keys(users.users).length; i++) {
      const header = users.users[i];
      $("<div>")
        .attr({ class: "listItem" })
        .prependTo(listNode)
        .append(
          $("<div>")
            .attr({ class: "listItemName" })
            .append($("<div>").text(header))
        );
    }
    return false;
  });

  socket.on("chat", function (data) {
    // eliminate duplicate users
    var chatListNode = document.getElementById("messages");
    while (chatListNode.lastElementChild) {
      chatListNode.removeChild(chatListNode.lastElementChild);
      chatListNode = document.getElementById("messages");
    }

    // form chat message 1. user 2. message
    // $("#messages").append($("<li>").text("User: " + data.id));
    // $("#messages").append($("<li>").text(data.chat));

    chatDisplay("#messages", data.id, data.chat);
    return false;
  });

  // interface functions
  $("#event-button1").click(function () {
    let eventObj = {
      header: $("#event-button1").val(),
      mode: "publish",
      target: "all",
    };
    socket.emit("event", eventObj);
    return false; // false does not reload the page
  });

  $("#event-button2").click(function () {
    let eventObj = {
      header: $("#event-button2").val(),
      mode: "publish",
      target: "123",
    };
    socket.emit("event", eventObj);
    return false; // false does not reload the page
  });

  $("#event-button3").click(function () {
    let eventObj = {
      header: $("#event-button3").val(),
      mode: "push",
      target: "all",
    };
    socket.emit("event", eventObj);
    return false; // false does not reload the page
  });

  $("#event-button4").click(function () {
    let eventObj = {
      header: $("#event-button4").val(),
      mode: "push",
      target: "123",
    };
    socket.emit("event", eventObj);
    return false; // false does not reload the page
  });

  //

  $("#event-button1-text").change("input", function () {
    var val = $("#event-button1-text").val();

    val = val.replace(/\s+/g, "");
    $("#event-button1").html(`event ${val}`);
    $("#event-button1").val(val);
    $("#event-button1-text")
      .attr("placeholder", "Change Header")
      .val("")
      .focus()
      .blur();
    return false;
  });

  $("#event-button2-text").change("input", function () {
    var val = $("#event-button2-text").val();
    val = val.replace(/\s+/g, "");
    $("#event-button2").html(`event ${val}`);
    $("#event-button2").val(val);
    $("#event-button2-text")
      .attr("placeholder", "Change Header")
      .val("")
      .focus()
      .blur();
    return false;
  });

  $("#event-button3-text").change("input", function () {
    var val = $("#event-button3-text").val();
    val = val.replace(/\s+/g, "");
    $("#event-button3").html(`event ${val}`);
    $("#event-button3").val(val);
    $("#event-button3-text")
      .attr("placeholder", "Change Header")
      .val("")
      .focus()
      .blur();
    return false;
  });

  $("#event-button4-text").change("input", function () {
    var val = $("#event-button4-text").val();
    val = val.replace(/\s+/g, "");
    $("#event-button4").html(`event ${val}`);
    $("#event-button4").val(val);
    $("#event-button4-text")
      .attr("placeholder", "Change Header")
      .val("")
      .focus()
      .blur();
    return false;
  });

  //
  $("#control-webSlider1-text").change("input", function () {
    var val = $("#control-webSlider1-text").val();
    var num = $("#control-webSlider3").val();
    val = val.replace(/\s+/g, "");
    $("#slider1-label").html(`control ${val} ${num}`);
    $("#slider1").val(val);
    $("#control-webSlider1").attr("header", val);
    $("#control-webSlider1-text")
      .attr("placeholder", "Change Header")
      .val("")
      .focus()
      .blur();
    return false;
  });

  $("#control-webSlider2-text").change("input", function () {
    var val = $("#control-webSlider2-text").val();
    var num = $("#control-webSlider2").val();
    val = val.replace(/\s+/g, "");
    $("#slider2-label").html(`control ${val} ${num}`);
    $("#slider2").val(val);
    $("#control-webSlider2").attr("header", val);
    $("#control-webSlider2-text")
      .attr("placeholder", "Change Header")
      .val("")
      .focus()
      .blur();
    return false;
  });

  $("#control-webSlider3-text").change("input", function () {
    var val = $("#control-webSlider3-text").val();
    var num = $("#control-webSlider3").val();
    val = val.replace(/\s+/g, "");
    $("#slider3-label").html(`control ${val} ${num}`);
    $("#slider3").val(val);
    $("#control-webSlider3").attr("header", val);
    $("#control-webSlider3-text")
      .attr("placeholder", "Change Header")
      .val("")
      .focus()
      .blur();
    return false;
  });

  $("#control-webSlider4-text").change("input", function () {
    var val = $("#control-webSlider4-text").val();
    var num = $("#control-webSlider4").val();
    val = val.replace(/\s+/g, "");
    $("#slider4-label").html(`control ${val} ${num}`);
    $("#slider4").val(val);
    $("#control-webSlider4").attr("header", val);
    $("#control-webSlider4-text")
      .attr("placeholder", "Change Header")
      .val("")
      .focus()
      .blur();
    return false;
  });

  //
  $("#control-webSlider1").on("input", function () {
    var val = Number($("#control-webSlider1").val());
    var header = $("#control-webSlider1").attr("header");
    $("#slider1-label").text(`control ${header} ${val}`);
    socket.emit("control", {
      header: header,
      values: val,
      mode: "publish",
      target: "all",
    });
    return false; // false does not reload the page
  });

  $("#control-webSlider2").on("input", function () {
    var val = Number($("#control-webSlider2").val());
    var header = $("#control-webSlider2").attr("header");
    $("#slider2-label").text(`control ${header} ${val}`);
    socket.emit("control", {
      header: header,
      values: val,
      mode: "publish",
      target: "all",
    });
    return false; // false does not reload the page
  });

  $("#control-webSlider3").on("input", function () {
    var val = Number($("#control-webSlider3").val());
    var header = $("#control-webSlider3").attr("header");
    $("#slider3-label").text(`control ${header} ${val}`);
    socket.emit("control", {
      header: header,
      values: val,
      mode: "push",
      target: "all",
    });
    return false; // false does not reload the page
  });

  $("#control-webSlider4").on("input", function () {
    var val = Number($("#control-webSlider4").val());
    var header = $("#control-webSlider4").attr("header");
    $("#slider4-label").text(`control ${header} ${val}`);
    socket.emit("control", {
      header: header,
      values: val,
      mode: "push",
      target: "123",
    });
    return false; // false does not reload the page
  });

  // change Username
  $("#username-text").change("input", function () {
    var val = $("#username-text").val();
    val = val.replace(/\s+/g, "");
    // document.getElementById("webUsername").innerHTML = val;
    // localUsername = val; // ignore 'optimistic' name change until server confirms

    let usernameObject = {
      username: val,
    };

    socket.emit("addUsername", usernameObject);

    $("#webUsername").val(val);
    $("#username-text")
      .attr("placeholder", "Change Username")
      .val("")
      .focus()
      .blur();
    return false;
  });

  // join room form
  $("#join-room-form").submit(function (e) {
    e.preventDefault();
    const roomVal = ($("#j").val() || "").toString().trim();
    if (!roomVal) return false;

    const roomObject = { room: roomVal };
    socket.emit("joinRoom", roomObject);
    $("#j").val("");
    return false;
  });

  // chat form
  $("#chat-form").submit(function (e) {
    e.preventDefault();
    const chatVal = ($("#m").val() || "").toString().trim();
    const targetVal = ($("#target-text").val() || "").toString().trim();

    if (!chatVal || !targetVal) {
      return false;
    }

    const chatObject = {
      chat: chatVal,
      target: targetVal,
    };
    socket.emit("chat", chatObject);
    $("#m").val("");
    $("#target-text").val("");
    return false;
  });

  // observe control
  $("#observe-control-form").submit(function (e) {
    e.preventDefault(); // prevents page reloading
    let obj = {
      header: $("#oc").val(),
    };
    socket.emit("observeControl", obj);
    $("#oc").val("");
    return false;
  });

  // unobserve control
  $("#unobserve-control-form").submit(function (e) {
    e.preventDefault(); // prevents page reloading
    let obj = {
      header: $("#uc").val(),
    };
    socket.emit("unobserveControl", obj);
    $("#uc").val("");
    return false;
  });

  // observe event
  $("#observe-event-form").submit(function (e) {
    e.preventDefault(); // prevents page reloading
    let obj = {
      header: $("#oe").val(),
    };
    socket.emit("observeEvent", obj);
    $("#oe").val("");
    return false;
  });

  // unobserve control
  $("#unobserve-event-form").submit(function (e) {
    e.preventDefault(); // prevents page reloading
    let obj = {
      header: $("#ue").val(),
    };
    socket.emit("unobserveEvent", obj);
    $("#ue").val("");
    return false;
  });

  $("#oact").click(function () {
    let eventObj = {
      observe: true,
    };
    socket.emit("observeAllControl", eventObj);
    return false; // false does not reload the page
  });

  $("#oacf").click(function () {
    let eventObj = {
      observe: false,
    };
    socket.emit("observeAllControl", eventObj);
    return false; // false does not reload the page
  });

  // observe all events
  $("#oaet").click(function () {
    let eventObj = {
      observe: true,
    };
    socket.emit("observeAllEvents", eventObj);
    return false; // false does not reload the page
  });

  $("#oaef").click(function () {
    let eventObj = {
      observe: false,
    };
    socket.emit("observeAllEvents", eventObj);
    return false; // false does not reload the page
  });

  //

  const startMessageFade = (listItemId) => {
    // $("#"+listItemId).stop().fadeIn(10).delay( 1800 ).fadeOut( 400 );
    let toVar = setTimeout(messageFade, 3000, listItemId);
    return toVar;
  };

  const messageFade = (listItemId) => {
    const listItem = $("#" + removeSlash(listItemId));
    listItem.fadeOut(300, () => listItem.remove());
    // listItem.fadeOut(300).delay(300).remove();
    return false;
  };

  const messageDisplay = (id, prependTo, text) => {
    id = removeSlash(id);
    $("<div>")
      .attr({ id: id, class: "listItem" })
      .prependTo($(prependTo))
      .append(
        $("<div>").attr({ id: "text", class: "listItemName" }).text(text)
      );
    const listItem = $("#" + id);
    listItem.hide().fadeIn(1000);
    return false;
  };

  const appendMessageDisplay = (id, text) => {
    id = removeSlash(id);
    $("#" + id)
      .find("#text")
      .text(text);
    // $("#"+id).show(2000).delay(1800).fadeOut( 400 );
    return false;
  };

  const chatDisplay = (prependTo, id, text) => {
    $("<div>")
      .attr({ id: id, class: "chatContainer" })
      .prependTo($(prependTo))
      .append(
        $("<div>")
          .attr({ id: "chatid", class: "chatid" })
          .html("<strong>" + id + ":</strong>")
      )
      .append(
        $("<div>")
          .attr({ id: "text", class: "chattext" })
          .text(" " + text)
      );
    const listItem = $("#" + id);
    listItem.hide().fadeIn(1000);
    return false;
  };

  const removeSlash = (str) => {
    if (typeof str !== "string") {
      console.log("removeSlash expected string, got:", typeof str);
      return "";
    }
    if (!str.length) return "";
    return str.replace(/\//g, "");
  };
});
