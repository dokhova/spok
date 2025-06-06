import os
from pathlib import Path
from html.parser import HTMLParser
import unittest


class ImgSourceParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.files = []

    def handle_starttag(self, tag, attrs):
        if tag in {"img", "source"}:
            for attr, value in attrs:
                if attr == "src":
                    self._add(value)
                elif attr == "srcset":
                    for part in value.split(','):
                        src = part.strip().split()[0]
                        self._add(src)

    def _add(self, value):
        if value:
            self.files.append(value)


def collect_sources(html_file: Path):
    parser = ImgSourceParser()
    parser.feed(html_file.read_text(encoding="utf-8"))
    return parser.files


class TestHtmlResources(unittest.TestCase):
    def test_all_referenced_files_exist(self):
        repo_root = Path(__file__).resolve().parents[1]
        html_files = list(repo_root.glob('*.html'))
        for html in html_files:
            for src in collect_sources(html):
                if src.startswith(('http://', 'https://', '//', 'data:')):
                    continue
                cleaned = src.split('?')[0].split('#')[0]
                if cleaned.startswith('/'):
                    path = repo_root / cleaned.lstrip('/')
                else:
                    path = (html.parent / cleaned)
                path = path.resolve()
                self.assertTrue(
                    str(path).startswith(str(repo_root)),
                    f"{html}: {cleaned} is outside repository",
                )
                if not path.exists():
                    # allow case-insensitive match for file systems like Windows
                    parent = path.parent
                    matches = [p for p in parent.iterdir() if p.name.lower() == path.name.lower()]
                    self.assertTrue(
                        matches,
                        f"{html}: missing file {cleaned}",
                    )
                else:
                    self.assertTrue(path.exists(), f"{html}: missing file {cleaned}")


if __name__ == "__main__":
    unittest.main()
