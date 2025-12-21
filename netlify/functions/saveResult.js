// netlify/functions/saveResult.js
// Create one JSON file per quiz submission in the repo under results/
// Uses octokit and NETLIFY_GH_TOKEN set in Netlify site environment variables.

const { Octokit } = require("@octokit/rest");

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  // Expect payload.result and optionally payload.username
  const result = payload.result;
  const username = payload.username || result && result.uid ? result.uid : "anonymous";

  if (!result) return { statusCode: 400, body: "Missing result object" };

  // Repo config - change if needed
  const OWNER = "dustmana8-byte";
  const REPO = "Auralis";
  const BRANCH = "main";
  const COMMITTER = { name: "Results Bot", email: "noreply@example.com" };

  const token = process.env.NETLIFY_GH_TOKEN;
  if (!token) {
    return { statusCode: 500, body: "Server not configured (missing NETLIFY_GH_TOKEN)" };
  }

  const octokit = new Octokit({ auth: token });

  try {
    // Create unique filename: results/2025-12-21T12-34-56-789Z_Bozart.json
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safeUser = String(username).replace(/[^a-z0-9_\-]/gi, "_");
    const path = `results/${timestamp}_${safeUser}.json`;
    const contentBase64 = Buffer.from(JSON.stringify(result, null, 2)).toString("base64");

    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path,
      message: `Add quiz result for ${username} at ${timestamp}`,
      content: contentBase64,
      committer: COMMITTER,
      branch: BRANCH
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, path })
    };
  } catch (err) {
    console.error("saveResult error:", err);
    return { statusCode: 500, body: "Failed to save result: " + (err.message || String(err)) };
  }
};