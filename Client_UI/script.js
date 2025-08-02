document.getElementById('dataForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const method = document.querySelector('input[name="inputMethod"]:checked').value;
  const responseBox = document.getElementById('response');
  responseBox.classList.add('hidden');
  responseBox.textContent = "";

  try {
    if (method === 'file') {
      const file = document.getElementById('fileInput').files[0];
      if (!file) return alert("Please choose a file");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch('http://localhost:7000/upload-file', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      responseBox.textContent = data.message || "✅ File uploaded successfully!";
    } else if (method === 'mongo') {
      const uri = document.getElementById('mongoUri').value.trim();
      const db = document.getElementById('dbName').value.trim();
      const coll = document.getElementById('collectionName').value.trim();

      if (!uri || !db || !coll) {
        return alert("Please fill in all MongoDB connection details.");
      }

      // Use environment variable or default
      const API_BASE = process.env.TRANSACTION_API_URL || 'http://transaction-generator-api:7000';

      const res = await fetch(`${API_BASE}/use-mongo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri, dbName: db, collectionName: coll })
      });

      const data = await res.json();
      responseBox.textContent = data.message || "✅ MongoDB data sent to Kafka!";
    }

    responseBox.classList.remove('hidden');
  } catch (err) {
    responseBox.textContent = "❌ Something went wrong: " + err.message;
    responseBox.classList.remove('hidden');
  }
});
