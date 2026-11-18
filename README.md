A mining game for self-study and practice. Answer questions correctly to get shovels. Accepts csv question sets.

## Publishing homework (no scores recorded)

- Choose the question set first (the default one, or your own CSV via "📂 Load Quiz"), click "📤 Homework", enter a title and click "Create homework link".
- You get a link and a QR code: copy the link, or download / print the QR code. Students scan it with a tablet or phone.
- Students play with exactly that question set. The homework title is shown at the top, and the format / load / publish buttons are hidden, so they cannot change the questions.
- No server, Google Sheet or Apps Script is needed: the questions are compressed into the link after `#hw=`. No names or scores are recorded.
- When you publish the default set, the link only says "use the default questions", so it stays short; if you later edit `questions.csv`, old links use the new questions too.
- A QR code has limited room: about 30 Chinese questions or about 50 short English questions. With more, the link still works but there is no QR code.

