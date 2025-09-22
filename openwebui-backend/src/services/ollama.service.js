// import { spawn } from "child_process";

// // Whitelist of allowed models
// const ALLOWED_MODELS = ["gemma:2b"];

// /**
//  *
//  * @param {string} modelId
//  * @param {string} prompt
//  * @param {function} onChunk
//  * @param {function} onClose
//  * @param {function} onError
//  */

// export function runModelStream(modelId, prompt, onChunk, onClose, onError) {
//   try {
//     // validate modelId
//     if (!ALLOWED_MODELS.includes(modelId)) {
//       throw new Error(`Model ${modelId} is not allowed.`);
//     }

//     // validate prompt
//     if (typeof prompt !== "string" || prompt.trim() === "") {
//       throw new Error("Prompt must be a non-empty string.");
//     }
//     if (prompt.length > 1000) {
//       throw new Error("Prompt is too long. Maximum 1000 characters.");
//     }

//     // Spawn the ollama process
//     const args = ["run", modelId, "--stream"];
//     const proc = spawn("ollama", args);

//     proc.stdin.setEncoding("utf-8");
//     proc.stdin.write(prompt);
//     proc.stdin.end();

//     // Data received from the ollama (stdout);
//     proc.stdout.on("data", (chunk) => {
//       onChunk(chunk.toString());
//     });

//     proc.stderr.on("data", (chunk) => {
//       onChunk(chunk.toString());
//     });

//     // Process closed
//     proc.on("close", (code) => {
//       onClose(code);
//     });

//     // Process error
//     proc.on("error", (err) => {
//       onError(err);
//     });

//     return proc;
//   } catch (err) {
//     onError(err);
//   }
// }

// filepath: src/services/ollamaService.js
import { spawn } from "child_process";

const ALLOWED_MODELS = ["gemma:2b", "phi:2.7b"];

// helper to remove ANSI escape codes (cursor hide/show, colors, etc.)
function stripAnsiCodes(str) {
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "");
}

export function runModelStream(modelId, prompt, onChunk, onClose, onError) {
  try {
    // Validate modelId
    if (!ALLOWED_MODELS.includes(modelId)) {
      throw new Error(`Model ${modelId} is not allowed.`);
    }

    // Validate prompt
    if (typeof prompt !== "string" || prompt.trim() === "") {
      throw new Error("Prompt must be a non-empty string.");
    }
    if (prompt.length > 1000) {
      throw new Error("Prompt is too long. Maximum 1000 characters.");
    }

    // Ollama command (no --stream in v0.11.11)
    const args = ["run", modelId];
    const proc = spawn("ollama", args);

    // Send prompt via stdin
    proc.stdin.setEncoding("utf-8");
    proc.stdin.write(prompt);
    proc.stdin.end();

    // Handle stdout (stream chunks)
    proc.stdout.on("data", (chunk) => {
      const clean = stripAnsiCodes(chunk.toString());
      if (clean.trim()) {
        onChunk(clean);
      }
    });

    // Handle stderr (warnings/errors)
    proc.stderr.on("data", (chunk) => {
      const clean = stripAnsiCodes(chunk.toString());
      if (clean.trim()) {
        onChunk(clean);
      }
    });

    proc.on("close", (code) => onClose(code));
    proc.on("error", (err) => onError(err));

    return proc;
  } catch (err) {
    onError(err);
  }
}
