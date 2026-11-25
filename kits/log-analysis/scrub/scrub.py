"""Replace private values in a log file with placeholders, before any AI sees it.

    python scrub.py app.log app.scrubbed.log

Reads the input file, writes a scrubbed copy, and prints how many values each
rule replaced. The input file is never changed. Runs on Python 3.8+ with no
extra packages, entirely on this machine: nothing is sent anywhere.

The rules below are the same, in the same order, as the RULES in scrub.ps1.
If you add a rule, add it to both files. Rules run top to bottom, so the
specific ones (tokens, keys) come before the general ones (emails, numbers).
Regexes are not a guarantee: always read a sample of the output before you
share it.
"""

import re
import sys

# (name, pattern, placeholder)
RULES = [
    ("bearer token", r"(?<=[Bb]earer )[A-Za-z0-9._~+/=-]+", "<TOKEN>"),
    ("jwt", r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", "<TOKEN>"),
    ("api key", r"(?<=api_key=)[^\s&]+", "<SECRET>"),
    ("email", r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "<EMAIL>"),
    ("card number", r"\b[0-9]{4}[ -]?[0-9]{4}[ -]?[0-9]{4}[ -]?[0-9]{1,4}\b", "<CARD>"),
    ("ip address", r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b", "<IP>"),
    ("user id", r"\busr_[A-Za-z0-9]+\b", "<USER_ID>"),
]


def scrub(text):
    counts = []
    for name, pattern, placeholder in RULES:
        text, n = re.subn(pattern, placeholder, text)
        counts.append((name, n))
    return text, counts


def main(argv):
    if len(argv) != 3:
        print("usage: python scrub.py <input.log> <output.log>", file=sys.stderr)
        return 2
    src, dst = argv[1], argv[2]
    # newline="" keeps the file's own line endings, so the output matches scrub.ps1.
    with open(src, encoding="utf-8", newline="") as f:
        text = f.read()
    text, counts = scrub(text)
    with open(dst, "w", encoding="utf-8", newline="") as f:
        f.write(text)
    for name, n in counts:
        print(f"{name:>13}: {n} replaced")
    print(f"wrote {dst}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
