/**
 * Google Apps Script for the quiz form: sends each answer's score to the
 * platform so the student is credited automatically.
 *
 * Setup (done once, by the owner of the form):
 *  1. Open the form in edit mode > ⋮ (top right) > Apps Script.
 *  2. Replace the editor's content with this file.
 *  3. Paste the secret into QUIZ_SECRET below. It is shown in the platform:
 *     Admin > Events > Quiz results > "Secret for the form's script" > Show.
 *  4. Save, then run "testConnection" once (▶) and accept the permissions.
 *     The log must say "Connection OK".
 *  5. Triggers (clock icon) > Add trigger > function "onFormSubmit",
 *     event source "From form", event type "On form submit" > Save.
 *
 * The form must be a quiz (Settings > Make this a quiz) with an answer key,
 * and its first question must be the trader code.
 */

const SUPABASE_URL = "https://xaluytjrdtpbnadowlcd.supabase.co"
const SUPABASE_KEY = "sb_publishable_b1GXs0AD8C9VQVJanKvTcg_ng5JSjGE"
const QUIZ_SECRET = "PASTE_THE_SECRET_HERE"
// The trader code is the question whose title starts with this text
const TRADER_CODE_TITLE = "Trader code"

function sendScore(code, score) {
  const response = UrlFetchApp.fetch(
    SUPABASE_URL + "/rest/v1/rpc/submit_quiz_score",
    {
      method: "post",
      contentType: "application/json",
      headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY },
      payload: JSON.stringify({
        p_code: code,
        p_score: score,
        p_secret: QUIZ_SECRET,
      }),
      muteHttpExceptions: true,
    },
  )
  return { status: response.getResponseCode(), body: response.getContentText() }
}

// Runs on every submitted answer (see step 5)
function onFormSubmit(event) {
  let code = ""
  let score = 0
  event.response.getGradableItemResponses().forEach(function (item) {
    if (item.getItem().getTitle().indexOf(TRADER_CODE_TITLE) === 0) {
      code = String(item.getResponse())
    } else {
      score += Number(item.getScore()) || 0
    }
  })
  const result = sendScore(code.trim(), score)
  console.log(code + " scored " + score + " -> " + result.status + " " + result.body)
}

// Run by hand to check the secret and the connection. Credits nobody: it
// sends a score for a trader code that does not exist.
function testConnection() {
  const result = sendScore("WS-0000x", 0)
  if (result.status === 200 && result.body.indexOf("unknown_code") !== -1) {
    console.log("Connection OK")
  } else if (result.body.indexOf("not live") !== -1) {
    console.log("Connection OK (the game is not live yet, so scores are refused for now)")
  } else {
    console.log("Problem: " + result.status + " " + result.body)
  }
}
