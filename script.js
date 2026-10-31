const input = document.getElementById("wordInput");
const count = document.getElementById("charCount");
const form = document.getElementById("reverseForm");
const output = document.getElementById("output");
const stackArea = document.getElementById("stackArea");
const heading = document.getElementById("visualHeading");
const clearButton = document.getElementById("clearButton");

let wasmReverse = null;

async function loadCProgram() {
  try {
    const response = await fetch("stack.wasm");
    const bytes = await response.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes);
    wasmReverse = instance.exports.reverse_word;
  } catch (error) {
    output.textContent = "Could not load the C module. Run this site from a web server.";
    console.error(error);
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
  // Show the stack after all PUSH operations. The rightmost character is the top.
  [...word].forEach((character, index) => {
    const cell = document.createElement("div");
    cell.className = "cell" + (index === word.length - 1 ? " top" : "");
    cell.style.animationDelay = `${index * 35}ms`;
    cell.innerHTML = `<small>${index === word.length - 1 ? "TOP" : index + 1}</small>`;
    cell.append(document.createTextNode(character));
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
  if (!wasmReverse) {
    output.textContent = "C program is still loading. Try again in a moment.";
    return;
  }

  const memory = new Uint8Array(wasmReverse.memory.buffer);
  const inputPointer = 1024;
  const outputPointer = 2048;
  const encoded = new TextEncoder().encode(word);
  memory.fill(0, inputPointer, inputPointer + 256);
  memory.fill(0, outputPointer, outputPointer + 256);
  memory.set(encoded.slice(0, 255), inputPointer);
  wasmReverse(inputPointer, outputPointer);

  let end = outputPointer;
  while (memory[end] !== 0 && end < outputPointer + 256) end++;
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

loadCProgram();
