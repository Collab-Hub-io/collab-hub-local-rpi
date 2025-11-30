// interface designer for Collab Hub - Nick Hwang 2025 - nickthwang@gmail.com
(function () {
  var widgetCounter = 0;
  var widgets = [];

  var localUsername = "";

  var socket = io("/hub", {
    forceNew: true,
    reconnection: true,
    reconnectionDelay: 3000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    // transports: ["websocket"],
  });

  var TimeOuts = [];
  var ping = 0;

  // rate limit for outgoing control messages (slider, XY pad, etc.)
  var lastControlSend = 0;
  var controlRateLimit = 50; // ms, can be increased via setRateLimit control

  function canSendControlNow() {
    var now = Date.now();
    if (now - lastControlSend < controlRateLimit) {
      return false;
    }
    lastControlSend = now;
    return true;
  }

  function createId(prefix) {
    widgetCounter += 1;
    return prefix + "-" + widgetCounter;
  }

  function addEventWidget() {
    var id = createId("event");
    widgets.push({
      id: id,
      type: "event",
      widgetName: "Event " + widgetCounter,
      header: "webEvent" + widgetCounter,
      target: "all",
      mode: "push",
      width: "full",
      color: "slate",
    });
    renderWidgets();
  }

  function addControlWidget() {
    var id = createId("control");
    widgets.push({
      id: id,
      type: "control",
      widgetName: "Control " + widgetCounter,
      header: "webSlider" + widgetCounter,
      target: "all",
      mode: "push",
      min: 0,
      max: 127,
      value: 64,
      width: "full",
      color: "slate",
    });
    renderWidgets();
  }

  function addXYPadWidget() {
    var id = createId("xypad");
    widgets.push({
      id: id,
      type: "xypad",
      widgetName: "XY Pad " + widgetCounter,
      header: "xySlider" + widgetCounter,
      target: "all",
      mode: "push",
      x: 0.5,
      y: 0.5,
      xMul: 1,
      yMul: 1,
      width: "full",
      color: "slate",
    });
    renderWidgets();
  }

  function removeWidget(id) {
    widgets = widgets.filter(function (w) {
      return w.id !== id;
    });
    renderWidgets();
  }

  function sendEvent(widget) {
    if (!socket || !widget.header) return;
    socket.emit("event", {
      header: widget.header,
      mode: widget.mode || "push",
      target: widget.target || "all",
    });
  }

  function sendControl(widget, value) {
    if (!socket || !widget.header) return;
    if (!canSendControlNow()) return;
    socket.emit("control", {
      header: widget.header,
      values: Number(value),
      mode: widget.mode || "push",
      target: widget.target || "all",
    });
  }

  // ---- Messages / chat helpers (adapted from ch-web.js) ----
  function startMessageFade(listItemId) {
    return setTimeout(messageFade, 3000, listItemId);
  }

  function messageFade(listItemId) {
    var el = document.getElementById(removeSlash(listItemId));
    if (!el) return false;
    if (window.jQuery) {
      jQuery(el).fadeOut(300, function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
    } else {
      el.style.transition = "opacity 0.3s";
      el.style.opacity = "0";
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 300);
    }
    return false;
  }

  function messageDisplay(id, prependToNode, text) {
    id = removeSlash(id);
    var container = document.createElement("div");
    container.id = id;
    container.className = "listItem";

    var inner = document.createElement("div");
    inner.id = "text";
    inner.className = "listItemName";
    inner.textContent = text;

    container.appendChild(inner);
    prependToNode.insertBefore(container, prependToNode.firstChild);

    // Truncate to a reasonable maximum number of items
    var maxItems = 50;
    while (prependToNode.children.length > maxItems) {
      prependToNode.removeChild(prependToNode.lastElementChild);
    }

    if (window.jQuery) {
      jQuery(container).hide().fadeIn(1000);
    }
    return false;
  }

  function chatDisplay(prependToSelector, id, text) {
    var prependTo = document.querySelector(prependToSelector);
    if (!prependTo) return false;

    var container = document.createElement("div");
    container.id = id;
    container.className = "chatContainer";

    var idDiv = document.createElement("div");
    idDiv.id = "chatid";
    idDiv.className = "chatid";
    idDiv.innerHTML = "<strong>" + id + ":</strong>";

    var textDiv = document.createElement("div");
    textDiv.id = "text";
    textDiv.className = "chattext";
    textDiv.textContent = " " + text;

    container.appendChild(idDiv);
    container.appendChild(textDiv);
    prependTo.insertBefore(container, prependTo.firstChild);

    // Truncate chat history to a reasonable maximum
    var maxItems = 100;
    while (prependTo.children.length > maxItems) {
      prependTo.removeChild(prependTo.lastElementChild);
    }

    if (window.jQuery) {
      jQuery(container).hide().fadeIn(1000);
    }
    return false;
  }

  function removeSlash(str) {
    if (typeof str !== "string") return "";
    if (!str.length) return "";
    return str.replace(/\//g, "");
  }

  function renderWidgets() {
    var canvas = document.getElementById("designer-canvas");
    if (!canvas) return;
    canvas.innerHTML = "";

    var isNarrow = window.innerWidth <= 640; // match Tailwind sm breakpoint

    widgets.forEach(function (widget) {
      var wrapper = document.createElement("div");
      var colorClass = "bg-slate-800 border-slate-700";
      if (widget.color === "emerald") {
        colorClass = "bg-emerald-900/40 border-emerald-600";
      } else if (widget.color === "blue") {
        colorClass = "bg-blue-900/40 border-blue-600";
      } else if (widget.color === "violet") {
        colorClass = "bg-violet-900/40 border-violet-600";
      }

      var baseWrapperClass =
        colorClass + " border rounded-lg p-3 flex flex-col gap-2 text-xs";
      var widthClass = widget.width === "half" ? "" : " md:col-span-2";
      wrapper.className = baseWrapperClass + widthClass;
      wrapper.setAttribute("data-widget-id", widget.id);

      // Row 1: handle + (on narrow) move arrows, name, minimal controls (delete always top-right)
      var row1 = document.createElement("div");
      row1.className = "flex items-center gap-2";

      var dragHandle = document.createElement("button");
      dragHandle.type = "button";
      dragHandle.className =
        "designer-drag-handle inline-flex items-center justify-center rounded-md border border-slate-600 px-2 py-1 text-slate-300 text-[10px] bg-slate-900/70" +
        (isNarrow ? "" : " cursor-move");
      dragHandle.textContent = "≡";
      dragHandle.title = "Drag to reorder (on larger screens)";

      var nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = widget.widgetName || "";
      nameInput.className =
        (isNarrow ? "max-w-[7rem]" : "flex-1") +
        " rounded-md border border-slate-600 bg-slate-900/70 px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500";
      nameInput.addEventListener("input", function () {
        widget.widgetName = nameInput.value;
      });
      nameInput.title = "Rename this widget (for your reference only)";

      var deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className =
        "inline-flex items-center justify-center rounded-md border border-slate-600 px-2 py-1 text-red-300 text-[10px] hover:bg-red-900/40";
      deleteBtn.textContent = "X";
      deleteBtn.addEventListener("click", function () {
        removeWidget(widget.id);
      });
      deleteBtn.title = "Remove this widget";

      var gearBtn = document.createElement("button");
      gearBtn.type = "button";
      gearBtn.className =
        "inline-flex items-center justify-center rounded-md border border-slate-600 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-700";
      gearBtn.textContent = "⚙";
      gearBtn.title = "Show or hide widget settings";

      if (isNarrow) {
        var moveUpBtn = document.createElement("button");
        moveUpBtn.type = "button";
        moveUpBtn.className =
          "inline-flex items-center justify-center rounded-md border border-slate-600 px-1 py-1 text-[10px] text-slate-300 hover:bg-slate-700";
        moveUpBtn.textContent = "↑";
        moveUpBtn.addEventListener("click", function () {
          var idx = widgets.indexOf(widget);
          if (idx > 0) {
            var tmp = widgets[idx - 1];
            widgets[idx - 1] = widgets[idx];
            widgets[idx] = tmp;
            renderWidgets();
          }
        });
        moveUpBtn.title = "Move this widget up";

        var moveDownBtn = document.createElement("button");
        moveDownBtn.type = "button";
        moveDownBtn.className =
          "inline-flex items-center justify-center rounded-md border border-slate-600 px-1 py-1 text-[10px] text-slate-300 hover:bg-slate-700";
        moveDownBtn.textContent = "↓";
        moveDownBtn.addEventListener("click", function () {
          var idx = widgets.indexOf(widget);
          if (idx < widgets.length - 1) {
            var tmp = widgets[idx + 1];
            widgets[idx + 1] = widgets[idx];
            widgets[idx] = tmp;
            renderWidgets();
          }
        });
        moveDownBtn.title = "Move this widget down";
      }

      row1.appendChild(dragHandle);
      if (isNarrow) {
        row1.appendChild(moveUpBtn);
        row1.appendChild(moveDownBtn);
      }
      row1.appendChild(nameInput);

      var row1Right = document.createElement("div");
      row1Right.className = "ml-auto flex items-center gap-1";
      row1Right.appendChild(gearBtn);
      row1Right.appendChild(deleteBtn);

      row1.appendChild(row1Right);
      wrapper.appendChild(row1);

      // settings row (width/color) toggled by gear
      var settingsRow = document.createElement("div");
      settingsRow.className =
        "mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-300";
      var widthToggle = document.createElement("button");
      widthToggle.type = "button";
      widthToggle.className =
        "inline-flex items-center justify-center rounded-md border border-slate-600 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-700";
      widthToggle.textContent =
        widget.width === "half" ? "½ width" : "full width";
      widthToggle.addEventListener("click", function () {
        widget.width = widget.width === "half" ? "full" : "half";
        renderWidgets();
      });
      widthToggle.title = "Toggle between full-width and half-width layout";

      var colorToggle = document.createElement("button");
      colorToggle.type = "button";
      colorToggle.className =
        "inline-flex items-center justify-center rounded-md border border-slate-600 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-700";
      colorToggle.textContent = "color";
      colorToggle.addEventListener("click", function () {
        var order = ["slate", "emerald", "blue", "violet"];
        var idx = order.indexOf(widget.color || "slate");
        var next = order[(idx + 1) % order.length];
        widget.color = next;
        renderWidgets();
      });
      colorToggle.title = "Cycle through colors to visually group widgets";

      var duplicateBtn = document.createElement("button");
      duplicateBtn.type = "button";
      duplicateBtn.className =
        "inline-flex items-center justify-center rounded-md border border-slate-600 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-900/40";
      duplicateBtn.textContent = "+";
      duplicateBtn.addEventListener("click", function () {
        var idx = widgets.indexOf(widget);
        if (idx === -1) return;
        var copy = JSON.parse(JSON.stringify(widget));
        copy.id = createId(widget.type || "widget");
        widgets.splice(idx + 1, 0, copy);
        renderWidgets();
      });
      duplicateBtn.title = "Duplicate this widget";

      settingsRow.appendChild(widthToggle);
      settingsRow.appendChild(colorToggle);
      settingsRow.appendChild(duplicateBtn);
      settingsRow.style.display = "none";

      gearBtn.addEventListener("click", function () {
        settingsRow.style.display =
          settingsRow.style.display === "none" ? "flex" : "none";
      });

      wrapper.appendChild(settingsRow);

      if (widget.type === "event") {
        var row2 = document.createElement("div");
        row2.className = "flex items-center gap-2";

        var typeLabel = document.createElement("span");
        typeLabel.textContent = "Event";
        typeLabel.className = "text-[11px] text-slate-300";

        var headerInput = document.createElement("input");
        headerInput.type = "text";
        headerInput.value = widget.header || "";
        headerInput.placeholder = "Header (e.g., webEvent1)";
        headerInput.className =
          "flex-1 rounded-md border border-slate-600 bg-slate-900/70 px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500";

        var targetLabel = document.createElement("span");
        targetLabel.textContent = "Target";
        targetLabel.className = "text-[11px] text-slate-400";

        var targetInput = document.createElement("input");
        targetInput.type = "text";
        targetInput.value = widget.target || "all";
        targetInput.placeholder = 'Target (all or "123")';
        targetInput.className =
          "min-w-0 max-w-[7rem] rounded-md border border-slate-600 bg-slate-900/70 px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500";

        var button = document.createElement("button");
        button.type = "button";
        button.className =
          "mt-2 rounded-md bg-emerald-500 px-3 py-2 text-left text-slate-900 hover:bg-emerald-400 text-xs shadow";
        button.textContent = widget.header || "Event";

        headerInput.addEventListener("input", function () {
          widget.header = headerInput.value;
          button.textContent = widget.header || "Event";
        });

        targetInput.addEventListener("input", function () {
          widget.target = targetInput.value;
        });

        button.addEventListener("click", function () {
          sendEvent(widget);
        });

        row2.appendChild(typeLabel);
        row2.appendChild(headerInput);
        row2.appendChild(targetLabel);
        row2.appendChild(targetInput);
        wrapper.appendChild(row2);
        wrapper.appendChild(button);
      } else if (widget.type === "control") {
        var row2c = document.createElement("div");
        row2c.className = "flex items-center gap-2";

        var typeLabelC = document.createElement("span");
        typeLabelC.textContent = "Control";
        typeLabelC.className = "text-[11px] text-slate-300";

        var headerInputC = document.createElement("input");
        headerInputC.type = "text";
        headerInputC.value = widget.header || "";
        headerInputC.placeholder = "Header (e.g., webSlider1)";
        headerInputC.className =
          "flex-1 rounded-md border border-slate-600 bg-slate-900/70 px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500";

        var targetLabelC = document.createElement("span");
        targetLabelC.textContent = "Target";
        targetLabelC.className = "text-[11px] text-slate-400";

        var targetInputC = document.createElement("input");
        targetInputC.type = "text";
        targetInputC.value = widget.target || "all";
        targetInputC.placeholder = 'Target (all or "123")';
        targetInputC.className =
          "min-w-0 max-w-[7rem] rounded-md border border-slate-600 bg-slate-900/70 px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500";

        headerInputC.addEventListener("input", function () {
          widget.header = headerInputC.value;
          label.textContent = widget.header || "Control";
        });

        targetInputC.addEventListener("input", function () {
          widget.target = targetInputC.value;
        });

        row2c.appendChild(typeLabelC);
        row2c.appendChild(headerInputC);
        row2c.appendChild(targetLabelC);
        row2c.appendChild(targetInputC);
        wrapper.appendChild(row2c);

        var row3c = document.createElement("div");
        row3c.className = "mt-2 flex flex-col gap-1";

        var label = document.createElement("label");
        label.className = "text-[11px]";
        label.textContent = widget.header || "Control";

        var slider = document.createElement("input");
        slider.type = "range";
        slider.min = widget.min;
        slider.max = widget.max;
        slider.value = widget.value;
        slider.className = "w-full accent-emerald-500";
        slider.addEventListener("input", function () {
          widget.value = slider.value;
          sendControl(widget, slider.value);
        });

        row3c.appendChild(label);
        row3c.appendChild(slider);
        wrapper.appendChild(row3c);
      } else if (widget.type === "xypad") {
        var row2xy = document.createElement("div");
        row2xy.className = "flex items-center gap-2";

        var typeLabelXY = document.createElement("span");
        typeLabelXY.textContent = "Control";
        typeLabelXY.className = "text-[11px] text-slate-300";

        var headerInputXY = document.createElement("input");
        headerInputXY.type = "text";
        headerInputXY.value = widget.header || "";
        headerInputXY.placeholder = "Header (e.g., webXY1)";
        headerInputXY.className =
          "flex-1 rounded-md border border-slate-600 bg-slate-900/70 px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500";

        var targetLabelXY = document.createElement("span");
        targetLabelXY.textContent = "Target";
        targetLabelXY.className = "text-[11px] text-slate-400";

        var targetInputXY = document.createElement("input");
        targetInputXY.type = "text";
        targetInputXY.value = widget.target || "all";
        targetInputXY.placeholder = 'Target (all or "123")';
        targetInputXY.className =
          "min-w-0 max-w-[7rem] rounded-md border border-slate-600 bg-slate-900/70 px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500";

        headerInputXY.addEventListener("input", function () {
          widget.header = headerInputXY.value;
          labelXY.textContent = widget.header || "XY Pad";
        });

        targetInputXY.addEventListener("input", function () {
          widget.target = targetInputXY.value;
        });

        row2xy.appendChild(typeLabelXY);
        row2xy.appendChild(headerInputXY);
        row2xy.appendChild(targetLabelXY);
        row2xy.appendChild(targetInputXY);
        wrapper.appendChild(row2xy);

        var row3xy = document.createElement("div");
        row3xy.className = "mt-2 flex flex-col gap-1";

        var labelXY = document.createElement("label");
        labelXY.className = "text-[11px]";
        labelXY.textContent = widget.header || "XY Pad";

        var multRow = document.createElement("div");
        multRow.className =
          "flex items-center gap-2 text-[10px] text-slate-300";

        var xMulLabel = document.createElement("span");
        xMulLabel.textContent = "X mult";

        var xMulInput = document.createElement("input");
        xMulInput.type = "number";
        xMulInput.step = "0.01";
        xMulInput.value = widget.xMul != null ? widget.xMul : 1;
        xMulInput.className =
          "w-16 rounded-md border border-slate-600 bg-slate-900/70 px-1 py-0.5 text-[10px] outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500";

        xMulInput.addEventListener("input", function () {
          var v = parseFloat(xMulInput.value);
          if (isNaN(v)) v = 1;
          widget.xMul = v;
        });

        var yMulLabel = document.createElement("span");
        yMulLabel.textContent = "Y mult";

        var yMulInput = document.createElement("input");
        yMulInput.type = "number";
        yMulInput.step = "0.01";
        yMulInput.value = widget.yMul != null ? widget.yMul : 1;
        yMulInput.className =
          "w-16 rounded-md border border-slate-600 bg-slate-900/70 px-1 py-0.5 text-[10px] outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500";

        yMulInput.addEventListener("input", function () {
          var v = parseFloat(yMulInput.value);
          if (isNaN(v)) v = 1;
          widget.yMul = v;
        });

        multRow.appendChild(xMulLabel);
        multRow.appendChild(xMulInput);
        multRow.appendChild(yMulLabel);
        multRow.appendChild(yMulInput);

        var pad = document.createElement("div");
        pad.className =
          "relative h-32 w-full rounded-md border border-slate-600 bg-slate-900/70 overflow-hidden";

        var handle = document.createElement("div");
        handle.className =
          "absolute h-4 w-4 -ml-2 -mt-2 rounded-full bg-emerald-400 shadow";

        function updateHandleFromWidget() {
          var x = Math.min(Math.max(widget.x, 0), 1);
          var y = Math.min(Math.max(widget.y, 0), 1);
          handle.style.left = x * 100 + "%";
          handle.style.top = (1 - y) * 100 + "%";
        }

        function emitXY() {
          if (!socket || !widget.header) return;
          if (!canSendControlNow()) return;
          socket.emit("control", {
            header: widget.header,
            values: [
              widget.x * (widget.xMul || 1),
              widget.y * (widget.yMul || 1),
            ],
            mode: widget.mode || "push",
            target: widget.target || "all",
          });
        }

        function handlePointer(evt) {
          var rect = pad.getBoundingClientRect();
          var clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
          var clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
          var x = (clientX - rect.left) / rect.width;
          var y = 1 - (clientY - rect.top) / rect.height;
          widget.x = Math.min(Math.max(x, 0), 1);
          widget.y = Math.min(Math.max(y, 0), 1);
          updateHandleFromWidget();
          emitXY();
        }

        var dragging = false;

        pad.addEventListener("mousedown", function (evt) {
          dragging = true;
          handlePointer(evt);
        });
        pad.addEventListener(
          "touchstart",
          function (evt) {
            dragging = true;
            handlePointer(evt);
          },
          { passive: true }
        );

        window.addEventListener("mousemove", function (evt) {
          if (!dragging) return;
          handlePointer(evt);
        });
        window.addEventListener(
          "touchmove",
          function (evt) {
            if (!dragging) return;
            handlePointer(evt);
          },
          { passive: true }
        );

        window.addEventListener("mouseup", function () {
          dragging = false;
        });
        window.addEventListener(
          "touchend",
          function () {
            dragging = false;
          },
          { passive: true }
        );

        pad.appendChild(handle);
        row3xy.appendChild(labelXY);
        row3xy.appendChild(multRow);
        row3xy.appendChild(pad);
        wrapper.appendChild(row3xy);
      }

      canvas.appendChild(wrapper);
    });

    if (window.jQuery && jQuery.fn.sortable) {
      var $canvas = jQuery("#designer-canvas");
      try {
        if ($canvas.data("ui-sortable")) {
          $canvas.sortable("destroy");
        }
      } catch (e) {}

      $canvas.sortable({
        handle: ".designer-drag-handle",
        // don't start drag if the initial mousedown/touchstart is on a text input/textarea/select
        cancel: "input,textarea,select",
        tolerance: "pointer",
        containment: "parent",
        cursor: "move",
        delay: 0,
        distance: 2,
        scroll: true,
        helper: "clone",
        update: function () {
          var ordered = [];
          $canvas.children("[data-widget-id]").each(function () {
            ordered.push(this.getAttribute("data-widget-id"));
          });
          widgets.sort(function (a, b) {
            return ordered.indexOf(a.id) - ordered.indexOf(b.id);
          });
        },
      });
    }
  }

  // ---- Layout save/load helpers ----
  function serializeLayout() {
    return JSON.stringify(widgets);
  }

  function loadLayoutFromObject(arr) {
    if (!Array.isArray(arr)) return;
    widgets = arr.map(function (w, idx) {
      return Object.assign(
        {
          id: w.id || createId(w.type || "widget"),
          type: w.type || "event",
          widgetName: w.widgetName || (w.type || "Widget") + " " + (idx + 1),
          header: w.header || "",
          target: w.target || "all",
          mode: w.mode || "push",
          width: w.width || "full",
          color: w.color || "slate",
        },
        w
      );
    });
    renderWidgets();
  }

  function clearLayout() {
    widgets = [];
    renderWidgets();
  }

  function saveLayoutToLocalStorage() {
    try {
      var json = serializeLayout();
      window.localStorage.setItem("ch_designer_layout", json);
      return true;
    } catch (e) {
      console.error("Failed to save layout", e);
      return false;
    }
  }

  function loadLayoutFromLocalStorage() {
    try {
      var json = window.localStorage.getItem("ch_designer_layout");
      if (!json) return false;
      var arr = JSON.parse(json);
      loadLayoutFromObject(arr);
      return true;
    } catch (e) {
      console.error("Failed to load layout", e);
      return false;
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var addEventBtn = document.getElementById("add-event-widget");
    var addControlBtn = document.getElementById("add-control-widget");
    var addXYBtn = document.getElementById("add-xypad-widget");
    var exportBtn = document.getElementById("copy-layout-json");
    var saveBtn = document.getElementById("save-layout-local");
    var loadBtn = document.getElementById("load-layout-local");
    var clearBtn = document.getElementById("clear-layout");
    var downloadBtn = document.getElementById("download-layout-json");
    var uploadInput = document.getElementById("upload-layout-json");
    var pasteBtn = document.getElementById("paste-layout-json");
    var toggleEditorBtn = document.getElementById("toggle-editor");
    var editorPanel = document.getElementById("designer-editor-panel");
    if (addEventBtn) {
      addEventBtn.addEventListener("click", addEventWidget);
    }
    if (addControlBtn) {
      addControlBtn.addEventListener("click", addControlWidget);
    }
    if (addXYBtn) {
      addXYBtn.addEventListener("click", addXYPadWidget);
    }
    if (exportBtn) {
      exportBtn.addEventListener("click", function () {
        var json = serializeLayout();
        // Show JSON in a simple prompt-style dialog for copy
        window.prompt("Copy layout JSON:", json);
      });
    }
    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        saveLayoutToLocalStorage();
      });
    }
    if (loadBtn) {
      loadBtn.addEventListener("click", function () {
        loadLayoutFromLocalStorage();
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        clearLayout();
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener("click", function () {
        var json = serializeLayout();
        var blob = new Blob([json], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "collab-hub-layout.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    if (uploadInput) {
      uploadInput.addEventListener("change", function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (evt) {
          try {
            var text = evt.target && evt.target.result ? evt.target.result : "";
            var arr = JSON.parse(text);
            loadLayoutFromObject(arr);
          } catch (err) {
            console.error("Failed to parse uploaded layout JSON", err);
          }
        };
        reader.readAsText(file);
        // reset input so same file can be chosen again
        uploadInput.value = "";
      });
    }

    if (pasteBtn) {
      pasteBtn.addEventListener("click", function () {
        var existing = serializeLayout();
        var input = window.prompt("Paste layout JSON to load:", existing);
        if (!input) return;
        try {
          var arr = JSON.parse(input);
          loadLayoutFromObject(arr);
        } catch (err) {
          console.error("Failed to parse pasted layout JSON", err);
        }
      });
    }

    if (toggleEditorBtn && editorPanel) {
      // default to editor visible on load
      editorPanel.classList.remove("hidden");
      toggleEditorBtn.textContent = "Done Editing";

      toggleEditorBtn.addEventListener("click", function () {
        var isHidden = editorPanel.classList.contains("hidden");
        if (isHidden) {
          editorPanel.classList.remove("hidden");
          toggleEditorBtn.textContent = "Done Editing";
        } else {
          editorPanel.classList.add("hidden");
          toggleEditorBtn.textContent = "Edit Interface";
        }
      });
    }

    // Try auto-load from localStorage first; if nothing, render empty
    if (!loadLayoutFromLocalStorage()) {
      renderWidgets();
    }

    // ---- Username change (designer Users card) ----

    var usernameInput = document.getElementById("username-text");
    if (usernameInput && window.jQuery) {
      jQuery("#username-text").on("change", function () {
        var val = (jQuery("#username-text").val() || "")
          .toString()
          .replace(/\s+/g, "");
        var usernameElement = document.getElementById("webUsername");
        // if (usernameElement) {
        //   usernameElement.innerHTML = val;
        // }
        localUsername = val;
        socket.emit("addUsername", { username: val });

        jQuery("#username-text")
          .attr("placeholder", "Change Username")
          .val("")
          .focus()
          .blur();
        return false;
      });
    }

    // ---- Chat form wiring (reuse #chat-form, #m, #target-text) ----
    var chatForm = document.getElementById("chat-form");
    if (chatForm) {
      chatForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var chatInput = document.getElementById("m");
        var targetInput = document.getElementById("target-text");
        var chatVal = (
          chatInput && chatInput.value ? chatInput.value : ""
        ).trim();
        var targetVal = (
          targetInput && targetInput.value ? targetInput.value : ""
        ).trim();
        if (!chatVal || !targetVal) return false;

        socket.emit("chat", { chat: chatVal, target: targetVal });
        if (chatInput) chatInput.value = "";
        if (targetInput) targetInput.value = "";
        return false;
      });
    }
  });

  // ---- Socket listeners (ping, messages, users, chat) ----

  setInterval(function () {
    var start = Date.now();
    var pingObject = { start: start };
    socket.volatile.emit("chPing", pingObject);
  }, 3000);

  socket.on("chPingBack", function (data) {
    var tempPing = Date.now() - data.start;
    if (tempPing !== ping) {
      var pingEl = document.getElementById("ping");
      if (pingEl) pingEl.textContent = "Ping: " + tempPing + " ms";
      ping = tempPing;
    }
  });

  socket.on("serverMessage", function (data) {
    var varname = Math.floor(Math.random() * 1000).toString();
    var messageList = document.getElementById("incoming-messages");
    if (!messageList) return false;
    messageDisplay(varname, messageList, data.message);
    TimeOuts[varname] = startMessageFade(varname);
  });

  socket.on("event", function (data) {
    var varname = data.header;
    var element = document.getElementById(removeSlash(varname));
    if (!element) {
      var messageList = document.getElementById("incoming-messages");
      if (!messageList) return false;
      messageDisplay(varname, messageList, varname);
      TimeOuts[varname] = startMessageFade(varname);
    } else {
      clearTimeout(TimeOuts[data.header]);
      TimeOuts[data.header] = startMessageFade(data.header);
    }
    return false;
  });

  socket.on("control", function (data) {
    var varname = data.header;
    var element = document.getElementById(removeSlash(varname));
    var messageList = document.getElementById("incoming-messages");
    if (!messageList) return false;

    // allow hub to increase local control send rate limit, similar to touch controller
    if (
      data.header === "setRateLimit" &&
      Number(data.values) > controlRateLimit
    ) {
      controlRateLimit = Number(data.values);
    }

    if (!element) {
      messageDisplay(varname, messageList, data.header + " " + data.values);
      TimeOuts[varname] = startMessageFade(varname);
    } else {
      // reuse node text if present
      element.querySelector("#text").textContent =
        data.header + " - " + data.values;
      clearTimeout(TimeOuts[data.header]);
      TimeOuts[data.header] = startMessageFade(data.header);
    }
    return false;
  });

  socket.on("myUsername", function (data) {
    if (!data || data.username == null) return false;
    var usernameElement = document.getElementById("webUsername");
    if (!usernameElement) return false;
    usernameElement.innerHTML = data.username;
    return false;
  });

  socket.on("allUsers", function (users) {
    var listNode = document.getElementById("usersList");
    if (!listNode || !users || !users.users) return false;

    while (listNode.lastElementChild) {
      listNode.removeChild(listNode.lastElementChild);
    }

    for (var i = 0; i < Object.keys(users.users).length; i++) {
      var header = users.users[i];
      jQuery("<div>")
        .attr({ class: "listItem" })
        .prependTo(listNode)
        .append(
          jQuery("<div>")
            .attr({ class: "listItemName" })
            .append(jQuery("<div>").text(header))
        );
    }
    return false;
  });

  socket.on("otherUsers", function (users) {
    var listNode = document.getElementById("otherUserList");
    if (!listNode || !users || !users.users) return false;

    while (listNode.lastElementChild) {
      listNode.removeChild(listNode.lastElementChild);
    }

    for (var i = 0; i < Object.keys(users.users).length; i++) {
      var header = users.users[i];
      jQuery("<div>")
        .attr({ class: "listItem" })
        .prependTo(listNode)
        .append(
          jQuery("<div>")
            .attr({ class: "listItemName" })
            .append(jQuery("<div>").text(header))
        );
    }
    return false;
  });

  socket.on("chat", function (data) {
    var chatListNode = document.getElementById("messages");
    if (!chatListNode) return false;

    while (chatListNode.lastElementChild) {
      chatListNode.removeChild(chatListNode.lastElementChild);
    }

    chatDisplay("#messages", data.id, data.chat);
    return false;
  });
})();
