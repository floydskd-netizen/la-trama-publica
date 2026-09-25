from pathlib import Path
from html.parser import HTMLParser
import re, subprocess, sys

BAD_SEQUENCES = ("\ufffd", "\u00c3", "\u00c2")
TEXT_EXT = {".html", ".md", ".js", ".ts"}
QWORD = re.compile(r"[A-Za-z\u00c0-\u024f]\?[A-Za-z\u00c0-\u024f]")
BAD_UI_TOKENS = ("P?blica","informaci?n","investigaci?n","correcci?n","revisi?n","Cr?dito","cr?dito","p?blico","c?digo","Tel?fono","Tambi?n","tambi?n","Participaci?n","Verificaci?n","Configuraci?n","notificaci?n","aport?","pol?tica","m?s","buz?n","autom?tico","explicaci?n","ten?s","quer?s","deber?amos","cre?s","m?x.","C?mo","S? parte","est?","Sending?"," ? contacto"," ? publicaci?n")

class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts=[]; self.skip=0
    def handle_starttag(self, tag, attrs):
        if tag in {"script","style"}: self.skip += 1
    def handle_endtag(self, tag):
        if tag in {"script","style"} and self.skip: self.skip -= 1
    def handle_data(self, data):
        if not self.skip: self.parts.append(data)

def tracked_files():
    raw=subprocess.check_output(["git","ls-files"])
    return [Path(x) for x in raw.decode("utf-8","replace").splitlines()]

def inspect(path: Path):
    try: s=path.read_text(encoding="utf-8")
    except UnicodeDecodeError: return ["not valid UTF-8"]
    issues=[]
    for bad in BAD_SEQUENCES:
        if bad in s: issues.append(f"contains mojibake marker {bad.encode('unicode_escape').decode()}")
    samples=[]
    if path.suffix == ".html":
        p=VisibleText(); p.feed(s); samples=p.parts
    elif path.suffix == ".md":
        samples=s.splitlines()
    elif path.suffix in {".js",".ts"}:
        for token in BAD_UI_TOKENS:
            if token in s: issues.append(f"corrupted UI token: {token!r}")
        return issues
    for sample in samples:
        hit=QWORD.search(sample)
        if hit:
            frag=sample[max(0,hit.start()-28):hit.end()+28].replace("\n"," ")
            issues.append(f"suspicious question mark in visible text: {frag!r}")
            if len(issues)>=8: break
    return issues

def main():
    failed=False
    for path in tracked_files():
        if path.suffix.lower() not in TEXT_EXT or not path.exists(): continue
        issues=inspect(path)
        if issues:
            failed=True; print(f"FAIL {path}")
            for issue in issues: print("  -",issue)
    if failed: return 1
    print("Text quality check passed: UTF-8/mojibake/suspicious-word scan clean.")
    return 0

if __name__ == "__main__": raise SystemExit(main())
