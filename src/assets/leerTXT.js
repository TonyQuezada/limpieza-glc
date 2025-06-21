// src/assets/leerTXT.js

/**
 * Opens a file dialog for the user to select a .txt file,
 * reads its content, and returns it as a string via a Promise.
 * Preserves the original formatting (line breaks, spaces, etc.).
 *
 * @returns {Promise<string>} A Promise that resolves with the file content as a string,
 *                            or rejects if there's an error or the user cancels.
 */
export function leerTXT() {
    return new Promise((resolve, reject) => {
      // 1. Create an invisible file input element
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt, text/plain'; // Restrict to .txt files
  
      // 2. Set up event listener for when a file is chosen
      input.onchange = (event) => {
        const file = event.target.files[0];
  
        if (file) {
          // Optional: Double-check the file type (more robust)
          if (file.type === "text/plain" || file.name.endsWith('.txt')) {
            // 3. Create a FileReader instance
            const reader = new FileReader();
  
            // 4. Define what happens when the file is successfully read
            reader.onload = (e) => {
              // Resolve the promise with the file content
              resolve(e.target.result);
            };
  
            // 5. Define what happens on a read error
            reader.onerror = (e) => {
              console.error("FileReader error:", e);
              reject('Error reading file: ' + reader.error);
            };
  
            // 6. Start reading the file as text (preserves formatting)
            reader.readAsText(file);
  
          } else {
             console.warn(`Selected file type (${file.type}) or name (${file.name}) might not be plain text.`);
             // Still attempt to read it, but could also reject here:
             // reject('Invalid file type. Please select a .txt file.');
             
             // Let's proceed cautiously but allow potential mismatches if browser reports type incorrectly
             const reader = new FileReader();
             reader.onload = (e) => resolve(e.target.result);
             reader.onerror = (e) => {
                 console.error("FileReader error (on potentially incorrect type):", e);
                 reject('Error reading file: ' + reader.error);
             };
             reader.readAsText(file);
          }
        } else {
          // 7. Handle the case where the user cancels the dialog
          reject('No file selected.');
        }
      };
  
      // 8. Define error handling for the input element itself (less common)
      input.onerror = (err) => {
          console.error("Input element error:", err);
          reject('Error with file input element.');
      }
  
      // 9. Programmatically click the input element to open the file dialog
      input.click();
    });
  }