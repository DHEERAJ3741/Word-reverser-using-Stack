const input = document.getElementById("wordInput");
const count = document.getElementById("charCount");
const form = document.getElementById("reverseForm");
const output = document.getElementById("output");
const stackArea = document.getElementById("stackArea");
const heading = document.getElementById("visualHeading");
const clearButton = document.getElementById("clearButton");

let wasmInstance = null;
let wasmMemory = null;

async function loadCProgram() {
  try {
    const response = await fetch("./stack.wasm");
    if (!response.ok) {
      throw new Error("stack.wasm could not be found. Check that it is uploaded to the repository root.");
    }

    const bytes = await response.arrayBuffer();
    const result = await WebAssembly.instantiate(bytes);

    wasmInstance = result.instance;
    wasmMemory = wasmInstance.exports.memory;

    if (!wasmMemory || !wasmInstance.exports.reverse_word) {
      throw new Error("The WebAssembly file does not contain the expected exports.");
    }

    output.textContent = "Ready! Enter a word above.";
  } catch (error) {
    output.textContent = "The C module could not load. Check that stack.wasm is uploaded.";
    console.error("WebAssembly loading error:", error);
  }
}

function drawStack(word) {
  stackArea.innerHTML = "";

  if (!word.length) {
    stackArea.innerHTML = '<p class="empty-state">Enter a word and press “Reverse word” to see PUSH and POP.</p>';
    heading.textContent = "Waiting for input";
    return;
  }

  heading.textContent = `PUSH ${word.length} characters, then POP`;

  [...word].forEach((character, index) => {
    const cell = document.createElement("div");
    cell.className = "cell" + (index === word.length - 1 ? " top" : "");
    cell.style.animationDelay = `${index * 35}ms`;

    const label = document.createElement("small");
    label.textContent = index === word.length - 1 ? "TOP" : String(index + 1);
    cell.appendChild(label);
    cell.appendChild(document.createTextNode(character));
    stackArea.appendChild(cell);
  });
}

input.addEventListener("input", () => {
  count.textContent = `${input.value.length} / 255`;
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const word = input.value;
  if (!word.length) {
    output.textContent = "Please enter a word first.";
    input.focus();
    return;
  }

  if (!wasmInstance || !wasmMemory) {
    output.textContent = "C module is still loading or failed to load. Refresh the page and try again.";
    return;
  }

  const memory = new Uint8Array(wasmMemory.buffer);
  const inputPointer = 1024;
  const outputPointer = 2048;

  const encoded = new TextEncoder().encode(word);
  if (encoded.length > 255) {
    output.textContent = "Please enter a word with no more than 255 bytes.";
    return;
  }

  memory.fill(0, inputPointer, inputPointer + 256);
  memory.fill(0, outputPointer, outputPointer + 256);
  memory.set(encoded, inputPointer);

  wasmInstance.exports.reverse_word(inputPointer, outputPointer);

  let end = outputPointer;
  while (memory[end] !== 0 && end < outputPointer + 256) {
    end++;
  }

  const reversed = new TextDecoder().decode(memory.slice(outputPointer, end));
  output.textContent = reversed;
  drawStack(word);
});

clearButton.addEventListener("click", () => {
  input.value = "";
  count.textContent = "0 / 255";
  output.textContent = "Your result will appear here";
  drawStack("");
  input.focus();
});

drawStack("");
loadCProgram();
