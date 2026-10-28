
const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadButton = document.getElementById("load-btn");
const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const submitButton = document.getElementById("submit-btn");
const statusMessage = document.getElementById("status");
const notesList = document.getElementById("notes-list");

let notes = [];


async function request(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }


  let data = null;

  if (response.status !== 204) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      data = await response.json();
    }
  }

  return {
    data,
    status: response.status
  };
}


function showStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = "status";

  if (type) {
    statusMessage.classList.add(type);
  }
}


function setButtonsDisabled(disabled) {
  document.querySelectorAll("button").forEach((button) => {
    button.disabled = disabled;
  });
}


async function loadNotes() {
  setButtonsDisabled(true);
  showStatus("Loading notes...");

  try {
    const result = await request(`${API_URL}?_limit=10`);

    notes = result.data || [];
    renderNotes();

    if (notes.length === 0) {
      showStatus("No notes found. Create your first note.", "success");
    } else {
      showStatus(
        `Loaded ${notes.length} notes from the server.`,
        "success"
      );
    }
  } catch (error) {
    console.error("Could not load notes:", error);
    showStatus(
      "Could not load notes. Please check your internet connection and try again.",
      "error"
    );
  } finally {
    setButtonsDisabled(false);
  }
}


async function createNote(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (!title) {
    showStatus("Please enter a note title.", "error");
    titleInput.focus();
    return;
  }

  if (title.length > 100) {
    showStatus("The title must not exceed 100 characters.", "error");
    titleInput.focus();
    return;
  }

  setButtonsDisabled(true);
  showStatus("Creating note...");

  try {
    const result = await request(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title,
        body,
        userId: 1
      })
    });

    const newNote = result.data;

    notes.unshift(newNote);
    renderNotes();

    noteForm.reset();

    showStatus(
      `Note created (status ${result.status}, id ${newNote.id}).`,
      "success"
    );
  } catch (error) {
    console.error("Could not create note:", error);
    showStatus(
      `Could not create note${error.status ? ` (status ${error.status})` : ""}. Please try again.`,
      "error"
    );
  } finally {
    setButtonsDisabled(false);
  }
}


async function deleteNote(noteId) {
  setButtonsDisabled(true);
  showStatus(`Deleting note ${noteId}...`);

  try {
    const result = await request(`${API_URL}/${encodeURIComponent(noteId)}`, {
      method: "DELETE"
    });


    notes = notes.filter((note) => note.id !== noteId);
    renderNotes();

    showStatus(
      `Note ${noteId} deleted from this page (status ${result.status}).`,
      "success"
    );
  } catch (error) {
    console.error("Could not delete note:", error);
    showStatus(
      `Could not delete note${error.status ? ` (status ${error.status})` : ""}. Please try again.`,
      "error"
    );
  } finally {
    setButtonsDisabled(false);
  }
}


function renderNotes() {
  notesList.replaceChildren();

  if (notes.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-state";
    emptyItem.textContent = "No notes to display. Load notes or create one.";
    notesList.appendChild(emptyItem);
    return;
  }

  notes.forEach((note) => {
    const item = document.createElement("li");
    item.className = "note-card";

    const title = document.createElement("h3");
    title.textContent = note.title || "Untitled note";

    const body = document.createElement("p");
    body.textContent = note.body || "No body provided.";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-btn";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute(
      "aria-label",
      `Delete note ${note.id}`
    );

    deleteButton.addEventListener("click", () => {
      deleteNote(note.id);
    });

    item.append(title, body, deleteButton);
    notesList.appendChild(item);
  });
}


loadButton.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);
