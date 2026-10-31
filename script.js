const input  = document.getElementById("word");
const count  = document.getElementById("count");
const form   = document.getElementById("form");
const output = document.getElementById("output");
const stackEl = document.getElementById("stack");
const opEl   = document.getElementById("op");
const msg    = document.getElementById("msg");
const clearBtn = document.getElementById("clear");

const MAX_BYTES = 255;        // the C stack holds 256 bytes (255 + terminator)
const IN_PTR = 1024;          // input string lives here in wasm memory
const OUT_PTR = 2048;         // output string lives here

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let wasm = null;
let timer = null;

function setMsg(text, isError) {
  msg.textContent = text;
  msg.className = isError ? "error" : "";
}

async function loadWasm() {
  try {
    const res = await fetch("stack.wasm");
    if (!res.ok) throw new Error("HTTP " + res.status);
    const { instance } = await WebAssembly.instantiate(await res.arrayBuffer());
    if (!instance.exports.memory || !instance.exports.reverse_word) {
      throw new Error("missing exports");
    }
    wasm = instance.exports;
  } catch (err) {
    console.error("WebAssembly load error:", err);
    setMsg("Could not load stack.wasm. Keep it next to index.html and open the page through a web server (GitHub Pages, or a local server), not by double-clicking the file.", true);
  }
}

// The C code reverses raw bytes, which flips the bytes inside multi-byte
// UTF-8 characters (é, emoji, ...). Put each such character's bytes back in order.
function fixUtf8(bytes) {
  const out = new Uint8Array(bytes.length);
  let i = 0;
  while (i < bytes.length) {
    let j = i;
    while (j < bytes.length && (bytes[j] & 0xC0) === 0x80) j++;   // continuation bytes
    if (j < bytes.length && bytes[j] >= 0xC0) j++;                 // lead byte
    if (j === i) {                                                 // plain ASCII
      out[i] = bytes[i];
      i++;
      continue;
    }
    for (let k = 0; k < j - i; k++) out[i + k] = bytes[j - 1 - k];
    i = j;
  }
  return out;
}

function reverseWithWasm(word) {
  const bytes = encoder.encode(word);
  const mem = new Uint8Array(wasm.memory.buffer);
  mem.fill(0, IN_PTR, IN_PTR + MAX_BYTES + 1);
  mem.fill(0, OUT_PTR, OUT_PTR + MAX_BYTES + 1);
  mem.set(bytes, IN_PTR);
  wasm.reverse_word(IN_PTR, OUT_PTR);
  return decoder.decode(fixUtf8(mem.slice(OUT_PTR, OUT_PTR + bytes.length)));
}

function show(ch) { return ch === " " ? "\u2423" : ch; }

function makeCell(ch) {
  const cell = document.createElement("div");
  cell.className = "cell";
  cell.textContent = show(ch);
  return cell;
}

function markTop() {
  const old = stackEl.querySelector(".top");
  if (old) old.classList.remove("top");
  if (stackEl.lastElementChild) stackEl.lastElementChild.classList.add("top");
}

function animate(word, reversed) {
  clearTimeout(timer);
  stackEl.innerHTML = "";
  opEl.innerHTML = "&nbsp;";

  const chars = [...word];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    output.textContent = reversed;
    opEl.textContent = "done";
    return;
  }

  const delay = Math.max(15, Math.min(250, 3000 / (chars.length * 2)));
  const popped = [];
  let step = 0;
  output.textContent = "";

  function tick() {
    if (step < chars.length) {
      const ch = chars[step];
      stackEl.appendChild(makeCell(ch));
      markTop();
      opEl.textContent = "push " + show(ch);
    } else if (step < chars.length * 2) {
      const ch = [...chars].reverse()[step - chars.length];
      stackEl.lastElementChild.remove();
      markTop();
      popped.push(ch);
      output.textContent = popped.join("");
      opEl.textContent = "pop " + show(ch);
    } else {
      output.textContent = reversed;   // final value comes from the C function
      opEl.textContent = "done";
      return;
    }
    step++;
    timer = setTimeout(tick, delay);
  }
  tick();
}

input.addEventListener("input", () => {
  const n = encoder.encode(input.value).length;
  count.textContent = n + " / " + MAX_BYTES + " bytes";
  count.className = n > MAX_BYTES ? "over" : "";
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const word = input.value;

  if (!word) { setMsg("Enter a word first.", true); input.focus(); return; }
  if (encoder.encode(word).length > MAX_BYTES) {
    setMsg("Too long. The limit is " + MAX_BYTES + " bytes.", true);
    return;
  }
  if (!wasm) { setMsg("The C module isn't loaded. Reload the page and try again.", true); return; }

  setMsg("");
  animate(word, reverseWithWasm(word));
});

clearBtn.addEventListener("click", () => {
  clearTimeout(timer);
  input.value = "";
  count.textContent = "0 / " + MAX_BYTES + " bytes";
  count.className = "";
  output.textContent = "-";
  stackEl.innerHTML = "";
  opEl.innerHTML = "&nbsp;";
  setMsg("");
  input.focus();
});

loadWasm();
