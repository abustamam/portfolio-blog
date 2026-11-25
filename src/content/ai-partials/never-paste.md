## First: which account?

What you can safely paste depends on the account you are signed in to. Check that before anything else.

- **A free or personal account, or a work file in a personal account:** treat the chat like an email to a stranger. Keep the list below out of it, or make the file safe first. Your employer may not allow work files in personal accounts at all; their rule comes first.
- **A work account your employer has approved for that kind of data:** follow their policy. You may not need to remove anything at all. Paste what they allow, and nothing they don't. Your employer's agreement with the AI company, and their policy, decide what's allowed.
- **Not sure which you have:** treat it as the first case until you've asked.

## What to keep out of an account that isn't approved for it

On a free or personal account, or any account your employer hasn't approved for this kind of data:

| Never paste | Do this instead |
|---|---|
| **Other people's personal details**: names, emails, phone numbers, addresses | Swap in placeholders: PERSON-1, EMAIL-1, PHONE-1. Keep the key (who is who) in your own file. |
| **Passwords, API keys, one-time codes** | Never, not even "just to check it". Describe the problem without the secret. |
| **Account and card numbers** | Mask them: \*\*\*\*4821, or ACCOUNT-1. |
| **Health details** about you or anyone else | Generalise: "a family member with a chronic condition". |

## Make a file safe in three steps

1. **Decide what the AI actually needs.** To get formulas, it needs the column headers and three example rows, not the whole sheet. To group errors in a log, it needs the error messages, not the usernames.
2. **Replace, don't delete.** Use the same placeholder for the same thing every time (every appearance of one person becomes PERSON-1). That keeps the patterns, such as "the same person gave 12 times", without the identity.
3. **Keep the key yourself.** The list of PERSON-1 = the real name stays in your own sheet and never goes into the chat.

### Tricks that help
- *Spreadsheets:* add an ID column, then make a copy with the name and email columns deleted. Upload the copy.
- *Text:* Find and replace (Ctrl+H or Cmd+Shift+H) each name with a placeholder before you copy anything.
- *Ask for the method, not the answer:* "Write me a formula that..." means your data never has to leave the sheet.

## Check before you press Enter

On an account that isn't approved for this kind of data, ask yourself:

- [ ] Could anyone in this text be recognised by someone who knows them?
- [ ] Is there any number that unlocks money or an account?
- [ ] Would I be comfortable if this text were shown to the people it's about?

## If you already pasted something

If it went into an account that isn't approved for it: delete the conversation, and turn off chat history or training in the tool's settings if you can. If it was a password or key, **change it now**. Deleting the chat doesn't un-send it.
