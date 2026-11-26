# Prompts for analysing a spreadsheet with AI

Each prompt has the five parts from the prompt guide: Situation, Task, Input,
Format, Check. Paste one into your AI chat, then attach or paste the file.

Try them on `expenses-2025.csv` first (it is made up, so it is safe). For your
own file, make a safe copy first: no names, no account numbers, only the
columns the AI needs.

After every answer, do the 30-second check against your sheet. `answer-key.json`
has the true answers for the sample file.

## 1. Describe the file and flag problems

```text
Situation: I am an office worker and I keep a spreadsheet of our team's expenses for 2025. I want to understand it before I trust any numbers from it.
Task: Describe this file and flag anything that looks wrong.
Input: The attached CSV file, with the columns Date, Vendor, Category, Amount and Paid by.
Format: First, one short paragraph: how many rows, which columns, the date range. Then a bulleted list of problems, each with the row number (the header is row 1) and what you think is wrong.
Check: Look for duplicate rows, blank cells, amounts far bigger or smaller than the rest, and one category written two different ways. Do not fix anything or change any numbers. If you are not sure something is a problem, say "not sure" instead of leaving it out.
```

## 2. Summarize by category and month

```text
Situation: I am an office worker and I need to report where our team's 2025 expenses went. I have the file and want totals I can check.
Task: Add up the Amount column by Category, and then by month.
Input: The attached CSV file. Treat two rows that are exactly the same as one purchase. Treat category names that mean the same thing as one category. Leave blank amounts out and tell me which rows they are.
Format: Two small tables. One has Category and Total. The other has Month and Total, in calendar order. Show the grand total under each table.
Check: Before you answer, tell me every change you made to the data (rows left out, names merged). If an amount looks like a typing mistake, do not change it. List it and ask me.
```

## 3. Answer one question, with the working shown

```text
Situation: I am an office worker and my manager asked me a question about our 2025 expenses. I will repeat your answer, so I need to be able to prove it.
Task: Answer this question: How much did we spend on Travel in March 2025?
Input: The attached CSV file. The Date column looks like 2025-03-14.
Format: The answer on one line. Under it, a table of the exact rows you added up (Date, Vendor, Amount), then the sum.
Check: Do not do the arithmetic from memory. Add the rows you listed, one by one, and show the running total. If any row could count either way, say so.
```

## 4. Three sentences for a manager

```text
Situation: I am an office worker writing a short note on our 2025 expenses for a manager who has two minutes and is not a spreadsheet person.
Task: Write a three-sentence summary of our spending.
Input: The attached CSV file. Count each purchase once, and treat category names that mean the same thing as one category.
Format: Exactly three sentences, plain words, no jargon. Include the biggest category with its total, and one thing the manager should ask about.
Check: Every number must come from the file. After the three sentences, list each number you used and where it came from. Tell me about any problem in the file that could change those numbers.
```
